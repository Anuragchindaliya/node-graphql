import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. assessments
  await knex.schema.createTable("assessments", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("course_id").unsigned().nullable();
    table.string("title", 255).notNullable();
    table.decimal("pass_percentage", 5, 2).notNullable().defaultTo(70.0);
    table.integer("time_limit_minutes").notNullable().defaultTo(60);
    table.timestamp("deleted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("course_id").references("id").inTable("courses").onDelete("SET NULL");
    table.index(["tenant_id", "course_id"], "idx_assessments_tenant_course");
    table.index(["tenant_id", "deleted_at"], "idx_assessments_tenant_deleted");
  });

  // 2. assessment_questions
  await knex.schema.createTable("assessment_questions", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("assessment_id").unsigned().notNullable();
    table.text("question_text").notNullable();
    table.decimal("points", 5, 2).notNullable().defaultTo(1.0);
    table.enum("question_type", ["SINGLE_CHOICE", "MULTIPLE_CHOICE"]).notNullable().defaultTo("SINGLE_CHOICE");
    table.timestamps(true, true);

    table.foreign("assessment_id").references("id").inTable("assessments").onDelete("CASCADE");
    table.index(["assessment_id"], "idx_aq_assessment");
  });

  // 3. assessment_options
  await knex.schema.createTable("assessment_options", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("question_id").unsigned().notNullable();
    table.text("option_text").notNullable();
    table.boolean("is_correct").notNullable().defaultTo(false);
    table.timestamps(true, true);

    table.foreign("question_id").references("id").inTable("assessment_questions").onDelete("CASCADE");
    table.index(["question_id"], "idx_ao_question");
  });

  // 4. assessment_attempts
  await knex.schema.createTable("assessment_attempts", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("tenant_id").unsigned().notNullable();
    table.bigInteger("assessment_id").unsigned().notNullable();
    table.bigInteger("user_id").unsigned().notNullable();
    table.decimal("score", 5, 2).nullable();
    table.boolean("passed").nullable();
    table.enum("status", ["IN_PROGRESS", "SUBMITTED", "GRADED"]).notNullable().defaultTo("IN_PROGRESS");
    table.timestamp("started_at").defaultTo(knex.fn.now());
    table.timestamp("submitted_at").nullable();
    table.timestamps(true, true);

    table.foreign("tenant_id").references("id").inTable("organizations").onDelete("CASCADE");
    table.foreign("assessment_id").references("id").inTable("assessments").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");

    table.index(["tenant_id", "user_id", "assessment_id"], "idx_att_tenant_user_assessment");
    table.index(["tenant_id", "status"], "idx_att_tenant_status");
  });

  // 5. assessment_answers
  await knex.schema.createTable("assessment_answers", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("attempt_id").unsigned().notNullable();
    table.bigInteger("question_id").unsigned().notNullable();
    table.bigInteger("selected_option_id").unsigned().nullable();
    table.boolean("is_correct").nullable();
    table.decimal("points_awarded", 5, 2).notNullable().defaultTo(0.0);
    table.timestamps(true, true);

    table.foreign("attempt_id").references("id").inTable("assessment_attempts").onDelete("CASCADE");
    table.foreign("question_id").references("id").inTable("assessment_questions").onDelete("CASCADE");
    table.foreign("selected_option_id").references("id").inTable("assessment_options").onDelete("SET NULL");

    table.unique(["attempt_id", "question_id"], "uq_ans_attempt_question");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("assessment_answers");
  await knex.schema.dropTableIfExists("assessment_attempts");
  await knex.schema.dropTableIfExists("assessment_options");
  await knex.schema.dropTableIfExists("assessment_questions");
  await knex.schema.dropTableIfExists("assessments");
}
