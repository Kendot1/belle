import assert from 'node:assert/strict';
import test from 'node:test';
import * as provider from '../src/features/ai/provider.ts';

test('AI availability maps native runtime reasons to clear local-only states', () => {
  assert.equal(typeof provider.describeAIStatus, 'function');
  if (typeof provider.describeAIStatus !== 'function') return;

  assert.deepEqual(provider.describeAIStatus('available'), {
    available: true,
    status: 'available',
    message: 'Ready on this device. Your text stays here.',
  });
  assert.equal(provider.describeAIStatus('unavailable:deviceNotEligible').available, false);
  assert.match(provider.describeAIStatus('unavailable:deviceNotEligible').message, /does not support Apple Intelligence/i);
  assert.match(provider.describeAIStatus('unavailable:modelNotReady').message, /preparing/i);
  assert.match(provider.describeAIStatus('unavailable:appleIntelligenceNotEnabled').message, /Settings/i);
  assert.match(provider.describeAIStatus('native_module_missing').message, /development build/i);
  assert.match(provider.describeAIStatus('unsupported_platform').message, /Apple devices/i);
  assert.match(provider.describeAIStatus('unexpected').message, /notes and search still work/i);
});

test('AI input size is explicit and never silently accepted past the local model limit', () => {
  assert.equal(typeof provider.MAX_AI_INPUT_LENGTH, 'number');
  assert.equal(typeof provider.isAIInputWithinLimit, 'function');
  if (typeof provider.isAIInputWithinLimit !== 'function') return;
  assert.equal(provider.MAX_AI_INPUT_LENGTH, 8_000);
  assert.equal(provider.isAIInputWithinLimit('x'.repeat(8_000)), true);
  assert.equal(provider.isAIInputWithinLimit('x'.repeat(8_001)), false);
});
