# Enterprise Multi-Tenant Competency & Learning Management Platform

A production-grade, interview-ready **Multi-Tenant GraphQL Platform** built from scratch with Node.js, TypeScript, Apollo Server, MariaDB, Objection.js/Knex, and Redis.

---

## 🏛️ High-Level System Architecture

```text
Client (GraphQL Queries / Mutations)
  │
  ▼
Apollo Server 4 (Express)
  │
  ├─► Security & Context Middleware (Auth/AuthZ, Tenant ID, Trace ID, DataLoaders)
  │
  ▼
Resolvers Layer (Orchestration & transport adaptation only)
  │
  ▼
Domain Services Layer (Business logic, validation, transaction boundaries)
  │
  ▼
Repositories Layer (Data access abstraction, multi-tenant scoping)
  │
  ▼
Objection.js / Knex ORM & Query Builder (Connection pool min:2, max:10)
  │
  ▼
MariaDB 11.4 LTS (Row-level multi-tenancy with composite indexes)

Backing Infrastructure:
  ├── Redis 7.2: Low-latency caching, distributed rate limiting, pub/sub
  ├── DataLoader: Per-request batching & deduplication (prevents N+1)
  └── Structured Observability: Pino JSON logging, liveness & readiness health probes
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime & Language** | Node.js (v24+ / LTS), TypeScript 5.7+ (Strict Mode) |
| **API Transport** | Apollo Server 4, Express 4, GraphQL SDL |
| **Code Generation** | GraphQL Code Generator (`@graphql-codegen/cli`) |
| **Primary Database** | MariaDB 11.4 LTS via `mysql2` |
| **ORM & Query Builder** | Knex 3.x + Objection.js 3.x |
| **Cache & State** | Redis 7.2 (Alpine) via `ioredis` |
| **N+1 Prevention** | DataLoader |
| **Auth & AuthZ** | OAuth2 / OIDC + JWT (Access/Refresh), Multi-Tenant RBAC |
| **Validation & Config** | Zod + Dotenv (Fail-fast validation) |
| **Logging & Metrics** | Pino (Structured JSON + PII redaction) |
| **Testing** | Vitest (Unit & Integration tests) |
| **Infrastructure** | Docker, Docker Compose, AWS (ECS / RDS / ElastiCache) |

---

## 🗺️ Implementation Roadmap

- [x] **Phase 0: Project Architecture & Setup**
- [x] **Phase 1: Database Schema, Multi-Tenant Migrations & Objection.js Base Models**
- [ ] **Phase 2: GraphQL Schema Design, Modular SDL & GraphQL Code Generator**
- [ ] **Phase 3: Context Pipeline, Authentication (JWT/OIDC) & Multi-Tenant Scoping**
- [ ] **Phase 4: Multi-Tenant RBAC & Resource-Level Authorization**
- [ ] **Phase 5: Resolvers, Services & Repositories (Organizations & Users)**
- [ ] **Phase 6: DataLoader Architecture & N+1 Prevention**
- [ ] **Phase 7: Redis Caching, Invalidation & Query Complexity / Depth Limits**
- [ ] **Phase 8: Competency, Courses & Assessment Engine**
- [ ] **Phase 9: Resilient External Integrations (Circuit Breakers, Retries, Jitter)**
- [ ] **Phase 10: Observability, Docker Production Image, CI/CD & Mock Interview**

---

## 📦 Phase 0: Project Architecture & Setup

### 1. Concepts & Architectural Decisions

#### Layered Clean Architecture
To avoid the **"Fat Resolver" anti-pattern**, responsibilities are strictly separated:
1. **Resolvers**: Extract arguments and context; delegate immediately to Domain Services. Never write raw SQL or database queries in a resolver.
2. **Services**: Contain pure business rules, authorization checks, and transaction boundaries.
3. **Repositories**: Encapsulate SQL queries and enforce row-level tenant filtering (`tenant_id`).
4. **Models**: Objection.js classes defining table schemas, relations, and validation rules.

#### Multi-Tenancy Strategy: Shared Database / Row-Level Discrimination
- **Database-per-tenant**: High cloud and connection pool costs, complex migrations.
- **Schema-per-tenant**: Migration bottlenecks at scale due to DDL locking across hundreds of schemas.
- **Row-Level (Selected)**: All tenants share the database; every table has a `tenant_id` column indexed as `(tenant_id, id)`. Combined with scoped query builders, this achieves maximum density, minimal connection overhead, and simple global schema migrations.

#### Fail-Fast Environment Validation
Using [Zod](file:///Users/anurag/Desktop/node-graphql/src/config/env.ts), all environment variables (`DB_HOST`, `REDIS_PASSWORD`, `JWT_ACCESS_SECRET`, etc.) are validated before the HTTP listener starts. The application refuses to boot if configuration is invalid.

#### Separate Health Probes
- **`/healthz` (Liveness)**: Fast shallow check. Fails only if the Node.js event loop is completely blocked or process is hung.
- **`/ready` (Readiness)**: Deep probe testing active connections to MariaDB (`SELECT 1`) and Redis (`PING`). Returns `503 Service Unavailable` if backing services are down, safely isolating the instance from the load balancer without triggering container restart loops.

#### Graceful Shutdown Protocol
Listens for `SIGTERM` and `SIGINT`:
1. Stop accepting new HTTP connections.
2. Drains active in-flight GraphQL requests via `ApolloServerPluginDrainHttpServer`.
3. Closes MariaDB connection pool (`knex.destroy()`).
4. Closes Redis socket connection (`redis.quit()`).
5. 10-second timeout guard prevents hanging processes in container environments.

---

### 2. Directory Structure

```text
node-graphql/
├── .env                          # Local environment variables
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore file
├── docker-compose.yml            # Backing services: MariaDB 11.4 & Redis 7.2
├── package.json                  # Dependencies, scripts, ESM configuration
├── tsconfig.json                 # Strict TypeScript with NodeNext resolution
├── vitest.config.ts              # Test runner configuration
├── README.md                     # Project documentation & interview knowledge base
├── src/
│   ├── config/
│   │   └── env.ts                # Zod environment schema & validator
│   ├── core/
│   │   ├── errors/
│   │   │   ├── app-error.ts      # RFC 7807 GraphQLError subclasses
│   │   │   └── error-codes.ts    # Standardized machine-readable error codes
│   │   └── logger/
│   │       └── logger.ts         # Pino structured logger with PII redaction
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── knex.ts           # Knex pool configuration & Objection.js binding
│   │   └── redis/
│   │       └── redis.ts          # Redis client with retry backoff & health check
│   ├── app.ts                    # Express + Apollo Server factory & routes
│   └── index.ts                  # Server entry point & graceful shutdown
└── tests/
    ├── unit/
    │   └── app-error.test.ts     # Unit tests for structured errors
    └── integration/
        ├── backing-services.test.ts # MariaDB & Redis connectivity tests
        └── health.test.ts        # Apollo Server health query execution
```

---

### 3. Setup & Running

#### Prerequisites
- Node.js >= 20.0.0
- Docker & Docker Compose

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Start Backing Services (MariaDB + Redis)
```bash
npm run docker:up
```

#### 3. Run Test Suite
```bash
npm test
```

#### 4. Start Development Server
```bash
npm run dev
```

#### 5. Verify Health & Endpoints
```bash
# Liveness Probe
curl http://localhost:4000/healthz

# Readiness Probe
curl http://localhost:4000/ready

# GraphQL Query
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health { status version uptime timestamp } }"}'
```

---

### 4. Senior-Level Interview Questions (Phase 0)

#### Q1: Why must Liveness and Readiness probes be architecturally separated in containerized systems (Kubernetes/AWS ECS)?
> **Answer**: 
> - A **Liveness Probe** (`/healthz`) detects deadlocks or fatal crashes. If it fails, the orchestrator destroys and restarts the container.
> - A **Readiness Probe** (`/ready`) detects if the container is currently capable of handling traffic. If it fails, the orchestrator removes the pod from the load balancer target group without killing it.
> 
> If a liveness probe performs a deep database check and the database experiences temporary connection exhaustion, the orchestrator will restart *all* application pods at the same time. When they all reboot and attempt to reconnect simultaneously, they amplify the database connection spike, transforming a minor transient hiccup into a cascading total outage.

#### Q2: Why should GraphQL resolvers never execute database queries directly?
> **Answer**: 
> Direct database queries in resolvers create tight coupling between transport/schema and storage:
> 1. **Testing**: Resolvers become difficult to unit test without spinning up or mocking an entire database.
> 2. **Reusability**: Business workflows cannot be reused in non-GraphQL contexts (e.g., CLI commands, queue consumers, Webhook handlers).
> 3. **Governance**: Cross-cutting requirements like multi-tenant isolation, authorization, caching, and database transactions become scattered and prone to accidental omissions.

#### Q3: What are the trade-offs of Row-Level Multi-Tenancy vs. Schema-Per-Tenant vs. Database-Per-Tenant?
> **Answer**:
> - **Row-Level (Shared Database & Tables)**: Maximizes resource utilization and tenant density. Low infrastructure cost, unified connection pooling, and straightforward migrations. Requires rigorous enforcement of `tenant_id` in repository queries and composite indexing `(tenant_id, id)`.
> - **Schema-Per-Tenant**: Clean logical boundaries within one DB instance. However, running migrations across hundreds of schemas causes severe DDL lock bottlenecks and connection pooling fragmentation in MariaDB/MySQL.
> - **Database-Per-Tenant**: Highest physical isolation, ideal for strict compliance (e.g., FedRAMP/HIPAA). Disadvantages include massive idle infrastructure cost, connection pool overhead across hundreds of DB instances, and complex cross-database migration tooling.

#### Q4: How does Node.js graceful termination work, and what is the required teardown sequence?
> **Answer**:
> When a container manager terminates a container, it issues `SIGTERM`, waits a grace period (e.g., 30s), and sends `SIGKILL` if the process has not exited. The teardown sequence must be:
> 1. Stop taking new HTTP requests (`httpServer.close()`).
> 2. Drain active in-flight GraphQL executions (`apolloServer.stop()`).
> 3. Flush and terminate cache connections (`redis.quit()`).
> 4. Drain and close SQL connection pools (`knex.destroy()`).
> 5. Flush pending logger buffers and exit with `0`. A fallback timer (`setTimeout` -> `process.exit(1)`) guarantees the process terminates even if an asynchronous handle leaks.

---

## 💾 Phase 1: Database Architecture & Data Layer

### 1. Entity Relationship (ER) Design

```text
                               ┌───────────────────┐
                               │   organizations   │ (Tenants)
                               └─────────┬─────────┘
        ┌───────────────────┬────────────┼────────────┬───────────────────┐
        │ 1:N               │ 1:N        │ 1:N        │ 1:N               │ 1:N
        ▼                   ▼            ▼            ▼                   ▼
┌───────────────┐   ┌──────────────┐ ┌───────┐ ┌──────────────┐ ┌───────────────────┐
│  departments  │   │  positions   │ │ roles │ │ competencies │ │      courses      │
└───────┬───────┘   └──────┬───────┘ └───┬───┘ └──────┬───────┘ └─────────┬─────────┘
        │ 1:N              │ 1:N         │            │ 1:N               │ 1:N
        ▼                  ▼             │            ▼                   ▼
┌──────────────────────────────────┐     │     ┌──────────────┐ ┌───────────────────┐
│              users               │     │     │ competency_  │ │    assessments    │
└─────────────────┬────────────────┘     │     │    levels    │ └─────────┬─────────┘
  │ 1:N           │ N:M (via user_roles) │     └──────┬───────┘           │ 1:N
  │               ▼                      │            │                   ▼
  │         ┌────────────┐               │            │         ┌───────────────────┐
  │         │ user_roles │◄──────────────┘            │         │    assessment_    │
  │         └────────────┘                            │         │     questions     │
  │                                                   │         └─────────┬─────────┘
  ├────────────────────────────────────────┐          │                   │ 1:N
  │ 1:N                                    │ 1:N      │                   ▼
  ▼                                        ▼          │         ┌───────────────────┐
┌──────────────────┐             ┌──────────────────┐ │         │    assessment_    │
│  notifications   │             │    audit_logs    │ │         │      options      │
└──────────────────┘             └──────────────────┘ │         └───────────────────┘
  │                                        │          │                   │
  │ 1:N                                    │          │ 1:N               │
  ▼                                        │          ▼                   ▼
┌──────────────────┐                       │   ┌──────────────┐ ┌───────────────────┐
│   assessment_    │                       └──►│    user_     │ │    assessment_    │
│     attempts     ├──────────────────────────►│ competencies │ │      answers      │
└──────────────────┘                           └──────────────┘ └───────────────────┘
```

#### Core Cardinalities & Relationship Logic:
1. **Organization → Users / Departments / Roles / Competencies / Courses / Programs (`1:N`)**:
   Every domain aggregate belongs strictly to one tenant.
2. **Users ↔ Roles (`N:M` via `user_roles`)**:
   Users can hold multiple roles (e.g. Org Admin, Instructor, Learner). The join table carries `tenant_id` with composite primary key `(user_id, role_id)` and index `(tenant_id, role_id)`.
3. **Roles ↔ Permissions (`N:M` via `role_permissions`)**:
   Global permissions (`resource:action`) mapped to organization roles.
4. **Competencies → Levels (`1:N`) & Users (`N:M` via `user_competencies`)**:
   Competencies define a 5-tier progression (`level_number 1..5`). `user_competencies` stores current proficiency, verified timestamp, and verifying manager.
5. **Training Programs ↔ Courses (`N:M` via `training_program_courses`)**:
   Sequential course tracks ordered by `sequence_order`.
6. **Courses → Assessments → Questions → Options (`1:N` Cascade)**:
   Course quizzes with single/multiple choice options and automated score calculation.

---

### 2. SQL Schema Design & Data Integrity

All 21 tables conform to production-grade relational rules:
- **Primary Keys**: `BIGINT UNSIGNED AUTO_INCREMENT` prevents 32-bit ID exhaustion in high-volume tables (audit logs, attempts, answers).
- **Tenant Isolation**: Every tenant-owned table features `tenant_id BIGINT UNSIGNED NOT NULL` with foreign key `ON DELETE CASCADE`.
- **Soft Deletes**: Tables supporting recovery have `deleted_at TIMESTAMP NULL` and composite indexes `(tenant_id, status, deleted_at)` or `(tenant_id, deleted_at)`.
- **Audit Logs**: Immutable append-only design. No `updated_at`, no soft delete. Stores snapshots in `JSON` columns.
- **Timestamps**: All tables use `timestamps(true, true)` creating `created_at` and `updated_at` defaulting to `CURRENT_TIMESTAMP` with `ON UPDATE CURRENT_TIMESTAMP`.

---

### 3. Knex Migrations (Ordered & Incremental)

Migrations are partitioned into 6 logical domain increments:
1. `20260214000001_create_tenants_and_auth.ts`: `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
2. `20260214000002_create_organization_structure.ts`: `departments`, `positions`, alters `users` with FK constraints
3. `20260214000003_create_competency_framework.ts`: `competencies`, `competency_levels`, `user_competencies`
4. `20260214000004_create_courses_and_training.ts`: `courses`, `training_programs`, `training_program_courses`, `training_applications`
5. `20260214000005_create_assessments_and_evaluations.ts`: `assessments`, `assessment_questions`, `assessment_options`, `assessment_attempts`, `assessment_answers`
6. `20260214000006_create_notifications_and_audit_logs.ts`: `notifications`, `audit_logs`

#### Migration Execution:
```bash
# Run all pending migrations
npm run migrate:latest

# Rollback last migration batch
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

---

### 4. Objection.js Model Layer

Located in `src/infrastructure/database/models/`:
- **`BaseModel`**: Automatic ISO timestamp injection on `$beforeInsert` and `$beforeUpdate`.
- **`TenantBaseModel`**: Adds `tenant_id`, `deleted_at`, and `isDeleted` helper.
- **`relationMappings`**: Lazy getter thunks defining `BelongsToOneRelation`, `HasManyRelation`, and `ManyToManyRelation` with join tables.
- **`jsonSchema`**: Runtime validation of payload boundaries before hitting SQL engine.

---

### 5. Repository Layer Pattern

Resolvers never query Knex or Objection directly:
```text
GraphQL Resolver ──► Domain Service ──► Repository ──► Objection.js ──► MariaDB
```

Located in `src/infrastructure/repositories/`:
- **`BaseRepository<T>`**: Generic CRUD (`findById`, `create`, `update`, `delete`).
- **`TenantRepository<T>`**: Automatically enforces:
  - Row-level tenant filtering: `where('tenant_id', tenantId)`
  - Active record filtering: `whereNull('deleted_at')`
  - Reusable offset pagination (`paginateOffset`) and cursor-based pagination (`paginateCursor`).

---

### 6. ACID Transactions & Atomic Operations

Located in `src/core/transactions/user-registration.transaction.ts`:
```typescript
await Model.transaction(db, async (trx) => {
  // 1. Check duplicate email in tenant
  // 2. Fetch tenant role
  // 3. Insert user
  // 4. Assign role in user_roles
  // 5. Write immutable audit log
});
```

#### ACID Guarantees:
- **Atomicity**: If audit log creation or role assignment fails, user insertion is rolled back completely.
- **Consistency**: Database invariants and foreign keys remain valid at all times.
- **Isolation**: Executed within MariaDB transaction boundary (default `REPEATABLE READ`).
- **Durability**: Changes written to InnoDB redo log upon commit.

---

### 7. SQL Performance & Optimization

#### EXPLAIN & Indexing Strategy:
- **Unique Composite Index**: `uq_users_tenant_email` on `(tenant_id, email)` transforms email lookup into a single-row `const` or `eq_ref` B-tree lookup ($O(\log N)$).
- **Composite State Index**: `idx_courses_tenant_status` on `(tenant_id, status, deleted_at)` allows index scan without full-table scan.
- **Covering Indexes**: Queries fetching only `id` and `tenant_id` are served entirely from index leaf nodes without touching row data pages.

#### Pagination Trade-off: Offset vs Cursor
- **Offset Pagination (`OFFSET 10000 LIMIT 20`)**: MariaDB must scan 10,020 rows and discard the first 10,000. Inefficient for large datasets ($O(N)$).
- **Cursor Pagination (`WHERE id > :after LIMIT 20`)**: Uses the indexed primary key to jump directly to the target record ($O(1)$). Returns opaque base64 cursors conforming to Relay GraphQL specifications.

---

### 8. Seed Data & Verification Tests

Run the seed script to populate 2 independent tenant organizations:
```bash
npm run seed:run
```

#### Test Suite (21 Passing Tests):
```bash
npm test
```
Tests in `tests/integration/database.test.ts` verify:
1. Organization retrieval by slug.
2. Cross-tenant isolation (Tenant A cannot view Tenant B users or courses).
3. Objection.js deep graph relations (`users -> roles -> permissions`).
4. ACID transaction commit and rollback guarantees.
5. Soft-deletion behavior and hidden records in tenant queries.
6. Offset and cursor pagination behavior.
7. MariaDB query execution plan (`EXPLAIN`) validating composite indexes.

---

### 9. Senior-Level Interview Questions (Phase 1)

#### Q1: What is the N+1 problem in relational databases and how does it manifest in GraphQL?
> **Answer**: 
> If a GraphQL query requests 50 users and their department (`users { id department { name } }`), a naive resolver executes 1 query for the 50 users, and then 50 separate queries for each user's department (`1 + N = 51 queries`). In our architecture, we mitigate this in two ways:
> 1. At the ORM level via Objection's `withGraphFetched` (executes 2 batched SQL queries using `WHERE user_id IN (...)`).
> 2. At the GraphQL resolver level via **DataLoader**, which batches and deduplicates IDs across asynchronous resolver ticks.

#### Q2: Why is `BIGINT UNSIGNED` preferred over `UUIDv4` as an internal primary key in MariaDB InnoDB tables?
> **Answer**: 
> InnoDB stores tables as **Clustered Indexes** ordered by the primary key. 
> 1. Auto-incrementing `BIGINT` ensures sequential page appends at the end of the B+ Tree, avoiding expensive **page splits** and index fragmentation.
> 2. `BIGINT` takes 8 bytes vs 36 bytes for a UUID string (or 16 bytes for binary UUID), reducing memory footprint in the buffer pool and dramatically shrinking secondary index sizes.
> 3. For public-facing exposure, opaque cursors or external public IDs can be used without compromising internal clustering performance.

#### Q3: Why should composite indexes lead with `tenant_id`?
> **Answer**: 
> In B-Tree indexes, queries can only utilize an index if they match a **leftmost prefix** of the indexed columns. By placing `tenant_id` as the leading column `(tenant_id, status, deleted_at)`:
> 1. All tenant-scoped queries immediately prune 99%+ of the index B-tree.
> 2. Queries on `(tenant_id)` or `(tenant_id, status)` can reuse the same composite index.

#### Q4: How do database deadlocks occur in transactions, and what is the production mitigation?
> **Answer**: 
> Deadlocks occur when Transaction A locks Row 1 and waits for Row 2, while Transaction B locks Row 2 and waits for Row 1. 
> Mitigations:
> 1. **Consistent Lock Ordering**: Always acquire locks on rows in deterministic order (e.g., sort primary keys before locking).
> 2. **Short Transactions**: Minimize processing time inside the transaction boundary; perform network calls and slow hashing outside the transaction.
> 3. **Automatic Retry with Exponential Backoff & Jitter**: Catch MariaDB Error `1213: Deadlock found when trying to get lock` and retry the transaction after a randomized delay.

