export class EncryptedStorageUnavailableError extends Error {
  constructor() {
    super('SQLCipher is unavailable in this app build.');
    this.name = 'EncryptedStorageUnavailableError';
  }
}

export function assertSqlCipherSupported(platform: string): void {
  if (platform === 'web') throw new EncryptedStorageUnavailableError();
}

export function describeDatabaseStartupError(error: unknown): { message: string; canRetry: boolean } {
  if (error instanceof EncryptedStorageUnavailableError) {
    return {
      message: 'This app build does not include encrypted storage. Use an iOS or Android development build with SQLCipher enabled. Your notes were not changed.',
      canRetry: false,
    };
  }

  return {
    message: 'The encrypted local database could not be opened. Your notes were not changed. Check available device storage and try again.',
    canRetry: true,
  };
}
