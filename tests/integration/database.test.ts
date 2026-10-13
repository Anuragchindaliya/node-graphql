import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, closeDatabaseConnection } from "../../src/infrastructure/database/knex.js";
import {
  OrganizationModel,
  UserModel,
  RoleModel,
  CourseModel,
  AuditLogModel,
} from "../../src/infrastructure/database/models/index.js";
import {
  OrganizationRepository,
  UserRepository,
  CourseRepository,
} from "../../src/infrastructure/repositories/index.js";
import { executeCreateUserTransaction } from "../../src/core/transactions/user-registration.transaction.js";

describe("Phase 1: Database Architecture & Data Layer Integration", () => {
  const orgRepo = new OrganizationRepository();
  const userRepo = new UserRepository();
  const courseRepo = new CourseRepository();

  let acmeOrg: OrganizationModel;
  let globexOrg: OrganizationModel;

  beforeAll(async () => {
    // Fetch seeded organizations
    const acme = await orgRepo.findBySlug("acme-corp");
    const globex = await orgRepo.findBySlug("globex-industries");
    if (!acme || !globex) {
      throw new Error("Seeded organizations missing. Please run `npm run seed:run`.");
    }
    acmeOrg = acme;
    globexOrg = globex;
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  describe("1. Organizations & Basic CRUD", () => {
    it("should retrieve organization by slug", async () => {
      const org = await orgRepo.findBySlug("acme-corp");
      expect(org).not.toBeNull();
      expect(org?.name).toBe("Acme Corporation");
      expect(org?.status).toBe("ACTIVE");
    });
  });

  describe("2. Tenant Isolation Verification", () => {
    it("should strictly isolate users between tenants", async () => {
      // Find users for Acme
      const acmeUsers = await userRepo.findMany(String(acmeOrg.id));
      expect(acmeUsers.length).toBeGreaterThanOrEqual(1);

      // Find users for Globex
      const globexUsers = await userRepo.findMany(String(globexOrg.id));
      expect(globexUsers.length).toBeGreaterThanOrEqual(1);

      // Acme users must not appear in Globex results
      const acmeEmails = new Set(acmeUsers.map((u) => u.email));
      for (const globexUser of globexUsers) {
        expect(acmeEmails.has(globexUser.email)).toBe(false);
      }

      // Querying an Acme user using Globex's tenant_id must return null
      const firstAcmeUser = acmeUsers[0]!;
      const leakedUser = await userRepo.findByTenantId(String(globexOrg.id), String(firstAcmeUser.id));
      expect(leakedUser).toBeNull();
    });

    it("should strictly isolate courses between tenants", async () => {
      const acmeCourses = await courseRepo.findMany(String(acmeOrg.id));
      const globexCourses = await courseRepo.findMany(String(globexOrg.id));

      expect(acmeCourses.length).toBeGreaterThan(0);
      expect(globexCourses.length).toBeGreaterThan(0);

      const firstAcmeCourse = acmeCourses[0]!;
      const crossTenantFetch = await courseRepo.findByTenantId(
        String(globexOrg.id),
        String(firstAcmeCourse.id)
      );
      expect(crossTenantFetch).toBeNull();
    });
  });

  describe("3. Objection.js Graph Loading & Relationships", () => {
    it("should load user with roles and permissions through graph fetching", async () => {
      const acmeAdmin = await userRepo.findByEmail(String(acmeOrg.id), "admin@acme.com");
      expect(acmeAdmin).not.toBeNull();

      const userWithGraph = await userRepo.findWithRoles(String(acmeOrg.id), String(acmeAdmin!.id));
      expect(userWithGraph).not.toBeNull();
      expect(userWithGraph?.roles).toBeDefined();
      expect(userWithGraph?.roles?.length).toBeGreaterThan(0);

      const adminRole = userWithGraph?.roles?.find((r) => r.slug === "admin");
      expect(adminRole).toBeDefined();
      expect(adminRole?.permissions).toBeDefined();
      expect(adminRole?.permissions?.length).toBeGreaterThan(0);
    });
  });

  describe("4. ACID Transactions & Atomic Operations", () => {
    it("should commit user, role assignment, and audit log atomically", async () => {
      const testEmail = `tx-user-${Date.now()}@acme.com`;

      const result = await executeCreateUserTransaction({
        tenantId: String(acmeOrg.id),
        email: testEmail,
        passwordHash: "test_hash_123",
        firstName: "Tx",
        lastName: "Tester",
        roleSlug: "learner",
      });

      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.assignedRole.slug).toBe("learner");
      expect(result.auditLog.id).toBeDefined();
      expect(result.auditLog.action).toBe("USER_REGISTERED_AND_ROLE_ASSIGNED");

      // Verify audit log exists in MariaDB
      const auditEntry = await AuditLogModel.query()
        .where("tenant_id", acmeOrg.id)
        .where("entity_id", String(result.user.id))
        .first();

      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.action).toBe("USER_REGISTERED_AND_ROLE_ASSIGNED");
    });

    it("should rollback completely when a step in the transaction fails", async () => {
      const duplicateEmail = "admin@acme.com"; // Already exists in Acme

      await expect(
        executeCreateUserTransaction({
          tenantId: String(acmeOrg.id),
          email: duplicateEmail,
          passwordHash: "hash",
          firstName: "Fail",
          lastName: "Rollback",
          roleSlug: "learner",
        })
      ).rejects.toThrow();

      // Ensure no orphan audit log was written
      const audit = await AuditLogModel.query()
        .where("tenant_id", acmeOrg.id)
        .where("new_state", "like", `%"email":"${duplicateEmail}"%`)
        .where("action", "USER_REGISTERED_AND_ROLE_ASSIGNED")
        .first();

      expect(audit).toBeUndefined();
    });
  });

  describe("5. Soft Deletes", () => {
    it("should soft delete a user and hide them from default queries", async () => {
      // Create user to soft delete
      const tempUser = await userRepo.create({
        tenant_id: String(acmeOrg.id),
        email: `soft-delete-${Date.now()}@acme.com`,
        password_hash: "hash_xyz",
        first_name: "ToDelete",
        last_name: "User",
        status: "ACTIVE",
      });

      const userBefore = await userRepo.findByTenantId(String(acmeOrg.id), String(tempUser.id));
      expect(userBefore).not.toBeNull();

      // Perform soft delete
      const deleted = await userRepo.softDelete(String(acmeOrg.id), String(tempUser.id));
      expect(deleted).toBe(true);

      // Verify user is excluded from normal queries
      const userAfter = await userRepo.findByTenantId(String(acmeOrg.id), String(tempUser.id));
      expect(userAfter).toBeNull();

      // Verify record still exists in the underlying SQL table with deleted_at timestamp
      const rawUser = await UserModel.query().findById(tempUser.id);
      expect(rawUser).not.toBeNull();
      expect(rawUser?.deleted_at).not.toBeNull();
      expect(rawUser?.isDeleted).toBe(true);
    });
  });

  describe("6. Pagination (Offset vs Cursor)", () => {
    it("should perform offset-based pagination with total count", async () => {
      const page = await userRepo.paginateOffset(String(acmeOrg.id), {}, { page: 1, pageSize: 2 });
      expect(page.items.length).toBeLessThanOrEqual(2);
      expect(page.limit).toBe(2);
      expect(page.offset).toBe(0);
      expect(page.total).toBeGreaterThanOrEqual(1);
    });

    it("should perform cursor-based pagination with base64 opaque cursors", async () => {
      const cursorPage = await userRepo.paginateCursor(String(acmeOrg.id), { first: 2 });
      expect(cursorPage.edges.length).toBeGreaterThan(0);
      expect(cursorPage.edges[0]?.cursor).toBeDefined();

      const decodedId = Buffer.from(cursorPage.edges[0]!.cursor, "base64").toString("ascii");
      expect(Number(decodedId)).toBeGreaterThan(0);
    });
  });

  describe("7. SQL EXPLAIN & Composite Index Optimization", () => {
    it("should utilize the unique composite index (tenant_id, email) with ref or const lookup", async () => {
      const [explain] = await db.raw(
        "EXPLAIN SELECT * FROM users WHERE tenant_id = ? AND email = ?",
        [acmeOrg.id, "admin@acme.com"]
      );

      const row = explain[0] as {
        table: string;
        type: string;
        possible_keys: string;
        key: string;
        ref: string;
      };

      expect(row.key).toBe("uq_users_tenant_email");
      expect(["const", "eq_ref", "ref"]).toContain(row.type);
    });

    it("should utilize composite index (tenant_id, status, deleted_at) on courses", async () => {
      const [explain] = await db.raw(
        "EXPLAIN SELECT id, title FROM courses WHERE tenant_id = ? AND status = ? AND deleted_at IS NULL",
        [acmeOrg.id, "PUBLISHED"]
      );

      const row = explain[0] as {
        table: string;
        possible_keys: string;
        key: string;
      };

      expect(row.possible_keys).toContain("idx_courses_tenant_status");
    });
  });
});
