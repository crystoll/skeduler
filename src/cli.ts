#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";

// Load .env file if present (no dependency needed)
try {
  const envPath = resolve(process.cwd(), ".env");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* no .env file, that's fine */ }
import { runSchedule } from "./commands/schedule.js";
import { runList } from "./commands/list.js";
import { runCancel } from "./commands/cancel.js";
import { runStatus } from "./commands/status.js";

function die(msg: string): never {
  process.stderr.write(`[Error] ${msg}\n`);
  process.exit(1);
}

/**
 * Split argv at standalone `--`. Everything after is forwarded to the backend.
 */
function splitPassthrough(argv: string[]): { head: string[]; backendArgs: string[] } {
  const idx = argv.indexOf("--");
  if (idx === -1) return { head: argv, backendArgs: [] };
  return { head: argv.slice(0, idx), backendArgs: argv.slice(idx + 1) };
}

function buildProgram(backendArgs: string[]): Command {
  const program = new Command();
  program
    .name("skeduler")
    .description("Schedule AI coding agents after a delay or at a specific time.")
    .version("0.1.1")
    .showHelpAfterError();

  // Default command: schedule
  program
    .argument("[items...]", "Delay followed by tasks, or just tasks when using --at")
    .option("--at <time>", "Schedule at an exact local time")
    .option(
      "--task <text>",
      "Add one task (repeatable)",
      (val: string, prev: string[]) => { prev.push(val); return prev; },
      [] as string[],
    )
    .option("--file <path>", "Read tasks from a text file")
    .option("--backend <name>", "Backend to use (kiro, copilot, claude, cursor, aider, goose, ollama)")
    .option("--timeout <duration>", "Kill task if it runs longer than this (e.g. 30m, 2h)")
    .option("--repeat <pattern>", "Repeat job (daily, hourly, weekdays, or duration like 12h)")
    .option(
      "--notify <connector>",
      "Send notification on completion (slack, discord). Repeatable.",
      (val: string, prev: string[]) => { prev.push(val); return prev; },
      [] as string[],
    )
    .option("--dry-run", "Preview without creating a job", false)
    .option("--cwd <path>", "Working directory for dispatched commands", process.cwd())
    .option("--json", "Machine-readable JSON output", false)
    .action(async (items: string[], options) => {
      const delay = options.at ? undefined : items[0];
      const positional = options.at ? items : items.slice(1);

      const result = await runSchedule({
        delay,
        at: options.at,
        positional,
        taskFlags: options.task ?? [],
        file: options.file,
        backend: options.backend,
        backendArgs,
        timeout: options.timeout,
        repeat: options.repeat,
        notify: options.notify,
        cwd: options.cwd,
        dryRun: options.dryRun,
        json: options.json,
      });

      if (result.isErr()) die(result.error);
      process.stdout.write(result.value.output + "\n");
    });

  // list
  program
    .command("list")
    .description("List pending jobs.")
    .option("--verbose", "Show task text, PID, and log path", false)
    .option("--all", "Include dispatched/canceled history", false)
    .option("--json", "Machine-readable JSON output", false)
    .action(async (options) => {
      const result = await runList({ verbose: options.verbose, all: options.all, json: options.json });
      if (result.isErr()) die(result.error);
      process.stdout.write(result.value + "\n");
    });

  // cancel
  program
    .command("cancel <id>")
    .description("Cancel a pending job.")
    .option("--json", "Machine-readable JSON output", false)
    .action(async (id: string, options) => {
      const result = await runCancel({ id, json: options.json });
      if (result.isErr()) die(result.error);
      process.stdout.write(result.value + "\n");
    });

  // status
  program
    .command("status <id>")
    .description("Show details of a specific job.")
    .option("--json", "Machine-readable JSON output", false)
    .action(async (id: string, options) => {
      const result = await runStatus({ id, json: options.json });
      if (result.isErr()) die(result.error);
      process.stdout.write(result.value + "\n");
    });

  return program;
}

const { head, backendArgs } = splitPassthrough(process.argv);
const program = buildProgram(backendArgs);
program.parseAsync(head).catch((e) => die((e as Error).message));
