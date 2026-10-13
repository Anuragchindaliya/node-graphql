import { Transaction } from "objection";
import { UserModel } from "../database/models/user.model.js";
import { TenantRepository } from "./base.repository.js";
import { db } from "../database/knex.js";

export class UserRepository extends TenantRepository<UserModel> {
  constructor() {
    super(UserModel);
  }

  async findByEmail(tenantId: string, email: string, trx?: Transaction): Promise<UserModel | null> {
    const user = await this.defaultQuery(tenantId, trx)
      .where("email", email.toLowerCase().trim())
      .first();
    return user || null;
  }

  async findWithRoles(tenantId: string, id: string, trx?: Transaction): Promise<UserModel | null> {
    const user = await this.defaultQuery(tenantId, trx)
      .where("users.id", id)
      .withGraphFetched("roles.permissions")
      .first();
    return user || null;
  }

  async assignRole(
    tenantId: string,
    userId: string,
    roleId: string,
    trx?: Transaction
  ): Promise<void> {
    const knexInstance = trx || db;
    await knexInstance("user_roles")
      .insert({
        user_id: userId,
        role_id: roleId,
        tenant_id: tenantId,
      })
      .onConflict(["user_id", "role_id"])
      .ignore();
  }
}
