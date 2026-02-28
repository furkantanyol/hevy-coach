# HevyCoach

AI personal training system that connects to [Hevy](https://hevyapp.com) via MCP (Model Context Protocol). Not just another API wrapper — HevyCoach adds coaching intelligence on top of workout data.

**What makes this different from existing Hevy MCP servers:** Other servers give you CRUD operations. HevyCoach adds the brain — workout analysis, progression tracking with Epley 1RM estimation, training summaries, and exercise search. Combined with the CLAUDE.md coaching prompt, it turns Claude into a full athletic coach covering strength, hypertrophy, VO2max, mobility, flexibility, and longevity.

## What You Get

- **Complete athletic programming** — strength, hypertrophy, VO2max, mobility, flexibility, stamina, longevity
- **Coaching intelligence** — workout analysis, progression tracking, automatic adaptation recommendations
- **Auto-pushed to Hevy** — routines appear in your app, ready to log
- **Daily briefings** — morning message with today's workout + conditioning + mobility
- **Adaptive coaching** — reads your completed workouts and adjusts programming
- **Weekly reviews** — volume tracking, PR highlights, conditioning adherence, program adjustments

## Setup

### Prerequisites

- [Hevy Pro](https://hevyapp.com) subscription (required for API access)
- API key from Hevy Settings → API
- Node.js 18+
- [Claude Desktop](https://claude.ai/download) (or any MCP-compatible client)

### Install

```bash
git clone https://github.com/AugmentedMind/hevy-coach.git
cd hevy-coach
npm install
npm run build
```

### Configure Claude Desktop

Add to your MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "hevy-coach": {
      "command": "node",
      "args": ["/absolute/path/to/hevy-coach/dist/cli.js"],
      "env": {
        "HEVY_API_KEY": "your-hevy-api-key"
      }
    }
  }
}
```

Restart Claude Desktop. The tools appear in the MCP tools list.

### Add the Coaching Brain

Create a Claude Project called **"HevyCoach"**:

1. Open Claude Desktop → Projects → New Project
2. Name it "HevyCoach"
3. In Project Instructions, paste the contents of `CLAUDE.md`
4. Add `training-history.md` as a project file

### Start Training

Open the HevyCoach project and say:

> "I want to start training with you. Let's do the onboarding."

Claude will ask about your body, training history, goals, and preferences. Then it generates your full program (strength + conditioning + mobility) and pushes routines to Hevy.

### Daily Automation (Optional)

Create two Claude Desktop scheduled tasks:

**Morning briefing (7 AM):**
> Read my HevyCoach program. Tell me today's workout with warmup, exercises, sets/reps/weights, conditioning if scheduled, and daily mobility drills.

**Evening sync (11:59 PM):**
> Fetch my latest Hevy workout. Analyze it against today's plan. Summarize performance, note progressions or missed targets, and adjust upcoming sessions if needed.

## Tools

### Data Tools
| Tool | Description |
|------|-------------|
| `get-workouts` | List recent workouts (paginated) |
| `get-workout` | Get specific workout by ID |
| `get-workout-count` | Total logged workouts |
| `get-workout-events` | Track changes since a date |
| `get-routines` | List saved routines |
| `get-routine` | Get routine details |
| `create-routine` | Push routine to Hevy |
| `update-routine` | Modify existing routine |
| `get-routine-folders` | List routine folders |
| `create-routine-folder` | Create folder |
| `get-exercise-templates` | Browse exercise library |
| `get-exercise-template` | Get exercise details |
| `get-exercise-history` | Past performance data |
| `create-exercise-template` | Create custom exercise |

### Coaching Tools
| Tool | Description |
|------|-------------|
| `analyze-workout` | Compare completed vs planned workout. Returns per-exercise analysis with progression recommendations. |
| `get-training-summary` | Aggregate last N workouts: volume, frequency, consistency, duration trends. |
| `get-exercise-progression` | Track exercise over time: weight/rep trends, estimated 1RM (Epley), plateau detection. |
| `find-exercise` | Search exercises by name or muscle group. |

## Architecture

```
hevy-coach/
├── src/
│   ├── index.ts           # Server factory
│   ├── cli.ts             # CLI entry point (stdio transport)
│   ├── tools/
│   │   ├── workouts.ts    # Workout CRUD
│   │   ├── routines.ts    # Routine CRUD
│   │   ├── exercises.ts   # Exercise templates
│   │   └── coaching.ts    # Coaching intelligence (the differentiator)
│   └── utils/
│       ├── hevy-client.ts # Hevy API client
│       └── response.ts    # MCP response helpers
├── CLAUDE.md              # Coaching brain + user profile + program
├── training-history.md    # Long-term tracking template
└── package.json
```

## Development

```bash
npm run build    # Compile TypeScript
npm run dev      # Watch mode
```

## Credits

Inspired by [chrisdoc/hevy-mcp](https://github.com/chrisdoc/hevy-mcp) and [tomtorggler/hevy-mcp-server](https://github.com/tomtorggler/hevy-mcp-server). Built from scratch with coaching intelligence as the core focus.

## License

MIT — Furkan Tanyol
