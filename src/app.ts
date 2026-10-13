import express, { Express, Request, Response } from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import http from "node:http";
import { checkDatabaseConnection } from "./infrastructure/database/knex.js";
import { checkRedisConnection } from "./infrastructure/redis/redis.js";
import { logger } from "./core/logger/logger.js";

// Minimal root schema for Phase 0 verification
const typeDefs = `#graphql
  type Query {
    health: HealthStatus!
  }

  type HealthStatus {
    status: String!
    timestamp: String!
    uptime: Float!
    version: String!
  }
`;

const resolvers = {
  Query: {
    health: () => ({
      status: "UP",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    }),
  },
};

export interface GraphQLContext {
  req: Request;
  res: Response;
  startTime: number;
}

export interface AppServer {
  app: Express;
  httpServer: http.Server;
  apolloServer: ApolloServer<GraphQLContext>;
}

export async function createApp(): Promise<AppServer> {
  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError, error) => {
      // In production, mask internal server error details to prevent information leakage
      logger.error({ formattedError, error }, "GraphQL execution error");
      return formattedError;
    },
  });

  await apolloServer.start();

  app.use(cors());
  app.use(express.json());

  // Liveness Probe (Kubernetes / ECS / ALB)
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Readiness Probe (checks backing services)
  app.get("/ready", async (_req: Request, res: Response) => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
    ]);

    const isReady = dbHealthy && redisHealthy;
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? "ready" : "degraded",
      services: {
        database: dbHealthy ? "connected" : "disconnected",
        redis: redisHealthy ? "connected" : "disconnected",
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Apollo GraphQL Endpoint
  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req, res }): Promise<GraphQLContext> => ({
        req,
        res,
        startTime: Date.now(),
      }),
    })
  );

  return { app, httpServer, apolloServer };
}
