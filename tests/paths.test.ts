import { describe, it, expect } from "vitest";
import { getStateDir, getJobsFilePath, getLogDir } from "../src/state/paths.js";

describe("paths", () => {
  describe("getStateDir", () => {
    it("uses SKEDULER_HOME when set", () => {
      const dir = getStateDir({ SKEDULER_HOME: "/custom/path" }, "darwin", "/Users/me");
      expect(dir).toBe("/custom/path");
    });

    it("uses ~/Library/Application Support/skeduler on macOS", () => {
      const dir = getStateDir({}, "darwin", "/Users/me");
      expect(dir).toBe("/Users/me/Library/Application Support/skeduler");
    });

    it("uses XDG_STATE_HOME on Linux when set", () => {
      const dir = getStateDir({ XDG_STATE_HOME: "/home/me/.state" }, "linux", "/home/me");
      expect(dir).toBe("/home/me/.state/skeduler");
    });

    it("uses ~/.local/state/skeduler on Linux when XDG not set", () => {
      const dir = getStateDir({}, "linux", "/home/me");
      expect(dir).toBe("/home/me/.local/state/skeduler");
    });

    it("uses LOCALAPPDATA on Windows", () => {
      const dir = getStateDir({ LOCALAPPDATA: "C:/Users/me/AppData/Local" }, "win32", "C:/Users/me");
      expect(dir).toBe("C:/Users/me/AppData/Local/skeduler");
    });

    it("falls back to homedir/.skeduler on Windows without LOCALAPPDATA", () => {
      const dir = getStateDir({}, "win32", "C:/Users/me");
      expect(dir).toBe("C:/Users/me/.skeduler");
    });
  });

  describe("getJobsFilePath", () => {
    it("returns jobs.json inside state dir", () => {
      const path = getJobsFilePath({ SKEDULER_HOME: "/custom" }, "darwin", "/Users/me");
      expect(path).toBe("/custom/jobs.json");
    });
  });

  describe("getLogDir", () => {
    it("returns logs/ inside state dir", () => {
      const dir = getLogDir({ SKEDULER_HOME: "/custom" }, "darwin", "/Users/me");
      expect(dir).toBe("/custom/logs");
    });
  });
});
