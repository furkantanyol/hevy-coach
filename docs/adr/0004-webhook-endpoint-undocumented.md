# ADR 0004: Ship the undocumented webhook endpoint in the client only

Date: 2026-09-09. Status: accepted.

## Context

`/v1/webhook-subscription` is absent from Hevy's OpenAPI document but exists and works (see `docs/api/probes-2026-09-09.md` §8). Its request body is camelCase (`authToken`) while the response is snake_case (`auth_token`). One subscription per API key; POST replaces it.

## Decision

- The client exposes `webhook.get()`, `webhook.set()` and `webhook.delete()` with hand-written types marked "undocumented endpoint, verified 2026-09-09".
- The MCP server exposes no webhook tools: it is not a webhook receiver, and letting an LLM repoint someone's webhook has no coaching value.
- The delivery payload shape (`{id, payload: {workoutId}}` per community reports) is not typed because it was not exercised.

## Consequences

- If Hevy changes or removes the endpoint, only the `webhook` namespace breaks; a re-probe updates the docs and types.
