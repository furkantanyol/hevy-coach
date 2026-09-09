# ADR 0003: fetch only, no HTTP library

Date: 2026-09-09. Status: accepted.

## Context

The client must run in Node 20+ and React Native (Hermes). Both ship a global `fetch`. axios adds ~30 kB, Node-specific adapters and a second error model.

## Decision

The client uses `fetch` exclusively. It is injectable (`options.fetch`) for tests and polyfills. Query strings are built by hand because React Native's `URLSearchParams` is incomplete. No `AbortSignal.timeout`; callers pass their own `signal`.

Retries: 429, 5xx and network errors, exponential backoff with full jitter, `Retry-After` honoured. POST retries only on 429 because a 5xx may already have created the resource.

## Consequences

- Zero runtime dependencies for `@furkantanyol/hevy-client`.
- Errors are two classes: `HevyApiError` (non-2xx, carries status, Hevy's `error` code and parsed body) and `HevyNetworkError`.
