import { Pool } from "pg";

declare global {
  var loopPostgresPool: Pool | undefined;
}

export function getPostgresPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!globalThis.loopPostgresPool) {
    globalThis.loopPostgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }

  return globalThis.loopPostgresPool;
}
