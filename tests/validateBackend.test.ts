import { describe, it, expect } from "vitest";
import { validateBackendName } from "../src/backends/detect.js";

describe("validateBackendName", () => {
  it("accepts known backend names", () => {
    expect(validateBackendName("kiro").isOk()).toBe(true);
    expect(validateBackendName("copilot").isOk()).toBe(true);
    expect(validateBackendName("claude").isOk()).toBe(true);
    expect(validateBackendName("cursor").isOk()).toBe(true);
    expect(validateBackendName("aider").isOk()).toBe(true);
    expect(validateBackendName("goose").isOk()).toBe(true);
    expect(validateBackendName("ollama").isOk()).toBe(true);
  });

  it("rejects unknown backend with helpful error", () => {
    const result = validateBackendName("windsurf");
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toContain("windsurf");
    expect(error).toContain("kiro");
    expect(error).toContain("goose");
  });

  it("rejects empty string", () => {
    const result = validateBackendName("");
    expect(result.isErr()).toBe(true);
  });
});
