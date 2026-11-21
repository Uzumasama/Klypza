import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDownloadAllowance } from '../../cloudflare/worker.mjs';

function fakeDb({ daily = 0, batch = 0, dailyPending = 0, batchPending = 0, maxVideos = 5 } = {}) {
  const queries = [];
  return {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              queries.push({ sql, values });
              if (sql.includes('SELECT id,max_videos')) return { id: 'batch-1', max_videos: maxVideos };
              if (sql.includes('FROM usage_events') && sql.includes('usage_date')) return { used: daily };
              if (sql.includes('FROM usage_events') && sql.includes('batch_id')) return { used: batch };
              if (sql.includes('FROM pending_downloads') && sql.includes('batch_id')) return { used: batchPending };
              if (sql.includes('FROM pending_downloads')) return { used: dailyPending };
              return null;
            },
          };
        },
      };
    },
    queries,
  };
}

test('quota preflight includes active pending reservations', async () => {
  const db = fakeDb({ dailyPending: 9, batchPending: 5, maxVideos: 5 });
  const result = await checkDownloadAllowance(
    { id: 'user-1', plan: 'trial' },
    { KLYPZA_DB: db },
    'batch-1',
  );
  assert.deepEqual(result, {
    ok: false,
    error: 'batch_limit_reached',
    message: 'Your plan allows up to 5 videos per batch. Start another batch to continue.',
  });
  const reservationQueries = db.queries.filter(q => q.sql.includes('FROM pending_downloads'));
  assert.equal(reservationQueries.length, 2);
  for (const query of reservationQueries) {
    assert.match(query.sql, /status IN \('ready','pending','streaming'\)/);
    assert.match(query.sql, /expires_at>\?/);
  }
});

test('quota preflight allows a batch when current usage and reservations are below limits', async () => {
  const db = fakeDb({ daily: 1, batch: 1, dailyPending: 2, batchPending: 2 });
  const result = await checkDownloadAllowance(
    { id: 'user-1', plan: 'trial' },
    { KLYPZA_DB: db },
    'batch-1',
  );
  assert.deepEqual(result, { ok: true });
});
