import { Result, ok, err } from "neverthrow";

export interface NotifyConnector {
  name: string;
  send(message: string): Promise<Result<void, string>>;
}

export function createSlackConnector(webhookUrl?: string): NotifyConnector {
  return {
    name: "slack",
    async send(message: string): Promise<Result<void, string>> {
      const url = webhookUrl ?? process.env.SKEDULER_SLACK_WEBHOOK_URL ?? process.env.SLACK_WEBHOOK_URL;
      if (!url) return err("SKEDULER_SLACK_WEBHOOK_URL (or SLACK_WEBHOOK_URL) not set");
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message }),
        });
        return res.ok ? ok(undefined) : err(`Slack webhook returned ${res.status}`);
      } catch (e) {
        return err(`Slack notify failed: ${(e as Error).message}`);
      }
    },
  };
}

export function createDiscordConnector(webhookUrl?: string): NotifyConnector {
  return {
    name: "discord",
    async send(message: string): Promise<Result<void, string>> {
      const url = webhookUrl ?? process.env.SKEDULER_DISCORD_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL;
      if (!url) return err("SKEDULER_DISCORD_WEBHOOK_URL (or DISCORD_WEBHOOK_URL) not set");
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message }),
        });
        return res.ok ? ok(undefined) : err(`Discord webhook returned ${res.status}`);
      } catch (e) {
        return err(`Discord notify failed: ${(e as Error).message}`);
      }
    },
  };
}

const CONNECTORS: Record<string, () => NotifyConnector> = {
  slack: createSlackConnector,
  discord: createDiscordConnector,
};

export function getConnector(name: string): Result<NotifyConnector, string> {
  const factory = CONNECTORS[name];
  if (!factory) {
    const known = Object.keys(CONNECTORS).join(", ");
    return err(`Unknown notify connector "${name}". Available: ${known}`);
  }
  return ok(factory());
}
