import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

import { getPostgresConfig } from "../server/avalon/config.mjs";

const { Pool } = pg;
const migrationsDirectory = resolve(process.cwd(), "db", "migrations");
const pool = new Pool(getPostgresConfig());

function checksum(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function connectWithRetry() {
  const attempts = Number(process.env.DB_MIGRATION_CONNECT_ATTEMPTS ?? 30);
  const delayMs = Number(process.env.DB_MIGRATION_CONNECT_DELAY_MS ?? 1000);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await pool.connect();
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      console.log(
        `Postgres is not ready for migrations yet (${attempt}/${attempts}); retrying...`,
      );
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
    }
  }

  throw new Error("Failed to connect to Postgres for migrations");
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id bigserial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function migrate() {
  const client = await connectWithRetry();

  try {
    await ensureMigrationTable(client);
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      "loop_schema_migrations",
    ]);

    const existingResult = await client.query(
      "SELECT filename, checksum FROM schema_migrations",
    );
    const existingMigrations = new Map(
      existingResult.rows.map((row) => [row.filename, row.checksum]),
    );

    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const fileName of migrationFiles) {
      const sql = await readFile(resolve(migrationsDirectory, fileName), "utf8");
      const fileChecksum = checksum(sql);
      const existingChecksum = existingMigrations.get(fileName);

      if (existingChecksum) {
        if (existingChecksum !== fileChecksum) {
          throw new Error(
            `Migration ${fileName} was already applied with a different checksum`,
          );
        }

        continue;
      }

      console.log(`Applying migration ${fileName}`);
      await client.query("BEGIN");

      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [fileName, fileChecksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Database migrations are up to date");
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
      "loop_schema_migrations",
    ]).catch(() => {});
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Database migration failed");
  console.error(error);
  process.exit(1);
});
