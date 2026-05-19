import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createJobStore } from "../src/state/jobStore.js";

describe("jobStore corrupted state", () => {
  it("recovers from invalid JSON by backing up and resetting", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-corrupt-"));
    const file = join(dir, "jobs.json");
    writeFileSync(file, "this is not json {{{");

    const store = createJobStore(file);
    const result = await store.listJobs();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
    // Corrupt file should be backed up
    expect(existsSync(file + ".corrupt")).toBe(true);
    expect(readFileSync(file + ".corrupt", "utf-8")).toBe("this is not json {{{");
    rmSync(dir, { recursive: true, force: true });
  });

  it("recovers from invalid schema (valid JSON but wrong shape)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-corrupt-"));
    const file = join(dir, "jobs.json");
    writeFileSync(file, JSON.stringify({ version: 99, stuff: "wrong" }));

    const store = createJobStore(file);
    const result = await store.listJobs();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
    expect(existsSync(file + ".corrupt")).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("can create jobs after recovery", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-corrupt-"));
    const file = join(dir, "jobs.json");
    writeFileSync(file, "GARBAGE");

    const store = createJobStore(file);
    // First call triggers recovery
    await store.listJobs();

    // Now create a job — should work on the fresh file
    const createResult = await store.createJob({
      id: "sk_after_recovery",
      status: "pending",
      backend: "kiro",
      createdAt: "2026-05-19T14:00:00.000Z",
      dueAt: "2026-05-19T15:00:00.000Z",
      delaySeconds: 3600,
      cwd: "/tmp",
      tasks: ["test"],
      logFile: "/tmp/test.log",
    });
    expect(createResult.isOk()).toBe(true);

    const got = await store.getJob("sk_after_recovery");
    expect(got._unsafeUnwrap()?.id).toBe("sk_after_recovery");
    rmSync(dir, { recursive: true, force: true });
  });
});
