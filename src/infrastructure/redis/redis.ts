import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger/logger.js";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_PASSWORD ? "default" : undefined,
  password: env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 100, 3000);
    logger.warn({ times, delay }, "Redis connection retry scheduled");
    return delay;
  },
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

redis.on("error", (error) => {
  logger.error({ error }, "Redis client encountered an error");
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const ping = await redis.ping();
    return ping === "PONG";
  } catch (error) {
    logger.error({ error }, "Redis health check failed");
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    logger.info("Redis connection closed successfully");
  } catch (error) {
    logger.error({ error }, "Error closing Redis connection");
  }
}
