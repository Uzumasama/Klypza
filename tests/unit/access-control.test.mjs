import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountAccess, planLimits, paddleSubscriptionRowId, selectEligiblePaidSubscription, dashboardPaidSubscription, resolvePaddleSubscriptionPlan, isPaddleEventNewer, isValidPaddleTimestamp, isValidPaddleOrderTransaction, canActivatePaddleOrder, expiredPaidHistoryCutoff, retainDailyHistory } from '../../cloudflare/worker.mjs';

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
  for (const plan of ['free','trial','weekly','standard','premium']) {
    assert.equal(Object.hasOwn(planLimits(plan), 'ads'), false, `${plan} plan must not carry legacy advertising metadata`);
  }
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

test('highest eligible paid tier wins even when a higher tier is past due and expired', () => {
  const rows = [
    { plan: 'premium', status: 'past_due', current_period_end: past },
    { plan: 'standard', status: 'active', current_period_end: future },
    { plan: 'weekly', status: 'active', current_period_end: future },
  ];
  const selected = selectEligiblePaidSubscription(rows, NOW);
  assert.equal(selected.plan, 'standard');
  assert.equal(resolveAccountAccess(selected, null, NOW).canDownload, true);
});

test('expired past-due subscription is not eligible for paid access', () => {
  const selected = selectEligiblePaidSubscription([
    { plan: 'premium', status: 'past_due', current_period_end: past },
  ], NOW);
  assert.equal(selected, null);
});

test('active Premium remains preferred over active Standard and Weekly', () => {
  const selected = selectEligiblePaidSubscription([
    { plan: 'weekly', status: 'active', current_period_end: future },
    { plan: 'standard', status: 'active', current_period_end: future },
    { plan: 'premium', status: 'active', current_period_end: future },
  ], NOW);
  assert.equal(selected.plan, 'premium');
});

test('trial subscription is not exposed as an active paid dashboard subscription', () => {
  const access = resolveAccountAccess(null, { plan: 'weekly', provider: 'klypza_trial', status: 'trialing', current_period_end: future }, NOW);
  assert.equal(access.plan, 'trial');
  assert.equal(dashboardPaidSubscription(access), null);
});

test('expired paid history is not exposed as an active paid dashboard subscription', () => {
  const paid = selectEligiblePaidSubscription([{ plan: 'premium', provider: 'paddle', status: 'past_due', current_period_end: past }], NOW);
  const access = resolveAccountAccess(paid, null, NOW);
  assert.equal(access.canDownload, false);
  assert.equal(dashboardPaidSubscription(access), null);
});

test('scheduled Paddle cancellation keeps paid access until Paddle marks it canceled', () => {
  const scheduled = {
    plan: 'standard',
    provider: 'paddle',
    status: 'active',
    current_period_end: future,
    scheduled_change_action: 'cancel',
    scheduled_change_effective_at: future,
  };
  const selected = selectEligiblePaidSubscription([scheduled], NOW);
  assert.equal(selected, scheduled);
  assert.equal(resolveAccountAccess(selected, null, NOW).canDownload, true);

  const canceled = selectEligiblePaidSubscription([
    { ...scheduled, status: 'canceled' },
  ], NOW);
  assert.equal(canceled, null);
});

test('paused Paddle subscription does not grant paid download access', () => {
  const selected = selectEligiblePaidSubscription([
    { plan: 'premium', provider: 'paddle', status: 'paused', current_period_end: future },
  ], NOW);
  assert.equal(selected, null);
});

test('eligible Paddle subscription remains visible in dashboard', () => {
  const paid = { plan: 'premium', provider: 'paddle', status: 'active', current_period_end: future };
  const access = resolveAccountAccess(paid, null, NOW);
  assert.equal(dashboardPaidSubscription(access), paid);
});

test('Paddle subscription plan follows the current subscription price after portal changes', () => {
  const env = {
    PADDLE_WEEKLY_PRICE_ID: 'pri_weekly',
    PADDLE_STANDARD_PRICE_ID: 'pri_standard',
    PADDLE_PREMIUM_PRICE_ID: 'pri_premium',
  };
  assert.equal(resolvePaddleSubscriptionPlan({ items: [{ price: { id: 'pri_premium' } }] }, env, 'weekly'), 'premium');
  assert.equal(resolvePaddleSubscriptionPlan({ items: [{ price_id: 'pri_standard' }] }, env, 'weekly'), 'standard');
  assert.equal(resolvePaddleSubscriptionPlan({ items: [{ price: { id: 'unknown' } }] }, env, 'weekly'), 'weekly');
  assert.equal(resolvePaddleSubscriptionPlan({ items: [] }, env, 'invalid'), null);
});

test('Paddle webhook event ordering ignores stale and malformed timestamps', () => {
  assert.equal(isPaddleEventNewer('2026-11-21T10:00:00Z', '2026-11-21T09:00:00Z'), true);
  assert.equal(isPaddleEventNewer('2026-11-21T09:00:00Z', '2026-11-21T09:00:00Z'), true);
  assert.equal(isPaddleEventNewer('2026-11-21T08:00:00Z', '2026-11-21T09:00:00Z'), false);
  assert.equal(isPaddleEventNewer('not-a-date', '2026-11-21T09:00:00Z'), false);
  assert.equal(isPaddleEventNewer('', null), true);
});


test('Paddle webhook timestamp accepts numeric Unix timestamps only', () => {
  assert.equal(isValidPaddleTimestamp('1795255200'), true);
  assert.equal(isValidPaddleTimestamp('1'), true);
  assert.equal(isValidPaddleTimestamp(''), false);
  assert.equal(isValidPaddleTimestamp('abc'), false);
  assert.equal(isValidPaddleTimestamp('\\\\d123'), false);
  assert.equal(isValidPaddleTimestamp('1234567890123'), false);
});

test('Paddle completed transaction must match the exact pending Klypza order', () => {
  const env = { PADDLE_WEEKLY_PRICE_ID: 'pri_weekly', PADDLE_STANDARD_PRICE_ID: 'pri_standard', PADDLE_PREMIUM_PRICE_ID: 'pri_premium' };
  const order = { id: 'order-1', user_id: 'user-1', plan: 'standard', amount_minor: 599, currency: 'USD', status: 'pending', provider_reference: 'txn-1' };
  const transaction = {
    id: 'txn-1', status: 'completed', currency_code: 'USD',
    custom_data: { klypza_order_id: 'order-1', klypza_user_id: 'user-1', klypza_plan: 'standard' },
    items: [{ price: { id: 'pri_standard' }, quantity: 1 }],
    details: { totals: { subtotal: '599', grand_total: '599' } },
  };
  assert.equal(isValidPaddleOrderTransaction(order, transaction, env), true);
  assert.equal(isValidPaddleOrderTransaction({ ...order, provider_reference: null }, transaction, env), true);
  assert.equal(isValidPaddleOrderTransaction({ ...order, provider_reference: 'txn-other' }, transaction, env), false);
  assert.equal(canActivatePaddleOrder(order, transaction, env), true);
  assert.equal(canActivatePaddleOrder({ ...order, status: 'completed' }, transaction, env), false);
  assert.equal(canActivatePaddleOrder({ ...order, currency: 'EUR' }, transaction, env), false);
  assert.equal(canActivatePaddleOrder({ ...order, amount_minor: 100 }, transaction, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, id: 'txn-other' }, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, custom_data: { ...transaction.custom_data, klypza_user_id: 'user-other' } }, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, custom_data: { ...transaction.custom_data, klypza_plan: 'premium' } }, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, items: [{ price: { id: 'pri_premium' }, quantity: 1 }] }, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, items: [{ price: { id: 'pri_standard' }, quantity: 2 }] }, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, details: { totals: { currency_code: 'USD', subtotal: '999' } } }, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, currency_code: 'EUR' }, env), false);
  assert.equal(isValidPaddleOrderTransaction(order, { ...transaction, status: 'paid' }, env), false);
});


test('paid subscription history is purged only after the Paddle billing period ends', () => {
  const end = '2026-11-21T08:00:00.000Z';
  const beforeExpiry = Date.parse(end) - 1;
  const afterExpiry = Date.parse(end) + 1;
  assert.equal(expiredPaidHistoryCutoff({ provider: 'paddle', status: 'canceled', current_period_end: end }, beforeExpiry), null);
  assert.equal(expiredPaidHistoryCutoff({ provider: 'paddle', status: 'canceled', current_period_end: end }, afterExpiry), end);
  assert.equal(expiredPaidHistoryCutoff({ provider: 'paddle', status: 'past_due', current_period_end: end }, afterExpiry), end);
  assert.equal(expiredPaidHistoryCutoff({ provider: 'paddle', status: 'active', current_period_end: end }, afterExpiry), end);
  assert.equal(expiredPaidHistoryCutoff({ provider: 'klypza_trial', status: 'expired', current_period_end: end }, afterExpiry), null);
  assert.equal(expiredPaidHistoryCutoff({ provider: 'paddle', status: 'canceled', current_period_end: 'invalid' }, afterExpiry), null);
});


test('dashboard daily history keeps every current-day row and one clearly marked previous row', () => {
  const today = [{ id: 'today-2' }, { id: 'today-1' }];
  const previous = { id: 'previous', created_at: '2026-11-20 23:59:59' };
  const result = retainDailyHistory(today, previous);
  assert.deepEqual(result, [
    { id: 'today-2' },
    { id: 'today-1' },
    { id: 'previous', created_at: '2026-11-20 23:59:59', isPreviousDay: true },
  ]);
  assert.equal(Object.hasOwn(previous, 'isPreviousDay'), false);
});

test('dashboard daily history works when no previous-day record exists', () => {
  assert.deepEqual(retainDailyHistory([{ id: 'today' }], null), [{ id: 'today' }]);
  assert.deepEqual(retainDailyHistory(null, null), []);
});
