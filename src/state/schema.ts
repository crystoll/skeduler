import { z } from "zod";

export const JobStatusSchema = z.enum(["pending", "dispatched", "canceled", "failed"]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobRecordSchema = z.object({
  id: z.string(),
  status: JobStatusSchema,
  backend: z.string(),
  createdAt: z.string(),
  dueAt: z.string(),
  delaySeconds: z.number().int().nonnegative(),
  timeoutSeconds: z.number().int().positive().optional(),
  repeat: z.string().optional(),
  notify: z.array(z.string()).optional(),
  cwd: z.string(),
  tasks: z.array(z.string()),
  backendArgs: z.array(z.string()).optional(),
  schedulerPid: z.number().int().optional(),
  logFile: z.string(),
  dispatchedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export type JobRecord = z.infer<typeof JobRecordSchema>;

export const JobsFileSchema = z.object({
  version: z.literal(1),
  jobs: z.array(JobRecordSchema),
});

export type JobsFile = z.infer<typeof JobsFileSchema>;
