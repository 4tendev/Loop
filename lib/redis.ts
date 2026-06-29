import { createClient, type RedisClientType } from "redis";

type RedisClient = RedisClientType<{}, {}, {}, 3, {}>;

declare global {
  var loopRedisClient: RedisClient | undefined;
  var loopRedisConnectPromise: Promise<RedisClient> | undefined;
}

export async function getRedisClient() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  if (!globalThis.loopRedisClient) {
    const client = createClient({
      url: process.env.REDIS_URL,
    });

    client.on("error", (error) => {
      console.error("Redis client error", error);
    });

    globalThis.loopRedisClient = client;
  }

  const client = globalThis.loopRedisClient;

  if (!client) {
    throw new Error("Redis client was not initialized");
  }

  if (!client.isOpen) {
    globalThis.loopRedisConnectPromise ??= client.connect();
    await globalThis.loopRedisConnectPromise;
    globalThis.loopRedisConnectPromise = undefined;
  }

  return client;
}
