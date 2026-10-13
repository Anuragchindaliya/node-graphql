import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. courses
  await knex.schema.createTable("courses", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.string("title", 255).notNullable();
    table.string("code", 50).notNullable();
    table.text("description").nullable();
    table.decimal("estimated_duration_hours", 5, 2).notNullable().defaultTo(0.0);
    table.enum("status", ["DRAFT", "PUBLISHED", "ARCHIVED"]).notNullable().defaultTo("DRAFT");
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.unique(["tenant_id", "code"], "uq_courses_tenant_code");
    table.index(["tenant_id", "status", "deleted_at"], "idx_courses_tenant_status");
  });

  // 2. training_programs
  await knex.schema.createTable("training_programs", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.string("title", 255).notNullable();
    table.string("code", 50).notNullable();
    table.text("description").nullable();
    table.date("start_date").nullable();
    table.date("end_date").nullable();
    table.integer("max_participants").notNullable().defaultTo(50);
    table.enum("status", ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).notNullable().defaultTo("DRAFT");
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.unique(["tenant_id", "code"], "uq_training_programs_tenant_code");
    table.index(["tenant_id", "status", "deleted_at"], "idx_tp_tenant_status");
  });

  // 3. training_program_courses
  await knex.schema.createTable("training_program_courses", (table) => {
    table.bigInteger("training_program_id").unsigned().notNullable();
    table.bigInteger("course_id").unsigned().notNullable();
    table.integer("sequence_order").notNullable().defaultTo(1);

    table.primary(["training_program_id", "course_id"]);
    table.foreign("training_program_id").references("id").inTable("training_programs").onDelete("CASCADE");
    table.foreign("course_id").references("id").inTable("courses").onDelete("CASCADE");
  });

  // 4. training_applications
  await knex.schema.createTable("training_applications", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("training_program_id").unsigned().notNullable();
    table.bigInteger("user_id").unsigned().notNullable();
    table.enum("status", ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "COMPLETED"]).notNullable().defaultTo("PENDING");
    table.bigInteger("reviewed_by").unsigned().nullable();
    table.text("review_notes").nullable();
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("training_program_id").references("id").inTable("training_programs").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("reviewed_by").references("id").inTable("users").onDelete("SET NULL");

    table.unique(["tenant_id", "training_program_id", "user_id"], "uq_ta_tenant_program_user");
    table.index(["tenant_id", "status"], "idx_ta_tenant_status");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("training_applications");
  await knex.schema.dropTableIfExists("training_program_courses");
  await knex.schema.dropTableIfExists("training_programs");
  await knex.schema.dropTableIfExists("courses");
}
