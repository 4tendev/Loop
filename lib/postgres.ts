import { Pool } from "pg";

declare global {
  var loopPostgresPool: Pool | undefined;
}

function getPostgresConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: 10,
    };
  }

  const requiredEnvKeys = [
    "PGDATABASE",
    "PGHOST",
    "PGPASSWORD",
    "PGPORT",
    "PGUSER",
  ] as const;
  const missingEnvKeys = requiredEnvKeys.filter((key) => !process.env[key]);

  if (missingEnvKeys.length > 0) {
    throw new Error(
      `Postgres connection is missing: ${missingEnvKeys.join(", ")}`,
    );
  }

  return {
    database: process.env.PGDATABASE,
    host: process.env.PGHOST,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    max: 10,
  };
}

export function getPostgresPool() {
  if (!globalThis.loopPostgresPool) {
    globalThis.loopPostgresPool = new Pool(getPostgresConfig());
  }

  return globalThis.loopPostgresPool;
}
