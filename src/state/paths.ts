import { join } from "node:path";

const APP_NAME = "skeduler";

export function getStateDir(
  env: Record<string, string | undefined>,
  platform: string,
  homedir: string,
): string {
  if (env.SKEDULER_HOME) return env.SKEDULER_HOME;

  switch (platform) {
    case "darwin":
      return join(homedir, "Library", "Application Support", APP_NAME);
    case "win32": {
      const local = env.LOCALAPPDATA;
      return local ? join(local, APP_NAME) : join(homedir, `.${APP_NAME}`);
    }
    default: {
      const xdg = env.XDG_STATE_HOME;
      return join(xdg || join(homedir, ".local", "state"), APP_NAME);
    }
  }
}

export function getJobsFilePath(
  env: Record<string, string | undefined>,
  platform: string,
  homedir: string,
): string {
  return join(getStateDir(env, platform, homedir), "jobs.json");
}

export function getLogDir(
  env: Record<string, string | undefined>,
  platform: string,
  homedir: string,
): string {
  return join(getStateDir(env, platform, homedir), "logs");
}
