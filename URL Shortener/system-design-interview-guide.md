# System Design Interview Guide: URL Shortener & Rate Limiter

> **"When an interviewer asks you to design a URL shortener or a rate limiter within 40 minutes, it is impossible to build the whole system. Instead, you need to ask about the scope, scale (such as the number of users), and constraints first."**

In a 40-minute system design interview, the goal is **not** to build a complete production-grade system. The goal is to demonstrate how you clarify requirements, make trade-offs, design the architecture, and explain how the system can evolve.

> ⚠️ **The biggest mistake** is starting to draw the architecture or write code immediately without understanding the problem's scope.

---

## 1. What Should You Ask the Interviewer First?

When the interviewer says *"Design a URL shortener"* or *"Design a rate limiter,"* start by clarifying the requirements.

### 1.1 Scope and Functional Requirements

- What are the core features we need to support?
- Are we designing only the core functionality or a complete production system?
- Which features are explicitly out of scope?

> **Example (URL Shortener):** Create a short URL and redirect users. Is analytics required?

---

### 1.2 Scale and Traffic

- How many users are expected?
- How many requests per second should the system handle?
- What is the expected read-to-write ratio?
- What growth should we anticipate?

> **Example:** 1,000 requests/second versus 100,000 requests/second can lead to very different designs.

---

### 1.3 Constraints and Non-Functional Requirements

- What latency target should we meet?
- What availability and durability are required?
- Is strong consistency required, or is eventual consistency acceptable?
- Are there security, privacy, or regulatory constraints?

> **Example:** Should redirects complete within 50 ms at the p95 level?

---

### 1.4 Technology and Infrastructure Constraints

- Are we free to choose the database and cache?
- Can we use managed services, or must everything run on our own infrastructure?
- Is the design expected to run on a single machine or across multiple regions?
- Are there existing systems we must integrate with?

> You do not need to ask every question in every interview. Ask the ones that **materially change your design**.

---

## 2. Example: URL Shortener Interview (40 Minutes)

### Sample Opening Statement

> *"Before designing the system, I'd like to clarify the requirements so I can choose an architecture appropriate for the expected scale."*
>
> *"Should I focus on creating short URLs and redirecting users, or should I also include analytics, expiration, custom aliases, and user accounts?"*
>
> *"What traffic should we expect, especially the number of redirects per second?"*
>
> *"Do we have any latency, availability, or consistency requirements?"*
>
> *"Should I focus on a simple working design first and then explain how to evolve it into a production-grade distributed system?"*

### Interviewer Response

> *"Focus on creating short URLs and redirects. Expect 10 million users, 100,000 redirects per second at peak, high availability, and low latency. Analytics is out of scope."*

### How Those Answers Influence Your Design

| Requirement | Implication | Solution |
|---|---|---|
| Core functionality | Create short links and redirect users | Simple API |
| High read traffic | 100,000 redirects per second at peak | Cache + scale out |
| High availability | Avoid a single point of failure | Redundancy |
| Low latency | Serve popular redirects from cache | Redis |

### Initial Architecture

```
Client
  └─► CDN / WAF / Load Balancer
        └─► Stateless URL Shortener API
              ├─► Redis Cluster       (fast lookups)
              └─► Distributed Database (durable mappings)
```

> *Conceptual architecture; cache misses and writes require appropriate database access, and cache/database consistency must be addressed.*

You would then explain short-code generation, collision handling, cache misses, database partitioning, replication, and failure recovery only as time allows.

---

## 3. Example: Distributed Rate Limiter

For a rate limiter, the clarifying questions are slightly different.

### Clarifying Questions

- Is the limit per user, API key, IP address, tenant, or endpoint?
- Which algorithm should we consider: token bucket, sliding window, or fixed window?
- Is the limit local to one application instance or shared across all instances?
- Should excess requests be rejected immediately or queued?
- What happens if the rate-limiter service or Redis becomes unavailable?
- Are limits static, or can administrators configure them dynamically?

> **Example:** If the interviewer says *"Allow 100 requests per user per minute across 50 API servers,"* a simple in-memory counter on each server is insufficient. You need **shared or coordinated state**, perhaps through Redis, with atomic updates and a clear failure policy.
>
> That requirement changes the architecture from a single-process middleware solution into a **distributed rate-limiting design**.

---

## 4. How to Divide the 40 Minutes

| Time | Activity | Details |
|---|---|---|
| 0–5 min | Clarify requirements | Scope, scale, constraints, and success criteria |
| 5–10 min | Estimate capacity | Requests per second, storage, bandwidth, and read/write ratios |
| 10–20 min | Draw the high-level architecture | APIs, services, database, cache, and request flow |
| 20–30 min | Deep dive into the hardest component | Short-code generation, atomic counters, Redis coordination, sharding, or consistency |
| 30–36 min | Discuss production readiness | Availability, security, monitoring, failure handling, and recovery |
| 36–40 min | Summarize trade-offs | Explain assumptions, bottlenecks, alternatives, and what you would improve next |

> This is a **flexible plan**, not a rigid rule. If the interviewer wants implementation rather than system design, adjust the time toward code.

---

## 5. The Most Important Interview Principle

> **Do not assume the most complex requirements, and do not design a system more complicated than the problem demands.**

### Think in Three Levels

| Level | What You Design |
|---|---|
| **Level 1: Basic** | Core functionality, simple API, database |
| **Level 2: Scalable** | Cache, load balancing, stateless replicas, partitioning |
| **Level 3: Production-grade** | High availability, distributed coordination, security, observability, disaster recovery |

Start with **Level 1**, then evolve toward Level 2 or 3 according to the interviewer's requirements and available time.

> Also, distinguish between a **system-design interview** and a **coding interview**. A system-design interview usually evaluates architecture, trade-offs, and reasoning. A coding interview may expect a working implementation of a limited subset, with scalability discussed afterward.

### Strong Opening Line to Remember

> *"Before I start designing, I'd like to clarify the functional scope, expected traffic, and non-functional requirements. I'll establish the simplest design that meets those requirements, then discuss how to scale it and make it production-ready within the time available."*

That demonstrates **engineering judgment**, not hesitation.

---

## 6. Functional vs. Non-Functional Requirements

| | Functional Requirements | Non-Functional Requirements |
|---|---|---|
| **Definition** | **WHAT** the system does | **HOW WELL** the system works |
| **Includes** | Features and capabilities, business rules, user actions, APIs and expected behavior | Performance and latency, scalability, availability and reliability, security and durability |
| **Example** | Create a short URL and redirect users to the original URL | Handle 100,000 redirects per second with low latency |

---

## 7. Expanded Requirements Comparison Tables

### 7.1 Functional Requirements — WHAT the System Does

| Functional Requirement | URL Shortener | Distributed Rate Limiter |
|---|---|---|
| **Core functionality** | Convert a long URL into a short URL | Allow or reject incoming requests based on configured limits |
| **Create / configure** | Generate a unique short code | Configure limits per user, API key, IP, tenant, or endpoint |
| **Read / access** | Redirect short URL to the original URL | Check the current request against the applicable limit |
| **Click / request count** | Track total clicks per short URL | Track requests within a time window |
| **Timestamp** | Record when a short URL was accessed | Track request timestamps or window boundaries |
| **Referrer source** | Capture the referring website or source, when available | Optionally record the source, endpoint, or client for analytics |
| **User identity** | Associate URLs with users, if accounts are supported | Identify the user, API key, IP, or tenant being rate-limited |
| **Validation** | Reject invalid URLs and handle unknown or expired short codes | Validate limits, identifiers, and rate-limit policies |
| **Error handling** | Return 404 for unknown links; handle expired or disabled links | Return HTTP 429 when the limit is exceeded |
| **Update / delete** | Allow URL editing, deletion, or expiration if in scope | Allow policies and limits to be updated dynamically |
| **Reporting / analytics** | Show click counts, access times, referrers, and trends | Show allowed requests, rejected requests, and usage trends |
| **Data retention** | Retain URL mappings and analytics according to policy | Retain counters, policy configurations, and logs according to policy |

> **Interview note:** Click analytics and detailed referrer tracking are optional features for a basic URL shortener. Capture the scope before including them.

---

### 7.2 Non-Functional Requirements — HOW WELL the System Works

| Non-Functional Requirement | URL Shortener | Distributed Rate Limiter |
|---|---|---|
| **Scalability — vertical** | Increase CPU, RAM, or storage capacity of API servers and databases | Increase CPU and memory for rate-limiting instances or Redis nodes |
| **Scalability — horizontal** | Add stateless API instances, cache nodes, and database partitions or replicas | Add rate-limiting instances and scale or partition shared counter storage |
| **Latency** | p95 redirect latency below **100 ms** | p95 rate-limit decision below **5–10 ms** |
| **Availability** | Target **99.99%** availability for URL creation and redirects | Target **99.99%** availability for request decisions |
| **Durability** | Persist URL mappings so they survive process or machine failures; back up data | Persist policy configuration; counter durability depends on whether exact enforcement is required |
| **Consistency** | Newly created or updated URL mappings should become visible within the defined consistency target | Shared limits should be enforced consistently across instances; atomic updates prevent concurrent overruns |
| **Reliability / fault tolerance** | Recover from API, cache, database, or node failures without prolonged service disruption | Handle Redis or service failures according to an explicit fail-open or fail-closed policy |
| **Security** | Prevent malicious redirects, unauthorized link management, and abuse | Prevent bypassing limits through identity spoofing, key manipulation, or distributed requests |
| **Data retention** | Retain URL mappings, click events, and referrer analytics for defined periods | Retain policy data, counters, and operational logs for defined periods |
| **Observability** | Monitor redirects, errors, latency, cache hit ratio, and click analytics | Monitor allowed/rejected requests, decision latency, counter-store health, and limit violations |
| **Disaster recovery** | Define backup, restore, replication, and recovery objectives | Recover policy state and restore rate limiting without uncontrolled traffic bursts |
| **Cost efficiency** | Balance cache capacity, storage, analytics volume, and traffic costs | Balance per-request processing cost, Redis capacity, network calls, and precision of enforcement |

---

## 8. Understanding the Important Targets

### Latency: p95 below 100 ms

**p95** means that 95% of measured requests complete within 100 milliseconds, while the slowest 5% take longer. It does not mean every request must finish within 100 ms.

For a URL shortener, distinguish **redirect latency** from **analytics processing latency**. Click analytics can often be recorded asynchronously so they do not delay redirects.

---

### Availability: 99.99% — Four Nines

A 99.99% availability target permits approximately:
- **4.32 minutes** of downtime in a 30-day month
- **52.56 minutes** of downtime in a 365-day year

Achieving this requires redundancy, health checks, automated recovery, and removal of single points of failure. It is a **service-level objective**, not a guarantee simply because multiple servers are deployed.

---

### Durability vs. Consistency

| | Definition | URL Shortener Example | Rate Limiter Example |
|---|---|---|---|
| **Durability** | Once data is committed, it should not be lost after a failure | URL mappings must not be lost | Policy configuration must be persisted |
| **Consistency** | Reads observe data according to defined guarantees | Newly created URLs should be resolvable immediately | Shared counters must prevent concurrent overruns |

For a URL shortener, **durability** of URL mappings is critical, while click analytics can often be eventually consistent.

For a distributed rate limiter, **consistency** of shared counters matters when enforcing strict global limits.

---

## 9. Architectures

### URL Shortener Architecture

```
Client
  └─► Load Balancer / API Gateway
        └─► Stateless URL API Instances
              ├─► Redis Cache          (low-latency redirects)
              └─► Durable Database     (URL mappings)

Async flow:
Redirect Event → Event Queue → Analytics Consumers
                               (click count, timestamp, referrer, reporting)
```

> *Analytics events are processed asynchronously; the queue and consumers need their own durability and failure-handling strategy.*

---

### Distributed Rate Limiter Architecture

```
Client Requests
  └─► API Gateway / Load Balancer
        └─► Distributed Rate-Limiting Instances
              └─► Shared Counter Store (e.g. Redis)
                    (atomic operations, expiration, shared limits)
                    ├─► Allow ✓
                    └─► Reject ✗ (HTTP 429)
```

> *The counter store must support the chosen algorithm's atomicity requirements. Policy configuration can be stored separately.*

---

## 10. Interview Checklist

Before you start drawing either architecture, clarify these five things:

- [ ] **Functional scope** — Which features are mandatory, and which are optional?
- [ ] **Scale** — Expected users, requests per second, read/write ratio, and data growth
- [ ] **Performance** — Target latency, including p95 or p99 where relevant
- [ ] **Reliability** — Availability target, durability, consistency, and failure behavior
- [ ] **Constraints** — Security, retention, budget, and required technologies

> You do not need to solve every production concern in 40 minutes. Establish the requirements, build the **simplest design** that meets them, and then explain which architectural decisions are necessary to satisfy the scale and reliability targets.
