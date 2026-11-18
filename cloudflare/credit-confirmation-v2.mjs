/**
 * Pure helpers for Credit Confirmation V2.
 * This module is intentionally not wired into production routes yet.
 */
const TRACKING_PARAMS = new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','igshid']);

export function canonicalSourceIdentity(input) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Unsupported URL scheme');
  if (url.username || url.password) throw new TypeError('Credentials in source URL are not allowed');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  // Keep source-specific query parameters (e.g. video IDs) that may be essential.
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.searchParams.sort();
  return url.toString();
}

export function stableChargeKey(userId, sourceUrl) {
  if (!userId || typeof userId !== 'string') throw new TypeError('userId is required');
  return userId + ':' + canonicalSourceIdentity(sourceUrl);
}

export function validateTransferAcknowledgement({ token, receivedBytes, contentType }) {
  if (typeof token !== 'string' || token.length < 20) return { ok: false, reason: 'invalid_token' };
  const bytes = Number(receivedBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, reason: 'empty_transfer' };
  if (typeof contentType !== 'string' || !contentType.trim()) return { ok: false, reason: 'missing_content_type' };
  return { ok: true, receivedBytes: Math.floor(bytes), contentType: contentType.trim().slice(0, 160) };
}
