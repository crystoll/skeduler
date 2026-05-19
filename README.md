# skeduler

Schedule AI coding agents to start after a delay or at an exact local time. Close the terminal — the agent fires when the timer expires.

Supports **Kiro CLI** and **GitHub Copilot CLI**. Auto-detects which is installed.

```bash
skeduler "2h" "Refactor the auth module"
```

## Why

- AI agent quotas reset at specific times — schedule work for when capacity is available
- Queue up overnight tasks without babysitting the terminal
- One interface for multiple AI CLI tools

## Install

```bash
git clone <repo-url> skeduler && cd skeduler
pnpm install
pnpm run build
pnpm link --global
```

Verify:

```bash
skeduler --version
```

## Quick Start

Schedule a task with a relative delay:

```bash
skeduler "45m" "Investigate the failing integration tests"
```

Schedule multiple tasks:

```bash
skeduler "2h" "Fix all linting errors" "Add missing test coverage"
```

Schedule at an exact time:

```bash
skeduler --at 03:00 "Run the full migration suite"
```

Choose a specific backend:

```bash
skeduler "1h" "Refactor database layer" --backend copilot
```

## Time Formats

### Relative delays

| Unit    | Tokens                          |
|---------|---------------------------------|
| seconds | `s`, `sec`, `second`, `seconds` |
| minutes | `m`, `min`, `minute`, `minutes` |
| hours   | `h`, `hr`, `hour`, `hours`      |
| days    | `d`, `day`, `days`              |

Compound: `2h30m`, `1d2h`, `"2 hours 30 minutes"`

### Exact times (`--at`)

- `17:30` — next occurrence (rolls to tomorrow if past)
- `5:30pm` — 12-hour format
- `2026-05-20 09:00` — explicit date and time

## Backends

| Backend | CLI command |
|---------|-------------|
| kiro    | `kiro-cli chat --no-interactive --trust-all-tools "<task>"` |
| copilot | `copilot --autopilot --yolo -p "<task>"` |
| claude  | `claude --bg "<task>"` |
| cursor  | `cursor-agent -p "<task>"` (also detects `agent` binary) |
| aider   | `aider --yes --message "<task>"` |
| goose   | `goose run --no-session -t "<task>"` |
| ollama  | `ollama run <model> "<task>"` |

Auto-detection picks the first available (in order: kiro, copilot, claude, cursor, aider, goose, ollama). Override with `--backend <name>`.

### Ollama

Ollama is not an agentic backend — it won't edit files or run commands. But it's useful for scheduled questions, batch inference, or report generation. Output goes to the job's log file.

The model name is **required** as the first passthrough arg:

```bash
skeduler "30m" "Summarize the key changes in this diff" --backend ollama -- llama3
skeduler --at 06:00 "Generate a haiku about code reviews" --backend ollama -- qwen2.5
```

Note: if the model isn't already pulled locally, ollama will download it at dispatch time. Use `ollama pull <model>` beforehand to avoid long waits. View the response with `skeduler status <id>`.

## Using Local Models

Several backends can use local ollama models instead of cloud APIs. This avoids API costs and works offline.

### Goose with ollama

Goose auto-detects your configured provider. If you've set up goose with ollama (`goose configure`), it works out of the box:

```bash
skeduler "5m" "Explain this codebase structure" --backend goose
```

To override the provider/model at schedule time:

```bash
skeduler "5m" "Run security audit" --backend goose -- --provider ollama --model qwen3:14b
```

### Aider with ollama

Aider requires a model to be specified if no API key is configured. Without it, aider enters interactive mode trying to authenticate — which hangs in scheduled mode.

```bash
# Use a local ollama model (prefix with ollama_chat/)
skeduler "30m" "Add docstrings to all functions" --backend aider -- --model ollama_chat/qwen3:14b --no-auto-commits

# With an API key already configured, no extra flags needed
skeduler "30m" "Add docstrings to all functions" --backend aider
```

### Tips for non-interactive scheduling

All backends must run without human input. If a backend hangs, check:

- **Missing API key** — configure it beforehand or pass a local model via `--`
- **Confirmation prompts** — use flags like `--yes` (aider), `--trust-all-tools` (kiro), `--yolo` (copilot)
- **Model not pulled** — run `ollama pull <model>` before scheduling

View what happened with `skeduler status <id>` — the log shows both errors and output.

## Forwarding Flags

Anything after `--` is forwarded to the backend CLI:

```bash
skeduler "1h" "Review the PR" -- --agent code-reviewer
skeduler "30m" "Run tests" --backend copilot -- --max-autopilot-continues 5
```

## Commands

### Schedule (default)

```bash
skeduler <delay> <tasks...> [options]
skeduler --at <time> <tasks...> [options]
```

| Option | Description |
|--------|-------------|
| `--at <time>` | Exact local time instead of delay |
| `--task <text>` | Add one task (repeatable) |
| `--file <path>` | Read tasks from a text file (one per line) |
| `--backend <name>` | Force a specific backend |
| `--timeout <duration>` | Kill task if it exceeds this (e.g. `30m`, `2h`) |
| `--repeat <pattern>` | Repeat: `daily`, `hourly`, `weekdays`, or a duration |
| `--dry-run` | Preview without creating a job |
| `--cwd <path>` | Working directory for dispatched commands |
| `--json` | Machine-readable output |

## Task Input

Tasks are combined from three sources in this order:

1. Positional arguments
2. Repeated `--task` flags
3. Lines from `--file` (blank lines and `#` comments are skipped)

```bash
# Positional only
skeduler "1h" "Task one" "Task two"

# --task flags
skeduler "1h" --task "First" --task "Second"

# From file
skeduler "2h" --file night-shift.txt

# All combined
skeduler "30m" "Inline task" --task "Flag task" --file more.txt
```

### List

```bash
skeduler list [--verbose] [--all] [--json]
```

Compact view by default. `--verbose` shows task text, PID, log path, and working directory.

### Status

```bash
skeduler status <id> [--json]
```

Full details of a single job, including a tail of the log file if available.

### Cancel

```bash
skeduler cancel <id> [--json]
```

## Examples

### Schedule overnight work

```bash
# Kiro: refactor while you sleep
skeduler --at 03:00 "Refactor the authentication module to use JWT tokens" --backend kiro

# Copilot: run when quota resets
skeduler "4h" "Fix all failing integration tests and commit the fixes" --backend copilot
```

### Batch tasks for later

```bash
skeduler "2h" \
  "Add input validation to all API endpoints" \
  "Write unit tests for the validation logic" \
  "Update the API documentation"
```

### Use Claude Code in background

```bash
skeduler "30m" "Investigate the memory leak in the worker pool" --backend claude -- --model opus
```

### Use Aider for targeted edits

```bash
skeduler --at 18:00 "Add type annotations to all functions in src/utils.ts" --backend aider
```

### Ask a local model a question

```bash
skeduler "10s" "Explain the difference between mutex and semaphore" --backend ollama -- qwen3:14b
```

### Load tasks from a file

```bash
# night-shift.txt:
# Review PR #42 for security issues
# Run the full test suite and report failures
# Generate a coverage report

skeduler --at 02:00 --file night-shift.txt --backend kiro
```

## Recurring Jobs

Use `--repeat` to automatically reschedule after each successful dispatch:

```bash
# Every morning at 6am
skeduler --at 06:00 "Gather world news, summarize humorously" --backend goose --repeat daily

# Every hour
skeduler --at 09:00 "Check CI status" --backend kiro --repeat hourly

# Weekdays only (Mon-Fri)
skeduler --at 08:30 "Summarize overnight PRs" --backend claude --repeat weekdays

# Custom interval
skeduler "5m" "Monitor deployment" --backend ollama --repeat 12h -- qwen3:14b
```

Patterns: `daily`, `hourly`, `weekdays`, or any duration (`12h`, `2d`, `30m`).

A failed job breaks the chain. Check `skeduler list --all` to see what happened and reschedule manually if needed.

## Notifications

Send a message to Slack or Discord when a job completes (or fails):

```bash
# Set webhook URL in .env or environment
export SKEDULER_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T.../B.../xxx"

# Schedule with notification
skeduler "30m" "Run security audit" --backend kiro --notify slack

# Multiple connectors
skeduler --at 06:00 "Morning report" --backend goose --repeat daily --notify slack --notify discord
```

**Environment variables:**

| Variable | Connector |
|----------|-----------|
| `SKEDULER_SLACK_WEBHOOK_URL` or `SLACK_WEBHOOK_URL` | `--notify slack` |
| `SKEDULER_DISCORD_WEBHOOK_URL` or `DISCORD_WEBHOOK_URL` | `--notify discord` |

Notifications include job status (✅/❌), task description, and truncated output (last 500 chars). A `.env` file in the working directory is loaded automatically.

## Dry Run

Preview without scheduling:

```bash
skeduler "2h" "Night shift task" --dry-run
```

```
[Dry run] Would schedule 1 task via kiro in 2 hours.
Dispatch time: 5/19/2026, 5:00:00 PM
Tasks:
  - Night shift task

No job was created.
```

## State and Logs

Jobs and logs are stored in a platform-appropriate directory:

- macOS: `~/Library/Application Support/skeduler/`
- Linux: `${XDG_STATE_HOME:-~/.local/state}/skeduler/`
- Windows: `%LOCALAPPDATA%\skeduler\`

Override with `SKEDULER_HOME` environment variable.

## Development

```bash
pnpm install
pnpm run build          # TypeScript → dist/
pnpm test               # vitest (144 tests)
pnpm run dev -- <args>  # run from source via tsx
```

## License

ISC
