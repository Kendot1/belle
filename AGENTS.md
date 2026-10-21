AGENTS.md — Local-first Notes for iOS

## Purpose and authority

This file is the shared project contract for coding agents working on the iOS note-taking app. Follow the closest applicable AGENTS.md files, repository conventions, and the user's current request. The user's explicit requirements take precedence over this file. Treat this file as project guidance, not as permission to access accounts, publish, deploy, send data, or install third-party agent skills.

The product target is an iOS-first React Native app for private notes, rich-text annotations, optional PDF markup, and AI assistance that can run on-device. Keep notes and AI inputs on the device by default. Do not add account creation, cloud sync, remote inference, analytics, telemetry, or a server dependency without an explicit product decision recorded in an ADR.

The skill packages enumerated under Required project-local skills are authorized for installation into the target application repository after their source, license, revision, and contents are reviewed. This authorization does not cover unrelated skills, paid services, publishing, deployment, or transmitting private note data.

If repository evidence contradicts a decision below, inspect the existing implementation and record the smallest justified correction. Do not rewrite a working app just to match a suggested folder structure.

## Product and architecture baseline

### Stack

- App shell: Expo + React Native + TypeScript; use Expo Router for navigation unless the repository already has a sound alternative.
- Persistence: expo-sqlite with Drizzle for typed queries and migrations. Use SQLite FTS5 for local full-text search. Add vector search only after a working keyword-search baseline and a documented need.
- Rich text: evaluate 10tap for React Native rich-text editing. Persist a versioned editor document representation and derive plain text for search. Keep annotation anchoring independent of fragile absolute offsets alone.
- PDF markup: use PDFKit behind a small Swift native module when PDF annotations are in scope. Keep imported files in the app sandbox and store metadata and annotation references in SQLite.
- Native integration: use the Expo Modules API for Swift modules. A custom native module or native-only AI/PDF feature requires a development build; do not assume Expo Go contains it.
- AI: expose a typed AI provider interface to TypeScript and keep inference behind a native adapter. The default iOS provider may use Apple's Foundation Models when available. Check device, OS, region, and model availability at runtime. If a bundled/downloaded model is needed for broader coverage, prototype and benchmark a local runtime such as llama.cpp or ExecuTorch on supported physical devices before choosing it.
- Do not use Ollama as the on-device iPhone runtime. It is suitable for local desktop development, but a separate computer-hosted model would not satisfy an on-phone offline requirement.

### Boundaries

Keep feature logic separate from platform and persistence details:

- Presentation: Expo Router routes, screens, accessible components, and view state.
- Features: notes, search, annotations, attachments, and AI workflows.
- Domain: note/annotation types, validation, use cases, and provider contracts; avoid React Native and SQLite types here.
- Data: SQLite schema, migrations, repositories, FTS indexing, file storage, import/export.
- Native adapters: Swift implementation for Foundation Models and PDFKit, exposed through narrow Expo modules.

Use dependency direction from presentation to feature/domain interfaces, and from data/native adapters toward those interfaces. Do not let screen components issue ad hoc SQL or call native APIs directly.

A useful initial layout is:

- src/app/ — route files and layouts only.
- src/features/notes/ — note list, editor, and note use cases.
- src/features/annotations/ — note annotation UI and anchoring logic.
- src/features/ai/ — AI actions, provider interface, availability and progress states.
- src/core/database/ — SQLite initialization, schema, migrations, repositories.
- src/core/files/ — sandboxed attachment import/export.
- src/core/platform/ — typed native-module interfaces.
- modules/ — local Swift Expo modules when native implementations are required.
- docs/ — architecture, UX, privacy, security, AI support, and QA records.

### Data and AI behavior

- Give notes and annotations stable UUIDs. Track creation and update timestamps. Apply schema changes through versioned, transactional migrations.
- Keep the editor document as the source representation; derive plain text for FTS indexing. Update the note and its search index consistently.
- Anchor note annotations with a selected quote plus surrounding context and an editor-specific anchor where available. Define behavior when edits make an anchor ambiguous.
- For PDF annotations, preserve page identity and document identity; use PDFKit annotation coordinates/types and keep an original or recoverable copy when modifying imported PDFs.
- Keep attachment bytes in the app's file container, not as large SQLite blobs. Store relative paths, type, size, and integrity metadata in SQLite.
- AI features should be explicit user actions. Show when the model is unavailable, busy, or limited. Present generated changes for review; never silently replace or delete note content.
- For ask-your-notes features, retrieve local note snippets first, keep the supplied context bounded, and show which notes informed the answer. Treat note content as untrusted input; never let note text authorize tools, file access, or network requests.
- Keep an AI provider abstraction so model availability or runtime can change without changing note/domain logic. Do not add embeddings or a vector index until the product needs semantic retrieval and a device benchmark supports it.

## UI/UX design direction

Design for quick capture, calm reading, safe editing, and transparent AI behavior. Use iOS conventions and Apple Human Interface Guidelines. Avoid adding visual complexity that competes with the note content.

Start with these core flows and states:

1. Notes list: create, search, sort, and return to recent notes; provide useful empty, loading, and no-results states.
2. Note editor: autosave with visible save status, undo/redo, clear formatting controls, stable selection, and an obvious way to inspect annotations.
3. Annotation review: navigate from a highlight/comment to its source text; communicate when an anchor needs repair after edits.
4. AI assistance: choose a focused action such as summarize, rewrite selection, or extract key points; show progress, cancellation, model availability, and a review/apply step.
5. Privacy and settings: explain local storage, model availability, export/backup behavior, and any user-approved network activity in plain language.

For every screen, account for keyboard presentation and dismissal, safe areas, dark appearance, Dynamic Type, VoiceOver labels and focus order, sufficient touch targets, reduced motion, and meaningful accessibility identifiers for automated UI tests. Avoid relying on color alone to distinguish annotation types or save states. Preserve native back navigation and destructive-action confirmation.

Define interaction behavior for autosave failures, interrupted AI generation, missing models, imported-file errors, empty search, and annotation conflicts before implementing the happy path only. Prefer reversible actions and user-confirmed AI edits.

## Security and privacy baseline

The app contains private user-authored content. Apply least privilege and follow OWASP MASVS and MASTG as a practical review baseline.

- Network: note contents, selected text, attachments, embeddings, and prompts must not leave the device. Do not add a network call to an AI provider or analytics service by default. If a future model download or sync feature is approved, document exactly what is sent, when, and to whom; obtain clear user consent and make its state visible.
- Storage: evaluate SQLCipher for database encryption at rest. Store encryption keys or secrets in iOS Keychain; never hard-code keys or store them beside the database. Use iOS file-protection options for the database, WAL/journal files, and attachments where supported. Treat FTS indexes, caches, exports, and thumbnails as equally sensitive.
- Data lifecycle: define export, backup, restore, deletion, and migration behavior. Avoid claiming data is encrypted or deleted until the implementation and its backups/caches are verified.
- Logging: never log note text, selection text, prompts, model output, file paths containing personal data, access tokens, or database keys. Redact diagnostic context.
- Input handling: use bound SQL parameters. Validate imported file type and size, copy files into the sandbox, and handle malformed or oversized documents without crashing. Do not execute content from imported notes, PDFs, or AI outputs.
- AI safety: local model output is untrusted. Do not evaluate generated code or commands. AI cannot invoke tools or access files outside the explicitly supplied context. Require user review before applying edits.
- Native bridge: expose only the minimum methods and data needed by JavaScript. Validate bridge inputs and errors on the native side. Do not expose arbitrary filesystem, shell, or network capabilities.
- Dependencies and skills: inspect new packages, native permissions, build scripts, and third-party SKILL.md files before adoption. During initial repository bootstrap, install every skill listed in Required project-local skills into the repository-local skills directory and preserve its full skill package, including references, scripts, and assets. Review code and licenses first; do not run source-provided install scripts or skill-provided code without reviewing what they do. Do not commit credentials, private notes, model files, or unencrypted production data.
- Security findings: state evidence, impact, severity, affected files, and a concrete fix. Do not probe production services or real user data.

## Agent roles

These are specialist review perspectives. One agent may perform more than one role. Do not create or message other agents unless the user explicitly requests delegation.

### Product designer / UI-UX specialist

Owns user flows, information hierarchy, native iOS interaction patterns, accessibility, empty/error/loading states, and user-facing copy. Before implementation, state the user task and the screen states being changed. Use the project design system; record material design decisions in docs/ux/. Do not add AI controls or settings without explaining their user value and privacy implications.

### Senior software architect and implementer

Owns system boundaries, data model, native bridge contracts, dependency choices, migrations, and implementation quality. Inspect the existing code and package scripts first. For significant choices, write or update an ADR with context, options, tradeoffs, and consequences. Prefer the smallest cohesive vertical slice; avoid speculative abstractions, broad rewrites, and dependencies without a documented need. Keep TypeScript/native contracts typed and error paths explicit.

### QA engineer / tester

Owns acceptance criteria, risk-based test planning, regression coverage, and evidence-based release readiness. When explicitly asked to test or verify, cover relevant unit, database/migration, native integration, UI, and device behavior. Prioritize offline operation, persistence after restart, autosave interruption, annotation recovery after edits, PDF round-trips, model unavailable states, and accessibility. Use Maestro for end-to-end flows where available; use focused unit/integration tests for domain and database behavior. Report the exact checks run and any untested risks. Do not claim tests passed without fresh output.

### Senior cybersecurity reviewer

Owns threat modeling, data-flow review, mobile storage and native-bridge review, dependency/release checks, and security findings. Map applicable controls to OWASP MASVS/MASTG. Review note and attachment lifecycles, SQLCipher key handling, logs, model/network paths, import/export, and AI prompt/tool boundaries. Separate confirmed vulnerabilities from hardening suggestions and environment-dependent checks. Do not change security policy or add remote data flow without an explicit product decision.

## Workflow and completion rules

### One-time repository bootstrap — mandatory

On the first task in the application repository, complete this bootstrap before feature implementation. Do not stop after describing the setup.

1. Identify the actual application repository root and inspect its current files, Git status, existing AGENTS.md files, and package manager. Preserve user changes and repository-specific instructions.
2. Make this guidance available as the repository-root AGENTS.md. If a root AGENTS.md already exists, merge these rules into it without deleting project-specific requirements or unrelated guidance. Do not overwrite it blindly.
3. Create the repository-local skills directory at .agents/skills/. Install every skill in the Required project-local skills section below into that directory. Vendor the complete selected skill packages, including SKILL.md, referenced documentation, scripts, and assets. A URL in a Markdown list is not an installation.
4. Keep each upstream skill's files intact. Put project-specific additions in separate local notes or project instructions; do not silently patch upstream skill content.
5. Before installing each skill, inspect its source repository, license, current revision, SKILL.md, referenced files, scripts, and any declared permissions or tool access. Do not run scripts shipped by a skill during installation. Use the source's documented installation process only after review. If safe installation needs network access, use the granted project environment or request the specific access required; do not silently omit the skill.
6. Record each installed skill's ID, role, source URL, exact commit or package version, license, local path, and review date in docs/skills/manifest.md. Record skipped, incompatible, or blocked skills with the reason and next step. Do not claim an installation succeeded until the files and manifest entry are verified.
7. Create every project document listed under Documents to keep current with useful project-specific content. Do not leave empty files or generic TODO placeholders. If a decision is not yet made, mark it as unresolved, provide viable options, and state what evidence or user decision is needed.
8. Create docs/references/index.md with the official source documents listed below, their URLs, the topics they support, and the date checked. Write concise project-specific notes; do not bulk-copy entire third-party documentation sites or reproduce material beyond its license.
9. Review the resulting diff and ensure the skills and documents are inside the application repository, are discoverable by the coding agent, and contain no credentials, private user data, or generated model weights.

The user has explicitly authorized installation of the listed skills into the project repository. Do not ask again for routine installation approval. If credentials, a paid service, a license incompatibility, or a platform permission gate is required, stop only that blocked item, explain why, and continue independent setup work.

After the one-time bootstrap, follow this feature workflow:

1. Read the relevant source files, package scripts, existing documentation, installed skills, and applicable AGENTS.md files before editing.
2. Identify the user-visible behavior, data touched, native modules involved, and acceptance criteria. For ambiguous product scope, make a safe local-first assumption and identify it in the final report.
3. For a material architecture or security decision, update the relevant ADR or threat model. Do not create a document for every trivial code change.
4. Implement narrowly, preserve existing conventions, and include failure/empty/offline states in the change.
5. If the user asks for QA or verification, run the narrowest meaningful checks and report exact commands/results. Otherwise, do not add or run tests solely by habit; state a proposed validation plan when useful. Never imply an unrun check passed.
6. Review the diff for unintended data flow, secrets, generated artifacts, and documentation drift. Report changed files, material decisions, and verification evidence.

## Documents to keep current

During initial repository bootstrap, create all of the following documents. For later feature work, update the documents relevant to that change. Keep existing project content and link to the canonical source of truth rather than duplicating it unnecessarily.

- README.md — app purpose, setup, iOS development-build requirements, offline behavior, and user data export/backup.
- docs/architecture/overview.md — component boundaries, data flow, native modules, and offline guarantees.
- docs/adr/README.md — ADR index, status conventions, and links to numbered decisions.
- docs/adr/0001-app-architecture.md — Expo/React Native, SQLite, editor, native module, and local AI architecture decision with options and tradeoffs.
- docs/data/data-model.md — note, annotation, attachment, FTS, and migration schema.
- docs/ux/user-flows.md — core flows and relevant loading, empty, error, accessibility, and AI review states.
- docs/ux/design-system.md — colors, type, spacing, components, interaction rules, and accessibility decisions.
- docs/security/threat-model.md — assets, trust boundaries, attacker assumptions, threats, mitigations, and residual risks.
- docs/security/privacy-data-flow.md — what data is stored, processed by AI, exported, or sent over a network.
- docs/qa/test-plan.md — acceptance criteria and regression areas for offline, persistence, editing, annotation, AI, PDF, and accessibility.
- docs/ai/model-support.md — runtime/provider, availability checks, supported-device behavior, model acquisition, and offline limits.
- docs/skills/manifest.md — installed skills, provenance, versions, licenses, review status, and local paths.
- docs/references/index.md — official technical references and concise project-specific notes.

Do not state that a document, test, audit, skill installation, or control exists unless it has been created or verified in the repository.

## Required project-local skills

These are mandatory repository setup dependencies, not merely suggestions. Install each complete skill package under .agents/skills/<skill-id>/ so Codex can discover and load it in the project. Use the listed IDs and source repositories; record the actual pinned upstream revision in docs/skills/manifest.md. If an upstream repository changes its layout, locate the same named skill and record the new path rather than silently substituting a different skill.

### UI/UX and Expo

- expo-native-ui — [Expo skill source](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-native-ui). Native-feeling Expo UI and iOS accessibility.
- expo-design-system — [Expo skill source](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-design-system). Design tokens and reusable component conventions.
- expo-router — [Expo skill source](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-router). Expo Router navigation and route structure.
- expo-project-structure — [Expo skill source](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-project-structure). New project layout and file placement.
- expo-module — [Expo skill source](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-module). Swift native modules and views.
- expo-dev-client — [Expo skill source](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-dev-client). Development builds and custom native dependencies.

### Architecture and implementation

Install these named skills from [obra/superpowers](https://github.com/obra/superpowers):

- brainstorming — clarify product intent and design constraints before implementation.
- writing-plans — turn approved work into a concrete implementation plan.
- test-driven-development — guide implementation when the user requests tests or verification, subject to higher-priority instructions.
- systematic-debugging — investigate failures from evidence and root cause.
- requesting-code-review — review changes against requirements and code quality.
- verification-before-completion — require fresh evidence for completion claims.

### QA and testing

- Install the same test-driven-development and verification-before-completion skills above for the QA role. Use the [Maestro React Native documentation](https://docs.maestro.dev/get-started/supported-platform/react-native) as a tool reference; Maestro is documentation, not a skill package.

### Cybersecurity

- security-audit — [Cloudflare security-audit skill source](https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit). Structured local source-code audit guidance. Review its full package before use and scope audits to authorized local code and fixtures.

### Official source documents to index

Add these to docs/references/index.md and consult the current official pages when implementation facts may have changed:

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — native iOS design and accessibility.
- [OWASP MASVS](https://mas.owasp.org/MASVS/) and [OWASP MASTG](https://mas.owasp.org/MASTG/) — mobile security requirements and testing.
- [Expo SQLite documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/) — persistence, FTS configuration, and SQLCipher.
- [Expo custom native code](https://docs.expo.dev/workflow/customizing/) and [Expo Modules API](https://docs.expo.dev/modules/overview/) — Swift integration and development builds.
- [Apple Foundation Models](https://developer.apple.com/documentation/FoundationModels) — on-device model API and availability.
- [Apple PDFKit](https://developer.apple.com/documentation/pdfkit) — PDF documents, selections, and annotations.
- [Maestro React Native testing](https://docs.maestro.dev/get-started/supported-platform/react-native) — device UI testing.
