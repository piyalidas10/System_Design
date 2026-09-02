# Event-Driven Architecture

A comprehensive reference covering every major pattern in event-driven systems — what each one is, when to choose it, and how it maps to Kafka, RabbitMQ, and Redis Streams.

---

## Table of Contents

1. [Core Event Patterns](#1-core-event-patterns)
   - 1.1 [Event Notification](#11-event-notification)
   - 1.2 [Event-Carried State Transfer](#12-event-carried-state-transfer)
   - 1.3 [Event Streaming](#13-event-streaming)
2. [Messaging Topologies](#2-messaging-topologies)
   - 2.1 [Pub/Sub](#21-pubsub)
   - 2.2 [Message Queue](#22-message-queue)
   - 2.3 [Producer/Consumer](#23-producerconsumer)
   - 2.4 [Competing Consumers](#24-competing-consumers)
   - 2.5 [Consumer Groups](#25-consumer-groups)
3. [Consistency Patterns](#3-consistency-patterns)
   - 3.1 [Event Sourcing](#31-event-sourcing)
   - 3.2 [CQRS](#32-cqrs)
   - 3.3 [Saga](#33-saga)
   - 3.4 [Transactional Outbox](#34-transactional-outbox)
   - 3.5 [Inbox Pattern](#35-inbox-pattern)
4. [Reliability Patterns](#4-reliability-patterns)
   - 4.1 [Dead Letter Queue](#41-dead-letter-queue)
   - 4.2 [Retry Queue](#42-retry-queue)
   - 4.3 [Poison Message Handling](#43-poison-message-handling)
   - 4.4 [Idempotent Consumer](#44-idempotent-consumer)
5. [Evolution Patterns](#5-evolution-patterns)
   - 5.1 [Event Replay](#51-event-replay)
   - 5.2 [Event Versioning](#52-event-versioning)
6. [Technology Comparison](#6-technology-comparison)
7. [Pattern Decision Guide](#7-pattern-decision-guide)

---

## 1. Core Event Patterns

### 1.1 Event Notification

**What it is**
The producer emits a lightweight signal that _something happened_. The event carries minimal data — typically just an ID and event type. Consumers that need details must fetch them separately from the producer's API.

**Structure**
```json
{
  "eventType": "order.placed",
  "orderId": "ord-8821",
  "occurredAt": "2024-06-01T10:00:00Z"
}
```

**When to choose it**
- You want loose coupling: consumers decide whether they care and what to do.
- The payload is sensitive and should not be broadcast (e.g., PII).
- Multiple downstream services already have read access to the source system.
- Event size matters — you are on a high-throughput bus and cannot afford large payloads.

**When NOT to use it**
- Consumers cannot query back to the source (network partition, deprecated API, external third-party).
- You need auditability of the exact state at the time of the event.

**Kafka example**
Publish to `orders` topic with only the order ID. Consumers call the Order Service REST API to retrieve full details.

**RabbitMQ example**
Publish to a fanout exchange `order.events`. Each bound queue receives the lightweight notification.

**Redis Streams example**
```bash
XADD orders * eventType order.placed orderId ord-8821
```
Consumers use `XREAD` and then call back to the order service.

---

### 1.2 Event-Carried State Transfer

**What it is**
The event carries the _complete current state_ of the entity at the time the event was produced. Consumers have everything they need without calling back to the source.

**Structure**
```json
{
  "eventType": "order.placed",
  "orderId": "ord-8821",
  "customerId": "cust-42",
  "items": [{ "sku": "A1", "qty": 2, "price": 19.99 }],
  "total": 39.98,
  "occurredAt": "2024-06-01T10:00:00Z"
}
```

**When to choose it**
- Consumers must work independently without calling back to the producer (autonomy, resilience).
- The source system will be decommissioned or is behind a slow/unreliable API.
- You are building a read replica or a downstream cache in another service.
- Latency matters — one round-trip instead of two.

**When NOT to use it**
- State is very large (binary assets, huge JSON trees) — payload size becomes a bottleneck.
- Data is sensitive and should not be stored in the broker's log.

**Kafka example**
Use Avro/Protobuf schemas in the Schema Registry to enforce the full-state contract. Topic `orders-full-state`.

**RabbitMQ example**
Durable queues with `persistent` delivery mode. Consumers upsert a local projection table from the message body.

**Redis Streams example**
```bash
XADD orders * eventType order.placed orderId ord-8821 customerId cust-42 total 39.98
```
Downstream service reads the stream and maintains its own Redis Hash as a local cache.

---

### 1.3 Event Streaming

**What it is**
A continuous, ordered, persistent log of events. Unlike one-time message delivery, the log is retained and consumers can read it at their own pace, replay it, and multiple independent readers can consume the same stream without interfering with each other.

**When to choose it**
- You need an audit trail or event history.
- Multiple heterogeneous consumers must process the same events independently.
- Consumers join at different times (new services, replaying for analytics).
- Time-series data: clickstreams, IoT telemetry, metrics, logs.
- You need exactly-once or at-least-once delivery guarantees with replayability.

**When NOT to use it**
- Simple job queue with no need for history or multiple consumers — a plain queue is simpler.
- Very low message volumes with no replayability requirement.

**Kafka** is the canonical event streaming platform. Partitioned, replicated, durable topic log. Consumers track their own offset independently.

**Redis Streams** (`XADD`/`XREAD`/`XREADGROUP`) are a lightweight alternative for lower-volume streaming with optional consumer groups and acknowledgement.

**RabbitMQ** is primarily a queue broker, not a streaming log. Streams plugin (`rabbitmq-stream`) adds offset-based, non-destructive consumption — use it when you need streaming semantics inside RabbitMQ.

---

## 2. Messaging Topologies

### 2.1 Pub/Sub

**What it is**
A publish/subscribe topology where producers publish events to a _topic_ or _exchange_ without knowing who will consume them. Every subscriber gets a copy of every message.

```
Producer ──► Topic/Exchange ──► Subscriber A
                             ──► Subscriber B
                             ──► Subscriber C
```

**When to choose it**
- One event must trigger multiple independent reactions (fan-out).
- Consumers are completely decoupled from the producer.
- Adding a new consumer must not require any producer change.
- Broadcast scenarios: cache invalidation, notifications, domain events.

**Kafka**
Topic with multiple consumer groups. Each group is an independent subscriber and gets all messages.

**RabbitMQ**
Fanout exchange or topic exchange with wildcard routing. Each queue bound to the exchange receives a copy.
```
exchange type: fanout
bindings: queue.notifications, queue.audit, queue.analytics
```

**Redis Streams**
Use `XREAD` (not groups) for true pub/sub semantics — each independent reader reads the full stream from its own offset.  
For lightweight pub/sub without persistence, use `PUBLISH`/`SUBSCRIBE`, but note those messages are fire-and-forget.

---

### 2.2 Message Queue

**What it is**
A point-to-point channel. A message is placed in a queue and consumed _once_ by exactly one consumer. Once acknowledged, it is removed.

```
Producer ──► Queue ──► Consumer (one consumer receives each message)
```

**When to choose it**
- Each message must be processed exactly once by exactly one worker.
- Work distribution across multiple workers (load balancing).
- Simple task/job queues: send email, resize image, process payment.
- You do not need message history after acknowledgement.

**Kafka**
A single partition topic with one consumer per consumer group simulates a queue. More commonly: one consumer group with multiple instances — Kafka distributes partitions among them.

**RabbitMQ**
Classic queues are the native fit. `basic.ack` removes the message from the queue.

**Redis Streams**
Use `XREADGROUP` + `XACK`. Each message is delivered to one consumer in the group and removed from the pending-entry list on `XACK`.

---

### 2.3 Producer/Consumer

**What it is**
The foundational pattern: a producer places work items onto a channel; one or more consumers take items off and process them. This is the underlying model for both queues and streams.

**When to choose it**
- Decouple the rate of work generation from the rate of processing (back-pressure management).
- Buffer bursts: producers spike, consumers process steadily.
- Async task offloading: HTTP handler produces a job, background worker consumes it.

**All three tools implement this pattern natively.**

---

### 2.4 Competing Consumers

**What it is**
Multiple consumer instances all consume from the _same_ queue or partition group. Each message goes to exactly one consumer. They compete to grab the next available message, effectively load-balancing work.

```
              ┌──► Consumer Instance 1
Queue ────────┤──► Consumer Instance 2
              └──► Consumer Instance 3
```

**When to choose it**
- You need horizontal scalability for processing throughput.
- Processing time per message is variable — you want fast consumers to take more work.
- You are building worker pools: email sending, thumbnail generation, invoice PDF creation.

**Kafka**
Each consumer instance in the same consumer group is assigned a subset of partitions. Scale consumers up to the number of partitions.

**RabbitMQ**
Multiple consumers on the same queue with `basicQos(prefetchCount=1)`. RabbitMQ delivers to the least-busy consumer.

**Redis Streams**
Multiple consumers in the same consumer group via `XREADGROUP GROUP mygroup consumer-N`.

---

### 2.5 Consumer Groups

**What it is**
A named set of consumer instances that collectively process a stream or queue. The broker tracks the group's progress (offset/cursor), not individual consumers. Within the group, each message is processed once. Different groups process independently — each group gets all messages.

```
Stream ──► Group A (offset 450) ──► instances: A1, A2
       ──► Group B (offset 112) ──► instances: B1
```

**When to choose it**
- Multiple services must each process every event independently (pub/sub semantics).
- Within a service, you want load-balanced processing with offset tracking.
- You need offset management per logical subscriber, not per instance.
- Reprocessing: reset a group's offset to replay from a specific point.

**Kafka**
First-class concept: `group.id` in consumer config. `__consumer_offsets` topic stores offsets. Rebalancing redistributes partitions on membership change.

**Redis Streams**
`XGROUP CREATE stream groupname $` — creates a group. `XREADGROUP` delivers to one consumer in the group. `XACK` acknowledges delivery. `XPENDING` shows unacknowledged messages.

**RabbitMQ**
Does not have native consumer groups. Simulate with multiple queues (one per logical group), each bound to the same exchange. Each queue represents a group; consumers on that queue compete within the group.

---

## 3. Consistency Patterns

### 3.1 Event Sourcing

**What it is**
Instead of storing current state in a database, you store the _sequence of events_ that led to that state. Current state is derived by replaying events. The event log is the single source of truth.

```
Commands ──► Aggregate ──► Events ──► Event Store
                                         │
                              Replay ◄───┘
                                │
                           Current State
```

**When to choose it**
- You need a complete, immutable audit trail (finance, healthcare, legal).
- You need temporal queries: "what was the state of this order on date X?"
- You want to build multiple projections of the same data for different consumers.
- The domain is complex with rich history (e.g., trading, inventory, bookings).
- You want to enable event replay for new read models without data migration.

**When NOT to use it**
- Simple CRUD with no history requirement — adds significant complexity.
- Small teams unfamiliar with the pattern — operational overhead is real.

**Kafka**
Use a compacted topic per aggregate type as the event store. Each message key = aggregate ID. Replay by reading the topic from offset 0.

**RabbitMQ**
Not a natural fit — messages are consumed and removed. Use RabbitMQ Streams plugin for append-only, replayable storage.

**Redis Streams**
Each stream keyed by aggregate ID: `XADD order:ord-8821 * type OrderPlaced ...`. Replay with `XRANGE order:ord-8821 - +`. Suitable for shorter-lived or lower-volume aggregates; consider persistence settings (`appendonly yes`).

---

### 3.2 CQRS

**What it is**
Command Query Responsibility Segregation — the write model (commands that change state) and the read model (queries that return data) are separate. Events from the write side update one or more read-optimised projections.

```
Client ──► Command ──► Write Model ──► Event ──► Projection Builder ──► Read Model
Client ──► Query  ──────────────────────────────────────────────────►  Read Model
```

**When to choose it**
- Read and write workloads have different scaling requirements.
- You need multiple specialised views of the same data (list, detail, dashboard).
- Combined with Event Sourcing — CQRS makes the projections explicit.
- Complex domain models where a single model is too heavy for querying.

**When NOT to use it**
- Simple applications where one model serves both — CQRS adds two codepaths and synchronisation complexity.

**Kafka**
Write service publishes events to Kafka. Projection services consume events and write to their own data stores (Elasticsearch for search, Redis for caching, PostgreSQL for reporting).

**RabbitMQ**
Command handler publishes domain events to a fanout exchange. Multiple projection queues each build their own read model.

**Redis Streams**
Write service appends events to a stream. A separate read-model builder service consumes the stream and updates Redis Hashes or Sorted Sets for fast querying.

---

### 3.3 Saga

**What it is**
A pattern for managing long-running, multi-step distributed transactions without 2PC. Each step publishes an event on success; on failure, compensating events undo previous steps.

Two styles:
- **Choreography**: each service listens for events and decides what to do next — no central coordinator.
- **Orchestration**: a saga orchestrator sends commands to services and handles the workflow centrally.

```
Choreography:
OrderService ──► order.placed ──► PaymentService ──► payment.processed ──► InventoryService

Orchestration:
SagaOrchestrator ──► reserve-inventory ──► InventoryService
                 ◄── inventory.reserved ◄──
                 ──► charge-payment     ──► PaymentService
```

**When to choose it**
- Distributed transaction spans multiple services with no shared database.
- You need rollback/compensation logic across services.
- Long-running workflows (minutes to days): booking, fulfilment, onboarding.
- Choreography: simple linear flows with few steps.
- Orchestration: complex branching workflows, easier to monitor and debug.

**Kafka**
Choreography: each service publishes to its own topic. Orchestration: orchestrator service reads results from reply topics and issues next commands.

**RabbitMQ**
Choreography: topic exchange with routing keys per event. Orchestration: orchestrator sends to per-service direct exchanges and listens on a reply queue.

**Redis Streams**
Lightweight sagas for short workflows. Each step appends to a shared saga stream. Orchestrator reads the stream and issues next commands.

---

### 3.4 Transactional Outbox

**What it is**
Solves the dual-write problem: you must save to the database AND publish an event, but you cannot do both atomically across two systems. Solution: write the event to an `outbox` table in the _same_ database transaction as the business data. A separate relay process reads the outbox and publishes to the broker.

```
Service ──► DB Transaction ──► orders table + outbox table
                                       │
                          Relay/CDC ───┘──► Kafka/RabbitMQ/Redis
```

**When to choose it**
- You must guarantee that events are published if and only if the DB write succeeds.
- You cannot afford lost events or phantom events (event published but DB write failed).
- Any service writing to a relational DB and publishing events.

**When NOT to use it**
- Your broker supports XA transactions with your database (rare, complex, not recommended).
- You are using an event store (Event Sourcing) — the event log IS the source of truth.

**Kafka**
Use Kafka Connect Debezium (CDC) to capture outbox table changes and publish to Kafka topics. Debezium's outbox event router routes to the correct topic by aggregate type.

**RabbitMQ**
Polling relay or Debezium + RabbitMQ sink connector. Or a simple scheduled job that reads unsent outbox rows and publishes via AMQP, then marks them as sent.

**Redis Streams**
Polling relay reads the outbox table, appends to a Redis Stream, marks rows as published. Lightweight but no native CDC integration — requires a scheduled job or change-data-capture tool.

---

### 3.5 Inbox Pattern

**What it is**
The consumer-side complement of the Outbox. Before processing a message, the consumer writes it to an `inbox` table in the same transaction as the business logic. This guarantees exactly-once processing even with at-least-once delivery.

```
Broker ──► Consumer ──► DB Transaction ──► inbox table + business tables
                                                │
                               Idempotency check at inbox before processing
```

**When to choose it**
- The broker delivers at-least-once and your processing is not naturally idempotent.
- Processing a message twice would cause real harm (double charge, double shipment).
- Combined with the Outbox pattern for full end-to-end exactly-once semantics.

**All three brokers** deliver at-least-once by default. The Inbox pattern applies equally to Kafka, RabbitMQ, and Redis Streams consumers.

Implementation: before processing, `INSERT INTO inbox (message_id) VALUES (?)`. If the insert violates a unique constraint, the message was already processed — skip it and ack.

---

## 4. Reliability Patterns

### 4.1 Dead Letter Queue

**What it is**
A DLQ is a special queue/topic where messages are automatically routed when they cannot be processed successfully after a maximum number of retries, or when they fail validation/parsing.

```
Queue ──► Consumer (fails) ──► retry ──► retry ──► DLQ
```

**When to choose it**
- You need to capture failed messages for manual inspection, alerting, or reprocessing.
- You cannot silently discard messages (business-critical events).
- Always configure a DLQ in production for any queue that processes important messages.

**Kafka**
No native DLQ. Implement in consumer code: catch unrecoverable exceptions, produce the failed message to a `<topic>.DLT` (dead-letter topic). Libraries: Spring Kafka `DeadLetterPublishingRecoverer`, Kafka Streams dead-letter branches.

```java
// Spring Kafka
@Bean
public DefaultErrorHandler errorHandler(KafkaTemplate<?, ?> template) {
    return new DefaultErrorHandler(
        new DeadLetterPublishingRecoverer(template),
        new FixedBackOff(1000L, 3)
    );
}
```

**RabbitMQ**
Native DLQ support via `x-dead-letter-exchange` and `x-dead-letter-routing-key` queue arguments. Messages are automatically forwarded on rejection or TTL expiry.

```json
{
  "x-dead-letter-exchange": "dlx",
  "x-dead-letter-routing-key": "orders.dead",
  "x-message-ttl": 60000
}
```

**Redis Streams**
No native DLQ. After `XCLAIM` retries exceed a threshold, move the message to a dedicated dead-letter stream: `XADD orders:DLT * <original fields>` then `XACK` the original.

---

### 4.2 Retry Queue

**What it is**
Instead of retrying immediately in the consumer (blocking the thread), failed messages are routed to a retry queue with a delay. After the delay, they re-enter the main queue. Multiple retry queues with increasing delays implement exponential backoff.

```
Main Queue ──► Consumer (transient failure)
                    │
                    └──► retry-queue-5s ──► (delay) ──► Main Queue
                              └──► retry-queue-30s ──► (delay) ──► Main Queue
                                        └──► DLQ (after max retries)
```

**When to choose it**
- Failures are transient (downstream service is temporarily unavailable).
- You need exponential backoff without blocking the main queue.
- You want to separate retry logic from main processing logic.

**Kafka**
Create retry topics: `orders.retry-0`, `orders.retry-1`, `orders.retry-2`, `orders.DLT`. Consumer catches retryable exceptions, publishes to the next retry topic with a retry count header. Each retry topic has a consumer that waits (sleeps) before re-publishing to main or next retry. Spring Kafka handles this natively with `@RetryableTopic`.

**RabbitMQ**
Use per-level queues with `x-message-ttl` and `x-dead-letter-exchange` pointing back to the main exchange. When TTL expires, the message is routed back to the main queue for reprocessing.

**Redis Streams**
Use `XADD` with a sorted set as a delay buffer: enqueue to a `ZSET` with `score = processAt` timestamp. A scheduler polls the ZSET and moves due messages back to the main stream.

---

### 4.3 Poison Message Handling

**What it is**
A poison message is one that will _never_ succeed no matter how many times it is retried — bad schema, unresolvable business rule violation, corrupt data. Without handling, it blocks the queue indefinitely.

**When to choose it**
Apply this pattern universally. Every consumer should distinguish transient errors (retry) from permanent errors (poison → DLQ).

**Strategy**
1. Catch all exceptions in the consumer.
2. Classify: retryable (network timeout, DB lock) vs. non-retryable (parse error, validation failure).
3. Non-retryable → send directly to DLQ, skip retry queue.
4. Log the error with message metadata for investigation.
5. Alert on DLQ depth via monitoring.

**Kafka**
```java
catch (JsonParseException e) {
    // Non-retryable — route straight to DLT, do not retry
    deadLetterTemplate.send("orders.DLT", message);
}
catch (HttpServerErrorException e) {
    // Retryable — throw to trigger retry mechanism
    throw e;
}
```

**RabbitMQ**
`basicReject(deliveryTag, requeue=false)` routes to the DLX immediately without requeue.

**Redis Streams**
Check `XPENDING` delivery count. If `delivery-count > MAX_RETRIES`, move to DLT stream; `XACK` the original.

---

### 4.4 Idempotent Consumer

**What it is**
A consumer that produces the same result regardless of how many times it processes the same message. Essential when at-least-once delivery guarantees duplicate delivery.

**Strategies**

| Strategy | Description | Best for |
|---|---|---|
| **Natural idempotency** | Operation is inherently idempotent (upsert, set, absolute value) | Simple updates |
| **Idempotency key** | Store processed message IDs; skip duplicates | General purpose |
| **Inbox pattern** | DB-level deduplication via unique constraint | Transactional accuracy |
| **Conditional write** | Update only if version/timestamp matches | Optimistic concurrency |

**When to choose it**
- Always, when using at-least-once delivery (Kafka default, RabbitMQ acks, Redis Streams XACK).
- Especially when consumer rebalancing or crashes can cause redelivery.
- Payment, inventory deduction, email sending — anywhere duplicates cause harm.

**Kafka**
Enable idempotent producer (`enable.idempotence=true`). For consumers, store the last processed offset per partition in the same DB transaction as the business write (transactional outbox).

**RabbitMQ**
Use a message ID (`messageId` property). Check and store in Redis or DB before processing.

**Redis Streams**
The stream entry ID (`1717235200000-0`) is globally unique. Store it as the idempotency key.

---

## 5. Evolution Patterns

### 5.1 Event Replay

**What it is**
Re-processing historical events from the beginning (or a specific point) of the event log. Used to rebuild projections, onboard new services, debug issues, or migrate data.

**When to choose it**
- A new service needs to catch up on all historical events.
- A read-model projection is corrupted and needs to be rebuilt.
- You are migrating to a new schema and need to re-process all events through a transformer.
- Debugging: replay a time window to reproduce a production issue.
- Event Sourcing: replay is how you derive current state.

**Kafka**
Replay is native:
```bash
# Reset a consumer group to the beginning of a topic
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-service \
  --topic orders \
  --reset-offsets --to-earliest \
  --execute
```
Or seek to a specific timestamp/offset in consumer code.

**RabbitMQ**
Classic queues destroy messages on ack — no native replay. Use the **Streams plugin** for offset-based replay:
```bash
rabbitmq-streams consume --stream orders --offset first
```

**Redis Streams**
```bash
XRANGE orders - +             # Read all entries
XRANGE orders 1717200000000-0 +  # Read from a specific message ID
```
Replay by reading from ID `0-0` (beginning of stream). Note: stream data lives only as long as configured by `MAXLEN` or `MINID` trimming.

---

### 5.2 Event Versioning

**What it is**
As systems evolve, event schemas change. Event versioning is the practice of managing those changes so that producers and consumers can evolve independently without breaking each other.

**Strategies**

| Strategy | Description | When to use |
|---|---|---|
| **Additive change** | Add optional fields only | Backward-compatible evolution |
| **Version field** | Include `"version": 2` in the event | When consumers must handle multiple versions |
| **Separate topics/streams** | `orders-v1`, `orders-v2` | Breaking changes; parallel migration |
| **Schema Registry** | Enforce compatibility rules centrally | Any Kafka/Avro setup |
| **Upcasting** | Transform old event format to new on read | Event Sourcing replays |

**Backward compatible change (safe)**
```json
// v1
{ "eventType": "order.placed", "orderId": "ord-8821" }

// v2 — added field, old consumers ignore it
{ "eventType": "order.placed", "orderId": "ord-8821", "channel": "web" }
```

**Breaking change (requires versioning)**
```json
// v1: single shipping address string
{ "shippingAddress": "123 Main St, Springfield" }

// v2: structured object — breaking change
{ "shippingAddress": { "street": "123 Main St", "city": "Springfield" } }
```

**When to choose each strategy**
- **Additive only**: greenfield, fast-moving teams, low consumer count.
- **Version field + consumer switch**: moderate complexity, consumers can be updated.
- **Separate topics**: many consumers, breaking change, need a migration window.
- **Schema Registry**: any production Kafka system using Avro or Protobuf.
- **Upcasting**: Event Sourcing — you never change stored events, you transform on read.

**Kafka + Schema Registry**
```bash
# Register schema with BACKWARD compatibility
curl -X POST http://localhost:8081/subjects/orders-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",...}"}'
```
Compatibility modes: `BACKWARD` (new schema reads old data), `FORWARD` (old schema reads new data), `FULL` (both).

**RabbitMQ**
Use the `type` or `content-type` message property to signal version. Route different versions to different queues via topic exchange routing keys (`orders.v1.*`, `orders.v2.*`).

**Redis Streams**
Include a `v` field in every event: `XADD orders * v 2 type order.placed ...`. Consumers inspect `v` and apply the correct handler.

---

## 6. Technology Comparison

| Capability | Kafka | RabbitMQ | Redis Streams |
|---|---|---|---|
| **Primary model** | Distributed log | Message broker | In-memory stream |
| **Persistence** | Durable (disk, configurable retention) | Durable (disk, per-queue config) | In-memory + AOF/RDB persistence |
| **Throughput** | Very high (millions/s) | High (hundreds of thousands/s) | High (hundreds of thousands/s) |
| **Ordering** | Per-partition | Per-queue (single consumer) | Per-stream (single shard) |
| **Consumer groups** | Native, offset-tracked | Simulated (multiple queues) | Native (`XGROUP`) |
| **Event replay** | Native (seek to offset/timestamp) | Streams plugin only | Native (`XRANGE`) |
| **DLQ** | Application-level | Native (`x-dead-letter-exchange`) | Application-level |
| **Routing** | Topic + partition key | Exchanges (direct, fanout, topic, headers) | Multiple streams |
| **Schema enforcement** | Via Schema Registry | Via message properties | Manual/convention |
| **Delay / scheduling** | Via retry topics (app-level) | `x-message-ttl` + DLX | ZSET delay buffer |
| **Exactly-once** | Transactions + idempotent producer | Manual (Inbox pattern) | Manual (Inbox pattern) |
| **Operational complexity** | High (Zookeeper/KRaft, brokers) | Medium (management UI, AMQP) | Low (single process, Redis cluster for HA) |
| **Best for** | High-throughput streaming, event sourcing, audit logs | Complex routing, task queues, RPC | Lightweight streaming, caching + streaming, low ops overhead |

---

## 7. Pattern Decision Guide

### By problem

| You need... | Use this pattern | Tool recommendation |
|---|---|---|
| Notify services something happened | Event Notification | Any |
| Share full state without callbacks | Event-Carried State Transfer | Kafka, RabbitMQ durable queue |
| Persist and replay an ordered event history | Event Streaming | Kafka, Redis Streams |
| Fan-out one event to many independent services | Pub/Sub | Kafka (consumer groups), RabbitMQ (fanout exchange) |
| Distribute work across multiple workers | Competing Consumers + Message Queue | RabbitMQ, Kafka, Redis Streams XREADGROUP |
| Each service processes all events independently | Consumer Groups | Kafka, Redis Streams XGROUP |
| Complete audit history + temporal queries | Event Sourcing | Kafka (compacted topic), Redis Streams |
| Separate read/write models at scale | CQRS | Kafka → multiple projection consumers |
| Distributed transaction across services | Saga | Kafka (choreography), RabbitMQ (orchestration) |
| Atomic DB write + event publish | Transactional Outbox | Kafka + Debezium, RabbitMQ relay |
| Exactly-once processing despite redelivery | Inbox Pattern + Idempotent Consumer | Any (DB-backed) |
| Capture unprocessable messages | Dead Letter Queue | RabbitMQ (native), Kafka (DLT topic) |
| Retry transient failures with backoff | Retry Queue | Kafka retry topics, RabbitMQ TTL+DLX |
| Stop poison messages blocking the queue | Poison Message Handling | Any (classify on catch) |
| Build a new service from existing event history | Event Replay | Kafka (offset reset), Redis XRANGE |
| Evolve event schema without breaking consumers | Event Versioning | Kafka + Schema Registry, separate topics |

### By team and system profile

| Profile | Recommended stack |
|---|---|
| High-volume, event-sourced, many consumers | **Kafka** — built for this |
| Complex routing, task queues, low ops overhead | **RabbitMQ** — native DLQ, flexible exchanges |
| Lightweight, co-located with existing Redis | **Redis Streams** — low ops, fast, simple |
| Microservices with distributed transactions | **Kafka** + Outbox + Saga |
| CRUD app adding async for the first time | **RabbitMQ** or **Redis Streams** — simpler to operate |
| Strict schema governance across many teams | **Kafka** + Schema Registry |

---

*Reference: Martin Fowler — [What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html) · Greg Young — Event Sourcing · Chris Richardson — Microservices Patterns*
