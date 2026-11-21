import test from 'node:test';
import assert from 'node:assert/strict';
import { readLimitedRequestText } from '../../cloudflare/worker.mjs';

test('reads a request body within the configured byte limit', async () => {
  const request = new Request('https://klypza.web.id/api/paddle/webhook', {
    method: 'POST',
    body: JSON.stringify({ event_id: 'evt_123' }),
  });
  assert.equal(await readLimitedRequestText(request, 100), '{"event_id":"evt_123"}');
});

test('rejects a request body that exceeds the byte limit while streaming', async () => {
  const request = new Request('https://klypza.web.id/api/paddle/webhook', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(8));
        controller.close();
      },
    }),
    duplex: 'half',
  });
  assert.equal(await readLimitedRequestText(request, 12), null);
});

test('rejects a declared oversized request before reading its body', async () => {
  const request = new Request('https://klypza.web.id/api/paddle/webhook', {
    method: 'POST',
    headers: { 'content-length': '1025' },
  });
  assert.equal(await readLimitedRequestText(request, 1024), null);
});
