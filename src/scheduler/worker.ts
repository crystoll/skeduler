/**
 * Detached worker entrypoint. Sleeps until dueAt, then dispatches.
 * Invoked as: node worker.js <jobsFile> <jobId>
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env from job's cwd (will be set after we read the job, but load from process.cwd first)
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
} catch { /* no .env */ }

import { createJobStore } from "../state/jobStore.js";
import { dispatchJob } from "./dispatch.js";
import { kiroAdapter, copilotAdapter, claudeAdapter, aiderAdapter, ollamaAdapter, gooseAdapter } from "../backends/adapters.js";
import type { BackendAdapter } from "../backends/types.js";
import { detectBackends } from "../backends/detect.js";
import { nextOccurrence } from "../time/repeat.js";
import { startWorker } from "./process.js";
import { getLogDir } from "../state/paths.js";
import { formatNotifyMessage } from "../notify/message.js";
import { getConnector } from "../notify/connectors.js";
import { stripAnsi } from "../utils.js";
import { homedir } from "node:os";
import { join } from "node:path";

const STATIC_ADAPTERS: Record<string, BackendAdapter> = {
  kiro: kiroAdapter,
  copilot: copilotAdapter,
  claude: claudeAdapter,
  aider: aiderAdapter,
  goose: gooseAdapter,
  ollama: ollamaAdapter,
};

async function resolveAdapter(name: string): Promise<BackendAdapter | undefined> {
  if (STATIC_ADAPTERS[name]) return STATIC_ADAPTERS[name];
  if (name === "cursor") {
    const detected = await detectBackends();
    return detected.find((a) => a.name === "cursor");
  }
  return undefined;
}

const POLL_INTERVAL_MS = 30_000;

async function isCanceled(jobsFile: string, jobId: string): Promise<boolean> {
  const store = createJobStore(jobsFile);
  const result = await store.getJob(jobId);
  if (result.isErr()) return true;
  const job = result.value;
  return !job || job.status !== "pending";
}

async function sleep(ms: number, jobsFile: string, jobId: string): Promise<void> {
  let remaining = Math.max(0, ms);
  while (remaining > 0) {
    const slice = Math.min(remaining, POLL_INTERVAL_MS);
    await new Promise((r) => setTimeout(r, slice));
    remaining -= slice;
    if (remaining > 0 && await isCanceled(jobsFile, jobId)) return;
  }
}

async function reschedule(job: import("../state/schema.js").JobRecord, jobsFile: string): Promise<void> {
  const result = nextOccurrence(job.repeat!, new Date(job.dueAt));
  if (result.isErr()) return; // invalid pattern, silently skip

  const nextDueAt = result.value;
  const env = process.env as Record<string, string | undefined>;
  const logDir = getLogDir(env, process.platform, homedir());
  const nextId = `sk_${crypto.randomUUID().slice(0, 8)}`;
  const logFile = join(logDir, `${nextId}.log`);

  const nextJob: import("../state/schema.js").JobRecord = {
    id: nextId,
    status: "pending",
    backend: job.backend,
    createdAt: new Date().toISOString(),
    dueAt: nextDueAt.toISOString(),
    delaySeconds: Math.round((nextDueAt.getTime() - Date.now()) / 1000),
    timeoutSeconds: job.timeoutSeconds,
    repeat: job.repeat,
    notify: job.notify,
    cwd: job.cwd,
    tasks: job.tasks,
    backendArgs: job.backendArgs,
    logFile,
  };

  const store = createJobStore(jobsFile);
  const createResult = await store.createJob(nextJob);
  if (createResult.isErr()) return;

  // Start worker for the next job
  const workerScript = process.argv[1]; // reuse same worker script
  await startWorker({ script: workerScript, args: [jobsFile, nextId], logFile });
}

async function main(): Promise<void> {
  const [, , jobsFile, jobId] = process.argv;
  if (!jobsFile || !jobId) {
    process.stderr.write("worker: missing jobsFile or jobId\n");
    process.exit(2);
  }

  const store = createJobStore(jobsFile);

  // Stamp PID
  const stampResult = await store.updateJob(jobId, (j) => ({ ...j, schedulerPid: process.pid }));
  if (stampResult.isErr()) {
    process.stderr.write(`worker: ${stampResult.error}\n`);
    process.exit(2);
  }

  const jobResult = await store.getJob(jobId);
  if (jobResult.isErr() || !jobResult.value) {
    process.stderr.write(`worker: job ${jobId} not found\n`);
    process.exit(2);
  }
  const job = jobResult.value;

  // Sleep until due
  const delayMs = new Date(job.dueAt).getTime() - Date.now();
  if (delayMs > 0) await sleep(delayMs, jobsFile, jobId);

  // Re-check status after sleep
  if (await isCanceled(jobsFile, jobId)) process.exit(0);

  // Dispatch
  const adapter = await resolveAdapter(job.backend);
  if (!adapter) {
    await store.updateJob(jobId, (j) => ({
      ...j, status: "failed", completedAt: new Date().toISOString(),
      error: `Unknown backend: ${job.backend}`,
    }));
    process.exit(1);
  }

  try {
    const results = await dispatchJob(job, (task) =>
      adapter.buildCommand(task, job.backendArgs),
    );
    const errors = results.filter((r) => r.error || (r.exitCode !== 0 && r.exitCode !== null));
    await store.updateJob(jobId, (j) => ({
      ...j,
      status: errors.length ? "failed" : "dispatched",
      dispatchedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: errors.length
        ? errors.map((e) => e.error ?? `exit ${e.exitCode}`).join("; ")
        : undefined,
    }));

    // Notify
    if (job.notify?.length) {
      const { readFile } = await import("node:fs/promises");
      let logTail: string | undefined;
      try {
        const raw = await readFile(job.logFile, "utf-8");
        const lines = raw.split("\n").filter((l) => l.trim());
        logTail = stripAnsi(lines.slice(-20).join("\n"));
      } catch { /* no log */ }

      const message = formatNotifyMessage({
        jobId: jobId,
        status: errors.length ? "failed" : "dispatched",
        backend: job.backend,
        tasks: job.tasks,
        repeat: job.repeat,
        logTail: errors.length ? undefined : logTail,
        error: errors.length ? errors.map((e) => e.error ?? `exit ${e.exitCode}`).join("; ") : undefined,
      });

      for (const name of job.notify) {
        const connector = getConnector(name);
        if (connector.isOk()) {
          await connector.value.send(message); // best effort, don't fail job
        }
      }
    }

    // Reschedule if recurring and successful
    if (!errors.length && job.repeat) {
      await reschedule(job, jobsFile);
    }
  } catch (e) {
    await store.updateJob(jobId, (j) => ({
      ...j, status: "failed", completedAt: new Date().toISOString(),
      error: (e as Error).message,
    }));
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`worker: ${(e as Error).message}\n`);
  process.exit(1);
});
