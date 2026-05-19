import { describe, it, expect } from "vitest";
import { stripAnsi, formatTimeRemaining } from "../src/utils.js";

describe("stripAnsi", () => {
  it("removes color codes", () => {
    expect(stripAnsi("\u001B[31mred\u001B[0m")).toBe("red");
  });

  it("removes cursor movement codes", () => {
    expect(stripAnsi("\u001B[1G⠋ \u001B[K")).toBe("⠋ ");
  });

  it("removes complex escape sequences", () => {
    expect(stripAnsi("\u001B[38;2;0;204;0mgreen\u001B[0m")).toBe("green");
  });

  it("passes through plain text unchanged", () => {
    expect(stripAnsi("hello world")).toBe("hello world");
  });

  it("handles mixed content", () => {
    expect(stripAnsi("The capital of Finland is \u001B[1mHelsinki\u001B[0m.")).toBe("The capital of Finland is Helsinki.");
  });

  it("removes hide/show cursor sequences", () => {
    expect(stripAnsi("\u001B[?25lhidden\u001B[?25h")).toBe("hidden");
  });
});

describe("formatTimeRemaining", () => {
  it("shows minutes for near-future", () => {
    const due = new Date(Date.now() + 23.5 * 60 * 1000);
    expect(formatTimeRemaining(due.toISOString())).toBe("fires in 23 minutes");
  });

  it("shows hours and minutes", () => {
    const due = new Date(Date.now() + (2 * 3600 + 15 * 60) * 1000);
    expect(formatTimeRemaining(due.toISOString())).toBe("fires in 2 hours, 15 minutes");
  });

  it("shows 'less than a minute' for very soon", () => {
    const due = new Date(Date.now() + 30 * 1000);
    expect(formatTimeRemaining(due.toISOString())).toBe("fires in less than a minute");
  });

  it("shows 'already fired' for past times", () => {
    const due = new Date(Date.now() - 60000);
    expect(formatTimeRemaining(due.toISOString())).toBe("already fired");
  });

  it("shows days for long delays", () => {
    const due = new Date(Date.now() + (1 * 86400 + 3 * 3600) * 1000);
    expect(formatTimeRemaining(due.toISOString())).toBe("fires in 1 day, 3 hours");
  });
});
