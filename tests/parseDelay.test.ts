import { describe, it, expect } from "vitest";
import { parseDelay } from "../src/time/parseDelay.js";

describe("parseDelay", () => {
  describe("single units", () => {
    it("parses seconds", () => {
      const result = parseDelay("30s");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 30, input: "30s" });
    });

    it("parses minutes", () => {
      const result = parseDelay("45m");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 2700, input: "45m" });
    });

    it("parses hours", () => {
      const result = parseDelay("2h");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 7200, input: "2h" });
    });

    it("parses days", () => {
      const result = parseDelay("1d");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 86400, input: "1d" });
    });
  });

  describe("compound units", () => {
    it("parses hours and minutes", () => {
      const result = parseDelay("2h30m");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 9000, input: "2h30m" });
    });

    it("parses days, hours, and minutes", () => {
      const result = parseDelay("1d2h30m");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 95400, input: "1d2h30m" });
    });

    it("parses hours, minutes, and seconds", () => {
      const result = parseDelay("1h30m10s");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 5410, input: "1h30m10s" });
    });
  });

  describe("verbose unit names", () => {
    it("parses 'minutes'", () => {
      const result = parseDelay("30 minutes");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 1800, input: "30 minutes" });
    });

    it("parses '2 hours 30 minutes'", () => {
      const result = parseDelay("2 hours 30 minutes");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 9000, input: "2 hours 30 minutes" });
    });

    it("parses singular forms", () => {
      const result = parseDelay("1 hour");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 3600, input: "1 hour" });
    });

    it("parses short verbose forms", () => {
      const result = parseDelay("5min");
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ seconds: 300, input: "5min" });
    });
  });

  describe("error cases", () => {
    it("rejects empty string", () => {
      const result = parseDelay("");
      expect(result.isErr()).toBe(true);
    });

    it("rejects non-numeric input", () => {
      const result = parseDelay("abc");
      expect(result.isErr()).toBe(true);
    });

    it("rejects zero delay", () => {
      const result = parseDelay("0s");
      expect(result.isErr()).toBe(true);
    });

    it("rejects negative values", () => {
      const result = parseDelay("-5m");
      expect(result.isErr()).toBe(true);
    });
  });
});
