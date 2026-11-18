/**
 * Credit Confirmation V2 confirmation ledger.
 * Isolated from Worker routes until integration review.
 * Uses deterministic charge IDs and SQL guards so retries cannot double-charge.
 */
import { canonicalSourceIdentity } from './credit-confirmation-v2.mjs';

export function confirmationIds(reservationId) {
  if (!reservationId || typeof reservationId !== 'string') throw new TypeError('reservationId required');
  return {
    chargeId: 'charge_' + reservationId,
    usageEventId: 'usage_' + reservationId,
    transactionId: 'txn_' + reservationId,
    downloadId: 'download_' + reservationId
  };
}

export async function confirmDownload({ db, userId, reservationId, tokenHash, receivedBytes, contentType }) {
  if (!db || !userId || !reservationId || !tokenHash) throw new TypeError('Missing confirmation input');
  const bytes = Number(receivedBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, error: 'empty_transfer' };
  if (!String(contentType || '').trim()) return { ok: false, error: 'missing_content_type' };

  const reservation = await db.prepare(`
    SELECT id,user_id,batch_id,usage_date,platform,source_identity,source_url,title,status,token_hash,expires_at
    FROM download_reservations WHERE id=? AND user_id=?
  `).bind(reservationId,userId).first();
  if (!reservation) return { ok: false, error: 'reservation_not_found' };
  if (reservation.status === 'confirmed') {
    const existing = await db.prepare('SELECT id FROM confirmed_download_charges WHERE reservation_id=? AND user_id=?').bind(reservationId,userId).first();
    return existing ? { ok: true, idempotent: true, chargeId: existing.id } : { ok: false, error: 'confirmation_inconsistent' };
  }
  if (reservation.status !== 'reserved') return { ok: false, error: 'reservation_not_active' };
  if (reservation.token_hash !== tokenHash) return { ok: false, error: 'invalid_token' };
  if (reservation.expires_at <= new Date().toISOString()) return { ok: false, error: 'reservation_expired' };

  const ids = confirmationIds(reservationId);
  const charge = db.prepare(`
    INSERT INTO confirmed_download_charges
      (id,user_id,source_identity,reservation_id,platform,source_url,title,charged_at)
    SELECT ?,?,?,?,?,?,?,datetime('now')
    WHERE EXISTS(SELECT 1 FROM download_reservations WHERE id=? AND user_id=? AND status='reserved' AND token_hash=? AND expires_at>?)
    ON CONFLICT(user_id,source_identity) DO NOTHING
  `).bind(ids.chargeId,userId,reservation.source_identity,reservationId,reservation.platform,reservation.source_url,reservation.title,reservationId,userId,tokenHash,new Date().toISOString());

  const markReservation = db.prepare(`
    UPDATE download_reservations SET status='confirmed',confirmed_at=datetime('now')
    WHERE id=? AND user_id=? AND status='reserved' AND token_hash=? AND expires_at>?
      AND EXISTS(SELECT 1 FROM confirmed_download_charges WHERE id=? AND reservation_id=? AND user_id=?)
  `).bind(reservationId,userId,tokenHash,new Date().toISOString(),ids.chargeId,reservationId,userId);

  const usage = db.prepare(`
    INSERT INTO usage_events(id,user_id,batch_id,usage_date,platform,source_url,title)
    SELECT ?,?,?,?,?,?,?
    WHERE EXISTS(SELECT 1 FROM confirmed_download_charges WHERE id=? AND reservation_id=? AND user_id=?)
      AND NOT EXISTS(SELECT 1 FROM usage_events WHERE id=?)
  `).bind(ids.usageEventId,userId,reservation.batch_id,reservation.usage_date,reservation.platform,reservation.source_url,reservation.title,ids.chargeId,reservationId,userId,ids.usageEventId);

  const transaction = db.prepare(`
    INSERT INTO credit_transactions(id,user_id,amount,balance_after,reason,reference_id)
    SELECT ?,?,?,?,'video_download',?
    WHERE EXISTS(SELECT 1 FROM confirmed_download_charges WHERE id=? AND reservation_id=? AND user_id=?)
      AND NOT EXISTS(SELECT 1 FROM credit_transactions WHERE id=?)
  `).bind(ids.transactionId,userId,-1,0,ids.chargeId,ids.chargeId,reservationId,userId,ids.transactionId);

  const download = db.prepare(`
    INSERT INTO downloads(id,user_id,platform,source_url,title,credits_used,status)
    SELECT ?,?,?,?,?,1,'completed'
    WHERE EXISTS(SELECT 1 FROM confirmed_download_charges WHERE id=? AND reservation_id=? AND user_id=?)
      AND NOT EXISTS(SELECT 1 FROM downloads WHERE id=?)
  `).bind(ids.downloadId,userId,reservation.platform,reservation.source_url,reservation.title,ids.chargeId,reservationId,userId,ids.downloadId);

  const results = await db.batch([charge,markReservation,usage,transaction,download]);
  const charged = Number(results?.[0]?.meta?.changes || 0) === 1;
  const confirmed = Number(results?.[1]?.meta?.changes || 0) === 1;
  const ledger = await db.prepare('SELECT id FROM confirmed_download_charges WHERE user_id=? AND source_identity=?').bind(userId,reservation.source_identity).first();
  if (ledger?.id !== ids.chargeId) return { ok: false, error: 'already_charged_for_source' };
  return { ok: true, idempotent: !charged || !confirmed, chargeId: ids.chargeId, usageEventId: ids.usageEventId };
}
