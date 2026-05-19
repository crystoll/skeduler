import { describe, it, expect } from "vitest";
import { detectBackends, resolveBackend } from "../src/backends/detect.js";
import type { BackendAdapter } from "../src/backends/types.js";

describe("detectBackends", () => {
  it("returns kiro when kiro-cli is available", async () => {
    const result = await detectBackends((bin) => Promise.resolve(bin === "kiro-cli"));
    expect(result.map(a => a.name)).toContain("kiro");
  });

  it("returns copilot when copilot is available", async () => {
    const result = await detectBackends((bin) => Promise.resolve(bin === "copilot"));
    expect(result.map(a => a.name)).toContain("copilot");
  });

  it("returns all when all are available", async () => {
    const result = await detectBackends(() => Promise.resolve(true));
    const names = result.map(a => a.name);
    expect(names).toContain("kiro");
    expect(names).toContain("copilot");
    expect(names).toContain("claude");
    expect(names).toContain("cursor");
    expect(names).toContain("aider");
    expect(names).toContain("goose");
    expect(names).toContain("ollama");
  });

  it("returns empty when none are available", async () => {
    const result = await detectBackends(() => Promise.resolve(false));
    expect(result).toEqual([]);
  });
});

describe("resolveBackend", () => {
  const fakeKiro: BackendAdapter = { name: "kiro", bin: "kiro-cli", buildCommand: () => ({ bin: "", args: [] }) };
  const fakeCopilot: BackendAdapter = { name: "copilot", bin: "copilot", buildCommand: () => ({ bin: "", args: [] }) };

  it("returns specified backend when available", () => {
    const result = resolveBackend("copilot", [fakeKiro, fakeCopilot]);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().name).toBe("copilot");
  });

  it("returns first available when no preference given", () => {
    const result = resolveBackend(undefined, [fakeKiro, fakeCopilot]);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().name).toBe("kiro");
  });

  it("errors when specified backend is not available", () => {
    const result = resolveBackend("copilot", [fakeKiro]);
    expect(result.isErr()).toBe(true);
  });

  it("errors when no backends are available", () => {
    const result = resolveBackend(undefined, []);
    expect(result.isErr()).toBe(true);
  });
});
