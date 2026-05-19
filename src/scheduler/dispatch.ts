import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";
import type { BackendCommand } from "../backends/types.js";
import type { JobRecord } from "../state/schema.js";

export interface DispatchResult {
  task: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  error?: string;
}

export type CommandBuilder = (task: string) => BackendCommand;

function runOne(cmd: BackendCommand, cwd: string, logFd: number, timeoutMs?: number): Promise<Omit<DispatchResult, "task">> {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd.bin, cmd.args, {
        cwd,
        stdio: ["ignore", logFd, logFd],
        shell: false,
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (timeoutMs) {
        timer = setTimeout(() => {
          child.kill("SIGTERM");
          setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); }, 1500);
          resolve({ exitCode: null, signal: "SIGTERM", error: `timed out after ${Math.round(timeoutMs / 1000)}s` });
        }, timeoutMs);
      }
      child.on("error", (err) => { if (timer) clearTimeout(timer); resolve({ exitCode: null, signal: null, error: err.message }); });
      child.on("exit", (code, signal) => { if (timer) clearTimeout(timer); resolve({ exitCode: code, signal }); });
    } catch (err) {
      resolve({ exitCode: null, signal: null, error: (err as Error).message });
    }
  });
}

export async function dispatchJob(job: JobRecord, buildCommand: CommandBuilder): Promise<DispatchResult[]> {
  await mkdir(dirname(job.logFile), { recursive: true });
  const handle = await open(job.logFile, "a");
  const timeoutMs = job.timeoutSeconds ? job.timeoutSeconds * 1000 : undefined;
  const results: DispatchResult[] = [];
  try {
    for (const task of job.tasks) {
      const cmd = buildCommand(task);
      const r = await runOne(cmd, job.cwd, handle.fd, timeoutMs);
      results.push({ task, ...r });
    }
  } finally {
    await handle.close();
  }
  return results;
}
