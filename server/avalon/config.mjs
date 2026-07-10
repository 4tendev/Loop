import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const WS_PATH = "/ws/avalon/games";

export function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

export function getServerConfig() {
  return {
    port: Number(process.env.AVALON_WS_PORT ?? process.env.PORT ?? 3001),
    host: process.env.AVALON_WS_HOST ?? "0.0.0.0",
    broadcastIntervalMs: Number(
      process.env.AVALON_WS_BROADCAST_INTERVAL_MS ?? 5000,
    ),
    wsPath: WS_PATH,
  };
}

export function getPostgresConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  return {
    connectionString: process.env.DATABASE_URL,
    max: 10,
  };
}

loadEnvFile(".env.local");
