import test from 'node:test';
import assert from 'node:assert/strict';
import { consumePendingDownload } from '../../cloudflare/worker.mjs';

function fakeDb({ changes = [1, 1, 1, 1], status = 'streaming', expiresAt = Date.now() + 60000 } = {}) {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            sql, values,
            async first() {
              statements.push({ type: 'first', sql, values });
              return { id: 'download-1', user_id: 'user-1', batch_id: 'batch-1', status, expires_at: expiresAt };
            },
            run: async () => ({ meta: { changes: changes[0] || 0 } }),
          };
        },
      };
    },
    async batch(items) {
      for (const item of items) {
        // D1 prepared statements retain their SQL and bound values in this fake.
        statements.push({ type: 'batch', sql: item.sql, values: item.values });
      }
      return items.map((_, index) => ({ meta: { changes: changes[index] || 0 } }));
    },
  };
}

test('successful stream finalization records one usage event, one credit debit, and one completed download', async () => {
  const db = fakeDb();
  const result = await consumePendingDownload(
    { id: 'user-1', plan: 'standard' },
    { KLYPZA_DB: db },
    'download-1',
  );
  assert.equal(result, true);
  const sql = db.statements.filter(x => x.type === 'batch').map(x => x.sql);
  assert.equal(sql.length, 4);
  assert.match(sql[0], /INSERT OR IGNORE INTO usage_events/);
  assert.match(sql[1], /SET status='completed'/);
  assert.match(sql[2], /INSERT INTO credit_transactions/);
  assert.match(sql[2], /amount,balance_after,reason,reference_id/);
  assert.match(sql[2], /SELECT \?,\?,-1/);
  assert.match(sql[2], /'video_download'/);
  assert.match(sql[2], /NOT EXISTS\(SELECT 1 FROM credit_transactions WHERE reference_id=\?/);
  assert.match(sql[3], /INSERT OR IGNORE INTO downloads/);
  assert.match(sql[3], /credits_used,status/);
});

test('finalization returns false when the atomic usage-event insert is rejected', async () => {
  const db = fakeDb({ changes: [0, 0, 0, 0] });
  const result = await consumePendingDownload(
    { id: 'user-1', plan: 'standard' },
    { KLYPZA_DB: db },
    'download-1',
  );
  assert.equal(result, false);
});

test('non-streaming or expired reservations cannot be finalized', async () => {
  const nonStreaming = fakeDb({ status: 'cancelled' });
  assert.equal(await consumePendingDownload({ id: 'user-1', plan: 'standard' }, { KLYPZA_DB: nonStreaming }, 'download-1'), false);
  assert.equal(nonStreaming.statements.filter(x => x.type === 'batch').length, 0);

  const expired = fakeDb({ expiresAt: Date.now() - 1 });
  assert.equal(await consumePendingDownload({ id: 'user-1', plan: 'standard' }, { KLYPZA_DB: expired }, 'download-1'), false);
  assert.equal(expired.statements.filter(x => x.type === 'batch').length, 0);
});
