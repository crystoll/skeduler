const MAX_OUTPUT_LENGTH = 500;

export interface NotifyMessageInput {
  jobId: string;
  status: "dispatched" | "failed";
  backend: string;
  tasks: string[];
  repeat?: string;
  logTail?: string;
  error?: string;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "…";
}

export function formatNotifyMessage(input: NotifyMessageInput): string {
  const emoji = input.status === "dispatched" ? "✅" : "❌";
  const statusText = input.status === "dispatched" ? "completed" : "failed";
  const lines: string[] = [];

  lines.push(`${emoji} skeduler job ${statusText}: ${input.jobId}`);

  const meta = [`Backend: ${input.backend}`];
  if (input.repeat) meta.push(`Repeat: ${input.repeat}`);
  lines.push(meta.join(" | "));

  const taskList = input.tasks.length === 1
    ? `Task: ${input.tasks[0]}`
    : `Tasks:\n${input.tasks.map((t) => `• ${t}`).join("\n")}`;
  lines.push(taskList);

  if (input.error) {
    lines.push(`Error: ${input.error}`);
  } else if (input.logTail) {
    lines.push("", `Output:\n---\n${truncate(input.logTail, MAX_OUTPUT_LENGTH)}\n---`);
  }

  return lines.join("\n");
}
