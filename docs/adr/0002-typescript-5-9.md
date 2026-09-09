# ADR 0002: Pin TypeScript 5.9.x

Date: 2026-09-09. Status: accepted. Revisit at 1.1.

## Context

On 2026-09-09 npm `latest` for `typescript` is 7.0.2 (the Go-based compiler), with 6.0.3 also available. The rule for this repo is: use the highest version that openapi-typescript, tsdown and Biome all declare support for.

| Tool | Declared TypeScript support |
|---|---|
| openapi-typescript 7.13.0 | `^5.x` (peerDependency) |
| tsdown 0.23.0 | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
| @biomejs/biome 2.5.12 | no TypeScript dependency |

## Decision

Pin `typescript@5.9.3` (exact) at the workspace root. openapi-typescript is the blocker.

## Consequences

- No TS 6/7-only syntax or flags in the codebase.
- When openapi-typescript adds 6.x or 7.x to its peer range, bump and remove this pin.
