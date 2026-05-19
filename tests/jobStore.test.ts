import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createJobStore } from "../src/state/jobStore.js";
import type { JobRecord } from "../src/state/schema.js";

function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "sk_test123",
    status: "pending",
    backend: "kiro",
    createdAt: "2026-05-19T14:00:00.000Z",
    dueAt: "2026-05-19T15:00:00.000Z",
    delaySeconds: 3600,
    cwd: "/tmp/test",
    tasks: ["Do the thing"],
    logFile: "/tmp/test.log",
    ...overrides,
  };
}

function freshStore() {
  const dir = mkdtempSync(join(tmpdir(), "skeduler-test-"));
  const store = createJobStore(join(dir, "jobs.json"));
  return { dir, store };
}

describe("jobStore", () => {
  describe("createJob", () => {
    it("creates a job and persists it", async () => {
      const { dir, store } = freshStore();
      const job = makeJob();
      const result = await store.createJob(job);
      expect(result.isOk()).toBe(true);

      const got = await store.getJob("sk_test123");
      expect(got.isOk()).toBe(true);
      expect(got._unsafeUnwrap()?.id).toBe("sk_test123");
      rmSync(dir, { recursive: true, force: true });
    });

    it("rejects duplicate job id", async () => {
      const { dir, store } = freshStore();
      const job = makeJob();
      await store.createJob(job);
      const result = await store.createJob(job);
      expect(result.isErr()).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("getJob", () => {
    it("returns undefined for non-existent job", async () => {
      const { dir, store } = freshStore();
      const result = await store.getJob("nope");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("updateJob", () => {
    it("updates a job field", async () => {
      const { dir, store } = freshStore();
      await store.createJob(makeJob());
      const result = await store.updateJob("sk_test123", (j) => ({ ...j, status: "dispatched" }));
      expect(result.isOk()).toBe(true);

      const got = await store.getJob("sk_test123");
      expect(got._unsafeUnwrap()?.status).toBe("dispatched");
      rmSync(dir, { recursive: true, force: true });
    });

    it("errors when job not found", async () => {
      const { dir, store } = freshStore();
      const result = await store.updateJob("nope", (j) => j);
      expect(result.isErr()).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("listJobs", () => {
    it("returns empty array when no jobs", async () => {
      const { dir, store } = freshStore();
      const result = await store.listJobs();
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual([]);
      rmSync(dir, { recursive: true, force: true });
    });

    it("returns all jobs", async () => {
      const { dir, store } = freshStore();
      await store.createJob(makeJob({ id: "sk_a" }));
      await store.createJob(makeJob({ id: "sk_b" }));
      const result = await store.listJobs();
      expect(result._unsafeUnwrap()).toHaveLength(2);
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
