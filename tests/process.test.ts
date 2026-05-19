import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { startWorker, terminateProcess, isProcessAlive } from "../src/scheduler/process.js";

describe("process management", () => {
  describe("startWorker", () => {
    it("spawns a detached process and returns its pid", async () => {
      const dir = mkdtempSync(join(tmpdir(), "sk-proc-"));
      const script = join(dir, "worker.js");
      writeFileSync(script, "setTimeout(() => {}, 5000);");

      const result = await startWorker({
        script,
        args: [],
        logFile: join(dir, "worker.log"),
      });

      expect(result.isOk()).toBe(true);
      const { pid } = result._unsafeUnwrap();
      expect(pid).toBeGreaterThan(0);
      expect(isProcessAlive(pid)).toBe(true);

      // Cleanup
      process.kill(pid, "SIGKILL");
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("terminateProcess", () => {
    it("terminates a running process", async () => {
      const dir = mkdtempSync(join(tmpdir(), "sk-proc-"));
      const script = join(dir, "worker.js");
      writeFileSync(script, "setTimeout(() => {}, 10000);");

      const startResult = await startWorker({
        script,
        args: [],
        logFile: join(dir, "worker.log"),
      });
      const { pid } = startResult._unsafeUnwrap();

      const killed = await terminateProcess(pid);
      expect(killed).toBe(true);
      expect(isProcessAlive(pid)).toBe(false);

      rmSync(dir, { recursive: true, force: true });
    });

    it("returns false for non-existent process", async () => {
      const killed = await terminateProcess(999999);
      expect(killed).toBe(false);
    });
  });

  describe("isProcessAlive", () => {
    it("returns true for current process", () => {
      expect(isProcessAlive(process.pid)).toBe(true);
    });

    it("returns false for non-existent pid", () => {
      expect(isProcessAlive(999999)).toBe(false);
    });
  });
});
