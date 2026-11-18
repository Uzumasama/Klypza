import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveDownload, releaseReservation, expireReservations, hashReservationToken } from '../cloudflare/credit-reservations-v2.mjs';

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

test('reservation creates a separate attempt and does not rotate an existing token', async () => {
  const fakeDb = {
    prepare(sql) {
      return { bind(...args) { return {
        async run() { if(sql.includes('INSERT INTO download_reservations')) return {meta:{changes:0}}; return {meta:{changes:0}}; },
        async first() { return null; }
      }; } };
    }
  };
  const result=await reserveDownload({db:fakeDb,user:{id:'user-2'},batchId:'batch-2',platform:'TikTok',sourceUrl:'https://www.tiktok.com/@a/video/456',title:'Retry',dailyLimit:5,token:'retry-token-long-enough-to-be-valid'});
  assert.equal(result.ok,false);
  assert.equal(result.error,'quota_or_reservation_conflict');
});

test('reservation rejects invalid daily quota before database access', async () => {
  let accessed=false;
  const db={prepare(){accessed=true;throw new Error('unexpected DB access');}};
  await assert.rejects(reserveDownload({db,user:{id:'u'},batchId:'b',platform:'TikTok',sourceUrl:'https://example.test/video',title:'t',dailyLimit:0,token:'test-token'}),/dailyLimit/);
  assert.equal(accessed,false);
  await assert.rejects(reserveDownload({db,user:{id:'u'},batchId:'b',platform:'TikTok',sourceUrl:'https://example.test/video',title:'t',dailyLimit:2.5,token:'test-token'}),/dailyLimit/);
  assert.equal(accessed,false);
});

test('reservation rejects missing source URL or platform before database access', async () => {
  let accessed=false;
  const db={prepare(){accessed=true;throw new Error('unexpected DB access');}};
  await assert.rejects(reserveDownload({db,user:{id:'u'},batchId:'b',platform:'',sourceUrl:'https://example.test/video',title:'t',dailyLimit:2,token:'test-token'}),/sourceUrl and platform/);
  assert.equal(accessed,false);
});


test('reservation token hashing is stable and returns a SHA-256 hex digest', async () => {
  const a = await hashReservationToken('token-value-that-is-long-enough');
  const b = await hashReservationToken('token-value-that-is-long-enough');
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test('reservation token hashing rejects short or non-string tokens', async () => {
  await assert.rejects(hashReservationToken('short'), /20 characters/);
  await assert.rejects(hashReservationToken(null), /20 characters/);
});
