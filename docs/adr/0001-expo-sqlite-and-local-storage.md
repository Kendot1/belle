# ADR 0001: Expo SQLite and local storage

- Status: accepted for MVP
- Date: 2026-10-20

## Context

The workspace is blank and the product needs durable local notes, transactional search updates, and schema migrations without a server.

## Decision

Use Expo SDK 58, Expo Router, `expo-sqlite`, and Drizzle ORM with FTS5. Keep the repository behind a feature-facing interface. Enable SQLCipher and store a generated key in SecureStore. Apply versioned SQL migrations transactionally.

## Consequences

The native development build is required; Expo Go is insufficient. Note data and FTS stay local. Key recovery, backups, and encryption behavior require device validation. We do not claim backup exclusion or verified at-rest encryption until native checks pass.
