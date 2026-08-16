# Architect-Level Rate Limiter Interview Questions & Answers

## Overview

This guide is designed for **Senior Architect / Principal Engineer / Staff Engineer** interviews.

The focus is not only on rate-limiting algorithms, but also on:

- Distributed systems
- Scalability
- Redis architecture
- Multi-region design
- Failure handling
- Consistency vs availability
- Hot-key mitigation
- Fairness
- Observability
- Security
- Capacity planning
- Architectural trade-offs

---

# 1. Why do we need rate limiting in a distributed system?

Rate limiting controls how frequently a client can access an API or resource.

It protects systems from:

- Traffic spikes
- Accidental client loops
- Malicious abuse
- DDoS-like application-layer traffic
- Resource exhaustion
- Noisy tenants
- Expensive API overuse

Example:

```text
Client
  |
  | 10,000 req/sec
  v
+----------------+
| Rate Limiter   |
+----------------+
  |
  | 100 req/sec
  v
+----------------+
| Application    |
+----------------+
```

An architect should also explain that rate limiting protects downstream resources such as databases, queues, third-party APIs, and expensive AI inference services.

---

# 2. Where should a rate limiter be placed?

Possible locations include:

- CDN
- WAF
- Load Balancer
- API Gateway
- Application service
- Database/resource layer

A common production architecture is:

```text
Internet
   |
   v
CDN / WAF
   |
   v
API Gateway
   |
   +---- Rate Limiter
   |
   v
Application Services
   |
   v
Database / Cache / Queue
```

### Architect-level answer

The best location depends on the protection required.

A gateway-level limiter provides centralized protection across APIs, while service-level limiting can enforce business-specific limits.

For critical systems, hierarchical rate limiting is often better:

```text
Global
  |
Region
  |
Tenant
  |
User
  |
Endpoint
```

---

# 3. Should you use one global rate limiter or a rate limiter per service?

Neither is universally correct.

### Global limiter

```text
                 API Gateway
                      |
               Global Limiter
                      |
          +-----------+-----------+
          |           |           |
       Service A   Service B   Service C
```

Advantages:

- Centralized policy
- Consistent limits
- Easy tenant-wide enforcement

Disadvantages:

- Potential bottleneck
- Additional network dependency
- Global failure can affect the entire platform

### Service-level limiter

```text
Service A -> Limiter A
Service B -> Limiter B
Service C -> Limiter C
```

Advantages:

- Better isolation
- Service-specific policies
- Failure isolation

Disadvantages:

- Harder global enforcement
- Duplicated infrastructure

### Best architect answer

Use **hierarchical rate limiting** when the system is large:

```text
Global / Tenant quota
        |
        v
Regional quota
        |
        v
Service quota
        |
        v
User / Endpoint quota
```

---

# 4. How would you design a rate limiter supporting 10M requests/sec?

A scalable architecture could look like:

```text
                       Internet
                           |
                           v
                       CDN / WAF
                           |
                           v
                     API Gateway
                           |
             +-------------+-------------+
             |                           |
             v                           v
       Local Limiter              Global Quota
             |                           |
             |                    Redis Cluster
             |                           |
             +-------------+-------------+
                           |
                           v
                    Application Servers
                           |
                    +------+------+
                    |             |
                    v             v
                   DB           Kafka
```

Key design decisions:

- Token Bucket for burst handling
- Local limiting for very high throughput
- Redis Cluster for shared/global state
- Atomic Redis operations
- Sharding
- Hot-key mitigation
- Multi-region quota allocation
- Fail-open/fail-closed strategy
- Metrics and alerting

At 10M requests/sec, sending every request to one centralized Redis cluster may become a bottleneck. A hierarchical approach is usually more scalable.

---

# 5. Compare Fixed Window, Sliding Window, Sliding Window Counter, Token Bucket and Leaky Bucket

| Algorithm | Burst Handling | Accuracy | Memory | Complexity |
|---|---:|---:|---:|---:|
| Fixed Window | Poor at boundaries | Low | Low | Low |
| Sliding Window | Good | High | High | High |
| Sliding Window Counter | Good | Medium/High | Medium | Medium |
| Token Bucket | Excellent | High | Low | Medium |
| Leaky Bucket | Limited | High | Low | Medium |

### Fixed Window

```text
10:00 ---------------- 11:00
       5,000 requests
```

Simple, but has a boundary burst problem.

### Sliding Window

Considers requests inside a continuously moving window.

```text
<------ last 60 seconds ------> NOW
|  | || | ||| | | || | |
```

More accurate but requires more state.

### Token Bucket

Controls both burst capacity and sustained rate.

```text
Capacity = 500
Refill = 100 tokens/sec
```

Allows a burst of up to 500 requests and then sustains approximately 100 requests/sec.

### Leaky Bucket

Processes traffic at a controlled output rate.

```text
Requests
   |
   v
+--------+
| Queue  |
+--------+
   |
   | fixed rate
   v
Service
```

Useful when smoothing traffic is more important than allowing bursts.

---

# 6. Which rate-limiting algorithm would you choose for a public API?

A strong default choice is **Token Bucket** when the API should support controlled bursts.

Example:

```text
capacity = 500
refillRate = 100/sec
```

This provides:

- Burst capacity
- Sustained rate control
- Low state requirements
- Simple implementation

However, the final choice depends on business requirements.

For a simple quota:

```text
1000 requests/hour
```

Fixed Window may be sufficient.

For strict recent-history enforcement, Sliding Window may be better.

---

# 7. Explain Token Bucket mathematically

Suppose:

```text
capacity = 500
refillRate = 100 tokens/sec
```

Each request consumes one token.

### Maximum immediate burst

```text
500 requests
```

### Sustained rate

```text
100 requests/sec
```

### Full refill after an empty bucket

```text
500 / 100 = 5 seconds
```

Conceptually:

```text
                  Refill
                    |
                    v
              +-----------+
              | 500 tokens |
              +-----------+
                    |
                    v
                 Request
                    |
                 -1 token
```

If there are no tokens, the request is rejected or queued depending on system design.

---

# 8. What happens if 10,000 requests arrive simultaneously?

With:

```text
capacity = 500
```

the limiter can immediately allow approximately:

```text
500 requests
```

and reject, delay, or queue the rest depending on policy.

```text
10,000 requests
       |
       v
+----------------+
| Rate Limiter   |
+----------------+
       |
       +---- 500 ---> Application
       |
       +---- 9,500 --> Reject / Queue
```

For synchronous APIs, returning:

```http
429 Too Many Requests
```

is common.

For asynchronous workloads, excess traffic may be placed onto Kafka, SQS, RabbitMQ, or another queue.

---

# 9. You have 100 API servers. Where should the counter be stored?

If each server keeps its own counter:

```text
Server A -> 100 requests
Server B -> 100 requests
Server C -> 100 requests
```

the global limit is no longer accurate.

A shared store can be used:

```text
Server A --\
Server B ----> Redis Cluster
Server C --/
```

Redis is commonly used because it provides:

- Low latency
- Atomic operations
- TTL support
- High throughput
- Distributed access
- Clustering

For extremely high-scale systems, local and global limits can be combined.

---

# 10. Why is a simple GET + increment + SET unsafe?

Consider:

```text
GET counter
counter++
SET counter
```

Two requests can race:

```text
Request A -> GET 10
Request B -> GET 10

Request A -> SET 11
Request B -> SET 11
```

Expected:

```text
12
```

Actual:

```text
11
```

This is a lost update.

### Solutions

Use:

- Redis atomic commands
- Lua scripts
- Server-side atomic operations
- Distributed atomic primitives

For a Token Bucket, a Lua script can calculate refill, consume a token, update the state, and set expiry atomically.

---

# 11. Why use Redis for rate limiting?

Redis is a strong candidate because rate limiting typically requires:

- Very low latency
- High request throughput
- Atomic updates
- TTL/expiry
- Shared state

Example key:

```text
rate_limit:{tenant}:{user}:{endpoint}
```

Possible state:

```text
{
  tokens: 347,
  lastRefillTime: 1720000000
}
```

The implementation should avoid multiple network round trips for one decision.

---

# 12. What happens if Redis becomes the bottleneck?

Use:

- Redis Cluster
- Sharding
- Local rate limiting
- Hierarchical quotas
- Batching where appropriate
- Pipelining
- Efficient Lua scripts
- Connection pooling
- Hot-key mitigation

A scalable design:

```text
                 API Gateway
                      |
             +--------+--------+
             |                 |
             v                 v
       Local Limiter      Global Limiter
                               |
                     +---------+---------+
                     |         |         |
                  Shard A   Shard B   Shard C
```

The most important architectural principle is:

> Do not make every request depend on one centralized global counter if the system operates at extremely high scale.

---

# 13. What is the Redis hot-key problem?

Suppose one tenant generates 1M requests/sec:

```text
rate_limit:tenant:123
```

Every request targets the same Redis key.

Even with Redis Cluster, that key maps to one shard.

```text
                 1M requests/sec
                       |
                       v
                tenant:123
                       |
                       v
                  Redis Shard 1
                       |
                  BOTTLENECK
```

This is a hot-key problem.

---

# 14. How do you solve a hot-key problem?

Possible approaches:

### 1. Local limiting

Reject obvious excess traffic locally before reaching Redis.

### 2. Hierarchical limiting

```text
Global quota
     |
Regional quota
     |
Local quota
```

### 3. Quota leasing

Allocate a portion of the global quota to each region/server.

Example:

```text
Global = 10,000 req/sec

Region A = 2,000
Region B = 3,000
Region C = 5,000
```

Each region can enforce its local allocation.

### 4. Key partitioning

Split state across multiple keys.

However, this reduces exactness and introduces coordination complexity.

### Important trade-off

Hot-key mitigation often means trading:

```text
Global exactness
       vs
Scalability
```

---

# 15. What's the difference between local and global rate limiting?

### Local

```text
Client
  |
  v
Server A
  |
Local Counter
```

Advantages:

- Very low latency
- No network dependency
- Excellent throughput

Disadvantage:

- Global limit may be inaccurate

### Global

```text
Server A --\
Server B ----> Shared Limiter
Server C --/
```

Advantages:

- Consistent global policy

Disadvantages:

- Network latency
- Shared dependency
- Potential bottleneck

### Architect answer

Use both when necessary:

```text
Request
  |
  v
Local limiter
  |
  v
Global quota
  |
  v
Application
```

---

# 16. How would you enforce a global limit across multiple regions?

Suppose:

```text
US-East
US-West
Europe
Asia
```

and:

```text
Global limit = 100 req/min
```

Naively giving each region 100 requests allows:

```text
100 x 4 = 400 requests
```

instead of 100.

### Options

#### Central global limiter

Accurate but adds cross-region latency.

#### Regional quota allocation

```text
Global = 100

US-East = 25
US-West = 25
Europe  = 25
Asia    = 25
```

Better latency but less flexible.

#### Dynamic quota leasing

Regions receive quota dynamically based on demand.

This can provide a better balance between utilization and global accuracy.

---

# 17. What happens when Redis is unavailable?

There are two classic strategies.

## Fail Open

```text
Redis DOWN
    |
    v
Allow request
```

Advantages:

- High application availability

Disadvantages:

- Backend may become overloaded
- Abuse protection is weakened

## Fail Closed

```text
Redis DOWN
    |
    v
Reject request
```

Advantages:

- Protects downstream systems

Disadvantages:

- Legitimate requests can fail

### Architect answer

The correct choice depends on business criticality.

For an expensive AI inference API or payment-related endpoint, protecting backend capacity may justify fail-closed or aggressive local fallback.

For a low-risk read endpoint, fail-open with local emergency protection may be preferable.

---

# 18. Should rate limiting be based on IP?

IP-based limiting alone is insufficient.

Problems:

```text
             NAT
              |
       +------+------+------+
       |      |      |      |
     User A User B User C User D
```

Thousands of legitimate users may share one public IP.

Use multiple dimensions:

```text
IP
+
User ID
+
API Key
+
Tenant ID
+
Endpoint
+
Region
```

Example:

```text
tenant:A      -> 10,000 req/min
user:123      -> 1,000 req/min
IP:x.x.x.x    -> 500 req/min
POST /payment -> 100 req/min
```

---

# 19. How do you prevent one tenant from consuming all capacity?

Use tenant-specific quotas.

```text
Global Capacity
      |
      +---- Tenant A -> 40%
      |
      +---- Tenant B -> 30%
      |
      +---- Tenant C -> 20%
      |
      +---- Others   -> 10%
```

Possible mechanisms:

- Weighted quotas
- Reserved capacity
- Tenant-specific token buckets
- Priority queues
- Weighted fair queuing

This prevents a noisy tenant from starving other customers.

---

# 20. What is hierarchical rate limiting?

Hierarchical rate limiting applies multiple limits at different levels.

```text
                 Global
               1M req/sec
                    |
             +------+------+
             |             |
          Region         Region
           300K           700K
             |
           Tenant
             |
            User
             |
          Endpoint
```

Example:

```text
Global:       1,000,000/sec
Region:         300,000/sec
Tenant:          10,000/sec
User:             1,000/sec
Endpoint:           100/sec
```

Advantages:

- Protects multiple layers
- Reduces centralized bottlenecks
- Provides fairness
- Allows business-specific policies
- Improves scalability

---

# 21. What is the difference between rate limiting and throttling?

### Rate limiting

Controls how many requests are allowed.

```text
100 req/sec
```

Requests above the limit may receive:

```http
429 Too Many Requests
```

### Throttling

Controls the rate at which requests are processed.

```text
Incoming requests
       |
       v
     Queue
       |
       v
Workers process at controlled rate
```

Throttling is especially useful for asynchronous workloads.

---

# 22. When should you reject requests versus queue them?

### Reject

Use when:

- API is synchronous
- Client can retry
- Request has low value after delay
- System must protect itself immediately

```http
429 Too Many Requests
```

### Queue

Use when:

- Work can be asynchronous
- Processing can happen later
- Losing the request is undesirable

```text
Client
  |
  v
Rate Limiter
  |
  v
Kafka / SQS / RabbitMQ
  |
  v
Worker
```

A queue can absorb bursts, while the rate limiter protects the downstream system.

---

# 23. What should a rate limiter return?

A common response is:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 5
```

Modern APIs may also expose rate-limit metadata:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1720000000
```

For a token bucket, retry time can approximately be calculated as:

```text
tokensNeeded / refillRate
```

Example:

```text
tokensNeeded = 2
refillRate = 10/sec

retry ≈ 0.2 seconds
```

---

# 24. Why can wall-clock time be dangerous?

Distributed servers can have clock differences.

```text
Server A -> 10:00:00
Server B -> 09:59:58
```

This can produce inconsistent window calculations.

Potential mitigations:

- NTP synchronization
- Server-side timestamps
- Redis server time
- Monotonic clocks where appropriate
- Avoid trusting client timestamps

This is particularly important for fixed and sliding windows.

---

# 25. How can attackers bypass rate limiting?

Common techniques include:

- Rotating IP addresses
- Rotating API keys
- Creating many accounts
- Using botnets
- Attacking different regions
- Exploiting unauthenticated endpoints
- Manipulating request headers
- Distributing traffic across identities

A production defense may combine:

```text
WAF
 |
Bot Detection
 |
IP Reputation
 |
API Key Limits
 |
User Limits
 |
Tenant Limits
 |
Endpoint Limits
 |
Global Quota
```

Rate limiting should be part of a broader abuse-prevention architecture.

---

# 26. What metrics should you monitor?

Important metrics include:

### Traffic

- Requests/sec
- Requests by endpoint
- Requests by tenant
- Requests by region

### Rate limiter

- Allowed requests
- Rejected requests
- 429 rate
- Bucket utilization
- Remaining tokens
- Rate-limit decision latency

### Redis

- P50/P95/P99 latency
- Errors
- Connection count
- CPU
- Memory
- Replication lag
- Hot keys

### Business

- Top consumers
- Noisy tenants
- Quota utilization
- Abuse patterns

Example dashboard:

```text
Rate Limiter Dashboard

Allowed Requests     98.2%
Rejected Requests     1.8%

Decision P99          1.2 ms
Redis P99             4.0 ms

Hot Keys                 17
429 Spike                 3
```

---

# 27. What is the CAP-style trade-off in distributed rate limiting?

A global rate limiter often has to balance:

```text
Accuracy
   vs
Availability
   vs
Latency
```

A strongly coordinated global limiter gives better accuracy but may require cross-node or cross-region communication.

A local limiter provides:

- Lower latency
- Better availability
- Better scalability

but can be less accurate globally.

Architects should explicitly state the acceptable error boundary.

For example:

> We can tolerate a few percent quota overshoot in exchange for lower latency and higher availability.

That is a stronger architectural answer than simply saying “use Redis.”

---

# 28. How would you design a globally distributed rate limiter for 10M requests/sec?

A production-oriented design:

```text
                         Internet
                            |
                            v
                       CDN / WAF
                            |
                            v
                      API Gateway
                            |
             +--------------+--------------+
             |                             |
             v                             v
      Local Rate Limiter             Global Quota
             |                             |
             |                      Regional Redis
             |                             |
             +--------------+--------------+
                            |
                            v
                    Application Services
                            |
                +-----------+-----------+
                |                       |
                v                       v
              Cache                   Kafka
                |                       |
                v                       v
             Database                Workers
```

### Request flow

```text
1. Request arrives
2. WAF checks abuse/security rules
3. Gateway identifies tenant/user/IP
4. Local limiter performs cheap protection
5. Global quota is checked when required
6. Atomic token/counter operation executes
7. Request is allowed or rejected
8. Application processes allowed request
9. Metrics/events are emitted asynchronously
```

---

# 29. What algorithm would you choose for this 10M req/sec architecture?

A strong choice is:

```text
Local Token Bucket
+
Regional / Global Quota
+
Redis Atomic Operations
```

Why?

Token Bucket provides:

- Burst support
- Sustained rate control
- Small state
- Efficient decisions

Local limiting reduces:

- Redis traffic
- Network latency
- Global coordination

Global quota provides:

- Tenant-level control
- Cross-region governance
- Business quota enforcement

---

# 30. Architect-Level Trade-off Matrix

| Decision | Option A | Option B | Trade-off |
|---|---|---|---|
| Algorithm | Fixed Window | Token Bucket | Simplicity vs burst control |
| State | Local memory | Redis | Latency vs global consistency |
| Scope | Local | Global | Availability vs accuracy |
| Failure | Fail Open | Fail Closed | Availability vs protection |
| Region | Central | Regional | Accuracy vs latency |
| Hot keys | Exact | Partitioned | Correctness vs scalability |
| Burst | Reject | Queue | Simplicity vs resilience |
| Quota | Static | Dynamic | Predictability vs utilization |
| Storage | Single Redis | Redis Cluster | Simplicity vs scale |
| Enforcement | One layer | Hierarchical | Simplicity vs scalability |

---

# 31. Top 10 Questions to Prioritize for Interviews

## 1. Design a distributed rate limiter for 10M requests/sec.

Be ready to discuss:

- Architecture
- Token Bucket
- Redis
- Local limiting
- Global quotas
- Sharding
- Multi-region
- Failure handling

## 2. Why Token Bucket over Sliding Window?

Explain:

- Burst handling
- Sustained rate
- Memory requirements
- Latency
- Accuracy

## 3. How do you make Redis rate-limit operations atomic?

Discuss:

- Atomic Redis commands
- Lua scripts
- Server-side execution
- Race conditions

## 4. How do you solve Redis hot keys?

Discuss:

- Local limits
- Hierarchical quotas
- Quota leasing
- Partitioning
- Accuracy trade-offs

## 5. How do you implement global rate limits across multiple regions?

Discuss:

- Centralized global state
- Regional quotas
- Dynamic quota leasing
- Cross-region latency
- Eventual consistency

## 6. What happens when Redis is unavailable?

Discuss:

- Fail-open
- Fail-closed
- Local fallback
- Endpoint criticality
- Circuit breakers

## 7. How do you prevent one tenant from consuming all capacity?

Discuss:

- Tenant quotas
- Weighted allocation
- Reserved capacity
- Fair queuing

## 8. How would you support burst traffic?

Discuss:

- Token Bucket
- Queueing
- Capacity planning
- Backpressure

## 9. How would you monitor the rate limiter?

Discuss:

- 429 rate
- Decision latency
- Redis latency
- Bucket utilization
- Hot keys
- Tenant usage

## 10. What accuracy are you willing to sacrifice for scalability and availability?

This is one of the most important architect-level questions.

A strong answer should state:

> Rate limiting is not only an algorithm problem. It is a distributed-systems trade-off between correctness, latency, availability, scalability, fairness, and operational complexity.

---

# 32. Final Interview Cheat Sheet

```text
                    RATE LIMITER
                         |
          +--------------+--------------+
          |              |              |
       Algorithm       State          Scope
          |              |              |
   Token Bucket        Redis        Local/Global
   Sliding Window      Memory        Regional
   Fixed Window        Cluster       Hierarchical
          |              |              |
          +--------------+--------------+
                         |
                         v
                  Atomic Decision
                         |
               +---------+---------+
               |                   |
             Allow                Reject
               |                   |
               v                   v
          Application          HTTP 429
                                   |
                              Retry-After
```

## Architect Mindset

Do not answer:

> "Use Redis + Token Bucket."

Instead answer:

> "I would use a hierarchical Token Bucket architecture. Local limiters handle high-volume traffic with minimal latency, while regional/global quotas enforce tenant-level limits. Redis Cluster provides shared state where strong coordination is required. Redis operations are atomic using server-side scripts. For hot keys, I would use local enforcement and quota leasing rather than blindly sharding a single global counter. During Redis failures, the fallback behavior would depend on endpoint criticality. Finally, I would monitor 429 rates, decision latency, Redis health, bucket utilization, and tenant-level consumption."

That style demonstrates **architecture thinking rather than technology memorization**.
