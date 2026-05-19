import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Result, ok, err } from "neverthrow";
import { JobsFileSchema, type JobRecord, type JobsFile } from "./schema.js";

const emptyFile = (): JobsFile => ({ version: 1, jobs: [] });

async function backupAndReset(filePath: string): Promise<JobsFile> {
  try {
    await rename(filePath, filePath + ".corrupt");
  } catch { /* best effort */ }
  return emptyFile();
}

async function readJobsFile(filePath: string): Promise<Result<JobsFile, string>> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return ok(emptyFile());
    return err(`Failed to read jobs file: ${(e as Error).message}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return ok(await backupAndReset(filePath));
  }

  const parsed = JobsFileSchema.safeParse(json);
  if (!parsed.success) {
    return ok(await backupAndReset(filePath));
  }
  return ok(parsed.data);
}

async function writeJobsFile(filePath: string, data: JobsFile): Promise<Result<void, string>> {
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return ok(undefined);
  } catch (e: unknown) {
    return err(`Failed to write jobs file: ${(e as Error).message}`);
  }
}

export function createJobStore(filePath: string) {
  return {
    async createJob(job: JobRecord): Promise<Result<void, string>> {
      const file = await readJobsFile(filePath);
      if (file.isErr()) return err(file.error);
      const data = file.value;
      if (data.jobs.some((j) => j.id === job.id)) {
        return err(`Job ${job.id} already exists`);
      }
      data.jobs.push(job);
      return writeJobsFile(filePath, data);
    },

    async getJob(id: string): Promise<Result<JobRecord | undefined, string>> {
      const file = await readJobsFile(filePath);
      if (file.isErr()) return err(file.error);
      return ok(file.value.jobs.find((j) => j.id === id));
    },

    async updateJob(id: string, fn: (job: JobRecord) => JobRecord): Promise<Result<void, string>> {
      const file = await readJobsFile(filePath);
      if (file.isErr()) return err(file.error);
      const data = file.value;
      const idx = data.jobs.findIndex((j) => j.id === id);
      if (idx === -1) return err(`Job ${id} not found`);
      data.jobs[idx] = fn(data.jobs[idx]);
      return writeJobsFile(filePath, data);
    },

    async listJobs(): Promise<Result<JobRecord[], string>> {
      const file = await readJobsFile(filePath);
      if (file.isErr()) return err(file.error);
      return ok(file.value.jobs);
    },
  };
}
