# hevy-coach monorepo

Two npm packages built on the Hevy public API:

- `packages/hevy-client` → `@furkantanyol/hevy-client`: typed fetch-only client (Node + React Native).
- `packages/mcp-server` → `hevy-coach`: MCP server with coaching tools, runs with `npx hevy-coach`.

The coaching persona and setup guides for Claude / ChatGPT / Gemini live in `prompts/`. This file is for working on the code.

## Commands

```bash
pnpm install
pnpm validate          # biome format+lint, build, typecheck, tests. The quality gate.
pnpm generate:types    # regenerate packages/hevy-client/src/generated/schema.ts from docs/api/*.json
pnpm --filter hevy-coach dev   # run the stdio server from source (needs .env with HEVY_API_KEY)
```

Build before typecheck: the server resolves the client through `exports` → `dist/`. `pnpm validate` does this in the right order.

## Rules

- TypeScript 5.9 pinned (ADR 0002). Strict, no `any`.
- Live API beats the spec. Spec bugs are patched in `packages/hevy-client/scripts/generate-types.mjs`, each with a comment citing `docs/api/probes-<date>.md`. Never edit the snapshot JSON or `src/generated/`.
- The client has zero runtime dependencies and no Node-only APIs. `fetch` only.
- Tests mock `fetch` via `options.fetch`; never hit the live API in tests.
- Writes against the live API only to routines named `[TEST] ...`.
- `HEVY_API_KEY` lives in a gitignored `.env` at the repo root. Never commit it.
- Decisions with a "why" go in `docs/adr/`. Keep them short.
- Small conventional commits.

## Layout

```
docs/api/        OpenAPI snapshots + probe results (the evidence)
docs/adr/        decisions
prompts/         COACH.md persona, CHATGPT.md, GEMINI.md, training-history.md template
packages/hevy-client/src   client.ts http.ts pagination.ts sync.ts errors.ts types.ts generated/
packages/mcp-server/src    cli.ts http.ts index.ts tools/ utils/
```
