import test from 'node:test';
import assert from 'node:assert/strict';
import { consumePendingDownload } from '../../cloudflare/worker.mjs';

let DatabaseSync;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  // Node 20 remains supported for the project; SQLite integration tests run on the
  // Node 22 CI runtime and are skipped when the built-in module is unavailable.
}

function sqliteD1({ status = 'streaming', expiresAt = Date.now() + 60_000, dailyUsed = 0, batchUsed = 0, maxVideos = 15 } = {}) {
  if (!DatabaseSync) throw new Error('node:sqlite is not available in this Node.js runtime.');
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE pending_downloads (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, batch_id TEXT NOT NULL,
      status TEXT NOT NULL, expires_at INTEGER NOT NULL, platform TEXT NOT NULL,
      source_url TEXT NOT NULL, title TEXT, completed_at TEXT
    );
    CREATE TABLE usage_events (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, batch_id TEXT NOT NULL,
      usage_date TEXT NOT NULL, platform TEXT NOT NULL, source_url TEXT NOT NULL, title TEXT
    );
    CREATE TABLE download_batches (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, max_videos INTEGER NOT NULL);
    CREATE TABLE credit_transactions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL, reason TEXT NOT NULL, reference_id TEXT
    );
    CREATE TABLE downloads (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, platform TEXT NOT NULL,
      source_url TEXT NOT NULL, title TEXT, credits_used INTEGER NOT NULL, status TEXT NOT NULL
    );
  `);
  const day = new Date().toISOString().slice(0, 10);
  db.prepare('INSERT INTO download_batches(id,user_id,max_videos) VALUES(?,?,?)').run('batch-1', 'user-1', maxVideos);
  db.prepare(`INSERT INTO pending_downloads(id,user_id,batch_id,status,expires_at,platform,source_url,title)
    VALUES('download-1','user-1','batch-1',?,?, 'youtube','https://example.test/video','Test video')`).run(status, expiresAt);

  for (let i = 0; i < dailyUsed; i++) {
    db.prepare('INSERT INTO usage_events(id,user_id,batch_id,usage_date,platform,source_url,title) VALUES(?,?,?,?,?,?,?)')
      .run('daily-' + i, 'user-1', 'other-batch', day, 'youtube', 'https://example.test/daily-' + i, 'Daily');
  }
  for (let i = 0; i < batchUsed; i++) {
    db.prepare('INSERT INTO usage_events(id,user_id,batch_id,usage_date,platform,source_url,title) VALUES(?,?,?,?,?,?,?)')
      .run('batch-used-' + i, 'user-1', 'batch-1', day, 'youtube', 'https://example.test/batch-' + i, 'Batch');
  }

  const d1 = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            sql, values,
            async first() {
              return db.prepare(sql).get(...values) ?? null;
            },
            async run() {
              const result = db.prepare(sql).run(...values);
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const results = statements.map(statement => {
          const result = db.prepare(statement.sql).run(...statement.values);
          return { meta: { changes: Number(result.changes) } };
        });
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { db, d1 };
}

const integrationOptions = { skip: !DatabaseSync && 'node:sqlite is unavailable in this Node.js runtime' };

test('SQLite transaction writes exactly one usage event, one credit debit, and one completed download', integrationOptions, async t => {
  const { db, d1 } = sqliteD1();
  t.after(() => db.close());
  const user = { id: 'user-1', plan: 'standard' };

  assert.equal(await consumePendingDownload(user, { KLYPZA_DB: d1 }, 'download-1'), true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM usage_events WHERE id=?').get('download-1').n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM credit_transactions WHERE reference_id=? AND amount=-1').get('download-1').n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM downloads WHERE id=? AND credits_used=1 AND status=?').get('download-1', 'completed').n, 1);
  assert.equal(db.prepare('SELECT status FROM pending_downloads WHERE id=?').get('download-1').status, 'completed');
});

test('replaying a completed download cannot deduct a second credit', integrationOptions, async t => {
  const { db, d1 } = sqliteD1();
  t.after(() => db.close());
  const user = { id: 'user-1', plan: 'standard' };

  assert.equal(await consumePendingDownload(user, { KLYPZA_DB: d1 }, 'download-1'), true);
  assert.equal(await consumePendingDownload(user, { KLYPZA_DB: d1 }, 'download-1'), false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM usage_events WHERE id=?').get('download-1').n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM credit_transactions WHERE reference_id=?').get('download-1').n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM downloads WHERE id=?').get('download-1').n, 1);
});

test('daily quota and batch limits reject finalization without writing a credit', integrationOptions, async t => {
  const daily = sqliteD1({ dailyUsed: 60 });
  t.after(() => daily.db.close());
  assert.equal(await consumePendingDownload({ id: 'user-1', plan: 'standard' }, { KLYPZA_DB: daily.d1 }, 'download-1'), false);
  assert.equal(daily.db.prepare('SELECT COUNT(*) AS n FROM credit_transactions').get().n, 0);
  assert.equal(daily.db.prepare('SELECT status FROM pending_downloads WHERE id=?').get('download-1').status, 'streaming');

  const batch = sqliteD1({ batchUsed: 15 });
  t.after(() => batch.db.close());
  assert.equal(await consumePendingDownload({ id: 'user-1', plan: 'standard' }, { KLYPZA_DB: batch.d1 }, 'download-1'), false);
  assert.equal(batch.db.prepare('SELECT COUNT(*) AS n FROM credit_transactions').get().n, 0);
  assert.equal(batch.db.prepare('SELECT status FROM pending_downloads WHERE id=?').get('download-1').status, 'streaming');
});

test('non-streaming or expired reservations cannot be finalized', integrationOptions, async t => {
  const nonStreaming = sqliteD1({ status: 'cancelled' });
  t.after(() => nonStreaming.db.close());
  assert.equal(await consumePendingDownload({ id: 'user-1', plan: 'standard' }, { KLYPZA_DB: nonStreaming.d1 }, 'download-1'), false);
  assert.equal(nonStreaming.db.prepare('SELECT COUNT(*) AS n FROM usage_events').get().n, 0);

  const expired = sqliteD1({ expiresAt: Date.now() - 1 });
  t.after(() => expired.db.close());
  assert.equal(await consumePendingDownload({ id: 'user-1', plan: 'standard' }, { KLYPZA_DB: expired.d1 }, 'download-1'), false);
  assert.equal(expired.db.prepare('SELECT COUNT(*) AS n FROM usage_events').get().n, 0);
});
