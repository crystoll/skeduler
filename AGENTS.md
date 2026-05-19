# AGENTS.md

Guidelines for AI coding agents working on this project.

## Project Overview

`skeduler` schedules AI coding agent sessions to start after a delay or at an exact local time. Supports 7 backends (kiro, copilot, claude, cursor, aider, goose, ollama), recurring jobs, dispatch timeouts, and Slack/Discord notifications. The user closes the terminal; a detached worker fires the agent when the timer expires.

## Tech Stack

- TypeScript (ESM, strict mode)
- commander (CLI parsing)
- neverthrow (Result types — no thrown exceptions in business logic)
- zod (runtime schema validation)
- vitest (testing, 144 tests)
- pnpm (package manager, `ignore-scripts=true`)

## Architecture

```
src/
  cli.ts              — Entry point, .env loading, commander, passthrough splitting
  utils.ts            — stripAnsi, formatTimeRemaining
  commands/           — schedule, list, cancel, status, loadTasks
  backends/           — 7 adapters + auto-detection + dual-binary cursor support
  scheduler/          — Detached worker (sleep → dispatch → notify → reschedule)
  notify/             — Message formatting + Slack/Discord webhook connectors
  time/               — Delay parsing, absolute time, repeat/next-occurrence
  state/              — Job persistence (JSON), corruption recovery, platform paths
tests/                — Mirrors src/ structure
```

## Coding Conventions

- **No exceptions in business logic.** Use `neverthrow` Result types. Only `cli.ts` converts errors to stderr/exit codes.
- **Pure functions where possible.** Inject dependencies (file paths, `which` function, `now` date) for testability.
- **Short, named functions.** Flat control flow. Avoid nested if/else.
- **No speculative abstractions.** Only add what's needed for the current feature.
- **Match existing style.** Look at adjacent code before writing new code.
- **No module-level mutable state.** Use factory functions (learned from a shared-object mutation bug).

## Testing

- **TDD approach.** Write failing tests first, then implement.
- **Tests encode intent.** Each test explains WHY the behavior matters.
- **Never use real backend names in tests** — they'll actually run the AI CLI.
- **Run:** `pnpm test` | **Watch:** `pnpm test:watch` | **Dev:** `pnpm dev -- <args>`

## Adding a New Backend

1. Add adapter in `src/backends/adapters.ts` implementing `BackendAdapter`
2. Register in `ALL_ADAPTERS` array in `src/backends/detect.ts`
3. Register in `STATIC_ADAPTERS` in `src/scheduler/worker.ts` (or use `resolveAdapter` for multi-binary)
4. Add tests in `tests/adapters.test.ts`
5. Update `tests/detect.test.ts` and `tests/validateBackend.test.ts`

## Adding a New Notify Connector

1. Add factory function in `src/notify/connectors.ts`
2. Register in the `CONNECTORS` map
3. Env var pattern: `SKEDULER_<NAME>_WEBHOOK_URL` (also accept `<NAME>_WEBHOOK_URL`)

## Key Design Decisions

- `crypto.randomUUID()` for job IDs (no dependency)
- Worker is detached (`spawn` + `detached: true` + `unref()`)
- Worker polls every 30s to detect cancellation
- Recurring jobs: worker self-reschedules after successful dispatch (chain breaks on failure)
- Notifications: best-effort POST to webhooks, failure doesn't affect job status
- Timeout: worker kills child process with SIGTERM → SIGKILL escalation
- `.env` loaded at startup in both `cli.ts` and `worker.ts` (no dotenv dependency)
- Cursor: dual-binary detection (`cursor-agent` preferred, `agent` as fallback)
- Passthrough args after `--` forwarded verbatim to backend CLI

## State & Config

- State dir: macOS `~/Library/Application Support/skeduler/`, Linux `~/.local/state/skeduler/`
- Override: `SKEDULER_HOME` env var
- `.env` file in cwd auto-loaded (webhook URLs, etc.)
- Corrupted `jobs.json` → backed up to `.corrupt`, fresh start

## Safety

- `.npmrc` has `ignore-scripts=true`
- Dependencies minimal and pinned via lockfile
- No network calls except: spawning backend CLI + webhook POSTs for notifications
