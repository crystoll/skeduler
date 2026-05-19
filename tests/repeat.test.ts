import { describe, it, expect } from "vitest";
import { nextOccurrence } from "../src/time/repeat.js";

describe("nextOccurrence", () => {
  const now = new Date("2026-05-19T06:00:00.000Z"); // Monday 6am UTC

  it("handles 'daily' — same time tomorrow", () => {
    const result = nextOccurrence("daily", now);
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(next.toISOString()).toBe("2026-05-20T06:00:00.000Z");
  });

  it("handles 'hourly' — one hour later", () => {
    const result = nextOccurrence("hourly", now);
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(next.toISOString()).toBe("2026-05-19T07:00:00.000Z");
  });

  it("handles 'weekdays' — skips to Monday if Friday", () => {
    const friday = new Date("2026-05-22T06:00:00.000Z"); // Friday
    const result = nextOccurrence("weekdays", friday);
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(next.toISOString()).toBe("2026-05-25T06:00:00.000Z"); // Monday
  });

  it("handles 'weekdays' — next day on Mon-Thu", () => {
    const result = nextOccurrence("weekdays", now); // Monday
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(next.toISOString()).toBe("2026-05-20T06:00:00.000Z"); // Tuesday
  });

  it("handles duration string like '12h'", () => {
    const result = nextOccurrence("12h", now);
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(next.toISOString()).toBe("2026-05-19T18:00:00.000Z");
  });

  it("handles duration string like '2d'", () => {
    const result = nextOccurrence("2d", now);
    expect(result.isOk()).toBe(true);
    const next = result._unsafeUnwrap();
    expect(next.toISOString()).toBe("2026-05-21T06:00:00.000Z");
  });

  it("rejects invalid repeat pattern", () => {
    const result = nextOccurrence("garbage", now);
    expect(result.isErr()).toBe(true);
  });
});
