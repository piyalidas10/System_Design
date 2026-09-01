# Fundamental Application Architecture Patterns

A comprehensive deep-dive into the ten most important application architecture patterns — covering structure, data flow, trade-offs, scaling, security, testing, and real-world usage. Essential reading for system design interviews and production engineering decisions.

---

## Table of Contents

1. [Layered Architecture](#1-layered-architecture)
2. [N-Tier Architecture](#2-n-tier-architecture)
3. [3-Tier Architecture](#3-3-tier-architecture)
4. [Monolithic Architecture](#4-monolithic-architecture)
5. [Modular Monolith](#5-modular-monolith)
6. [MVC — Model View Controller](#6-mvc--model-view-controller)
7. [MVP — Model View Presenter](#7-mvp--model-view-presenter)
8. [MVVM — Model View ViewModel](#8-mvvm--model-view-viewmodel)
9. [Client-Server Architecture](#9-client-server-architecture)
10. [Shared Database Architecture](#10-shared-database-architecture)

---

## 1. Layered Architecture

### What It Is

Layered Architecture (also called **n-layer architecture**) organises code into horizontal layers where each layer has a specific role and can only communicate with the layer directly below it. It is the most widely used architecture pattern in enterprise software.

```
┌──────────────────────────────────────────────┐
│           PRESENTATION LAYER                 │  ← User interface, API endpoints
├──────────────────────────────────────────────┤
│           APPLICATION LAYER                  │  ← Use cases, orchestration
├──────────────────────────────────────────────┤
│           BUSINESS / DOMAIN LAYER            │  ← Business rules, entities
├──────────────────────────────────────────────┤
│           PERSISTENCE / DATA LAYER           │  ← DB queries, repositories
├──────────────────────────────────────────────┤
│           DATABASE                           │  ← PostgreSQL, MongoDB, etc.
└──────────────────────────────────────────────┘

Each layer only calls the layer directly below it.
Upper layers depend on lower layers — never the reverse.
```

### Why It Exists

Before layered architecture, code was often written as a single tangled mass — UI code directly querying databases, business logic scattered everywhere. Layered architecture was introduced to enforce **separation of concerns**, making code maintainable, testable, and replaceable one layer at a time.

### Core Components

| Layer | Responsibility | Examples |
|---|---|---|
| **Presentation** | Receive requests, format responses | REST controllers, Angular components, React pages |
| **Application** | Orchestrate use cases, coordinate services | `UserRegistrationService`, `OrderPlacementService` |
| **Business/Domain** | Business rules, validations, domain logic | `User`, `Order`, `Invoice` domain objects |
| **Persistence** | Data access, queries, ORM | `UserRepository`, `OrderDAO`, TypeORM entities |
| **Database** | Storage and retrieval | PostgreSQL, MySQL, MongoDB |

### Request / Data Flow

```
HTTP Request
    │
    ▼
[Presentation Layer]   → validates input, parses request
    │
    ▼
[Application Layer]    → orchestrates: "register user" use case
    │
    ▼
[Business Layer]       → validates: password strength, email uniqueness rule
    │
    ▼
[Persistence Layer]    → UserRepository.save(user)
    │
    ▼
[Database]             → INSERT INTO users ...
    │
    ▼ (return path)
[Persistence Layer]    → returns saved User entity
    │
    ▼
[Business Layer]       → enriches entity, applies domain events
    │
    ▼
[Application Layer]    → maps to DTO
    │
    ▼
[Presentation Layer]   → serialises to JSON, returns HTTP 201
```

### When to Use It

- Enterprise applications with **complex business logic**
- Teams that value **clear separation of concerns**
- Projects requiring **high maintainability** over time
- When different teams own different layers (e.g., DBA team owns persistence)
- Applications that may need to **swap out a layer** (e.g., change database, change UI framework)

### When NOT to Use It

- Simple CRUD APIs with little business logic (over-engineering)
- Performance-critical systems where cross-layer overhead matters
- Microservices where each service is already small (adds unnecessary structure)
- Rapid prototypes (too much boilerplate)

### Advantages

- **Separation of concerns** — each layer has one job
- **Testability** — each layer can be unit tested independently
- **Replaceability** — swap database or UI without touching other layers
- **Understandability** — new developers know where to find things
- **Standardised patterns** — easy to onboard developers familiar with the pattern

### Disadvantages

- **Performance overhead** — every request passes through all layers
- **Tight coupling across layers** — a change in the DB schema can ripple up
- **Over-engineering** — simple CRUD apps don't need 5 layers
- **Sinkhole anti-pattern** — requests pass through layers that add no value (just forwarding calls)

### Scaling Characteristics

```
Scaling layered architecture:
┌─────────────────────────────────────────────────────┐
│ Presentation Layer → scale horizontally (load balancer + multiple instances)
│ Application Layer  → scale horizontally
│ Business Layer     → runs in-process, scales with application
│ Persistence Layer  → connection pooling (PgBouncer)
│ Database           → read replicas, sharding (biggest bottleneck)
└─────────────────────────────────────────────────────┘
Bottleneck: The database layer — all layers funnel requests into one DB.
```

### Failure Scenarios

| Failure | Impact | Mitigation |
|---|---|---|
| Database down | Entire application fails | Circuit breaker, read replicas, fallback cache |
| Persistence layer bug | Wrong data returned to all layers | Transaction rollback, repository unit tests |
| Business logic error | Silent data corruption | Domain object invariants, event sourcing |
| Presentation layer crash | Users can't access app | Multiple instances behind load balancer |

### Security Considerations

- **Presentation layer**: Input validation, authentication, CORS, rate limiting
- **Application layer**: Authorisation checks (does this user have permission?)
- **Business layer**: Business rule enforcement (e.g., can't transfer negative amounts)
- **Persistence layer**: Parameterised queries (prevent SQL injection), encrypted fields
- **Database**: Least-privilege DB user, encrypted at rest, VPC isolation

### Testing Strategy

```
Unit Tests:
  Business Layer  → test domain rules in isolation (no DB, no HTTP)
  Application Layer → test use cases with mocked repositories

Integration Tests:
  Persistence Layer → test repositories against a real (test) database

E2E Tests:
  Presentation → Application → Persistence → DB (full stack)
```

### Real-World Examples

- **Java Spring Boot** applications (Controller → Service → Repository → JPA)
- **ASP.NET MVC** (Controller → Service → Repository → Entity Framework)
- **Angular** frontend (Component → Service → HTTP Client → REST API)
- **Django** (Views → Forms/Serialisers → Models → ORM → PostgreSQL)

### Interview Questions

- *"What is the sinkhole anti-pattern in layered architecture?"*
  > When a layer simply passes requests through to the next layer without adding any logic — e.g., an Application layer that just calls the Repository directly with no use-case logic.
- *"How do you prevent tight coupling between layers?"*
  > Use interfaces/abstractions at layer boundaries. The Application layer depends on `IUserRepository` (interface), not `PostgresUserRepository` (concrete class).
- *"What's the difference between layered architecture and n-tier architecture?"*
  > Layered = logical separation (can run on same server). N-Tier = physical separation (each tier runs on different servers/processes).

---

## 2. N-Tier Architecture

### What It Is

N-Tier Architecture is the **physical deployment** counterpart to logical layered architecture. Each tier runs on a **separate physical or virtual machine**, communicating over a network. "N" can be any number — 2-tier, 3-tier, 4-tier, etc.

```
┌──────────────────────────────────────────────────────────────────┐
│                        N-TIER ARCHITECTURE                       │
│                                                                  │
│  ┌──────────────┐   HTTP/HTTPS  ┌──────────────┐                 │
│  │   TIER 1     │──────────────►│   TIER 2     │                 │
│  │  Web/Client  │               │  App Server  │                 │
│  │  Browser     │◄──────────────│  Business    │                 │
│  │  Mobile App  │               │  Logic       │                 │
│  └──────────────┘               └──────┬───────┘                 │
│                                        │ TCP/SQL                 │
│                                        ▼                         │
│                                 ┌──────────────┐                 │
│                                 │   TIER 3     │                 │
│                                 │  Database    │                 │
│                                 │  Server      │                 │
│                                 └──────────────┘                 │
│                                                                  │
│  Each tier is a physically separate process/server.              │
└──────────────────────────────────────────────────────────────────┘
```

### Why It Exists

N-Tier was designed to:
- **Scale tiers independently** — add more app servers without touching the database
- **Improve security** — database not directly reachable from the internet
- **Allow specialisation** — dedicated hardware per tier (e.g., GPU servers for ML tier)
- **Enable team separation** — separate teams per tier

### Core Components

| Tier | Typical Deployment | Role |
|---|---|---|
| **Client Tier** | Browser, mobile app | User interface only |
| **Web Tier** | Nginx, CDN | Static file serving, load balancing, SSL termination |
| **Application Tier** | App servers (Node.js, Java, Python) | Business logic, API |
| **Data Tier** | DB servers, caches | Data storage and retrieval |
| **Integration Tier** (optional) | Message queues, ESB | Async communication, third-party APIs |

### Request / Data Flow

```
Browser → (HTTPS) → Load Balancer (Web Tier)
                         │
                         ▼ (HTTP internal)
                    App Server Pool (App Tier)
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼ (TCP)               ▼ (TCP)
         Primary DB           Redis Cache
         (Data Tier)          (Cache Tier)
```

### When to Use It

- Regulatory environments requiring **network-level isolation** between tiers
- High-traffic applications where individual tiers need **independent scaling**
- Enterprise systems requiring **dedicated hardware** per tier
- When the database must be **completely isolated** from the internet

### When NOT to Use It

- Small applications (network latency between tiers adds overhead)
- Early-stage startups (infrastructure cost is high)
- Microservices architectures (N-Tier is about monolithic applications, not distributed services)

### Advantages

- **Independent scaling** per tier
- **Security isolation** — database not exposed to internet
- **Fault isolation** — a failing app server doesn't crash the database
- **Hardware optimisation** — SSD-optimised database servers, CPU-optimised app servers

### Disadvantages

- **Network latency** between tiers
- **Higher infrastructure cost** — separate servers for each tier
- **More complex deployment** — must coordinate upgrades across tiers
- **Single database tier** remains a bottleneck

### Scaling Characteristics

```
Web Tier:   → Scale out with more Nginx instances + CDN
App Tier:   → Scale out with autoscaling (AWS ASG / Kubernetes HPA)
Cache Tier: → Scale with Redis Cluster
Data Tier:  → Vertical scale first, then read replicas, then sharding
```

### Failure Scenarios

| Tier failure | Impact | Recovery |
|---|---|---|
| Web tier down | Users get connection error | Multiple instances + health checks |
| App tier down | API unavailable | Auto-scaling, circuit breakers |
| Cache tier down | All reads go to DB (load spike) | Fallback to DB, Redis Cluster |
| Data tier down | Full application failure | Multi-AZ standby, auto-failover |

### Security Considerations

- Place each tier in a separate **VPC subnet** or **security group**
- App Tier: only accepts traffic from Web Tier's security group
- Data Tier: only accepts traffic from App Tier's IP range
- No direct access from internet to Data Tier (no public IPs on DB)
- Use **bastion host** or **VPN** for DBA access to Data Tier

### Testing Strategy

- **Unit tests** at App Tier (business logic isolated)
- **Integration tests** between App Tier and Data Tier
- **Load tests** to validate each tier's capacity independently
- **Network tests** — simulate tier isolation (firewall rule testing)

### Real-World Examples

- Classic **Java EE** deployments (Web Tier: Apache → App Tier: JBoss/WebSphere → Data Tier: Oracle DB)
- **AWS three-tier web app**: CloudFront → EC2 Auto Scaling Group → RDS Multi-AZ
- **Banking systems**: DMZ web tier → internal app tier → isolated DB tier

### Interview Questions

- *"What's the difference between N-Tier and microservices?"*
  > N-Tier has physically separated layers of a **monolithic** application. Microservices are independent services by **business capability**, each with its own database.
- *"Why put a cache tier between the app and DB tier?"*
  > To reduce DB load for repeated reads, reduce latency, and prevent the DB from being the bottleneck on every request.

---

## 3. 3-Tier Architecture

### What It Is

3-Tier Architecture is the most common N-Tier deployment model, with exactly three physical tiers: **Presentation**, **Logic**, and **Data**. It is the standard architecture for the majority of web applications built between 1990 and today.

```
┌─────────────────────────────────────────────────────────────────┐
│                    3-TIER ARCHITECTURE                          │
│                                                                 │
│  TIER 1: PRESENTATION                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Browser / Mobile App / Desktop Client                   │   │
│  │  Renders UI, captures user input                         │   │
│  └──────────────────────────┬─────────────────────────────--┘   │
│                             │ HTTP / HTTPS                       │
│  TIER 2: APPLICATION LOGIC                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Web Server + Application Server                         │   │
│  │  (Node.js / Java / Python / .NET)                        │   │
│  │  Business rules, authentication, API endpoints           │   │
│  └──────────────────────────┬─────────────────────────────--┘   │
│                             │ SQL / TCP / ORM                    │
│  TIER 3: DATA               │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Database Server                                         │   │
│  │  (PostgreSQL / MySQL / MongoDB / Oracle)                 │   │
│  │  Data storage, retrieval, transactions                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Why It Exists

The 2-tier (client-server) model put business logic in the client, making maintenance and updates hard. The 3-tier model moves logic to a **dedicated application server**, making it easier to update, scale, and secure.

### Core Components

| Tier | Technology Examples | Role |
|---|---|---|
| **Presentation** | React, Angular, iOS, Android | UI rendering, user interaction |
| **Application** | Node.js, Spring Boot, Django, Rails | Business logic, APIs, auth |
| **Data** | PostgreSQL, MySQL, MongoDB, Redis | Persistent data storage |

### Request / Data Flow

```
User fills form → clicks Submit
    │
    ▼ HTTP POST /api/orders
[Tier 1: Browser]
    │
    ▼ HTTPS
[Tier 2: App Server]
  → Validates request
  → Authenticates JWT token
  → Calls OrderService.createOrder()
  → Applies business rules
    │
    ▼ SQL INSERT
[Tier 3: Database]
  → Persists order
  → Returns order ID
    │
    ▼ Returns to App Server
[Tier 2: App Server]
  → Maps to response DTO
    │
    ▼ HTTP 201 JSON
[Tier 1: Browser]
  → Shows confirmation
```

### When to Use It

- The vast majority of **web applications and REST APIs**
- Applications with **clear separation** between frontend and backend
- Systems needing **independent scaling** of app vs database
- Any application with more than trivial business logic

### When NOT to Use It

- Simple static websites (no logic tier needed — use CDN)
- Applications with extremely complex logic that needs further breakdown (→ microservices)
- Ultra-low-latency systems where any network hop is unacceptable

### Advantages

- **Simple and well-understood** — massive developer familiarity
- **Independent scaling** of each tier
- **DB protection** — app tier acts as a guard in front of the DB
- **Clear responsibilities** — frontend, backend, and DBA teams work independently
- **Flexible presentation** — multiple clients (web, mobile) share the same Tier 2

### Disadvantages

- **Tier 2 becomes a bottleneck** if not scaled horizontally
- **All tiers must be available** — failure of any tier fails the app
- **Latency** from two network hops (client → app → DB)
- **Monolithic application tier** — even with physical separation, Tier 2 is often a monolith

### Scaling Characteristics

```
Tier 1 (Presentation): CDN + browser caching — effectively infinite scale
Tier 2 (Application):  Horizontal scaling behind load balancer (most common approach)
Tier 3 (Data):         Vertical first, then read replicas; sharding for extreme scale
```

### Failure Scenarios

| Scenario | Impact | Mitigation |
|---|---|---|
| App server OOM | 503 errors | Autoscaling, memory limits, health checks |
| DB disk full | Writes fail, reads may work | Monitoring, alerting, disk expansion |
| Network partition Tier 2 → Tier 3 | All requests fail | Multi-AZ DB, connection retries |
| Tier 1 CDN outage | Static assets unavailable | Multi-CDN failover |

### Security Considerations

- **Tier 1 → Tier 2**: HTTPS only, CORS, JWT/OAuth2 authentication
- **Tier 2**: Input validation, SQL injection prevention, rate limiting, CSRF protection
- **Tier 2 → Tier 3**: Firewall rules (only Tier 2 IPs allowed), parameterised queries
- **Tier 3**: No public internet access, encrypted at rest, DB user with least privilege

### Testing Strategy

```
Tier 1:  Component tests (Jasmine/Jest), E2E tests (Cypress/Playwright)
Tier 2:  Unit tests (business logic), Integration tests (API + DB)
Tier 3:  DB migration tests, query performance tests
Full:    Contract tests (Pact), E2E smoke tests in staging
```

### Real-World Examples

- **Instagram** (React Native → Django API → PostgreSQL + Cassandra)
- **GitHub** (Browser → Rails → MySQL + Redis)
- **Airbnb** (React → Java/Ruby services → MySQL + Redis)
- Standard **AWS architecture**: CloudFront → EC2/ECS → RDS

### Interview Questions

- *"How would you scale the middle tier of a 3-tier app?"*
  > Make it stateless (sessions in Redis, no local state), then horizontally scale behind a load balancer using autoscaling groups or Kubernetes HPA.
- *"Why is a 3-tier architecture better than 2-tier for most web apps?"*
  > Logic is centralised on the server — easier to update, secure (DB not exposed to clients), and scalable without updating all clients.

---

## 4. Monolithic Architecture

### What It Is

A **Monolithic Architecture** is an application where all components — UI, business logic, and data access — are packaged and deployed as a **single deployable unit**. When you deploy, you deploy everything at once.

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONOLITHIC APPLICATION                        │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │                SINGLE DEPLOYABLE UNIT                  │    │
│   │                                                        │    │
│   │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │    │
│   │  │  User       │  │  Order      │  │  Payment      │  │    │
│   │  │  Module     │  │  Module     │  │  Module       │  │    │
│   │  └─────────────┘  └─────────────┘  └───────────────┘  │    │
│   │                                                        │    │
│   │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │    │
│   │  │  Inventory  │  │  Shipping   │  │  Notifications│  │    │
│   │  │  Module     │  │  Module     │  │  Module       │  │    │
│   │  └─────────────┘  └─────────────┘  └───────────────┘  │    │
│   │                                                        │    │
│   │  ┌──────────────────────────────────────────────────┐  │    │
│   │  │         Shared Database (Single Schema)          │  │    │
│   │  └──────────────────────────────────────────────────┘  │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                  │
│   Deploy = redeploy ENTIRE application                          │
└─────────────────────────────────────────────────────────────────┘
```

### Why It Exists

Monoliths are the **natural starting point** for any application. They are simpler to develop, debug, test, and deploy than distributed systems. Most successful companies (Netflix, Amazon, Airbnb) started as monoliths and migrated to microservices only when scale required it.

### Core Components

All of these live in a single codebase and are deployed together:
- **UI Layer** — web pages, templates, or API controllers
- **Business Logic** — all domain rules, services, workflows
- **Data Access Layer** — repositories, ORM models, queries
- **Shared Database** — one database schema for the entire application
- **Cross-cutting concerns** — logging, auth, config (in-process)

### Request / Data Flow

```
HTTP Request → Single Process
    │
    ├── Route Handler (in-process function call, no network)
    │
    ├── Service Layer  (in-process function call)
    │
    ├── Repository     (in-process function call)
    │
    └── Database       (single network hop)

All calls within the monolith are in-process — extremely fast.
```

### When to Use It

- **Greenfield projects** and startups — simplest way to start
- **Small teams** (< 10 engineers) — coordination overhead of microservices not worth it
- **Well-defined, stable domain** — when you don't know the service boundaries yet
- **Low-to-medium scale** — monoliths can handle millions of users with proper scaling
- **MVP / prototype** — get to market fast

### When NOT to Use It

- **Large teams** (50+ engineers) — deployment conflicts, merge conflicts become constant
- **Independent deployment requirements** — when teams need to deploy their features independently
- **Massively different scaling needs** — when the search feature needs 100× more resources than the checkout feature
- **Different technology requirements** — when one component needs Python ML and another needs Java for transactions

### Advantages

- **Simple to develop** — single codebase, one deployment, one language
- **Simple to test** — no distributed system complexity
- **Easy to debug** — single process, single log stream, single stack trace
- **Fast in-process calls** — no network overhead for internal calls
- **Simple transactions** — ACID transactions across the entire application
- **Easy to refactor** — IDE find-all-references works across the whole app

### Disadvantages

- **Deployment risk** — every change requires redeploying everything
- **Scaling inflexibility** — must scale the entire app even if only one module is the bottleneck
- **Technology lock-in** — hard to adopt new languages/frameworks for specific features
- **Growing complexity** — over time, modules become entangled ("Big Ball of Mud")
- **Long build and test times** — as the codebase grows, CI takes longer
- **Single point of failure** — a bug in any module can crash the whole app

### Scaling Characteristics

```
Vertical:   Increase server size (simplest for monoliths)
Horizontal: Run multiple instances behind a load balancer
            ⚠ Requires stateless design (sessions in Redis)
            ⚠ All instances must share the same DB

The bottleneck is almost always the database.
Feature-level scaling is impossible without decomposition.
```

### Failure Scenarios

| Scenario | Impact | Mitigation |
|---|---|---|
| Memory leak in one module | Entire app restarts | Health checks, auto-restart, fix the leak |
| Bad deployment | Entire app breaks | Blue-green deployment, canary releases |
| DB schema migration error | App crash on startup | Backward-compatible migrations, rollback scripts |
| Infinite loop in one service | Starves all other services of threads | Circuit breakers within the monolith |

### Security Considerations

- **All-or-nothing security** — a vulnerability in one module could affect all
- Monoliths are often easier to secure because the attack surface is a single known surface
- **Input validation** must be enforced at every entry point (controllers)
- **Authorisation** — every service method should check permissions, not just the controller
- Shared DB means **all modules see all data** — implement row-level security in DB

### Testing Strategy

```
Unit Tests:    Per service/module in isolation (fast, cheap)
Integration:   Multiple modules working together against a test DB
E2E Tests:     Full HTTP request through the full monolith
               (fast because no network between services)
Contract:      Not needed (all code is in one repo)
```

### Real-World Examples

- **Early Amazon** — single Perl application ("Obidos") before microservices
- **Early Netflix** — single Java monolith before breaking into services (2009–2012)
- **Basecamp** — deliberately monolithic Ruby on Rails application (still monolith today)
- **Stack Overflow** — primarily monolithic .NET application serving billions of requests
- **Shopify** — large Ruby on Rails monolith, transitioning slowly

### Interview Questions

- *"When would you choose a monolith over microservices?"*
  > At the start of any project. Microservices are a solution to organisational and scaling problems — you need to know your domain boundaries before splitting. A well-structured monolith outperforms a poorly designed distributed system.
- *"How do you scale a monolith?"*
  > Stateless horizontal scaling behind a load balancer, read replicas for the database, Redis for caching and session storage, CDN for static assets, and async queues for background work.

---

## 5. Modular Monolith

### What It Is

A **Modular Monolith** is a monolith that is intentionally structured into **well-defined, loosely coupled modules** that communicate through explicit internal interfaces — not by directly calling each other's internals. It is "ready to be split into microservices" if needed.

```
┌────────────────────────────────────────────────────────────────────┐
│                      MODULAR MONOLITH                              │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   SINGLE DEPLOYED UNIT                     │   │
│  │                                                            │   │
│  │  ┌───────────────────┐    ┌──────────────────────────┐    │   │
│  │  │  USER MODULE       │    │    ORDER MODULE           │    │   │
│  │  │  ─────────────── │    │  ──────────────────────  │    │   │
│  │  │  UserService      │    │  OrderService             │    │   │
│  │  │  UserRepository   │    │  OrderRepository          │    │   │
│  │  │  IUserFacade ◄────┼────┼──── calls IUserFacade    │    │   │
│  │  │  (public API)     │    │  (public API only)        │    │   │
│  │  └───────────────────┘    └──────────────────────────┘    │   │
│  │           │                           │                    │   │
│  │           │ Domain Events (in-process message bus)         │   │
│  │           └───────────────────────────┘                    │   │
│  │                                                            │   │
│  │  ┌───────────────────┐    ┌──────────────────────────┐    │   │
│  │  │  PAYMENT MODULE    │    │  NOTIFICATION MODULE      │    │   │
│  │  │  own private DB    │    │  subscribes to events     │    │   │
│  │  │  schema            │    │  (no direct coupling)     │    │   │
│  │  └───────────────────┘    └──────────────────────────┘    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  Modules are isolated. Cross-module calls go through IFacade only.│
└────────────────────────────────────────────────────────────────────┘
```

### Why It Exists

Monoliths naturally degrade into "Big Ball of Mud" as teams add cross-module dependencies. A modular monolith enforces boundaries **at the code level** (via interfaces and access modifiers) rather than network level, giving the benefits of modules without the operational complexity of microservices.

### Core Components

| Component | Purpose |
|---|---|
| **Module** | A self-contained unit with its own models, services, and repositories |
| **Module Facade / Public API** | The only interface through which other modules can call this module |
| **In-process Event Bus** | Modules communicate via events to decouple them further |
| **Shared Kernel** | Common types, utilities, and base classes (kept minimal) |
| **Module-private DB schema** | Each module owns its own DB tables (even in a shared DB) |

### Request / Data Flow

```
HTTP Request → OrderController (Order Module)
    │
    ├── OrderService (Order Module internal)
    │       │
    │       ├── UserModule.IUserFacade.getUser(userId)   ← only public API
    │       │       └── UserService (User Module internal — hidden)
    │       │
    │       ├── OrderRepository (Order Module internal)
    │       │
    │       └── Publishes: OrderCreatedEvent (in-process event bus)
    │
    ├── PaymentModule subscribes to OrderCreatedEvent
    └── NotificationModule subscribes to OrderCreatedEvent
```

### When to Use It

- Teams that want **microservice-like structure** without operational overhead
- Organisations preparing to **extract microservices** in the future
- Applications with **clear, stable domain boundaries**
- Medium-to-large teams (10–50 engineers) sharing a single codebase

### When NOT to Use It

- Very small applications (overkill)
- When teams genuinely need **independent deployment** (→ microservices)
- When modules have vastly different **scaling or technology requirements**

### Advantages

- **Clear boundaries** enforced by the compiler/linter — not just convention
- **Simpler than microservices** — no network calls, distributed transactions, or service meshes
- **Easy to evolve** — a well-defined module can be extracted to a microservice later
- **ACID transactions** still possible across modules (same DB process)
- **Single deployment** — operational simplicity of a monolith

### Disadvantages

- **Still a single deployment** — can't deploy modules independently
- **Shared process** — a catastrophic bug in one module can crash all
- **DB ownership is logical, not physical** — another module could bypass the interface and query directly
- **Requires discipline** — teams must enforce boundaries (code reviews, linting rules, architecture tests)

### Scaling Characteristics

Same as a monolith — horizontal scaling of the entire unit. However, modules being separate naturally prepares you for eventual microservice extraction with proper scaling.

### Failure Scenarios

| Scenario | Impact | Mitigation |
|---|---|---|
| Module A throws unhandled exception | May affect Module B if shared threads | Module-level error boundaries, isolated thread pools |
| Shared Kernel change breaks all modules | Build failure | Strict versioning of shared kernel, architecture tests |
| Circular module dependency introduced | Tight coupling | Architecture fitness functions (ArchUnit, Dependency Cruiser) |

### Security Considerations

- Each module can enforce its own authorisation rules via its facade
- Modules should not directly access other modules' DB tables — enforce via DB schema permissions
- Shared Kernel should not contain sensitive data — modules handle their own secrets

### Testing Strategy

```
Unit Tests:    Per-module, testing internals in isolation
Module Tests:  Test the module's public facade contract
Integration:   Two modules interacting through their facades
E2E:           Full stack end-to-end (same as monolith)
Architecture:  Use ArchUnit / Dependency Cruiser to enforce no direct cross-module internal access
```

### Real-World Examples

- **Shopify** (modular Rails monolith before extracting some microservices)
- **Stack Overflow** (modular .NET monolith)
- **Microsoft Orchard CMS** (modular ASP.NET monolith)
- **Angular Nx Monorepo** — enforces module boundaries via `nx enforce-module-boundaries`

### Interview Questions

- *"What's the difference between a modular monolith and a regular monolith?"*
  > A modular monolith enforces explicit boundaries between business domains via interfaces and events. A regular monolith often becomes a "Big Ball of Mud" where any code calls any other code.
- *"How do you enforce module boundaries in a codebase?"*
  > Via access modifiers (package-private in Java), barrel exports in TypeScript (only export from `index.ts`), architecture tests (ArchUnit, Dependency Cruiser), and CI checks.

---

## 6. MVC — Model View Controller

### What It Is

MVC separates an application into three distinct responsibilities: **Model** (data + business logic), **View** (user interface), and **Controller** (input handler + orchestrator). It is the oldest and most widely known UI architecture pattern.

```
┌──────────────────────────────────────────────────────────────┐
│                         MVC PATTERN                          │
│                                                              │
│   User Action                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐  updates  ┌──────────┐                         │
│  │CONTROLLER│──────────►│  MODEL   │                         │
│  │          │◄──────────│          │                         │
│  │ Handles  │ notifies  │ Data +   │                         │
│  │ input    │           │ Business │                         │
│  │ Routes   │           │ Logic    │                         │
│  └────┬─────┘           └──────────┘                         │
│       │ selects                │ observes                    │
│       ▼                        ▼                             │
│  ┌──────────────────────────────────┐                        │
│  │              VIEW                │                        │
│  │  Renders data, shows UI to user  │                        │
│  └──────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

### Why It Exists

Before MVC, UI logic and business logic were mixed in the same code. MVC was created to make code **testable**, **maintainable**, and to allow **different teams** to work on different layers without conflict.

### Core Components

| Component | Responsibility |
|---|---|
| **Model** | Data structure, business rules, validation, persistence (DB/API) |
| **View** | HTML/template rendering, user interface, event capture |
| **Controller** | Receives input, calls Model, decides which View to render |

### Request / Data Flow

```
1. User clicks "Submit"            → Browser fires event
2. Controller.handleSubmit()       → Controller receives input
3. Controller calls Model.save()   → Model validates and persists
4. Model returns result            → Controller receives data
5. Controller calls View.render()  → View displays updated UI
   (OR Model notifies View via Observer pattern)
```

### When to Use It

- **Server-side web frameworks** (Rails, Django, Laravel, Spring MVC)
- **Simple SPAs** where component acts as controller
- Applications with **stable, known UI patterns**

### When NOT to Use It

- Complex UIs with lots of two-way data binding (→ MVVM is better)
- Applications needing highly testable UI logic (→ MVP is better)
- Micro-frontend architectures (patterns are per-micro-frontend)

### Advantages

- **Widely understood** — huge community, tutorials, and examples
- **Separation of concerns** — logic separate from presentation
- **Parallel development** — front-end (View) and back-end (Controller/Model) teams work separately
- **Reusable Model** — same Model can serve multiple Views (web + mobile + API)

### Disadvantages

- **Fat Controller** anti-pattern — logic creeps into controller
- **View-Model coupling** — classic MVC allows View to directly observe Model (tight coupling)
- **Difficult to unit test View** — View depends on DOM/rendering
- **Not ideal for complex UIs** — two-way data binding is cumbersome

### Scaling Characteristics

- Model (services) scales horizontally
- Controllers are stateless — scale with app server instances
- Views are rendered per-request (server-side) or in browser (client-side)

### Failure Scenarios

| Scenario | Impact | Mitigation |
|---|---|---|
| Fat Controller with no transaction | Partial data saves | Move transactions to Model layer |
| View directly modifying Model state | Unpredictable UI state | Enforce one-way flow: View → Controller → Model |

### Security Considerations

- Controller: validate and sanitise all input before passing to Model
- Model: never trust controller-provided data without re-validation
- View: escape all user-generated content to prevent XSS

### Testing Strategy

```
Model:      Unit test business rules and validation (no DB)
Controller: Unit test with mocked Model
View:       Component tests / snapshot tests
E2E:        Cypress / Playwright for user journeys
```

### Real-World Examples

- **Ruby on Rails** — the canonical MVC web framework
- **Django** (technically MTV — Model Template View, same concept)
- **Spring MVC** — enterprise Java MVC
- **AngularJS (1.x)** — front-end MVC
- **Laravel** — PHP MVC framework

### Interview Questions

- *"What is the 'Massive View Controller' problem?"*
  > In iOS development, the View Controller takes on too many responsibilities (network calls, data transformation, UI logic), becoming thousands of lines long and untestable.
- *"How does MVC differ from MVVM?"*
  > In MVC, the Controller explicitly calls the View to update. In MVVM, the View observes the ViewModel's state via data binding — the ViewModel never directly calls the View.

---

## 7. MVP — Model View Presenter

### What It Is

MVP moves **all UI logic into a Presenter**, making the View completely passive. The View only knows how to display data — every decision is made by the Presenter, which communicates with the View through a strict interface.

```
┌──────────────────────────────────────────────────────────────────┐
│                          MVP PATTERN                             │
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────────────┐  │
│  │      VIEW        │◄────────────►│       PRESENTER          │  │
│  │  (Passive)       │  IView       │  All UI logic lives here │  │
│  │  No logic        │  interface   │  Calls Model             │  │
│  │  Implements      │              │  Updates View via IView  │  │
│  │  IView           │              └───────────┬──────────────┘  │
│  └──────────────────┘                          │                 │
│         ▲                                      │ calls           │
│         │ NEVER directly                       ▼                 │
│         └────────────X──────────── ┌──────────────────────────┐  │
│                                    │          MODEL            │  │
│                                    │  Data + Business Logic   │  │
│                                    └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Why It Exists

MVC's testability problem: the View can directly observe the Model, and Controllers often hold references to concrete View implementations. MVP solves this by making the **View an interface** — the Presenter can be tested with a mock View, with zero DOM dependency.

### Core Components

| Component | Responsibility |
|---|---|
| **Model** | Data, business logic, API calls |
| **View** | Implements `IView` interface; passive display and event delegation |
| **IView Interface** | Contract defining what the View exposes to the Presenter |
| **Presenter** | All presentation logic; calls Model; updates View via IView |

### Request / Data Flow

```
1. User clicks "Load"              → View.onLoadClick()
2. View delegates to Presenter     → Presenter.onLoad()
3. Presenter calls Model           → Model.fetchUsers()
4. Presenter handles result        → formats, validates
5. Presenter calls IView method    → view.showUsers(formattedData)
6. View renders                    → updates DOM
   (Presenter never touches DOM)
```

### When to Use It

- Android development (Java/Kotlin with Activities/Fragments)
- WinForms / WPF applications (before MVVM was popularised)
- Any scenario requiring **maximum testability** of UI logic
- Codebases where the View technology may **change** (Web → Mobile)

### When NOT to Use It

- Modern SPA frameworks with data binding (MVVM is more natural)
- Simple UIs where the IView boilerplate isn't worth it

### Advantages

- **Presenter is 100% unit testable** — no DOM, no framework dependency
- **View is interchangeable** — mock the IView interface in tests
- **View-Model decoupled** — View and Model never communicate
- **Clear contract** — IView defines exactly what the View must provide

### Disadvantages

- **More boilerplate** — requires IView interfaces per component
- **One-to-one coupling** — Presenter is tied to one specific View's interface
- **Manual updates** — Presenter must explicitly call each IView method (no auto-binding)

### Testing Strategy

```
Presenter:  Unit test with MockView (implements IView) — no DOM needed
Model:      Unit test business rules in isolation
View:       Minimal UI tests (only rendering is tested, not logic)
```

### Real-World Examples

- **Android Clean Architecture** (Google's recommended pattern for Android)
- **WinForms applications** in .NET ecosystem
- **React with explicit presenter classes** (less common today)

### Interview Questions

- *"Why is the Presenter more testable than the Controller in MVC?"*
  > The Presenter depends on an IView interface, not a concrete UI class. In tests, you inject a mock that implements IView — no browser, no DOM, no framework needed.

---

## 8. MVVM — Model View ViewModel

### What It Is

MVVM introduces a **ViewModel** that exposes **reactive state** for the View to bind to. Instead of the ViewModel calling the View, the View automatically reacts to ViewModel state changes through **data binding**.

```
┌──────────────────────────────────────────────────────────────────┐
│                         MVVM PATTERN                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        VIEW                              │   │
│  │  {{ user.name }}  [disabled]="isLoading"  (click)="save" │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │ Two-Way / One-Way Data Binding    │
│                              │ (automatic — no explicit call)    │
│  ┌───────────────────────────┴──────────────────────────────┐   │
│  │                     VIEWMODEL                            │   │
│  │  users$: Observable<User[]>     isLoading$: Observable   │   │
│  │  saveUser(): void               error$: Observable       │   │
│  │  (ViewModel has ZERO knowledge of the View)              │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │ calls                             │
│  ┌───────────────────────────┴──────────────────────────────┐   │
│  │                       MODEL                              │   │
│  │  UserService, HttpClient, Repositories, Store            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Why It Exists

MVP's weakness: the Presenter is tightly coupled to one specific View's interface and must manually call each update method. MVVM solves this with data binding — the ViewModel publishes state, the View subscribes automatically. The ViewModel becomes framework-agnostic.

### Core Components

| Component | Responsibility |
|---|---|
| **Model** | Data services, HTTP, business logic |
| **ViewModel** | Reactive state (Observables/Signals), commands, data transformation |
| **View** | Declarative template with binding expressions — zero logic |
| **Data Binding Engine** | Connects ViewModel properties to View elements automatically |

### Request / Data Flow

```
1. User clicks "Save"              → View fires (click)="saveUser()"
2. ViewModel.saveUser() executes   → ViewModel calls Model
3. Model.save() returns Observable → ViewModel subscribes
4. ViewModel updates state         → isLoading$.next(false)
5. Data binding engine detects     → View re-renders automatically
   state change
   (ViewModel never calls View — View observes ViewModel)
```

### When to Use It

- **Angular** (canonical MVVM framework)
- **Vue.js** with Composition API
- **React** with hooks (hooks act as ViewModel)
- **SwiftUI** and **Jetpack Compose** (declarative UI frameworks)
- Any application with **reactive, event-driven UIs**

### When NOT to Use It

- Simple server-rendered pages (MVC is sufficient)
- Applications without data binding support
- Very simple forms with no reactive requirements

### Advantages

- **ViewModel is framework-independent** — can be tested without any UI framework
- **Automatic UI updates** — no manual `view.showUsers()` calls
- **Reactive by nature** — composable streams (RxJS, Signals) handle complex async UI
- **Declarative Views** — template reads like a specification, not imperative code

### Disadvantages

- **Learning curve** for reactive programming (RxJS, Signals, computed)
- **Debugging data binding** can be tricky (template errors are sometimes cryptic)
- **Over-reactive** — subscriptions must be properly cleaned up to avoid memory leaks
- **Complex for simple UIs** — overkill for a static display page

### Testing Strategy

```
ViewModel:  Unit test reactive streams with marble testing (RxJS TestScheduler)
            or with Signals synchronously — no DOM needed
Model:      Unit test services with mocked HTTP (HttpClientTestingModule)
View:       Component tests verify binding expressions render correctly
E2E:        Cypress / Playwright for user journeys
```

### Real-World Examples

- **Angular** (Components + Services = ViewModel + Model)
- **Vue 3** (Composition API `setup()` = ViewModel)
- **React** (custom hooks = ViewModel, JSX = View)
- **WPF / MAUI** (original MVVM home — Microsoft)
- **SwiftUI** (ObservableObject = ViewModel)

### Interview Questions

- *"How does MVVM differ from MVP?"*
  > In MVP, the Presenter explicitly calls view methods (`view.showUsers(data)`). In MVVM, the ViewModel exposes reactive state and the View binds to it automatically — the ViewModel never references the View.
- *"How do you test a ViewModel without a browser?"*
  > The ViewModel is pure TypeScript/Kotlin/Swift with no DOM references. Inject mock services, trigger commands, and assert on the emitted observable values or signal states.

---

## 9. Client-Server Architecture

### What It Is

Client-Server Architecture divides computation between **clients** (which request services) and **servers** (which provide services). The client and server are separate processes, typically on separate machines, communicating over a network.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SERVER ARCHITECTURE                        │
│                                                                      │
│   ┌─────────────┐                         ┌─────────────────────┐   │
│   │  CLIENT 1   │                         │                     │   │
│   │  (Browser)  │────────── HTTP ────────►│                     │   │
│   └─────────────┘                         │                     │   │
│                                           │      SERVER         │   │
│   ┌─────────────┐                         │                     │   │
│   │  CLIENT 2   │────────── HTTP ────────►│  Processes requests │   │
│   │  (Mobile)   │                         │  Stores data        │   │
│   └─────────────┘                         │  Enforces rules     │   │
│                                           │                     │   │
│   ┌─────────────┐                         │                     │   │
│   │  CLIENT 3   │────────── HTTP ────────►│                     │   │
│   │  (Desktop)  │                         └──────────┬──────────┘   │
│   └─────────────┘                                    │              │
│                                                       ▼              │
│                                            ┌─────────────────────┐  │
│                                            │      DATABASE        │  │
│                                            └─────────────────────┘  │
│                                                                      │
│   Clients: request only. Servers: serve only.                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Why It Exists

Before client-server, mainframe terminals had no intelligence — all processing was centralised. Client-server distributed computation between powerful clients and shared servers, enabling **resource sharing**, **centralised data management**, and **multi-user access**.

### Core Components

| Component | Role |
|---|---|
| **Client** | Initiates requests, renders UI, local processing |
| **Server** | Responds to requests, enforces business rules, manages data |
| **Network / Protocol** | HTTP, WebSocket, gRPC, TCP/IP — the communication channel |
| **Request/Response** | The fundamental communication pattern |

### Request / Data Flow

```
Client                                  Server
  │                                        │
  │── Request (HTTP GET /api/products) ───►│
  │                                        │── Authenticate
  │                                        │── Authorise
  │                                        │── Query DB
  │                                        │── Format response
  │◄── Response (200 OK, JSON body) ───────│
  │                                        │
  │ (Connection closed — stateless HTTP)   │
```

### When to Use It

- **Virtually all web and mobile applications** — client-server is the de facto internet architecture
- Any time **multiple clients** need to share **centralised data**
- When **centralised control** over data and business rules is required

### When NOT to Use It

- Peer-to-peer applications (BitTorrent, blockchain) — no central server
- Offline-first applications (→ local storage + sync when connected)
- Edge computing scenarios where latency to a central server is unacceptable

### Advantages

- **Centralised data** — all clients see consistent data
- **Security** — server enforces rules, clients can't bypass them
- **Scalability** — server infrastructure can be upgraded independently
- **Maintainability** — update server logic without touching all clients
- **Multi-platform** — one server serves web, iOS, Android, desktop clients

### Disadvantages

- **Single point of failure** — if the server is down, all clients are affected
- **Network dependency** — no server = no service (offline unusable)
- **Server bottleneck** — all clients share server resources
- **Latency** — every action requires a round trip to the server

### Scaling Characteristics

```
Client:   Scales infinitely (each client is independent)
Server:   Scales horizontally (multiple server instances behind load balancer)
          Scales vertically (larger server)
Database: The true bottleneck — scaled via replicas, sharding, caching

The fundamental challenge: as clients grow, server and DB must scale proportionally.
```

### Failure Scenarios

| Scenario | Impact | Mitigation |
|---|---|---|
| Server crash | All clients get errors | Multiple server instances, load balancer health checks |
| Network partition | Client can't reach server | Graceful offline mode, retry logic |
| Server overloaded | Slow responses / timeouts | Rate limiting, autoscaling, caching |
| DB failure | Server can't serve data | Failover replicas, circuit breaker |

### Security Considerations

- **Authentication**: Server verifies client identity (JWT, OAuth2, session cookies)
- **Authorisation**: Server enforces what each client can do (RBAC, ABAC)
- **Transport security**: All communication over TLS (HTTPS)
- **Input validation**: Server never trusts client-provided data
- **Rate limiting**: Prevent one client from overwhelming the server

### Testing Strategy

```
Client:   Unit tests (component logic), E2E tests (UI interactions)
Server:   Unit tests (business logic), Integration tests (API + DB)
Network:  Contract tests (Pact) — verify client and server agree on API shape
Load:     K6 / JMeter — test server under simulated client load
```

### Real-World Examples

- **Every web application** — browser is client, web server is server
- **Email** — email client (Outlook) and email server (Exchange/Gmail)
- **Online banking** — mobile app (client) and bank server
- **REST APIs** — quintessential client-server pattern

### Interview Questions

- *"Is HTTP stateless? How do you handle user sessions?"*
  > HTTP is stateless by design. Sessions are maintained by sending a session ID in a cookie or JWT in a header on every request. The server validates it on each request.
- *"How would you make a client-server app work offline?"*
  > Service Worker for caching, IndexedDB for local storage, background sync API to queue actions and replay when connection is restored.

---

## 10. Shared Database Architecture

### What It Is

In Shared Database Architecture, **multiple applications or services read from and write to the same database**. It is a common integration pattern in legacy enterprise systems and is actively discouraged in modern microservices but still widely used.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SHARED DATABASE ARCHITECTURE                       │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │   APPLICATION A  │    │   APPLICATION B  │    │ APPLICATION C │  │
│  │  Order Service   │    │  Invoice Service │    │ Report Service│  │
│  └────────┬─────────┘    └────────┬─────────┘    └───────┬───────┘  │
│           │                       │                       │          │
│           └───────────────────────┴───────────────────────┘          │
│                                   │                                  │
│                                   ▼                                  │
│           ┌─────────────────────────────────────────────────┐        │
│           │             SHARED DATABASE                      │        │
│           │                                                 │        │
│           │   orders    invoices    users    products        │        │
│           │   (tables visible and writable by ALL services) │        │
│           └─────────────────────────────────────────────────┘        │
│                                                                      │
│  Any application can read/write any table at any time.              │
└─────────────────────────────────────────────────────────────────────┘
```

### Why It Exists

Sharing a database is the **simplest integration mechanism** — services communicate by reading and writing shared tables rather than building APIs. It emerged naturally in monolith-to-service migrations and in enterprises where multiple applications need the same data.

### Core Components

| Component | Role |
|---|---|
| **Shared Database** | Single DB instance/schema accessible by all applications |
| **Multiple Applications** | Each app reads/writes to the shared schema directly |
| **Shared Schema** | Tables, views, and stored procedures shared across apps |
| **Connection Pool** | Each app has its own connection pool to the shared DB |

### Request / Data Flow

```
App A: INSERT INTO orders (user_id, total) VALUES (1, 99.99);
App B: SELECT * FROM orders WHERE user_id = 1;  ← reads App A's data
App C: UPDATE orders SET status = 'shipped' WHERE id = 42;  ← modifies App A's data
```

### When to Use It

- **Legacy system integration** — easiest way to connect multiple apps to the same data
- **Small teams** sharing a single database without API overhead
- **Reporting services** — read-only access to operational data
- **Database views** — expose a safe subset of data to external applications

### When NOT to Use It

- **Microservices architectures** — violates the "database per service" principle
- When applications need **independent evolution** of their data schema
- **High-concurrency write scenarios** — lock contention across apps
- When **data ownership** needs to be clearly defined per service

### Advantages

- **Simplest integration** — no API contracts, no message queues
- **Strong consistency** — all apps see the same data immediately (ACID)
- **Easy ad-hoc queries** — any app can join across any tables
- **Low latency** — no API overhead for data access

### Disadvantages

- **Tight coupling** — a schema change in one service breaks all others
- **No clear data ownership** — any service can corrupt any other service's data
- **Deployment coupling** — DB migrations must be coordinated across all services
- **Performance risk** — one bad query from App C can starve Apps A and B
- **Security risk** — App B can read App A's sensitive data without authorisation
- **Impossible to scale services independently** — all services compete for the same DB connections

### Scaling Characteristics

```
The shared DB is a single bottleneck for ALL services.
Read scaling:  Add read replicas (all services point reads at replicas)
Write scaling: Very limited — all writes go to one primary
               Sharding is complex because services share the schema

This is the primary reason microservices adopt "database per service" — 
to allow each service's data store to scale independently.
```

### Failure Scenarios

| Scenario | Impact | Mitigation |
|---|---|---|
| Runaway query from App C | Locks tables, starves Apps A and B | Query timeouts, pg_stat_activity monitoring, kill queries |
| Schema migration for App A | Breaks Apps B and C if columns removed | Backward-compatible migrations (add before remove), blue-green schema changes |
| DB down | ALL applications fail simultaneously | HA DB cluster, failover replica |
| Connection pool exhaustion | Some apps can't connect | Per-app connection limits, PgBouncer |

### Security Considerations

- **All data exposed to all apps** — a compromised App C can read all tables
- **Use database schemas / roles** to restrict access: App A gets only `orders_schema`, App B gets `invoices_schema`
- **Row-level security (RLS)** in PostgreSQL to restrict row access per DB user
- **Read-only roles** for reporting services — prevent accidental writes
- **Audit logging** — track which application made which query

### Testing Strategy

```
Per-app:         Unit test each app's logic with a mocked DB
Integration:     Test each app against a shared test DB with test data
Migration tests: Verify schema changes don't break other apps (contract tests)
Load tests:      Test all apps running simultaneously against the shared DB
```

### Real-World Examples

- **Enterprise ERP systems** — SAP, Oracle — multiple modules sharing one Oracle DB
- **Legacy banking systems** — 10+ applications reading the same core banking tables
- **Monolith-to-services migrations** — first step is often sharing the existing DB
- **Data warehouse** — multiple operational systems writing to a central analytics DB

### Interview Questions

- *"Why is shared database considered an anti-pattern in microservices?"*
  > Because it creates tight coupling between services through the database schema. A schema change in one service requires coordinated changes in all services. Services cannot be deployed independently.
- *"How would you migrate from a shared database to database-per-service?"*
  > Strangler Fig pattern: 1) Identify which tables each service owns. 2) Create API endpoints for cross-service data access. 3) Migrate one service at a time to its own DB. 4) Replace direct DB reads with API calls. 5) Remove foreign keys and shared tables.

---

## Architecture Comparison Matrix

| Pattern | Deployment | Coupling | Scalability | Complexity | Best For |
|---|---|---|---|---|---|
| **Layered** | Single unit | Medium | Vertical + Horizontal | Low | Enterprise apps, clear separation of concerns |
| **N-Tier** | Multiple physical tiers | Medium | Per-tier | Medium | Network security, independent tier scaling |
| **3-Tier** | 3 physical tiers | Medium | Per-tier | Medium | Most web applications (the default choice) |
| **Monolithic** | Single unit | High | Horizontal (whole app) | Low initially, grows | Greenfield, small teams, MVPs |
| **Modular Monolith** | Single unit | Low (by design) | Horizontal (whole app) | Medium | Growing teams, pre-microservice step |
| **MVC** | Varies | Medium | Horizontal (controllers) | Low | Server-side web apps, simple SPAs |
| **MVP** | Varies | Low | Horizontal | Medium | Android, max testability |
| **MVVM** | Varies | Very low | Horizontal | Medium | Angular, Vue, React, modern SPAs |
| **Client-Server** | 2+ tiers | Medium | Server horizontal | Low | All web and mobile apps |
| **Shared Database** | Multiple apps, 1 DB | Very High | Very limited | Low initially | Legacy, reporting, simple integration |

---

## Choosing the Right Architecture

```
Is this a new project or startup?
└── YES → Start with Monolith (or Modular Monolith if team > 5)
          "Make it work, then make it right"

Is it a web application?
└── YES → 3-Tier Architecture for deployment
          Choose UI pattern based on framework:
          ├── Server-rendered (Rails/Django) → MVC
          ├── Component framework (Angular/Vue) → MVVM
          └── Android / max testability → MVP

Does the team need strict layer separation?
└── YES → Layered Architecture
          (can be deployed as 3-Tier physically)

Is the team growing and the monolith getting hard to manage?
└── YES → Refactor to Modular Monolith first
          → Extract to microservices only when module boundaries are proven

Are multiple legacy applications sharing a database?
└── YES → You have Shared Database Architecture
          → Plan migration: identify ownership, add APIs, split DB

Do you need physical network isolation between components?
└── YES → N-Tier Architecture with firewall rules per tier
```

---

## Golden Rules of Application Architecture

> 1. **Start simple.** A well-structured monolith outperforms a poorly designed distributed system.
> 2. **Separate what changes at different rates.** UI changes faster than business logic; business logic changes faster than data structures.
> 3. **The Model never knows about the View** (MVC/MVP/MVVM golden rule).
> 4. **Database is not integration.** Services should communicate via APIs, not shared DB tables.
> 5. **Every architectural decision is a trade-off.** There is no universally correct answer — only context-appropriate answers.
> 6. **Design for replaceability.** Every dependency that points inward (toward business logic) should be an interface.
> 7. **Horizontal scaling requires statelessness.** No local state on app servers.

---

*Related: Microservices Architecture, Event-Driven Architecture, CQRS, Clean Architecture, Hexagonal Architecture, Domain-Driven Design, System Design Interviews*
