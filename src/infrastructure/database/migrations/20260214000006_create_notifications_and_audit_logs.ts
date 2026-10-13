import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. notifications
  await knex.schema.createTable("notifications", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("user_id").unsigned().notNullable();
    table.string("title", 255).notNullable();
    table.text("message").notNullable();
    table.string("type", 50).notNullable(); // e.g. 'ENROLLMENT', 'ASSESSMENT_DUE', 'SYSTEM'
    table.boolean("is_read").notNullable().defaultTo(false);
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");

    table.index(["tenant_id", "user_id", "is_read", "created_at"], "idx_notifications_user_unread");
  });

  // 2. audit_logs
  await knex.schema.createTable("audit_logs", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("user_id").unsigned().nullable();
    table.string("action", 100).notNullable(); // e.g. 'USER_CREATED', 'ROLE_ASSIGNED'
    table.string("entity_type", 100).notNullable();
    table.string("entity_id", 100).notNullable();
    table.json("old_state").nullable();
    table.json("new_state").nullable();
    table.string("ip_address", 45).nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("users").onDelete("SET NULL");

    table.index(["tenant_id", "entity_type", "entity_id"], "idx_audit_tenant_entity");
    table.index(["tenant_id", "created_at"], "idx_audit_tenant_created");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("audit_logs");
  await knex.schema.dropTableIfExists("notifications");
}
