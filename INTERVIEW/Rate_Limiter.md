# 🔥 Architect-Level Rate Limiter Interview Questions

## Why do we need rate limiting in a distributed system?

## Where would you place a rate limiter?
CDN?
Load Balancer?
API Gateway?
Application service?
Database?

## Would you use one global rate limiter or a rate limiter per service? Why?
## How would you design a rate limiter supporting 10M requests/sec?
## How would you rate-limit users across 1,000 application servers?
## What happens if every application server maintains its own counter?
## Why is an in-memory rate limiter insufficient in a distributed environment?

## Compare all rate limiting algorithms ? Which one would you choose for a public API and why?
| Algorithm       |            Burst |    Accuracy | Memory | Complexity |
| --------------- | ---------------: | ----------: | -----: | ---------: |
| Fixed Window    | ❌ Boundary burst |         Low |    Low |        Low |
| Sliding Window  |                ✅ |        High |   High |       High |
| Sliding Counter |                ✅ | Medium/High | Medium |     Medium |
| Token Bucket    |     ✅ Controlled |        High |    Low |     Medium |
| Leaky Bucket    |        ❌/Limited |        High |    Low |     Medium |

For a public API, the industry standard choice is the Token Bucket algorithm. Major public API platforms like Amazon Web Services (AWS) and Stripe heavily rely on it.

## Explain Token Bucket mathematically.

Suppose:
```
capacity = 500
refillRate = 100 tokens/sec
```

**Ask:**
> **How many requests can arrive immediately?**

**500 requests.**

**Then:**
> **What is the maximum sustained rate?**

**100 requests/sec.**

Then:
> **How long does an empty bucket take to refill?**

**500 / 100 = 5 seconds**

## What happens if 10,000 requests arrive simultaneously?

Architect should explain:
```
                 10,000 requests
                       │
                       ▼
                 Rate Limiter
                       │
              ┌────────┴────────┐
              ▼                 ▼
        500 accepted       9,500 rejected
              │
              ▼
         Application
```
And explain whether rejected requests receive:
```
429 Too Many Requests
```
or are queued/throttled.

## Distributed Rate Limiting ⭐
### You have 100 API servers. Where is the counter stored?

Possible answers:
```
API Server
    │
    ▼
Redis Cluster
    │
    ▼
Atomic counter/token operation
```

Then interviewer asks:
> **Why Redis?**

Expected discussion:
- low latency
- atomic operations
- TTL
- distributed access
- high throughput
- replication
- clustering

### Why can't you simply do this?
```
GET counter
counter++
SET counter
```
Because two requests can race:
```
Request A ── GET 10
Request B ── GET 10


Request A ── SET 11
Request B ── SET 11
```
Expected result:
```
12
```
Actual result:
```
11
```
Therefore:
> **How would you make the operation atomic?**

Possible solution:
```
Redis Lua Script
      OR
Redis atomic commands
      OR
Distributed atomic primitive
```

## What happens when Redis becomes the bottleneck?

Discuss:
```
                 API Gateway
                     │
             ┌───────┴───────┐
             ▼               ▼
        Rate Limiter     Rate Limiter
             │               │
             └───────┬───────┘
                     ▼
                Redis Cluster
              ┌────┬────┬────┐
              │    │    │    │
            Shard Shard Shard Shard
```
Then discuss:
- Redis Cluster
- key distribution
- hash slots
- hot keys
- replication
- failover
- pipelining
- Lua scripts
- connection pooling


