<img src=".claude-plugin/icon.png" alt="" width="96">

# HevyCoach

An MCP server and a typed SDK for the [Hevy](https://hevyapp.com) workout app API, so an AI assistant can coach you from your real training data: it reads your logged workouts, writes routines straight into the app, and tracks your progression.

## What is inside

| Package | What it is | Install |
|---|---|---|
| [`hevy-coach`](packages/mcp-server) | MCP server with 26 tools for workouts, routines, exercises and body measurements, plus coaching analysis. | `npx -y hevy-coach@latest` |
| [`hevy-sdk`](packages/hevy-sdk) | Typed, fetch-only client for the Hevy public API. Pagination, delta sync, retries. Node 20+ and React Native. | `npm i hevy-sdk` |

The SDK's types are generated from Hevy's OpenAPI spec. Where the spec and the live API disagree, the live API wins: the generator or the client corrects the difference, and the probe results behind each correction are in `docs/api/`.

## Quick start

You need Hevy Pro (Hevy offers the API to Pro users only), an API key from [hevy.com/settings?developer](https://hevy.com/settings?developer), and an MCP-capable assistant. Node 22.18 or newer.

Claude Code, as a plugin. This installs the MCP server and a `coach` skill that loads the coaching persona, and asks for your API key during install:

```
/plugin install hevy-coach --marketplace furkantanyol/hevy-coach
```

Claude Code, tools only (no persona):

```bash
claude mcp add hevy-coach -e HEVY_API_KEY=your-hevy-api-key -- npx -y hevy-coach@latest
```

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "hevy-coach": {
      "command": "npx",
      "args": ["-y", "hevy-coach@latest"],
      "env": { "HEVY_API_KEY": "your-hevy-api-key" }
    }
  }
}
```

Outside the plugin, give the assistant its coaching persona by pasting [`prompts/COACH.md`](prompts/COACH.md) into a Claude Project's instructions. Guides for [ChatGPT](prompts/CHATGPT.md) and [Gemini](prompts/GEMINI.md) are in `prompts/`. For web clients, the package also ships an HTTP transport (`hevy-coach-http`): see the [server README](packages/mcp-server/README.md#http-transport).

## Tools

Workouts

| Tool | Purpose |
|---|---|
| `get-workouts` | List logged workouts. |
| `get-workout` | Get one workout with every exercise and set. |
| `get-workout-count` | Total number of logged workouts. |
| `get-workout-events` | Workouts updated or deleted since a timestamp, for syncing. |
| `create-workout` | Log a workout. |
| `update-workout` | Update a logged workout. |

Routines

| Tool | Purpose |
|---|---|
| `get-routines` | List routines with their exercises and target sets. |
| `get-routine` | Get one routine. |
| `create-routine` | Create a routine. |
| `update-routine` | Replace a routine by id. |
| `get-routine-folders` | List routine folders. |
| `get-routine-folder` | Get one routine folder. |
| `create-routine-folder` | Create a routine folder. |

Exercises

| Tool | Purpose |
|---|---|
| `get-exercise-templates` | List exercise templates. |
| `get-exercise-template` | Get one exercise template. |
| `get-exercise-history` | Logged sets for one exercise. |
| `create-exercise-template` | Create a custom exercise and return its template id. |

Body measurements and user

| Tool | Purpose |
|---|---|
| `get-body-measurements` | List body measurements. |
| `get-body-measurement` | Get the measurement for one date. |
| `log-body-measurement` | Log or overwrite the measurement for a date. |
| `get-user-info` | Get the account profile. |

Coaching

| Tool | Purpose |
|---|---|
| `analyze-workout` | Compare a completed workout with the plan and get per-exercise recommendations. |
| `get-training-summary` | Aggregate the last N workouts: sessions, sets, duration, rest days. |
| `get-exercise-progression` | Session-by-session max weight, reps, volume and estimated 1RM (Epley). |
| `find-exercise` | Find an exercise template by name. |
| `batch-find-exercises` | Resolve many exercise names to template ids in one call. |

## SDK

```bash
npm i hevy-sdk
```

```ts
import { createHevyClient } from "hevy-sdk";

const hevy = createHevyClient({ apiKey: process.env.HEVY_API_KEY! });

const { upserts, deletes, cursor } = await hevy.workouts.changes(lastCursor);
const history = await hevy.exerciseHistory.get("D04AC939", { startDate: "2026-01-01" });
```

Full API in the [SDK README](packages/hevy-sdk/README.md).

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm validate    # format, lint, build, typecheck, test
```

```
packages/hevy-sdk      the client
packages/mcp-server    the MCP server
prompts/               coaching persona and assistant setup guides
docs/api/              OpenAPI snapshot and probe results
docs/adr/              decisions
```

## License

MIT. Not affiliated with Hevy.
