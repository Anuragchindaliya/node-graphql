import type { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "lms_user",
      password: process.env.DB_PASSWORD || "lms_password_123",
      database: process.env.DB_NAME || "enterprise_lms",
      charset: "utf8mb4",
    },
    pool: {
      min: Number(process.env.DB_POOL_MIN) || 2,
      max: Number(process.env.DB_POOL_MAX) || 10,
    },
    migrations: {
      directory: "./src/infrastructure/database/migrations",
      extension: "ts",
      loadExtensions: [".ts", ".js"],
    },
    seeds: {
      directory: "./src/infrastructure/database/seeds",
      extension: "ts",
      loadExtensions: [".ts", ".js"],
    },
  },
  test: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "lms_user",
      password: process.env.DB_PASSWORD || "lms_password_123",
      database: process.env.DB_NAME || "enterprise_lms",
      charset: "utf8mb4",
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: "./src/infrastructure/database/migrations",
      extension: "ts",
      loadExtensions: [".ts", ".js"],
    },
    seeds: {
      directory: "./src/infrastructure/database/seeds",
      extension: "ts",
      loadExtensions: [".ts", ".js"],
    },
  },
  production: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: "utf8mb4",
    },
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: "./dist/infrastructure/database/migrations",
      extension: "js",
    },
  },
};

export default config;
