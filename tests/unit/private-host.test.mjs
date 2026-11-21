import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateHost } from '../../cloudflare/worker.mjs';

test('blocks localhost and private DNS suffixes with optional trailing dots', () => {
  for (const host of [
    'localhost', 'localhost.', 'LOCALHOST.',
    'api.localhost', 'api.localhost.',
    'printer.local', 'printer.local.',
    'service.internal', 'service.internal.',
    'router.home.arpa', 'router.home.arpa.',
  ]) assert.equal(isPrivateHost(host), true, host);
});

test('blocks literal IP hosts conservatively', () => {
  for (const host of ['127.0.0.1', '10.0.0.2', '192.168.1.1', '::1', '[::1]']) {
    assert.equal(isPrivateHost(host), true, host);
  }
});

test('does not block ordinary public DNS names', () => {
  for (const host of ['api.saveapi.org', 'cdn.example.com', 'example.org']) {
    assert.equal(isPrivateHost(host), false, host);
  }
});
