# API Architecture Patterns

A complete reference for designing, exposing, and consuming APIs — from foundational protocols to advanced reliability and communication patterns.

---

## Table of Contents

1. [REST](#1-rest)
2. [GraphQL](#2-graphql)
3. [gRPC](#3-grpc)
4. [BFF — Backend for Frontend](#4-bff--backend-for-frontend)
5. [API Gateway](#5-api-gateway)
6. [Aggregator](#6-aggregator)
7. [API Composition](#7-api-composition)
8. [API Versioning](#8-api-versioning)
9. [Pagination](#9-pagination)
10. [Cursor Pagination](#10-cursor-pagination)
11. [HATEOAS](#11-hateoas)
12. [Idempotency](#12-idempotency)
13. [Rate Limiting](#13-rate-limiting)
14. [Request Deduplication](#14-request-deduplication)
15. [Async API](#15-async-api)
16. [Webhooks](#16-webhooks)
17. [Long Polling](#17-long-polling)
18. [Server-Sent Events](#18-server-sent-events)
19. [WebSockets](#19-websockets)
20. [REST vs GraphQL vs gRPC vs WebSockets](#20-rest-vs-graphql-vs-grpc-vs-websockets)
21. [Decision Guide](#21-decision-guide)

---

## 1. REST

### What it is
REST (Representational State Transfer) is an architectural style for distributed hypermedia systems built on the HTTP protocol. It models everything as a **resource** identified by a URI, manipulated through the standard HTTP verbs.

### Core constraints
| Constraint | Description |
|---|---|
| **Stateless** | Every request carries all context needed; server holds no client session |
| **Uniform interface** | Resources identified by URI; manipulated via standard verbs |
| **Client-server** | UI and data storage concerns are separated |
| **Cacheable** | Responses must declare their cacheability |
| **Layered system** | Client cannot tell whether it is connected to origin or intermediary |
| **Code on demand** (optional) | Server can return executable code (JavaScript) |

### HTTP verbs and semantics
| Verb | Semantics | Idempotent | Safe |
|---|---|---|---|
| `GET` | Retrieve resource | ✅ | ✅ |
| `POST` | Create resource or trigger action | ❌ | ❌ |
| `PUT` | Replace entire resource | ✅ | ❌ |
| `PATCH` | Partial update | ❌ | ❌ |
| `DELETE` | Remove resource | ✅ | ❌ |
| `HEAD` | Retrieve headers only | ✅ | ✅ |

### Request/Response shape
```http
POST /orders HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "customerId": "cust-42",
  "items": [{ "sku": "A1", "qty": 2 }]
}

HTTP/1.1 201 Created
Location: /orders/ord-8821
Content-Type: application/json

{
  "orderId": "ord-8821",
  "status": "PENDING",
  "total": 39.98
}
```

### Status codes — essential mapping
| Code | Meaning | When to use |
|---|---|---|
| `200 OK` | Success | GET, PUT, PATCH responses |
| `201 Created` | Resource created | POST that creates a resource |
| `204 No Content` | Success, no body | DELETE, PATCH with no return |
| `400 Bad Request` | Client error, invalid input | Validation failures |
| `401 Unauthorized` | Not authenticated | Missing/invalid token |
| `403 Forbidden` | Authenticated but not authorised | Insufficient permissions |
| `404 Not Found` | Resource does not exist | Unknown ID |
| `409 Conflict` | State conflict | Duplicate creation, version mismatch |
| `422 Unprocessable Entity` | Semantically invalid | Business rule violation |
| `429 Too Many Requests` | Rate limit exceeded | Throttling |
| `500 Internal Server Error` | Unhandled server fault | Catch-all server errors |

### When to choose REST
- Public-facing APIs consumed by browsers, mobile apps, and third-party developers.
- CRUD-heavy services with straightforward resource models.
- You need broad ecosystem support: CDN caching, API gateways, monitoring tools.
- Developer experience and discoverability matter.

### When NOT to choose REST
- Strongly-typed contracts between services — use gRPC.
- Flexible, client-driven queries across complex graphs — use GraphQL.
- Bidirectional real-time communication — use WebSockets.
- Very high-throughput internal RPC — HTTP/1.1 overhead is a concern.

---

## 2. GraphQL

### What it is
GraphQL is a **query language for APIs** and a runtime for executing those queries. The client specifies exactly what data it needs in a single request; the server returns exactly that — no more, no less.

### Core concepts
| Concept | Description |
|---|---|
| **Schema** | Strongly-typed SDL definition of all types, queries, mutations, subscriptions |
| **Query** | Read operation — client specifies fields to return |
| **Mutation** | Write operation — create, update, delete |
| **Subscription** | Real-time push over WebSocket — server pushes when data changes |
| **Resolver** | Server function that fetches data for one field in the schema |
| **Introspection** | Clients can query the schema itself to discover types |

### Request/Response shape
```graphql
# Query — client specifies exactly what fields it wants
query GetOrder($id: ID!) {
  order(id: $id) {
    orderId
    status
    customer {
      name
      email
    }
    items {
      sku
      qty
    }
  }
}
```
```json
{
  "data": {
    "order": {
      "orderId": "ord-8821",
      "status": "PENDING",
      "customer": { "name": "Alice", "email": "alice@example.com" },
      "items": [{ "sku": "A1", "qty": 2 }]
    }
  }
}
```

### Problems it solves
| Problem | REST behaviour | GraphQL behaviour |
|---|---|---|
| **Over-fetching** | Returns all fields whether needed or not | Returns only requested fields |
| **Under-fetching** | Multiple round-trips for related data | Single request, nested queries |
| **Schema evolution** | Breaking changes require versioning | Additive changes without versions |
| **Multiple clients** | Server must maintain multiple endpoint shapes | Each client shapes its own query |

### When to choose GraphQL
- Multiple client types (web, mobile, TV) with different data shape requirements.
- Complex, interconnected data graphs (social, e-commerce, CMS).
- Rapid product iteration — clients evolve queries without backend changes.
- Reducing mobile bandwidth — request only the fields you display.

### When NOT to choose GraphQL
- Simple CRUD with flat, uniform data shapes — REST is simpler.
- File uploads, binary streaming — REST handles these more naturally.
- Services consumed by third-party developers unfamiliar with GraphQL.
- You need HTTP-level caching — GraphQL over POST is not cacheable by default.

---

## 3. gRPC

### What it is
gRPC is a high-performance, open-source RPC framework built on **HTTP/2** with **Protocol Buffers** (protobuf) as the interface definition language and binary serialisation format.

### Core concepts
| Concept | Description |
|---|---|
| **Protobuf IDL** | Strongly-typed `.proto` file defines services, messages, field types |
| **Code generation** | `protoc` generates client and server stubs in any supported language |
| **HTTP/2 transport** | Multiplexed streams, header compression, binary framing |
| **Streaming** | Unary, server-streaming, client-streaming, bidirectional-streaming RPCs |

### Service definition
```protobuf
syntax = "proto3";

service OrderService {
  rpc PlaceOrder (PlaceOrderRequest) returns (PlaceOrderResponse);
  rpc StreamOrderUpdates (OrderId) returns (stream OrderUpdate);
}

message PlaceOrderRequest {
  string customer_id = 1;
  repeated Item items = 2;
}

message PlaceOrderResponse {
  string order_id = 1;
  string status = 2;
}
```

### RPC types
| Type | Pattern | Use case |
|---|---|---|
| **Unary** | request → response | Standard RPC call |
| **Server streaming** | request → stream of responses | Real-time feed, pagination |
| **Client streaming** | stream of requests → response | File upload, telemetry ingestion |
| **Bidirectional streaming** | stream ↔ stream | Chat, collaborative editing |

### When to choose gRPC
- Internal microservice-to-microservice communication where performance matters.
- Strongly-typed contracts enforced at compile time across polyglot services.
- High-throughput, low-latency RPC — binary protobuf vs. JSON text.
- Streaming RPCs for real-time feeds or large data transfer.
- Mobile clients where bandwidth efficiency matters (protobuf is 3–10× smaller than JSON).

### When NOT to choose gRPC
- Public browser-facing APIs — gRPC-Web requires a proxy (Envoy); native browser support is limited.
- Human-readable payloads needed for debugging without tooling.
- Teams without protobuf toolchain experience.

---

## 4. BFF — Backend for Frontend

### What it is
The Backend for Frontend pattern creates a **dedicated backend layer per client type** (web, iOS, Android, TV). Each BFF aggregates, shapes, and optimises data exactly for its client's needs — replacing a bloated, one-size-fits-all API.

### Architecture
```
Mobile App ──► Mobile BFF ──► Microservice A
                          ──► Microservice B

Web App ──────► Web BFF ────► Microservice A
                          ──► Microservice C
                          ──► Microservice D

TV Client ────► TV BFF ─────► Microservice B
```

### What each BFF does
- Aggregates data from multiple downstream services in a single call.
- Shapes the response to the exact fields and format the client needs.
- Handles auth token transformation per client.
- Manages client-specific caching, compression, and pagination strategies.
- Isolates client-specific logic so shared services stay clean.

### When to choose BFF
- Multiple clients with materially different data shape requirements.
- Mobile clients need fewer fields and smaller payloads than web.
- Teams own specific clients — the team owns their BFF without coordinating with other client teams.
- You want to avoid a "generic API" that grows into a maintenance burden.

### When NOT to choose BFF
- Single client type — one shared API is fine.
- BFFs become duplicated logic dumps — keep BFFs thin (composition only, no business logic).
- Too many BFF instances become an ops burden — use an API Gateway with request transformation instead.

---

## 5. API Gateway

### What it is
An API Gateway is a **single entry point** for all client requests. It handles cross-cutting concerns — routing, authentication, rate limiting, SSL termination, request transformation, observability — before forwarding to upstream services.

### Responsibilities
```
Client
  │
  ▼
[ API Gateway ]
  │  ← Authentication & Authorization (JWT, OAuth2, API Key)
  │  ← Rate Limiting & Throttling
  │  ← SSL/TLS Termination
  │  ← Request/Response Transformation
  │  ← Routing (path-based, header-based)
  │  ← Load Balancing
  │  ← Caching
  │  ← Logging & Tracing
  │  ← Circuit Breaking
  │
  ├──► Service A
  ├──► Service B
  └──► Service C
```

### When to choose an API Gateway
- Microservices architecture — clients must not call each service individually.
- Centralise cross-cutting concerns rather than implement them in every service.
- Multi-protocol support — REST, WebSocket, gRPC behind one entry point.
- A/B testing, canary deployments, blue-green routing.

### Common implementations
| Tool | Notes |
|---|---|
| **Kong** | OSS, plugin-based, Lua + Go |
| **AWS API Gateway** | Managed, deep AWS integration |
| **nginx / Envoy** | High-performance proxy layer |
| **Traefik** | Cloud-native, Kubernetes-native |
| **Azure APIM** | Enterprise managed, policy-based |

---

## 6. Aggregator

### What it is
The Aggregator pattern **combines responses from multiple service calls** into a single response for the client. It is the composition logic that lives in a BFF or API Gateway.

### Flow
```
Client
  │
  ▼
Aggregator Service
  │
  ├──► GET /orders/{id}      → Order data
  ├──► GET /customers/{id}   → Customer data
  └──► GET /inventory/{sku}  → Stock data
  │
  ▼
Merged Response
{
  "order": {...},
  "customer": {...},
  "inventory": {...}
}
  │
  ▼
Client
```

### Variants
| Variant | Description |
|---|---|
| **Parallel aggregation** | All upstream calls made concurrently — lowest latency |
| **Sequential aggregation** | Each call uses data from the previous — when there are dependencies |
| **Conditional aggregation** | Only make upstream call if a condition is met |
| **Partial aggregation** | Return available data even if some upstream calls fail (graceful degradation) |

### When to choose
- Client needs data from multiple services in one round-trip.
- Reducing mobile chattiness — one call vs. N calls.
- Shielding clients from the internal service decomposition of your system.

### When NOT to choose
- Aggregator becomes a bottleneck — it is a synchronous call fan-out.
- Prefer event-driven data materialisation (CQRS projections) over runtime aggregation for read-heavy workloads.

---

## 7. API Composition

### What it is
API Composition is the broader pattern of **composing data from multiple sources** to satisfy a query. It encompasses aggregation but includes transformation, enrichment, and filtering. It is the mechanism Aggregator and BFF rely on.

### Composition types
| Type | Description | When to use |
|---|---|---|
| **Data aggregation** | Merge results from N services | Joined views |
| **Data enrichment** | Add fields from lookup services | Supplementing core data |
| **Data transformation** | Reshape the combined result | Client format differences |
| **Data filtering** | Remove fields client doesn't need | Mobile bandwidth optimisation |

### Implementation approaches
```
Approach 1 — Runtime composition (BFF / Aggregator)
  Client ──► BFF ──► [calls multiple services] ──► merged response

Approach 2 — Materialised view (CQRS Read Model)
  Events ──► Projection Builder ──► Read DB (pre-composed view)
  Client ──► Query Service ──► Read DB (single fast query)

Approach 3 — GraphQL resolver composition
  Client query ──► GraphQL server ──► resolver per field ──► merged response
```

### When to choose
- Runtime composition: data freshness is critical, data volume is moderate.
- Materialised view: high read throughput, query performance matters more than absolute freshness.
- GraphQL resolvers: flexible, client-driven composition requirements.

---

## 8. API Versioning

### What it is
API Versioning manages **breaking changes** to an API while keeping existing consumers working. A versioning strategy defines when a new version is needed, how it is identified, and how long old versions are supported.

### Versioning strategies
| Strategy | Example | Pros | Cons |
|---|---|---|---|
| **URI path** | `/v1/orders`, `/v2/orders` | Explicit, cacheable, easy to test | URL pollution; clients must update paths |
| **Query parameter** | `/orders?version=2` | No URL change | Less explicit; can be overlooked |
| **Header** | `API-Version: 2` | Clean URLs | Not visible in browser; harder to test |
| **Content negotiation** | `Accept: application/vnd.api.v2+json` | RESTful, standard | Verbose; tooling support varies |
| **No versioning (evolution)** | Additive changes only | Simple | Only works with non-breaking changes |

### What constitutes a breaking change
```
Breaking (requires new version):
  - Removing a field
  - Renaming a field
  - Changing a field type
  - Changing required/optional semantics
  - Removing an endpoint
  - Changing HTTP verb semantics

Non-breaking (safe to add in-place):
  - Adding a new optional field
  - Adding a new endpoint
  - Adding a new enum value (caution — clients may not handle unknown values)
  - Relaxing a constraint (required → optional)
```

### Deprecation lifecycle
```
v1 Active ──► v2 Released ──► v1 Deprecated (sunset date announced)
                          ──► v1 Sunset (removed after grace period)
```

### When to choose URI path versioning
- Public APIs with many external consumers.
- Long support windows — different versions must coexist in routing/logging.
- Teams prefer explicit, visible version in every request log.

---

## 9. Pagination

### What it is
Pagination returns **large result sets in manageable chunks** rather than all at once. It protects both the server (query cost, memory) and the client (payload size, render time).

### Offset/Limit pagination
```http
GET /orders?offset=0&limit=20    → first page (items 0–19)
GET /orders?offset=20&limit=20   → second page (items 20–39)
```

**Response shape**
```json
{
  "data": [...],
  "pagination": {
    "total": 843,
    "offset": 0,
    "limit": 20,
    "hasNext": true
  }
}
```

**Pros:** Simple to implement; client can jump to any page by offset.  
**Cons:** Page drift — if items are inserted/deleted between requests, pages shift. Expensive `OFFSET` queries on large tables (`OFFSET 100000` scans 100,000 rows).

### Page number pagination
```http
GET /orders?page=1&pageSize=20
GET /orders?page=5&pageSize=20
```

**Pros:** Intuitive for UIs with page numbers.  
**Cons:** Same drift and performance problems as offset pagination.

### When to choose offset/page pagination
- Admin dashboards and internal tools where users navigate by page number.
- Data sets that change infrequently.
- Small to medium result sets where offset scan cost is acceptable.

---

## 10. Cursor Pagination

### What it is
Cursor pagination uses an **opaque cursor** (an encoded pointer to a specific record) instead of a numeric offset. The cursor is returned with each page and passed back to get the next page. The database resolves it as a `WHERE id > :cursor` query — no scan.

### Flow
```http
GET /orders                        → first page + cursor
GET /orders?cursor=eyJpZCI6MTAwfQ  → next page + cursor
GET /orders?cursor=eyJpZCI6MjAwfQ  → next page + cursor
```

**Response shape**
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MjAwfQ==",
    "hasNextPage": true
  }
}
```

**The cursor encodes:** `{ "id": 200, "createdAt": "2024-06-01T10:00:00Z" }` → Base64 encoded → opaque to client.

### Pros vs. offset pagination
| Property | Offset | Cursor |
|---|---|---|
| **Consistent pages** | ❌ Drift on inserts/deletes | ✅ Stable — based on a fixed anchor |
| **Performance** | ❌ `OFFSET N` scan | ✅ `WHERE id > cursor` index seek |
| **Random access** | ✅ Jump to page N | ❌ Must walk from first cursor |
| **Sort stability** | ❌ Fragile | ✅ Requires stable sort key |

### When to choose cursor pagination
- Feeds, timelines, activity streams — items are added in real-time.
- Large datasets where offset scan performance is unacceptable.
- Any public API you want to keep performant as data grows (REST, GraphQL Relay spec).

### When NOT to choose cursor
- Users need random page access (page 1, 5, 10) — cursors are sequential only.
- Simple, small, rarely-changing datasets.

---

## 11. HATEOAS

### What it is
Hypermedia As The Engine Of Application State — a REST constraint where **responses include links** describing available actions and related resources. Clients navigate the API by following links rather than constructing URLs.

### Example
```json
{
  "orderId": "ord-8821",
  "status": "PENDING",
  "_links": {
    "self":    { "href": "/orders/ord-8821",         "method": "GET" },
    "confirm": { "href": "/orders/ord-8821/confirm", "method": "POST" },
    "cancel":  { "href": "/orders/ord-8821/cancel",  "method": "POST" },
    "customer":{ "href": "/customers/cust-42",       "method": "GET" }
  }
}
```

### Benefits
- Clients are decoupled from URL structure — links drive navigation.
- Server can change URLs without breaking clients (they follow links, not hardcoded paths).
- Self-documenting responses — available actions are explicit.
- API is explorable by a generic client without documentation.

### When to choose HATEOAS
- Public APIs where you want long-term URL freedom without breaking clients.
- Workflow APIs where available actions depend on resource state (order status determines which actions are valid).
- API-first products aiming for full Level 3 REST (Richardson Maturity Model).

### When NOT to choose HATEOAS
- Internal microservice APIs — the overhead rarely pays off.
- Most teams find the tooling and discipline required impractical. A well-documented OpenAPI spec is usually a more pragmatic alternative.

---

## 12. Idempotency

### What it is
An idempotent API operation produces **the same result regardless of how many times it is called** with the same input. For non-idempotent operations (POST, PATCH), an **Idempotency Key** lets clients safely retry without causing duplicate side effects.

### Idempotency Key pattern
```http
POST /payments HTTP/1.1
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ "amount": 99.99, "currency": "USD" }
```

**First call:** Process payment → store result against key → return `200`.  
**Retry with same key:** Return cached result → do NOT process again.

### Server implementation
```
1. Receive request with Idempotency-Key header
2. Check cache/DB for key
   ├── Key found → return stored response (skip processing)
   └── Key not found →
       a. Lock the key (prevent concurrent duplicate requests)
       b. Process the operation
       c. Store result against key (with TTL, e.g., 24h)
       d. Return result
```

### HTTP verb idempotency reference
| Verb | Naturally idempotent? | Notes |
|---|---|---|
| `GET` | ✅ | Safe and idempotent by spec |
| `PUT` | ✅ | Replaces resource state — same result on repeat |
| `DELETE` | ✅ | Second delete returns 404, not an error |
| `POST` | ❌ | Creates new resource each time — requires Idempotency Key |
| `PATCH` | ❌ | Relative patches (`add 1 to qty`) are not idempotent |

### When to choose Idempotency Keys
- Payment APIs, order placement, any financial transaction.
- Any operation where duplicates cause real harm (double charge, double shipment).
- Mobile and unreliable-network clients that must safely retry.
- Any `POST` endpoint that creates a resource or triggers a side effect.

---

## 13. Rate Limiting

### What it is
Rate limiting **caps the number of requests** a client can make to an API within a time window. It protects the service from abuse, ensures fair usage, and prevents accidental client bugs from causing DoS.

### Algorithms
| Algorithm | Description | Pros | Cons |
|---|---|---|---|
| **Fixed window** | N requests per window (e.g., 100/minute) | Simple | Burst at window boundary (200 req in 2 seconds) |
| **Sliding window** | Rolling N requests over the last 60 seconds | Smooth limits | More memory |
| **Token bucket** | Bucket of N tokens refills at rate R; each request costs 1 token | Allows short bursts | More complex |
| **Leaky bucket** | Requests queued and processed at a fixed rate | Strict rate, no bursts | Queue depth limits throughput |

### Response
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1717235260
```

### Rate limit tiers
```
Anonymous client:        60 requests/hour
Authenticated user:    1000 requests/hour
Premium API key:      10000 requests/hour
Internal service:    Unlimited (bypass)
```

### When to choose rate limiting
- Any public or partner-facing API — always.
- Per-endpoint limits: stricter limits on expensive operations (search, reports).
- IP-based, user-based, or API-key-based limiting depending on trust model.
- Combined with circuit breaker at the gateway for cascading failure prevention.

---

## 14. Request Deduplication

### What it is
Request Deduplication detects and suppresses **duplicate in-flight requests** — the same request submitted multiple times before the first response is received (double-click, network retry, impatient user). Unlike idempotency (which handles retries over time), deduplication handles **concurrent duplicates**.

### Flow
```
Client submits request ──► Gateway/Service
                                │
                        Check dedup store
                                │
                   ┌────────────┴────────────┐
             Not seen                    Already in-flight
                   │                         │
             Process normally          Return "pending"
             Store request ID          or wait and return
             in dedup cache            the first response
```

### Strategies
| Strategy | Description | When to use |
|---|---|---|
| **Request fingerprint** | Hash of method + URL + body; deduplicate within short TTL | Idempotent-safe writes |
| **Client-supplied key** | Client sends `X-Request-ID`; server deduplicates by it | Client-controlled retry logic |
| **Database unique constraint** | Unique constraint on natural key prevents duplicate insert | Database-level safety net |
| **Distributed lock** | Lock on request key for duration of processing | Concurrent duplicate prevention |

### When to choose
- Form submissions — prevent double-click from creating two orders.
- Mobile networks — requests re-sent automatically after timeout.
- Batch jobs that may submit the same record twice.
- Complement to idempotency — idempotency handles temporal retries; deduplication handles concurrent ones.

---

## 15. Async API

### What it is
An Async API accepts a request, immediately returns an **acknowledgement** (with a job/task ID), and processes the work asynchronously. The client polls for the result or receives a callback when complete.

### Flow
```
Client ──► POST /reports/generate
              │
              ▼
         Server accepts job
              │
              ▼
         HTTP 202 Accepted
         { "jobId": "job-001", "statusUrl": "/jobs/job-001" }
              │
      ┌───────┘
      │ (async, background processing)
      ▼
   Worker processes report

Client ──► GET /jobs/job-001
              │
              ▼
         { "status": "RUNNING", "progress": 42 }

Client ──► GET /jobs/job-001
              │
              ▼
         { "status": "COMPLETE", "resultUrl": "/reports/rpt-99" }
```

### When to choose Async API
- Long-running operations (report generation, video encoding, ML inference, data export).
- Operations that may take longer than HTTP timeout limits (30s+).
- You want to decouple client response time from processing time.
- Paired with webhooks — server calls back when complete instead of requiring client polling.

### When NOT to choose Async API
- Operations that complete in milliseconds — sync response is simpler.
- Clients that cannot manage polling state (very simple clients, scripts).

---

## 16. Webhooks

### What it is
Webhooks are **HTTP callbacks** — instead of the client polling for changes, the server sends an HTTP POST to a client-provided URL when an event occurs. The client registers a URL; the server calls it.

### Flow
```
Client registers: POST /webhooks { "url": "https://client.com/hooks/orders" }
                                           │
                                           │ (later, when order ships)
                                           ▼
Server ──► POST https://client.com/hooks/orders
           { "event": "order.shipped", "orderId": "ord-8821", "trackingNumber": "1Z999AA..." }

Client ──► HTTP 200 OK (acknowledges receipt)
```

### Reliability concerns
| Concern | Solution |
|---|---|
| **Delivery failure** | Retry with exponential backoff; alert after N failures |
| **Duplicate delivery** | Sign payloads; consumer checks delivery ID (idempotency) |
| **Security** | HMAC signature in `X-Webhook-Signature` header; verify before processing |
| **Timeout** | Return `200` immediately; process asynchronously |
| **Order** | Webhooks may arrive out of order — include timestamps and sequence numbers |

### Webhook signature verification
```python
import hmac, hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

### When to choose webhooks
- B2B integrations — notify a partner when your system state changes.
- Payment processors (Stripe, PayPal) notifying your server of payment events.
- CI/CD systems — GitHub notifying your pipeline on push.
- Replace polling for external consumers.

### When NOT to choose webhooks
- Client is behind a firewall and cannot receive inbound HTTP — use polling or SSE.
- Very high event frequency — each event triggers an HTTP call; use SSE or WebSockets instead.

---

## 17. Long Polling

### What it is
Long Polling is a technique where the client sends a request and the **server holds it open** until new data is available (or a timeout occurs). When data arrives, the server responds and the client immediately sends a new request — simulating push with pull semantics.

### Flow
```
Client ──► GET /notifications?since=last-id
              │
              │  (server holds request open — waiting for new data)
              │
              │  (10s later — new notification arrives)
              │
              ▼
         HTTP 200 { "notifications": [...], "lastId": "n-99" }

Client ──► GET /notifications?since=n-99   (immediately reconnects)
              │
              │  (server holds again...)
```

### When to choose long polling
- Simple real-time updates when WebSockets are not available (firewall, proxy restrictions).
- Low-to-medium frequency updates where a full WebSocket connection is overkill.
- Browsers/environments that require standard HTTP (no WebSocket support).
- Fallback transport for environments where SSE or WebSockets are blocked.

### When NOT to choose long polling
- High-frequency updates — connection overhead per event is significant.
- Bidirectional communication — long polling is server-push only.
- Scale — each held connection consumes a server thread/connection; SSE or WebSockets scale better.

---

## 18. Server-Sent Events

### What it is
Server-Sent Events (SSE) is an HTTP-based protocol where the server sends a **continuous stream of events** to the client over a single long-lived HTTP connection. The client receives events but cannot send data back on the same connection.

### Protocol
```http
GET /events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 1
event: order.updated
data: {"orderId":"ord-8821","status":"SHIPPED"}

id: 2
event: order.updated
data: {"orderId":"ord-9001","status":"DELIVERED"}
```

### Client (browser)
```javascript
const source = new EventSource('/events');

source.addEventListener('order.updated', (event) => {
    const order = JSON.parse(event.data);
    console.log('Order updated:', order);
});

source.onerror = () => source.close(); // auto-reconnects by default
```

### When to choose SSE
- Real-time dashboards, live feeds, notification streams, progress updates.
- One-directional server-to-client push (no client-to-server data needed on the stream).
- Browser clients — `EventSource` is a native browser API; no library required.
- You want automatic reconnection built-in (browser `EventSource` reconnects on drop).
- Simpler than WebSockets when bidirectional is not needed.

### When NOT to choose SSE
- Client needs to send data back on the same connection — use WebSockets.
- Non-browser clients (some HTTP clients do not handle streaming responses well).
- Very high event rates — SSE carries HTTP overhead per event.

---

## 19. WebSockets

### What it is
WebSockets provide a **persistent, full-duplex, bidirectional communication channel** over a single TCP connection. After an initial HTTP upgrade handshake, both client and server can send messages at any time with minimal overhead.

### Handshake
```http
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

### Message framing
After handshake, the connection is raw frames — not HTTP. Each frame has a small header (2–10 bytes), making WebSocket extremely efficient for high-frequency messages.

### Client (browser)
```javascript
const ws = new WebSocket('wss://api.example.com/ws');

ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', topic: 'orders' }));

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log('Received:', msg);
};

ws.onclose = () => reconnect(); // implement reconnection logic
```

### When to choose WebSockets
- **Real-time bidirectional communication**: chat, collaborative editing, multiplayer games.
- **High-frequency updates**: live trading prices, real-time sports scores, live dashboards.
- **Low-latency push**: any scenario where each SSE HTTP-level overhead matters.
- Sub-second round-trip interaction where full HTTP request overhead is unacceptable.

### When NOT to choose WebSockets
- One-directional server push — SSE is simpler and handles reconnection natively.
- Stateless request/response — REST is more appropriate and scales better.
- Environments with aggressive proxy/firewall restrictions that block WebSocket upgrades.
- Load balancing is complex — WebSocket connections are stateful and must route to the same server (sticky sessions or a pub/sub layer).

---

## 20. REST vs GraphQL vs gRPC vs WebSockets

### Comparison matrix

| Dimension | REST | GraphQL | gRPC | WebSockets |
|---|---|---|---|---|
| **Protocol** | HTTP/1.1 or HTTP/2 | HTTP/1.1 or HTTP/2 | HTTP/2 | TCP (WebSocket framing) |
| **Data format** | JSON, XML, plain text | JSON | Protobuf (binary) | Any (JSON, binary, custom) |
| **Type safety** | OpenAPI spec (external) | Built-in SDL schema | Protobuf IDL (compile-time) | None (application-defined) |
| **Latency** | Medium — HTTP overhead | Medium — single endpoint, query parsing | Low — binary, HTTP/2 multiplexing | Very low — persistent connection, minimal framing |
| **Performance** | Good | Good | Excellent (3–10× smaller payload) | Excellent for high-frequency |
| **Browser support** | ✅ Native | ✅ Via HTTP | ⚠️ Needs gRPC-Web + proxy | ✅ Native `WebSocket` API |
| **Mobile** | ✅ Good | ✅ Excellent (request only needed fields) | ✅ Excellent (binary, small payload) | ✅ Good (persistent connection reduces reconnect overhead) |
| **Microservices** | ✅ Good | ⚠️ Adds resolver complexity | ✅ Excellent — designed for this | ⚠️ Stateful; complicates scaling |
| **Streaming** | ⚠️ Via SSE or chunked transfer | ✅ Subscriptions (over WebSocket) | ✅ Native server/client/bidi streaming | ✅ Native bidirectional |
| **Real-time communication** | ❌ Polling or SSE workaround | ⚠️ Subscriptions only | ✅ Bidirectional streaming | ✅ Native, designed for this |
| **Request complexity** | Simple | Client-defined (complex queries possible) | Defined by `.proto` | Application-defined protocol |
| **Schema / contract** | OpenAPI (optional) | SDL (mandatory) | Protobuf IDL (mandatory) | None standard |
| **Complexity** | Low | Medium | Medium-High (toolchain) | Medium (state management) |
| **Observability** | ✅ Excellent — HTTP logs, status codes, tracing | ⚠️ All `200 OK` — errors in body; needs custom tooling | ✅ Good — structured + gRPC status codes | ⚠️ Hard — opaque frames; requires custom logging |
| **Caching** | ✅ Native HTTP caching (CDN, browser, proxy) | ❌ POST-based; no HTTP cache; needs client-side cache | ❌ No HTTP caching | ❌ No caching — live data stream |
| **Error model** | HTTP status codes | Always `200`; errors in `errors[]` array | gRPC status codes (richer than HTTP) | Application-defined |
| **Code generation** | Optional (OpenAPI generators) | Optional (codegen tools) | Mandatory (`protoc`) | None |
| **Best for** | Public APIs, CRUD, browser clients | Flexible queries, multiple client types | Internal microservices, high-performance RPC | Chat, gaming, live dashboards, collaborative tools |

### Latency comparison (relative)

```
WebSockets  ████ (persistent, minimal framing overhead — best for sustained high-frequency)
gRPC        █████ (binary, HTTP/2 multiplexed — best for request/response RPC)
REST        ████████ (JSON text, HTTP/1.1 per-request overhead)
GraphQL     ████████ (similar to REST; adds query parsing overhead)
```

### Payload size comparison (same data, approximate)

```
Protobuf (gRPC)   ██ (binary, field numbers — ~60% smaller than JSON)
JSON (REST)       █████ (text, key names repeated every message)
JSON (GraphQL)    █████ (same as REST — only requested fields, but still JSON)
WebSocket frame   ██ (framing overhead ~2–10 bytes per message)
```

---

## 21. Decision Guide

### Choose by primary requirement

| Requirement | Best choice | Why |
|---|---|---|
| Public API for third-party developers | **REST** | Universal tooling, HTTP caching, familiar |
| Multiple clients with different data shapes | **GraphQL** | Each client queries exactly what it needs |
| High-performance internal microservices | **gRPC** | Binary, typed, HTTP/2, generated clients |
| Real-time bidirectional communication | **WebSockets** | Full-duplex, persistent, low overhead |
| Server push to browser (one-way) | **SSE** | Native browser support, auto-reconnect |
| Replace polling for external consumers | **Webhooks** | Push, not pull |
| Long-running async operations | **Async API** | 202 + polling or webhook callback |
| Fan-out one endpoint to many clients | **Pub/Sub Channel** | Decouple producers from consumers |
| Prevent duplicate side effects on retry | **Idempotency Key** | Client-safe retries |
| Protect API from abuse | **Rate Limiting** | Fixed/sliding window, token bucket |

### Choose by client type

| Client | Recommended |
|---|---|
| **Browser (web app)** | REST or GraphQL; SSE for push; WebSocket for real-time |
| **Mobile (iOS/Android)** | GraphQL (minimal payload) or gRPC (binary efficiency) |
| **Internal microservice** | gRPC (performance + type safety) |
| **Third-party / partner** | REST (familiarity) + Webhooks (event notifications) |
| **IoT / embedded device** | gRPC or MQTT; REST as fallback |
| **Data pipeline / analytics** | Async API + Webhooks or event streaming |

### Architecture selection checklist

```
Is it a public-facing API?
  └── Yes → REST (with OpenAPI spec)
      ├── Multiple client types with different data needs? → Add GraphQL BFF
      └── Real-time events to external consumers? → Add Webhooks

Is it internal service-to-service?
  └── Yes → gRPC
      ├── Need event streaming? → Add Kafka/event bus
      └── Need bidirectional streaming? → gRPC bidirectional RPC

Does the client need real-time push?
  ├── Server → Client only? → SSE
  ├── Bidirectional? → WebSockets
  └── Infrequent, can poll? → Long Polling (fallback)

Is the operation long-running?
  └── Yes → Async API (202 + jobId) + Webhooks for completion callback

Do you have multiple frontend clients?
  └── Yes → BFF per client type + API Gateway for cross-cutting concerns
```

---

*Reference: Roy Fielding — REST Dissertation (2000) · GraphQL Specification (graphql.org) · gRPC Documentation (grpc.io) · RFC 6455 — WebSocket Protocol · MDN — Server-Sent Events*
