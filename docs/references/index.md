# Technical reference index

Official technical references checked on 2026-10-21. These sources support compatibility and implementation decisions; project-specific conclusions remain in the ADRs and security/QA documents.

| Source | URL | Topics used in Quiet Notes |
| --- | --- | --- |
| Apple Human Interface Guidelines | https://developer.apple.com/design/human-interface-guidelines/ | iOS navigation, lists, sheets, typography, accessibility, and destructive confirmation |
| OWASP MASVS | https://mas.owasp.org/MASVS/ | Mobile storage, platform, network, and privacy review baseline |
| OWASP MASTG | https://mas.owasp.org/MASTG/ | Device-level test ideas for storage, platform behavior, and network observation |
| Expo SDK 58 reference | https://docs.expo.dev/versions/v58.0.0/ | Compatibility: SDK 58 targets React Native 0.88, React 19.3, Node 22.13+, and iOS 16.4+ |
| Expo SQLite SDK 58 | https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/ | FTS config, SQLCipher plugin option, key pragma, migration integration, and Expo Go limitation |
| Expo SecureStore SDK 58 | https://docs.expo.dev/versions/v58.0.0/sdk/securestore/ | iOS Keychain/Android Keystore behavior and device-only accessibility options |
| Expo Modules API | https://docs.expo.dev/modules/overview/ | Local Swift module, type-safe bridge, and native-module development |
| Expo development builds | https://docs.expo.dev/develop/development-builds/introduction/ | Why local native modules/configuration require a development build |
| Apple Foundation Models | https://developer.apple.com/documentation/foundationmodels | On-device model availability, unavailable reasons, and text generation session |
| Apple PDFKit | https://developer.apple.com/documentation/pdfkit | PDF document, page, selection, and annotation APIs; reviewed for deferral decision |
| Maestro React Native | https://docs.maestro.dev/get-started/supported-platform/react-native | Future simulator/device UI flow automation |
| 10tap editor upstream | https://github.com/10play/10tap-editor | Tiptap bridge usage, Expo development-build requirements, and MIT license |

## Checked compatibility findings

- The declared Expo/React Native/React/Node/iOS versions match the SDK 58 compatibility table. The SDK package checker reports that the resolved dependency graph is up to date (`pnpm exec expo install --check`, 2026-10-21); the React types and TypeScript ranges were aligned to the checker’s expected versions.
- Expo SQLite documents `enableFTS` and `useSQLCipher` in its config plugin. SQLCipher is not in Expo Go, and prebuild/native compilation is needed for the plugin to take effect.
- Expo Modules API supports Swift modules through `ModuleDefinition` and native autolinking. The local module must be built into a development client.
- Apple's Foundation Models API exposes runtime availability and reasons including device ineligibility, model readiness, and Apple Intelligence being disabled. Availability remains device/OS/region/language dependent.
- SecureStore values persist across app restarts; iOS Keychain behavior can also persist across reinstall for the same bundle ID. App deletion therefore is not claimed to erase the database key.
