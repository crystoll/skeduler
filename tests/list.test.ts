import { describe, it, expect } from "vitest";
import { formatJobVerbose } from "../src/commands/list.js";
import type { JobRecord } from "../src/state/schema.js";

function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "sk_abc123",
    status: "pending",
    backend: "kiro",
    createdAt: "2026-05-19T14:00:00.000Z",
    dueAt: "2026-05-19T15:00:00.000Z",
    delaySeconds: 3600,
    cwd: "/home/user/project",
    tasks: ["Refactor auth module"],
    logFile: "/home/user/.local/state/skeduler/logs/sk_abc123.log",
    ...overrides,
  };
}

describe("formatJobVerbose", () => {
  it("includes job id and status", () => {
    const output = formatJobVerbose(makeJob());
    expect(output).toContain("sk_abc123");
    expect(output).toContain("pending");
  });

  it("includes backend name", () => {
    const output = formatJobVerbose(makeJob());
    expect(output).toContain("kiro");
  });

  it("includes task text", () => {
    const output = formatJobVerbose(makeJob({ tasks: ["Task one", "Task two"] }));
    expect(output).toContain("Task one");
    expect(output).toContain("Task two");
  });

  it("includes PID when available", () => {
    const output = formatJobVerbose(makeJob({ schedulerPid: 12345 }));
    expect(output).toContain("12345");
  });

  it("includes log file path", () => {
    const output = formatJobVerbose(makeJob());
    expect(output).toContain("sk_abc123.log");
  });

  it("includes cwd", () => {
    const output = formatJobVerbose(makeJob());
    expect(output).toContain("/home/user/project");
  });

  it("shows dispatch time", () => {
    const output = formatJobVerbose(makeJob());
    expect(output).toContain("Due");
  });

  it("shows error when present", () => {
    const output = formatJobVerbose(makeJob({ status: "failed", error: "kiro-cli not found" }));
    expect(output).toContain("kiro-cli not found");
  });
});
