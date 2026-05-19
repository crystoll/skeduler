import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStatus } from "../src/commands/status.js";
import { createJobStore } from "../src/state/jobStore.js";
import type { JobRecord } from "../src/state/schema.js";

function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "sk_status1",
    status: "pending",
    backend: "kiro",
    createdAt: "2026-05-19T14:00:00.000Z",
    dueAt: "2026-05-19T15:00:00.000Z",
    delaySeconds: 3600,
    cwd: "/tmp/project",
    tasks: ["Run tests", "Deploy"],
    logFile: "/tmp/sk_status1.log",
    ...overrides,
  };
}

describe("runStatus", () => {
  it("shows full job details", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-status-"));
    const jobsFile = join(dir, "jobs.json");
    const store = createJobStore(jobsFile);
    await store.createJob(makeJob());

    const result = await runStatus({ id: "sk_status1", json: false, jobsFile });
    expect(result.isOk()).toBe(true);
    const output = result._unsafeUnwrap();
    expect(output).toContain("sk_status1");
    expect(output).toContain("pending");
    expect(output).toContain("kiro");
    expect(output).toContain("Run tests");
    expect(output).toContain("Deploy");
    expect(output).toContain("/tmp/project");
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns JSON when requested", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-status-"));
    const jobsFile = join(dir, "jobs.json");
    const store = createJobStore(jobsFile);
    await store.createJob(makeJob());

    const result = await runStatus({ id: "sk_status1", json: true, jobsFile });
    expect(result.isOk()).toBe(true);
    const data = JSON.parse(result._unsafeUnwrap());
    expect(data.id).toBe("sk_status1");
    expect(data.tasks).toEqual(["Run tests", "Deploy"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("errors when job not found", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-status-"));
    const jobsFile = join(dir, "jobs.json");

    const result = await runStatus({ id: "sk_nope", json: false, jobsFile });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toContain("not found");
    rmSync(dir, { recursive: true, force: true });
  });

  it("includes log tail when log file exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-status-"));
    const jobsFile = join(dir, "jobs.json");
    const logFile = join(dir, "test.log");
    writeFileSync(logFile, "line1\nline2\nline3\n");

    const store = createJobStore(jobsFile);
    await store.createJob(makeJob({ logFile }));

    const result = await runStatus({ id: "sk_status1", json: false, jobsFile });
    expect(result.isOk()).toBe(true);
    const output = result._unsafeUnwrap();
    expect(output).toContain("Log output");
    expect(output).toContain("line1");
    rmSync(dir, { recursive: true, force: true });
  });
});
