import { homedir } from "node:os";
import { Result, ok, err } from "neverthrow";
import { createJobStore } from "../state/jobStore.js";
import { getJobsFilePath } from "../state/paths.js";
import { terminateProcess } from "../scheduler/process.js";

export interface CancelOptions {
  id: string;
  json: boolean;
}

export async function runCancel(opts: CancelOptions): Promise<Result<string, string>> {
  const env = process.env as Record<string, string | undefined>;
  const jobsFile = getJobsFilePath(env, process.platform, homedir());
  const store = createJobStore(jobsFile);

  const jobResult = await store.getJob(opts.id);
  if (jobResult.isErr()) return err(jobResult.error);
  const job = jobResult.value;
  if (!job) return err(`Job ${opts.id} not found.`);
  if (job.status !== "pending") return err(`Job ${opts.id} is already ${job.status}.`);

  // Mark canceled before killing — race-safe
  const updateResult = await store.updateJob(opts.id, (j) => ({
    ...j,
    status: "canceled",
    completedAt: new Date().toISOString(),
  }));
  if (updateResult.isErr()) return err(updateResult.error);

  // Terminate worker process
  if (job.schedulerPid) {
    await terminateProcess(job.schedulerPid);
  }

  const output = opts.json
    ? JSON.stringify({ id: opts.id, status: "canceled" }, null, 2)
    : `[Success] Canceled job ${opts.id}.`;

  return ok(output);
}
