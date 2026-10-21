# Goal: Complete Quiet Notes for Android and iOS

Make the existing Quiet Notes app a cohesive, reliable, offline-first React Native app for Android and iOS. Redesign and implement its system architecture, user flows, and UI/UX so notes, annotations, local AI, storage, security, and platform behavior fit together. Test the result and fix every issue you can reproduce.

Treat this as an implementation goal. Inspect the actual repository first, then continue through design, implementation, and verification. Do not stop after writing a plan or documents.

## Start with the repository

1. Read the root and nested `AGENTS.md` files, project documentation, package manifests and lockfile, Expo configuration, native Android/iOS files, source, and existing tests. Follow the repository instructions.
2. Inspect `.agents/skills` and other project skill locations. Find and use relevant UI/UX design, senior software architecture and implementation, QA/testing, and cybersecurity skills.
3. If required skills are missing, research reputable sources, install appropriate skills into the repository’s `.agents/skills` directory, and document their source, license, and intended use. Review their instructions before relying on them. Do not blindly trust or run scripts from an unverified source.
4. Establish the current build and test status before changing code. Preserve working user data and existing project configuration. Do not replace the app with a template or make broad changes without understanding their effects.

## Architecture and implementation

Design and implement a clear architecture that separates:

- UI screens and reusable components
- Application actions and state
- Note, annotation, and AI domain logic
- SQLite/SQLCipher repositories and migrations
- Secure key storage, files, and the on-device model runtime

Document the architecture and important decisions in `docs/`, using diagrams where useful. Update the root `AGENTS.md` so future agents can find the architecture, security rules, testing instructions, and installed skills.

Keep notes and inference on-device. Choose a practical model runtime that supports both Android and iOS, after checking current compatibility with this repository’s Expo and React Native versions. Put it behind a small provider interface so UI and note logic do not depend directly on one runtime. Do not introduce a cloud inference service.

Design the model lifecycle end to end: model availability, optional download or bundled model, storage location, integrity verification, progress, cancellation, loading, inference, errors, and cleanup. Be clear in the UI if a model must be downloaded before it can work offline. Keep model files in app-managed storage and never commit large model binaries or personal machine paths.

Use SQLCipher for note data where supported by the existing project. Keep encryption keys in platform secure storage, not source code or ordinary preferences. Preserve and verify database migrations and startup failure handling.

Implement note creation and editing, search, annotations, and AI actions as complete flows. Annotations must remain associated with the correct note and selected text as the note changes. AI-generated summaries or annotation suggestions must be reviewable and editable; never silently replace the original note or apply changes without the user’s action.

## UI/UX redesign

Create a consistent design system for Android and iOS: colors, typography, spacing, controls, navigation, touch targets, safe areas, and light/dark appearance. Use reusable components instead of one-off styling.

Design the full flow across the notebook, note editor, text selection and annotation tools, AI actions, model setup/status, and privacy/settings. Include clear empty, loading, success, offline, model-missing, unsupported-device, failure, and cancellation states. Keep platform interactions natural while preserving consistent behavior and language across both platforms. Make accessibility part of the implementation.

## Security and privacy

Use the cybersecurity skill to review the design and implementation. Check at minimum:

- Note content and keys never enter logs, analytics, or network requests.
- Inference runs locally; network access is limited to an explicit model download if needed.
- Downloads use a trusted source and integrity verification.
- Database keys and sensitive files use appropriate platform storage.
- Permissions, backup behavior, temporary files, errors, and generated content do not expose note data.
- AI output cannot trigger actions or modify notes without user review.

Document the threat model, data flow, storage choices, and remaining platform limitations in `docs/`.

## QA and verification

Use the QA/testing and security review skills to define and execute a verification plan. Add or update tests as needed. Verify:

- Note and annotation create, edit, search, persistence, and migration flows.
- Model setup, local inference, cancellation, missing-model, low-resource, and error paths.
- Airplane-mode behavior after the model is available.
- Data remains after app restart and failures do not corrupt notes.
- Accessibility and UI states on Android and iOS.
- Native Android and iOS configuration and builds, not just web bundling or TypeScript checks.

Run the relevant formatting, type checks, lint, unit/integration tests, and native builds. Test on an Android device or emulator and an iOS simulator/device when the environment supports them. If this machine cannot build or run iOS, use an already configured remote build if available; otherwise finish all iOS code and configuration checks, state the exact limitation, and do not claim iOS runtime validation passed. Never claim there are “no errors” unless the checks support that; fix every issue found and report any unverified area honestly.

## Completion

Do not finish with only recommendations. Implement the redesign, update the documentation and repository skills, and run the available checks. In the final report, summarize the architecture and UX changes, list the verification commands and results for each platform, and identify any remaining blocker with the specific action needed to resolve it.