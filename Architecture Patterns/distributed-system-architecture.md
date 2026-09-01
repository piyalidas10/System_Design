# Distributed System Architecture

A comprehensive guide to eleven distributed system architecture patterns — covering service boundaries, communication, data ownership, service discovery, load balancing, fault isolation, distributed transactions, failure handling, observability, deployment, and scaling.

---

## Table of Contents

1. [Client-Server Architecture](#1-client-server-architecture)
2. [Service-Oriented Architecture (SOA)](#2-service-oriented-architecture-soa)
3. [Microservices Architecture](#3-microservices-architecture)
4. [Modular Monolith](#4-modular-monolith)
5. [Serverless Architecture](#5-serverless-architecture)
6. [Event-Driven Architecture (EDA)](#6-event-driven-architecture-eda)
7. [Peer-to-Peer Architecture (P2P)](#7-peer-to-peer-architecture-p2p)
8. [Distributed Services Architecture](#8-distributed-services-architecture)
9. [Distributed Workflow Architecture](#9-distributed-workflow-architecture)
10. [Actor Model Architecture](#10-actor-model-architecture)
11. [Reactive Architecture](#11-reactive-architecture)
12. [Cross-Cutting Concerns Deep Dive](#12-cross-cutting-concerns-deep-dive)
13. [Pattern Comparison Matrix](#13-pattern-comparison-matrix)
14. [Choosing the Right Pattern](#14-choosing-the-right-pattern)

---

## 1. Client-Server Architecture

### What It Is

The foundational distributed pattern. **Clients** request services; **servers** provide them. All communication is initiated by the client over a network. The server holds centralised data and enforces business rules.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SERVER                                     │
│                                                                     │
│  ┌──────────┐                          ┌──────────────────────┐     │
│  │ Client 1 │──── HTTP/gRPC/WebSocket ─►│                      │     │
│  │ (Browser)│                          │       SERVER         │     │
│  └──────────┘                          │  Business Logic      │     │
│  ┌──────────┐                          │  Auth                │     │
│  │ Client 2 │──────────────────────────►│  API endpoints       │     │
│  │ (Mobile) │◄─────────────────────────│                      │     │
│  └──────────┘      Response            └──────────┬───────────┘     │
│  ┌──────────┐                                     │                 │
│  │ Client 3 │──────────────────────────────────── │                 │
│  │(Desktop) │                                     ▼                 │
│  └──────────┘                            ┌──────────────────┐       │
│                                          │    DATABASE       │       │
│                                          └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries
Single server; no internal service boundaries. One codebase handles all requests.

### Communication
- **Protocol**: HTTP/HTTPS, WebSocket, gRPC, TCP/IP
- **Pattern**: Request-Response (synchronous)
- **Initiated by**: Always the client

### Data Ownership
Centralised — one server owns all data. Database is shared by all client sessions.

### Service Discovery
Not applicable — clients connect to a known server hostname/IP.

### Load Balancing
DNS round-robin or a load balancer distributes clients across multiple server instances.

### Fault Isolation
Low — if the server crashes, all clients are affected simultaneously.

### Distributed Transactions
Not applicable — single server, local ACID transactions.

### Failure Handling

| Failure | Impact | Mitigation |
|---|---|---|
| Server crash | All clients get errors | Multiple instances + load balancer |
| DB failure | Server can't serve data | DB failover replica |
| Network partition | Client can't reach server | Retry logic, offline fallback |

### Observability
- Server-side logs, metrics (CPU, memory, request count, error rate)
- APM tools: New Relic, Datadog

### Deployment
Single deployable — deploy the server, update, roll back as one unit.

### Scaling
- **Vertical**: Upgrade server hardware
- **Horizontal**: Multiple stateless server instances behind a load balancer; sessions in Redis

---

## 2. Service-Oriented Architecture (SOA)

### What It Is

**SOA** decomposes a large application into **coarse-grained, reusable services** that communicate via an **Enterprise Service Bus (ESB)**. Services expose standardised contracts (WSDL/SOAP or REST). SOA was the dominant enterprise integration pattern in the 2000s.

```
┌─────────────────────────────────────────────────────────────────────┐
│                SERVICE-ORIENTED ARCHITECTURE (SOA)                   │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │  Web     │   │  Mobile  │   │  Partner │   │  Legacy System   │ │
│  │  Portal  │   │  App     │   │  API     │   │  (Mainframe)     │ │
│  └─────┬────┘   └─────┬────┘   └─────┬────┘   └────────┬─────────┘ │
│        │              │              │                  │           │
│        └──────────────┴──────────────┴──────────────────┘           │
│                                  │                                  │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │           ENTERPRISE SERVICE BUS (ESB)                        │  │
│  │  Routing │ Transformation │ Orchestration │ Protocol Bridge   │  │
│  │  Security│ Logging        │ Load Balancing│ Message Queue     │  │
│  └──────────┬──────────────────────────────────────────────────--┘  │
│             │                                                       │
│    ┌────────┴─────────────────────────────────────┐                 │
│    │                                              │                 │
│    ▼                    ▼                         ▼                 │
│ ┌──────────┐     ┌──────────────┐        ┌────────────────┐        │
│ │ Customer │     │ Order        │        │ Payment        │        │
│ │ Service  │     │ Service      │        │ Service        │        │
│ │ (SOAP)   │     │ (REST)       │        │ (SOAP)         │        │
│ └──────────┘     └──────────────┘        └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries
**Coarse-grained** — services map to business capabilities (Customer Service, Order Service). One service may handle dozens of operations. Services are typically large and share a common data model.

### Communication
- **Protocol**: SOAP over HTTP, REST, JMS/AMQP via ESB
- **ESB**: Central hub for routing, transformation, orchestration
- **Pattern**: Synchronous request-response OR async messaging through the bus
- **Contract**: WSDL (SOAP), OpenAPI (REST)

### Data Ownership
Often **shared** — SOA services frequently share a central enterprise database. This is one of SOA's main weaknesses.

### Service Discovery
Centralised through the **ESB** — clients don't need to know service locations; ESB routes requests.

### Load Balancing
Done by the ESB or a separate load balancer in front of each service cluster.

### Fault Isolation
**Low-to-medium** — ESB is a single point of failure. If the ESB fails, all services are unreachable. ESB introduces latency for all calls.

### Distributed Transactions
SOA often uses **WS-AtomicTransaction (WS-AT)** or compensating transactions for cross-service consistency.

### Failure Handling

| Failure | Impact | Mitigation |
|---|---|---|
| ESB overload | All services slow | ESB clustering, separate ESB per domain |
| Service timeout | ESB retries, may cause duplicates | Idempotent services, retry policies on ESB |
| ESB outage | Complete system failure | Clustered ESB, message persistence |

### Observability
Centralised through ESB logs. ESB platforms (MuleSoft, WSO2) provide built-in dashboards.

### Deployment
Typically **independent** per service, but coordination is needed due to shared data.

### Scaling
Each service scales independently. ESB itself must scale (and can become a bottleneck).

---

## 3. Microservices Architecture

### What It Is

**Microservices** decomposes an application into **small, independently deployable services**, each owning its data and business logic. Services communicate via lightweight protocols (HTTP/gRPC, messaging). Each service is built around a **single business capability** and can be deployed, scaled, and replaced independently.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MICROSERVICES ARCHITECTURE                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     API GATEWAY                             │    │
│  │  Routing │ Auth │ Rate Limiting │ SSL Termination           │    │
│  └──────┬──────────────┬──────────────┬──────────────┬─────────┘    │
│         │              │              │              │              │
│         ▼              ▼              ▼              ▼              │
│  ┌──────────┐  ┌──────────────┐ ┌──────────┐ ┌──────────────┐      │
│  │  USER    │  │  ORDER       │ │INVENTORY │ │  PAYMENT     │      │
│  │ SERVICE  │  │  SERVICE     │ │ SERVICE  │ │  SERVICE     │      │
│  │          │  │              │ │          │ │              │      │
│  │ Own DB   │  │  Own DB      │ │ Own DB   │ │  Own DB      │      │
│  │(Postgres)│  │ (Postgres)   │ │(MongoDB) │ │  (Postgres)  │      │
│  └──────────┘  └──────────────┘ └──────────┘ └──────────────┘      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  MESSAGE BUS (Kafka)                         │   │
│  │  OrderPlaced → Inventory reduces stock                       │   │
│  │  OrderPlaced → Payment charges customer                      │   │
│  │  PaymentConfirmed → Order status updated                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Service Registry (Consul/Eureka) for dynamic discovery              │
└──────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries
**Fine-grained** — each service owns a single business capability. Bounded by **Bounded Contexts (DDD)**. "Can be rewritten in 2 weeks" (Amazon's two-pizza team rule).

### Communication
- **Synchronous**: REST over HTTP, gRPC (inter-service)
- **Asynchronous**: Kafka, RabbitMQ, AWS SNS/SQS (event-driven)
- **Pattern**: Prefer async for cross-service mutations; sync for queries
- **API Gateway**: Single entry point for external clients

### Data Ownership
**Database per service** — the cardinal rule. Each service has its own database (can be different DB technology). No service accesses another service's database directly. Data sharing via APIs or events only.

```
✅ Correct:
   Order Service → calls User Service REST API to get user name
   Order Service → subscribes to UserUpdated event

❌ Wrong:
   Order Service → SELECT * FROM users WHERE id = ? (directly hits User DB)
```

### Service Discovery

```
Static (DNS-based):
  service-name.namespace.svc.cluster.local  (Kubernetes)

Dynamic (Service Registry):
  Service registers on startup → Consul/Eureka
  Client queries registry → gets available instances
  Load balancer picks instance

Client-side discovery: Client queries registry, picks instance
Server-side discovery: Load balancer queries registry, routes request
```

### Load Balancing
- **API Gateway level**: Routes to service instances
- **Service mesh (Istio/Linkerd)**: Per-service load balancing, traffic shaping
- **Kubernetes**: kube-proxy + service ClusterIP load balancing
- **Algorithms**: Round-robin, least-connections, consistent hashing

### Fault Isolation
**High** — each service is isolated. A crash in Payment Service doesn't affect Inventory Service. Achieved through:
- **Circuit Breaker** (Resilience4j, Hystrix): stop calling a failing service
- **Bulkhead**: separate thread pools per downstream service
- **Timeout**: never wait indefinitely

### Distributed Transactions
The hardest problem in microservices. **No ACID transactions across services.** Solutions:

```
SAGA Pattern:
  Choreography: Services emit events and react to each other's events
  ┌─────────────────────────────────────────────────────────────────┐
  │ 1. Order Service: CreateOrder → publishes OrderCreatedEvent     │
  │ 2. Inventory Service: receives event → reserves stock           │
  │    → publishes StockReservedEvent                               │
  │ 3. Payment Service: receives event → charges customer           │
  │    → publishes PaymentConfirmedEvent                            │
  │ 4. Order Service: receives event → confirms order               │
  │                                                                 │
  │ On failure at step 3 (payment fails):                           │
  │    Payment publishes PaymentFailedEvent                         │
  │    Inventory reacts → releases reserved stock (compensating)    │
  │    Order reacts → cancels order                                 │
  └─────────────────────────────────────────────────────────────────┘

  Orchestration: A central Saga Orchestrator commands services
  SagaOrchestrator → call InventoryService.reserve()
                   → call PaymentService.charge()
                   → call OrderService.confirm()
                   On failure: call InventoryService.release() (compensating)
```

### Failure Handling

| Failure Pattern | Mechanism | Implementation |
|---|---|---|
| **Circuit Breaker** | Stop calls to failing service, fail fast | Resilience4j, Polly |
| **Retry with backoff** | Retry transient failures | Exponential backoff + jitter |
| **Timeout** | Don't wait indefinitely | Per-call deadline |
| **Bulkhead** | Isolate thread pools | Resilience4j Bulkhead |
| **Fallback** | Return cached or default response | Circuit breaker fallback |
| **Dead Letter Queue** | Failed messages go to DLQ | Kafka DLQ, SQS DLQ |

### Observability

```
The Three Pillars of Observability in Microservices:

1. DISTRIBUTED TRACING
   Every request gets a trace-id, propagated across all services
   Tools: Jaeger, Zipkin, AWS X-Ray, OpenTelemetry
   Shows: which service is slow, where errors occur

2. METRICS
   Per-service: latency p50/p95/p99, error rate, throughput
   Tools: Prometheus + Grafana
   Platform: Kubernetes, service mesh (Istio)

3. STRUCTURED LOGGING
   Logs include: trace-id, service-name, request-id, user-id
   Tools: ELK Stack (Elasticsearch + Logstash + Kibana)
          Loki + Grafana
   Correlation: filter all logs by trace-id to see full request path
```

### Deployment
- **Container**: Docker per service
- **Orchestration**: Kubernetes — independent deployments per service
- **Strategy**: Rolling update, blue-green, canary per service
- **CI/CD**: Separate pipeline per service; teams own their own pipeline

### Scaling
- Each service scales **independently** based on its own load
- CPU-bound services: scale on CPU utilisation
- Queue-based services: scale on queue depth (KEDA)
- Read-heavy services: add read replicas to their own DB

---

## 4. Modular Monolith

### What It Is

A **Modular Monolith** is a single deployable unit structured into **well-isolated modules** with explicit boundaries. Each module communicates with others only through defined interfaces or in-process events. It has the operational simplicity of a monolith with the code organisation of microservices.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MODULAR MONOLITH                               │
│                                                                     │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │                  SINGLE PROCESS                            │   │
│   │                                                            │   │
│   │  ┌──────────────┐   IUserFacade  ┌──────────────────────┐  │   │
│   │  │ USER MODULE  │◄──────────────►│   ORDER MODULE       │  │   │
│   │  │              │                │                      │  │   │
│   │  │  private:    │                │  private:            │  │   │
│   │  │  UserRepo    │                │  OrderRepo           │  │   │
│   │  │  UserService │                │  OrderService        │  │   │
│   │  └──────────────┘                └──────────────────────┘  │   │
│   │         │                                   │              │   │
│   │         └───── In-Process Event Bus ─────────┘             │   │
│   │                    (no network)                            │   │
│   │  ┌──────────────┐                ┌──────────────────────┐  │   │
│   │  │ PAYMENT MOD  │                │ NOTIFICATION MODULE  │  │   │
│   │  │              │                │                      │  │   │
│   │  │  own schema  │                │  subscribes to events│  │   │
│   │  └──────────────┘                └──────────────────────┘  │   │
│   │                                                            │   │
│   │         ┌────────────────────────────────────┐            │   │
│   │         │      SHARED DATABASE                │            │   │
│   │         │  (each module owns its own schema)  │            │   │
│   │         └────────────────────────────────────┘            │   │
│   └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries
Logical module boundaries enforced by **interfaces, access modifiers, and architecture tests**. Not physical network boundaries.

### Communication
- **In-process function calls** via module facades/interfaces
- **In-process event bus** for decoupled cross-module communication
- No network overhead — nanosecond-latency internal calls

### Data Ownership
**Logical ownership** — each module owns its DB schema/tables. Other modules cannot query another module's tables directly. Enforced by convention and DB schema permissions.

### Service Discovery
Not applicable — all modules are in the same process.

### Load Balancing
Applied at the process level (multiple instances of the whole app behind a load balancer).

### Fault Isolation
**Medium** — a crash in one module can crash the whole process. Mitigated by error boundaries and defensive programming.

### Distributed Transactions
Not a challenge — single DB process enables ACID transactions across module boundaries.

### Failure Handling
Standard monolith patterns: exception handling, retries within the process, health checks.

### Observability
Single process — standard logging, metrics, single trace per request (no distributed tracing needed).

### Deployment
Deploy the entire application as one unit. Cannot deploy modules independently.

### Scaling
Horizontal scaling of the whole application. Cannot scale individual modules independently.

---

## 5. Serverless Architecture

### What It Is

**Serverless** (Functions as a Service — FaaS) runs **event-triggered functions** in stateless containers managed entirely by the cloud provider. No servers to manage — you pay per invocation and execution time.

```
┌────────────────────────────────────────────────────────────────────┐
│                    SERVERLESS ARCHITECTURE                         │
│                                                                    │
│   ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│   │  HTTP event │  │  Cron event │  │  Queue event (SQS/Kafka) │  │
│   │  API Gateway│  │  CloudWatch │  │  S3 upload event         │  │
│   └──────┬──────┘  └──────┬──────┘  └──────────────┬───────────┘  │
│          │                │                         │             │
│          ▼                ▼                         ▼             │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │               FUNCTION RUNTIME                          │    │
│   │  Container spun up per invocation (cold start ~100ms)   │    │
│   │                                                         │    │
│   │  ┌──────────────────┐  ┌───────────────────────────┐   │    │
│   │  │  placeOrder()    │  │  processPayment()          │   │    │
│   │  │  Lambda function │  │  Lambda function           │   │    │
│   │  └──────────────────┘  └───────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────┘    │
│          │                         │                             │
│          ▼                         ▼                             │
│   ┌──────────────┐        ┌──────────────────────┐              │
│   │  DynamoDB    │        │  RDS / Aurora         │              │
│   │  S3          │        │  ElastiCache          │              │
│   └──────────────┘        └──────────────────────┘              │
└────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries
**Function-level** — each function is a service boundary. One function = one operation.

### Communication
- **Trigger-based**: HTTP (API Gateway), Queue (SQS), Events (S3, DynamoDB Streams, EventBridge)
- **Sync**: HTTP invocation via API Gateway
- **Async**: SNS, SQS, EventBridge for event-driven chaining

### Data Ownership
No local state — all data must be in external stores (DynamoDB, S3, RDS, Redis).

### Service Discovery
Managed by the cloud provider. API Gateway routes to functions; functions invoke each other via ARN or SDK.

### Load Balancing
**Automatic** — cloud provider scales and load-balances invocations natively.

### Fault Isolation
**Very high** — each function is isolated in its own container. A crash in one function has zero impact on others.

### Distributed Transactions
Same challenges as microservices — Saga pattern, idempotency keys, exactly-once processing via SQS deduplication IDs.

### Failure Handling

| Problem | Solution |
|---|---|
| **Cold start** | Provisioned concurrency (keep functions warm), smaller bundle size |
| **Timeout** (max 15 min AWS) | Design short-lived functions; use Step Functions for long workflows |
| **Retry storms** | SQS visibility timeout, DLQ for failed events |
| **Idempotency** | DynamoDB idempotency table with TTL |

### Observability
- **AWS CloudWatch**: logs and metrics per function
- **AWS X-Ray**: distributed tracing across functions
- **Datadog Serverless**: unified view

### Deployment
Function-level deployment via **SAM**, **Serverless Framework**, **AWS CDK**, or **Terraform**. No server provisioning.

### Scaling
**Automatic** — cloud provider scales from 0 to thousands of concurrent invocations within seconds. **Scale-to-zero** is free (no invocation = no cost).

---

## 6. Event-Driven Architecture (EDA)

### What It Is

**Event-Driven Architecture** uses **events** as the primary communication mechanism. Producers emit events when something happens. Consumers subscribe and react independently. Producers and consumers are **completely decoupled** — they don't know about each other.

```
┌─────────────────────────────────────────────────────────────────────┐
│                  EVENT-DRIVEN ARCHITECTURE                           │
│                                                                     │
│  EVENT PRODUCERS                                                    │
│  ┌─────────────┐   ┌─────────────┐   ┌────────────────────┐        │
│  │ Order Svc   │   │ User Svc    │   │ Inventory Svc      │        │
│  │ OrderPlaced │   │ UserUpdated │   │ LowStockDetected   │        │
│  └──────┬──────┘   └──────┬──────┘   └────────────┬───────┘        │
│         │                 │                       │                │
│         └─────────────────┴───────────────────────┘                │
│                           │                                        │
│                           ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                  EVENT BROKER                              │    │
│  │              (Kafka / RabbitMQ / AWS EventBridge)          │    │
│  │                                                            │    │
│  │  Topic: orders          Topic: users     Topic: inventory  │    │
│  │  [OrderPlaced]          [UserUpdated]    [LowStock]        │    │
│  │  [OrderShipped]         [UserDeleted]    [Restocked]       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           │                                        │
│         ┌─────────────────┴──────────────────────┐                 │
│         │                 │                      │                 │
│         ▼                 ▼                      ▼                 │
│  ┌─────────────┐  ┌──────────────┐   ┌───────────────────────┐     │
│  │ Payment Svc │  │ Notification │   │   Analytics Service   │     │
│  │ subscribes  │  │ subscribes   │   │   subscribes to all   │     │
│  │ to          │  │ to orders,   │   │   events              │     │
│  │ OrderPlaced │  │ users        │   │                       │     │
│  └─────────────┘  └──────────────┘   └───────────────────────┘     │
│                                                                     │
│  CONSUMERS (completely decoupled from producers)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Types

| Type | Description | Example |
|---|---|---|
| **Domain Event** | Something that happened in the business domain | `OrderPlaced`, `PaymentFailed` |
| **Integration Event** | Cross-service domain event (for publishing) | `OrderPlaced` published to Kafka |
| **Command Event** | Request to do something (borderline) | `ProcessPayment` (avoid — use RPC for commands) |
| **Query Event** | Request for data (anti-pattern in EDA) | Use REST/gRPC instead |

### Service Boundaries
**Bounded by event streams** — a service owns the events it produces. Consumers have no coupling to the producer's internals.

### Communication
- **Asynchronous** by default — fire and forget
- **At-least-once delivery** (Kafka, SQS) — consumers must be idempotent
- **Event schema**: Avro (Kafka Schema Registry), JSON, Protobuf
- **Topic per domain event** or **topic per service**

### Data Ownership
**Producer owns the event schema** — consumers adapt. Breaking schema changes are managed via versioning (V1, V2 topics) or schema evolution rules (Avro backward compatibility).

### Service Discovery
Not needed — producers publish to a topic; consumers subscribe to topics. The broker handles routing.

### Load Balancing
**Consumer groups** (Kafka): multiple instances of a consumer share the partitions of a topic. Each partition delivered to one consumer in the group at a time.

### Fault Isolation
**Very high** — a slow or crashed consumer doesn't affect the producer or other consumers. Messages accumulate in the topic until the consumer recovers.

### Distributed Transactions
**Outbox Pattern** for guaranteed event delivery:
```
BEGIN;
  INSERT INTO orders (id, status) VALUES (:id, 'PENDING');
  INSERT INTO outbox (event_type, payload) VALUES ('OrderPlaced', :payload);
COMMIT;
── Relay process reads outbox, publishes to Kafka AFTER commit ──
```

### Failure Handling

| Failure | Mechanism | Tool |
|---|---|---|
| Consumer crashes | Messages wait in topic | Kafka retention, consumer group rebalance |
| Duplicate delivery | Idempotency check before processing | Dedup table, `INSERT ON CONFLICT DO NOTHING` |
| Poison message | DLQ after N retries | Kafka DLQ topic, SQS DLQ |
| Schema breaking change | Backward-compatible schema evolution | Avro + Schema Registry |
| Consumer lag growing | Scale consumers (up to partition count) | KEDA, HPA on lag metric |

### Observability
- **Consumer lag per topic/partition** (most important EDA metric)
- **Event throughput** (events/sec)
- **Processing latency** (time from event emitted to processed)
- Tools: Kafka UI, Conduktor, Prometheus + Grafana (kafka_consumer_group_lag)

### Deployment
Producers and consumers deploy independently. Schema changes need coordination via versioning.

### Scaling
- **Producers**: scale horizontally (more producers = more throughput)
- **Consumers**: scale up to the number of partitions (beyond that, consumers are idle)
- **Kafka partitions**: increase partitions to enable more consumer parallelism

---

## 7. Peer-to-Peer Architecture (P2P)

### What It Is

**P2P** eliminates the central server. Every node (peer) acts as both client AND server. Peers discover each other and share resources (data, bandwidth, computation) directly. Decentralised by design.

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PEER-TO-PEER ARCHITECTURE                          │
│                                                                     │
│  Pure P2P (unstructured):                                           │
│                                                                     │
│   ┌───────┐          ┌───────┐          ┌───────┐                  │
│   │ Peer A│──────────│ Peer B│──────────│ Peer C│                  │
│   └───────┘          └───────┘          └───────┘                  │
│       │                  │                  │                      │
│       └──────────────────┼──────────────────┘                      │
│                          │                                         │
│                      ┌───────┐                                      │
│                      │ Peer D│                                      │
│                      └───────┘                                      │
│                                                                     │
│  Hybrid P2P (with bootstrap node for discovery):                    │
│                                                                     │
│   ┌─────────────────────────────────┐                               │
│   │  Bootstrap / Tracker Node       │ ← knows all peers' addresses  │
│   └────────────────┬────────────────┘                               │
│        ┌───────────┼──────────┐                                     │
│        ▼           ▼          ▼                                     │
│   ┌───────┐   ┌───────┐   ┌───────┐                                │
│   │ Peer  │◄──│ Peer  │──►│ Peer  │  ← peers communicate directly  │
│   └───────┘   └───────┘   └───────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries
**No central services** — each peer provides and consumes services. Resources are fragmented across peers.

### Communication
- **Direct peer-to-peer**: TCP/UDP between peers
- **Gossip protocol**: nodes propagate information by talking to random peers
- **DHT (Distributed Hash Table)**: consistent routing to responsible peer (Kademlia)
- **BitTorrent**: file chunks distributed across all peers

### Data Ownership
**Distributed** — data is split across peers (sharded, replicated). No single peer owns all data. Consistency is eventually consistent.

### Service Discovery
- **Tracker node** (centralised list of peers — BitTorrent)
- **DHT** (fully decentralised — each peer knows a subset of peers)
- **mDNS/Bonjour** (local network — no central node)

### Load Balancing
Inherent — requests distributed across available peers by routing algorithm (DHT, random peer selection).

### Fault Isolation
**Very high** — no single point of failure. If a peer goes down, others continue serving. Data replicated across N peers.

### Distributed Transactions
Largely avoided — P2P systems typically use eventual consistency. CRDTs (Conflict-free Replicated Data Types) for conflict resolution.

### Failure Handling
- **Churn** (peers joining/leaving): DHT rebalances automatically
- **Data loss**: replication factor (e.g., 3 copies per chunk)
- **Sybil attack** (malicious peers): proof-of-work (Bitcoin), reputation systems

### Observability
Difficult — no central point to aggregate metrics. Gossip-based monitoring; each peer reports its state.

### Deployment
Each peer is self-contained and deployed independently. No central coordination needed.

### Scaling
**Naturally scales** — more peers = more capacity. Performance often improves with more peers (more bandwidth, more data replicas).

### Real-World Examples
- **BitTorrent** — file sharing
- **Bitcoin/Ethereum** — blockchain (P2P ledger)
- **WebRTC** — browser-to-browser real-time communication
- **IPFS** — distributed file storage

---

## 8. Distributed Services Architecture

### What It Is

**Distributed Services** is an umbrella pattern where independent services — potentially of different granularities — run across multiple machines/data centres and communicate over the network. It encompasses microservices, SOA, and other distributed patterns. The focus is on the **operational and infrastructure concerns** of running services across a network.

```
┌─────────────────────────────────────────────────────────────────────┐
│               DISTRIBUTED SERVICES ARCHITECTURE                     │
│                                                                     │
│   Region A (Primary)                Region B (Secondary)           │
│   ┌───────────────────────────┐     ┌───────────────────────────┐  │
│   │  ┌──────────────────────┐ │     │  ┌──────────────────────┐ │  │
│   │  │   Service Mesh       │ │     │  │   Service Mesh       │ │  │
│   │  │   (Istio/Linkerd)    │ │     │  │                      │ │  │
│   │  │                      │ │     │  │                      │ │  │
│   │  │  [Svc A] [Svc B]     │ │     │  │  [Svc A] [Svc B]     │ │  │
│   │  │  [Svc C] [Svc D]     │ │◄───►│  │  [Svc C] [Svc D]     │ │  │
│   │  │                      │ │     │  │                      │ │  │
│   │  └──────────────────────┘ │     │  └──────────────────────┘ │  │
│   └───────────────────────────┘     └───────────────────────────┘  │
│                                                                     │
│   Service Mesh handles:                                             │
│   mTLS, load balancing, retries, circuit breaking, observability    │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Infrastructure Concerns

#### Service Mesh
A **service mesh** (Istio, Linkerd, Consul Connect) adds a **sidecar proxy** to every service instance. All network traffic goes through the sidecar, enabling:
- **mTLS** (mutual TLS) between all services — zero-trust networking
- **Automatic retries and timeouts** without code changes
- **Circuit breaking** — configured in mesh, not in application code
- **Traffic shaping** — canary deployments, A/B testing, fault injection
- **Distributed tracing** — automatic trace propagation

```
Service A  ──► Envoy Sidecar A  ──► Envoy Sidecar B  ──► Service B
               (outbound)             (inbound)
                    mTLS encryption tunnel
```

#### Service Registry and Discovery

```
Kubernetes (DNS-based):
  order-service.default.svc.cluster.local:8080

Consul (agent-based):
  curl http://consul:8500/v1/catalog/service/order-service
  → returns: [{ Address: "10.0.1.4", Port: 8080 }, ...]

Eureka (Netflix):
  Service registers → heartbeat every 30s → deregisters on shutdown
  Client queries Eureka → gets list → client-side load balance
```

#### Inter-Service Communication Patterns

```
SYNCHRONOUS (request-response):
   gRPC     → strong typing, binary protocol, bidirectional streaming
   REST     → HTTP/JSON, widely supported, tooling-rich
   GraphQL  → flexible queries, reduces over-fetching

ASYNCHRONOUS (event/message):
   Kafka    → high-throughput, persistent, replayable
   RabbitMQ → flexible routing, multiple exchange types
   SQS/SNS  → managed AWS, simple, high availability

SERVICE MESH:
   Envoy    → transparent proxy, supports gRPC, HTTP/1, HTTP/2, TCP
```

### Failure Handling Patterns Reference

```
TIMEOUT:         Set deadlines on every outbound call
                 gRPC deadline propagation carries timeout across chain

RETRY:           Retry idempotent operations with exponential backoff + jitter
                 max_attempts=3, initial_interval=100ms, multiplier=2

CIRCUIT BREAKER: CLOSED → OPEN (after N failures) → HALF-OPEN (probe)
                 Resilience4j, Polly, Istio (at mesh level)

BULKHEAD:        Separate thread pool per downstream service
                 Prevents one slow dependency from starving all others

RATE LIMITING:   Per-user, per-service quotas at API Gateway
                 Token bucket, sliding window algorithms

FALLBACK:        Return cached response, default value, or degraded response
                 Serve stale data rather than error
```

### Observability Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                   OBSERVABILITY STACK                               │
│                                                                     │
│  METRICS                                                            │
│  Service: request rate, error rate, latency (RED metrics)           │
│  Infra:   CPU, memory, disk, network                               │
│  Tools:   Prometheus (scrape) + Grafana (visualise)                 │
│           Datadog, New Relic                                        │
│                                                                     │
│  TRACES                                                             │
│  Distributed: trace-id propagated across all service calls          │
│  Shows: which service is slow, dependency graph                     │
│  Tools: Jaeger, Zipkin, AWS X-Ray, OpenTelemetry                   │
│                                                                     │
│  LOGS                                                               │
│  Structured JSON with: trace-id, service, level, timestamp          │
│  Tools: ELK Stack, Loki + Grafana, Splunk                          │
│                                                                     │
│  ALERTS                                                             │
│  SLO-based: error rate > 1% for 5 min → page on-call               │
│  Tools: PagerDuty, OpsGenie, Alertmanager                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Distributed Workflow Architecture

### What It Is

**Distributed Workflow Architecture** manages **long-running, multi-step business processes** across multiple services. Each step may take seconds to days. The workflow engine tracks state, handles failures, retries, and timeouts automatically.

```
┌────────────────────────────────────────────────────────────────────┐
│             DISTRIBUTED WORKFLOW ARCHITECTURE                       │
│                                                                    │
│  E-Commerce Order Workflow (may take hours to days)                │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              WORKFLOW ORCHESTRATOR                         │   │
│  │      (AWS Step Functions / Temporal / Conductor)           │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │                   WORKFLOW DEFINITION                │  │   │
│  │  │                                                      │  │   │
│  │  │  [ValidateOrder] → [ReserveInventory] →              │  │   │
│  │  │  [ProcessPayment] → [CreateShipment] →               │  │   │
│  │  │  [SendConfirmation]                                   │  │   │
│  │  │                                                      │  │   │
│  │  │  On payment failure:                                 │  │   │
│  │  │  [ReleaseInventory] → [NotifyCustomer]               │  │   │
│  │  │                                                      │  │   │
│  │  │  On timeout (>24h):                                  │  │   │
│  │  │  [CancelOrder] → [RefundIfCharged]                   │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
│           │              │             │             │            │
│           ▼              ▼             ▼             ▼            │
│    [Inventory Svc] [Payment Svc] [Shipping Svc] [Email Svc]       │
└────────────────────────────────────────────────────────────────────┘
```

### Workflow Engines

| Engine | Type | Key Feature |
|---|---|---|
| **AWS Step Functions** | Managed, serverless | Visual state machine, AWS integration |
| **Temporal** | Open-source, code-first | Workflows as code (Go/Java/TypeScript), replay |
| **Apache Airflow** | Batch/data pipelines | DAG-based, Python, rich UI |
| **Conductor (Netflix)** | Microservice workflows | JSON DSL, visual designer |
| **Zeebe/Camunda** | BPMN-based | Visual BPMN designer, enterprise |

### Service Boundaries
**Process-level** — each workflow step is a discrete service call. Workflow engine owns the process state; services own their domain logic.

### Communication
- **Orchestration**: Workflow engine calls each service in sequence
- **Async activities**: Services execute long tasks and report completion via callback
- **Timers/signals**: Workflow waits for human approval, external event, or timeout

### Data Ownership
Workflow engine owns **process state** (step completion, retry count, variables). Domain services own their data.

### Fault Isolation
**High** — workflow engine persists state. If a step fails, the workflow retries from that step. A crashed service doesn't lose workflow progress.

### Distributed Transactions
Workflow engine coordinates **Saga** compensating transactions:
```
Temporal Saga:
  try {
    inventoryHandle = await inventoryActivity.reserve(items);
    paymentHandle = await paymentActivity.charge(total);
    await shippingActivity.create(order);
  } catch (err) {
    await compensate(paymentHandle, inventoryHandle);
  }
```

### Failure Handling
- **Automatic retries** with configurable backoff per activity
- **Heartbeat** for long-running activities — detect timeouts
- **Versioning** — safely update workflow definitions without breaking running instances

### Observability
Workflow engine UI shows: workflow status, step completion, retry count, execution history (Temporal UI, Step Functions console).

### Deployment
Workflow definitions are code or JSON deployed independently from worker services.

### Scaling
**Workers** (activities) scale independently. Workflow engine handles scheduling.

---

## 10. Actor Model Architecture

### What It Is

The **Actor Model** represents the system as a collection of **Actors** — lightweight, isolated units of computation. Each actor has its own private state and communicates **only via messages**. Actors are location-transparent and can run on any node.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ACTOR MODEL                                    │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                     ACTOR SYSTEM                            │  │
│   │                                                             │  │
│   │  ┌──────────────┐  message   ┌──────────────────────────┐  │  │
│   │  │   Actor A    │──────────►│      Actor B              │  │  │
│   │  │  Mailbox: [] │           │      Mailbox: [msg1,msg2] │  │  │
│   │  │  State: {x:1}│           │      State: {count: 5}    │  │  │
│   │  │  Behaviour:  │◄──────────│      processes one msg    │  │  │
│   │  │  handleMsg() │  reply    │      at a time            │  │  │
│   │  └──────────────┘           └──────────────────────────┘  │  │
│   │                                                             │  │
│   │  ┌───────────────────────────────────────────────────────┐ │  │
│   │  │              SUPERVISOR HIERARCHY                     │ │  │
│   │  │                                                       │ │  │
│   │  │  Root Supervisor                                      │ │  │
│   │  │    ├── OrderSupervisor                                │ │  │
│   │  │    │       ├── OrderActor-1  ← handles order 1       │ │  │
│   │  │    │       └── OrderActor-2  ← handles order 2       │ │  │
│   │  │    └── PaymentSupervisor                              │ │  │
│   │  │            └── PaymentActor-1                        │ │  │
│   │  │  Supervisor restarts failed child actors             │ │  │
│   │  └───────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Actor Properties

| Property | Description |
|---|---|
| **Encapsulation** | Actor's state is private — only modified by processing its own messages |
| **Concurrency** | An actor processes one message at a time (no shared state, no locks) |
| **Location transparency** | Send a message to an actor reference — it doesn't matter which node it runs on |
| **Supervision** | Each actor has a supervisor that decides what to do on failure (restart, stop, escalate) |

### Service Boundaries
**Per-actor** — each actor is its own isolated unit. Actors can represent entities (OrderActor for each Order), use cases, or services.

### Communication
- **Asynchronous messages only** — no shared memory, no direct method calls
- **Tell** (fire and forget): `actorRef ! message`
- **Ask** (request-response with timeout): `actorRef ? message`
- **Location transparent**: same API whether actor is local or remote

### Data Ownership
Each actor owns its private state. No external access to actor state — only via messages.

### Fault Isolation
**Very high** — actor failure is isolated. Supervisor decides: **Restart** (fresh state), **Stop** (terminate), **Resume** (ignore failure), **Escalate** (let supervisor's supervisor decide).

### Failure Handling
**"Let it crash"** philosophy (Erlang/Akka): don't write defensive code — let the actor crash and the supervisor restart it cleanly. Supervisors create resilient systems without try-catch everywhere.

### Observability
Akka: built-in logging per actor, actor system metrics (mailbox size, processing time). Cluster sharding provides per-entity tracking.

### Deployment
- **Akka** (JVM): actors run in a clustered actor system (Akka Cluster, Akka Cluster Sharding)
- **Erlang/Elixir (BEAM)**: actors ("processes") are the native unit, distributed natively
- **Microsoft Orleans** (.NET): virtual actors (Grains), auto-distributed

### Scaling
- **Vertical**: more actors per node (millions per JVM node)
- **Horizontal**: Akka Cluster distributes actors across nodes; Cluster Sharding routes entity messages to the responsible node automatically

### Real-World Examples
- **WhatsApp** (Erlang actors — billions of messages/day)
- **Discord** (Elixir/Erlang — millions of concurrent connections)
- **Microsoft Halo** (Orleans for game state)
- **Lightbend** applications (Akka — Kafka Streams processing)

---

## 11. Reactive Architecture

### What It Is

**Reactive Architecture** builds systems that are **responsive, resilient, elastic, and message-driven** — the four traits of the [Reactive Manifesto](https://www.reactivemanifesto.org). It is not a specific pattern but a set of principles for building **highly concurrent, non-blocking** distributed systems.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE REACTIVE MANIFESTO                           │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │                    RESPONSIVE                                │ │
│   │  Responds in a timely manner — consistent, bounded latency   │ │
│   └─────────────────────┬────────────────────────────────────────┘ │
│                         │ foundation built on                      │
│           ┌─────────────┴──────────────┐                           │
│           ▼                            ▼                           │
│  ┌──────────────────┐        ┌──────────────────────────┐          │
│  │    RESILIENT     │        │        ELASTIC           │          │
│  │  Stays responsive│        │  Scales up and down      │          │
│  │  under failure   │        │  automatically under     │          │
│  │  Replication,    │        │  varying load            │          │
│  │  containment,    │        │  No contention points,   │          │
│  │  isolation,      │        │  no central bottlenecks  │          │
│  │  delegation      │        └──────────────────────────┘          │
│  └──────────────────┘                  │                           │
│           │                            │                           │
│           └──────────────┬─────────────┘                           │
│                          │ achieved through                        │
│           ┌──────────────▼──────────────┐                          │
│           │       MESSAGE-DRIVEN        │                          │
│           │  Asynchronous messages      │                          │
│           │  Location transparency      │                          │
│           │  Back-pressure              │                          │
│           │  Non-blocking I/O           │                          │
│           └─────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Reactive Streams and Backpressure

The critical concept: **backpressure** — the consumer tells the producer how fast it can consume. This prevents buffer overflows and system collapse under load.

```
Traditional (no backpressure):
  Producer ──────── 10,000/sec ────────► Consumer (handles 100/sec)
                                         Consumer buffer fills → OOM crash

Reactive (with backpressure):
  Producer ◄─── "I can handle 100/sec" ─── Consumer
     │                                      │
     └── sends 100/sec ────────────────────►┘
  Producer slows down → no buffer overflow
```

### Reactive Libraries and Frameworks

| Library/Framework | Language | Key Feature |
|---|---|---|
| **RxJS** | TypeScript/JS | Observable streams, operators (map, filter, switchMap) |
| **Project Reactor** | Java | Flux (0-N items), Mono (0-1 item), Spring WebFlux |
| **Akka Streams** | Scala/Java | Backpressure-aware stream processing on Actor Model |
| **RxJava** | Java | Port of Rx for Android and JVM |
| **Vert.x** | Java/Polyglot | Event loop based, non-blocking I/O |

### Angular + RxJS Reactive Example

```typescript
// Reactive data flow in Angular — no imperative state management
@Component({ selector: 'app-orders' })
export class OrdersComponent implements OnInit {
  // ── Observable streams (ViewModel) ──────────────────────────────
  private searchTerm$ = new Subject<string>();
  private refresh$ = new BehaviorSubject<void>(undefined);

  orders$: Observable<Order[]> = combineLatest([
    this.searchTerm$.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
    this.refresh$
  ]).pipe(
    switchMap(([term]) =>
      this.orderService.search(term).pipe(
        catchError(() => of([]))   // resilient — errors become empty array
      )
    ),
    shareReplay(1)                 // multicasted — multiple subscribers get same value
  );

  isLoading$ = merge(
    this.refresh$.pipe(map(() => true)),
    this.orders$.pipe(map(() => false))
  );

  orderCount$ = this.orders$.pipe(map(orders => orders.length));

  onSearch(term: string): void { this.searchTerm$.next(term); }
  onRefresh(): void { this.refresh$.next(); }
}
```

### Service Boundaries
Reactive principles apply **within** any service boundary. Services communicate via reactive streams or async messaging.

### Communication
- **Non-blocking I/O**: Never block a thread waiting for DB/HTTP — use async/await or Observables
- **Backpressure**: Flow-controlled messaging prevents overload
- **Message-driven**: Services communicate asynchronously

### Fault Isolation
Reactive systems isolate failures using stream operators: `catchError`, `retry`, `timeout`, `onErrorResumeNext`. Failures are values in the stream — handled declaratively.

### Scaling
- Non-blocking I/O: one thread handles thousands of concurrent connections (vs blocking: one thread per connection)
- Event loop (Node.js, Vert.x): single thread, zero context switching
- Reactive streams scale naturally with backpressure — producers auto-throttle

---

## 12. Cross-Cutting Concerns Deep Dive

### Service Boundaries — Summary

```
Pattern             Boundary Level              Who defines it
──────────────────────────────────────────────────────────────────────
Client-Server       Single server               N/A
SOA                 Business capability (large) ESB + WSDL contract
Microservices       Business capability (small) Bounded Context (DDD)
Modular Monolith    Module (logical)            Interface + compiler
Serverless          Function (single operation) Event trigger
Event-Driven        Event stream                Producer owns events
P2P                 Node / peer                 DHT routing
Distributed Svcs    Service mesh                mTLS + service registry
Workflow            Process step                Activity contract
Actor Model         Actor (entity/use case)     Message protocol
Reactive            Stream segment              Reactive type contract
```

### Communication Patterns

```
SYNCHRONOUS REQUEST-RESPONSE:
  + Simple mental model, easy debugging
  + Immediate feedback (success/failure)
  - Temporal coupling: caller blocked until response
  - Cascading failures if downstream is slow

ASYNCHRONOUS MESSAGING:
  + Temporal decoupling: caller continues immediately
  + Buffer absorbs load spikes
  + Natural backpressure via queue depth
  - Harder to debug, eventual consistency
  - Need idempotency (at-least-once delivery)

STREAMING:
  + Continuous data flow with backpressure
  + Low latency for real-time data
  - More complex programming model
  - Need to handle partial failures in stream

WHEN TO USE WHICH:
  Query operations          → Synchronous REST/gRPC
  Commands (mutations)      → Prefer async messaging
  Real-time data            → WebSocket, Server-Sent Events, Kafka
  Bulk processing           → Kafka, Spark Streaming
  Cross-service transactions → Async Saga (avoid sync 2PC)
```

### Data Ownership

```
MICROSERVICES — DATABASE PER SERVICE (gold standard):
  ✅ Each service owns its schema
  ✅ Can use best DB for each service
  ✅ Independent schema evolution
  ❌ No cross-service joins — must use API or events
  ❌ Eventually consistent reads

SHARED DATABASE (anti-pattern in microservices):
  ✅ Easy joins, strong consistency
  ❌ Schema changes affect all services
  ❌ Single DB = single scaling bottleneck
  ❌ No clear data ownership

CQRS (Command Query Responsibility Segregation):
  Write model: normalised, transactional DB
  Read model:  denormalised, query-optimised (Elasticsearch, Redis)
  Commands update write model → events project to read model
```

### Service Discovery Reference

```
DNS-BASED (Kubernetes):
  order-service.default.svc.cluster.local
  Pros: No extra infrastructure, battle-tested
  Cons: DNS caching can delay updates

CLIENT-SIDE DISCOVERY (Eureka):
  Client → asks Eureka → gets list → picks instance
  Pros: Client controls load-balancing strategy
  Cons: Discovery logic in every client

SERVER-SIDE DISCOVERY (AWS ELB, Nginx, Consul):
  Client → load balancer → queries registry → routes to instance
  Pros: Language-agnostic, one place to manage
  Cons: Extra network hop, LB must be HA

SERVICE MESH (Istio):
  Envoy sidecar handles all discovery transparently
  Pros: Language-agnostic, rich traffic management
  Cons: Complexity, resource overhead (sidecar per pod)
```

### Load Balancing Algorithms

```
ROUND-ROBIN:
  Request 1 → Server A
  Request 2 → Server B
  Request 3 → Server C
  Best for: Homogeneous servers, equal request cost

LEAST-CONNECTIONS:
  New request → server with fewest active connections
  Best for: Variable request duration (long-polling, uploads)

CONSISTENT HASHING:
  hash(client_ip or user_id) → always same server
  Best for: Session affinity, cache locality

WEIGHTED:
  Server A: weight 3 → gets 3/6 of traffic
  Server B: weight 2 → gets 2/6 of traffic
  Server C: weight 1 → gets 1/6 of traffic
  Best for: Heterogeneous capacity fleet

P2C (Power of Two Choices):
  Pick 2 random servers, send to the less-loaded one
  Best for: Large clusters (O(log log n) max load vs round-robin O(log n))
```

### Fault Isolation Patterns

```
CIRCUIT BREAKER STATES:
  CLOSED   → normal operation, requests pass through
     │  (N failures in window)
     ▼
  OPEN     → fail fast, no requests sent
     │  (after cooldown period)
     ▼
  HALF-OPEN → let 1 probe request through
     │  success → CLOSED
     └  failure → OPEN

BULKHEAD ISOLATION:
  Without bulkhead:  All services share one thread pool
    Slow DB calls fill pool → all requests timeout
  With bulkhead:    Separate pool per downstream
    Slow DB fills DB pool → HTTP calls unaffected

TIMEOUT HIERARCHY:
  Client timeout (5s)
    > API Gateway timeout (4s)
      > Service A timeout (3s)
        > Service B timeout (2s)
  Each hop has a smaller timeout than the caller
  Prevents cascading waits
```

### Distributed Transactions — Full Reference

```
TWO-PHASE COMMIT (2PC):
  Phase 1: Coordinator asks all participants "ready to commit?"
  Phase 2: If all say yes → COMMIT. If any says no → ROLLBACK.
  ✅ Strong consistency (ACID across services)
  ❌ Blocking — all participants locked during protocol
  ❌ Coordinator failure = system stuck
  ❌ Does not scale — avoid in microservices

SAGA — CHOREOGRAPHY:
  Services react to each other's events (no coordinator)
  ✅ No central coordinator — fully decoupled
  ✅ Each step is a local transaction
  ❌ Hard to track overall workflow state
  ❌ Circular event dependencies

SAGA — ORCHESTRATION:
  Saga Orchestrator commands each service in sequence
  ✅ Workflow state in one place (easy to debug)
  ✅ Explicit compensation on failure
  ❌ Orchestrator is a single point of coordination

OUTBOX PATTERN:
  Write to DB + write to outbox table in ONE transaction
  Relay reads outbox → publishes to message broker
  ✅ Guaranteed event delivery (no lost events)
  ✅ At-least-once delivery
  ❌ Extra DB table + relay process

IDEMPOTENCY:
  Every consumer must handle receiving the same message twice:
  → Store processed event IDs
  → Use UPSERT / ON CONFLICT DO NOTHING
  → Use conditional updates (optimistic locking)
```

### Observability — Three Pillars

```
METRICS (What is happening?):
  Counter:   total_requests, total_errors
  Gauge:     active_connections, queue_depth, memory_usage
  Histogram: request_latency_ms (p50/p95/p99 percentiles)

  RED Method per service:
    Rate     = requests per second
    Errors   = error rate (%)
    Duration = latency percentiles

  USE Method per resource:
    Utilisation = % of time resource is busy
    Saturation  = queue depth / wait time
    Errors      = error count

TRACES (Why is it slow?):
  Root span:  POST /api/orders (50ms total)
    ├── Auth middleware: 2ms
    ├── OrderService.placeOrder: 45ms
    │     ├── InventoryService.reserve: 10ms (gRPC)
    │     ├── PaymentService.charge: 30ms (gRPC)  ← bottleneck
    │     └── OrderRepository.save: 3ms (DB)
    └── Response serialisation: 2ms

LOGS (What exactly happened?):
  {
    "timestamp": "2025-06-15T10:00:04.123Z",
    "level": "ERROR",
    "service": "order-service",
    "trace_id": "abc-123",
    "span_id": "def-456",
    "user_id": "usr-789",
    "order_id": "ord-001",
    "message": "Payment service timeout after 30s",
    "error": "DEADLINE_EXCEEDED"
  }
```

---

## 13. Pattern Comparison Matrix

| Pattern | Granularity | Coupling | Consistency | Scalability | Complexity | Best For |
|---|---|---|---|---|---|---|
| **Client-Server** | Monolith | High | Strong (ACID) | Vertical + H-scaling | Low | Web apps, APIs |
| **SOA** | Coarse service | Medium | Eventual/Strong | Per service | High (ESB) | Enterprise integration |
| **Microservices** | Fine service | Low | Eventual | Per service | Very High | Large teams, cloud-native |
| **Modular Monolith** | Module | Low (logical) | Strong (ACID) | Whole app | Medium | Growing teams, pre-split |
| **Serverless** | Function | Very low | Eventual | Automatic | Medium | Event-triggered, bursty |
| **Event-Driven** | Event stream | Very low | Eventual | Per consumer | High | Real-time, decoupled |
| **P2P** | Node | Decentralised | Eventual (CRDTs) | Adds with peers | High | File sharing, blockchain |
| **Distributed Svcs** | Service | Low | Eventual | Per service | Very High | Multi-region, large scale |
| **Workflow** | Process step | Low | Eventual + compensating | Workers | Medium | Long-running processes |
| **Actor Model** | Actor | None (messages) | Eventually consistent | Millions of actors | High | Concurrency, real-time |
| **Reactive** | Stream segment | Low | Eventual | Auto (backpressure) | High | High-concurrency, non-blocking |

---

## 14. Choosing the Right Pattern

```
What is the team size and deployment independence requirement?
├── Small team (< 10), single deployment → Modular Monolith
├── Growing team, wants boundaries → Modular Monolith → extract to Microservices
└── Large org, independent teams → Microservices

What is the communication pattern?
├── Request-Response, query → REST/gRPC (Client-Server or Microservices)
├── Fire-and-forget, decouple producers/consumers → Event-Driven
├── Long-running process with compensation → Distributed Workflow
└── Real-time, high concurrency → Reactive + Actor Model

What is the consistency requirement?
├── Strong ACID → Single DB (Client-Server, Modular Monolith)
├── Eventually consistent OK → Microservices + Event-Driven
└── Per-entity consistency → Actor Model (each actor serialises its state)

What is the scale pattern?
├── Bursty, unpredictable traffic → Serverless (scale to zero)
├── Steady, high traffic → Microservices (fixed capacity, predictable cost)
├── Organic peer growth → P2P
└── Mixed → Hybrid (some serverless + some microservices)

What is the integration challenge?
├── Integrate many enterprise systems → SOA (ESB)
├── Decouple internal services → Event-Driven (Kafka)
└── Multi-region, mesh communication → Distributed Services (Istio)
```

---

## Distributed System Laws and Principles

> **Fallacies of Distributed Computing** (Peter Deutsch, Sun Microsystems):
> 1. The network is reliable
> 2. Latency is zero
> 3. Bandwidth is infinite
> 4. The network is secure
> 5. Topology doesn't change
> 6. There is one administrator
> 7. Transport cost is zero
> 8. The network is homogeneous
>
> *Every distributed system must be designed assuming these are all false.*

---

> **CAP Theorem**: A distributed system can guarantee at most 2 of 3: **Consistency**, **Availability**, **Partition Tolerance**. Since partitions are inevitable, the real choice is C vs A.

---

> **BASE** (distributed system alternative to ACID):
> **B**asically **A**vailable — system guarantees availability
> **S**oft state — state may change without input (eventual propagation)
> **E**ventually consistent — given no new writes, all nodes converge

---

*Related: Clean Architecture, Domain-Driven Design, CQRS, Event Sourcing, Saga Pattern, Service Mesh, Kubernetes, Kafka, Resilience Engineering*
