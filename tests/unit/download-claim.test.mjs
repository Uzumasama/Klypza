import test from 'node:test';
import assert from 'node:assert/strict';
import { cancelPendingDownload, claimPendingDownload } from '../../cloudflare/worker.mjs';

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

test('download token claim is conditional on pending status, owner, and expiry', async () => {
  const db = fakeDb(1);
  assert.equal(await claimPendingDownload({ KLYPZA_DB: db }, 'user-1', 'download-1', 1234), true);
  const { statement, values } = db.inspect();
  assert.match(statement, /SET status='streaming',expires_at=\?/);
  assert.match(statement, /status='pending'/);
  assert.match(statement, /expires_at>\?/);
  assert.deepEqual(values, [1234 + 3600000, 'download-1', 'user-1', 1234]);
});

test('a previously claimed or cancelled token cannot be claimed again', async () => {
  const db = fakeDb(0);
  assert.equal(await claimPendingDownload({ KLYPZA_DB: db }, 'user-1', 'download-1', 1234), false);
});

test('cancelling a failed pre-provider reservation releases ready, pending, and streaming states', async () => {
  const db = fakeDb(1);
  await cancelPendingDownload({ id: 'user-1' }, { KLYPZA_DB: db }, 'download-1');
  const { statement, values } = db.inspect();
  assert.match(statement, /SET status='cancelled'/);
  assert.match(statement, /status IN \('ready','pending','streaming'\)/);
  assert.deepEqual(values, ['download-1', 'user-1']);
});
