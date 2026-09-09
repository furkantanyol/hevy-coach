# ADR 0005: Generate types from the live spec, patch known spec bugs in one script

Date: 2026-09-09. Status: accepted.

## Context

Hevy's OpenAPI document (`docs/api/hevy-openapi.2026-09-09.json`) has errors that break code generation or produce wrong types: `type: "enum"`, a boolean `required`, `rest_seconds` typed as string, no `required` lists on response schemas, event `type` without literals, missing `id`/`created_at` on body measurements, `routine_id` not nullable. All were verified against the live API (`docs/api/probes-2026-09-09.md`).

## Decision

`packages/hevy-client/scripts/generate-types.mjs` loads the untouched snapshot, applies each patch with a comment citing the probe section, and runs openapi-typescript. The generated `src/generated/schema.ts` is committed so consumers and CI do not need the generator.

The snapshot itself is never edited. A new snapshot gets a new dated file and a re-run.

## Consequences

- Every deviation from Hevy's document is listed in one place with its evidence.
- Response types are strict (fields required) where the live API always returns them; request types stay optional where the spec says so.
- `Rpe` follows the spec enum (`6, 7, 7.5 … 10`, no 6.5).
