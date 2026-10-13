import knex, { Knex } from "knex";
import { Model } from "objection";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger/logger.js";

export const knexConfig: Knex.Config = {
  client: "mysql2",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: "utf8mb4",
    timezone: "Z",
  },
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    afterCreate: (conn: any, done: (err: Error | null, connection: any) => void) => {
      // Set session sql_mode to strict
      conn.query(
        "SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'",
        (err: Error | null) => {
          if (err) {
            logger.error({ err }, "Failed to set sql_mode on connection creation");
            done(err, conn);
          } else {
            done(null, conn);
          }
        }
      );
    },
  },
};

export const db: Knex = knex(knexConfig);

// Bind Objection.js to our Knex instance
Model.knex(db);

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw("SELECT 1 AS healthcheck");
    return true;
  } catch (error) {
    logger.error({ error }, "Database health check failed");
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    await db.destroy();
    logger.info("Database connection pool closed successfully");
  } catch (error) {
    logger.error({ error }, "Error closing database connection pool");
  }
}
