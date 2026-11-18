import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSourceIdentity, stableChargeKey, validateTransferAcknowledgement } from '../cloudflare/credit-confirmation-v2.mjs';

test('canonical source identity removes tracking query and fragment',()=>{
  assert.equal(canonicalSourceIdentity('https://example.com/video/123/?utm_source=x&fbclid=abc#frag'),'https://example.com/video/123');
});
test('canonical source identity preserves meaningful query parameters',()=>{
  assert.equal(canonicalSourceIdentity('https://example.com/watch?v=abc&utm_medium=social'),'https://example.com/watch?v=abc');
});
test('source identity rejects unsafe schemes and URL credentials',()=>{
  assert.throws(()=>canonicalSourceIdentity('javascript:alert(1)'),TypeError);
  assert.throws(()=>canonicalSourceIdentity('https://user:pass@example.com/video'),TypeError);
});
test('stable charge key is same for tracking variations',()=>{
  assert.equal(stableChargeKey('user-1','https://example.com/video/123?utm_campaign=x'),stableChargeKey('user-1','https://example.com/video/123'));
  assert.notEqual(stableChargeKey('user-1','https://example.com/video/123'),stableChargeKey('user-2','https://example.com/video/123'));
});
test('ack requires token, positive bytes and content type',()=>{
  assert.deepEqual(validateTransferAcknowledgement({token:'a'.repeat(30),receivedBytes:1024,contentType:'video/mp4'}),{ok:true,receivedBytes:1024,contentType:'video/mp4'});
  assert.equal(validateTransferAcknowledgement({token:'a'.repeat(30),receivedBytes:0,contentType:'video/mp4'}).reason,'empty_transfer');
  assert.equal(validateTransferAcknowledgement({token:'short',receivedBytes:10,contentType:'video/mp4'}).reason,'invalid_token');
  assert.equal(validateTransferAcknowledgement({token:'a'.repeat(30),receivedBytes:10,contentType:''}).reason,'missing_content_type');
});
