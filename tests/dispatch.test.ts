import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dispatchJob } from "../src/scheduler/dispatch.js";
import type { JobRecord } from "../src/state/schema.js";

function makeJob(dir: string, overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "sk_dispatch1",
    status: "pending",
    backend: "kiro",
    createdAt: "2026-05-19T14:00:00.000Z",
    dueAt: "2026-05-19T15:00:00.000Z",
    delaySeconds: 3600,
    cwd: dir,
    tasks: ["echo hello"],
    logFile: join(dir, "dispatch.log"),
    ...overrides,
  };
}

describe("dispatchJob", () => {
  it("dispatches tasks using the provided bin and args builder", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-dispatch-"));
    // Use 'echo' as a fake backend — it exits 0 immediately
    const job = makeJob(dir, { tasks: ["task1", "task2"] });
    const results = await dispatchJob(job, (task) => ({
      bin: "echo",
      args: [task],
    }));

    expect(results).toHaveLength(2);
    expect(results[0].task).toBe("task1");
    expect(results[0].exitCode).toBe(0);
    expect(results[1].task).toBe("task2");
    expect(results[1].exitCode).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  it("captures errors when bin does not exist", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-dispatch-"));
    const job = makeJob(dir, { tasks: ["task1"] });
    const results = await dispatchJob(job, () => ({
      bin: "nonexistent-binary-xyz",
      args: [],
    }));

    expect(results).toHaveLength(1);
    expect(results[0].error).toBeDefined();
    rmSync(dir, { recursive: true, force: true });
  });

  it("continues dispatching after a failure", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-dispatch-"));
    const job = makeJob(dir, { tasks: ["fail", "succeed"] });
    let callCount = 0;
    const results = await dispatchJob(job, (task) => {
      callCount++;
      if (task === "fail") return { bin: "nonexistent-xyz", args: [] };
      return { bin: "echo", args: [task] };
    });

    expect(results).toHaveLength(2);
    expect(results[0].error).toBeDefined();
    expect(results[1].exitCode).toBe(0);
    expect(callCount).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("dispatchJob with timeout", () => {
  it("kills a task that exceeds the timeout", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-timeout-"));
    const job = makeJob(dir, { tasks: ["sleep forever"], timeoutSeconds: 1 });
    // Use 'sleep' as a backend that will exceed the 1s timeout
    const results = await dispatchJob(job, () => ({
      bin: "sleep",
      args: ["30"],
    }));

    expect(results).toHaveLength(1);
    expect(results[0].error).toContain("timed out");
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not kill tasks that finish within timeout", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-timeout-"));
    const job = makeJob(dir, { tasks: ["quick"], timeoutSeconds: 10 });
    const results = await dispatchJob(job, () => ({
      bin: "echo",
      args: ["done"],
    }));

    expect(results).toHaveLength(1);
    expect(results[0].exitCode).toBe(0);
    expect(results[0].error).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });

  it("no timeout when timeoutSeconds is undefined", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-timeout-"));
    const job = makeJob(dir, { tasks: ["quick"] });
    const results = await dispatchJob(job, () => ({
      bin: "echo",
      args: ["done"],
    }));

    expect(results).toHaveLength(1);
    expect(results[0].exitCode).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });
});
