export interface BackendCommand {
  bin: string;
  args: string[];
}

export interface BackendAdapter {
  name: string;
  bin: string;
  buildCommand(task: string, extraArgs?: string[]): BackendCommand;
}
