import { describe, it, expect } from "vitest";
import { parseAt } from "../src/time/parseAt.js";

describe("parseAt", () => {
  // Use a fixed "now" for deterministic tests: 2026-05-19 14:00:00 local
  const now = new Date(2026, 4, 19, 14, 0, 0); // May 19, 2026 14:00

  describe("HH:mm format", () => {
    it("parses a future time today", () => {
      const result = parseAt("17:30", now);
      expect(result.isOk()).toBe(true);
      const { dueAt, input } = result._unsafeUnwrap();
      expect(input).toBe("17:30");
      expect(dueAt.getHours()).toBe(17);
      expect(dueAt.getMinutes()).toBe(30);
      expect(dueAt.getDate()).toBe(19);
    });

    it("rolls to tomorrow if time has passed today", () => {
      const result = parseAt("09:00", now);
      expect(result.isOk()).toBe(true);
      const { dueAt } = result._unsafeUnwrap();
      expect(dueAt.getHours()).toBe(9);
      expect(dueAt.getMinutes()).toBe(0);
      expect(dueAt.getDate()).toBe(20); // tomorrow
    });

    it("rolls to tomorrow if time equals now", () => {
      const result = parseAt("14:00", now);
      expect(result.isOk()).toBe(true);
      const { dueAt } = result._unsafeUnwrap();
      expect(dueAt.getDate()).toBe(20);
    });
  });

  describe("12-hour format", () => {
    it("parses pm time", () => {
      const result = parseAt("5:30pm", now);
      expect(result.isOk()).toBe(true);
      const { dueAt } = result._unsafeUnwrap();
      expect(dueAt.getHours()).toBe(17);
      expect(dueAt.getMinutes()).toBe(30);
    });

    it("parses am time", () => {
      const result = parseAt("6:00am", now);
      expect(result.isOk()).toBe(true);
      const { dueAt } = result._unsafeUnwrap();
      expect(dueAt.getHours()).toBe(6);
      expect(dueAt.getDate()).toBe(20); // already past, rolls to tomorrow
    });

    it("parses 12:00pm as noon", () => {
      const result = parseAt("12:00pm", now);
      expect(result.isOk()).toBe(true);
      const { dueAt } = result._unsafeUnwrap();
      expect(dueAt.getHours()).toBe(12);
      expect(dueAt.getDate()).toBe(20); // past noon today
    });

    it("parses 12:30am as 00:30", () => {
      const result = parseAt("12:30am", now);
      expect(result.isOk()).toBe(true);
      const { dueAt } = result._unsafeUnwrap();
      expect(dueAt.getHours()).toBe(0);
      expect(dueAt.getMinutes()).toBe(30);
      expect(dueAt.getDate()).toBe(20);
    });
  });

  describe("explicit datetime", () => {
    it("parses future date and time", () => {
      const result = parseAt("2026-05-20 09:00", now);
      expect(result.isOk()).toBe(true);
      const { dueAt } = result._unsafeUnwrap();
      expect(dueAt.getFullYear()).toBe(2026);
      expect(dueAt.getMonth()).toBe(4); // May = 4
      expect(dueAt.getDate()).toBe(20);
      expect(dueAt.getHours()).toBe(9);
    });

    it("rejects a datetime in the past", () => {
      const result = parseAt("2026-05-18 09:00", now);
      expect(result.isErr()).toBe(true);
    });
  });

  describe("error cases", () => {
    it("rejects empty string", () => {
      const result = parseAt("", now);
      expect(result.isErr()).toBe(true);
    });

    it("rejects garbage input", () => {
      const result = parseAt("not-a-time", now);
      expect(result.isErr()).toBe(true);
    });

    it("rejects invalid hour", () => {
      const result = parseAt("25:00", now);
      expect(result.isErr()).toBe(true);
    });

    it("rejects invalid minute", () => {
      const result = parseAt("14:61", now);
      expect(result.isErr()).toBe(true);
    });
  });
});
