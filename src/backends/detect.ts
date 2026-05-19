import { execFile } from "node:child_process";
import { Result, ok, err } from "neverthrow";
import type { BackendAdapter } from "./types.js";
import { kiroAdapter, copilotAdapter, claudeAdapter, aiderAdapter, ollamaAdapter, gooseAdapter, cursorAdapter, cursorAgentAlias } from "./adapters.js";

export type WhichFn = (bin: string) => Promise<boolean>;

const ALL_ADAPTERS: BackendAdapter[] = [kiroAdapter, copilotAdapter, claudeAdapter, cursorAdapter, cursorAgentAlias, aiderAdapter, gooseAdapter, ollamaAdapter];

const defaultWhich: WhichFn = (bin) =>
  new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "where" : "which";
    execFile(cmd, [bin], (error) => resolve(!error));
  });

export async function detectBackends(which: WhichFn = defaultWhich): Promise<BackendAdapter[]> {
  const checks = ALL_ADAPTERS.map(async (adapter) => ({
    adapter,
    available: await which(adapter.bin),
  }));
  const results = await Promise.all(checks);
  return results.filter((r) => r.available).map((r) => r.adapter);
}

export function resolveBackend(
  preference: string | undefined,
  available: BackendAdapter[],
): Result<BackendAdapter, string> {
  if (available.length === 0) {
    return err("No AI CLI backends found. Install kiro-cli or copilot.");
  }
  if (!preference) return ok(available[0]);
  const match = available.find((a) => a.name === preference);
  if (!match) {
    const names = available.map((a) => a.name).join(", ");
    return err(`Backend "${preference}" not found. Available: ${names}`);
  }
  return ok(match);
}

const KNOWN_NAMES = ALL_ADAPTERS.map((a) => a.name);

export function validateBackendName(name: string): Result<string, string> {
  if (!name || !KNOWN_NAMES.includes(name)) {
    return err(`Unknown backend "${name}". Known backends: ${KNOWN_NAMES.join(", ")}`);
  }
  return ok(name);
}
