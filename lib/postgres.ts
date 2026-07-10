import { Pool } from "pg";

declare global {
  var loopPostgresPool: Pool | undefined;
}

function getPostgresConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  return {
    connectionString: process.env.DATABASE_URL,
    max: 10,
  };
}

export function getPostgresPool() {
  if (!globalThis.loopPostgresPool) {
    globalThis.loopPostgresPool = new Pool(getPostgresConfig());
  }

  return globalThis.loopPostgresPool;
}
