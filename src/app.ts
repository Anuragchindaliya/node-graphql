import express, { Express, Request, Response } from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import http from "node:http";
import { checkDatabaseConnection } from "./infrastructure/database/knex.js";
import { checkRedisConnection } from "./infrastructure/redis/redis.js";
import { logger } from "./core/logger/logger.js";
import { typeDefs } from "./graphql/schema/index.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { buildContext, type GraphQLContext } from "./graphql/context/context.js";

export type { GraphQLContext };

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
    introspection: true, // Enables schema introspection for Apollo Sandbox & tools
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Embed interactive Apollo Sandbox in development browser visits
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
    formatError: (formattedError, error) => {
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

  // Apollo GraphQL Endpoint with strongly typed context factory
  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req, res }): Promise<GraphQLContext> => buildContext({ req, res }),
    })
  );

  return { app, httpServer, apolloServer };
}
