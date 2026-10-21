# Architecture overview

## MVP boundary

Quiet Notes is an iOS-first Expo/React Native app with local-only note storage. The MVP implements note capture and editing, keyword search, collections and pinning, quote-anchored comments, and optional local AI. PDF files, other attachments, export/restore, accounts, sync, analytics, telemetry, remote AI, and server APIs are outside this release.

## Component boundaries

- `src/app/` contains Expo Router layouts and routes. Route components compose feature interfaces and do not issue SQL or call native APIs directly.
- `src/features/notes/` owns note/editor domain types and the `NotesService` contract.
- `src/features/annotations/` owns selected-quote/context anchors and attached/ambiguous/missing resolution.
- `src/features/ai/` owns the typed provider interface, provider context, action constraints, availability/progress/cancel/review behavior.
- `src/core/database/` owns schema, transactional migrations, SQLCipher initialization, FTS query construction, and the SQLite repository.
- `src/core/platform/` owns the typed adapter to the local AI module.
- `modules/local-ai/` is an Apple-only Expo Swift module exposing availability, bounded text generation, and per-request cancellation.

The feature-facing contracts isolate presentation from SQLite and Foundation Models. Dependencies flow from routes to feature/domain interfaces and from data/native adapters toward those interfaces.

## Data flow

The editor document is versioned Tiptap JSON. The domain derives plain text for preview and FTS. A note row update fires the FTS trigger in the same SQLite transaction. Search values are bound; user text is normalized into quoted FTS tokens. Comments store a selected quote, up to 64 characters of nearby context on each side, a position hint, and a comment. Resolution searches the latest plain text and never trusts the saved absolute position by itself.

AI runs only after an explicit user action. The provider checks availability at runtime and supplies only the selected text or bounded note text (maximum 8,000 characters) to a short-lived Foundation Models session. The native module exposes no database, filesystem, shell, or network API. Output remains transient and untrusted until the user reviews and applies it.

## Persistence and offline behavior

SQLite is the source of truth. Expo SQLite is configured for FTS5 and SQLCipher; a generated random key is stored by Expo SecureStore rather than alongside the database. Startup checks SQLCipher before retrieving or creating the key. Web and any native build without SQLCipher are blocked from opening the notebook; there is no plaintext fallback. The app has no application network client. Note editing, search, annotations, pinning, and collections do not depend on model availability or connectivity.

## Native and platform constraints

SQLCipher and the local Swift module require a development build. Expo Go and web previews cannot open encrypted notes. The declared target is iOS 16.4+. Foundation Models are checked at runtime and require supported iOS 26+ hardware/settings/model readiness. On Android the optional Apple module is absent and AI is reported unavailable; note flows remain available.

The task environment is Windows, with no Xcode, iOS simulator, CocoaPods, Maestro, or physical iPhone. TypeScript, lint, pure-domain tests, and local SQLite migration tests can run here; native compilation, SQLCipher linkage, Keychain behavior, restart-through-app, and on-device accessibility need a macOS/iOS follow-up.
