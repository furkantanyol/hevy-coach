# Changelog

## 1.1.0 (2026-10-29)

- `get-user-info` now returns username, Pro status and the user's weight and distance units (hevy-sdk 1.1.0, 2026-10-29 spec).
- `get-exercise-template` and `get-exercise-templates` include `thumbnail_url`.
- `create-exercise-template` description notes the per-account custom exercise cap (403 `exceeds-custom-exercise-limit`).
- `create-exercise-template` returns `{ exercise_template_id }`, usable directly in routines and workouts. The previous description said the returned id was not a template id; live, it is (`docs/api/probes-2026-10-30.md`).
- `rest_seconds` on routine exercises says that `0` means no timer and that a superset needs `0` on every exercise except the last.
- `create-workout` always returns a bare workout object, whether or not the API wraps it in `{ workout: [...] }` as the 2026-10-29 spec documents.
- `create-routine` and `update-routine` say that routine-level `notes` is not returned by any read endpoint (verified live 2026-10-29), so it cannot be confirmed through the API.

## 1.0.1 (2026-09-11)

- Client dependency renamed to `hevy-sdk` (was `@furkantanyol/hevy-client`). No behavior change.

## 1.0.0 (2026-09-09)

### Breaking

- Node 22.18+ required.
- `hevy-coach-http` requires `MCP_AUTH_TOKEN`, binds to `127.0.0.1` by default, and needs `MCP_ALLOWED_HOSTS` to bind elsewhere. CORS is off unless `MCP_ALLOWED_ORIGINS` lists browser origins.
- `create-body-measurement` and `update-body-measurement` replaced by `log-body-measurement` (create or overwrite).
- `create-routine` and `update-routine` take `folder_id` (snake_case). `update-routine` moves a routine when `folder_id` is given (null = "My Routines") and keeps the folder when it is omitted. `rpe` is no longer accepted on routine sets (Hevy rejects it).
- Error results include Hevy's HTTP status, error code and message instead of a generic axios message.

### Fixed

- `get-exercise-progression` threw on live data: exercise history is flat (one row per set), not nested.
- `get-workout` and `analyze-workout` returned "not found" for valid workouts because the response was assumed to be wrapped.
- `batch-find-exercises` and `find-exercise` prefer an exact title match and rank partial matches by shortest title, so "Squat" no longer resolves to an arbitrary variant.
- RPE inputs validated against Hevy's allowed values.
- `get-exercise-progression` trends bodyweight exercises on max reps (was always "plateau") and reports a true all-time best; `progressionKg` is now `progression` with a `trendMetric` field.
- `analyze-workout` judges "reps hit" on the weakest working set, not the mean; `get-training-summary` counts sessions per workout, not per exercise entry.
- `find-exercise` matches muscle groups written with spaces ("upper back").
- `create-exercise-template` invalidates the exercise cache so the new exercise is immediately findable.

### Changed

- Built on `@furkantanyol/hevy-client`; axios removed.
- Coaching prompts moved to `prompts/` (`COACH.md`, `CHATGPT.md`, `GEMINI.md`).

## 0.2.0 (2026-05-31)

- Body measurement tools. Fixed exercise-history path, custom exercise body fields, routine folder handling.

## 0.1.x

- Initial MCP server with workout, routine, exercise and coaching tools.
