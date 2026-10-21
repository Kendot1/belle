import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { assertSqlCipherSupported, EncryptedStorageUnavailableError } from './startup-error';

const DATABASE_KEY_NAME = 'quiet-notes.database-key.v1';

async function getOrCreateDatabaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (existing) return existing;

  const bytes = await Crypto.getRandomBytesAsync(32);
  const generated = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, generated, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return generated;
}

export async function openEncryptedDatabase() {
  assertSqlCipherSupported(Platform.OS);
  const database = await SQLite.openDatabaseAsync('quiet-notes.db');
  try {
    const cipher = await database.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
    if (!cipher?.cipher_version) throw new EncryptedStorageUnavailableError();

    const key = await getOrCreateDatabaseKey();
    // This passphrase is generated as lowercase hexadecimal, so it cannot alter the SQL literal.
    await database.execAsync(`PRAGMA key = '${key}';`);
    await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    return database;
  } catch (error) {
    await database.closeAsync().catch(() => undefined);
    throw error;
  }
}
