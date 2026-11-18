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

test('non-video content type is rejected before database access', async () => {
  let accessed = false;
  const db = { prepare() { accessed = true; throw new Error('should not query'); } };
  const result = await confirmDownload({ db, userId: 'u1', reservationId: 'r1', tokenHash: 'h', receivedBytes: 20, contentType: 'text/html; charset=utf-8', dailyLimit: 10 });
  assert.deepEqual(result, { ok: false, error: 'invalid_content_type' });
  assert.equal(accessed, false);
});

test('video and generic binary MIME types pass content-type preflight', async () => {
  for (const contentType of ['video/mp4', 'VIDEO/WEBM', 'application/octet-stream']) {
    let accessed = false;
    const db = { prepare() { accessed = true; throw new Error('stop after validation'); } };
    await assert.rejects(confirmDownload({ db, userId: 'u1', reservationId: 'r1', tokenHash: 'h', receivedBytes: 20, contentType, dailyLimit: 10 }), /stop after validation/);
    assert.equal(accessed, true);
  }
});

test('duplicate source charge releases the losing reservation', async () => {
  let released = false;
  const reservation = { id:'r2', user_id:'u1', batch_id:'b2', usage_date:'2026-11-18', platform:'YouTube', source_identity:'canonical-source', source_url:'https://example.test/v', title:'Duplicate', status:'reserved', token_hash:'token-hash', expires_at:new Date(Date.now()+60000).toISOString() };
  const db = {
    prepare(sql) {
      return { bind(...args) {
        return {
          async first() {
            if (sql.includes('SELECT id,user_id,batch_id')) return reservation;
            if (sql.includes('SELECT id FROM confirmed_download_charges WHERE user_id=? AND source_identity=?')) return { id:'charge_other_reservation' };
            return null;
          },
          async run() {
            if (sql.includes('UPDATE download_reservations SET status=\'released\'')) { released = true; return { meta:{changes:1} }; }
            return { meta:{changes:0} };
          }
        };
      } };
    },
    async batch() { return [{meta:{changes:0}},{meta:{changes:0}},{meta:{changes:0}},{meta:{changes:0}},{meta:{changes:0}}]; }
  };
  const result = await confirmDownload({db,userId:'u1',reservationId:'r2',tokenHash:'token-hash',receivedBytes:50,contentType:'video/mp4',dailyLimit:10});
  assert.equal(result.ok,false);
  assert.equal(result.error,'already_charged_for_source');
  assert.equal(released,true);
});
