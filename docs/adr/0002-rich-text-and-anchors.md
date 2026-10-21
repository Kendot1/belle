# ADR 0002: TipTap document and resilient comment anchors

- Status: accepted for MVP
- Date: 2026-10-20

## Context

The app needs rich text, highlights, and comments that survive editing. Plain-text offsets are fragile and a custom native editor would exceed the initial scope.

## Decision

Use the 10tap React Native bridge with a restricted TipTap extension set and persist versioned TipTap JSON. Derive plain text for FTS. Store each annotation's quote, bounded prefix/suffix, editor position hint, and comment; resolve quotes using context and surface ambiguous/missing anchors.

## Consequences

The editor uses a local bundled WebView and needs native integration validation. Image and link extensions are omitted. 10tap docs identify the package as MIT; inspect the installed package and dependency scripts. Attached comments can return focus to their mapped source range. Manual reattachment, PDF anchors, and comment conflict repair remain future work.
