# Changelog

## 1.0.0 (2026-09-09)

First release, extracted from `hevy-coach` 0.2.0.

- Typed client for every documented Hevy v1 endpoint, types generated from the live OpenAPI document (2026-09-09 snapshot) with documented corrections for spec bugs.
- `fetch` only; runs in Node 20+ and React Native. Zero runtime dependencies.
- `listAll()` on every paginated resource; `workouts.changes(since)` returns upserts, deletes and a cursor.
- Retries with exponential backoff and jitter on 429, 5xx and network errors. POST retries only on 429.
- `HevyApiError` carries status, Hevy's error code and the parsed body. `HevyNetworkError` for transport failures.
- Optional in-memory GET cache (`cacheTtlMs`), cleared on any write.
- `bodyMeasurements.upsert()` (create, or overwrite on 409).
- Undocumented `webhook` endpoint, verified live 2026-09-09.
- ESM and CJS builds with type declarations for both.
