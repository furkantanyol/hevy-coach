# Changelog

## 1.0.0 (unreleased)

### Breaking

- Node 22.18+ required.
- `hevy-coach-http` requires `MCP_AUTH_TOKEN`, binds to `127.0.0.1` by default, and needs `MCP_ALLOWED_HOSTS` to bind elsewhere. CORS is off unless `MCP_ALLOWED_ORIGINS` lists browser origins.
- `create-body-measurement` and `update-body-measurement` replaced by `log-body-measurement` (create or overwrite).
- `create-routine` and `update-routine` take `folder_id` (snake_case) and `update-routine` can now move a routine between folders.
- Error results include Hevy's HTTP status, error code and message instead of a generic axios message.

### Fixed

- `get-exercise-progression` threw on live data: exercise history is flat (one row per set), not nested.
- `get-workout` and `analyze-workout` returned "not found" for valid workouts because the response was assumed to be wrapped.
- `batch-find-exercises` and `find-exercise` prefer an exact title match and rank partial matches by shortest title, so "Squat" no longer resolves to an arbitrary variant.
- RPE inputs validated against Hevy's allowed values.

### Changed

- Built on `@furkantanyol/hevy-client`; axios removed.
- Coaching prompts moved to `prompts/` (`COACH.md`, `CHATGPT.md`, `GEMINI.md`).

## 0.2.0 (2026-05-31)

- Body measurement tools. Fixed exercise-history path, custom exercise body fields, routine folder handling.

## 0.1.x

- Initial MCP server with workout, routine, exercise and coaching tools.
