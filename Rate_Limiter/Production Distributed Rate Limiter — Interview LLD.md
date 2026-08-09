# Production Distributed Rate Limiter — Interview LLD
## 1. Problem Statement

**Design a distributed rate limiter that can:**
- Limit requests per user
- Support different user tiers
- Work across multiple application servers
- Support different algorithms
- Return 429 Too Many Requests
- Handle concurrent requests correctly
- Scale horizontally
- Remain consistent when multiple servers receive requests for the same user

**Example policy:**
```
FREE
  10 requests / minute

PREMIUM
  100 requests / minute

PREMIUM_PLUS
  1000 requests / minute
```

## 2. Production Architecture
```
                         ┌──────────────┐
                         │   Clients    │
                         └──────┬───────┘
                                │
                                │ HTTP Request
                                ▼
                     ┌─────────────────────┐
                     │    Load Balancer    │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        ┌───────────┐     ┌───────────┐     ┌───────────┐
        │ App       │     │ App       │     │ App       │
        │ Server 1  │     │ Server 2  │     │ Server 3  │
        └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ RateLimiterService   │
                    └──────────┬───────────┘
                               │
                               │ Atomic operation
                               ▼
                    ┌──────────────────────┐
                    │        Redis         │
                    │                      │
                    │ Counters / Tokens    │
                    │ TTL / Lua Script     │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                 ALLOW                   DENY
                    │                     │
                    ▼                     ▼
              Business API             HTTP 429
```

## Most important interview point

Do not keep the rate-limit counter in application memory.

**Wrong:**
```
Server 1 → counter = 8
Server 2 → counter = 2
Server 3 → counter = 5
```
The user can effectively exceed the limit.

**Correct:**
```
Server 1 ─┐
Server 2 ─┼──► Redis ──► shared rate-limit state
Server 3 ─┘
```

## 3. Request Flow

Suppose:
```
User ID = 101
Tier    = FREE
Limit   = 10 requests/minute
```
The request travels:
```
Client
  │
  │ Request
  ▼
Load Balancer
  │
  ▼
App Server 2
  │
  ▼
RateLimiterService
  │
  │ Get policy
  ▼
FREE → 10 req/min
  │
  ▼
Redis
  │
  │ Atomic check + update
  ▼
┌───────────────────────┐
│ Requests = 7          │
│ Limit    = 10         │
│                       │
│ 7 < 10 → ALLOW        │
└───────────┬───────────┘
            │
            ▼
       Business API
```
If:
```
Requests = 10
Limit    = 10
```
then:
```
10 >= 10
    │
    ▼
  DENY
    │
    ▼
HTTP 429
```

## 4. Where Should Rate Limiting Happen?

This is an important interview discussion.

There are two common choices.

Option A — API Gateway
```
Client
  │
  ▼
API Gateway
  │
  ├── Rate Limiter
  │
  ▼
Application Servers
````
Advantages:
- Rejects traffic early
- Protects backend servers
- Centralized
- Good for public APIs

Option B — Application
```
Client
  │
  ▼
Load Balancer
  │
  ▼
Application
  │
  └── RateLimiterService
```
Useful when:
- Rate limiting depends on business logic
Different APIs have different policies
User context is available only inside application

Best production answer

For a large system:
```
                    API Gateway
                        │
                 Global/API limit
                        │
                        ▼
                Application Layer
                        │
                User/business limit
                        │
                        ▼
                     Redis
```
You can have multiple layers of rate limiting.

## 5. Redis Data Model

For a fixed-window limiter, a simple Redis key can be:
```
rate_limit:{userId}:{window}
```
Example:
```
rate_limit:101:2026080918
```
Value:
```
7
```
TTL:
```
60 seconds
```
Conceptually:

Redis
```
┌─────────────────────────────┐
│ Key                         │
│ rate_limit:101:2026080918  │
├─────────────────────────────┤
│ Value = 7                   │
│ TTL   = 42 seconds          │
└─────────────────────────────┘
```

## 6. Why Redis?

Redis is a strong fit because it provides:
- Very low latency
- Atomic operations
- TTL
- High throughput
- Horizontal scaling
- Shared state across application servers

For a rate limiter, we generally don't need a relational database for every request.

You don't want:
```
Request
   ↓
Application
   ↓
MySQL
   ↓
SELECT counter
   ↓
UPDATE counter

for millions of requests.
```
Instead:
```
Request
   ↓
Application
   ↓
Redis
   ↓
Atomic operation
```

## 7. The Concurrency Problem

This is one of the most important interview questions.

Suppose the limit is:
```
10 requests
```
Current count:
```
9
```
Two requests arrive simultaneously.

Bad implementation
```
Request A → READ → 9
Request B → READ → 9

Request A → 9 < 10 → ALLOW
Request B → 9 < 10 → ALLOW

Request A → WRITE 10
Request B → WRITE 10
```
Two requests were allowed even though only one slot remained.

This is a race condition.

## 8. Atomic Redis Operation

We need:
```
CHECK + INCREMENT
```
to behave as one atomic operation.

Conceptually:
```
┌───────────────────────────┐
│ Redis Atomic Operation    │
│                           │
│  if count < limit         │
│      increment count      │
│      return ALLOW         │
│  else                     │
│      return DENY          │
└───────────────────────────┘
```
For complex logic, use a Redis Lua script so the entire operation executes atomically on Redis.

This is a very good interview point.

## 9. Fixed Window with Redis

Pseudo-code:
```
async allowRequest(
  userId: string,
  config: RateLimitConfig
): Promise<boolean> {

  const key = createWindowKey(userId);

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(
      key,
      config.windowSeconds
    );
  }

  return count <= config.maxRequests;
}
```
But in a production implementation, be careful about the INCR + EXPIRE race/failure window. A Lua script or an equivalent atomic Redis pattern is preferable.

## 10. Token Bucket — Better for Smooth Traffic

For many production APIs, Token Bucket is a strong choice.

Example:
```
Capacity = 100 tokens
Refill   = 10 tokens/sec
```
Initially:
```
Bucket
┌──────────────────┐
│ ● ● ● ● ● ● ● ●  │
│ ● ● ● ● ● ● ● ●  │
└──────────────────┘
       100 tokens
```
Each request:
```
Request
   │
   ▼
Remove 1 token
   │
   ├── Token available → ALLOW
   │
   └── No token → 429
```
Tokens continuously refill.

This avoids the sharp boundary problem of fixed windows.

## 11. Fixed Window vs Token Bucket

|                     | Fixed Window       | Token Bucket |
| ------------------- | ------------------ | ------------ |
| Implementation      | Simple             | More complex |
| Redis operations    | Low                | Moderate     |
| Burst handling      | Can be problematic | Excellent    |
| Smooth traffic      | ❌                  | ✅            |
| Memory              | Low                | Moderate     |
| Common API usage    | Good               | Very good    |
| Distributed support | Redis              | Redis        |


## 12. Production LLD
```
┌──────────────────────────────────────────┐
│          RateLimiterService              │
├──────────────────────────────────────────┤
│ - policyProvider                         │
│ - rateLimiterFactory                     │
├──────────────────────────────────────────┤
│ + allowRequest(context): Decision       │
└────────────────────┬─────────────────────┘
                     │
                     ▼
           ┌─────────────────────┐
           │ RateLimitPolicy     │
           ├─────────────────────┤
           │ tier                │
           │ limit               │
           │ window              │
           │ algorithm           │
           └──────────┬──────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ RateLimiter      │
            │ <<interface>>    │
            ├──────────────────┤
            │ allowRequest()   │
            └────────▲─────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
      Fixed       Token      Sliding
      Window      Bucket     Window
          │          │          │
          └──────────┼──────────┘
                     │
                     ▼
             ┌──────────────┐
             │ RedisStore   │
             ├──────────────┤
             │ get()        │
             │ increment()  │
             │ execute()    │
             └──────────────┘
```

## 13. Important Classes

RateLimitContext
```
interface RateLimitContext {
  userId: string;
  tier: UserTier;
  endpoint: string;
  ip?: string;
}
```
Why context?

Because production systems rarely rate-limit only by user.

You may need:
```
user
IP
API key
endpoint
tenant
organization
```

**RateLimitPolicy**
```
interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
  algorithm: RateLimiterType;
}
```
Example:
```
FREE
 ├── limit = 10
 ├── window = 60 sec
 └── algorithm = FIXED_WINDOW

PREMIUM
 ├── limit = 100
 ├── window = 60 sec
 └── algorithm = TOKEN_BUCKET
```

## 14. Rate Limit Decision

Instead of returning only boolean, production code can return:
```
interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
}
```
This makes the system more useful to API Gateway and clients.

Example:
```
{
  "allowed": false,
  "limit": 100,
  "remaining": 0,
  "retryAfterSeconds": 23
}
```
Then:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 23
```

## 15. Failure Handling

This is another area interviewers like.

**What happens if Redis is down?**

There are two possible policies.

**Fail Open**
```
Redis DOWN
   │
   ▼
Allow request
```
Advantages:
- Application remains available

Disadvantage:
- Rate limit can be bypassed

Good for:
- Non-critical APIs

**Fail Closed**
```
Redis DOWN
   │
   ▼
Reject request
```

Advantages:
- Protects backend

Disadvantages:
- Can cause outage

Good for:
- Expensive APIs
- Security-sensitive endpoints
- Login/password APIs
- Interview answer

"I would make this configurable per endpoint. For a normal read API, fail-open may be acceptable. For an expensive or security-sensitive endpoint, fail-closed is safer."

## 16. Redis High Availability

Redis itself becomes a critical dependency.

Production architecture:
```
                  RateLimiter
                       │
                       ▼
              ┌─────────────────┐
              │ Redis Cluster    │
              │                 │
              │ ┌─────┐ ┌─────┐ │
              │ │Master│ │Master│ │
              │ └──┬──┘ └──┬──┘ │
              │    │        │    │
              │ ┌──▼──┐  ┌──▼──┐ │
              │ │Replica│ │Replica│
              │ └──────┘  └──────┘
              └─────────────────┘
```
Use Redis Cluster/managed Redis when scale and availability require it.

## 17. What if Redis becomes slow?

Don't allow rate limiting itself to become the bottleneck.

Set:
```
Redis timeout
   ↓
5–20 ms
```
depending on your architecture and SLO.

Also consider:
- Connection pooling
- Redis Cluster
- Monitoring
- Timeouts
- Circuit breaker
- Fail-open/fail-closed policy

## 18. Multi-Level Rate Limiting

A sophisticated production system might have:
```
                 Request
                    │
                    ▼
          ┌──────────────────┐
          │ Global Limiter   │
          │ 1M req/sec       │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ API Limiter      │
          │ 100K req/sec     │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ User Limiter     │
          │ 100 req/min      │
          └────────┬─────────┘
                   │
                   ▼
             Business API
```
This protects the entire system at multiple levels.

## 19. The Complete Interview Diagram

This is the diagram I would actually draw on a whiteboard:
```
                              CLIENT
                                │
                                │
                                ▼
                       ┌────────────────┐
                       │ Load Balancer  │
                       └───────┬────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
             ┌───────┐     ┌───────┐     ┌───────┐
             │ App 1 │     │ App 2 │     │ App 3 │
             └───┬───┘     └───┬───┘     └───┬───┘
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ RateLimiterService │
                    └──────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │ Policy Provider   │
                     │                   │
                     │ FREE → 10/min     │
                     │ PREMIUM → 100/min │
                     └─────────┬─────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ RateLimiter        │
                    │ Strategy           │
                    └──────────┬─────────┘
                               │
                 ┌─────────────┼──────────────┐
                 ▼             ▼              ▼
             Fixed Window  Token Bucket  Sliding Window
                 │             │              │
                 └─────────────┼──────────────┘
                               │
                               ▼
                      ┌────────────────┐
                      │     Redis      │
                      │                │
                      │ Atomic Lua     │
                      │ TTL            │
                      │ Counters       │
                      │ Token State    │
                      └───────┬────────┘
                              │
                     ┌────────┴────────┐
                     │                 │
                   ALLOW              DENY
                     │                 │
                     ▼                 ▼
               Business API        HTTP 429
```

## 20. The 5 Things to Say in an Interview

If you have limited time, remember these five points:

**① Why Redis?**
> "Because the rate-limit state must be shared across all application instances, and Redis provides low-latency atomic operations and TTL."

**② Why Strategy Pattern?**
> "Different algorithms such as Fixed Window and Token Bucket can be swapped without changing the RateLimiterService."

**③ How do you prevent race conditions?**
> "The check-and-update operation must be atomic. For complex algorithms, I would use a Redis Lua script."

**④ What happens if Redis fails?**
> "The behavior should be configurable. We can fail-open for availability-sensitive APIs and fail-closed for security or expensive operations."

**⑤ Why not application memory?**
> "Because with multiple application servers each instance would have a different counter, allowing users to exceed their global limit."

## Final Mental Model

Think of the entire design as:
```
             ┌──────────────┐
             │   CLIENT     │
             └──────┬───────┘
                    ▼
             ┌──────────────┐
             │ Load Balancer│
             └──────┬───────┘
                    ▼
       ┌──────────────────────────┐
       │ Multiple App Servers     │
       └────────────┬─────────────┘
                    ▼
             ┌──────────────┐
             │ RateLimiter  │
             │   Service    │
             └──────┬───────┘
                    ▼
             ┌──────────────┐
             │   Strategy   │
             │              │
             │ Fixed Window │
             │ Token Bucket │
             │ Sliding      │
             └──────┬───────┘
                    ▼
             ┌──────────────┐
             │    Redis     │
             │              │
             │ Shared State │
             │ Atomic Ops   │
             │ TTL          │
             └──────┬───────┘
                    │
             ┌──────┴──────┐
             ▼             ▼
           ALLOW          DENY
             │             │
             ▼             ▼
          API Server      429
```
**One-line interview answer:**
```
"I would build a distributed rate limiter using the Strategy pattern for algorithms, a Factory for creating them,
Redis as the shared state store, and atomic Redis/Lua operations to guarantee correctness across multiple application servers."
```



