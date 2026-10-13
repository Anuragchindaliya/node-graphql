import pino from "pino";
import { env } from "../../config/env.js";

const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "headers.authorization",
      "cookie",
      "headers.cookie",
      "secret",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    service: "enterprise-lms-graphql",
    env: env.NODE_ENV,
  },
});
