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
- [ ] **Phase 1: Database Schema, Multi-Tenant Migrations & Objection.js Base Models**
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
