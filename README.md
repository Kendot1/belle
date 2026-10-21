# Quiet Notes

Quiet Notes is an iOS-first notebook for private notes. It is built with Expo, React Native, TypeScript, Expo Router, expo-sqlite, Drizzle, and 10tap. Notes, comments, search indexes, and explicit AI inputs stay in app-local storage; the app has no accounts, cloud sync, analytics, telemetry, server, or remote AI provider.

## MVP scope

- Create, edit, search, pin, organize, and delete notes locally.
- Write rich text with headings, lists, emphasis, and highlights.
- Add comments to selected passages; quotes and nearby context help recover anchors after edits.
- Use on-device summarize, rewrite-selection, and key-points actions when Apple's Foundation Models are available. Generated text is reviewed before insertion or replacement.
- PDF markup, attachments, export, restore, and backup controls are deferred; see [ADR 0004](docs/adr/0004-pdf-and-export-scope.md).

## Development

Use Node.js 22.13 or newer and pnpm. Run `pnpm install`, then `pnpm start` for Metro. The app uses SQLCipher and a local Swift Expo module, so it requires a development build. Expo Go is not a supported runtime for the complete app. A browser preview can bundle, but cannot open the encrypted notebook; there is no plaintext storage fallback. `pnpm ios` creates and builds the iOS project on macOS with Xcode and CocoaPods. The repository does not include a checked-in `ios/` project.

The minimum iOS target is 16.4. Note editing, search, and annotations are designed to work without connectivity. Foundation Models require iOS 26 or later plus an eligible device, supported region/language, Apple Intelligence enabled, and a ready on-device model. Unsupported devices keep all non-AI note features.

## Data and privacy

The app configures SQLite for SQLCipher and stores a generated database key with Expo SecureStore (iOS Keychain / Android Keystore). Native encryption and key handling still require device verification. The editor document is versioned JSON; plain text is derived for previews and search. AI is a user-initiated local Foundation Models action with bounded input and a review step. The app has no application network path for note content.

There is no export or restore feature. Device backup behavior depends on the OS and build configuration and has not been confirmed on physical devices. SecureStore/Keychain lifecycle, SQLCipher linkage, backup policy, and key-loss recovery require native-device validation. Do not treat the MVP as a verified backup-exclusion or secure-deletion implementation.

## Checks

Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`. The [QA plan](docs/qa/test-plan.md) records expected coverage and platform-only checks. Native iOS build, restart-through-app, Foundation Models generation/cancellation, VoiceOver, and keyboard behavior require macOS/Xcode and supported iOS devices.
