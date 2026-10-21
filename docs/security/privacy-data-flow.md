# Privacy and data flow

| Data | Stored or processed | Leaves the app? |
| --- | --- | --- |
| Note title and rich-text JSON | SQLite configured for SQLCipher in app storage; native encryption verification is pending | No application network path |
| Derived plain text and FTS index | Same SQLite database | No application network path |
| Comment, quote, context, position | Same SQLite database | No application network path |
| Database key | Expo SecureStore (iOS Keychain / Android Keystore) | No application network path |
| Explicit AI input and output | Foundation Models session and temporary UI state | No remote AI provider |

AI runs only after a user action. It receives selected text or note body up to 8,000 characters; longer input is rejected with an explanation. Results are transient until reviewed. Foundation Models availability depends on device, OS, region/language, Apple Intelligence settings, and model readiness; there is no remote fallback.

Web previews and native builds without SQLCipher are refused before the key is read or created. The app does not open the notebook using unencrypted storage on those platforms.

No analytics, telemetry, account, sync, or server dependency is included. PDF bytes and attachments are not in this MVP. No user export/restore control exists. Device backups are platform-controlled and have not been verified; do not describe the app as excluding data from backups or securely erasing it.
