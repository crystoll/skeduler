import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadTasksFromFile, collectTasks } from "../src/commands/loadTasks.js";

describe("loadTasksFromFile", () => {
  it("reads one task per line", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-load-"));
    const file = join(dir, "tasks.txt");
    writeFileSync(file, "Task one\nTask two\nTask three\n");

    const result = await loadTasksFromFile(file);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(["Task one", "Task two", "Task three"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("skips blank lines", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-load-"));
    const file = join(dir, "tasks.txt");
    writeFileSync(file, "Task one\n\n\nTask two\n");

    const result = await loadTasksFromFile(file);
    expect(result._unsafeUnwrap()).toEqual(["Task one", "Task two"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("skips comment lines starting with #", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-load-"));
    const file = join(dir, "tasks.txt");
    writeFileSync(file, "# This is a comment\nTask one\n# Another comment\nTask two\n");

    const result = await loadTasksFromFile(file);
    expect(result._unsafeUnwrap()).toEqual(["Task one", "Task two"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("trims whitespace from lines", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-load-"));
    const file = join(dir, "tasks.txt");
    writeFileSync(file, "  Task one  \n  Task two\n");

    const result = await loadTasksFromFile(file);
    expect(result._unsafeUnwrap()).toEqual(["Task one", "Task two"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("errors when file does not exist", async () => {
    const result = await loadTasksFromFile("/nonexistent/path/tasks.txt");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toContain("not found");
  });

  it("returns empty array for file with only comments and blanks", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-load-"));
    const file = join(dir, "tasks.txt");
    writeFileSync(file, "# comment\n\n# another\n");

    const result = await loadTasksFromFile(file);
    expect(result._unsafeUnwrap()).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("collectTasks", () => {
  it("combines positional args, --task flags, and --file in order", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-collect-"));
    const file = join(dir, "tasks.txt");
    writeFileSync(file, "From file\n");

    const result = await collectTasks({
      positional: ["Positional task"],
      taskFlags: ["Flag task"],
      filePath: file,
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(["Positional task", "Flag task", "From file"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("works with only positional args", async () => {
    const result = await collectTasks({ positional: ["A", "B"], taskFlags: [] });
    expect(result._unsafeUnwrap()).toEqual(["A", "B"]);
  });

  it("works with only --task flags", async () => {
    const result = await collectTasks({ positional: [], taskFlags: ["X", "Y"] });
    expect(result._unsafeUnwrap()).toEqual(["X", "Y"]);
  });

  it("works with only --file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sk-collect-"));
    const file = join(dir, "tasks.txt");
    writeFileSync(file, "File task\n");

    const result = await collectTasks({ positional: [], taskFlags: [], filePath: file });
    expect(result._unsafeUnwrap()).toEqual(["File task"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns empty when no sources provided", async () => {
    const result = await collectTasks({ positional: [], taskFlags: [] });
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it("propagates file read errors", async () => {
    const result = await collectTasks({ positional: [], taskFlags: [], filePath: "/no/such/file.txt" });
    expect(result.isErr()).toBe(true);
  });
});
