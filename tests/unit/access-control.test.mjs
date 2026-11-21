import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountAccess, planLimits, paddleSubscriptionRowId } from '../../cloudflare/worker.mjs';

const NOW = Date.parse('2026-11-21T08:00:00Z');
const future = new Date(NOW + 3 * 86400000).toISOString();
const past = new Date(NOW - 1000).toISOString();

test('active 7-day trial grants Trial access and reports remaining days', () => {
  const trial = { plan: 'weekly', status: 'trialing', current_period_start: new Date(NOW - 86400000).toISOString(), current_period_end: future };
  const access = resolveAccountAccess(null, trial, NOW);
  assert.equal(access.plan, 'trial');
  assert.equal(access.canDownload, true);
  assert.deepEqual({daily:planLimits(access.plan).daily,batch:planLimits(access.plan).batch},{daily:10,batch:5});
  assert.equal(access.trial.status, 'active');
  assert.equal(access.trial.daysRemaining, 3);
});

test('expired trial blocks downloads', () => {
  const trial = { plan: 'weekly', status: 'trialing', current_period_end: past };
  const access = resolveAccountAccess(null, trial, NOW);
  assert.equal(access.plan, 'free');
  assert.equal(access.canDownload, false);
  assert.equal(access.trialExpired, true);
  assert.equal(access.trial.daysRemaining, 0);
});

test('account with no trial history has no permanent Free access', () => {
  const access = resolveAccountAccess(null, null, NOW);
  assert.equal(access.plan, 'free');
  assert.equal(access.canDownload, false);
  assert.equal(access.trial.status, 'expired');
  assert.equal(access.trial.endsAt, null);
});

test('active paid subscription grants access even without a trial row', () => {
  const paid = { plan: 'premium', status: 'active' };
  const access = resolveAccountAccess(paid, null, NOW);
  assert.equal(access.plan, 'premium');
  assert.equal(access.canDownload, true);
  assert.equal(access.trial, null);
});

test('past_due paid subscription remains eligible only before its period end', () => {
  const valid = resolveAccountAccess({ plan: 'standard', status: 'past_due', current_period_end: future }, null, NOW);
  const expired = resolveAccountAccess({ plan: 'standard', status: 'past_due', current_period_end: past }, null, NOW);
  assert.equal(valid.canDownload, true);
  assert.equal(valid.plan, 'standard');
  assert.equal(expired.canDownload, false);
});

test('canceled paid subscription does not override an expired trial', () => {
  const access = resolveAccountAccess({ plan: 'premium', status: 'canceled' }, { status: 'trialing', current_period_end: past }, NOW);
  assert.equal(access.canDownload, false);
  assert.equal(access.plan, 'free');
});

test('valid paid subscription takes precedence over expired trial', () => {
  const access = resolveAccountAccess({ plan: 'weekly', status: 'active' }, { status: 'trialing', current_period_end: past }, NOW);
  assert.equal(access.canDownload, true);
  assert.equal(access.plan, 'weekly');
  assert.equal(access.trial, null);
});


test('approved plan limits remain distinct across Trial and paid tiers', () => {
  assert.deepEqual({daily:planLimits('trial').daily,batch:planLimits('trial').batch},{daily:10,batch:5});
  assert.deepEqual({daily:planLimits('weekly').daily,batch:planLimits('weekly').batch},{daily:25,batch:5});
  assert.deepEqual({daily:planLimits('standard').daily,batch:planLimits('standard').batch},{daily:60,batch:15});
  assert.deepEqual({daily:planLimits('premium').daily,batch:planLimits('premium').batch},{daily:100,batch:25});
});


test('Paddle webhook races converge on one deterministic subscription row ID', () => {
  const paddleId = 'sub_test_123';
  assert.equal(paddleSubscriptionRowId(null, paddleId), paddleId);
  assert.equal(paddleSubscriptionRowId(undefined, paddleId), paddleId);
  assert.equal(paddleSubscriptionRowId('existing-row', paddleId), 'existing-row');
  assert.equal(paddleSubscriptionRowId(null, ''), null);
});
