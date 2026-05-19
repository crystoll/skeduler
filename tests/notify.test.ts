import { describe, it, expect } from "vitest";
import { formatNotifyMessage } from "../src/notify/message.js";

describe("formatNotifyMessage", () => {
  it("formats a success message with output", () => {
    const msg = formatNotifyMessage({
      jobId: "sk_abc123",
      status: "dispatched",
      backend: "goose",
      tasks: ["Gather world news"],
      repeat: "daily",
      logTail: "Here's your morning news summary about global events.",
    });
    expect(msg).toContain("✅");
    expect(msg).toContain("sk_abc123");
    expect(msg).toContain("goose");
    expect(msg).toContain("daily");
    expect(msg).toContain("Gather world news");
    expect(msg).toContain("morning news summary");
  });

  it("formats a failure message with error", () => {
    const msg = formatNotifyMessage({
      jobId: "sk_fail1",
      status: "failed",
      backend: "kiro",
      tasks: ["Run tests"],
      error: "timed out after 1800s",
    });
    expect(msg).toContain("❌");
    expect(msg).toContain("sk_fail1");
    expect(msg).toContain("timed out");
    expect(msg).not.toContain("Output");
  });

  it("truncates long output to 500 chars", () => {
    const longOutput = "x".repeat(1000);
    const msg = formatNotifyMessage({
      jobId: "sk_long",
      status: "dispatched",
      backend: "ollama",
      tasks: ["Generate report"],
      logTail: longOutput,
    });
    expect(msg.length).toBeLessThan(700); // message + metadata < 700
    expect(msg).toContain("…");
  });

  it("handles multiple tasks", () => {
    const msg = formatNotifyMessage({
      jobId: "sk_multi",
      status: "dispatched",
      backend: "kiro",
      tasks: ["Task one", "Task two", "Task three"],
      logTail: "done",
    });
    expect(msg).toContain("Task one");
    expect(msg).toContain("Task two");
  });

  it("omits repeat line when not set", () => {
    const msg = formatNotifyMessage({
      jobId: "sk_once",
      status: "dispatched",
      backend: "kiro",
      tasks: ["One-off task"],
      logTail: "done",
    });
    expect(msg).not.toContain("Repeat");
  });
});
