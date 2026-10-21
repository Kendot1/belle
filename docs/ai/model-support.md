# AI model support

## Provider and availability

The only provider is an Apple Foundation Models Expo Swift module. JavaScript calls `availability()` at runtime and maps `available`, unsupported OS, device ineligibility, Apple Intelligence disabled, model not ready, and unknown/unavailable build states to user-facing text. A new `LanguageModelSession` is used for each user action. The native module receives only an action name and explicit bounded text; it has no file, database, shell, or network capability.

## Actions and review

Supported actions are summarize, rewrite selected text, and extract key points. Input is limited to 8,000 characters. The UI rejects longer passages with an explanation instead of silently truncating them. The JavaScript and Swift layers expose cancellation by request ID and discard cancelled/partial output. Whether Foundation Models promptly stops underlying generation after task cancellation must be checked on device. Results are transient until the user reviews them. Summary/key points are inserted only after approval; rewrite replaces the selected text only after approval. The app never silently overwrites saved note content.

## Limits

Foundation Models requires iOS 26 or later, eligible hardware, supported language/region, Apple Intelligence enabled, and a ready system model. It is unavailable on older devices, Android, Expo Go, and builds without the local module. Editing, search, collections, pinning, and annotations remain available. There is no bundled/downloaded model, cloud fallback, or desktop model runtime. Native availability reasons, cancellation, and generation need physical-device verification.
