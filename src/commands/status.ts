import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { Result, ok, err } from "neverthrow";
import { createJobStore } from "../state/jobStore.js";
import { getJobsFilePath } from "../state/paths.js";
import { formatJobVerbose } from "./list.js";
import { stripAnsi } from "../utils.js";

export interface StatusOptions {
  id: string;
  json: boolean;
  jobsFile?: string;
}

async function readLogTail(logFile: string, lines = 20): Promise<string | undefined> {
  try {
    const content = await readFile(logFile, "utf-8");
    const allLines = content.split("\n").filter((l) => l.trim() !== "");
    const tail = allLines.slice(-lines);
    return tail.length > 0 ? tail.join("\n") : undefined;
  } catch {
    return undefined;
  }
}

export async function runStatus(opts: StatusOptions): Promise<Result<string, string>> {
  const jobsFile = opts.jobsFile ?? getJobsFilePath(
    process.env as Record<string, string | undefined>,
    process.platform,
    homedir(),
  );
  const store = createJobStore(jobsFile);

  const result = await store.getJob(opts.id);
  if (result.isErr()) return err(result.error);
  const job = result.value;
  if (!job) return err(`Job ${opts.id} not found.`);

  if (opts.json) return ok(JSON.stringify(job, null, 2));

  const parts = [formatJobVerbose(job)];
  const logTail = await readLogTail(job.logFile);
  if (logTail) {
    parts.push("", "  Log output (last 20 lines):", stripAnsi(logTail));
  }

  return ok(parts.join("\n"));
}
