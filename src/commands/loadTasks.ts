import { readFile } from "node:fs/promises";
import { Result, ok, err } from "neverthrow";

export async function loadTasksFromFile(path: string): Promise<Result<string[], string>> {
  try {
    const content = await readFile(path, "utf-8");
    const tasks = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
    return ok(tasks);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return err(`File not found: ${path}`);
    }
    return err(`Failed to read file: ${(e as Error).message}`);
  }
}

export interface CollectTasksInput {
  positional: string[];
  taskFlags: string[];
  filePath?: string;
}

export async function collectTasks(input: CollectTasksInput): Promise<Result<string[], string>> {
  const tasks = [...input.positional, ...input.taskFlags];
  if (input.filePath) {
    const fileResult = await loadTasksFromFile(input.filePath);
    if (fileResult.isErr()) return err(fileResult.error);
    tasks.push(...fileResult.value);
  }
  return ok(tasks);
}
