# ADR 0001: Split into a client package and an MCP server package

Date: 2026-09-09. Status: accepted.

## Context

`hevy-coach` 0.2.0 was one npm package with an axios client, hand-written types and MCP tools mixed together. A React Native app needs the same API access without the MCP SDK, Express or Node-only code.

## Decision

pnpm workspace with two publishable packages:

- `@furkantanyol/hevy-client`: fetch-only typed client, no runtime dependencies, ESM + CJS.
- `hevy-coach`: MCP server that depends on the client, ESM only (it is a CLI; Node 22+ can `require()` ESM anyway).

Types are generated from the saved OpenAPI snapshot, not written by hand.

## Consequences

- The server package must be built after the client (`pnpm -r build` is topological).
- `pnpm typecheck` runs after `pnpm build` in `validate`, because the server resolves the client through its `exports` map to `dist/`.
- One `HevyClient` per process in the server; the MCP HTTP entry still creates one `McpServer` per session, sharing the key.
