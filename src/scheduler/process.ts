import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";
import { Result, ok, err } from "neverthrow";

export interface StartWorkerOptions {
  script: string;
  args: string[];
  logFile: string;
  nodeBin?: string;
}

export interface StartWorkerResult {
  pid: number;
}

export async function startWorker(opts: StartWorkerOptions): Promise<Result<StartWorkerResult, string>> {
  try {
    await mkdir(dirname(opts.logFile), { recursive: true });
    const logHandle = await open(opts.logFile, "a");
    try {
      const child = spawn(opts.nodeBin ?? process.execPath, [opts.script, ...opts.args], {
        detached: true,
        stdio: ["ignore", logHandle.fd, logHandle.fd],
        windowsHide: true,
      });
      if (!child.pid) {
        return err("Failed to start worker (no PID)");
      }
      child.unref();
      return ok({ pid: child.pid });
    } finally {
      await logHandle.close();
    }
  } catch (e) {
    return err(`Failed to start worker: ${(e as Error).message}`);
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function terminateProcess(pid: number, graceMs = 1500): Promise<boolean> {
  if (!isProcessAlive(pid)) return false;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return false;
  }
  const start = Date.now();
  while (Date.now() - start < graceMs) {
    if (!isProcessAlive(pid)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  if (isProcessAlive(pid)) {
    try { process.kill(pid, "SIGKILL"); } catch { /* ignore */ }
  }
  return !isProcessAlive(pid);
}
