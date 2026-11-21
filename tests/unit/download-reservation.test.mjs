import test from 'node:test';
import assert from 'node:assert/strict';
import { createPendingDownload } from '../../cloudflare/worker.mjs';

function fakeDb(changes) {
  let statement = '';
  let values = [];
  return {
    prepare(sql) {
      statement = sql;
      return {
        bind(...args) {
          values = args;
          return { async run() { return { meta: { changes } }; } };
        },
      };
    },
    inspect() { return { statement, values }; },
  };
}

test('download reservation is inserted atomically against daily and batch limits', async () => {
  const db = fakeDb(1);
  const user = { id: 'user-1', plan: 'standard' };
  const id = await createPendingDownload(
    user,
    { KLYPZA_DB: db },
    'TikTok',
    'https://www.tiktok.com/@creator/video/123',
    'Processing video',
    'batch-1',
  );
  assert.match(id, /^[0-9a-f-]{36}$/i);
  const { statement, values } = db.inspect();
  assert.match(statement, /INSERT INTO pending_downloads/);
  assert.match(statement, /'ready'/);
  assert.match(statement, /FROM usage_events WHERE user_id=\? AND usage_date=\?/);
  assert.match(statement, /FROM pending_downloads WHERE user_id=\? AND status IN \('ready','pending','streaming'\)/);
  assert.match(statement, /SELECT max_videos FROM download_batches WHERE id=\? AND user_id=\?/);
  assert.deepEqual(values.slice(1, 6), [
    'user-1',
    'batch-1',
    'TikTok',
    'https://www.tiktok.com/@creator/video/123',
    'Processing video',
  ]);
});

test('reservation returns null when the atomic quota or batch condition rejects it', async () => {
  const db = fakeDb(0);
  const result = await createPendingDownload(
    { id: 'user-1', plan: 'standard' },
    { KLYPZA_DB: db },
    'TikTok',
    'https://www.tiktok.com/@creator/video/123',
    'Processing video',
    'batch-1',
  );
  assert.equal(result, null);
});
