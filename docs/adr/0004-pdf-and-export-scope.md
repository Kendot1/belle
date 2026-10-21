# ADR 0004: Defer PDF markup and export

- Status: accepted for MVP
- Date: 2026-10-20

## Context

PDF import is optional. PDFKit needs a Swift module, sandboxed file lifecycle, page/document anchoring, and round-trip validation. This workspace has no pre-existing app or iOS build environment.

## Decision

Deliver notes, rich text, comments, search, and local AI first. Do not add PDF imports or export/restore until their storage, backup, and annotation behavior can be designed and tested on iOS.

## Consequences

PDF, attachment import, export, and restore are not available in the MVP. A later change needs a PDFKit ADR, file-integrity checks, original-preservation behavior, and device QA.
