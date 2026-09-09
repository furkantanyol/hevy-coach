# hevy-coach

MCP server that turns an AI assistant into a strength coach with access to your [Hevy](https://hevyapp.com) account. Every read endpoint, routine and workout writes, and coaching tools built on top: workout-vs-plan analysis, exercise progression with estimated 1RM, training summaries, exercise name resolution.

Requires Node 22.18+ and a Hevy API key (Hevy Settings → API).

## Install

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

Then add the coaching persona from the repository's `prompts/COACH.md` to your project instructions and say "let's do the onboarding".

## Tools

| Tool | Purpose |
|---|---|
| `get-user-info` | Profile |
| `get-workouts`, `get-workout`, `get-workout-count`, `get-workout-events` | Logged workouts and change feed |
| `create-workout`, `update-workout` | Log or replace a workout |
| `get-routines`, `get-routine`, `create-routine`, `update-routine` | Routines (templates) |
| `get-routine-folders`, `get-routine-folder`, `create-routine-folder` | Folders |
| `get-exercise-templates`, `get-exercise-template`, `create-exercise-template` | Exercise library |
| `get-exercise-history` | Every set of one exercise |
| `get-body-measurements`, `get-body-measurement`, `log-body-measurement` | Body measurements |
| `analyze-workout` | Completed workout vs plan → per-exercise recommendation |
| `get-training-summary` | Volume, frequency, duration over the last N workouts |
| `get-exercise-progression` | Session-by-session weight, reps, Epley 1RM, trend |
| `find-exercise`, `batch-find-exercises` | Resolve names to template ids |

Errors come back with Hevy's HTTP status, error code and message so the assistant can react (e.g. `routine-limit-exceeded` on free accounts).

## HTTP transport

For assistants that connect over HTTP (ChatGPT, Gemini), run `hevy-coach-http`. It proxies your Hevy account, so it is locked down by default:

| Variable | Required | Meaning |
|---|---|---|
| `HEVY_API_KEY` | yes | Hevy API key |
| `MCP_AUTH_TOKEN` | yes | Bearer token clients must send. Use a long random secret. |
| `PORT` | no | Default 3000 |
| `HOST` | no | Default `127.0.0.1`. Anything else requires `MCP_ALLOWED_HOSTS`. |
| `MCP_ALLOWED_HOSTS` | when exposed | Comma-separated hostnames accepted in `Host` (DNS-rebinding protection) |
| `MCP_ALLOWED_ORIGINS` | no | Comma-separated browser origins allowed by CORS. Off otherwise. |

```bash
HEVY_API_KEY=... MCP_AUTH_TOKEN=$(openssl rand -hex 32) npx -p hevy-coach hevy-coach-http
# MCP endpoint: http://127.0.0.1:3000/mcp   Health: /health
```

Put it behind HTTPS (a tunnel or reverse proxy) before pointing a hosted assistant at it.

## License

MIT
