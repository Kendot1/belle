# Threat model

## Assets and trust boundaries

Assets are note titles/body/editor JSON, comments/anchors, the FTS index, database key, and transient AI prompts/results. User-authored content and model output are untrusted. Boundaries are the React Native UI to the SQLite repository, the 10tap editor WebView bridge to app UI, and the typed JavaScript-to-Swift AI bridge.

## Controls in the MVP

- SQLCipher is requested through Expo SQLite's native config plugin. A generated key is held in SecureStore (iOS Keychain / Android Keystore), not source or database files.
- Startup checks that SQLCipher is present before retrieving or creating the database key. Web and unsupported native builds fail closed; no plaintext database fallback is used.
- Migrations are versioned. Repository queries use Drizzle predicates and bound SQL values. FTS input is tokenized before MATCH.
- SQLite triggers keep search rows synchronized with note writes. Note and comment changes that must agree use a transaction.
- There are no account, sync, analytics, telemetry, server, or remote-model features. No app-level network client receives note content.
- Rich text is persisted as JSON; the extension set excludes link/image loading. The installed 10tap package bundles its editor HTML; the app omits link and image bridges. Runtime WebView origin restrictions still need device verification.
- The local model receives only explicit bounded text and has no database, file, shell, or network capability. Output is untrusted and reviewed before apply.
- Logs and errors must not contain note text, comments, prompts, generated output, keys, or personal paths.

## Residual risks and evidence limits

This source review cannot prove native SQLCipher linkage, Keychain/Keystore access controls, OS file protection, backup behavior, WebView origin restrictions in the built app, Foundation Models local execution/cancellation, or deletion from OS backups. The application has no export or restore flow. SecureStore/Keychain may persist beyond app uninstall under platform behavior. Key loss makes the encrypted database unreadable. Before release, verify the generated native configuration and test airplane mode, database restart, key handling, backup/restore, VoiceOver, and local model behavior on supported devices. No live services or personal data are in scope.
