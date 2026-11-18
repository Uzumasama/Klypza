import { canonicalSourceIdentity } from './credit-confirmation-v2.mjs';

const RESERVATION_TTL_MS = 20 * 60 * 1000;

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a D1 reservation. This is intentionally isolated from the production Worker
 * until integration review. The conditional INSERT performs quota checks in the write
 * statement to avoid read-then-write races.
 */
export async function reserveDownload({ db, user, batchId, platform, sourceUrl, title, dailyLimit, token }) {
  if (!db || !user?.id || !batchId || !token) throw new TypeError('Missing reservation input');
  if (!Number.isInteger(Number(dailyLimit)) || Number(dailyLimit) < 1) throw new TypeError('dailyLimit must be a positive integer');
  if (typeof sourceUrl !== 'string' || !sourceUrl.trim() || typeof platform !== 'string' || !platform.trim()) throw new TypeError('sourceUrl and platform are required');
  const identity = canonicalSourceIdentity(sourceUrl);
  const id = crypto.randomUUID();
  const day = new Date().toISOString().slice(0, 10);
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();
  const tokenHash = await sha256Hex(token);

  const statement = db.prepare(`
    INSERT INTO download_reservations
      (id,user_id,batch_id,usage_date,platform,source_identity,source_url,title,status,token_hash,expires_at)
    SELECT ?,?,?,?,?,?,?,?,'reserved',?,?
    WHERE
      (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND usage_date=?) +
      (SELECT COUNT(*) FROM download_reservations WHERE user_id=? AND usage_date=? AND status='reserved' AND expires_at>?) < ?
      AND
      (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND batch_id=?) +
      (SELECT COUNT(*) FROM download_reservations WHERE user_id=? AND batch_id=? AND status='reserved' AND expires_at>?) <
      (SELECT max_videos FROM download_batches WHERE id=? AND user_id=?)
    ON CONFLICT(user_id,batch_id,source_identity) DO NOTHING
  `).bind(
    id,user.id,batchId,day,platform,identity,sourceUrl,String(title||'').slice(0,200),tokenHash,expiresAt,
    user.id,day,user.id,day,new Date().toISOString(),dailyLimit,
    user.id,batchId,user.id,batchId,new Date().toISOString(),batchId,user.id
  );
  const result = await statement.run();
  if (Number(result?.meta?.changes) === 1) return { ok: true, id, identity, token, expiresAt, idempotent: false };

  // On an idempotent retry, rotate the secret on the existing active reservation.
  // This ensures the retry receives a usable token instead of a token-less response.
  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT id,status,expires_at FROM download_reservations WHERE user_id=? AND batch_id=? AND source_identity=?').bind(user.id,batchId,identity).first();
  if (existing && existing.status === 'reserved' && existing.expires_at > now) {
    const refreshed = await db.prepare(`
      UPDATE download_reservations SET token_hash=?,expires_at=?
      WHERE id=? AND user_id=? AND status='reserved' AND expires_at>?
    `).bind(tokenHash,expiresAt,existing.id,user.id,now).run();
    if (Number(refreshed?.meta?.changes) === 1) {
      return { ok: true, id: existing.id, identity, token, expiresAt, idempotent: true };
    }
  }
  // Expired reservation rows keep the UNIQUE key occupied; reactivate only expired
  // rows, using a guarded UPDATE so concurrent retries cannot both revive it.
  if (existing && (existing.status === 'expired' || existing.status === 'reserved' && existing.expires_at <= now)) {
    const revived = await db.prepare(`
      UPDATE download_reservations
      SET status='reserved',token_hash=?,expires_at=?,usage_date=?,platform=?,source_url=?,title=?
      WHERE id=? AND user_id=? AND (status='expired' OR (status='reserved' AND expires_at<=?))
    `).bind(tokenHash,expiresAt,day,platform,sourceUrl,String(title||'').slice(0,200),existing.id,user.id,now).run();
    if (Number(revived?.meta?.changes) === 1) {
      return { ok: true, id: existing.id, identity, token, expiresAt, idempotent: true, revived: true };
    }
  }
  return { ok: false, error: 'quota_or_reservation_conflict' };
}

export async function releaseReservation({ db, id, userId, token }) {
  const tokenHash = await sha256Hex(token);
  const result = await db.prepare(`
    UPDATE download_reservations
    SET status='released'
    WHERE id=? AND user_id=? AND token_hash=? AND status='reserved' AND expires_at>?
  `).bind(id,userId,tokenHash,new Date().toISOString()).run();
  return Number(result?.meta?.changes) === 1;
}

export async function expireReservations(db) {
  const result = await db.prepare(`
    UPDATE download_reservations SET status='expired'
    WHERE status='reserved' AND expires_at<=?
  `).bind(new Date().toISOString()).run();
  return Number(result?.meta?.changes || 0);
}
