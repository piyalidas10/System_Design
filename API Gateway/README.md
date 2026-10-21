# API Gateway

As systems grow in complexity, managing API traffic, security, and service interaction becomes increasingly challenging. API gateways are designed to solve exactly this problem.

---

## Introduction to API Gateways

<img src="./API gateway intro.png" width="90%" />

As systems grow, the number of clients and backend services grow with them. Connecting every client directly to every service quickly becomes difficult to secure, monitor, and evolve.

An API gateway solves this by introducing a **single entry point** between consumers and the backend ecosystem.

```
Without API Gateway                       With API Gateway
───────────────────                       ────────────────

Client A ──► Service 1                    Client A ─┐
Client A ──► Service 2                    Client B ─┼──► [API Gateway] ──► Service 1
Client B ──► Service 1                    Client C ─┘           │       ──► Service 2
Client B ──► Service 3                                          │       ──► Service 3
Client C ──► Service 2                                          │       ──► Service 4
Client C ──► Service 4
                                          One stable entry point.
Tight coupling. Hard to secure.           Centralized control.
Complex for clients.                      Simplified client interaction.
```

Instead of pushing concerns like authentication, authorization, routing, rate limiting, caching, and request transformation into every service, they are **centralized in one place**.

From an architectural perspective, the API gateway becomes the **front door of the system**:
- Simplifies client interactions
- Shields internal services from direct exposure
- Provides a consistent way to enforce security and operational policies

> **Key idea:** Backend services focus on business logic. The gateway handles cross-cutting concerns. That separation improves maintainability, strengthens security, and provides a controlled layer through which the entire API landscape can evolve and scale.

---

## How API Gateways Work

<img src="./API gateway works.png" width="90%" />

Every request first arrives at the gateway. The gateway then decides where it should go and how it should be handled before it ever reaches the backend service.

```
                        ┌─────────────────────────────────────────────┐
                        │              API Gateway                    │
                        │                                             │
Client ─── Request ────►│  1. Authenticate & Authorize                │
                        │  2. Apply Rate Limiting                     │
                        │  3. Transform Request (if needed)           │
                        │  4. Route to correct backend service        │
                        │  5. Aggregate responses (if needed)         │
                        │  6. Return standardized response to client  │
                        └──────────────────┬──────────────────────────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
              ┌────────────┐       ┌────────────┐       ┌────────────┐
              │ Service A  │       │ Service B  │       │ Service C  │
              └────────────┘       └────────────┘       └────────────┘
```

The gateway centralizes all **cross-cutting concerns**:

| Concern | Without Gateway | With Gateway |
|---|---|---|
| Authentication | Implemented in every service | Centralized once in the gateway |
| Rate Limiting | Each service must self-protect | Enforced at the entry point |
| Request Transformation | Every service handles its own format | Translated at the gateway |
| Protocol Translation | Services must support all protocols | Gateway bridges client and service protocols |
| Response Standardization | Inconsistent across services | Uniform format enforced at the gateway |

> **Trade-off:** The gateway becomes critical infrastructure. It must be **highly available** and capable of handling traffic at the scale of the entire system.

---

## Benefits of Using an API Gateway

The real value of an API gateway is not that it forwards requests — it is that it becomes a **central control point** for the entire API ecosystem.

<img src="./API gateway benefits.png" width="90%" />

### 1. Security — Centralized Authentication & Authorization

```
External Client
      │
      ▼
[API Gateway]  ←── validates JWT / OAuth token / API key HERE
      │                       (before request reaches any service)
      ▼
[Backend Service]  ←── can trust request is already authenticated
```

Instead of exposing dozens of backend services to the internet, we expose a single hardened entry point where authentication, authorization, and security policies are enforced consistently.

### 2. Rate Limiting & Traffic Protection

```
Normal Client ──────────────────────────────────►│
                                                  │ API Gateway
Abusive Client ──── (throttled / blocked) ───────►│ enforces quotas
                                                  │
Bot / DDoS  ────── (rate limit hit, dropped) ────►│
                                                  │
                                            Backend services protected
```

Rate limiting prevents abusive traffic from overwhelming services. Load balancing distributes requests intelligently to avoid hotspots.

### 3. Performance — Caching

```
First request:   Client ──► Gateway ──► Service ──► DB  (response cached at gateway)
Second request:  Client ──► Gateway ──► (served from cache)  ← no backend hit
```

Frequently requested data is served without repeatedly hitting backend services — reducing latency for users and load on the system.

### 4. Request Transformation & Protocol Translation

```
Mobile Client (REST/JSON) ──► Gateway ──► Legacy Service (SOAP/XML)
                                │
                         Gateway translates
                         format and protocol
```

Clients and services can evolve independently even when they use different protocols, payload formats, or headers.

### 5. Request Aggregation

```
Without Gateway:                          With Gateway (Aggregation):
Client ──► Service A (customer data)      Client ──► Gateway ──► Service A
Client ──► Service B (order history)                     │    ──► Service B
Client ──► Service C (recommendations)                   │    ──► Service C
3 round-trips                                            │
                                                   aggregated response
                                                   1 round-trip
```

Rather than forcing clients to call multiple backend services, the gateway combines responses and returns a single consolidated result — reducing network overhead and hiding internal complexity.

### 6. Observability — Logging, Monitoring & Analytics

Because all traffic flows through a single layer, the gateway is an excellent **observation point**:
- Unified access logs across all services
- Latency metrics per route and per service
- Security event detection (unusual patterns, failed auth attempts)
- Usage analytics per consumer or API key

### Benefits Summary

| Benefit | Description |
|---|---|
| **Security** | Centralized auth, token validation, and API policy enforcement |
| **Rate Limiting** | Protects backend services from traffic overload |
| **Caching** | Reduces latency and backend load for repeated requests |
| **Request Transformation** | Decouples client format from service format |
| **Aggregation** | Reduces client round-trips by combining multiple service calls |
| **Observability** | Single point for logging, monitoring, and analytics across all APIs |
| **Decoupling** | Clients depend on stable gateway APIs; internal services can change freely |

---

## Popular API Gateway Implementations

<img src="./API gateway implements.png" width="90%" />

An API gateway is an **architectural pattern**, not a specific product. Organizations choose different implementations based on operational needs, cloud strategy, and scale.

| Category | Examples | Trade-offs |
|---|---|---|
| **Self-managed** | Nginx, Kong, Traefik, Envoy | Full control and flexibility; team owns operations, scaling, and maintenance |
| **Cloud-managed** | AWS API Gateway, Azure API Management, Google Cloud API Gateway | Reduced operational overhead; may introduce vendor dependency and higher cost |
| **Open-source** | Kong (OSS), Gravitee, KrakenD | Community support; customizable; team manages deployment |

> **Key decision:** Balance **operational control** against **managed convenience**. Regardless of implementation, every API gateway serves the same purpose — a centralized layer for managing, securing, and governing API traffic.

---

## When to Use an API Gateway

A common mistake in system design is assuming that every architecture needs an API gateway. Like most architectural patterns, its value depends on the **complexity of the system it is solving for**.

<img src="./API gateway use.png" width="90%" />

### Use an API Gateway When

```
✅ Microservices architecture — many independent services that clients should not address individually
✅ Multiple client channels — web, mobile, partner integrations, IoT devices with different needs
✅ Consistent cross-cutting concerns — auth, rate limiting, monitoring must be uniform across the platform
✅ API versioning — multiple API versions must be maintained simultaneously
✅ Backend for Frontend (BFF) — different response shapes needed for web vs. mobile clients
```

### Consider Skipping It When

```
⚠️ Simple monolithic application — a gateway adds operational complexity without meaningful benefit
⚠️ Low-traffic internal services — direct service-to-service communication is simpler
⚠️ Early-stage systems — premature gateway adoption can slow development before the complexity justifies it
```

### Decision Guide

| System Characteristic | Recommendation |
|---|---|
| Single service or monolith | Direct client access is simpler |
| Few internal services, low traffic | Direct communication; evaluate later |
| Microservices (many services) | API gateway strongly recommended |
| Multiple external client types | API gateway strongly recommended |
| Need for consistent auth & policies | API gateway strongly recommended |
| Regulated industry (audit, compliance) | API gateway for centralized logging and governance |

> **Architectural lesson:** Introduce an API gateway when it **reduces complexity at the system level** — not when it simply moves complexity into another component.

---

## API Gateway vs. Related Concepts

| Concept | Purpose | Similarity | Difference |
|---|---|---|---|
| **Reverse Proxy** | Routes traffic to backend servers | Both sit in front of services | Gateway adds auth, rate limiting, transformation; proxy mainly routes |
| **Load Balancer** | Distributes traffic across server instances | Both sit in front of services | LB focuses on traffic distribution; gateway focuses on API management |
| **Service Mesh** | Manages service-to-service communication internally | Both handle cross-cutting concerns | Mesh operates East-West (internal); gateway operates North-South (external) |
| **BFF (Backend for Frontend)** | Tailored API per client type | Both aggregate and adapt APIs | BFF is purpose-built per client; gateway is shared across all clients |

---

## Interview Questions

Common interview questions on API gateways:

1. What is an API gateway and what problem does it solve?
2. How does an API gateway differ from a reverse proxy and a load balancer?
3. What cross-cutting concerns does an API gateway centralize?
4. How does an API gateway improve security in a microservices architecture?
5. What is rate limiting and how does a gateway enforce it?
6. How does request aggregation at the gateway reduce client complexity?
7. What is the trade-off of making an API gateway the single entry point?
8. When should you use an API gateway versus direct service-to-service communication?
9. What is the difference between a gateway and a service mesh?
10. What are the operational considerations of running a self-managed vs. cloud-managed gateway?

---

## Summary and Key Takeaways

| Concept | Takeaway |
|---|---|
| **API Gateway** | A centralized control layer sitting between clients and backend services |
| **Single Entry Point** | Clients interact with one stable address; internal topology is hidden |
| **Cross-cutting Concerns** | Auth, rate limiting, caching, transformation, and logging handled once — not in every service |
| **Security** | Centralized token validation and policy enforcement before requests reach services |
| **Aggregation** | Gateway can combine multiple service calls into one client response |
| **When to Use** | Valuable in microservices, multi-channel APIs, and systems needing consistent governance |
| **When to Skip** | Monoliths and simple internal services may not need the added operational layer |

> An API gateway is not just a routing component — it is a **centralized platform layer** that improves security, performance, observability, and operational consistency across the entire system. Good architecture is not about adding components — it is about introducing them when they solve **meaningful problems**.

---

## What's Next

In the next lecture, we will shift focus from API traffic management to content delivery and explore how **Content Delivery Networks (CDNs)** help reduce latency, improve user experience, and scale applications globally.
