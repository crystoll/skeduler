import { homedir } from "node:os";
import { Result, ok, err } from "neverthrow";
import { createJobStore } from "../state/jobStore.js";
import { getJobsFilePath } from "../state/paths.js";
import { formatTimeRemaining } from "../utils.js";
import type { JobRecord } from "../state/schema.js";

export interface ListOptions {
  all: boolean;
  verbose: boolean;
  json: boolean;
}

export async function runList(opts: ListOptions): Promise<Result<string, string>> {
  const env = process.env as Record<string, string | undefined>;
  const jobsFile = getJobsFilePath(env, process.platform, homedir());
  const store = createJobStore(jobsFile);

  const result = await store.listJobs();
  if (result.isErr()) return err(result.error);

  const jobs = opts.all
    ? result.value
    : result.value.filter((j) => j.status === "pending");

  if (opts.json) return ok(JSON.stringify(jobs, null, 2));
  if (jobs.length === 0) return ok("No pending jobs.");

  const formatter = opts.verbose ? formatJobVerbose : formatJobCompact;
  const separator = opts.verbose ? "\n" : "\n";
  const lines = jobs.map(formatter);
  return ok(lines.join(separator));
}

function formatJobCompact(j: JobRecord): string {
  const tasks = j.tasks.length === 1 ? j.tasks[0] : `${j.tasks.length} tasks`;
  const due = new Date(j.dueAt).toLocaleString();
  return `${j.id}  ${j.status.padEnd(10)}  ${j.backend.padEnd(8)}  ${due}  ${tasks}`;
}

export function formatJobVerbose(j: JobRecord): string {
  const lines = [
    `${j.id}  [${j.status}]  backend: ${j.backend}`,
    `  Due: ${new Date(j.dueAt).toLocaleString()}`,
  ];
  if (j.status === "pending") lines.push(`  ${formatTimeRemaining(j.dueAt)}`);
  lines.push(`  CWD: ${j.cwd}`, `  Tasks:`);
  lines.push(...j.tasks.map((t) => `    - ${t}`));
  if (j.schedulerPid) lines.push(`  PID: ${j.schedulerPid}`);
  if (j.logFile) lines.push(`  Log: ${j.logFile}`);
  if (j.error) lines.push(`  Error: ${j.error}`);
  return lines.join("\n");
}
