import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "../src/cli.ts");
const TSX = join(__dirname, "../node_modules/.bin/tsx");

function run(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    execFile(TSX, [CLI, ...args], { timeout: 10000 }, (error, stdout, stderr) => {
      resolve({ stdout, stderr, code: error?.code ? Number(error.code) : (error ? 1 : 0) });
    });
  });
}

describe("CLI end-to-end", () => {
  it("shows help", async () => {
    const { stdout, code } = await run(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("skeduler");
    expect(stdout).toContain("Schedule AI coding agents");
  });

  it("dry-run schedule with delay", async () => {
    const { stdout, code } = await run(["45m", "Refactor auth module", "--dry-run"]);
    expect(code).toBe(0);
    expect(stdout).toContain("[Dry run]");
    expect(stdout).toContain("45 minutes");
    expect(stdout).toContain("Refactor auth module");
    expect(stdout).toContain("No job was created");
  });

  it("dry-run schedule with --at", async () => {
    const { stdout, code } = await run(["--at", "23:59", "Night task", "--dry-run"]);
    expect(code).toBe(0);
    expect(stdout).toContain("[Dry run]");
    expect(stdout).toContain("Night task");
  });

  it("dry-run with --json", async () => {
    const { stdout, code } = await run(["30m", "Test task", "--dry-run", "--json"]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.dryRun).toBe(true);
    expect(data.delaySeconds).toBe(1800);
    expect(data.tasks).toEqual(["Test task"]);
  });

  it("errors when no tasks provided", async () => {
    const { stderr, code } = await run(["45m", "--dry-run"]);
    expect(code).not.toBe(0);
    expect(stderr).toContain("No tasks");
  });

  it("errors when no delay or --at", async () => {
    const { stderr, code } = await run(["--dry-run"]);
    expect(code).not.toBe(0);
  });

  it("list shows no pending jobs initially", async () => {
    const { stdout, code } = await run(["list"]);
    expect(code).toBe(0);
    expect(stdout).toContain("No pending jobs");
  });
});
