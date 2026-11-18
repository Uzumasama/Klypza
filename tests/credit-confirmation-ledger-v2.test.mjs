import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmationIds, confirmDownload } from '../cloudflare/credit-confirmation-ledger-v2.mjs';

test('confirmation IDs are stable per reservation', () => {
  assert.deepEqual(confirmationIds('abc'), {
    chargeId: 'charge_abc', usageEventId: 'usage_abc', transactionId: 'txn_abc', downloadId: 'download_abc'
  });
  assert.deepEqual(confirmationIds('abc'), confirmationIds('abc'));
});

test('confirmation IDs reject empty reservation identifiers', () => {
  assert.throws(() => confirmationIds(''), /reservationId/);
});

test('empty transfer is rejected before database access', async () => {
  let accessed = false;
  const db = { prepare() { accessed = true; throw new Error('should not query'); } };
  const result = await confirmDownload({ db, userId: 'u1', reservationId: 'r1', tokenHash: 'h', receivedBytes: 0, contentType: 'video/mp4', dailyLimit: 10 });
  assert.deepEqual(result, { ok: false, error: 'empty_transfer' });
  assert.equal(accessed, false);
});

test('missing content type is rejected before database access', async () => {
  let accessed = false;
  const db = { prepare() { accessed = true; throw new Error('should not query'); } };
  const result = await confirmDownload({ db, userId: 'u1', reservationId: 'r1', tokenHash: 'h', receivedBytes: 10, contentType: '', dailyLimit: 10 });
  assert.deepEqual(result, { ok: false, error: 'missing_content_type' });
  assert.equal(accessed, false);
});
