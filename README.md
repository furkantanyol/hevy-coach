# HevyCoach

An AI strength coach on top of [Hevy](https://hevyapp.com), shipped as two npm packages:

| Package | What it is | Install |
|---|---|---|
| [`hevy-coach`](packages/mcp-server) | MCP server: 26 tools for workouts, routines, exercise history, body measurements, plus coaching analysis (workout vs plan, progression with Epley 1RM, training summaries, exercise lookup). | `npx hevy-coach` |
| [`@furkantanyol/hevy-client`](packages/hevy-client) | Typed, fetch-only client for the Hevy public API. Pagination, delta sync, retries. Works in Node 20+ and React Native. | `npm i @furkantanyol/hevy-client` |

Both are generated from and verified against the live Hevy API (`docs/api/`).

## Use the coach

You need a Hevy API key (Hevy Settings → API) and an MCP-capable assistant.

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "hevy-coach": {
      "command": "npx",
      "args": ["-y", "hevy-coach"],
      "env": { "HEVY_API_KEY": "your-hevy-api-key" }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add hevy-coach -e HEVY_API_KEY=your-hevy-api-key -- npx -y hevy-coach
```

Then give the assistant the coaching persona: paste [`prompts/COACH.md`](prompts/COACH.md) into a Claude Project's instructions (or see [`prompts/CHATGPT.md`](prompts/CHATGPT.md) and [`prompts/GEMINI.md`](prompts/GEMINI.md)) and say "let's do the onboarding".

For ChatGPT or Gemini web, run the HTTP transport: see the [server README](packages/mcp-server/README.md#http-transport).

## Use the client

```ts
import { createHevyClient } from "@furkantanyol/hevy-client";

const hevy = createHevyClient({ apiKey: process.env.HEVY_API_KEY! });

const { upserts, deletes, cursor } = await hevy.workouts.changes(lastCursor);
const history = await hevy.exerciseHistory.get("D04AC939", { startDate: "2026-01-01" });
```

Full API in the [client README](packages/hevy-client/README.md).

## Repository

```
packages/hevy-client   the client
packages/mcp-server    the MCP server
prompts/               coaching persona + assistant setup guides
docs/api/              live OpenAPI snapshot and probe results
docs/adr/              decisions
```

```bash
pnpm install
pnpm validate    # format, lint, build, typecheck, test
```

## License

MIT. Not affiliated with Hevy.
