# Microservices Architecture Patterns

A complete catalog of microservices architecture patterns — every pattern presented with Problem → Why naive solution fails → Pattern → Architecture → Request Flow → Failure Scenario → Solution.

---

## Table of Contents

1. [Decomposition Patterns](#1-decomposition-patterns)
2. [Communication Patterns](#2-communication-patterns)
3. [Data Patterns](#3-data-patterns)
4. [Reliability Patterns](#4-reliability-patterns)
5. [Integration Patterns](#5-integration-patterns)
6. [Transaction Patterns](#6-transaction-patterns)

---

## 1. Decomposition Patterns

---

### 1.1 Decompose by Business Capability

**Problem**
A large monolithic application becomes hard to deploy, scale, and maintain. Multiple teams work on the same codebase, causing merge conflicts, slow CI, and deployment coupling. A bug in one module can take down unrelated features.

**Why Naive Solution Fails**
Simply splitting the codebase into sub-folders or packages doesn't help — the code still deploys as one unit and shares the same database. Two teams must still coordinate every release.

**Pattern**
Identify **business capabilities** — the things the business does (Order Management, Customer Management, Inventory, Payments). Each capability becomes its own independently deployable service with its own database.

**Architecture**
```
MONOLITH                              DECOMPOSED BY CAPABILITY
──────────────────────────            ──────────────────────────────────
┌──────────────────────┐              ┌──────────┐  ┌──────────────┐
│  OrderManagement     │              │  Order   │  │  Customer    │
│  CustomerMgmt        │   ────────►  │  Service │  │  Service     │
│  Inventory           │              └──────────┘  └──────────────┘
│  Payments            │              ┌──────────┐  ┌──────────────┐
│  Notifications       │              │Inventory │  │  Payment     │
│  [Single DB]         │              │ Service  │  │  Service     │
└──────────────────────┘              └──────────┘  └──────────────┘
                                      Each has its own DB
```

**Request Flow**
```
Customer places order:
  API Gateway → Order Service (creates order)
              → Inventory Service (reserves stock)
              → Payment Service (charges card)
              → Notification Service (sends email)
Each service called independently; all own their data.
```

**Failure Scenario**
Payment Service crashes during a spike. Without decomposition, the whole app goes down. With decomposition, Order Service and Inventory Service keep running. Only payment flows are affected.

**Solution**
- Map capabilities using an **Event Storming** workshop with domain experts.
- Start with 4–6 services for a medium-sized domain. Don't over-decompose early.
- Apply the **Single Responsibility Principle** at service level: one service = one business capability.
- Each team owns one or more services end-to-end (code, DB, deployment, on-call).

---

### 1.2 Decompose by Subdomain (DDD)

**Problem**
Business capabilities can be ambiguous. "Customer Management" could mean profile management, loyalty programs, and billing — all with different teams and different rates of change. A capability-only split may still be too coarse.

**Why Naive Solution Fails**
Using only business capability names leads to services that are still too large, contain mixed concerns, and have fuzzy ownership boundaries. The word "Customer" means different things to different teams.

**Pattern**
Use **Domain-Driven Design** subdomains. Identify **Core Domain** (competitive differentiator), **Supporting Subdomain** (needed but not unique), and **Generic Subdomain** (buy/use third-party). Each subdomain gets its own Bounded Context and service.

**Architecture**
```
┌──────────────────────────────────────────────────────────────────┐
│                      E-COMMERCE DOMAIN                           │
│                                                                  │
│  CORE DOMAINS (build in-house)                                   │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │ Order Management│  │ Pricing & Promo  │  ← competitive edge   │
│  └─────────────────┘  └──────────────────┘                       │
│                                                                  │
│  SUPPORTING DOMAINS (in-house, less critical)                    │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │ Inventory Mgmt  │  │ Shipping / WMS   │                       │
│  └─────────────────┘  └──────────────────┘                       │
│                                                                  │
│  GENERIC DOMAINS (buy/SaaS)                                      │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │ Payments (Stripe│  │ Email (SendGrid)  │                       │
│  └─────────────────┘  └──────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

**Request Flow**
Same as business capability but with clearer boundaries. The "Customer" concept in Order subdomain (name, shipping address) differs from the "Customer" in CRM subdomain (loyalty points, purchase history).

**Failure Scenario**
Two teams both modify a shared `Customer` entity. One team adds a field for billing; another for preferences. The entity becomes a God Object. Tests break across both services.

**Solution**
- Each subdomain defines its **own model** for shared concepts (Anti-Corruption Layer at boundaries).
- Use **Context Maps** to document how subdomains integrate.
- Invest heavily in Core Domains; use off-the-shelf for Generic Domains.

---

### 1.3 Strangler Fig Pattern

**Problem**
An existing monolith needs to be migrated to microservices. You can't stop the world and rewrite everything. The monolith has years of undocumented business logic. A "big bang" rewrite has a high failure rate.

**Why Naive Solution Fails**
Full rewrites fail because: (1) domain knowledge is lost in translation, (2) the new system is never feature-complete before business pressure forces go-live, (3) production bugs exist that the rewrite doesn't replicate.

**Pattern**
**Incrementally strangle** the monolith by extracting one capability at a time. A proxy (API Gateway or Facade) routes requests — new requests to the new service, legacy requests to the monolith. The monolith shrinks as more services are extracted.

**Architecture**
```
PHASE 1: Proxy introduced
  Client → [Facade/API Gateway] → Monolith (all traffic)

PHASE 2: First service extracted (Payments)
  Client → [Facade] → Payment Service (new) ← /payments/*
                   → Monolith ← everything else

PHASE 3: More services extracted
  Client → [Facade] → Order Service
                   → Inventory Service
                   → Monolith (shrinking)

PHASE N: Monolith fully strangled
  Client → [Facade] → Service A
                   → Service B
                   → Service C
  Monolith decommissioned
```

**Request Flow**
```
1. Insert proxy (API Gateway) in front of monolith — no behaviour change yet.
2. Extract Payments into a new service with its own DB.
3. Migrate data: copy payments data, dual-write during transition.
4. Switch proxy to route /payments/* to new service.
5. Monitor for issues. Remove payments code from monolith.
6. Repeat for next capability.
```

**Failure Scenario**
Data sync during dual-write fails. New Payment Service has a payment; monolith does not (or vice versa). Reports show inconsistent totals.

**Solution**
- Use the **Parallel Run** technique: run both systems, compare outputs, only switch when consistent.
- **Dark launch**: send traffic to new service but don't use its response yet (just log).
- Use **feature flags** to toggle between old and new implementations.
- Always have a **rollback path**: keep proxy routing to monolith as the fallback.

---

### 1.4 Branch by Abstraction

**Problem**
You need to replace a component (e.g., swap the payment library, change DB) within a running system without a long-lived feature branch that diverges from main.

**Why Naive Solution Fails**
Long-lived feature branches cause massive merge conflicts. The longer the branch, the more painful the merge. You can't release other features while the branch is in flight.

**Pattern**
Introduce an **abstraction layer** (interface) over the component you want to replace. Ship both the old and new implementation behind the abstraction. Toggle between them with a feature flag. Remove the old implementation when confident.

**Architecture**
```
STEP 1: Create abstraction
  Code → IPaymentGateway (interface)
  Old code → StripeGatewayV1 implements IPaymentGateway

STEP 2: Add new implementation
  Code → IPaymentGateway
       → StripeGatewayV1 (old, used in prod)
       → StripeGatewayV2 (new, used by feature flag)

STEP 3: Toggle (canary → 1% → 10% → 100%)
  if (featureFlag.isEnabled('stripe-v2', userId)) {
    return new StripeGatewayV2();
  }
  return new StripeGatewayV1();

STEP 4: Remove old implementation
  Code → IPaymentGateway → StripeGatewayV2
```

**Request Flow**
Both implementations live in the same deployed codebase. No feature branches. Feature flag controls which is active per user/percentage.

**Failure Scenario**
V2 has a bug affecting 1% of users during canary. Without abstraction, rollback requires a new deployment. With abstraction + feature flag, rollback is a flag toggle — instant, no deploy needed.

**Solution**
- Always define an interface **before** writing the first implementation.
- Use a feature flag service (LaunchDarkly, Unleash) for runtime toggling.
- Write **contract tests** that both implementations must pass.
- Clean up: remove old implementation within 1 sprint of reaching 100%.

---

## 2. Communication Patterns

---

### 2.1 REST

**Problem**
Services need to request data or trigger actions on other services over the network in a standard, widely understood way.

**Why Naive Solution Fails**
Custom binary protocols are hard to debug, have poor tooling, and require specialised knowledge. Direct TCP socket communication doesn't provide request/response semantics, routing, or error handling conventions.

**Pattern**
Use **HTTP/1.1 or HTTP/2 with JSON** (or XML) following REST constraints: stateless, resource-oriented URLs, standard HTTP verbs (GET/POST/PUT/PATCH/DELETE), standard status codes.

**Architecture**
```
Client
  │
  │  GET /orders/42
  │  Authorization: Bearer <jwt>
  │
  ▼
[Order Service]
  │ 200 OK
  │ { "id": "42", "status": "CONFIRMED", "total": 149.99 }
  ▼
Client renders response
```

**Request Flow**
```
GET    /orders          → list orders
GET    /orders/42       → get specific order
POST   /orders          → create order (body: {items, address})
PUT    /orders/42       → replace order
PATCH  /orders/42       → partial update (body: {status: "CANCELLED"})
DELETE /orders/42       → cancel order
```

**Failure Scenario**
Order Service calls Inventory Service synchronously. Inventory Service is down. Order Service hangs waiting for TCP timeout (30s). Thread pool fills. Order Service becomes unresponsive. Cascading failure.

**Solution**
- Always set **connection timeout** (e.g., 1s) and **read timeout** (e.g., 5s).
- Add **circuit breaker** on the HTTP client.
- Use **retry with exponential backoff** for idempotent GET requests.
- Return **503 with Retry-After** header when circuit is open.

---

### 2.2 gRPC

**Problem**
REST with JSON is slow for high-throughput inter-service communication. Large JSON payloads waste bandwidth. Lack of strong typing causes API drift between services. No native streaming support.

**Why Naive Solution Fails**
REST/JSON requires parsing text on every call. At 10,000 RPS between two internal services, JSON serialisation overhead is measurable. Adding Swagger/OpenAPI helps with typing but doesn't enforce it at compile time.

**Pattern**
Use **gRPC** — Google's RPC framework using **Protocol Buffers** (binary serialisation) over **HTTP/2**. Services define contracts in `.proto` files. Code is generated for client and server. Supports unary, server-streaming, client-streaming, and bidirectional streaming.

**Architecture**
```
order.proto:
  service OrderService {
    rpc GetOrder (GetOrderRequest) returns (Order);
    rpc PlaceOrder (PlaceOrderRequest) returns (PlaceOrderResponse);
    rpc StreamOrders (StreamRequest) returns (stream Order);
  }

Order Client (generated)          Order Server (generated stub)
    │                                      │
    │── GetOrder(id: "42") ──►(binary)─────►│
    │◄─ Order { id, status, total } ────────│
    │      (Protobuf binary, ~4x smaller)   │
```

**Request Flow**
```
1. Client calls generated stub: orderClient.getOrder({ id: "42" })
2. Protobuf serialises to binary
3. HTTP/2 sends binary frame (multiplexed)
4. Server deserialises, calls handler
5. Handler serialises response to Protobuf
6. HTTP/2 returns binary frame
7. Client deserialises to strongly-typed object
```

**Failure Scenario**
`.proto` file is updated with a breaking change (removed field). Generated client still sends old message. Server rejects with unknown field error. Silently corrupts data in some clients.

**Solution**
- **Never remove or renumber** existing Protobuf fields. Add new fields with new numbers.
- Use **Schema Registry** or versioned `.proto` files in a shared repository.
- Use **deadlines** on every gRPC call: `ctx.WithTimeout(ctx, 5*time.Second)`.
- gRPC **status codes**: use `UNAVAILABLE` for retryable errors, `INVALID_ARGUMENT` for client errors.

---

### 2.3 GraphQL

**Problem**
A mobile app and a desktop app consume the same REST API. Mobile needs only `name` and `thumbnail`. Desktop needs full product details. Two REST endpoints are needed, or mobile downloads unnecessary data (over-fetching). Adding new fields requires new API versions.

**Why Naive Solution Fails**
Multiple versioned REST endpoints are hard to maintain. BFF (Backend for Frontend) helps but requires maintaining separate backends per client. REST's fixed response shapes waste bandwidth on mobile.

**Pattern**
Use **GraphQL** — a query language where the **client specifies exactly what data it needs**. One endpoint (`/graphql`), any query. The server resolves the query against a schema. No over-fetching; no under-fetching.

**Architecture**
```
Mobile query:                     Desktop query:
  query {                           query {
    product(id: "1") {                product(id: "1") {
      name                             name
      thumbnail                        description
    }                                  fullImages
  }                                    price
                                       reviews { author, text }
                                     }
                                   }

Both hit: POST /graphql
Mobile response: { name, thumbnail } (small)
Desktop response: { name, desc, images, price, reviews } (full)
```

**Request Flow**
```
Client sends POST /graphql with query string
GraphQL server parses query against schema
Resolvers fetch data from databases / microservices
Response assembled per query shape
Client gets exactly what was requested
```

**Failure Scenario**
A deeply nested query (`orders → items → products → reviews → author → orders`) triggers N+1 database queries. 100 orders → 100 product queries → 100 review queries. DB overwhelmed.

**Solution**
- Use **DataLoader** (batching + caching): instead of 100 queries, one batch query per level.
- **Query complexity limits**: reject queries above a computed cost threshold.
- **Query depth limits**: max depth of 5 levels.
- **Persisted queries**: whitelist known safe queries (prevents arbitrary deep queries in production).

---

### 2.4 WebSockets

**Problem**
A user's browser needs real-time updates — order status changes, live notifications, collaborative editing. HTTP polling every second wastes bandwidth and adds latency. Server-Sent Events are one-directional.

**Why Naive Solution Fails**
HTTP polling: client asks "any news?" every second. 99% of polls return nothing. Bandwidth wasted. Latency = poll interval. Long polling improves it but still has overhead on reconnect.

**Pattern**
**WebSocket** upgrades an HTTP connection to a persistent, full-duplex TCP connection. The server can **push data at any time** without the client asking. Ideal for real-time dashboards, chat, live feeds, collaborative tools.

**Architecture**
```
Browser                         Order Service
   │                                  │
   │── HTTP Upgrade (WS handshake) ──►│
   │◄── 101 Switching Protocols ───────│
   │                                  │
   │   [persistent connection]         │
   │                                  │
   │◄── { event: "ORDER_UPDATED",      │  ← server pushes without client asking
   │      orderId: "42",               │
   │      status: "SHIPPED" }          │
   │                                  │
   │── { type: "PING" } ─────────────►│  ← client can also send
```

**Request Flow**
```
1. Browser: GET /ws/orders/42 with Upgrade: websocket header
2. Server: 101 Switching Protocols — TCP connection kept open
3. Server pushes JSON events as order status changes
4. Browser updates UI in real time
5. On disconnect: client reconnects with exponential backoff
```

**Failure Scenario**
WebSocket server restarts. 50,000 active connections all attempt to reconnect simultaneously. Server is overwhelmed by the reconnection storm.

**Solution**
- **Reconnect with exponential backoff + jitter**: `delay = min(base * 2^attempt + rand(0,1s), 30s)`
- Use a **message queue** (Redis Pub/Sub) so any server can push to any client (sticky sessions not needed).
- **Connection limits**: cap connections per server instance; load balancer distributes.
- **Heartbeat/ping-pong**: detect stale connections before the OS does.

---

### 2.5 Message Queues

**Problem**
Order Service needs to notify Inventory, Payment, and Notification services when an order is placed. If any downstream service is slow or down, the order placement should not fail or slow down.

**Why Naive Solution Fails**
Synchronous calls to 3 services in sequence: (1) slow downstream makes order placement slow, (2) if Payment Service is down, the order fails even though inventory was reserved, (3) adding a 4th downstream requires changing Order Service.

**Pattern**
Order Service publishes a message to a **queue** and returns immediately. Each downstream service consumes from its own queue independently, at its own pace. Producer and consumer are decoupled in time and space.

**Architecture**
```
Order Service                 Message Broker (RabbitMQ / SQS)
     │                               │
     │── publish OrderPlaced ────────►│
     │   (returns immediately)        │
     │                               │── Inventory Queue ──► Inventory Worker
     │                               │── Payment Queue ────► Payment Worker
     │                               │── Notify Queue ─────► Notification Worker
```

**Request Flow**
```
1. Order Service: INSERT order to DB + publish "OrderPlaced" to broker
2. Returns 201 to client immediately
3. Inventory Worker: dequeues, reserves stock
4. Payment Worker: dequeues, charges card
5. Notification Worker: dequeues, sends email
Steps 3-5 happen asynchronously, in any order, at their own pace.
```

**Failure Scenario**
Payment Worker crashes mid-processing. Message is in-flight (dequeued but not acknowledged). Worker restarts. Message is not acknowledged — broker redelivers it. Payment is charged twice.

**Solution**
- **Visibility timeout** (SQS) / **Ack mode**: message re-queued if not ACKed within timeout.
- Consumer must be **idempotent**: check if this payment was already processed before charging.
- Use a **deduplication ID** or check DB for existing payment before processing.
- **Dead Letter Queue (DLQ)**: after N retries, route to DLQ for manual inspection.

---

### 2.6 Event Streaming (Kafka)

**Problem**
Message queues work for point-to-point delivery but don't support: (1) multiple independent consumers reading the same event, (2) replaying past events for a new service, (3) processing millions of events per second with ordering guarantees.

**Why Naive Solution Fails**
RabbitMQ queues are destructive — once consumed, the message is gone. A new Analytics Service cannot read historical OrderPlaced events. Traditional queues don't scale to millions of events/second per topic.

**Pattern**
Use **Apache Kafka** — a distributed, persistent, ordered, replayable log. Events are retained for a configurable period (days/weeks/forever). Multiple consumer groups read independently. Each partition is strictly ordered.

**Architecture**
```
PRODUCERS                  KAFKA CLUSTER               CONSUMERS
Order Service ─────────►  Topic: orders               ──► Payment Consumer Group
                          Partition 0: [e1,e2,e3]         (offset: 3)
Inventory Svc ─────────►  Partition 1: [e4,e5,e6]     ──► Analytics Consumer Group
                          Partition 2: [e7,e8,e9]         (offset: 1, replaying)
                                                       ──► Audit Consumer Group
                           Retention: 7 days               (offset: 9, real-time)
```

**Request Flow**
```
1. Order Service: produce { orderId, customerId, items } to orders topic, key=orderId
2. Kafka assigns to partition based on key hash (same order always same partition)
3. Payment group: reads from its offset, processes, commits offset on success
4. Analytics group: reads from offset 0 (replaying history for new ML model)
5. Each consumer group is independent — one slow consumer doesn't affect others
```

**Failure Scenario**
Consumer processes a message, updates DB, but crashes before committing offset. On restart, Kafka re-delivers. DB updated twice.

**Solution**
- **Idempotent consumer**: wrap processing in DB transaction; store event offset in same DB.
- **Transactional consumer**: Kafka + DB in same transaction (Kafka exactly-once semantics).
- **Kafka transactions**: `producer.beginTransaction()` → produce + commit atomically.

---

## 3. Data Patterns

---

### 3.1 Database per Service

**Problem**
Multiple microservices share a single database. A schema change for one service requires coordinated deployment of all services. One service's slow query can starve all others. Services are tightly coupled at the data layer.

**Why Naive Solution Fails**
Shared schema creates: (1) deployment coupling — migrations must be backward compatible with ALL services, (2) performance coupling — one bad query from Service A can lock tables used by Service B, (3) technology coupling — all services must use the same DB technology.

**Pattern**
Each service has its **own private database** (or schema). No other service can access it directly. Data sharing happens via **APIs** (synchronous) or **events** (asynchronous).

**Architecture**
```
                    ┌─────────────────────────────────────┐
                    │  ✅ DATABASE PER SERVICE              │
                    │                                     │
┌──────────────┐    │  ┌──────────┐    ┌──────────────┐  │
│ Order Service│───►│  │ Orders   │    │  Customers   │  │
└──────────────┘    │  │ Postgres │    │  Postgres    │  │
                    │  └──────────┘    └──────────────┘  │
┌──────────────┐    │  ┌──────────┐    ┌──────────────┐  │
│ Catalog Svc  │───►│  │ Products │    │  Inventory   │  │
└──────────────┘    │  │ MongoDB  │    │  Redis       │  │
                    │  └──────────┘    └──────────────┘  │
                    └─────────────────────────────────────┘
Each service OWNS its DB. Cross-service data via API/events only.
```

**Request Flow**
```
Order Service needs customer name for an order:
  ✅ Option A (sync): GET /customers/42 → Customer Service returns {name, address}
  ✅ Option B (async): Subscribe to CustomerUpdated events → cache name locally
  ❌ Option C (wrong): SELECT * FROM customers WHERE id = 42 (direct DB access)
```

**Failure Scenario**
Customer Service is down. Order Service needs customer name to display on invoice. If Order Service calls Customer Service synchronously, invoice generation fails.

**Solution**
- **Store what you need**: Order Service stores a snapshot of the customer name at order time.
- **Event-sourced denormalisation**: Customer Service publishes CustomerUpdated → Order Service updates its local copy.
- **Eventual consistency is acceptable** for display data; use synchronous calls only for critical validation.

---

### 3.2 CQRS — Command Query Responsibility Segregation

**Problem**
A single data model tries to serve both complex write operations (business rules, validation, transactions) and complex read operations (aggregated views, search, reports). The same `Order` entity used for placing orders is also used for generating analytics dashboards — optimised for neither.

**Why Naive Solution Fails**
Adding indexes for reads slows down writes. Normalising for write integrity makes reads require expensive joins. Scaling reads requires scaling the write-path too.

**Pattern**
Separate the **write model** (Command side) from the **read model** (Query side). Commands update the write model (normalised, transactional). Queries read from one or more denormalised **projections** optimised for specific read needs. The projections are updated by events from the write side.

**Architecture**
```
COMMAND SIDE (writes)              QUERY SIDE (reads)
─────────────────────              ─────────────────────────────────
PlaceOrderCommand                  Order Summary Projection
  │                                  (flat, denormalized)
  ▼                                  { orderId, customerName, total,
Order Aggregate                       itemCount, status }
  │ domain logic                        ▲
  │ invariants enforced                 │ built from events
  ▼                                     │
Orders Write DB                  OrderConfirmedEvent ──────────────►
(Postgres, normalised)           OrderShippedEvent ───────────────►
  │                                                               │
  │ publishes domain events                                       ▼
  └──────────────────────────────────────────────────► Read DB
                                                        (Elasticsearch /
                                                         Redis / Postgres
                                                         denorm views)
```

**Request Flow**
```
WRITE PATH:
  POST /orders → OrderController → PlaceOrderUseCase → Order.confirm()
               → OrderRepository.save() → publishes OrderConfirmedEvent

READ PATH:
  GET /orders?customerId=42&status=CONFIRMED
  → QueryController → OrderSummaryQuery → Elasticsearch index
  → returns flattened, pre-aggregated results instantly
```

**Failure Scenario**
Event processor that updates the read model crashes. Read model lags behind write model. User places an order — it's confirmed in the write DB but doesn't appear in their order list for 30 seconds.

**Solution**
- Accept **eventual consistency** in read models — clearly communicate this to UX (loading states, refresh button).
- Make projections **idempotent**: processing the same event twice produces the same state.
- **Rebuild projections**: if corrupted, replay all events from the beginning to rebuild.
- Add **read-after-write consistency** for critical paths: immediately after placing order, return the order ID; the UI uses it to poll/subscribe for the order appearing.

---

### 3.3 Event Sourcing

**Problem**
An Order has a status: PENDING → CONFIRMED → SHIPPED → DELIVERED. You need to: (1) audit who changed what and when, (2) replay what happened, (3) rebuild a historical view of the order at any point in time. A state-based DB only stores the current state.

**Why Naive Solution Fails**
Adding an audit_log table is bolt-on — it's easy to miss updates, can be deleted, doesn't model the business process, and can't easily reconstruct intermediate states.

**Pattern**
Don't store the current state. Store the **sequence of events** that led to the current state. The current state is derived by replaying events. Events are immutable facts: `OrderCreated`, `ItemAdded`, `OrderConfirmed`, `OrderShipped`.

**Architecture**
```
EVENT STORE (append-only log)
──────────────────────────────────────────────────────────────────
Stream: order-42
  1. OrderCreated    { customerId, address }           t=10:00:00
  2. ItemAdded       { productId: p1, qty: 2 }         t=10:00:01
  3. ItemAdded       { productId: p2, qty: 1 }         t=10:00:02
  4. OrderConfirmed  { total: 149.99 }                 t=10:01:00
  5. PaymentReceived { amount: 149.99, txnId: "x1" }   t=10:01:05
  6. OrderShipped    { trackingNo: "TRK-001" }         t=10:05:00

Current state = replay events 1-6:
  { status: SHIPPED, items: [p1×2, p2×1], total: 149.99 }

State at t=10:01:03 = replay events 1-4:
  { status: CONFIRMED, items: [p1×2, p2×1], total: 149.99 }
```

**Request Flow**
```
COMMAND: ConfirmOrder(orderId=42)
  1. Load events for stream order-42
  2. Replay to reconstitute Order aggregate
  3. Call order.confirm() — validates business rules
  4. Append OrderConfirmed event to stream (atomic)
  5. Event handler updates CQRS read model

QUERY: GetOrder(id=42)
  → Read from CQRS read model (pre-built projection)
  → Do NOT replay events per query (too slow)
```

**Failure Scenario**
Event store has 5 million events for a high-activity order stream. Replaying all events on every command takes 30 seconds.

**Solution**
- **Snapshots**: periodically save current aggregate state. On load: fetch latest snapshot + only events since snapshot.
- **Snapshotting policy**: snapshot every 100 events or every 24 hours.
- **Separate read model**: never query the event store directly — always query the CQRS projection.

---

### 3.4 Materialized View

**Problem**
A query joins 5 tables across 3 services. Each query takes 2 seconds. The dashboard runs this query 1,000 times per second. The DB is overwhelmed.

**Why Naive Solution Fails**
Adding more read replicas helps but doesn't eliminate the expensive join. Caching helps but cache invalidation is complex when any of the 5 tables changes.

**Pattern**
**Pre-compute and store** the result of complex queries as a **Materialized View** — a read-optimised, denormalised snapshot updated asynchronously as underlying data changes.

**Architecture**
```
WRITE SIDE                      MATERIALIZED VIEW (read side)
───────────────                 ──────────────────────────────────
orders table                    order_summary_view
order_lines table   ─events─►  { orderId, customerName, total,
customers table                   itemNames, status, createdAt }
products table
                                Updated by:
                                  OrderConfirmedEvent → update view
                                  CustomerUpdatedEvent → update view
                                  ProductRenamedEvent → update view

QUERY: SELECT * FROM order_summary_view WHERE status='SHIPPED'
  → 1ms (pre-computed, indexed, no joins)
```

**Request Flow**
```
1. Event: OrderConfirmed { orderId: 42, customerId: 1, items: [...] }
2. View Updater: fetch customer name + product names
3. Write to order_summary_view: { orderId:42, customerName:'Alice', ... }
4. Read query: SELECT * FROM order_summary_view → instant, no joins
```

**Failure Scenario**
View updater crashes. 1,000 events pile up. View is stale for 5 minutes. Dashboard shows old data.

**Solution**
- Views are **eventually consistent** — explicitly document the staleness SLA.
- Make the view updater **idempotent**: processing the same event twice produces correct state.
- **Monitor lag**: alert if view is more than N minutes behind the event stream.
- Provide **manual rebuild** capability: replay all events to rebuild the view from scratch.

---

## 4. Reliability Patterns

---

### 4.1 Circuit Breaker

**Problem**
Order Service calls Payment Service. Payment Service starts responding slowly (DB connection pool exhaustion). Order Service threads block waiting. Thread pool fills. Order Service stops responding. Upstream services also start failing. Cascading failure takes down the entire system.

**Why Naive Solution Fails**
Without a circuit breaker, every request waits for the full timeout (e.g., 30s). With 100 requests/second and a 30s timeout, 3,000 threads are blocked simultaneously. System collapses.

**Pattern**
The **Circuit Breaker** wraps calls to external services. It monitors failures. When failures exceed a threshold, it **opens** — all calls fail immediately without attempting the network call. After a cooldown, it allows a probe request. If successful, it **closes** again.

**Architecture**
```
CIRCUIT BREAKER STATE MACHINE:

         failures > threshold
CLOSED ─────────────────────────► OPEN
  │                                  │
  │ success                          │ cooldown expires
  │                                  ▼
  └──────────────────────────── HALF-OPEN
                                     │
                          probe request sent
                          success → CLOSED
                          failure → OPEN

CLOSED:    Normal. Calls pass through. Count failures.
OPEN:      Fast-fail. Return fallback. No calls made.
HALF-OPEN: One probe call. Decide based on result.
```

**Request Flow**
```
CLOSED (normal):
  Order Service → [CB: CLOSED] → Payment Service → 200 OK
  CB records: success (0 failures)

OPENING:
  Order Service → [CB: CLOSED] → Payment Service → timeout × 5
  CB: 5 failures in 10s window → OPEN

OPEN (fast-fail):
  Order Service → [CB: OPEN] → return fallback immediately
  No call to Payment Service. Response in <1ms.

HALF-OPEN (probe):
  After 30s cooldown, CB allows one request
  Payment Service → 200 OK → CB transitions to CLOSED
```

**Failure Scenario**
Circuit opens. The fallback returns "payment service unavailable". But the client retries immediately, generating more load. Even with the circuit open, retry storms amplify pressure on recovery.

**Solution**
- Return **503 with Retry-After header** when circuit is open.
- Use **exponential backoff + jitter** on retries.
- Implement **bulkhead** alongside circuit breaker to limit concurrent calls.
- Monitor circuit state as a metric — alert when circuit opens.

---

### 4.2 Retry

**Problem**
A transient network blip causes one gRPC call to fail. The business operation fails for the user even though the downstream service is perfectly healthy. Transient failures (packet loss, brief DB connection hiccup) are inevitable in distributed systems.

**Why Naive Solution Fails**
No retry: transient failures become user-visible errors unnecessarily.
Immediate retry: adds load during a real failure (thundering herd). Retry on non-idempotent operations (POST) can cause duplicate side effects.

**Pattern**
Automatically retry **idempotent** operations on transient failures using **exponential backoff with jitter** to prevent thundering herd.

**Architecture**
```
Retry policy:
  max_attempts: 3
  initial_interval: 100ms
  multiplier: 2.0
  max_interval: 5s
  jitter: ±50ms
  retryable_codes: [503, 429, UNAVAILABLE, RESOURCE_EXHAUSTED]
  non_retryable_codes: [400, 401, 403, 404, INVALID_ARGUMENT]

Attempt 1: t=0ms    → timeout (500ms)
Attempt 2: t=700ms  → 200ms + 100ms jitter = wait 100ms+jitter
Attempt 3: t=1.5s   → 200ms wait (capped)
Fail fast: return error to caller
```

**Request Flow**
```
1. Call Payment Service → connection reset (transient)
2. Wait 100ms + jitter(50ms) = 127ms
3. Retry → 200 OK
4. Return success to caller (user experienced ~127ms extra latency)
```

**Failure Scenario**
Payment Service has a bug causing it to return 500 on every request. Retry makes 3 attempts × 1,000 concurrent users = 3,000 requests instead of 1,000. Payment Service collapses under amplified load.

**Solution**
- Only retry **retryable** status codes (503, 429, network timeouts). Never retry 4xx (client errors) or non-idempotent operations without idempotency keys.
- **Jitter** prevents all retries firing at the same time.
- **Circuit breaker** stops retries after the service is clearly down.
- **Idempotency key** makes POST safe to retry: server checks key before processing.

---

### 4.3 Timeout

**Problem**
Order Service calls Shipping Service which calls a third-party carrier API. The carrier API hangs — never responds, never closes the connection. Order Service thread blocks forever. Eventually all threads are blocked on zombie connections.

**Why Naive Solution Fails**
Without timeouts, one slow downstream can exhaust the entire thread pool. In non-blocking systems, without deadlines, pending futures accumulate without bound, consuming memory.

**Pattern**
Set **connection timeout** (time to establish connection) and **read/response timeout** (time to receive response) on every outbound call. Use **deadline propagation** in gRPC to pass the remaining budget down the call chain.

**Architecture**
```
Timeout hierarchy (each child has smaller timeout than parent):

Client call (10s budget)
  └── API Gateway (9s deadline)
        └── Order Service (7s deadline)
              ├── Inventory Service (3s deadline)
              │     └── DB query (2s timeout)
              └── Shipping Service (3s deadline)
                    └── Carrier API (2s timeout)

If Carrier API takes 5s:
  Shipping Service times out at 3s → returns 503
  Order Service receives 503 within budget
  API Gateway has margin to return graceful error to client
```

**Request Flow**
```
gRPC deadline propagation:
  Client creates ctx with 10s deadline
  ctx passed to every downstream call
  Each service checks ctx.Done() before starting work
  If deadline exceeded mid-processing: stop, return DEADLINE_EXCEEDED
```

**Failure Scenario**
All services set the same 30-second timeout. Parent waits 30s, child waits 30s, grandchild waits 30s. Total potential wait = 90s. Thread pools fill. System appears frozen.

**Solution**
- **Timeout budgets decrease** at each hop (never increase).
- Use **gRPC deadline propagation** — the parent's deadline automatically applies to children.
- Distinguish **connection timeout** (fast — 1s) from **read timeout** (depends on operation — 5-30s).
- Monitor p99 latency — set timeout at ~2× p99 (not p100, which could be pathological outliers).

---

### 4.4 Bulkhead

**Problem**
Order Service calls both Inventory Service (fast, 10ms) and Recommendation Service (slow, 2s). Both use the same HTTP connection pool (100 threads). Recommendation Service gets slow. 100 threads fill up waiting for recommendations. Inventory calls queue behind them. Order placement fails even though Inventory Service is perfectly healthy.

**Why Naive Solution Fails**
A shared thread pool or connection pool means any slow downstream can consume all available capacity, starving fast, critical services.

**Pattern**
**Isolate** resources (thread pools, connection pools, semaphores) per downstream service. Like a ship's bulkhead — a breach in one compartment doesn't flood others.

**Architecture**
```
WITHOUT BULKHEAD:
  Order Service → [100 shared threads] → Inventory (10ms)
                                        → Recommendations (2s) ← fills all threads

WITH BULKHEAD:
  Order Service → [20 threads: Inventory Pool] → Inventory Service
               → [10 threads: Reco Pool]       → Recommendation Service
               → [20 threads: Payment Pool]    → Payment Service

Recommendation pool fills → only recommendations fail
Inventory and Payment pools unaffected
```

**Request Flow**
```
1. Recommendation Service gets slow
2. Reco pool fills (10/10 threads in use)
3. New recommendation requests → rejected immediately (no thread available)
4. Inventory pool unaffected (separate 20 threads)
5. Order placement continues with fallback: no recommendations shown
```

**Failure Scenario**
Bulkhead for Recommendation Service is set too large (50 threads). When it fails, it still consumes 50 threads. Not enough isolation.

**Solution**
- Size bulkheads based on **expected concurrency per service** (not max capacity).
- Combine with **circuit breaker** — when bulkhead rejects, circuit breaker tracks failures.
- Expose bulkhead pool metrics: queue size, active count, rejection count.
- Return **fallback response** when bulkhead is full (e.g., empty recommendations).

---

### 4.5 Rate Limiting

**Problem**
A single client (or bot) sends 10,000 requests per second to the API. Server is overwhelmed. Legitimate users get 503 errors. The system is effectively DDoS'd by one customer.

**Why Naive Solution Fails**
Without rate limiting, one badly behaved client can consume all server resources. Server-side queueing without limits means memory grows unbounded. The "polite" clients are starved.

**Pattern**
Enforce per-client (or per-IP, per-API-key) request limits. Common algorithms: **Token Bucket** (allows bursts), **Fixed Window** (simple), **Sliding Window** (smooth), **Leaky Bucket** (constant output rate).

**Architecture**
```
TOKEN BUCKET (most common):
  Bucket capacity: 100 tokens
  Refill rate: 10 tokens/second

  Client sends request → consume 1 token
  Token available → allow request
  No tokens → return 429 Too Many Requests

  Allows burst up to 100 requests, then sustains 10 req/s
  Implemented in Redis: INCR + EXPIRE per key per window

SLIDING WINDOW (Redis):
  Key: rate_limit:{api_key}:{minute}
  INCR → if count > limit → 429
  EXPIRE 60 seconds

Per-tier limits:
  Free:       100 req/min
  Pro:        1,000 req/min
  Enterprise: 10,000 req/min
```

**Request Flow**
```
1. Request arrives at API Gateway
2. Extract API key from Authorization header
3. Redis: INCR rate_limit:key123:2025061510 → returns count
4. If count > limit: return 429, Retry-After: 37 (seconds until window resets)
5. If count <= limit: forward request
```

**Failure Scenario**
Redis is down. Rate limiting check fails. Two choices: (1) fail open (allow all requests — DDoS risk), (2) fail closed (reject all requests — service unavailable).

**Solution**
- **Fail open with alerting** for rate limiting Redis failure — acceptable for most APIs.
- **Local in-memory fallback** with coarser limits when Redis is unavailable.
- Return **Retry-After** and **X-RateLimit-Remaining** headers — polite clients back off.
- Distinguish **rate limits** (sustained) from **concurrency limits** (simultaneous requests).

---

### 4.6 Backpressure

**Problem**
Order processing pipeline: API receives 10,000 orders/second. DB can only persist 1,000/second. Without backpressure, the queue fills unboundedly. Memory grows. Eventually the service crashes with OOM.

**Why Naive Solution Fails**
Unbounded queues mask the problem temporarily but cause latency to grow and eventual OOM crash. The failure mode is unpredictable and hard to diagnose.

**Pattern**
**Propagate the pressure upstream**: when a downstream component is overwhelmed, it signals upstream to slow down. Each component respects the signal and either slows production or rejects excess requests with 429.

**Architecture**
```
Producer                  Queue           Consumer (DB writes)
1,000 orders/s ─────────► [■■■■■□□□□□] ──► 500 orders/s

Queue fills above 80% threshold
  → Consumer signals: "I'm overwhelmed"
  → Queue signals upstream: "Slow down"
  → API Gateway: return 503 to new requests

Reactive Streams (RxJS / Project Reactor):
  consumer.request(N) ← consumer pulls only N items at a time
  producer slows to match consumer's N
```

**Request Flow**
```
Reactive flow:
1. Consumer subscribes with request(100) — "give me 100 items"
2. Producer emits up to 100 items
3. Consumer processes 100 items, signals request(100) again
4. If consumer is slow, it simply doesn't request more
5. Producer naturally slows — no buffer needed
```

**Failure Scenario**
Backpressure signal never reaches the HTTP API layer. Users still get 200 responses but their orders are silently queued for hours. Orders appear confirmed but aren't processed.

**Solution**
- Propagate 429/503 all the way to the client.
- Use **bounded queues** — reject enqueue when full rather than growing unboundedly.
- Monitor **queue depth** as a primary health metric — alert before the queue fills.
- Implement **load shedding**: drop low-priority work (non-critical events, analytics) to protect critical paths.

---

### 4.7 Health Checks

**Problem**
A service instance's process is running but it cannot connect to its database. The load balancer sees the process as "up" (TCP port open) and continues sending requests. All requests fail. Users get errors. The failed instance is never removed from rotation.

**Why Naive Solution Fails**
TCP-level health checks only verify the process is alive — not that it can actually serve traffic. A running process with a broken DB connection is not healthy.

**Pattern**
Implement **liveness** and **readiness** probes. **Liveness**: is the process stuck/deadlocked? If no → restart. **Readiness**: can the service actually serve traffic right now? If no → remove from load balancer.

**Architecture**
```
GET /health/live  → 200 OK if process is alive (not deadlocked)
                    If deadlocked → 503 → Kubernetes restarts pod

GET /health/ready → 200 OK only if ALL dependencies are healthy:
                    ✅ DB connection: SELECT 1 → OK
                    ✅ Redis connection: PING → PONG
                    ✅ Required config loaded
                    ❌ DB connection failed → 503
                    → Kubernetes removes pod from load balancer

GET /health       → detailed health report (for ops team, NOT public)
  {
    "status": "degraded",
    "db": { "status": "up", "latencyMs": 5 },
    "redis": { "status": "down", "error": "connection refused" },
    "kafka": { "status": "up", "consumerLag": 42 }
  }
```

**Request Flow**
```
Kubernetes probes /health/ready every 10s:
1. DB is down → /health/ready returns 503
2. K8s marks pod NotReady
3. Pod removed from Service Endpoints → no traffic sent to it
4. Other pods absorb traffic
5. DB recovers → /health/ready returns 200
6. K8s marks pod Ready → traffic resumes
```

**Failure Scenario**
Deep health check connects to DB on every probe (every 5s). 10 pods × every 5s = 2 DB connections/second just for health checks. Under load, health check queries compete with real traffic.

**Solution**
- Use a **cached health result** (refresh every 10s, return cached value for health endpoint).
- Keep health check queries **lightweight** (`SELECT 1`, `PING`) — not real queries.
- Set **start_period** (Kubernetes) to give slow-starting services time to warm up before probes begin.
- Distinguish: liveness probe (cheap — just check if alive), readiness probe (moderate — check dependencies).

---

## 5. Integration Patterns

---

### 5.1 API Gateway

**Problem**
Clients (browser, mobile, IoT) call 15 different microservices directly. Each service has its own auth scheme, rate limiting, and URL. Mobile app needs to make 8 calls to assemble one screen. Service URLs are exposed publicly. Every service must implement CORS, SSL termination, and JWT validation.

**Why Naive Solution Fails**
Clients directly calling services: (1) exposes internal topology, (2) clients must know all service URLs, (3) cross-cutting concerns duplicated in every service, (4) mobile apps make too many round-trips (chatty API problem).

**Pattern**
An **API Gateway** is a single entry point for all clients. It handles cross-cutting concerns (auth, rate limiting, SSL, CORS) and routes to the appropriate microservice. It can also **aggregate** multiple service calls into one response.

**Architecture**
```
                          ┌──────────────────────────────────────┐
Client ──── HTTPS ───────►│           API GATEWAY                │
                          │  SSL Termination                     │
                          │  JWT Validation                      │
                          │  Rate Limiting                       │
                          │  Request Routing                     │
                          │  Response Aggregation                │
                          │  Logging / Tracing                   │
                          └──────┬───────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       Order Service      User Service       Product Service
       (internal only)    (internal only)    (internal only)
```

**Request Flow**
```
GET /dashboard (one client call → gateway fans out)
  1. Gateway: verify JWT
  2. Gateway: call User Service → GET /users/42
  3. Gateway: call Order Service → GET /orders?userId=42&limit=5
  4. Gateway: call Product Service → GET /products?ids=1,2,3
  5. Gateway: merge responses → return single JSON to client

Client: 1 HTTP call
Internally: 3 parallel service calls
Latency: max(t1, t2, t3) not sum
```

**Failure Scenario**
API Gateway becomes a single point of failure. If the gateway crashes, ALL clients lose access to ALL services simultaneously.

**Solution**
- Run **multiple gateway instances** behind a load balancer.
- Gateway must be **stateless** — all state (rate limit counts, session) in Redis.
- Use managed gateway (AWS API Gateway, Kong, Nginx) with built-in HA.
- Implement **health checks** and auto-restart for gateway instances.

---

### 5.2 Backend for Frontend (BFF)

**Problem**
A single generic API serves web, iOS, and Android clients. Web needs full product details. iOS needs compact responses (limited bandwidth). Android has different UX requirements. One team owns the API — all clients wait for changes.

**Why Naive Solution Fails**
One API → lowest common denominator. Either over-fetches for mobile or under-fetches for web. API becomes bloated with `?fields=...` query parameters. Different client teams fight over the same API.

**Pattern**
Create a **separate backend** for each frontend type. Each BFF is owned by the frontend team and tailored exactly for that client's needs. BFFs call the same downstream microservices.

**Architecture**
```
┌──────────┐    ┌────────────────┐    ┌─────────────┐
│  Browser │──► │   Web BFF      │──► │             │
└──────────┘    │  (Next.js/Node)│    │   Order     │
                └────────────────┘    │   Service   │
┌──────────┐    ┌────────────────┐    │             │
│  iOS App │──► │   iOS BFF      │──► │   User      │
└──────────┘    │  (Node.js)     │    │   Service   │
                └────────────────┘    │             │
┌──────────┐    ┌────────────────┐    │  Product    │
│ Android  │──► │  Android BFF   │──► │   Service   │
└──────────┘    │  (Node.js)     │    └─────────────┘
```

**Request Flow**
```
iOS BFF GET /home (mobile home screen):
  → calls Product Service: GET /products/featured (3 fields only)
  → calls User Service: GET /users/me (name only)
  → returns compact { userName, featuredProducts: [{ id, name, price }] }

Web BFF GET /home:
  → calls Product Service: GET /products/featured (all fields)
  → calls Order Service: GET /orders/recent
  → returns full { user, recentOrders, featuredProducts, recommendations }
```

**Failure Scenario**
BFF aggregates 5 service calls. One service times out. Whole BFF response delays or fails.

**Solution**
- Call independent services **in parallel** (Promise.all).
- Use **partial responses**: if Recommendations fails, return the page without recommendations (graceful degradation).
- Set **per-service timeouts** in the BFF — don't let one slow service delay the whole page.

---

### 5.3 Service Mesh

**Problem**
Each microservice implements retry logic, circuit breakers, mTLS, and distributed tracing in its own language (Node.js, Java, Go). The implementations differ subtly. Updating the retry policy means re-deploying 30 services. Service-to-service communication is unencrypted inside the cluster.

**Why Naive Solution Fails**
Embedding networking logic in application code means: (1) language-specific libraries (Hystrix for Java, axios-retry for Node), (2) inconsistent behaviour, (3) difficult to update centrally, (4) no encryption without code changes.

**Pattern**
A **service mesh** injects a **sidecar proxy** (Envoy) alongside every service instance. All inbound and outbound traffic goes through the sidecar. Network policy (retries, timeouts, circuit breaking, mTLS, tracing) is configured in the **control plane** — not in application code.

**Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│  KUBERNETES POD                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  App Container     │   Envoy Sidecar                │   │
│  │  (Order Service)   │   - mTLS termination           │   │
│  │                    │   - retries (3x, 100ms backoff) │   │
│  │  app:8080 ─────────►   - circuit breaker            │   │
│  │                    │   - distributed tracing         │   │
│  │                    │   - load balancing              │   │
│  │                    │   envoy:15001                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  All traffic: App → Envoy (localhost) → Envoy → App         │
└─────────────────────────────────────────────────────────────┘

CONTROL PLANE (Istio):
  VirtualService:  retry policy, timeout, traffic routing
  DestinationRule: circuit breaker, load balancing algorithm
  PeerAuthentication: mTLS enforcement
```

**Request Flow**
```
Order Service → Payment Service:
1. Order app calls localhost:15001 (Envoy sidecar)
2. Envoy adds mTLS cert, trace headers, applies retry policy
3. Envoy routes to Payment Service Envoy sidecar
4. Payment Envoy terminates mTLS, passes to app:8080
5. Metrics + traces captured at both Envoy sidecars
6. No application code involved in any of this
```

**Failure Scenario**
Envoy sidecar crashes. The application container loses all network connectivity — it can't receive or send requests.

**Solution**
- Use **liveness probes** to restart the pod if sidecar crashes.
- Run Envoy sidecar in **same pod** so K8s restarts both together.
- Service mesh adds latency (extra hop) — monitor sidecar p99 latency separately.

---

### 5.4 Service Discovery

**Problem**
Payment Service runs on 5 pods with dynamic IP addresses. Order Service needs to call Payment Service. Hard-coding IPs is impossible in dynamic environments. DNS TTL caching causes stale records during pod restarts.

**Why Naive Solution Fails**
Static configuration: updating IP addresses requires redeployment of all caller services. Not feasible in a Kubernetes environment where pod IPs change on every restart.

**Pattern**
Services register themselves in a **Service Registry**. Callers query the registry to discover available instances. Kubernetes uses **DNS-based discovery** natively. Consul/Eureka provide more advanced dynamic discovery.

**Architecture**
```
CLIENT-SIDE DISCOVERY (Eureka/Consul):
  Payment Service → registers: { name: payment-service, ip: 10.1.2.3, port: 8080 }
  Order Service   → queries:   GET /v1/catalog/service/payment-service
                  ← returns:   [10.1.2.3:8080, 10.1.2.4:8080, 10.1.2.5:8080]
  Order Service   → load-balance across instances

SERVER-SIDE DISCOVERY (Kubernetes):
  payment-service.default.svc.cluster.local → ClusterIP (virtual)
  kube-proxy iptables → routes to one of 5 pod IPs
  Caller only knows the DNS name — never individual pod IPs
```

**Request Flow**
```
Kubernetes DNS-based:
1. Order Service: curl http://payment-service:8080/pay
2. DNS resolves: payment-service.default.svc.cluster.local → 10.96.42.10
3. kube-proxy: 10.96.42.10 → DNAT to one of [10.1.2.3, 10.1.2.4, 10.1.2.5]
4. Round-robin across healthy endpoints
5. Unhealthy pods removed from endpoints by readiness probe failure
```

**Failure Scenario**
Payment Service has 3 pods. 2 pods crash simultaneously. DNS still resolves to the Service ClusterIP. But iptables rules haven't updated. 2/3 of requests go to crashed pods until K8s removes them (~10s).

**Solution**
- Configure **readiness probes** — K8s removes pod from endpoints as soon as readiness fails (before pod is deleted).
- Use **connection retry** at the client — retry on connection refused.
- Service mesh (Envoy) provides faster health-check-based removal than kube-proxy.

---

### 5.5 Sidecar Pattern

**Problem**
Every service in a polyglot microservices system (Node.js, Java, Go, Python) needs: logging agent, metrics collector, certificate rotation, proxy. Each team implements these independently, inconsistently.

**Why Naive Solution Fails**
Library-per-language approach: (1) 4 different logging libraries across 4 languages, (2) different metric formats, (3) security patches require updates to all libraries in all languages, (4) no centralised observability.

**Pattern**
Deploy a **helper container** (sidecar) in the same pod as the main application. The sidecar handles cross-cutting concerns. The main application communicates with it via localhost. The sidecar is language-agnostic.

**Architecture**
```
POD
┌──────────────────────────────────────────────────────────┐
│  ┌─────────────────────────┐  ┌──────────────────────┐  │
│  │   Main Container        │  │   Sidecar Container  │  │
│  │   (Node.js app)         │  │   (Fluentd / Envoy)  │  │
│  │                         │  │                      │  │
│  │  logs → /var/log/app.log│  │  tails /var/log/     │  │
│  │  :8080 app traffic  ────┼─►│  :15001 proxy        │  │
│  │                         │  │  ships logs to ELK   │  │
│  └─────────────────────────┘  └──────────────────────┘  │
│                  Shared volume: /var/log                  │
└──────────────────────────────────────────────────────────┘
```

**Request Flow**
```
Logging sidecar:
1. App writes JSON logs to /var/log/app.log (shared volume)
2. Fluentd sidecar tails the file
3. Fluentd parses, enriches (adds pod name, namespace), ships to ELK
4. App has zero coupling to logging infrastructure

Proxy sidecar (Envoy):
1. All outbound traffic routed through Envoy via iptables rules
2. Envoy adds tracing headers, mTLS, retries
3. App calls http://payment-service:8080 — doesn't know about Envoy
```

**Failure Scenario**
Sidecar uses more memory than expected. Main container is OOM-killed due to total pod memory limit being shared between main + sidecar.

**Solution**
- Set **separate resource limits** for sidecar and main container within the pod.
- Monitor **sidecar resource usage** separately in Grafana.
- Use `priorityClassName` to ensure main container is not killed before sidecar in resource pressure.

---

### 5.6 Anti-Corruption Layer (ACL)

**Problem**
Order Service integrates with a legacy CRM system. The CRM uses a different model: "Prospect" instead of "Customer", "DealValue" instead of "total", dates in MM/DD/YYYY format. Leaking this model into Order Service contaminates the domain model.

**Why Naive Solution Fails**
Without an ACL, Order Service code becomes littered with `prospect.getDealValue()` and date format conversions. The legacy model infects the clean domain model. When the CRM is eventually replaced, changes are everywhere.

**Pattern**
Introduce a **translation layer** between the systems. The ACL maps the external model to the internal domain model. Neither system knows the other's model. The ACL is the only place that knows both.

**Architecture**
```
Order Context                ACL                    CRM (Legacy)
─────────────────            ────────────────────   ────────────────
Customer {                   CrmAdapter             Prospect {
  id,                          translate()            prospectId,
  name,                          Prospect             firstName,
  email                          → Customer           lastName,
}                                                     dealValue,
                                                      createDate: "MM/DD"
                                                    }

Order Service:
  customer = crmAdapter.getCustomerById("42")
  // Returns Customer (Order's model) — never Prospect
```

**Request Flow**
```
1. Order Service needs customer data: acl.getCustomer("42")
2. ACL calls CRM API: GET /prospects/42
3. ACL receives Prospect { prospectId, firstName, lastName, dealValue }
4. ACL translates: Customer { id: "42", name: "Alice Smith", email: ... }
5. Order Service receives Customer — clean domain model, no CRM concepts
```

**Failure Scenario**
CRM changes its API (new field names, different endpoint). Without ACL, changes cascade to Order Service. With ACL, only the ACL needs updating.

**Solution**
- ACL is the **only place** that imports CRM client/model.
- Write **contract tests** for the ACL: given a CRM response shape, assert the correct Customer is produced.
- **Cache** CRM responses in the ACL (customer data changes infrequently).

---

## 6. Transaction Patterns

---

### 6.1 Saga Pattern

**Problem**
Placing an order requires: (1) reserving inventory, (2) charging payment, (3) creating a shipment. These span 3 microservices with 3 separate databases. A 2-phase commit (distributed ACID transaction) requires all services to lock resources simultaneously — doesn't scale and couples services.

**Why Naive Solution Fails**
**2PC (Two-Phase Commit)**: coordinator asks all participants to "prepare" (lock resources), then "commit". Problems: (1) coordinator failure leaves all participants locked forever, (2) blocking protocol — all participants wait for coordinator, (3) requires distributed transaction coordinator support in all DBs.

**Pattern**
A **Saga** is a sequence of **local transactions**. Each step publishes an event or calls the next service. If a step fails, **compensating transactions** undo the completed steps. Sagas have **two flavours**: Choreography and Orchestration.

**Architecture** (see 6.2 Choreography and 6.3 Orchestration)

**Failure Scenario** (covered per flavour below)

---

### 6.2 Saga — Choreography

**Problem**
Saga needs to coordinate across services without a central coordinator that becomes a bottleneck or single point of failure.

**Why Naive Solution Fails**
A central orchestrator adds latency (extra hop), becomes a SPOF, and creates tight coupling between the orchestrator and all participant services.

**Pattern**
Each service **reacts to events** and emits new events. There is no central coordinator. Services know what events to react to and what events to emit. Compensation is triggered by failure events.

**Architecture**
```
HAPPY PATH:
Order Svc → OrderCreated ──────────────────────────────────────────►
                                                                    │
              Inventory Svc ← OrderCreated ── reserves stock        │
              Inventory Svc → StockReserved ─────────────────────── │
                                                                    │
                              Payment Svc ← StockReserved ── charges│
                              Payment Svc → PaymentConfirmed ───────►
                                                                    │
                                            Order Svc ← PaymentConfirmed
                                            Order Svc → status = CONFIRMED

FAILURE PATH (payment fails):
  Payment Svc → PaymentFailed ──────────────────────────────────────►
                                                                     │
  Inventory Svc ← PaymentFailed ── releases reserved stock (compensate)
  Inventory Svc → StockReleased
  Order Svc ← PaymentFailed ── status = FAILED, notifies customer
```

**Request Flow**
```
1. POST /orders → Order Service creates order (PENDING), emits OrderCreated
2. Inventory Service: receives OrderCreated, reserves stock, emits StockReserved
3. Payment Service: receives StockReserved, charges card, emits PaymentConfirmed
4. Order Service: receives PaymentConfirmed, sets status = CONFIRMED
5. Notification Service: receives PaymentConfirmed, sends email
```

**Failure Scenario**
Cyclic event dependencies: Service A emits event X → Service B reacts, emits event Y → Service A reacts, emits event X again. Infinite loop.

**Solution**
- Design events to be **one-way flows** (no cycles).
- Use an **event correlation ID** (`sagaId`) to track which events belong to which saga instance.
- Implement a **saga state tracker** (separate table) to detect stuck sagas and trigger timeouts.

---

### 6.3 Saga — Orchestration

**Problem**
Choreography makes it hard to understand the full workflow — logic is spread across all services. A bug in the saga requires tracing events across 5 services in Kibana. Adding a new step requires modifying multiple services.

**Why Naive Solution Fails**
Choreography has "hidden" workflow logic. There's no single place to look to understand what the saga does. Testing the full saga requires integration tests across all services.

**Pattern**
A **Saga Orchestrator** (implemented in its own service or using a workflow engine) explicitly commands each step. It knows the full workflow. It handles failures and triggers compensations.

**Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                   SAGA ORCHESTRATOR                             │
│                                                                 │
│  state machine: PENDING → RESERVING → CHARGING → CONFIRMED     │
│                         → RELEASING (on failure)               │
│                                                                 │
│  Step 1: call InventoryService.reserveStock(items)             │
│           success → step 2 | failure → compensate             │
│                                                                 │
│  Step 2: call PaymentService.chargeCard(amount)                │
│           success → step 3 | failure → compensate (step 1)    │
│                                                                 │
│  Step 3: call OrderService.confirmOrder(orderId)               │
│           success → DONE                                       │
│                                                                 │
│  Compensate: call InventoryService.releaseStock(items)         │
└──────────────────┬──────────────────────────────────────────────┘
                   │ commands (sync or async)
         ┌─────────┼───────────┐
         ▼         ▼           ▼
   Inventory    Payment    Order Svc
   Service      Service
```

**Request Flow**
```
1. Order placed → SagaOrchestrator.startSaga(orderId)
2. Orchestrator: CommandInventory.reserve(items) → awaits result
3. Success: CommandPayment.charge(amount) → awaits result
4. Success: CommandOrder.confirm(orderId) → awaits result
5. All success: saga complete → emit SagaCompleted event

On step 2 failure:
  Orchestrator: CommandInventory.release(items) ← compensate
  SagaFailed → notify customer
```

**Failure Scenario**
Orchestrator crashes between step 2 (payment charged) and step 3 (order confirmed). Payment was taken but order not confirmed. Customer charged but no order.

**Solution**
- **Persist saga state to DB** before each step. On recovery, replay from last persisted state.
- Use **idempotent commands**: calling `confirmOrder` twice produces the same result.
- Use **Temporal** or **AWS Step Functions** — they handle saga state persistence, retries, and timeouts automatically.

---

### 6.4 Transactional Outbox

**Problem**
Order Service saves the order to DB and then publishes `OrderPlaced` to Kafka. Between the DB commit and the Kafka publish, the service crashes. Order is saved. Event is never published. Inventory never reserves stock. Silent data inconsistency.

**Why Naive Solution Fails**
Two-phase commit across DB and Kafka is not supported. You can't atomically write to a DB and a message broker in the same transaction using standard tools.

**Pattern**
Write the event to an **outbox table in the same DB transaction** as the business data. A separate **relay process** reads committed outbox events and publishes them to Kafka. Atomicity of business write + event write is guaranteed by the DB transaction.

**Architecture**
```
ORDER SERVICE:
  BEGIN;
    INSERT INTO orders (id, status) VALUES (:id, 'PENDING');
    INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload, created_at)
      VALUES (uuid(), 'Order', :id, 'OrderPlaced', :payload, NOW());
  COMMIT;  ← atomic: both or neither

OUTBOX RELAY (separate process or CDC):
  Poll: SELECT * FROM outbox WHERE published = false ORDER BY created_at LIMIT 100
  For each:
    publish to Kafka (idempotent producer)
    UPDATE outbox SET published = true WHERE id = :id
  ── OR ──
  Debezium CDC: watch outbox table WAL → publish to Kafka on INSERT
```

**Request Flow**
```
1. Order Service: BEGIN; INSERT order + INSERT outbox; COMMIT;
2. If crash here: on restart, outbox has unpublished events
3. Relay: reads outbox, publishes to Kafka (idempotent)
4. Relay: marks outbox row as published
5. Kafka consumers receive OrderPlaced — always, exactly when DB is committed
```

**Failure Scenario**
Relay publishes to Kafka but crashes before marking outbox row as published. On restart, relay re-publishes the same event. Kafka consumers receive duplicate.

**Solution**
- Kafka **idempotent producer** (`enable.idempotence=true`): deduplicates at broker level within a session.
- Consumers must be **idempotent**: check if event was already processed before acting.
- Include **event ID** in the outbox and propagate to Kafka message key for deduplication.

---

### 6.5 Idempotency

**Problem**
Client sends `POST /payments/charge` for £100. Network times out. Client doesn't know if the charge succeeded. Client retries. Customer is charged £200.

**Why Naive Solution Fails**
Without idempotency, every POST creates a new resource or triggers a new action regardless of duplicates. Retries cause double charges, double emails, duplicate orders.

**Pattern**
Client generates a **unique Idempotency Key** (UUID) per logical request. Server stores `(key → result)`. On first request, process and store. On subsequent requests with the same key, return stored result without re-processing.

**Architecture**
```
Client:
  key = UUID.generate()  // generated once per operation, persisted by client
  POST /payments/charge
  Headers: Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
  Body: { amount: 100, currency: GBP }

Server:
  1. Check: SELECT * FROM idempotency_keys WHERE key = :key
  2. If found AND status = SUCCESS: return stored response (no processing)
  3. If found AND status = PROCESSING: return 409 (in progress)
  4. If not found:
       INSERT idempotency_keys (key, status) VALUES (:key, 'PROCESSING')
       Process payment
       UPDATE idempotency_keys SET status='SUCCESS', response=:result
       Return result

idempotency_keys table:
  key        UUID PRIMARY KEY
  status     ENUM(PROCESSING, SUCCESS, FAILED)
  response   JSONB
  expires_at TIMESTAMP (TTL: 24 hours)
```

**Request Flow**
```
Request 1 (t=0): key=abc123 → not found → process → charge £100 → store SUCCESS
Network timeout → client doesn't receive response

Request 2 (t=5s): key=abc123 → found, status=SUCCESS → return stored response
Client receives: "Payment successful £100"
Customer charged only once.
```

**Failure Scenario**
Server processes payment (charges card) but crashes before writing `SUCCESS` to idempotency table. Client retries. Server tries to charge again. Card charged twice.

**Solution**
- Write idempotency key with `PROCESSING` status **before** calling the payment gateway.
- Use **database-level locking** on the key row to prevent race conditions.
- After processing, update to `SUCCESS` or `FAILED` in the same DB transaction as the business operation.
- Payment gateway also provides its own idempotency keys (Stripe's `idempotency_key` header).

---

### 6.6 Distributed Locking

**Problem**
Two instances of Order Service simultaneously process overlapping requests for the last item in stock. Both read inventory: 1 item available. Both proceed to reserve. Both succeed. Two orders placed for the same item. Inventory goes to -1.

**Why Naive Solution Fails**
Database SELECT + UPDATE in separate steps creates a TOCTOU (time-of-check to time-of-use) race condition in concurrent distributed environments. Optimistic locking helps within one service but not across multiple service instances without coordination.

**Pattern**
Acquire a **distributed lock** on the shared resource (item stock) before checking and updating. Only one instance holds the lock at a time. Others wait or fail fast.

**Architecture**
```
Redis Distributed Lock (Redlock algorithm):

Instance A: SET lock:inventory:product-1 <token-A> NX PX 5000
            ← OK (lock acquired, expires in 5s)
Instance B: SET lock:inventory:product-1 <token-B> NX PX 5000
            ← NIL (lock held by A)
            → wait 100ms, retry OR return "resource busy"

Instance A: [check stock, reserve, update]
Instance A: DEL lock:inventory:product-1 WHERE value = <token-A>
            ← lock released (only if we still own it)
Instance B: retries → SET → OK (now acquires lock)
```

**Request Flow**
```
1. Order Service A: acquire lock for product-1 (Redis SET NX)
2. Order Service B: attempts lock → fails → waits
3. Service A: reads inventory = 1, reserves 1, writes inventory = 0
4. Service A: releases lock
5. Service B: acquires lock, reads inventory = 0
6. Service B: returns "out of stock" to user
Result: only 1 reservation made, no oversell
```

**Failure Scenario**
Service A acquires lock and crashes. Lock never released. Lock has no TTL. All other instances wait forever. System deadlocks.

**Solution**
- **Always set TTL** on the lock (`PX 5000` = 5 seconds). Lock auto-expires if holder crashes.
- **Fencing token**: include a monotonically increasing token with the lock. Storage rejects writes with older tokens (prevents stale lock holder from writing after TTL expiry).
- Use **Redlock** (Redis multi-node algorithm) for higher fault tolerance.
- Use **database advisory locks** (`SELECT pg_advisory_lock(key)`) for simpler cases within a single DB.
- Design to **minimise lock scope**: only lock the minimum resource for the minimum time.

---

## Summary: Pattern Decision Guide

```
DECOMPOSITION
  Splitting a monolith?          → Strangler Fig
  Finding service boundaries?    → Business Capability / DDD Subdomain
  Replacing a component safely?  → Branch by Abstraction

COMMUNICATION
  Internal high-performance?     → gRPC
  External / browser API?        → REST
  Flexible client queries?       → GraphQL
  Real-time push?                → WebSockets
  Decoupled async?               → Message Queues
  High-throughput replayable?    → Kafka Event Streaming

DATA
  Microservice isolation?        → Database per Service
  Write vs read scale differ?    → CQRS
  Full audit trail?              → Event Sourcing
  Complex query performance?     → Materialized View

RELIABILITY
  Slow downstream?               → Circuit Breaker + Timeout
  Transient failure?             → Retry with backoff
  Resource isolation?            → Bulkhead
  Traffic spike?                 → Rate Limiting
  Consumer slower than producer? → Backpressure
  Crashed pod in LB pool?        → Health Checks

INTEGRATION
  Single entry point?            → API Gateway
  Per-client API?                → BFF
  Cross-cutting network policy?  → Service Mesh
  Dynamic service location?      → Service Discovery
  Language-agnostic helpers?     → Sidecar
  Legacy system integration?     → Anti-Corruption Layer

TRANSACTIONS
  Cross-service transaction?     → Saga
  No central coordinator?        → Choreography
  Clear workflow visibility?     → Orchestration
  Guaranteed event delivery?     → Transactional Outbox
  Safe retries?                  → Idempotency
  Prevent race conditions?       → Distributed Locking
```

---

*Related: Domain-Driven Design, Event Sourcing, Clean Architecture, Kubernetes, Kafka, Redis, Distributed Systems, System Design Interviews*
