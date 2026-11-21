import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeOnStreamCompletion } from '../../cloudflare/worker.mjs';

test('download finalization runs only after the response stream reaches EOF', async () => {
  let finalized = 0;
  let cancelled = 0;
  const source = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    },
  });
  const stream = finalizeOnStreamCompletion(
    source,
    async () => { finalized += 1; return true; },
    async () => { cancelled += 1; },
  );
  const reader = stream.getReader();
  const first = await reader.read();
  assert.deepEqual([...first.value], [1, 2, 3]);
  assert.equal(finalized, 0);
  const last = await reader.read();
  assert.equal(last.done, true);
  assert.equal(finalized, 1);
  assert.equal(cancelled, 0);
});

test('cancelling a response stream cancels the upstream without charging', async () => {
  let finalized = 0;
  let cancelled = 0;
  let upstreamCancelled = 0;
  const source = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
    },
    cancel() { upstreamCancelled += 1; },
  });
  const stream = finalizeOnStreamCompletion(
    source,
    async () => { finalized += 1; return true; },
    async () => { cancelled += 1; },
  );
  const reader = stream.getReader();
  await reader.read();
  await reader.cancel('user stopped');
  assert.equal(finalized, 0);
  assert.equal(cancelled, 1);
  assert.equal(upstreamCancelled, 1);
});

test('failed finalization errors the response stream instead of reporting success', async () => {
  const source = new ReadableStream({ start(controller) { controller.close(); } });
  const stream = finalizeOnStreamCompletion(source, async () => false);
  await assert.rejects(stream.getReader().read(), /could not be finalized/i);
});
