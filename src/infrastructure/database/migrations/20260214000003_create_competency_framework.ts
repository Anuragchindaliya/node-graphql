import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. competencies
  await knex.schema.createTable("competencies", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.string("name", 255).notNullable();
    table.string("code", 50).notNullable();
    table.string("category", 100).notNullable(); // TECHNICAL, LEADERSHIP, DOMAIN
    table.text("description").nullable();
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.unique(["tenant_id", "code"], "uq_competencies_tenant_code");
    table.index(["tenant_id", "category"], "idx_competencies_tenant_category");
    table.index(["tenant_id", "deleted_at"], "idx_competencies_tenant_deleted");
  });

  // 2. competency_levels
  await knex.schema.createTable("competency_levels", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("competency_id").unsigned().notNullable();
    table.integer("level_number").notNullable(); // 1 to 5
    table.string("name", 100).notNullable(); // Beginner, Intermediate, etc.
    table.text("description").notNullable();
    table.timestamps(true, true);

    table.foreign("competency_id").references("id").inTable("competencies").onDelete("CASCADE");
    table.unique(["competency_id", "level_number"], "uq_competency_levels_comp_lvl");
  });

  // 3. user_competencies
  await knex.schema.createTable("user_competencies", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("user_id").unsigned().notNullable();
    table.bigInteger("competency_id").unsigned().notNullable();
    table.bigInteger("current_level_id").unsigned().notNullable();
    table.timestamp("verified_at").nullable();
    table.bigInteger("verified_by").unsigned().nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("competency_id").references("id").inTable("competencies").onDelete("CASCADE");
    table.foreign("current_level_id").references("id").inTable("competency_levels").onDelete("RESTRICT");
    table.foreign("verified_by").references("id").inTable("users").onDelete("SET NULL");

    table.unique(["tenant_id", "user_id", "competency_id"], "uq_user_competencies_tenant_user_comp");
    table.index(["tenant_id", "user_id"], "idx_user_competencies_tenant_user");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_competencies");
  await knex.schema.dropTableIfExists("competency_levels");
  await knex.schema.dropTableIfExists("competencies");
}
