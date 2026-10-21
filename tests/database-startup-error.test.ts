import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSqlCipherSupported,
  describeDatabaseStartupError,
  EncryptedStorageUnavailableError,
} from '../src/core/database/startup-error.ts';

test('web is rejected before encrypted native storage is opened', () => {
  assert.throws(() => assertSqlCipherSupported('web'), EncryptedStorageUnavailableError);
  assert.doesNotThrow(() => assertSqlCipherSupported('ios'));
  assert.doesNotThrow(() => assertSqlCipherSupported('android'));
});

test('unsupported SQLCipher builds explain the required recovery and do not offer a futile retry', () => {
  assert.deepEqual(describeDatabaseStartupError(new EncryptedStorageUnavailableError()), {
    message: 'This app build does not include encrypted storage. Use an iOS or Android development build with SQLCipher enabled. Your notes were not changed.',
    canRetry: false,
  });
});

test('unexpected startup failures keep a safe message and offer retry without exposing internal details', () => {
  assert.deepEqual(describeDatabaseStartupError(new Error('private native failure detail')), {
    message: 'The encrypted local database could not be opened. Your notes were not changed. Check available device storage and try again.',
    canRetry: true,
  });
});
