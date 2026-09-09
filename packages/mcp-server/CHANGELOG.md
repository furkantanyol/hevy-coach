# Changelog

## 1.0.0 (unreleased)

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
