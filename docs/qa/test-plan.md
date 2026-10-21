# QA plan

## Acceptance criteria

- Create, edit, move, pin, delete after confirmation, and search notes without connectivity.
- Close/reopen the database and retain title/body, collection, pin, annotations, and FTS results.
- Verify web preview and native builds without SQLCipher show actionable development-build guidance and never read or write note data through a plaintext database.
- Keep editor drafts after a failed save and expose retry; flush saves before route exit.
- Verify bold, italic, heading, list, undo/redo, highlight, comment-on-selection, comment-to-source navigation, and comment review.
- Exercise unique, moved, repeated/context-resolved, ambiguous, and missing annotation anchors.
- Check Foundation Models availability at runtime; unavailable states leave note features usable. Cancel without applying; review, apply, replace, and discard each action.
- Inspect app source/runtime network behavior to ensure note text, prompts, output, and attachments are not sent by an app network path.
- Check VoiceOver names/focus order, Dynamic Type, minimum touch sizes, keyboard access, dark mode, and reduced motion.

## Automated checks

Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`. The focused suite should cover database startup errors and platform guards, pure document/anchor logic, AI-unavailable mapping, and the checked-in SQL migration using local dummy data. The SQLite fixture should insert, update, search, close, and reopen a temporary database to verify migration/FTS persistence. Static checks can inspect the source for remote request APIs and required accessible names/identifiers; these do not replace runtime verification.

## Verification run — 2026-10-21

- `pnpm install --offline --no-frozen-lockfile --ignore-scripts --node-linker=isolated --child-concurrency=1` completed using the local pnpm cache; install scripts were disabled.
- `pnpm typecheck` passed with TypeScript 6.0.3.
- `pnpm lint` passed for `src`, `tests`, and `modules`.
- `pnpm test` passed all 17 tests. Coverage included note/comment/FTS persistence across a local SQLite close/reopen, quote/context anchor resolution and editor-position mapping, AI availability/input limits, SQLCipher build gating and startup error copy, accessible labels/touch-size source checks, and a static scan for application network APIs.
- `pnpm exec expo install --check` reported `Dependencies are up to date`.
- `git diff --check -- .` passed.
- `node node_modules/expo/bin/cli prebuild --platform ios --no-install` could not generate the iOS project on this Windows host; Expo reports that iOS prebuild generation must run on macOS or Linux. `xcodebuild` and an iOS simulator are unavailable here.

The SQLite close/reopen check uses Node's local `node:sqlite` with a temporary, unencrypted test database; it is not proof of SQLCipher, Keychain, or persistence through an app restart. Anchor and accessibility checks exercise source-level logic/markers, not the rendered WebView, VoiceOver, or Dynamic Type. The network check scans app source for request APIs and embedded URLs; it is not an airplane-mode or packet-capture test. Those device checks remain outstanding.

## Environment limits

The current environment is Windows and has no Xcode, iOS simulator, CocoaPods, Maestro, or physical iPhone. It cannot establish native iOS compilation, SQLCipher/Keychain integration, app restart through the UI, Foundation Models generation/cancellation, airplane-mode behavior on device, VoiceOver, Dynamic Type, or keyboard layout. On macOS, build the iOS development client and run list/editor/annotation flows on iOS 16.4+; test local model actions on eligible iOS 26+ hardware. Keep these as unverified until fresh device evidence is recorded.
