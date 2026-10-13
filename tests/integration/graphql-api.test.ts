import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp, AppServer } from "../../src/app.js";
import { closeDatabaseConnection } from "../../src/infrastructure/database/knex.js";
import { OrganizationModel } from "../../src/infrastructure/database/models/index.js";

describe("Phase 2: GraphQL Schema, Apollo Server & Resolvers Integration", () => {
  let server: AppServer;
  let testOrgId: string;

  beforeAll(async () => {
    server = await createApp();
    const acme = await OrganizationModel.query().where("slug", "acme-corp").first();
    if (!acme) {
      throw new Error("Seed data missing. Run `npm run seed:run`.");
    }
    testOrgId = String(acme.id);
  });

  afterAll(async () => {
    await server.apolloServer.stop();
    await closeDatabaseConnection();
  });

  describe("1. Query.users", () => {
    it("should fetch list of users with id, name, and email", async () => {
      const response = await server.apolloServer.executeOperation({
        query: `#graphql
          query GetUsers {
            users {
              id
              organizationId
              name
              email
              createdAt
            }
          }
        `,
      });

      expect(response.body.kind).toBe("single");
      if (response.body.kind === "single") {
        expect(response.body.singleResult.errors).toBeUndefined();
        const data = response.body.singleResult.data as { users: any[] };
        expect(Array.isArray(data.users)).toBe(true);
        expect(data.users.length).toBeGreaterThan(0);
        expect(data.users[0]?.id).toBeDefined();
        expect(data.users[0]?.email).toBeDefined();
        expect(data.users[0]?.name).toBeDefined();
      }
    });

    it("should filter users by organizationId argument", async () => {
      const response = await server.apolloServer.executeOperation({
        query: `#graphql
          query GetUsersByOrg($orgId: ID!) {
            users(organizationId: $orgId) {
              id
              organizationId
              name
              email
            }
          }
        `,
        variables: { orgId: testOrgId },
      });

      expect(response.body.kind).toBe("single");
      if (response.body.kind === "single") {
        expect(response.body.singleResult.errors).toBeUndefined();
        const data = response.body.singleResult.data as { users: any[] };
        expect(data.users.length).toBeGreaterThan(0);
        for (const user of data.users) {
          expect(user.organizationId).toBe(testOrgId);
        }
      }
    });
  });

  describe("2. Query.user and Nested Field Resolution", () => {
    it("should fetch single user by ID with nested organization", async () => {
      // First get a user
      const usersRes = await server.apolloServer.executeOperation({
        query: `#graphql
          query { users { id } }
        `,
      });

      let targetUserId = "1";
      if (usersRes.body.kind === "single") {
        const users = (usersRes.body.singleResult.data as any)?.users;
        targetUserId = users[0].id;
      }

      const response = await server.apolloServer.executeOperation({
        query: `#graphql
          query GetUser($id: ID!) {
            user(id: $id) {
              id
              name
              email
              organization {
                id
                name
                slug
              }
            }
          }
        `,
        variables: { id: targetUserId },
      });

      expect(response.body.kind).toBe("single");
      if (response.body.kind === "single") {
        expect(response.body.singleResult.errors).toBeUndefined();
        const data = response.body.singleResult.data as { user: any };
        expect(data.user.id).toBe(targetUserId);
        expect(data.user.organization).toBeDefined();
        expect(data.user.organization.name).toBe("Acme Corporation");
        expect(data.user.organization.slug).toBe("acme-corp");
      }
    });

    it("should return NOT_FOUND error when querying non-existent user", async () => {
      const response = await server.apolloServer.executeOperation({
        query: `#graphql
          query {
            user(id: "999999") {
              id
              name
            }
          }
        `,
      });

      expect(response.body.kind).toBe("single");
      if (response.body.kind === "single") {
        expect(response.body.singleResult.errors).toBeDefined();
        const error = response.body.singleResult.errors![0];
        expect(error?.extensions?.code).toBe("NOT_FOUND");
        expect(error?.extensions?.httpStatus).toBe(404);
      }
    });
  });

  describe("3. Mutation.createUser", () => {
    it("should successfully create a new user via mutation", async () => {
      const uniqueEmail = `graphql-test-${Date.now()}@acme.com`;

      const response = await server.apolloServer.executeOperation({
        query: `#graphql
          mutation CreateNewUser($input: CreateUserInput!) {
            createUser(input: $input) {
              id
              organizationId
              name
              email
              organization {
                name
              }
            }
          }
        `,
        variables: {
          input: {
            organizationId: testOrgId,
            name: "Ada Lovelace",
            email: uniqueEmail,
          },
        },
      });

      expect(response.body.kind).toBe("single");
      if (response.body.kind === "single") {
        expect(response.body.singleResult.errors).toBeUndefined();
        const data = response.body.singleResult.data as { createUser: any };
        expect(data.createUser.id).toBeDefined();
        expect(data.createUser.email).toBe(uniqueEmail);
        expect(data.createUser.name).toBe("Ada Lovelace");
        expect(data.createUser.organization.name).toBe("Acme Corporation");
      }
    });

    it("should return CONFLICT error when creating user with duplicate email in tenant", async () => {
      const response = await server.apolloServer.executeOperation({
        query: `#graphql
          mutation CreateDuplicateUser($input: CreateUserInput!) {
            createUser(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            organizationId: testOrgId,
            name: "Alex Duplicate",
            email: "admin@acme.com", // Already seeded in Acme
          },
        },
      });

      expect(response.body.kind).toBe("single");
      if (response.body.kind === "single") {
        expect(response.body.singleResult.errors).toBeDefined();
        const error = response.body.singleResult.errors![0];
        expect(error?.extensions?.code).toBe("CONFLICT");
        expect(error?.extensions?.httpStatus).toBe(409);
      }
    });

    it("should return VALIDATION_ERROR when email format is invalid", async () => {
      const response = await server.apolloServer.executeOperation({
        query: `#graphql
          mutation CreateInvalidUser($input: CreateUserInput!) {
            createUser(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            organizationId: testOrgId,
            name: "Invalid Email User",
            email: "not-an-email",
          },
        },
      });

      expect(response.body.kind).toBe("single");
      if (response.body.kind === "single") {
        expect(response.body.singleResult.errors).toBeDefined();
        const error = response.body.singleResult.errors![0];
        expect(error?.extensions?.code).toBe("VALIDATION_ERROR");
        expect(error?.extensions?.httpStatus).toBe(400);
      }
    });
  });
});
