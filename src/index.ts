import { env } from "./config/env.js";
import { logger } from "./core/logger/logger.js";
import { createApp } from "./app.js";
import { closeDatabaseConnection } from "./infrastructure/database/knex.js";
import { closeRedisConnection } from "./infrastructure/redis/redis.js";

async function main(): Promise<void> {
  const { httpServer, apolloServer } = await createApp();

  httpServer.listen(env.PORT, env.HOST, () => {
    logger.info(
      {
        host: env.HOST,
        port: env.PORT,
        graphqlEndpoint: `http://${env.HOST}:${env.PORT}/graphql`,
        healthCheck: `http://${env.HOST}:${env.PORT}/healthz`,
        readyCheck: `http://${env.HOST}:${env.PORT}/ready`,
      },
      "🚀 Enterprise LMS GraphQL Server running"
    );
  });

  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.warn({ signal }, "Initiating graceful shutdown...");

    // Set a hard timeout to prevent hanging in production
    const shutdownTimeout = setTimeout(() => {
      logger.error("Forced shutdown timeout reached. Terminating process.");
      process.exit(1);
    }, 10000);
    shutdownTimeout.unref();

    try {
      logger.info("Stopping Apollo Server and draining HTTP connections...");
      await apolloServer.stop();

      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      logger.info("HTTP server stopped");

      logger.info("Closing database connection pool...");
      await closeDatabaseConnection();

      logger.info("Closing Redis connection...");
      await closeRedisConnection();

      logger.info("Graceful shutdown completed clean.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during graceful shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "Uncaught Exception detected");
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled Promise Rejection detected");
    gracefulShutdown("unhandledRejection");
  });
}

main().catch((error) => {
  logger.fatal({ error }, "Fatal error during server startup");
  process.exit(1);
});
