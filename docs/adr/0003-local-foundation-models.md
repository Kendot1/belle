# ADR 0003: Local Foundation Models provider

- Status: accepted for MVP
- Date: 2026-10-20

## Context

Users requested useful AI while keeping note content and prompts on-device. Device and region availability is not universal.

## Decision

Expose a typed provider contract backed only by Apple's Foundation Models through a narrow Swift Expo module. Query availability at runtime, bound input, support cancellation, and show generated output for review. Keep AI optional and notes usable without it.

## Consequences

AI needs a development build and supported iOS 26+ Apple Intelligence hardware. Older devices show an unavailable state; there is no remote or bundled-model fallback. Native generation, cancellation, and availability reasons need physical-device testing.
