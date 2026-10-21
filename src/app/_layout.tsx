import { useEffect, useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { StateMessage } from '../core/components/StateMessage';
import { NotesProvider } from '../core/database/context';
import { openEncryptedDatabase } from '../core/database/crypto';
import { migrations } from '../core/database/migrations';
import { createNotesRepository } from '../core/database/repository';
import * as schema from '../core/database/schema';
import { describeDatabaseStartupError } from '../core/database/startup-error';
import { usePalette } from '../core/theme';
import { localAIProvider } from '../core/platform/local-ai';
import { AIProviderProvider } from '../features/ai/context';

const createDatabase = (sqlite: SQLite.SQLiteDatabase) => drizzle(sqlite, { schema });
type Connection = { sqlite: SQLite.SQLiteDatabase; orm: ReturnType<typeof createDatabase> };

function DatabaseMigrationGate({ connection, onRetry }: { connection: Connection; onRetry: () => void }) {
  const colors = usePalette();
  const notesService = useMemo(() => createNotesRepository(connection.orm), [connection.orm]);
  const { success, error } = useMigrations(connection.orm, migrations);
  if (error) {
    return <StateMessage title="Your notes could not be opened" message="The local database migration failed. Your notes have not been deleted." actionLabel="Try again" onAction={onRetry} />;
  }
  if (!success) return <StateMessage title="Getting your notebook ready" message="Opening your private notes on this device." loading />;
  return (
    <AIProviderProvider value={localAIProvider}>
      <NotesProvider value={notesService}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'none' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="note/[id]" />
        </Stack>
      </NotesProvider>
    </AIProviderProvider>
  );
}

function DatabaseStartup() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    void openEncryptedDatabase().then((sqlite) => {
      if (mounted) setConnection({ sqlite, orm: createDatabase(sqlite) });
    }).catch((startupError) => { if (mounted) setError(startupError); });
    return () => { mounted = false; };
  }, [attempt]);

  const retry = () => { setConnection(null); setError(null); setAttempt((value) => value + 1); };
  if (error !== null) {
    const state = describeDatabaseStartupError(error);
    return (
      <StateMessage
        title="Couldn’t open your notebook"
        message={state.message}
        actionLabel={state.canRetry ? 'Try again' : undefined}
        onAction={state.canRetry ? retry : undefined}
      />
    );
  }
  if (!connection) return <StateMessage title="Opening your notebook" message="Your notes stay on this device." loading />;
  return <DatabaseMigrationGate connection={connection} onRetry={retry} />;
}

export default function RootLayout() {
  return <SafeAreaProvider><DatabaseStartup /></SafeAreaProvider>;
}
