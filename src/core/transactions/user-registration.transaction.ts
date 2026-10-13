import { Model } from "objection";
import { db } from "../../infrastructure/database/knex.js";
import { UserModel, RoleModel, AuditLogModel } from "../../infrastructure/database/models/index.js";
import { logger } from "../logger/logger.js";
import { ConflictError, NotFoundError } from "../errors/app-error.js";

export interface CreateUserTransactionInput {
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleSlug: string;
  actorUserId?: string;
  ipAddress?: string;
}

export interface CreateUserTransactionResult {
  user: UserModel;
  assignedRole: RoleModel;
  auditLog: AuditLogModel;
}

/**
 * Executes an atomic transaction:
 * 1. Checks tenant & existing email (prevents duplicate within tenant)
 * 2. Inserts new User
 * 3. Finds Role and assigns to User via user_roles
 * 4. Writes an immutable Audit Log
 *
 * Guarantees ACID compliance:
 * - Atomicity: Either all 4 operations succeed, or none persist.
 * - Consistency: Foreign keys & tenant integrity are preserved.
 * - Isolation: Executes within a database transaction boundary.
 * - Durability: Changes committed to MariaDB redo log.
 */
export async function executeCreateUserTransaction(
  input: CreateUserTransactionInput
): Promise<CreateUserTransactionResult> {
  return await Model.transaction(db, async (trx) => {
    // 1. Check for email collision within this tenant
    const existing = await UserModel.query(trx)
      .where("tenant_id", input.tenantId)
      .where("email", input.email.toLowerCase().trim())
      .first();

    if (existing) {
      throw new ConflictError(`User with email '${input.email}' already exists in this organization`);
    }

    // 2. Fetch the target role within this tenant
    const role = await RoleModel.query(trx)
      .where("tenant_id", input.tenantId)
      .where("slug", input.roleSlug)
      .whereNull("deleted_at")
      .first();

    if (!role) {
      throw new NotFoundError(`Role '${input.roleSlug}' not found in this organization`);
    }

    // 3. Create the user
    const newUser = await UserModel.query(trx).insert({
      tenant_id: input.tenantId,
      email: input.email.toLowerCase().trim(),
      password_hash: input.passwordHash,
      first_name: input.firstName,
      last_name: input.lastName,
      status: "ACTIVE",
    });

    // 4. Assign role
    await trx("user_roles").insert({
      user_id: newUser.id,
      role_id: role.id,
      tenant_id: input.tenantId,
    });

    // 5. Create audit log
    const auditLog = await AuditLogModel.query(trx).insert({
      tenant_id: input.tenantId,
      user_id: input.actorUserId || null,
      action: "USER_REGISTERED_AND_ROLE_ASSIGNED",
      entity_type: "USER",
      entity_id: String(newUser.id),
      new_state: {
        userId: newUser.id,
        email: newUser.email,
        assignedRole: role.slug,
      },
      ip_address: input.ipAddress || null,
    });

    logger.info(
      { userId: newUser.id, tenantId: input.tenantId, role: role.slug },
      "Atomic user creation transaction successfully committed"
    );

    return {
      user: newUser,
      assignedRole: role,
      auditLog,
    };
  });
}
