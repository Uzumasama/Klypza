import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveDownload, releaseReservation, expireReservations } from '../cloudflare/credit-reservations-v2.mjs';

test('reservation helper exports and accepts D1-shaped inputs', async () => {
  const fakeDb = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() { return { meta: { changes: 0 } }; },
            async first() { return null; },
          };
        },
      };
    },
  };
  const result = await reserveDownload({
    db: fakeDb, user: { id: 'user-1' }, batchId: 'batch-1',
    platform: 'TikTok', sourceUrl: 'https://www.tiktok.com/@a/video/123',
    title: 'Test', dailyLimit: 5, token: 'a-token-that-is-long-enough-for-tests',
  });
  assert.equal(result.ok, false);
});

test('release and expire helpers handle no-op D1 updates', async () => {
  const fakeDb = {
    prepare() {
      return { bind() { return { async run() { return { meta: { changes: 0 } }; } }; } };
    },
  };
  assert.equal(await releaseReservation({ db: fakeDb, id: 'r1', userId: 'u1', token: 'long-test-token-123456' }), false);
  assert.equal(await expireReservations(fakeDb), 0);
});
