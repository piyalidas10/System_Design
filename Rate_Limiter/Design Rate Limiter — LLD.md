# Design Rate Limiter — LLD
A good Low-Level Design (LLD) for a rate limiter should demonstrate three things:
1. Which users are being limited? → User + Tier
2. Which algorithm is used? → Fixed Window / Token Bucket / Sliding Window
3. How can we add new algorithms without changing existing code? → Strategy + Factory

## 1. Requirements

Let's design a system with:
- FREE users → 10 requests/minute
- PREMIUM users → 100 requests/minute
- Different rate-limiting algorithms can be configured per tier.
- Return true when a request is allowed.
- Return false when the user exceeds the limit.
- Easy to add PREMIUM_PLUS, LEAKY_BUCKET, etc.
- Thread-safe implementation.
- In a distributed deployment, shared state can be stored in Redis.

## 2. High-Level LLD
```
                         ┌──────────────┐
                         │    Client    │
                         └──────┬───────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   RateLimiterService    │
                  │                         │
                  │  allowRequest(userId)   │
                  └────────────┬────────────┘
                               │
                         Get User/Tier
                               │
                               ▼
                       ┌───────────────┐
                       │     User      │
                       ├───────────────┤
                       │ userId        │
                       │ tier          │
                       └───────┬───────┘
                               │
                       ┌───────▼────────┐
                       │ Map<Tier,      │
                       │     Limiter>   │
                       └───────┬────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌──────────────────┐          ┌──────────────────┐
       │ Free RateLimiter │          │ Premium Limiter  │
       │                  │          │                  │
       │ Fixed Window     │          │ Token Bucket     │
       └────────┬─────────┘          └────────┬─────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  RateLimiter       │
                    │  <<interface>>     │
                    ├─────────────────────┤
                    │ + allowRequest()   │
                    └──────────▲──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             │                 │                  │
             ▼                 ▼                  ▼
      FixedWindow       TokenBucket       SlidingWindow
```

## 3. Core Classes
**User**
```
enum UserTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  PREMIUM_PLUS = 'PREMIUM_PLUS'
}

class User {
  constructor(
    public readonly userId: string,
    public readonly tier: UserTier
  ) {}
}
```
The tier determines which rate limiter configuration is applied.

## 4. Rate Limit Configuration
```
class RateLimitConfig {
  constructor(
    public readonly maxRequests: number,
    public readonly windowSeconds: number
  ) {}
}
```
Example:
```
FREE
maxRequests = 10
window = 60 seconds

PREMIUM
maxRequests = 100
window = 60 seconds
```

## 5. RateLimiter Interface

This is the most important abstraction.
```
interface RateLimiter {
  allowRequest(userId: string): boolean;
}
```
Every algorithm implements the same contract.
```
                  RateLimiter
                      ▲
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        │             │             │
 FixedWindow     TokenBucket   SlidingWindow
```
This is the Strategy Pattern.

The service doesn't need to know whether the implementation uses a fixed window or token bucket.

## 6. Fixed Window Rate Limiter

For example:
```
10 requests / 60 seconds
```
We maintain:
```
userId → request count + window start
```
```
interface WindowState {
  count: number;
  windowStart: number;
}

class FixedWindowRateLimiter implements RateLimiter {

  private readonly state =
    new Map<string, WindowState>();

  constructor(
    private readonly config: RateLimitConfig
  ) {}

  allowRequest(userId: string): boolean {

    const now = Date.now();

    let userState = this.state.get(userId);

    if (!userState) {
      userState = {
        count: 1,
        windowStart: now
      };

      this.state.set(userId, userState);

      return true;
    }

    const elapsed =
      (now - userState.windowStart) / 1000;

    if (elapsed >= this.config.windowSeconds) {

      userState.count = 1;
      userState.windowStart = now;

      return true;
    }

    if (userState.count >= this.config.maxRequests) {
      return false;
    }

    userState.count++;

    return true;
  }
}
```

## 7. Token Bucket Rate Limiter

Token Bucket works differently.

Imagine:
```
Bucket capacity = 10 tokens

Every request
     │
     ▼
Take 1 token
     │
     ├── Token available → ALLOW
     │
     └── No token        → 429

Tokens are continuously replenished.
```
Conceptually:
```
                  Token Bucket
             ┌───────────────────┐
             │ ● ● ● ● ● ●       │
             │ ● ● ● ●           │
             └─────────┬─────────┘
                       │
                  Request
                       │
                       ▼
                   Remove 1
                     token
```
The implementation also satisfies:
```
interface RateLimiter {
  allowRequest(userId: string): boolean;
}
```
Therefore the RateLimiterService doesn't care about the algorithm.

## 8. RateLimiterFactory

Now suppose we have:
```
FIXED_WINDOW
TOKEN_BUCKET
SLIDING_WINDOW
LEAKY_BUCKET
```
We don't want object creation scattered throughout the application.

Create a factory.
```
enum RateLimiterType {
  FIXED_WINDOW = 'FIXED_WINDOW',
  TOKEN_BUCKET = 'TOKEN_BUCKET',
  SLIDING_WINDOW = 'SLIDING_WINDOW'
}
class RateLimiterFactory {

  create(
    type: RateLimiterType,
    config: RateLimitConfig
  ): RateLimiter {

    switch (type) {

      case RateLimiterType.FIXED_WINDOW:
        return new FixedWindowRateLimiter(config);

      case RateLimiterType.TOKEN_BUCKET:
        return new TokenBucketRateLimiter(config);

      case RateLimiterType.SLIDING_WINDOW:
        return new SlidingWindowRateLimiter(config);

      default:
        throw new Error(
          `Unsupported rate limiter: ${type}`
        );
    }
  }
}
```
This is the Factory Pattern.

## 9. RateLimiterService

This is the main orchestrator.
```
class RateLimiterService {

  constructor(
    private readonly userRepository: UserRepository,
    private readonly rateLimiters:
      Map<UserTier, RateLimiter>
  ) {}

  allowRequest(userId: string): boolean {

    const user =
      this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const limiter =
      this.rateLimiters.get(user.tier);

    if (!limiter) {
      throw new Error(
        `No rate limiter configured for ${user.tier}`
      );
    }

    return limiter.allowRequest(userId);
  }
}
```
Notice the service doesn't contain:
```
if FREE → fixed window
if PREMIUM → token bucket
```
That configuration is outside the service.

This keeps the class Open/Closed Principle compliant.

## 10. Building the Configuration

For example:
```
const factory = new RateLimiterFactory();

const freeLimiter =
  factory.create(
    RateLimiterType.FIXED_WINDOW,
    new RateLimitConfig(10, 60)
  );

const premiumLimiter =
  factory.create(
    RateLimiterType.TOKEN_BUCKET,
    new RateLimitConfig(100, 60)
  );

const rateLimiters =
  new Map<UserTier, RateLimiter>([
    [UserTier.FREE, freeLimiter],
    [UserTier.PREMIUM, premiumLimiter]
  ]);
```
Then:
```
const service =
  new RateLimiterService(
    userRepository,
    rateLimiters
  );
```

## 11. Complete Class Diagram
```
┌──────────────────────────────┐
│            User              │
├──────────────────────────────┤
│ - userId: string             │
│ - tier: UserTier             │
└──────────────────────────────┘
              │
              │
              ▼
┌──────────────────────────────┐
│     RateLimiterService       │
├──────────────────────────────┤
│ - userRepository             │
│ - rateLimiters               │
├──────────────────────────────┤
│ + allowRequest(userId)       │
└──────────────┬───────────────┘
               │
               │ uses
               ▼
┌──────────────────────────────┐
│       <<interface>>          │
│        RateLimiter           │
├──────────────────────────────┤
│ + allowRequest(userId)       │
└──────────────┬───────────────┘
               ▲
       ┌───────┼────────┬────────────┐
       │       │        │            │
       │       │        │            │
       ▼       ▼        ▼            ▼
┌──────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│ Fixed    │ │ Token  │ │ Sliding │ │ Leaky    │
│ Window   │ │ Bucket │ │ Window  │ │ Bucket   │
└──────────┘ └────────┘ └─────────┘ └──────────┘


┌──────────────────────────────┐
│      RateLimiterFactory      │
├──────────────────────────────┤
│ + create(type, config)       │
└──────────────┬───────────────┘
               │
               │ creates
               ▼
          RateLimiter


┌──────────────────────────────┐
│      RateLimitConfig         │
├──────────────────────────────┤
│ - maxRequests: number        │
│ - windowSeconds: number      │
└──────────────────────────────┘


┌──────────────────────────────┐
│      UserRepository          │
├──────────────────────────────┤
│ + findById(userId)           │
└──────────────────────────────┘
```

## 12. Actual API Request Flow
```
                Client
                  │
                  │ GET /api/products
                  │ userId = 101
                  ▼
          ┌─────────────────┐
          │ API Gateway     │
          └────────┬────────┘
                   │
                   ▼
       ┌───────────────────────┐
       │ RateLimiterService    │
       │ allowRequest(101)     │
       └───────────┬───────────┘
                   │
                   ▼
             UserRepository
                   │
                   ▼
          User #101 = FREE
                   │
                   ▼
          Map<FREE, Limiter>
                   │
                   ▼
       FixedWindowRateLimiter
                   │
              allowRequest()
                   │
           ┌───────┴───────┐
           │               │
         TRUE            FALSE
           │               │
           ▼               ▼
      API Server          429
           │
           ▼
       Response

```

## 13. Production Distributed Design

For an interview, this is where you can take the LLD one level further.

The previous implementation uses:
```
Map<string, WindowState>
```
That works only inside one application instance.

With multiple servers:
```
                  Load Balancer
                  /     |      \
                 /      |       \
                ▼       ▼        ▼
             Server1 Server2  Server3
                │       │        │
             counter  counter  counter
                ❌      ❌       ❌
```
The user could potentially get more requests by hitting different servers.

Instead:
```
                      Load Balancer
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         App Server    App Server    App Server
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                     RateLimiter
                           │
                           ▼
                     ┌──────────┐
                     │  Redis   │
                     │          │
                     │ user:101 │
                     │ counter  │
                     │ tokens   │
                     └──────────┘
```
For example:
```
rate_limit:{FREE}:101
```
could contain the user's counter/token state.

For correctness under concurrency, the check-and-update should be atomic, commonly using a Redis Lua script or an appropriate atomic Redis operation.

## 14. HTTP Response

When allowed:
```
HTTP/1.1 200 OK
```
When rate limited:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```
You can also return:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1754724300
```





