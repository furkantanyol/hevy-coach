# HevyCoach — AI Personal Training System

Turn Claude into your personal trainer. It connects to your Hevy account, designs your programs, pushes routines to Hevy, and coaches you daily.

## What You Get

- **Personalized programming** — strength, hypertrophy, mobility, conditioning
- **Auto-pushed to Hevy** — routines appear in your app, ready to log
- **Daily briefings** — morning message with today's workout + coaching cues
- **Adaptive coaching** — Claude reads your completed workouts and adjusts
- **Weekly reviews** — volume tracking, PR highlights, program adjustments

## Setup (5 minutes)

### Prerequisites

- [Claude Desktop](https://claude.ai/download) installed
- [Hevy Pro](https://hevy.com) subscription (required for API access)
- Node.js 20+ installed

### Step 1: Get your Hevy API key

Go to [hevy.com/settings](https://hevy.com/settings) → Developer → Copy your API key.

### Step 2: Install the Hevy MCP server

The coaching brain runs as a Claude project/prompt. The MCP server is the existing `hevy-mcp` package that gives Claude access to your Hevy data.

Add this to your Claude Desktop MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "hevy": {
      "command": "npx",
      "args": ["-y", "hevy-mcp@latest"],
      "env": {
        "HEVY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop.

### Step 3: Add the coaching brain

Create a Claude Project called **"HevyCoach"**:

1. Open Claude Desktop → Projects → New Project
2. Name it "HevyCoach"
3. In Project Instructions, paste the contents of `CLAUDE.md` from this repo
4. Add `training-history.md` as a project file

### Step 4: Start your first session

Open the HevyCoach project and say:

> "I want to start training with you. Let's do the onboarding."

Claude will ask you questions about your body, training history, goals, and preferences. After collecting everything, it will:

1. Generate your personalized weekly program
2. Push all routines to your Hevy app
3. Set you up for daily coaching

### Step 5: Set up daily reminders (optional)

In Claude Desktop, create two scheduled tasks:

**Morning briefing (7 AM):**
> "Read my HevyCoach program from the project. Tell me today's workout with warmup, exercises, sets, reps, and weights. Keep it concise and actionable."

**Evening sync (9 PM):**
> "Check my latest Hevy workout using the get-workouts tool. Compare it to today's planned session from my HevyCoach program. Summarize what I did, note any progressions or missed targets, and tell me if you're adjusting anything for my next session."

## Mobile Access

Create the same "HevyCoach" project on claude.ai (web). The project instructions carry over. You can ask "what's my workout today?" from your phone. Note: MCP tools (syncing with Hevy) only work from Claude Desktop.

## How It Works

```
You ↔ Claude Desktop
       ├── CLAUDE.md (your profile + program + coaching brain)
       ├── training-history.md (long-term tracking)
       ├── hevy-mcp (reads/writes your Hevy data)
       └── Scheduled tasks (daily briefings + sync)
```

No backend. No database. No accounts. Just Claude + Hevy + two markdown files.

## File Structure

```
hevy-coach/
├── CLAUDE.md              # Coaching brain + user profile + current program
├── training-history.md    # Long-term PR tracking + monthly reviews
└── README.md              # This file
```

## Contributing

This is open source. If you use it and improve the coaching prompts, exercise science logic, or add new features — PRs welcome.

## License

MIT
