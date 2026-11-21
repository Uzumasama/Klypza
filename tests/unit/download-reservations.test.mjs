import test from 'node:test';
import assert from 'node:assert/strict';
import { activatePendingDownload } from '../../cloudflare/worker.mjs';

function fakeDb(changes = 1) {
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

test('activation keeps other ready reservations in daily and batch quota counts', async () => {
  const db = fakeDb(1);
  assert.equal(await activatePendingDownload(
    { id: 'user-1', plan: 'trial' },
    { KLYPZA_DB: db },
    'download-1',
  ), true);
  const { statement, values } = db.inspect();
  assert.equal((statement.match(/status IN \('ready','pending','streaming'\)/g) || []).length, 2);
  assert.equal((statement.match(/id<>\?/g) || []).length, 2);
  assert.equal((statement.match(/\?/g) || []).length, values.length);
  assert.deepEqual(values.slice(0, 3), ['download-1', 'user-1', values[2]]);
});

test('activation returns false when the reservation no longer qualifies', async () => {
  const db = fakeDb(0);
  assert.equal(await activatePendingDownload(
    { id: 'user-1', plan: 'trial' },
    { KLYPZA_DB: db },
    'download-1',
  ), false);
});
