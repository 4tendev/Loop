import pg from "pg";
import { createClient } from "redis";

import { getPostgresConfig } from "./config.mjs";

const { Pool } = pg;

export const pool = new Pool(getPostgresConfig());

let redisClient;
let redisConnectPromise;

export async function getRedisClient() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      RESP: 2,
    });

    redisClient.on("error", (error) => {
      console.error("Redis client error", error);
    });
  }

  if (!redisClient.isOpen) {
    redisConnectPromise ??= redisClient.connect();
    await redisConnectPromise;
    redisConnectPromise = undefined;
  }

  return redisClient;
}

export async function closeDataStores() {
  await Promise.allSettled([pool.end(), redisClient?.quit()]);
}
