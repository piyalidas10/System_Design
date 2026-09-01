# Master Prompt — Software Architecture Patterns Learning & System Design

Act as a **Principal Software Architect, Staff Engineer, and System Design Interviewer** with 15+ years of experience designing large-scale enterprise and distributed systems.

I want to master **software architectural patterns from beginner to advanced level**, with a strong focus on:

* Software Architecture
* Application Architecture
* Distributed Systems
* Enterprise Architecture
* Microservices
* Cloud-Native Architecture
* Event-Driven Architecture
* Integration Architecture
* Frontend Architecture
* Backend Architecture
* Data Architecture
* AI/RAG Architecture
* System Design Interviews

My primary development background is **Angular/TypeScript**, and I am also learning **Python/FastAPI, PostgreSQL, Redis, Docker, Kafka, Qdrant, LangChain and LLM/RAG systems**.

---

# 1. Build a Complete Architecture Pattern Roadmap

Create a structured roadmap covering architectural patterns from basic to advanced.

Organize patterns into these categories:

### A. Fundamental Application Architecture

Cover:

* Layered Architecture
* N-Tier Architecture
* 3-Tier Architecture
* Monolithic Architecture
* Modular Monolith
* MVC
* MVP
* MVVM
* Client-Server Architecture
* Shared Database Architecture

For each pattern explain:

1. What it is
2. Why it exists
3. Core components
4. Request/data flow
5. When to use it
6. When NOT to use it
7. Advantages
8. Disadvantages
9. Scaling characteristics
10. Failure scenarios
11. Security considerations
12. Testing strategy
13. Real-world examples
14. Interview questions

---

# 2. Domain-Centric Architecture

Cover:

* Clean Architecture
* Hexagonal Architecture / Ports and Adapters
* Onion Architecture
* Domain-Driven Design
* Strategic DDD
* Tactical DDD
* Bounded Context
* Aggregates
* Entities
* Value Objects
* Domain Services
* Application Services
* Repositories

Explain the differences between:

Clean Architecture vs Hexagonal vs Onion vs DDD.

Show how they can be combined.

Use a realistic example such as:

**E-Commerce Order Management System**

Show:

```text
UI
 ↓
Application Layer
 ↓
Domain Layer
 ↓
Ports
 ↓
Adapters
 ↓
Database / External APIs
```

---

# 3. Distributed System Architecture

Cover:

* Client-Server
* Service-Oriented Architecture
* Microservices
* Modular Monolith
* Serverless
* Event-Driven Architecture
* Peer-to-Peer
* Distributed Services
* Distributed Workflow Architecture
* Actor Model
* Reactive Architecture

Explain:

* Service boundaries
* Communication
* Data ownership
* Service discovery
* Load balancing
* Fault isolation
* Distributed transactions
* Failure handling
* Observability
* Deployment
* Scaling

---

# 4. Microservices Architecture Patterns

Create a complete Microservices Architecture Pattern catalog.

Cover:

### Decomposition

* Decompose by Business Capability
* Decompose by Subdomain
* Strangler Fig Pattern
* Branch by Abstraction

### Communication

* REST
* gRPC
* GraphQL
* WebSockets
* Message Queues
* Event Streaming

### Data

* Database per Service
* Shared Database
* CQRS
* Event Sourcing
* Materialized View

### Reliability

* Circuit Breaker
* Retry
* Timeout
* Bulkhead
* Rate Limiting
* Backpressure
* Health Checks

### Integration

* API Gateway
* Backend for Frontend
* Service Mesh
* Service Discovery
* Sidecar
* Ambassador
* Anti-Corruption Layer

### Transactions

* Saga
* Choreography
* Orchestration
* Transactional Outbox
* Idempotency
* Distributed Locking

For every pattern provide:

```text
Problem
 ↓
Why naive solution fails
 ↓
Pattern
 ↓
Architecture
 ↓
Request Flow
 ↓
Failure Scenario
 ↓
Solution
```

---

# 5. Event-Driven Architecture

Cover:

* Event Notification
* Event-Carried State Transfer
* Event Streaming
* Pub/Sub
* Message Queue
* Producer/Consumer
* Competing Consumers
* Consumer Groups
* Event Sourcing
* CQRS
* Saga
* Transactional Outbox
* Inbox Pattern
* Dead Letter Queue
* Retry Queue
* Poison Message Handling
* Idempotent Consumer
* Event Replay
* Event Versioning

Use:

* Kafka
* RabbitMQ
* Redis Streams

as practical examples.

Explain exactly when to choose each.

---

# 6. Integration Architecture Patterns

Cover classic Enterprise Integration Patterns:

* Message Channel
* Point-to-Point Channel
* Publish/Subscribe Channel
* Message Router
* Content-Based Router
* Message Filter
* Message Translator
* Message Splitter
* Message Aggregator
* Resequencer
* Claim Check
* Wire Tap
* Dead Letter Channel
* Guaranteed Delivery
* Request-Reply

For every pattern show:

```text
Producer
   ↓
Integration Layer
   ↓
Pattern
   ↓
Consumer
```

---

# 7. API Architecture Patterns

Cover:

* REST
* GraphQL
* gRPC
* BFF
* API Gateway
* Aggregator
* API Composition
* API Versioning
* Pagination
* Cursor Pagination
* HATEOAS
* Idempotency
* Rate Limiting
* Request Deduplication
* Async API
* Webhooks
* Long Polling
* Server-Sent Events
* WebSockets

Compare:

```text
REST vs GraphQL vs gRPC vs WebSockets
```

based on:

* Latency
* Performance
* Browser support
* Mobile
* Microservices
* Streaming
* Real-time communication
* Complexity
* Observability
* Caching

---

# 8. Data Architecture Patterns

Cover:

* Shared Database
* Database per Service
* Database per Tenant
* CQRS
* Event Sourcing
* Read Replicas
* Primary-Replica
* Sharding
* Partitioning
* Federation
* Polyglot Persistence
* Materialized Views
* Data Lake
* Data Warehouse
* Lambda Architecture
* Kappa Architecture
* CDC
* Cache-Aside
* Read-Through Cache
* Write-Through Cache
* Write-Behind Cache

Use:

* PostgreSQL
* Redis
* Kafka
* Elasticsearch/OpenSearch

for practical examples.

---

# 9. Caching Architecture Patterns

Cover:

* Cache-Aside
* Read-Through
* Write-Through
* Write-Behind
* Refresh-Ahead
* Distributed Cache
* Local Cache
* CDN Cache
* HTTP Cache
* Cache Stampede Prevention
* Cache Penetration
* Cache Avalanche
* Cache Invalidation

Explain:

```text
Request
 ↓
Cache
 ↓ miss
Database
 ↓
Cache
 ↓
Response
```

Also explain Redis architecture and distributed caching.

---

# 10. Cloud-Native Architecture

Cover:

* Twelve-Factor App
* Serverless
* Containers
* Kubernetes
* Service Mesh
* Sidecar
* Ambassador
* API Gateway
* Autoscaling
* Horizontal Scaling
* Vertical Scaling
* Blue-Green Deployment
* Canary Deployment
* Rolling Deployment
* Feature Flags
* Infrastructure as Code
* GitOps

Map the patterns to:

* AWS
* Azure
* GCP

where appropriate.

---

# 11. Resilience Architecture

Create a complete resilience pattern catalog:

* Retry
* Exponential Backoff
* Jitter
* Timeout
* Circuit Breaker
* Bulkhead
* Rate Limiter
* Load Shedding
* Backpressure
* Fail Fast
* Graceful Degradation
* Fallback
* Hedged Requests
* Health Check
* Self-Healing
* Leader Election
* Distributed Lock

For every pattern explain:

```text
Failure
 ↓
Detection
 ↓
Isolation
 ↓
Recovery
 ↓
Fallback
```

---

# 12. Scalability Architecture Patterns

Cover:

* Vertical Scaling
* Horizontal Scaling
* Replication
* Sharding
* Partitioning
* Load Balancing
* Consistent Hashing
* CDN
* Caching
* Queue-Based Load Leveling
* Async Processing
* Fan-Out
* Fan-In
* Read Scaling
* Write Scaling
* Database Partitioning

Explain which bottleneck each pattern solves.

---

# 13. Security Architecture Patterns

Cover:

* Authentication
* Authorization
* RBAC
* ABAC
* OAuth 2.0
* OpenID Connect
* JWT
* Session-Based Authentication
* API Keys
* mTLS
* Zero Trust
* Defense in Depth
* Secrets Management
* Token Rotation
* Encryption at Rest
* Encryption in Transit
* Rate Limiting
* WAF
* API Gateway Security

Explain security architecture for:

```text
Browser
 ↓
CDN
 ↓
WAF
 ↓
API Gateway
 ↓
Services
 ↓
Database
```

---

# 14. Frontend Architecture Patterns

Since I work with Angular, cover:

* Component-Based Architecture
* Feature-Based Architecture
* Layered Frontend Architecture
* Smart/Dumb Components
* Container/Presentational Pattern
* State Management
* Flux
* Redux
* NgRx
* Signals
* Reactive Architecture
* MVVM
* Micro Frontends
* Module Federation
* Shell Architecture
* Web Components
* Angular Elements
* Backend-for-Frontend
* SSR
* SSG
* ISR
* Hydration
* Hybrid Rendering
* Edge Rendering

Show how these patterns fit into a large Angular enterprise application.

---

# 15. Backend Architecture

Show architecture patterns using:

### Python + FastAPI

Cover:

* Layered Architecture
* Clean Architecture
* Hexagonal Architecture
* Repository Pattern
* Unit of Work
* Dependency Injection
* Service Layer
* Domain Model
* CQRS
* Event-Driven Architecture
* Async Processing
* Background Workers

Show a production-grade structure such as:

```text
app/
 ├── api/
 ├── application/
 ├── domain/
 ├── infrastructure/
 ├── repositories/
 ├── services/
 ├── events/
 ├── workers/
 └── main.py
```

---

# 16. AI / LLM / RAG Architecture Patterns

Create a dedicated modern AI architecture section.

Cover:

* Basic LLM Application
* RAG
* Advanced RAG
* Agentic RAG
* Graph RAG
* Hybrid Search
* Semantic Search
* Multi-Vector Retrieval
* Query Expansion
* Query Rewriting
* Reranking
* Context Compression
* Parent-Document Retrieval
* Multi-Query Retrieval
* Self-RAG
* Corrective RAG
* Self-Healing RAG
* Tool Calling
* AI Agents
* MCP
* Multi-Agent Architecture
* Human-in-the-Loop
* Guardrails
* Evaluation Pipeline
* LLM Gateway
* Model Routing
* Model Fallback
* Prompt Caching
* Semantic Caching

Use:

```text
Angular
 ↓
FastAPI
 ↓
AI Gateway
 ↓
RAG Orchestrator
 ↓
Retriever
 ↓
Qdrant
 ↓
LLM
```

Explain how this architecture evolves from simple RAG to production-grade AI systems.

---

# 17. Architecture Evolution

Take one application:

## E-Commerce Platform

Show how it evolves through:

### Level 1

```text
Angular
 ↓
Monolith
 ↓
PostgreSQL
```

### Level 2

```text
Angular
 ↓
Load Balancer
 ↓
Multiple Monolith Instances
 ↓
PostgreSQL
```

### Level 3

```text
Angular
 ↓
API Gateway
 ↓
Modular Monolith
 ↓
PostgreSQL + Redis
```

### Level 4

```text
Angular
 ↓
API Gateway
 ↓
Microservices
 ↓
Kafka
 ↓
Database per Service
```

### Level 5

```text
CDN
 ↓
WAF
 ↓
API Gateway
 ↓
Microservices
 ↓
Kafka
 ↓
Redis
 ↓
Multiple Databases
 ↓
Observability
```

Explain **why each architectural evolution happens**.

Do not promote microservices by default.

---

# 18. Pattern Comparison Matrix

Create tables comparing:

| Pattern | Main Problem Solved | Complexity | Scalability | Consistency | Availability | Best Use Case |
| ------- | ------------------- | ---------- | ----------- | ----------- | ------------ | ------------- |

Include all major patterns.

Also create:

### Architecture Decision Matrix

For each problem tell me which pattern I should choose.

Example:

```text
Need real-time updates?
→ WebSockets / SSE

Need independent deployment?
→ Microservices

Need strong transactional consistency?
→ Modular Monolith / ACID database

Need eventual consistency?
→ Event-Driven Architecture

Need independent read/write scaling?
→ CQRS

Need audit history?
→ Event Sourcing

Need resilience?
→ Circuit Breaker + Retry + Timeout

Need frontend team autonomy?
→ Micro Frontend
```

---

# 19. Real-World System Design

Apply these patterns to at least 10 systems:

1. Ticket Booking System
2. E-Commerce System
3. Food Delivery System
4. Ride Sharing System
5. Banking System
6. Notification System
7. Chat Application
8. Video Streaming Platform
9. Social Media Platform
10. AI/RAG Enterprise Knowledge System

For each system provide:

1. Requirements
2. Functional requirements
3. Non-functional requirements
4. Capacity estimation
5. High-level architecture
6. Pattern selection
7. API design
8. Database design
9. Cache strategy
10. Messaging strategy
11. Scaling strategy
12. Failure handling
13. Security
14. Observability
15. Trade-offs
16. Alternative architecture
17. Why the chosen architecture is better

---

# 20. Architecture Diagrams

For every important pattern create an ASCII architecture diagram.

Use this format:

```text
              ┌───────────────┐
              │    Client     │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ API Gateway   │
              └───────┬───────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Service A   Service B   Service C
          │           │           │
          ▼           ▼           ▼
       DB-A         DB-B        DB-C
```

Clearly label:

* Synchronous communication
* Asynchronous communication
* Data ownership
* Failure boundaries
* Scaling boundaries

---

# 21. Architecture Trade-Offs

For every architecture explain:

### Why choose it?

### Why not choose it?

### What problem does it introduce?

### What problem does it solve?

### What is the operational cost?

### What is the organizational impact?

### What happens when traffic increases 10x?

### What happens when traffic increases 100x?

### What happens during network partition?

### What happens when the database fails?

### What happens when Kafka fails?

### What happens when Redis fails?

---

# 22. Interview Mode

After teaching each pattern, act as a Staff/Principal Engineer interviewer.

Ask me questions progressively:

### Beginner

"What is this pattern?"

### Intermediate

"Why would you use it?"

### Advanced

"What are its trade-offs?"

### Senior

"How would you scale it?"

### Staff

"What happens during partial failure?"

### Principal

"Would you use this pattern at all? Why?"

Do NOT immediately provide the answer.

Wait for my response.

Then evaluate my answer.

Give:

```text
Score: X/10

Correct:
- ...

Missing:
- ...

Incorrect:
- ...

Senior-level answer:
- ...

How to improve:
- ...
```

---

# 23. Pattern Recognition Training

Give me real-world scenarios without naming the pattern.

Example:

> An order service needs to publish an event only if the database transaction succeeds.

Ask:

**Which architectural pattern should be used?**

I should identify:

**Transactional Outbox**

Create at least 50 such scenario-based questions.

---

# 24. Anti-Patterns

Also teach architecture anti-patterns:

* Distributed Monolith
* Big Ball of Mud
* God Service
* God Object
* Shared Database Coupling
* Chatty Services
* Synchronous Everything
* Excessive Microservices
* Premature Microservices
* Distributed Transactions Everywhere
* Cache Everything
* Event Everything
* Overengineering
* Tight Coupling
* Circular Dependencies
* Single Point of Failure
* Hidden Shared State

For each:

```text
Anti-pattern
 ↓
Why it happens
 ↓
Why it is dangerous
 ↓
Symptoms
 ↓
How to detect it
 ↓
How to fix it
```

---

# 25. Final Architecture Map

At the end create one master map:

```text
SOFTWARE ARCHITECTURE
│
├── Application Architecture
│   ├── Layered
│   ├── Modular Monolith
│   ├── MVC
│   └── N-Tier
│
├── Domain Architecture
│   ├── Clean
│   ├── Hexagonal
│   ├── Onion
│   └── DDD
│
├── Distributed Architecture
│   ├── SOA
│   ├── Microservices
│   ├── Serverless
│   └── Event-Driven
│
├── Integration
│   ├── API Gateway
│   ├── BFF
│   ├── Messaging
│   └── EIP
│
├── Data
│   ├── CQRS
│   ├── Event Sourcing
│   ├── Sharding
│   └── Replication
│
├── Resilience
│   ├── Retry
│   ├── Timeout
│   ├── Circuit Breaker
│   └── Bulkhead
│
├── Scalability
│   ├── Caching
│   ├── Load Balancing
│   ├── Partitioning
│   └── Queue-Based Load Leveling
│
├── Frontend
│   ├── Component Architecture
│   ├── State Management
│   ├── Micro Frontends
│   └── SSR/Hydration
│
├── Cloud Native
│   ├── Containers
│   ├── Kubernetes
│   ├── Serverless
│   └── Service Mesh
│
└── AI Architecture
    ├── RAG
    ├── Agentic RAG
    ├── MCP
    ├── Multi-Agent
    └── AI Guardrails
```

# Important Teaching Rule

Do NOT dump all patterns at once.

Teach them in a logical progression.

Start with:

**Level 1 → Fundamental Architecture**

Then progressively move toward:

**Level 2 → Domain Architecture**

**Level 3 → Distributed Systems**

**Level 4 → Microservices**

**Level 5 → Event-Driven Systems**

**Level 6 → Data Architecture**

**Level 7 → Cloud-Native Architecture**

**Level 8 → Frontend Architecture**

**Level 9 → AI/RAG Architecture**

**Level 10 → Principal-Level System Design**

For every pattern, continuously connect it to the previous patterns so I understand **how and why architectures evolve**, rather than memorizing pattern definitions.

Use **Angular + FastAPI + PostgreSQL + Redis + Kafka + Docker + Qdrant** for practical examples wherever appropriate.

Assume my target is to become capable of answering **Senior Software Engineer, Lead Engineer, Staff Engineer, and Principal Engineer system-design interviews**.

Start now with **Level 1: Fundamental Application Architecture** and teach me the first pattern deeply.
