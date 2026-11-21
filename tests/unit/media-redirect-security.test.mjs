import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSafeMedia } from '../../cloudflare/worker.mjs';

async function withMockFetch(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { await fn(); } finally { globalThis.fetch = original; }
}

test('blocks HTTPS media redirects that downgrade to HTTP', async () => {
  await withMockFetch(async () => new Response(null, {
    status: 302,
    headers: { location: 'http://cdn.example/video.mp4' },
  }), async () => {
    await assert.rejects(
      fetchSafeMedia('https://media.example/video.mp4'),
      /Blocked insecure media redirect/,
    );
  });
});

test('revalidates redirect targets and blocks private destinations', async () => {
  let calls = 0;
  await withMockFetch(async () => {
    calls += 1;
    return new Response(null, {
      status: 302,
      headers: { location: 'https://localhost/private' },
    });
  }, async () => {
    await assert.rejects(
      fetchSafeMedia('https://media.example/video.mp4'),
      /Blocked unsafe media URL/,
    );
    assert.equal(calls, 1, 'must not fetch the private redirect target');
  });
});

test('allows HTTPS redirects to public HTTPS media', async () => {
  const requested = [];
  await withMockFetch(async (url, options) => {
    requested.push({ url: String(url), redirect: options.redirect });
    if (requested.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: 'https://cdn.example/final.mp4' },
      });
    }
    return new Response('media', { status: 200 });
  }, async () => {
    const response = await fetchSafeMedia('https://media.example/video.mp4');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'media');
    assert.deepEqual(requested.map(x => x.url), [
      'https://media.example/video.mp4',
      'https://cdn.example/final.mp4',
    ]);
    assert.ok(requested.every(x => x.redirect === 'manual'));
  });
});

test('allows an initial HTTP source when it does not downgrade from HTTPS', async () => {
  await withMockFetch(async () => new Response('media', { status: 200 }), async () => {
    const response = await fetchSafeMedia('http://media.example/video.mp4');
    assert.equal(await response.text(), 'media');
  });
});
