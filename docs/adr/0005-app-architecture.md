# ADR 0005: Quiet Notes MVP architecture and scope

- Status: accepted
- Date: 2026-10-21

## Context

At task start, the repository contained an Expo Router shell, feature-facing note/AI contracts, an Expo SQLite/Drizzle schema and repository, comment-anchor helpers, and decisions for 10tap, Foundation Models, and deferred PDF support, but lacked user-facing routes, the Swift AI bridge, and focused tests. This ADR records the narrow MVP that completes those vertical slices without replacing the framework.

The supported baseline is Expo SDK 58, React Native 0.88, React 19.3, Node 22.13+, and iOS 16.4+. The current environment is Windows and has no Xcode or iOS simulator; native iOS compilation and device behavior must remain explicit release checks.

## Decision

Deliver a vertical slice with a notes list, CRUD, local keyword search, Personal/Work/Ideas collections, pinning, a 10tap rich-text editor, context-anchored comments with source navigation, and optional on-device summarize/rewrite/key-points actions. Use the existing SQLite/Drizzle repository and schema, and keep route components out of direct SQL. Add the narrow Swift Expo module needed for Apple Foundation Models and return an explicit unavailable status on unsupported OS/device/builds. AI output remains transient until user review.

Keep PDF import/markup, attachment storage, export/restore, accounts, sync, analytics, telemetry, remote AI, and server APIs outside this MVP. Do not add vector search or a downloaded model without a new documented product/architecture decision.

## Boundaries

- `src/app/` contains Expo Router route files and layouts only.
- `src/features/` owns note workflows, annotation anchors, and AI provider contracts and context.
- `src/core/database/` owns schema, migrations, encryption setup, and repository queries.
- `src/core/platform/` owns the typed JavaScript-to-native AI adapter.
- `modules/local-ai/` contains only a narrow Apple Foundation Models Expo module; it receives explicit bounded text and has no file, database, shell, or network capability.
- The database remains the source of truth. Search indexing is updated through SQLite triggers with note writes.

## Consequences

The app requires a development build because SQLCipher and the local Swift module are not in Expo Go. iOS 16.4+ users can take notes; AI is available only when Foundation Models reports ready on a supported iOS 26+ device. Android may use note features, but its AI provider is unavailable unless a separately approved on-device implementation is added. Native persistence, encryption, backup, Foundation Models cancellation, and accessibility still require device checks.

## Evidence and references

Expo SDK 58's official reference lists React Native 0.88, React 19.3, Node 22.13+, and iOS 16.4+. Expo's SQLite reference documents FTS and SQLCipher config-plugin flags and notes that SQLCipher is unavailable in Expo Go. See [the reference index](../references/index.md).
