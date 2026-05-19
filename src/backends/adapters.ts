import type { BackendAdapter, BackendCommand } from "./types.js";

export const kiroAdapter: BackendAdapter = {
  name: "kiro",
  bin: "kiro-cli",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    return {
      bin: "kiro-cli",
      args: ["chat", "--no-interactive", "--trust-all-tools", ...extraArgs, task],
    };
  },
};

export const copilotAdapter: BackendAdapter = {
  name: "copilot",
  bin: "copilot",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    return {
      bin: "copilot",
      args: ["--autopilot", "--yolo", ...extraArgs, "-p", task],
    };
  },
};

export const claudeAdapter: BackendAdapter = {
  name: "claude",
  bin: "claude",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    return {
      bin: "claude",
      args: [...extraArgs, "--bg", task],
    };
  },
};

export const aiderAdapter: BackendAdapter = {
  name: "aider",
  bin: "aider",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    return {
      bin: "aider",
      args: ["--yes", ...extraArgs, "--message", task],
    };
  },
};

export const ollamaAdapter: BackendAdapter = {
  name: "ollama",
  bin: "ollama",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    const [model, ...rest] = extraArgs;
    return {
      bin: "ollama",
      args: ["run", model ?? "llama3", ...rest, task],
    };
  },
};

export const gooseAdapter: BackendAdapter = {
  name: "goose",
  bin: "goose",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    return {
      bin: "goose",
      args: ["run", "--no-session", ...extraArgs, "-t", task],
    };
  },
};

export const cursorAdapter: BackendAdapter = {
  name: "cursor",
  bin: "cursor-agent",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    return {
      bin: "cursor-agent",
      args: [...extraArgs, "-p", task],
    };
  },
};

/** Alias: detects `agent` binary for users with newer Cursor CLI installs. */
export const cursorAgentAlias: BackendAdapter = {
  name: "cursor",
  bin: "agent",
  buildCommand(task: string, extraArgs: string[] = []): BackendCommand {
    return {
      bin: "agent",
      args: [...extraArgs, "-p", task],
    };
  },
};
