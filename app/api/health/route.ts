import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import { getRedisClient } from "@/lib/redis";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function checkPostgres() {
  try {
    const pool = getPostgresPool();
    const result = await pool.query<{ now: Date }>("select now() as now");
    return {
      ok: true,
      timestamp: result.rows[0]?.now?.toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error),
    };
  }
}

async function checkRedis() {
  try {
    const redis = await getRedisClient();
    return {
      ok: true,
      pong: await redis.ping(),
    };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error),
    };
  }
}

export async function GET() {
  const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);
  const ok = postgres.ok && redis.ok;

  return NextResponse.json(
    {
      ok,
      services: {
        postgres,
        redis,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
