# Changelog

## 1.1.0 (2026-10-30)

Types regenerated from the 2026-10-29 OpenAPI document (`docs/api/probes-2026-10-29.md`).

- `UserInfo` gains `username`, `is_pro`, `weight_unit` and `distance_unit`.
- `ExerciseTemplate` gains `thumbnail_url`.
- `workouts.create()` unwraps the `{ workout: [Workout] }` response the spec now documents; a bare `Workout` is still accepted.
- `Routine.exercises[].rest_seconds` and `notes`, `Workout.description` and `exercises[].notes` are typed nullable, matching the spec.
- `RoutineSet` no longer has `rpe`: the spec dropped it and live routine responses do not carry it (RPE is workout-only). Code reading `rpe` on routine sets will stop compiling.
- `exerciseTemplates.create()` resolves to the new exercise template id (a string), the shape observed live on 2026-10-30 (`docs/api/probes-2026-10-30.md`). It was typed `{ id: number }` from the spec, and it now throws if the API ever sends that shape. Code reading `.id` on the result will stop compiling.
- `POST /body_measurements` is documented as `201` with an empty body; the client already handled that.
- Two generator patches removed because the spec now agrees with the live API (`rest_seconds` type, `routine_id` nullable).

## 1.0.0 (2026-09-11)

Published as `hevy-sdk`. Previously published as `@furkantanyol/hevy-client` 1.0.0 (2026-09-09), now deprecated. Same code.

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
