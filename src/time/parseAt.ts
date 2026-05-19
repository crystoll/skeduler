import { Result, ok, err } from "neverthrow";

export interface AtResult {
  dueAt: Date;
  input: string;
}

const TIME_24_RE = /^(\d{1,2}):(\d{2})$/;
const TIME_12_RE = /^(\d{1,2}):(\d{2})(am|pm)$/i;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/;

function parseTime24(input: string): { hours: number; minutes: number } | null {
  const m = input.match(TIME_24_RE);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function parseTime12(input: string): { hours: number; minutes: number } | null {
  const m = input.match(TIME_12_RE);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const period = m[3].toLowerCase();
  if (hours < 1 || hours > 12 || minutes > 59) return null;
  if (period === "am") hours = hours === 12 ? 0 : hours;
  else hours = hours === 12 ? 12 : hours + 12;
  return { hours, minutes };
}

function parseDatetime(input: string): Date | null {
  const m = input.match(DATETIME_RE);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(
    parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10),
    parseInt(h, 10), parseInt(mi, 10), 0,
  );
  if (isNaN(date.getTime())) return null;
  return date;
}

function nextOccurrence(hours: number, minutes: number, now: Date): Date {
  const today = new Date(now);
  today.setHours(hours, minutes, 0, 0);
  if (today.getTime() <= now.getTime()) {
    today.setDate(today.getDate() + 1);
  }
  return today;
}

export function parseAt(input: string, now?: Date): Result<AtResult, string> {
  const trimmed = input.trim();
  if (!trimmed) return err("Empty time string");

  const reference = now ?? new Date();

  // Try explicit datetime first
  const dt = parseDatetime(trimmed);
  if (dt) {
    if (dt.getTime() <= reference.getTime()) {
      return err("Time must be in the future");
    }
    return ok({ dueAt: dt, input: trimmed });
  }

  // Try 12-hour format
  const t12 = parseTime12(trimmed);
  if (t12) {
    return ok({ dueAt: nextOccurrence(t12.hours, t12.minutes, reference), input: trimmed });
  }

  // Try 24-hour format
  const t24 = parseTime24(trimmed);
  if (t24) {
    return ok({ dueAt: nextOccurrence(t24.hours, t24.minutes, reference), input: trimmed });
  }

  return err(`Invalid time format: "${input}"`);
}
