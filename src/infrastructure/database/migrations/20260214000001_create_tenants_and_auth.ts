import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. organizations
  await knex.schema.createTable("organizations", (table) => {
    table.bigIncrements("id").primary();
    table.string("name", 255).notNullable();
    table.string("slug", 100).notNullable().unique();
    table.enum("status", ["ACTIVE", "SUSPENDED", "ARCHIVED"]).notNullable().defaultTo("ACTIVE");
    table.json("settings").nullable();
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.index(["status", "deleted_at"], "idx_organizations_status_deleted");
  });

  // 2. users
  await knex.schema.createTable("users", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("department_id").unsigned().nullable();
    table.bigInteger("position_id").unsigned().nullable();
    table.string("email", 255).notNullable();
    table.string("password_hash", 255).notNullable();
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.enum("status", ["ACTIVE", "INACTIVE", "SUSPENDED"]).notNullable().defaultTo("ACTIVE");
    table.string("avatar_url", 1024).nullable();
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.unique(["tenant_id", "email"], "uq_users_tenant_email");
    table.index(["tenant_id", "status", "deleted_at"], "idx_users_tenant_status");
  });

  // 3. roles
  await knex.schema.createTable("roles", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable();
    table.string("description", 500).nullable();
    table.boolean("is_system").notNullable().defaultTo(false);
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.unique(["tenant_id", "slug"], "uq_roles_tenant_slug");
    table.index(["tenant_id", "deleted_at"], "idx_roles_tenant_deleted");
  });

  // 4. permissions
  await knex.schema.createTable("permissions", (table) => {
    table.bigIncrements("id").primary();
    table.string("name", 100).notNullable();
    table.string("action", 50).notNullable();
    table.string("resource", 50).notNullable();
    table.string("description", 500).nullable();
    table.timestamps(true, true);

    table.unique(["resource", "action"], "uq_permissions_resource_action");
  });

  // 5. role_permissions
  await knex.schema.createTable("role_permissions", (table) => {
    table.bigInteger("role_id").unsigned().notNullable();
    table.bigInteger("permission_id").unsigned().notNullable();

    table.primary(["role_id", "permission_id"]);
    table.foreign("role_id").references("id").inTable("roles").onDelete("CASCADE");
    table.foreign("permission_id").references("id").inTable("permissions").onDelete("CASCADE");
  });

  // 6. user_roles
  await knex.schema.createTable("user_roles", (table) => {
    table.bigInteger("user_id").unsigned().notNullable();
    table.bigInteger("role_id").unsigned().notNullable();
    table.bigInteger("tenant_id").unsigned().notNullable();

    table.primary(["user_id", "role_id"]);
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("role_id").references("id").inTable("roles").onDelete("CASCADE");
    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.index(["tenant_id", "role_id"], "idx_user_roles_tenant_role");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_roles");
  await knex.schema.dropTableIfExists("role_permissions");
  await knex.schema.dropTableIfExists("permissions");
  await knex.schema.dropTableIfExists("roles");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("organizations");
}
