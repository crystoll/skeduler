import { Result, ok, err } from "neverthrow";

export interface DelayResult {
  seconds: number;
  input: string;
}

const UNIT_SECONDS: Record<string, number> = {
  s: 1, sec: 1, second: 1, seconds: 1,
  m: 60, min: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hour: 3600, hours: 3600,
  d: 86400, day: 86400, days: 86400,
};

const TOKEN_RE = /(\d+)\s*([a-z]+)/gi;

export function parseDelay(input: string): Result<DelayResult, string> {
  const trimmed = input.trim();
  if (!trimmed) return err("Empty delay string");

  const matches = [...trimmed.matchAll(TOKEN_RE)];
  if (matches.length === 0) return err(`Invalid delay format: "${input}"`);

  const consumed = matches.map(m => m[0]).join("").replace(/\s/g, "");
  const stripped = trimmed.replace(/\s/g, "");
  if (consumed !== stripped) return err(`Invalid delay format: "${input}"`);

  let totalSeconds = 0;
  for (const [, numStr, unit] of matches) {
    const multiplier = UNIT_SECONDS[unit.toLowerCase()];
    if (multiplier === undefined) return err(`Unknown unit: "${unit}"`);
    totalSeconds += parseInt(numStr, 10) * multiplier;
  }

  if (totalSeconds <= 0) return err("Delay must be greater than zero");

  return ok({ seconds: totalSeconds, input: trimmed });
}
