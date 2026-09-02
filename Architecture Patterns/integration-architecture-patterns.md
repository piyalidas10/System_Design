# Integration Architecture Patterns

A practical reference for the classic Enterprise Integration Patterns (EIP) — what each one does, how data flows through it, when to apply it, and where it fails.

> **Origin:** Gregor Hohpe & Bobby Woolf — *Enterprise Integration Patterns* (2003). These patterns remain the vocabulary of every modern integration platform: Apache Camel, MuleSoft, Spring Integration, Azure Service Bus, AWS EventBridge, IBM MQ.

---

## Table of Contents

1. [Message Channel](#1-message-channel)
2. [Point-to-Point Channel](#2-point-to-point-channel)
3. [Publish/Subscribe Channel](#3-publishsubscribe-channel)
4. [Message Router](#4-message-router)
5. [Content-Based Router](#5-content-based-router)
6. [Message Filter](#6-message-filter)
7. [Message Translator](#7-message-translator)
8. [Message Splitter](#8-message-splitter)
9. [Message Aggregator](#9-message-aggregator)
10. [Resequencer](#10-resequencer)
11. [Claim Check](#11-claim-check)
12. [Wire Tap](#12-wire-tap)
13. [Dead Letter Channel](#13-dead-letter-channel)
14. [Guaranteed Delivery](#14-guaranteed-delivery)
15. [Request-Reply](#15-request-reply)
16. [Pattern Combination Guide](#16-pattern-combination-guide)
17. [Decision Matrix](#17-decision-matrix)

---

## 1. Message Channel

### What it is
A Message Channel is the **logical pipe** that connects a sender to a receiver. It is the foundational abstraction — all other patterns operate on channels. A channel decouples the sender from the receiver; neither needs to know the other's address or implementation.

### Flow

```
Producer
   │
   │  sends message to
   ▼
Integration Layer
   │
   │  routes via named channel
   ▼
[ Message Channel ]
   │  (topic / queue / stream / exchange)
   │
   ▼
Consumer
   │
   │  receives from channel
   ▼
Business Logic
```

### Key properties
| Property | Description |
|---|---|
| **Name** | Every channel has a logical name (e.g., `orders`, `payments.processed`) |
| **Direction** | Unidirectional — producer writes, consumer reads |
| **Decoupling** | Producer and consumer share only the channel address, not code |
| **Durability** | Channel may be in-memory (ephemeral) or persistent (durable) |

### When to use
- Any time two systems need to exchange messages asynchronously.
- As the base concept when applying any other EIP pattern — you always need a channel.
- When you want to replace a direct HTTP call with an async, buffered exchange.

### When NOT to use
- Synchronous request/reply with hard latency SLAs — use REST or gRPC directly.
- Tiny single-process systems where IPC overhead is not justified.

### Implementation examples
```
Kafka:       Topic                   → "orders"
RabbitMQ:    Exchange + Queue        → exchange "orders.exchange" → queue "orders"
AWS SQS:     Queue URL               → https://sqs.us-east-1.amazonaws.com/.../orders
Apache Camel: from("jms:queue:orders")
MuleSoft:    <jms:listener config-ref="JMS_Config" destination="orders"/>
```

---

## 2. Point-to-Point Channel

### What it is
A Point-to-Point Channel guarantees that **exactly one consumer** receives and processes each message. Even if multiple consumers are listening, each message is delivered to only one of them. This is the "queue" semantic.

### Flow

```
Producer
   │
   │  publishes message
   ▼
Integration Layer
   │
   │  places on exclusive channel
   ▼
[ Point-to-Point Channel ]
   │  (queue — one delivery per message)
   │
   ├──► Consumer Instance A  ← receives this message
   ├──► Consumer Instance B  ← waiting (does NOT receive this message)
   └──► Consumer Instance C  ← waiting (does NOT receive this message)
```

### Key properties
| Property | Description |
|---|---|
| **Exclusive delivery** | Each message processed by exactly one consumer |
| **Load balancing** | Multiple consumers can compete; broker selects one |
| **Acknowledgement** | Consumer must ack; unacked messages are redelivered |
| **Ordering** | Preserved within a single queue/partition |

### When to use
- Task distribution — send an email, process a payment, generate a report.
- Work queue / job queue — you want one worker to own each job.
- Competing consumers (scale-out processing) — add more instances without duplicating work.
- Command messages — a command should be executed once, not broadcast.

### When NOT to use
- Multiple independent services need to react to the same event — use Pub/Sub Channel instead.
- You need replay or audit history — messages are gone after acknowledgement.

### Implementation examples
```
Kafka:       Single consumer group on a topic (partitions assigned 1:1 to instances)
RabbitMQ:    Classic queue with multiple consumers — broker round-robins or uses basicQos
AWS SQS:     Standard Queue or FIFO Queue with multiple receivers
Azure:       Service Bus Queue
Apache Camel:
  from("activemq:queue:orders")
    .to("bean:orderProcessor");
```

---

## 3. Publish/Subscribe Channel

### What it is
A Publish/Subscribe Channel delivers **every message to all subscribers**. Each subscriber gets its own copy. The producer is unaware of how many (or which) consumers exist.

### Flow

```
Producer
   │
   │  publishes one message
   ▼
Integration Layer
   │
   │  broadcasts to all subscribers
   ▼
[ Publish/Subscribe Channel ]
   │  (topic / fanout exchange / event bus)
   │
   ├──► Consumer A (Notifications Service)   ← gets a copy
   ├──► Consumer B (Audit Service)           ← gets a copy
   └──► Consumer C (Analytics Service)       ← gets a copy
```

### Key properties
| Property | Description |
|---|---|
| **Broadcast** | All active subscribers receive every message |
| **Independence** | Each subscriber processes at its own pace |
| **Decoupling** | Producer has zero knowledge of subscribers |
| **Fan-out** | One message → N copies |

### When to use
- Domain events that multiple services must react to (e.g., `order.placed` triggers notifications, billing, inventory).
- Cache invalidation — broadcast to all nodes.
- Configuration change propagation.
- Audit logging — tap all events without changing the producer.

### When NOT to use
- Each message should be processed by only one worker — use Point-to-Point.
- You need guaranteed delivery to specific consumers who may be offline — durable queues per subscriber are safer.

### Implementation examples
```
Kafka:       Multiple consumer groups on one topic
RabbitMQ:    Fanout exchange (all bound queues receive a copy)
AWS SNS:     Topic with multiple SQS queue subscriptions
Apache Camel:
  from("kafka:orders")
    .to("kafka:notifications", "kafka:audit", "kafka:analytics");
```

---

## 4. Message Router

### What it is
A Message Router inspects each incoming message and **routes it to one or more output channels** based on routing rules. It is the integration equivalent of a traffic switch — it directs messages without modifying them.

### Flow

```
Producer
   │
   │  sends any message
   ▼
Integration Layer
   │
   │  passes to router
   ▼
[ Message Router ]
   │  (inspects header, metadata, or routing table)
   │
   ├── rule: type == "order"    ──► Channel: orders-queue
   ├── rule: type == "payment"  ──► Channel: payments-queue
   └── rule: type == "return"   ──► Channel: returns-queue
         │
         ▼
      Consumer (per channel)
```

### Key properties
| Property | Description |
|---|---|
| **Routing logic** | Based on headers, routing keys, type fields, or lookup tables |
| **Non-modifying** | Message content is not changed, only routed |
| **Dynamic vs. static** | Static rules in config; dynamic from a routing table |
| **One-to-one or one-to-many** | Can route to one channel or fork to several |

### When to use
- You have a single ingestion point but messages must go to different downstream systems.
- Routing rules are likely to change — centralise them in the router rather than scatter across producers.
- Legacy integration — one canonical input channel, multiple legacy consumers.

### When NOT to use
- Logic is simple enough to handle in the consumer — over-engineering.
- Routing depends on full message body parsing — use Content-Based Router.

### Implementation examples
```
RabbitMQ:    Topic exchange with routing keys (orders.*, payments.*)
AWS EventBridge: Rule-based routing to targets
Apache Camel:
  from("jms:queue:all-messages")
    .choice()
      .when(header("type").isEqualTo("order")).to("jms:queue:orders")
      .when(header("type").isEqualTo("payment")).to("jms:queue:payments")
      .otherwise().to("jms:queue:unknown");
Spring Integration:
  .route("headers['type']", r -> r
      .channelMapping("order",   "ordersChannel")
      .channelMapping("payment", "paymentsChannel"));
```

---

## 5. Content-Based Router

### What it is
A Content-Based Router is a specialised Message Router that makes routing decisions by **reading the message body** (content), not just headers or metadata. It parses the payload and applies business rules to determine the destination.

### Flow

```
Producer
   │
   │  sends message with varied payload
   ▼
Integration Layer
   │
   │  passes to content inspector
   ▼
[ Content-Based Router ]
   │  (parses payload — XML, JSON, HL7, EDI…)
   │
   ├── body.country == "US"   ──► Channel: us-orders
   ├── body.country == "EU"   ──► Channel: eu-orders
   └── body.total > 10000     ──► Channel: high-value-orders
         │
         ▼
      Consumer (regional or specialised handler)
```

### Key properties
| Property | Description |
|---|---|
| **Payload inspection** | Must deserialise and read message content |
| **Business logic in routing** | Rules based on domain values, not infrastructure metadata |
| **Performance cost** | Parsing every message adds latency vs. header-only routing |
| **Maintainability risk** | Routing rules mixed with integration code — keep them externalised |

### When to use
- Messages arrive in a uniform format but need different handling based on data values.
- Multi-tenant systems — route by tenant ID in the body.
- Healthcare (HL7), finance (FIX), logistics (EDI) — messages carry type discriminators in the body.
- When you cannot modify the producer to add routing headers.

### When NOT to use
- Routing criteria are available as headers or metadata — avoid parsing overhead.
- Very high throughput systems — body parsing at scale is expensive.

### Implementation examples
```
Apache Camel (JSON via JSONPath):
  from("jms:queue:orders")
    .choice()
      .when(jsonpath("$.region").isEqualTo("US")).to("jms:queue:us-orders")
      .when(jsonpath("$.region").isEqualTo("EU")).to("jms:queue:eu-orders")
      .otherwise().to("jms:queue:other-orders");

Apache Camel (XML via XPath):
  from("jms:queue:invoices")
    .choice()
      .when(xpath("/invoice/total > 10000")).to("jms:queue:high-value")
      .otherwise().to("jms:queue:standard");

MuleSoft:
  <choice>
    <when expression="#[payload.region == 'US']">
      <jms:publish destination="us-orders"/>
    </when>
  </choice>
```

---

## 6. Message Filter

### What it is
A Message Filter selectively **passes or drops** messages based on a predicate. Messages that do not satisfy the condition are silently discarded (or sent to a discard channel). It is the simplest form of routing — one input, one output, with a gate.

### Flow

```
Producer
   │
   │  sends all messages (mixed)
   ▼
Integration Layer
   │
   │  evaluates filter predicate
   ▼
[ Message Filter ]
   │  condition: body.status == "CONFIRMED"
   │
   ├── passes  ──► Consumer (downstream processing)
   └── drops   ──► (discarded or → discard channel)
```

### Key properties
| Property | Description |
|---|---|
| **Predicate-based** | Boolean condition — message passes or it does not |
| **Non-modifying** | Passing messages are unchanged |
| **Idempotency** | Filter should be stateless and repeatable |
| **Discard handling** | Dropped messages may go to a discard channel for audit |

### When to use
- A subscriber only cares about a subset of messages on a Pub/Sub channel.
- Noise reduction — filter out heartbeats, test events, low-priority events.
- Security — strip messages that do not pass authorisation checks.
- Fan-in scenario — after aggregating, filter out incomplete or invalid results.

### When NOT to use
- You need the dropped messages to reach another destination — use a Router instead.
- Complex filtering logic with state — use an Aggregator or stateful stream processor.

### Implementation examples
```
Apache Camel:
  from("kafka:all-events")
    .filter(jsonpath("$.status").isEqualTo("CONFIRMED"))
    .to("kafka:confirmed-orders");

Spring Integration:
  .filter(msg -> msg.getHeaders().get("status").equals("CONFIRMED"))

AWS EventBridge:
  // Event pattern (filter) — only route CONFIRMED events to the target
  {
    "detail": {
      "status": ["CONFIRMED"]
    }
  }

RabbitMQ:
  // Headers exchange with x-match: all
  { "x-match": "all", "status": "CONFIRMED" }
```

---

## 7. Message Translator

### What it is
A Message Translator **transforms the format, structure, or vocabulary** of a message from one canonical form to another. It bridges incompatible data models between systems without changing the message's semantic meaning.

### Flow

```
Producer
   │
   │  sends message in format A
   │  (e.g., XML/SOAP, legacy schema, vendor format)
   ▼
Integration Layer
   │
   │  invokes translator
   ▼
[ Message Translator ]
   │  maps fields, converts types, renames keys
   │  XML → JSON, v1 schema → v2 schema, SOAP → REST payload
   │
   ▼
Consumer
   │
   │  receives message in format B
   │  (canonical model, target schema)
   ▼
Business Logic
```

### Translator types
| Type | Example |
|---|---|
| **Data format** | XML → JSON, CSV → Avro |
| **Canonical model** | Vendor A schema → internal canonical model |
| **Schema version** | Order v1 → Order v2 (upcasting) |
| **Protocol** | SOAP envelope → plain HTTP body |
| **Enrichment** | Add fields from a lookup (DB, API call) |

### When to use
- Integrating legacy systems that produce incompatible formats.
- Building a canonical data model to insulate consumers from producer schema changes.
- Version migration — translate old event versions to new on read (upcasting in Event Sourcing).
- B2B integration — trading partner sends EDI, internal system expects JSON.

### When NOT to use
- Producer and consumer already share the same schema — translation adds needless overhead.
- Translation logic is so complex it belongs in application code, not an integration layer.

### Implementation examples
```
Apache Camel (XSLT):
  from("jms:queue:legacy-orders")
    .to("xslt:transform/order-to-canonical.xslt")
    .to("kafka:canonical-orders");

Apache Camel (JSON marshal/unmarshal):
  from("jms:queue:xml-orders")
    .unmarshal().jacksonXml(OrderXml.class)
    .process(exchange -> {
        OrderXml xml = exchange.getIn().getBody(OrderXml.class);
        exchange.getIn().setBody(OrderMapper.toCanonical(xml));
    })
    .marshal().json()
    .to("kafka:orders");

MuleSoft DataWeave:
  %dw 2.0
  output application/json
  ---
  {
    orderId:    payload.order_id,
    customerId: payload.cust_ref,
    total:      payload.amt as Number
  }
```

---

## 8. Message Splitter

### What it is
A Message Splitter receives a **single composite message** (a batch, a list, an aggregate) and splits it into **multiple individual messages**, each of which is published to the output channel separately.

### Flow

```
Producer
   │
   │  sends one composite message
   │  { "orders": [ {id:1}, {id:2}, {id:3} ] }
   ▼
Integration Layer
   │
   │  passes to splitter
   ▼
[ Message Splitter ]
   │  iterates over collection, emits one message per element
   │
   ├──► Message: { id: 1 }  ──► Consumer
   ├──► Message: { id: 2 }  ──► Consumer
   └──► Message: { id: 3 }  ──► Consumer
```

### Key properties
| Property | Description |
|---|---|
| **Correlation ID** | Each split message carries the original message's ID for later aggregation |
| **Sequence metadata** | Split index and total count attached for resequencing/aggregation |
| **Idempotency** | Splitter should be idempotent — splitting twice must not duplicate messages |

### When to use
- Batch file processing — one CSV file contains 1000 records, process each independently.
- API responses — a bulk response must be broken into individual events.
- Paired with Aggregator — split for parallel processing, aggregate to collect results.
- Order lines — one `PlaceOrder` containing multiple line items, each processed independently by inventory.

### When NOT to use
- Items within the batch have ordering dependencies — splitting breaks the sequence.
- The batch is too small to justify the overhead — process it as a unit.

### Implementation examples
```
Apache Camel:
  from("file:incoming?noop=true")
    .unmarshal().csv()
    .split(body())
      .parallelProcessing()
      .to("kafka:orders");

Spring Integration:
  .split()                          // splits List<Order> into individual Order messages
  .channel("ordersChannel");

Apache Camel (split with correlation):
  from("jms:queue:batch-orders")
    .split(jsonpath("$.orders"))
      .setHeader("correlationId", header("JMSMessageID"))
      .setHeader("splitIndex",    simple("${exchangeProperty.CamelSplitIndex}"))
      .setHeader("splitSize",     simple("${exchangeProperty.CamelSplitSize}"))
    .to("jms:queue:single-orders");
```

---

## 9. Message Aggregator

### What it is
A Message Aggregator **collects a set of related messages** and combines them into a single aggregated message once a completion condition is met. It is the inverse of the Splitter.

### Flow

```
Producer (multiple)
   │         │         │
   │ msg 1   │ msg 2   │ msg 3
   ▼         ▼         ▼
Integration Layer
   │
   │  routes correlated messages to aggregator
   ▼
[ Message Aggregator ]
   │  groups by correlation key
   │  accumulates until: count == 3, or timeout, or sentinel message
   │
   ▼
[ Aggregated Message ]
   { results: [ msg1.body, msg2.body, msg3.body ] }
   │
   ▼
Consumer
```

### Key properties
| Property | Description |
|---|---|
| **Correlation key** | Groups messages that belong together (e.g., `orderId`, `batchId`) |
| **Completion condition** | Count reached, all expected IDs received, timeout elapsed, or sentinel |
| **Aggregation strategy** | How to merge: collect list, sum values, merge maps |
| **Timeout / expiry** | Release partial aggregation after a deadline to avoid waiting forever |

### When to use
- Scatter-gather — fan out a request to N services, collect all responses before proceeding.
- Split + process + reaggregate — split a batch, process items in parallel, recombine results.
- Chunked file reassembly — split large file, transfer in chunks, reassemble.
- Waiting for all async steps in a workflow to complete before moving forward.

### When NOT to use
- Messages arrive so slowly that aggregation windows are impractical.
- Completion condition is ambiguous — you may never know when "all" messages have arrived.

### Implementation examples
```
Apache Camel:
  from("kafka:order-line-results")
    .aggregate(header("orderId"), new ListAggregationStrategy())
      .completionSize(simple("${header.totalLines}"))
      .completionTimeout(30_000)
    .to("kafka:completed-orders");

Spring Integration:
  .aggregate(a -> a
      .correlationStrategy(msg -> msg.getHeaders().get("orderId"))
      .releaseStrategy(group -> group.size() == expectedCount)
      .outputProcessor(group -> MessageBuilder
          .withPayload(group.getMessages().stream()
              .map(Message::getPayload)
              .collect(Collectors.toList()))
          .build()));
```

---

## 10. Resequencer

### What it is
A Resequencer **reorders out-of-order messages** back into their correct sequence before delivering them to the consumer. It buffers messages and holds them until all preceding messages have been received.

### Flow

```
Producer
   │
   │  sends messages out of order
   │  (network jitter, parallel processing, retries)
   ▼
Integration Layer
   │
   │  messages arrive: seq=3, seq=1, seq=4, seq=2
   ▼
[ Resequencer ]
   │  buffers messages, waits for gaps to fill
   │  releases in order: seq=1, seq=2, seq=3, seq=4
   │
   ▼
Consumer
   │
   │  receives in correct sequence
   ▼
Business Logic (order-sensitive)
```

### Key properties
| Property | Description |
|---|---|
| **Sequence number** | Each message must carry a comparable sequence ID |
| **Buffer** | Holds out-of-order messages in memory/store |
| **Gap timeout** | After N ms of waiting for a missing sequence, release buffered messages |
| **Stateful** | Requires persistent state if broker restarts |

### When to use
- Parallel processing produces out-of-order results that a downstream system requires in sequence.
- Network jitter causes late messages in a stream.
- Chunked file transfer — chunks arrive out of order and must be reassembled in sequence.
- Financial transactions — must be applied in the correct sequence for accurate balance.

### When NOT to use
- Consumer is order-independent — resequencing adds latency and complexity for no benefit.
- You can guarantee ordering at the broker (Kafka single-partition, FIFO queues) — no resequencer needed.

### Implementation examples
```
Apache Camel:
  from("kafka:out-of-order-events")
    .resequence(header("seqNo")).stream()
      .timeout(5000)       // release after 5s even if gap not filled
      .ignoreInvalidExchanges()
    .to("jms:queue:ordered-events");

Apache Camel (batch mode):
  from("jms:queue:chunks")
    .resequence(header("chunkIndex")).batch()
      .size(100)           // collect 100 messages, sort, release
      .timeout(10000)
    .to("jms:queue:ordered-chunks");
```

---

## 11. Claim Check

### What it is
The Claim Check pattern stores a **large message payload** in an external store and replaces it with a lightweight reference token (claim check) on the channel. The consumer uses the token to retrieve the full payload when it needs it.

### Flow

```
Producer
   │
   │  sends large message (e.g., 50 MB binary, large JSON)
   ▼
Integration Layer
   │
   │  intercepts large payload
   ▼
[ Claim Check — Store ]
   │  persists full payload to: S3 / Blob Storage / DB
   │  generates reference token: "ref:s3://bucket/order-8821.json"
   │
   ▼
[ Channel ]
   │  carries lightweight reference message only
   │  { "orderId": "8821", "payloadRef": "ref:s3://bucket/order-8821.json" }
   │
   ▼
[ Claim Check — Retrieve ]
   │  consumer fetches payload using token
   ▼
Consumer
   │
   │  processes full payload
   ▼
Business Logic
```

### Key properties
| Property | Description |
|---|---|
| **Size reduction** | Channel carries only a token; broker is not a storage system |
| **Lifecycle** | Payload should be deleted from the store after processing |
| **Security** | Reference token can be access-controlled independently of the channel |
| **Latency** | Extra round-trip to retrieve the payload |

### When to use
- Message broker has a payload size limit (RabbitMQ default 128 MB, SQS 256 KB).
- Large payloads (images, PDFs, video, large JSON blobs) would overwhelm the broker.
- You want consumers to decide whether they need the full payload (lazy fetch).
- Compliance — sensitive payload can be stored with tighter access control than the broker.

### When NOT to use
- Messages are small — the overhead of the store/retrieve round-trip is not justified.
- You need the payload inline for guaranteed delivery (storing to S3 is not transactional with message publish).

### Implementation examples
```
Apache Camel (S3 claim check):
  from("jms:queue:large-orders")
    .to("aws2-s3://my-bucket?deleteAfterWrite=false")   // store payload, replace with S3 key
    .setBody(header("CamelAwsS3Key"))                   // claim check token on channel
    .to("jms:queue:order-references");

  // Consumer side — retrieve
  from("jms:queue:order-references")
    .setHeader("CamelAwsS3Key", body())
    .to("aws2-s3://my-bucket?operation=getObject")      // fetch full payload
    .to("bean:orderProcessor");

Azure Service Bus + Blob Storage:
  // Producer: upload to Blob, send SAS URL as message body
  // Consumer: download from Blob URL, process, delete Blob
```

---

## 12. Wire Tap

### What it is
A Wire Tap **copies every message** passing through a channel to a secondary channel for monitoring, logging, auditing, or testing — without affecting the primary message flow. The original message continues to the consumer unchanged.

### Flow

```
Producer
   │
   │  sends message
   ▼
Integration Layer
   │
   │  intercepts message transparently
   ▼
[ Wire Tap ]
   │  creates a copy of the message
   │
   ├──► Primary Channel ──► Consumer (original flow, unaffected)
   │
   └──► Secondary Channel ──► Audit Log / Monitor / Test Spy
```

### Key properties
| Property | Description |
|---|---|
| **Transparent** | Primary consumer receives the original message, unmodified |
| **Async copy** | Tap is typically sent asynchronously to avoid adding latency |
| **Non-intrusive** | No change to producer or consumer code |
| **Volume** | Tapped channel receives the full volume of the primary channel |

### When to use
- **Auditing** — every message must be logged for compliance (finance, healthcare, GDPR).
- **Monitoring** — feed a monitoring/alerting system without coupling it to the primary flow.
- **Testing** — intercept messages in integration tests to assert on content without consuming them.
- **Debugging** — temporarily tap a production channel to inspect traffic.
- **Analytics** — feed a stream processing system with a copy of all events.

### When NOT to use
- The tapped channel itself becomes a bottleneck — ensure the secondary consumer keeps up.
- Sensitive data on the channel should not be duplicated without access controls on the tap destination.

### Implementation examples
```
Apache Camel:
  from("jms:queue:orders")
    .wireTap("jms:queue:audit-log")    // async copy to audit queue
    .to("bean:orderProcessor");        // primary consumer unaffected

Spring Integration:
  .wireTap("auditChannel")
  .channel("ordersChannel");

Apache Camel (with tap transformation):
  from("kafka:orders")
    .wireTap("kafka:audit")
      .newExchangeBody(simple("AUDIT: ${body}"))   // transform the tap copy only
    .to("bean:orderService");

AWS:
  // EventBridge rule: route all events to primary target + CloudWatch Logs (tap)
```

---

## 13. Dead Letter Channel

### What it is
A Dead Letter Channel is a special channel that receives messages that **could not be delivered or processed** after all retry attempts are exhausted. It is the safety net of the integration layer — no message is silently lost.

### Flow

```
Producer
   │
   │  sends message
   ▼
Integration Layer
   │
   │  delivers to primary channel
   ▼
[ Primary Channel / Consumer ]
   │
   │  processing fails (parse error, validation failure,
   │  downstream unavailable, max retries exceeded)
   ▼
[ Retry Logic ]
   │  attempt 1 → fail
   │  attempt 2 → fail
   │  attempt 3 → fail (max retries reached)
   │
   ▼
[ Dead Letter Channel ]
   │  stores failed message with error metadata
   │  (original payload + error reason + retry count + timestamps)
   │
   ├──► Operations Team (alert, manual inspection)
   └──► Replay mechanism (fix the cause, reprocess from DLC)
```

### Key properties
| Property | Description |
|---|---|
| **Error metadata** | DLC message includes original payload + reason + stack trace + retry count |
| **Alerting** | Monitor DLC depth; alert when non-empty |
| **Reprocessing** | After the root cause is fixed, messages can be moved back to the primary channel |
| **Retention** | DLC messages should be retained longer than normal messages |

### When to use
- Any production messaging system — always configure a DLC/DLQ. Messages must not be silently dropped.
- Non-retryable failures: malformed payload, schema validation error, business rule violation.
- Retryable failures that have exhausted all retry attempts.

### When NOT to use
- There is no scenario where you should disable dead-lettering on production channels. If you truly want to discard failed messages, make that an explicit and deliberate routing decision.

### Implementation examples
```
RabbitMQ (native DLX):
  // Declare queue with dead-letter exchange
  channel.queueDeclare("orders", true, false, false, Map.of(
      "x-dead-letter-exchange", "dlx",
      "x-dead-letter-routing-key", "orders.dead"
  ));

Apache Camel:
  from("jms:queue:orders")
    .errorHandler(deadLetterChannel("jms:queue:orders.DLQ")
        .maximumRedeliveries(3)
        .redeliveryDelay(2000)
        .logExhaustedMessageHistory(true))
    .to("bean:orderProcessor");

Kafka (application-level DLT):
  @RetryableTopic(
      attempts = "3",
      backoff = @Backoff(delay = 1000, multiplier = 2),
      dltTopicSuffix = ".DLT"
  )
  @KafkaListener(topics = "orders")
  public void handle(Order order) { ... }

AWS SQS:
  // Attach DLQ to source queue via RedrivePolicy
  {
    "maxReceiveCount": 3,
    "deadLetterTargetArn": "arn:aws:sqs:us-east-1:123:orders-dlq"
  }
```

---

## 14. Guaranteed Delivery

### What it is
Guaranteed Delivery ensures that a message will **eventually be delivered to its consumer** even if the broker, network, or consumer crashes. The message is persisted durably so it survives failures and is delivered when the consumer recovers.

### Flow

```
Producer
   │
   │  sends message with persistent delivery mode
   ▼
Integration Layer
   │
   │  persists message to durable store (disk) before acking producer
   ▼
[ Durable Message Channel ]
   │  message survives broker restart, network failure
   │
   ▼
[ Consumer — unavailable ]
   │  (broker holds message)
   │
   ▼
[ Consumer — recovers ]
   │
   │  broker delivers the held message
   ▼
Consumer
   │
   │  processes and acknowledges
   ▼
Business Logic
```

### Key properties
| Property | Description |
|---|---|
| **Persistence** | Message written to disk before broker acks the producer |
| **Acknowledgement** | Producer waits for broker persistence confirmation |
| **Consumer ack** | Message held until consumer explicitly acknowledges processing |
| **Redelivery** | Unacked messages are redelivered after timeout |
| **At-least-once** | Guaranteed delivery implies at-least-once; deduplication is a separate concern |

### When to use
- Business-critical messages that must not be lost: payments, orders, contract events.
- Consumers have planned maintenance windows — messages must be held.
- Financial, healthcare, legal — regulatory requirement for message durability.
- Any message where loss would require manual reconciliation.

### When NOT to use
- Pure real-time/ephemeral data: live metrics, sensor telemetry where only the latest value matters.
- Very high throughput with low-criticality payloads — persistence overhead degrades throughput.

### Implementation examples
```
RabbitMQ:
  // Durable queue + persistent message
  channel.queueDeclare("orders", durable: true, ...);
  channel.basicPublish("", "orders",
      new AMQP.BasicProperties.Builder().deliveryMode(2).build(),   // 2 = persistent
      messageBytes);

Kafka:
  // Kafka is durable by default (log to disk)
  // Ensure acks=all and min.insync.replicas >= 2 for full durability
  props.put("acks", "all");
  props.put("enable.idempotence", "true");

AWS SQS:
  // SQS Standard and FIFO store messages on multiple servers by default
  // No extra config needed — durability is built-in

Apache Camel:
  from("jms:queue:orders?acknowledgementModeName=CLIENT_ACKNOWLEDGE")
    .to("bean:orderProcessor");
  // Message not removed until orderProcessor completes and acks
```

---

## 15. Request-Reply

### What it is
Request-Reply implements **synchronous-style call semantics** over an asynchronous messaging infrastructure. The sender publishes a request message and waits for a correlated reply message on a reply channel. A correlation ID links the reply to the original request.

### Flow

```
Producer (Requester)
   │
   │  sends request message
   │  { body: "get order status", correlationId: "req-001", replyTo: "reply-queue" }
   ▼
Integration Layer
   │
   │  routes to service channel
   ▼
[ Request Channel ]
   │
   ▼
Consumer (Replier / Service)
   │
   │  processes request
   │  reads replyTo header
   │
   ▼
Integration Layer
   │
   │  routes reply to replyTo channel
   ▼
[ Reply Channel ]
   │  { body: "ORDER_CONFIRMED", correlationId: "req-001" }
   │
   ▼
Producer (Requester — waiting)
   │
   │  matches correlationId "req-001"
   │  unblocks caller with reply
   ▼
Business Logic (receives synchronous-style result)
```

### Key properties
| Property | Description |
|---|---|
| **Correlation ID** | Links reply to request; every request gets a unique ID |
| **Reply-To header** | Request message specifies where the reply should be sent |
| **Temporary reply queue** | Often a per-requester or per-request ephemeral queue |
| **Timeout** | Requester must have a timeout — replies may never come |
| **Async underneath** | Infrastructure is still async; the pattern simulates sync semantics |

### When to use
- You need a response to proceed — e.g., validate a payment before confirming an order.
- Migrating RPC/REST calls to messaging without changing calling code.
- Service mesh is unavailable and you need request/response over a reliable broker.
- Fan-out scatter-gather — send one request to N services, collect all replies via aggregator.

### When NOT to use
- Pure fire-and-forget commands — the reply mechanism adds unnecessary complexity.
- High-volume async pipelines — waiting for replies creates back-pressure.
- When a REST/gRPC call would be simpler — don't force sync semantics into async infrastructure without a reason.

### Implementation examples
```
Apache Camel:
  // Requester
  from("direct:checkInventory")
    .to(ExchangePattern.InOut, "jms:queue:inventory-requests")
    .log("Reply: ${body}");

  // Replier
  from("jms:queue:inventory-requests")
    .process(exchange -> {
        String item = exchange.getIn().getBody(String.class);
        exchange.getIn().setBody(inventoryService.check(item));
    });

RabbitMQ (AMQP native):
  // Requester — set replyTo and correlationId
  channel.basicPublish("", "inventory-requests",
      new AMQP.BasicProperties.Builder()
          .correlationId(UUID.randomUUID().toString())
          .replyTo("amq.rabbitmq.reply-to")      // direct reply-to pseudo-queue
          .build(),
      requestBytes);
  // Receive on replyTo queue, match correlationId

Spring Integration:
  @MessagingGateway
  public interface InventoryGateway {
      @Gateway(requestChannel = "inventoryRequestChannel",
               replyChannel   = "inventoryReplyChannel",
               replyTimeout   = 5000)
      InventoryResponse check(String itemId);
  }

Kafka (manual):
  // Producer: send to requests topic with headers: correlationId, replyTopic
  // Consumer: process, produce to replyTopic with same correlationId
  // Requester: poll replyTopic, match correlationId with a CompletableFuture map
```

---

## 16. Pattern Combination Guide

Patterns are rarely used in isolation. These are the most common compositions:

### Scatter-Gather
Distribute work to N services, collect all results.
```
Message
  │
  ▼
Splitter ──► Channel A ──► Consumer A ──►┐
         ──► Channel B ──► Consumer B ──►┤ Aggregator ──► Result
         ──► Channel C ──► Consumer C ──►┘
```
Patterns used: **Splitter + Pub/Sub Channel + Aggregator**

---

### Batch Processing Pipeline
Process each record in a batch independently and in parallel.
```
File/Batch Message
  │
  ▼
Splitter ──► (individual records) ──► Content-Based Router
                                              │
                             ┌────────────────┼────────────────┐
                             ▼                ▼                ▼
                          Type A           Type B           Type C
                          Consumer         Consumer         Consumer
```
Patterns used: **Splitter + Content-Based Router + Point-to-Point Channel**

---

### Reliable Event Pipeline
Publish events reliably, fan out to multiple consumers, handle failures gracefully.
```
Producer
  │
  ▼
Transactional Outbox (DB)
  │
  ▼
Relay / CDC
  │
  ▼
Guaranteed Delivery Channel
  │
  ▼
Pub/Sub Channel ──► Consumer A ──► (on fail) ──► Dead Letter Channel
                ──► Consumer B ──► Wire Tap  ──► Audit Log
```
Patterns used: **Guaranteed Delivery + Pub/Sub + Wire Tap + Dead Letter Channel**

---

### Large Message with Audit
Handle oversized payloads without overwhelming the broker.
```
Large Message
  │
  ▼
Claim Check (store to S3/Blob)
  │ (token on channel)
  ▼
Wire Tap ──► Audit Log
  │
  ▼
Content-Based Router ──► Consumer
                     ──► Dead Letter Channel (on failure)
```
Patterns used: **Claim Check + Wire Tap + Content-Based Router + Dead Letter Channel**

---

### Legacy System Integration
Connect a legacy system to a modern event-driven platform.
```
Legacy System (XML/EDI output)
  │
  ▼
Message Translator (XML → JSON canonical model)
  │
  ▼
Content-Based Router ──► Modern Service A
                     ──► Modern Service B
```
Patterns used: **Message Translator + Content-Based Router + Point-to-Point Channel**

---

## 17. Decision Matrix

### By requirement

| You need... | Pattern | Notes |
|---|---|---|
| Async communication between two systems | Message Channel | Foundation for all others |
| Each message handled by exactly one worker | Point-to-Point Channel | Queue semantic |
| All services receive every event | Pub/Sub Channel | Fanout semantic |
| Route messages to different destinations by type | Message Router | Header-based, fast |
| Route messages based on payload content | Content-Based Router | Body-parsed, slower |
| Drop irrelevant messages early | Message Filter | Reduce downstream load |
| Convert between incompatible formats | Message Translator | XSLT, DataWeave, custom mapper |
| Break a batch into individual items | Message Splitter | Enables parallelism |
| Combine related messages into one | Message Aggregator | After scatter or split |
| Restore message order after parallel processing | Resequencer | Requires sequence numbers |
| Avoid large payloads on the broker | Claim Check | Store externally, pass token |
| Log or monitor without touching the main flow | Wire Tap | Transparent, async copy |
| Never lose a failed message | Dead Letter Channel | Always configure in production |
| Survive broker/consumer restarts | Guaranteed Delivery | Persistent + ack |
| Get a reply over messaging infrastructure | Request-Reply | Sync-over-async, needs timeout |

### By integration scenario

| Scenario | Recommended patterns |
|---|---|
| Microservice event fan-out | Pub/Sub + Guaranteed Delivery + Dead Letter Channel |
| Batch file processing | Splitter + Content-Based Router + Aggregator |
| Legacy system modernisation | Message Translator + Message Router + Point-to-Point |
| Distributed request/response | Request-Reply + Correlation ID + Dead Letter Channel |
| Compliance audit trail | Wire Tap + Guaranteed Delivery + Dead Letter Channel |
| Large binary payloads | Claim Check + Point-to-Point Channel |
| Out-of-order stream processing | Resequencer + Message Filter |
| Multi-vendor B2B integration | Message Translator + Content-Based Router + Claim Check |

---

*Reference: Gregor Hohpe & Bobby Woolf — [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com) · Apache Camel EIP Documentation · Spring Integration Reference*
