// eslint-disable-next-line no-control-regex
const ANSI_RE = /[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, "");
}

export function formatTimeRemaining(dueAt: string): string {
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms <= 0) return "already fired";
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "fires in less than a minute";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  return `fires in ${parts.join(", ")}`;
}
