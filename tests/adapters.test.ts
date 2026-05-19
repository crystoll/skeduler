import { describe, it, expect } from "vitest";
import { kiroAdapter, copilotAdapter, claudeAdapter, aiderAdapter, ollamaAdapter, gooseAdapter, cursorAdapter } from "../src/backends/adapters.js";
import type { BackendCommand } from "../src/backends/types.js";

describe("kiroAdapter", () => {
  it("builds command for a task", () => {
    const cmd = kiroAdapter.buildCommand("Fix the tests");
    expect(cmd).toEqual<BackendCommand>({
      bin: "kiro-cli",
      args: ["chat", "--no-interactive", "--trust-all-tools", "Fix the tests"],
    });
  });

  it("includes extra args before the task", () => {
    const cmd = kiroAdapter.buildCommand("Fix the tests", ["--agent", "rust-expert"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "kiro-cli",
      args: ["chat", "--no-interactive", "--trust-all-tools", "--agent", "rust-expert", "Fix the tests"],
    });
  });

  it("has correct metadata", () => {
    expect(kiroAdapter.name).toBe("kiro");
    expect(kiroAdapter.bin).toBe("kiro-cli");
  });
});

describe("copilotAdapter", () => {
  it("builds command for a task", () => {
    const cmd = copilotAdapter.buildCommand("Run the migration");
    expect(cmd).toEqual<BackendCommand>({
      bin: "copilot",
      args: ["--autopilot", "--yolo", "-p", "Run the migration"],
    });
  });

  it("includes extra args before the prompt flag", () => {
    const cmd = copilotAdapter.buildCommand("Run the migration", ["--max-autopilot-continues", "10"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "copilot",
      args: ["--autopilot", "--yolo", "--max-autopilot-continues", "10", "-p", "Run the migration"],
    });
  });

  it("has correct metadata", () => {
    expect(copilotAdapter.name).toBe("copilot");
    expect(copilotAdapter.bin).toBe("copilot");
  });
});

describe("claudeAdapter", () => {
  it("builds command for a task", () => {
    const cmd = claudeAdapter.buildCommand("Fix the tests");
    expect(cmd).toEqual<BackendCommand>({
      bin: "claude",
      args: ["--bg", "Fix the tests"],
    });
  });

  it("includes extra args before the task", () => {
    const cmd = claudeAdapter.buildCommand("Fix the tests", ["--model", "opus"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "claude",
      args: ["--model", "opus", "--bg", "Fix the tests"],
    });
  });

  it("has correct metadata", () => {
    expect(claudeAdapter.name).toBe("claude");
    expect(claudeAdapter.bin).toBe("claude");
  });
});

describe("aiderAdapter", () => {
  it("builds command for a task", () => {
    const cmd = aiderAdapter.buildCommand("Add docstrings");
    expect(cmd).toEqual<BackendCommand>({
      bin: "aider",
      args: ["--yes", "--message", "Add docstrings"],
    });
  });

  it("includes extra args before --message", () => {
    const cmd = aiderAdapter.buildCommand("Add docstrings", ["--no-auto-commits"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "aider",
      args: ["--yes", "--no-auto-commits", "--message", "Add docstrings"],
    });
  });

  it("has correct metadata", () => {
    expect(aiderAdapter.name).toBe("aider");
    expect(aiderAdapter.bin).toBe("aider");
  });
});

describe("ollamaAdapter", () => {
  it("builds command with model from extraArgs", () => {
    const cmd = ollamaAdapter.buildCommand("Explain this error", ["llama3"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "ollama",
      args: ["run", "llama3", "Explain this error"],
    });
  });

  it("uses first extraArg as model, passes rest as flags", () => {
    const cmd = ollamaAdapter.buildCommand("Summarize", ["qwen2.5", "--verbose"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "ollama",
      args: ["run", "qwen2.5", "--verbose", "Summarize"],
    });
  });

  it("has correct metadata", () => {
    expect(ollamaAdapter.name).toBe("ollama");
    expect(ollamaAdapter.bin).toBe("ollama");
  });
});

describe("gooseAdapter", () => {
  it("builds command for a task", () => {
    const cmd = gooseAdapter.buildCommand("Run security audit");
    expect(cmd).toEqual<BackendCommand>({
      bin: "goose",
      args: ["run", "--no-session", "-t", "Run security audit"],
    });
  });

  it("includes extra args for provider/model selection", () => {
    const cmd = gooseAdapter.buildCommand("Refactor auth", ["--provider", "anthropic", "--model", "claude-4-sonnet"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "goose",
      args: ["run", "--no-session", "--provider", "anthropic", "--model", "claude-4-sonnet", "-t", "Refactor auth"],
    });
  });

  it("has correct metadata", () => {
    expect(gooseAdapter.name).toBe("goose");
    expect(gooseAdapter.bin).toBe("goose");
  });
});

describe("cursorAdapter", () => {
  it("builds command for a task", () => {
    const cmd = cursorAdapter.buildCommand("Fix the login bug");
    expect(cmd).toEqual<BackendCommand>({
      bin: "cursor-agent",
      args: ["-p", "Fix the login bug"],
    });
  });

  it("includes extra args before -p", () => {
    const cmd = cursorAdapter.buildCommand("Fix the bug", ["--model", "gpt-4o"]);
    expect(cmd).toEqual<BackendCommand>({
      bin: "cursor-agent",
      args: ["--model", "gpt-4o", "-p", "Fix the bug"],
    });
  });

  it("has correct metadata", () => {
    expect(cursorAdapter.name).toBe("cursor");
    expect(cursorAdapter.bin).toBe("cursor-agent");
  });
});
