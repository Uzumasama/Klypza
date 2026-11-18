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

test('idempotent retry refreshes the reservation token and returns a usable token', async () => {
  let updated = false;
  const fakeDb = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.includes('INSERT INTO download_reservations')) return { meta: { changes: 0 } };
              if (sql.includes('UPDATE download_reservations')) { updated = true; return { meta: { changes: 1 } }; }
              return { meta: { changes: 0 } };
            },
            async first() {
              if (sql.includes('SELECT id,status,expires_at')) return {
                id: 'existing-reservation', status: 'reserved',
                expires_at: new Date(Date.now() + 60_000).toISOString(),
              };
              return null;
            },
          };
        },
      };
    },
  };
  const token = 'retry-token-long-enough-to-be-valid';
  const result = await reserveDownload({
    db: fakeDb, user: { id: 'user-2' }, batchId: 'batch-2',
    platform: 'TikTok', sourceUrl: 'https://www.tiktok.com/@a/video/456',
    title: 'Retry', dailyLimit: 5, token,
  });
  assert.equal(updated, true);
  assert.equal(result.ok, true);
  assert.equal(result.idempotent, true);
  assert.equal(result.token, token);
});
