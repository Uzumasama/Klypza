import { canonicalSourceIdentity } from './credit-confirmation-v2.mjs';

const RESERVATION_TTL_MS = 20 * 60 * 1000;

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashReservationToken(token) {
  if (typeof token !== 'string' || token.length < 20) throw new TypeError('token must be at least 20 characters');
  return sha256Hex(token);
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
    ON CONFLICT DO NOTHING
  `).bind(
    id,user.id,batchId,day,platform,identity,sourceUrl,String(title||'').slice(0,200),tokenHash,expiresAt,
    user.id,day,user.id,day,new Date().toISOString(),dailyLimit,
    user.id,batchId,user.id,batchId,new Date().toISOString(),batchId,user.id
  );
  const result = await statement.run();
  if (Number(result?.meta?.changes) === 1) return { ok: true, id, identity, token, expiresAt, idempotent: false };

  // Reservations are per transfer attempt, not unique per source. This permits
  // simultaneous quality downloads while the charge ledger still enforces one
  // charge per user + canonical source.
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
