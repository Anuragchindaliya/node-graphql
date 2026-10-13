import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Clear tables in reverse dependency order to prevent FK violations
  await knex("audit_logs").del();
  await knex("notifications").del();
  await knex("assessment_answers").del();
  await knex("assessment_attempts").del();
  await knex("assessment_options").del();
  await knex("assessment_questions").del();
  await knex("assessments").del();
  await knex("training_applications").del();
  await knex("training_program_courses").del();
  await knex("training_programs").del();
  await knex("courses").del();
  await knex("user_competencies").del();
  await knex("competency_levels").del();
  await knex("competencies").del();
  await knex("user_roles").del();
  await knex("role_permissions").del();
  await knex("permissions").del();
  await knex("roles").del();
  await knex("users").del();
  await knex("positions").del();
  await knex("departments").del();
  await knex("organizations").del();

  // 1. Seed Global Permissions
  const permissions = [
    { name: "Manage Users", resource: "USERS", action: "MANAGE", description: "Full user management" },
    { name: "View Users", resource: "USERS", action: "READ", description: "View user directory" },
    { name: "Manage Courses", resource: "COURSES", action: "MANAGE", description: "Create/edit courses" },
    { name: "View Courses", resource: "COURSES", action: "READ", description: "View and take courses" },
    { name: "Take Assessments", resource: "ASSESSMENTS", action: "TAKE", description: "Submit assessments" },
    { name: "Grade Assessments", resource: "ASSESSMENTS", action: "GRADE", description: "Grade submissions" },
  ];
  await knex("permissions").insert(permissions);
  const allPerms = await knex("permissions").select("id", "resource", "action");
  const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));

  // 2. Seed 2 Multi-Tenant Organizations
  const [orgAcmeId] = await knex("organizations").insert({
    name: "Acme Corporation",
    slug: "acme-corp",
    status: "ACTIVE",
    settings: JSON.stringify({ tier: "ENTERPRISE", maxUsers: 1000 }),
  });

  const [orgGlobexId] = await knex("organizations").insert({
    name: "Globex Industries",
    slug: "globex-industries",
    status: "ACTIVE",
    settings: JSON.stringify({ tier: "BUSINESS", maxUsers: 250 }),
  });

  // Seed data helper for each organization
  for (const org of [
    { id: orgAcmeId, prefix: "acme", domain: "acme.com" },
    { id: orgGlobexId, prefix: "globex", domain: "globex.com" },
  ]) {
    // 3. Departments
    const [deptEngId] = await knex("departments").insert({
      tenant_id: org.id,
      name: "Engineering",
      code: `ENG-${org.prefix.toUpperCase()}`,
    });

    const [deptProdId] = await knex("departments").insert({
      tenant_id: org.id,
      name: "Product & Design",
      code: `PROD-${org.prefix.toUpperCase()}`,
    });

    // 4. Positions
    const [posStaffId] = await knex("positions").insert({
      tenant_id: org.id,
      department_id: deptEngId,
      title: "Staff Software Engineer",
      code: `SE-STAFF-${org.prefix.toUpperCase()}`,
    });

    const [posPmId] = await knex("positions").insert({
      tenant_id: org.id,
      department_id: deptProdId,
      title: "Senior Product Manager",
      code: `PM-SR-${org.prefix.toUpperCase()}`,
    });

    // 5. Tenant Roles
    const [roleAdminId] = await knex("roles").insert({
      tenant_id: org.id,
      name: "Organization Admin",
      slug: "admin",
      is_system: true,
      description: "Full administrative access to the organization",
    });

    const [roleLearnerId] = await knex("roles").insert({
      tenant_id: org.id,
      name: "Learner",
      slug: "learner",
      is_system: true,
      description: "Access to enroll in courses and take assessments",
    });

    // Map permissions to roles
    const adminPermIds = allPerms.map((p) => p.id);
    await knex("role_permissions").insert(
      adminPermIds.map((pid) => ({ role_id: roleAdminId, permission_id: pid }))
    );

    const learnerPermIds = [permMap.get("COURSES:READ"), permMap.get("ASSESSMENTS:TAKE")].filter(Boolean);
    await knex("role_permissions").insert(
      learnerPermIds.map((pid) => ({ role_id: roleLearnerId, permission_id: pid }))
    );

    // 6. Users
    // Dummy bcrypt-compatible password hash
    const dummyHash = "$2b$10$epRswT.wEaP.w1.J2B/4e.7iY8Gk0OsqLg6xUjJzFh7zEsqWjFz5O";

    const [adminUserId] = await knex("users").insert({
      tenant_id: org.id,
      department_id: deptEngId,
      position_id: posStaffId,
      email: `admin@${org.domain}`,
      password_hash: dummyHash,
      first_name: "Alex",
      last_name: "Admin",
      status: "ACTIVE",
    });

    const [learnerUserId] = await knex("users").insert({
      tenant_id: org.id,
      department_id: deptProdId,
      position_id: posPmId,
      email: `learner@${org.domain}`,
      password_hash: dummyHash,
      first_name: "Sam",
      last_name: "Learner",
      status: "ACTIVE",
    });

    // Assign roles
    await knex("user_roles").insert([
      { user_id: adminUserId, role_id: roleAdminId, tenant_id: org.id },
      { user_id: learnerUserId, role_id: roleLearnerId, tenant_id: org.id },
    ]);

    // 7. Competencies
    const [compGqlId] = await knex("competencies").insert({
      tenant_id: org.id,
      name: "GraphQL Architecture & Scalability",
      code: `COMP-GQL-${org.prefix.toUpperCase()}`,
      category: "TECHNICAL",
      description: "Proficiency in designing N+1 resilient GraphQL schemas, Apollo Server, and DataLoaders",
    });

    // Competency Levels
    const [lvlBeginnerId] = await knex("competency_levels").insert({
      competency_id: compGqlId,
      level_number: 1,
      name: "Beginner",
      description: "Basic queries and resolvers",
    });

    await knex("competency_levels").insert({
      competency_id: compGqlId,
      level_number: 3,
      name: "Advanced",
      description: "DataLoader batching, query depth limits, and production caching",
    });

    // User Competency
    await knex("user_competencies").insert({
      tenant_id: org.id,
      user_id: learnerUserId,
      competency_id: compGqlId,
      current_level_id: lvlBeginnerId,
      verified_by: adminUserId,
      verified_at: new Date(),
    });

    // 8. Courses
    const [courseId] = await knex("courses").insert({
      tenant_id: org.id,
      title: "Production GraphQL & SQL Optimization",
      code: `CRS-GQL-101-${org.prefix.toUpperCase()}`,
      description: "Deep dive into Apollo Server, MariaDB indexing, and Redis caching",
      estimated_duration_hours: 12.5,
      status: "PUBLISHED",
    });

    // 9. Training Programs
    const [programId] = await knex("training_programs").insert({
      tenant_id: org.id,
      title: "Senior Backend Engineering Track",
      code: `PROG-BACKEND-${org.prefix.toUpperCase()}`,
      description: "Comprehensive pathway for backend engineers",
      max_participants: 30,
      status: "OPEN",
    });

    await knex("training_program_courses").insert({
      training_program_id: programId,
      course_id: courseId,
      sequence_order: 1,
    });

    // Training Application
    await knex("training_applications").insert({
      tenant_id: org.id,
      training_program_id: programId,
      user_id: learnerUserId,
      status: "APPROVED",
      reviewed_by: adminUserId,
      review_notes: "Approved based on Q1 growth plan",
    });

    // 10. Assessments
    const [assessmentId] = await knex("assessments").insert({
      tenant_id: org.id,
      course_id: courseId,
      title: "GraphQL & Indexing Certification Assessment",
      pass_percentage: 80.0,
      time_limit_minutes: 45,
    });

    const [questionId] = await knex("assessment_questions").insert({
      assessment_id: assessmentId,
      question_text: "Why does an un-batched resolver loop cause the N+1 problem?",
      points: 5.0,
      question_type: "SINGLE_CHOICE",
    });

    await knex("assessment_options").insert([
      {
        question_id: questionId,
        option_text: "Because it fires a discrete SQL query for every child node in the list",
        is_correct: true,
      },
      {
        question_id: questionId,
        option_text: "Because MariaDB cannot process JOIN operations",
        is_correct: false,
      },
    ]);

    // 11. Initial Audit Log
    await knex("audit_logs").insert({
      tenant_id: org.id,
      user_id: adminUserId,
      action: "ORGANIZATION_SEEDED",
      entity_type: "ORGANIZATION",
      entity_id: String(org.id),
      new_state: JSON.stringify({ seededAt: new Date().toISOString() }),
    });
  }
}
