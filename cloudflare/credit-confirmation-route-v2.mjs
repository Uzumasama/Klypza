import { validateTransferAcknowledgement } from './credit-confirmation-v2.mjs';
import { hashReservationToken } from './credit-reservations-v2.mjs';
import { confirmDownload } from './credit-confirmation-ledger-v2.mjs';

/**
 * POST-only authenticated confirmation handler.
 * Caller must resolve the session user and plan limit before invoking this module.
 */
export async function handleCreditConfirmation(request, { db, user, dailyLimit, confirmFn = confirmDownload }) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }
  if (!db || !user?.id || !Number.isInteger(Number(dailyLimit)) || Number(dailyLimit) < 1) {
    return jsonResponse({ error: 'confirmation_unavailable' }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }
  const transfer = validateTransferAcknowledgement({
    token: body.token,
    receivedBytes: body.receivedBytes,
    contentType: body.contentType
  });
  if (!transfer.ok) return jsonResponse({ error: transfer.reason }, 400);
  if (typeof body.reservationId !== 'string' || !body.reservationId.trim() || body.reservationId.length > 128) {
    return jsonResponse({ error: 'invalid_reservation_id' }, 400);
  }

  let tokenHash;
  try {
    tokenHash = await hashReservationToken(body.token);
  } catch {
    return jsonResponse({ error: 'invalid_token' }, 400);
  }
  let result;
  try {
    result = await confirmFn({
      db,
      userId: user.id,
      reservationId: body.reservationId,
      tokenHash,
      receivedBytes: transfer.receivedBytes,
      contentType: transfer.contentType,
      dailyLimit: Number(dailyLimit)
    });
  } catch (error) {
    // Keep server/database details out of the public response.
    return jsonResponse({ error: 'confirmation_failed' }, 500);
  }
  if (!result?.ok) {
    const status = result.error === 'reservation_not_found' ? 404
      : result.error === 'reservation_expired' ? 410
      : result.error === 'already_charged_for_source' ? 409
      : result.error === 'invalid_token' ? 403 : 400;
    return jsonResponse({ error: result.error || 'confirmation_failed' }, status);
  }
  return jsonResponse({ ok: true, idempotent: Boolean(result.idempotent), chargeId: result.chargeId });
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders }
  });
}
