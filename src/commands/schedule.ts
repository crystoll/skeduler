import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Result, ok, err } from "neverthrow";
import { parseDelay } from "../time/parseDelay.js";
import { parseAt } from "../time/parseAt.js";
import { nextOccurrence } from "../time/repeat.js";
import { detectBackends, resolveBackend, validateBackendName } from "../backends/detect.js";
import { getConnector } from "../notify/connectors.js";
import { collectTasks } from "./loadTasks.js";
import { createJobStore } from "../state/jobStore.js";
import { getJobsFilePath, getLogDir } from "../state/paths.js";
import { startWorker } from "../scheduler/process.js";
import type { JobRecord } from "../state/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ScheduleOptions {
  delay?: string;
  at?: string;
  positional: string[];
  taskFlags: string[];
  file?: string;
  backend?: string;
  backendArgs: string[];
  timeout?: string;
  repeat?: string;
  notify: string[];
  cwd: string;
  dryRun: boolean;
  json: boolean;
}

export interface ScheduleResult {
  output: string;
  job?: JobRecord;
}

function formatDuration(seconds: number): string {
  const parts: string[] = [];
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d) parts.push(`${d} day${d > 1 ? "s" : ""}`);
  if (h) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} minute${m > 1 ? "s" : ""}`);
  if (s) parts.push(`${s} second${s > 1 ? "s" : ""}`);
  return parts.join(", ") || "0 seconds";
}

function resolveWorkerScript(): string {
  return join(__dirname, "..", "scheduler", "worker.js");
}

export async function runSchedule(opts: ScheduleOptions): Promise<Result<ScheduleResult, string>> {
  if (!opts.delay && !opts.at) return err('Provide a delay (e.g. "45m") or use --at.');
  if (opts.delay && opts.at) return err("Use either a delay or --at, not both.");

  // Collect tasks from all sources
  const tasksResult = await collectTasks({
    positional: opts.positional,
    taskFlags: opts.taskFlags,
    filePath: opts.file,
  });
  if (tasksResult.isErr()) return err(tasksResult.error);
  const tasks = tasksResult.value;
  if (tasks.length === 0) return err("No tasks provided. Add a task, --task, or --file.");

  // Parse time
  const now = new Date();
  let dueAt: Date;
  let delaySeconds: number;

  if (opts.delay) {
    const parsed = parseDelay(opts.delay);
    if (parsed.isErr()) return err(parsed.error);
    delaySeconds = parsed.value.seconds;
    dueAt = new Date(now.getTime() + delaySeconds * 1000);
  } else {
    const parsed = parseAt(opts.at!, now);
    if (parsed.isErr()) return err(parsed.error);
    dueAt = parsed.value.dueAt;
    delaySeconds = Math.round((dueAt.getTime() - now.getTime()) / 1000);
  }

  // Detect backend
  if (opts.backend) {
    const valid = validateBackendName(opts.backend);
    if (valid.isErr()) return err(valid.error);
  }
  const available = await detectBackends();
  const backendResult = resolveBackend(opts.backend, available);
  if (backendResult.isErr()) return err(backendResult.error);
  const adapter = backendResult.value;

  // Dry run
  if (opts.dryRun) {
    const output = opts.json
      ? JSON.stringify({ dryRun: true, backend: adapter.name, dueAt: dueAt.toISOString(), delaySeconds, tasks }, null, 2)
      : buildDryRunOutput(adapter.name, dueAt, delaySeconds, tasks);
    return ok({ output });
  }

  // Create job
  const env = process.env as Record<string, string | undefined>;
  const platform = process.platform;
  const home = homedir();

  // Validate repeat pattern if provided
  if (opts.repeat) {
    const valid = nextOccurrence(opts.repeat, new Date());
    if (valid.isErr()) return err(valid.error);
  }

  // Validate notify connectors
  for (const name of opts.notify) {
    const valid = getConnector(name);
    if (valid.isErr()) return err(valid.error);
  }

  const jobsFile = getJobsFilePath(env, platform, home);
  const logDir = getLogDir(env, platform, home);
  const jobId = `sk_${crypto.randomUUID().slice(0, 8)}`;
  const logFile = join(logDir, `${jobId}.log`);

  const job: JobRecord = {
    id: jobId,
    status: "pending",
    backend: adapter.name,
    createdAt: now.toISOString(),
    dueAt: dueAt.toISOString(),
    delaySeconds,
    timeoutSeconds: opts.timeout ? parseDelay(opts.timeout).match(
      (r) => r.seconds,
      () => undefined,
    ) : undefined,
    repeat: opts.repeat,
    notify: opts.notify.length > 0 ? opts.notify : undefined,
    cwd: opts.cwd,
    tasks,
    backendArgs: opts.backendArgs.length > 0 ? opts.backendArgs : undefined,
    logFile,
  };

  const store = createJobStore(jobsFile);
  const createResult = await store.createJob(job);
  if (createResult.isErr()) return err(createResult.error);

  // Start worker
  const workerResult = await startWorker({
    script: resolveWorkerScript(),
    args: [jobsFile, jobId],
    logFile,
  });
  if (workerResult.isErr()) return err(`Failed to start scheduler: ${workerResult.error}`);
  job.schedulerPid = workerResult.value.pid;

  const output = opts.json
    ? JSON.stringify({ id: job.id, backend: adapter.name, dueAt: job.dueAt, delaySeconds, tasks: job.tasks, status: "pending" }, null, 2)
    : buildSuccessOutput(job, adapter.name, delaySeconds, dueAt);

  return ok({ output, job });
}

function buildSuccessOutput(job: JobRecord, backend: string, delaySeconds: number, dueAt: Date): string {
  const n = job.tasks.length;
  const lines = [
    `[Success] Scheduled ${n} task${n > 1 ? "s" : ""} via ${backend} in ${formatDuration(delaySeconds)}.`,
    `Dispatch time: ${dueAt.toLocaleString()}`,
    "Tasks:",
    ...job.tasks.map((t) => `  - ${t}`),
    "",
    "You can close this terminal. The agent will start when the timer fires.",
  ];
  return lines.join("\n");
}

function buildDryRunOutput(backend: string, dueAt: Date, delaySeconds: number, tasks: string[]): string {
  const n = tasks.length;
  const lines = [
    `[Dry run] Would schedule ${n} task${n > 1 ? "s" : ""} via ${backend} in ${formatDuration(delaySeconds)}.`,
    `Dispatch time: ${dueAt.toLocaleString()}`,
    "Tasks:",
    ...tasks.map((t) => `  - ${t}`),
    "",
    "No job was created.",
  ];
  return lines.join("\n");
}
