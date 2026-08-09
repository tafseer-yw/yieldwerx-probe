import assert from 'node:assert/strict';
import {
  PROBE_OWNER,
  consumeReceipt,
  createReceipt,
  pinsMatch,
  validateReceipt,
} from '../plugins/yieldwerx-probe/scripts/owner-bypass.mjs';

const issued = new Date('2026-07-31T08:00:00.000Z');
const signingKey = 'test-only-signing-key-with-at-least-32-characters';
const receipt = createReceipt(
  {
    featureSlug: 'cluster-detection',
    item: 'Case Audit',
    scope: 'CAT-01',
    reason: 'Owner accepts the remaining design-review risk.',
    ttlMinutes: 15,
  },
  issued,
  signingKey,
);

assert.equal(PROBE_OWNER.email, 'tafseer.haider@yieldwerx.com');
assert.equal(pinsMatch('123456', '123456'), true);
assert.equal(pinsMatch('123456', '654321'), false);
assert.equal(
  validateReceipt(receipt, new Date('2026-07-31T08:14:59.000Z'), signingKey).valid,
  true,
);
assert.equal(
  validateReceipt(receipt, new Date('2026-07-31T08:15:00.000Z'), signingKey).valid,
  false,
);
assert.equal(JSON.stringify(receipt).includes('123456'), false);
assert.equal(JSON.stringify(receipt).includes(signingKey), false);

const tampered = { ...receipt, item: 'Every PROBE control' };
assert.equal(
  validateReceipt(tampered, new Date('2026-07-31T08:01:00.000Z'), signingKey).valid,
  false,
);

const consumed = consumeReceipt(
  receipt,
  'docs/qa/cluster-detection/LEDGER.md',
  new Date('2026-07-31T08:05:00.000Z'),
  signingKey,
);
assert.equal(consumed.status, 'consumed');
assert.equal(
  validateReceipt(consumed, new Date('2026-07-31T08:06:00.000Z'), signingKey).valid,
  false,
);

process.stdout.write('PROBE Owner bypass tests passed.\n');
