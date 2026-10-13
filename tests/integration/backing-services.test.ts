import { describe, it, expect, afterAll } from "vitest";
import {
  checkDatabaseConnection,
  closeDatabaseConnection,
} from "../../src/infrastructure/database/knex.js";
import {
  checkRedisConnection,
  closeRedisConnection,
} from "../../src/infrastructure/redis/redis.js";

describe("Backing Services Connectivity", () => {
  afterAll(async () => {
    await closeDatabaseConnection();
    await closeRedisConnection();
  });

  it("should successfully connect to MariaDB and run healthcheck", async () => {
    const isDbConnected = await checkDatabaseConnection();
    expect(isDbConnected).toBe(true);
  });

  it("should successfully connect to Redis and ping", async () => {
    const isRedisConnected = await checkRedisConnection();
    expect(isRedisConnected).toBe(true);
  });
});
