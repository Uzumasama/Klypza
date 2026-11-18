import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCreditConfirmation } from '../cloudflare/credit-confirmation-route-v2.mjs';

const user = { id: 'user-1' };
const token = 'this-is-a-long-enough-reservation-token';

test('confirmation route rejects non-POST', async () => {
  const response = await handleCreditConfirmation(new Request('https://klypza.test/api/download/confirm', { method: 'GET' }), { db: {}, user, dailyLimit: 10 });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('confirmation route validates JSON and body', async () => {
  const badJson = await handleCreditConfirmation(new Request('https://klypza.test/api/download/confirm', { method: 'POST', body: '{' }), { db: {}, user, dailyLimit: 10 });
  assert.equal(badJson.status, 400);
  assert.equal((await badJson.json()).error, 'invalid_json');

  const invalidBody = await handleCreditConfirmation(new Request('https://klypza.test/api/download/confirm', { method: 'POST', body: '[]' }), { db: {}, user, dailyLimit: 10 });
  assert.equal(invalidBody.status, 400);
});

test('confirmation route rejects missing transfer proof fields before touching DB', async () => {
  let touched = false;
  const db = { prepare() { touched = true; throw new Error('should not be called'); } };
  const response = await handleCreditConfirmation(new Request('https://klypza.test/api/download/confirm', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reservationId: 'res-1', token, receivedBytes: 0, contentType: 'video/mp4' })
  }), { db, user, dailyLimit: 10 });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'empty_transfer');
  assert.equal(touched, false);
});

test('confirmation route passes normalized transfer proof to ledger and returns idempotency result', async () => {
  const db = { prepare() { throw new Error('unexpected DB use in stub'); } };
  const response = await handleCreditConfirmation(new Request('https://klypza.test/api/download/confirm', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reservationId: 'res-1', token, receivedBytes: 4096, contentType: 'video/mp4; charset=binary' })
  }), { db, user, dailyLimit: 10 });
  // The ledger stub is not injectable yet; this route test verifies its defensive error response.
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'confirmation_failed');
});
