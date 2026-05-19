import { Result, ok, err } from "neverthrow";
import { parseDelay } from "./parseDelay.js";

const NAMED_PATTERNS: Record<string, (from: Date) => Date> = {
  daily: (from) => new Date(from.getTime() + 86400_000),
  hourly: (from) => new Date(from.getTime() + 3600_000),
  weekdays: (from) => {
    const day = from.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const daysToAdd = day === 5 ? 3 : day === 6 ? 2 : 1;
    return new Date(from.getTime() + daysToAdd * 86400_000);
  },
};

export function nextOccurrence(pattern: string, from: Date): Result<Date, string> {
  const named = NAMED_PATTERNS[pattern];
  if (named) return ok(named(from));

  const parsed = parseDelay(pattern);
  if (parsed.isOk()) {
    return ok(new Date(from.getTime() + parsed.value.seconds * 1000));
  }

  return err(`Invalid repeat pattern: "${pattern}". Use daily, hourly, weekdays, or a duration like 12h.`);
}
