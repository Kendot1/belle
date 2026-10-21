import assert from 'node:assert/strict';
import test from 'node:test';
import * as search from '../src/core/database/search.ts';

test('local FTS search distinguishes empty input, usable terms, and symbol-only queries', () => {
  assert.equal(typeof search.planSearch, 'function');
  if (typeof search.planSearch !== 'function') return;

  assert.deepEqual(search.planSearch('   '), { kind: 'all' });
  assert.deepEqual(search.planSearch('milk oat'), { kind: 'match', expression: '"milk"* AND "oat"*' });
  assert.deepEqual(search.planSearch('!!! —'), { kind: 'empty' });
  assert.deepEqual(search.planSearch('milk" OR 1=1 --'), {
    kind: 'match',
    expression: '"milk"* AND "OR"* AND "1"* AND "1"*',
  });
});
