import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. departments
  await knex.schema.createTable("departments", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("parent_id").unsigned().nullable();
    table.string("name", 255).notNullable();
    table.string("code", 50).notNullable();
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("parent_id").references("id").inTable("departments").onDelete("SET NULL");
    table.unique(["tenant_id", "code"], "uq_departments_tenant_code");
    table.index(["tenant_id", "deleted_at"], "idx_departments_tenant_deleted");
  });

  // 2. positions
  await knex.schema.createTable("positions", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("department_id").unsigned().nullable();
    table.string("title", 255).notNullable();
    table.string("code", 50).notNullable();
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("department_id").references("id").inTable("departments").onDelete("SET NULL");
    table.unique(["tenant_id", "code"], "uq_positions_tenant_code");
    table.index(["tenant_id", "deleted_at"], "idx_positions_tenant_deleted");
  });

  // Add foreign keys from users table to departments and positions
  await knex.schema.alterTable("users", (table) => {
    table.foreign("department_id").references("id").inTable("departments").onDelete("SET NULL");
    table.foreign("position_id").references("id").inTable("positions").onDelete("SET NULL");
    table.index(["tenant_id", "department_id"], "idx_users_tenant_dept");
    table.index(["tenant_id", "position_id"], "idx_users_tenant_position");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropForeign(["department_id"]);
    table.dropForeign(["position_id"]);
    table.dropIndex(["tenant_id", "department_id"], "idx_users_tenant_dept");
    table.dropIndex(["tenant_id", "position_id"], "idx_users_tenant_position");
  });
  await knex.schema.dropTableIfExists("positions");
  await knex.schema.dropTableIfExists("departments");
}
