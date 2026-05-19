import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createJobStore } from "../src/state/jobStore.js";
import { startWorker } from "../src/scheduler/process.js";
import type { JobRecord } from "../src/state/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_SCRIPT = join(__dirname, "../src/scheduler/worker.ts");

describe("worker integration", () => {
  it("sleeps then dispatches a job (using echo as backend)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-worker-"));
    const jobsFile = join(dir, "jobs.json");
    const store = createJobStore(jobsFile);

    const job: JobRecord = {
      id: "sk_integ1",
      status: "pending",
      backend: "nonexistent", // not a real backend, worker will fail with "Unknown backend"
      createdAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 200).toISOString(),
      delaySeconds: 0,
      cwd: dir,
      tasks: ["test task"],
      logFile: join(dir, "worker.log"),
    };
    await store.createJob(job);

    // Start worker using tsx to run the .ts file directly
    const result = await startWorker({
      script: WORKER_SCRIPT,
      args: [jobsFile, "sk_integ1"],
      logFile: join(dir, "worker.log"),
      nodeBin: join(__dirname, "../node_modules/.bin/tsx"),
    });
    expect(result.isOk()).toBe(true);

    // Wait for the worker to finish (500ms sleep + dispatch time)
    await new Promise((r) => setTimeout(r, 3000));

    // Check that the job was updated
    const updated = await store.getJob("sk_integ1");
    expect(updated.isOk()).toBe(true);
    const j = updated._unsafeUnwrap()!;
    // Worker should fail with "Unknown backend" and mark job as failed
    expect(j.status).toBe("failed");
    expect(j.schedulerPid).toBeGreaterThan(0);
    expect(j.error).toContain("Unknown backend");

    rmSync(dir, { recursive: true, force: true });
  }, 10000); // 10s timeout
});
