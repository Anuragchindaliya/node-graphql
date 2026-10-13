import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp, AppServer } from "../../src/app.js";

describe("Health & Apollo Server Integration", () => {
  let server: AppServer;

  beforeAll(async () => {
    server = await createApp();
  });

  afterAll(async () => {
    await server.apolloServer.stop();
  });

  it("should execute GraphQL health query via ApolloServer", async () => {
    const response = await server.apolloServer.executeOperation({
      query: `#graphql
        query GetHealth {
          health {
            status
            version
            uptime
          }
        }
      `,
    });

    expect(response.body.kind).toBe("single");
    if (response.body.kind === "single") {
      expect(response.body.singleResult.errors).toBeUndefined();
      const data = response.body.singleResult.data as {
        health: { status: string; version: string; uptime: number };
      };
      expect(data.health.status).toBe("UP");
      expect(data.health.version).toBe("1.0.0");
      expect(data.health.uptime).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return GraphQL syntax error when query is malformed", async () => {
    const response = await server.apolloServer.executeOperation({
      query: `query { health { nonExistentField } }`,
    });

    expect(response.body.kind).toBe("single");
    if (response.body.kind === "single") {
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.length).toBeGreaterThan(0);
    }
  });
});
