# Caching Architecture Patterns

A complete reference for caching in distributed systems — from the fundamental request/response flow to Redis internals, distributed cache topologies, and every failure mode you must plan for.

---

## Table of Contents

1. [The Cache Request/Response Flow](#1-the-cache-requestresponse-flow)
2. [Cache-Aside](#2-cache-aside)
3. [Read-Through](#3-read-through)
4. [Write-Through](#4-write-through)
5. [Write-Behind (Write-Back)](#5-write-behind-write-back)
6. [Refresh-Ahead](#6-refresh-ahead)
7. [Local Cache](#7-local-cache)
8. [Distributed Cache](#8-distributed-cache)
9. [CDN Cache](#9-cdn-cache)
10. [HTTP Cache](#10-http-cache)
11. [Cache Stampede Prevention](#11-cache-stampede-prevention)
12. [Cache Penetration](#12-cache-penetration)
13. [Cache Avalanche](#13-cache-avalanche)
14. [Cache Invalidation](#14-cache-invalidation)
15. [Redis Architecture](#15-redis-architecture)
16. [Distributed Caching Architecture](#16-distributed-caching-architecture)
17. [Strategy Comparison & Decision Guide](#17-strategy-comparison--decision-guide)

---

## 1. The Cache Request/Response Flow

The canonical caching flow — every caching strategy is a variation of this foundation.

### Full flow with miss and hit paths

```
         ┌──────────────────────────────────────────────────┐
         │                   REQUEST                        │
         │              (Client / API Layer)                │
         └──────────────────────┬───────────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────────┐
         │                    CACHE                         │
         │              (Redis / Memcached /                │
         │           Local in-process / CDN)                │
         └──────────┬───────────────────────┬───────────────┘
                    │                       │
                  HIT                     MISS
                    │                       │
                    │                       ▼
                    │    ┌──────────────────────────────────┐
                    │    │             DATABASE              │
                    │    │    (PostgreSQL / MySQL / MongoDB) │
                    │    └──────────────────┬───────────────┘
                    │                       │
                    │                  fetch data
                    │                       │
                    │                       ▼
                    │    ┌──────────────────────────────────┐
                    │    │        POPULATE CACHE             │
                    │    │  cache.SET(key, value, TTL)       │
                    │    └──────────────────┬───────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────────┐
         │                   RESPONSE                       │
         │         (return value to client)                 │
         └──────────────────────────────────────────────────┘
```

### Key metrics to instrument

| Metric | Formula | Target |
|---|---|---|
| **Hit rate** | `hits / (hits + misses)` | > 80–90% for effective caching |
| **Miss rate** | `misses / (hits + misses)` | < 10–20% |
| **Eviction rate** | evictions per second | Should be near zero |
| **Cache latency** | P50/P99 cache read time | < 1 ms for Redis |
| **DB fallback rate** | misses reaching DB per second | Should be tolerable by DB |

### Cache key design

```
Pattern:   {service}:{entity}:{id}:{variant}
Examples:
  order:ord-8821
  product:prod-123:summary
  user:usr-42:profile
  search:results:{hash-of-query}
  rate-limit:ip:192.168.1.1
```

Rules:
- **Deterministic** — same inputs always produce the same key.
- **Namespaced** — prefix with service/entity to avoid collisions.
- **Bounded length** — Redis keys > 1 KB are wasteful; hash long keys.
- **Opaque** — do not encode sensitive data in keys (they appear in logs).

---

## 2. Cache-Aside

### What it is
The application code **manages the cache explicitly**. On a cache miss, the application fetches from the database and populates the cache. On a write, the application updates the database and invalidates or updates the cache entry.

### Flow

```
Request
   │
   ▼
Application checks cache
   │
   ├── HIT → return cached value
   │
   └── MISS
          │
          ▼
       Database (read)
          │
          ▼
       Application stores in cache (SET key value EX ttl)
          │
          ▼
       Response

Write path:
   │
   ▼
Application writes to Database
   │
   ▼
Application deletes from cache (DEL key)
```

### Redis implementation

```python
import redis, json, psycopg2

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_order(order_id: str) -> dict | None:
    key = f"order:{order_id}"

    # 1. Try cache
    cached = r.get(key)
    if cached:
        return json.loads(cached)                 # ← HIT

    # 2. Cache miss — query DB
    with db.cursor() as cur:
        cur.execute("SELECT * FROM orders WHERE order_id = %s", (order_id,))
        row = cur.fetchone()

    if not row:
        # Cache negative result to prevent penetration (short TTL)
        r.setex(key, 30, json.dumps(None))
        return None

    # 3. Populate cache
    r.setex(key, 3600, json.dumps(row))           # ← POPULATE
    return row                                    # ← RESPONSE

def update_order(order_id: str, status: str) -> None:
    with db.cursor() as cur:
        cur.execute(
            "UPDATE orders SET status = %s WHERE order_id = %s",
            (status, order_id)
        )
        db.commit()

    r.delete(f"order:{order_id}")                 # ← INVALIDATE
```

### When to choose Cache-Aside
- Read-heavy workloads; data accessed repeatedly between updates.
- You need fine-grained control over what is cached and for how long.
- Cache failures must not prevent reads (application falls back to DB gracefully).
- Different entities need different TTLs and caching logic.

### Pitfalls

| Pitfall | Description | Fix |
|---|---|---|
| **Cache stampede** | Concurrent misses all hit the DB | Mutex lock or probabilistic refresh |
| **Stale data window** | DB updated but cache not yet evicted | Short TTL + explicit invalidation on write |
| **Cache penetration** | Requests for non-existent keys bypass cache | Cache negative results with short TTL |

---

## 3. Read-Through

### What it is
The **cache itself** handles the miss logic — the application always reads from the cache, and the cache fetches from the database when a miss occurs. The application does not know whether data came from cache or DB.

### Flow

```
Request
   │
   ▼
Application reads from Cache only
   │
   ├── HIT → return value
   │
   └── MISS
          │
          Cache fetches from Database  ← application does NOT do this
          │
          Cache stores value
          │
          ▼
       Response
```

### Spring Cache abstraction (Redis-backed)

```java
@Service
public class OrderService {

    // Read-Through: Spring fetches from DB on miss and populates cache
    @Cacheable(value = "orders", key = "#orderId")
    public Order getOrder(String orderId) {
        // Only executed on cache miss
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    // Write path — evict on update so next read repopulates
    @CacheEvict(value = "orders", key = "#order.orderId")
    public Order updateOrder(Order order) {
        return orderRepository.save(order);
    }
}
```

```yaml
# application.yml — Redis cache config
spring:
  cache:
    type: redis
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    redis:
      time-to-live: 3600000   # 1 hour in ms
      cache-null-values: true  # cache null → prevents penetration
```

### When to choose Read-Through
- You want caching logic hidden from application code.
- Using a caching framework (Spring Cache, Django cache, ActiveSupport::Cache).
- Multiple services read the same data — consistent cache population logic in one place.

### Difference from Cache-Aside

| | Cache-Aside | Read-Through |
|---|---|---|
| **Who populates on miss** | Application | Cache / library |
| **Application awareness** | Knows about cache | Talks only to cache |
| **Cache miss visibility** | Explicit in code | Transparent |

---

## 4. Write-Through

### What it is
Every write goes **through the cache to the database**. The cache writes to the database synchronously as part of the same write operation. Both stores are always in sync.

### Flow

```
Write Request
   │
   ▼
Application writes to Cache
   │
   ▼
Cache writes to Database  ← synchronous, same operation
   │
   ▼
Acknowledge (both stores updated)
   │
   ▼
Response

Read path (always a HIT after first write):
Request → Cache → HIT (no DB read needed)
```

### Redis implementation

```python
def save_order(order: dict) -> None:
    key = f"order:{order['order_id']}"

    # 1. Write to DB first (source of truth)
    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO orders (order_id, customer_id, status, total)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (order_id) DO UPDATE
            SET status = EXCLUDED.status, total = EXCLUDED.total
        """, (order['order_id'], order['customer_id'],
              order['status'], order['total']))
        db.commit()

    # 2. Write to cache (write-through: always update, never just invalidate)
    r.setex(key, 3600, json.dumps(order))
```

**Atomic update with Redis Lua script**
```lua
-- Atomically update hash fields and reset TTL
local key   = KEYS[1]
local ttl   = tonumber(ARGV[1])
local nargs = #ARGV

for i = 2, nargs, 2 do
    redis.call('HSET', key, ARGV[i], ARGV[i+1])
end
redis.call('EXPIRE', key, ttl)
return 1
```

### When to choose Write-Through
- Read-after-write consistency is required — every read must see the latest write.
- Data is always read after being written (write populates cache, saving DB reads).
- Audited or financial data where cache staleness is unacceptable.

### Pitfalls
- **Write latency** — two synchronous writes (cache + DB) add latency.
- **Cache pollution** — data written once but never read still occupies cache; set a TTL.

---

## 5. Write-Behind (Write-Back)

### What it is
Writes go to the cache immediately; the cache **asynchronously persists to the database** in the background. The application sees fast write acknowledgement. DB writes are batched and deferred.

### Flow

```
Write Request
   │
   ▼
Application writes to Cache  ← immediate, fast
   │
   Acknowledge to application ← fast response (DB not yet written)
   │
   │  (async background flush)
   │
   ▼
Cache flushes dirty entries to Database
   │
   ▼
Database updated (eventual)
```

### Redis implementation

```python
import redis, json, threading, time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Write-Behind queue
WRITE_BEHIND_QUEUE = "write-behind:orders"

def write_behind_update(order_id: str, data: dict) -> None:
    key = f"order:{order_id}"

    # 1. Update cache immediately (fast path)
    r.hset(key, mapping=data)
    r.expire(key, 86400)

    # 2. Enqueue for async DB flush
    r.lpush(WRITE_BEHIND_QUEUE, json.dumps({"order_id": order_id, **data}))


def db_flusher():
    """Background worker — batches queue entries and writes to DB"""
    while True:
        batch = []
        while len(batch) < 200:
            item = r.rpop(WRITE_BEHIND_QUEUE)
            if not item:
                break
            batch.append(json.loads(item))

        if batch:
            with db.cursor() as cur:
                for record in batch:
                    cur.execute("""
                        INSERT INTO orders (order_id, status, total, updated_at)
                        VALUES (%s, %s, %s, now())
                        ON CONFLICT (order_id) DO UPDATE
                        SET status = EXCLUDED.status, total = EXCLUDED.total,
                            updated_at = now()
                    """, (record['order_id'], record['status'], record['total']))
                db.commit()

        time.sleep(0.05)   # flush every 50ms

threading.Thread(target=db_flusher, daemon=True).start()
```

### When to choose Write-Behind
- Write-heavy workloads where write latency is the bottleneck.
- Writes can be batched efficiently (counters, analytics events, activity logs).
- Short-term data loss on crash is acceptable.
- Leaderboards, view counters, session activity — eventual persistence is fine.

### Pitfalls

| Pitfall | Mitigation |
|---|---|
| **Data loss on crash** | Redis AOF with `appendfsync always`; replicate write-behind queue |
| **Inconsistency window** | Cache and DB diverge until flush — do not use for financial transactions |
| **Queue backlog** | Monitor queue depth; add backpressure if DB is overwhelmed |

---

## 6. Refresh-Ahead

### What it is
The cache **proactively refreshes** entries before they expire, based on predicted access patterns. When an entry is close to its TTL deadline, a background job refetches it from the DB so the next request always finds a warm cache entry.

### Flow

```
Request → Cache → HIT (value returned immediately, always warm)
                │
                └── TTL approaching threshold? (e.g., < 20% remaining)
                           │
                           YES → async background refresh from DB
                                  │
                                  ▼
                             cache.SET(key, fresh_value, full_TTL)
                             (no request blocked)
```

### Implementation

```python
import threading

REFRESH_THRESHOLD = 0.2   # refresh when < 20% TTL remaining

def get_with_refresh_ahead(key: str, ttl: int, loader) -> any:
    value = r.get(key)
    remaining = r.ttl(key)

    if value is None:
        # Full miss — synchronous load
        value = loader()
        r.setex(key, ttl, json.dumps(value))
        return value

    # Refresh-ahead: TTL below threshold — async reload
    if remaining != -1 and remaining < ttl * REFRESH_THRESHOLD:
        def refresh():
            fresh = loader()
            r.setex(key, ttl, json.dumps(fresh))
        threading.Thread(target=refresh, daemon=True).start()

    return json.loads(value)


# Usage
def get_product_catalogue() -> list:
    return get_with_refresh_ahead(
        key="product:catalogue",
        ttl=3600,
        loader=lambda: db.query("SELECT * FROM products WHERE active = true")
    )
```

### When to choose Refresh-Ahead
- Data changes predictably (regular database updates, scheduled jobs).
- Read latency is critical — no user should ever wait for a cache miss.
- Data that is almost always read (global config, product catalogue, feature flags).
- High-traffic pages where a cache miss under load would cause a stampede.

### When NOT to choose
- Unpredictable or sparse access patterns — background refreshes waste DB load.
- Highly personalised data — hard to predict which keys to pre-refresh.

---

## 7. Local Cache

### What it is
A **per-process, in-memory cache** that lives inside the application instance. No network round-trip — data is a memory access away. Extremely fast, but not shared between instances.

### Characteristics

```
Instance A                    Instance B
┌─────────────────────┐       ┌─────────────────────┐
│ Application         │       │ Application         │
│  ┌───────────────┐  │       │  ┌───────────────┐  │
│  │  Local Cache  │  │       │  │  Local Cache  │  │
│  │  (Caffeine /  │  │       │  │  (Caffeine /  │  │
│  │  Guava Cache /│  │       │  │  Guava Cache /│  │
│  │  LRU map)     │  │       │  │  LRU map)     │  │
│  └───────────────┘  │       │  └───────────────┘  │
└─────────────────────┘       └─────────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    │
              [ Database ]
```

> ⚠️ Each instance has its own cache — a write on Instance A does NOT invalidate the cache on Instance B.

### Caffeine (Java) — local cache

```java
Cache<String, Order> localCache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(Duration.ofMinutes(5))
    .recordStats()                             // hit/miss metrics
    .build();

public Order getOrder(String orderId) {
    return localCache.get(orderId, id ->
        orderRepository.findById(id).orElseThrow()
    );
}
```

### Two-level caching: Local + Redis

```python
LOCAL_CACHE = {}   # in-process dict (or LRU cache)
LOCAL_TTL   = 60   # 60s local cache

def get_order(order_id: str) -> dict:
    key = f"order:{order_id}"

    # L1: local cache (sub-microsecond)
    if key in LOCAL_CACHE:
        entry = LOCAL_CACHE[key]
        if time.time() < entry['expires']:
            return entry['value']

    # L2: Redis (< 1ms)
    cached = r.get(key)
    if cached:
        value = json.loads(cached)
        LOCAL_CACHE[key] = {'value': value, 'expires': time.time() + LOCAL_TTL}
        return value

    # L3: Database
    value = db.query("SELECT * FROM orders WHERE order_id = %s", order_id)
    r.setex(key, 3600, json.dumps(value))
    LOCAL_CACHE[key] = {'value': value, 'expires': time.time() + LOCAL_TTL}
    return value
```

### When to choose Local Cache
- Immutable or very slowly changing data: feature flags, config, reference data.
- Absolute lowest latency requirement — sub-microsecond reads.
- Reduce Redis load for extremely hot keys (global config read millions of times).

### When NOT to choose
- Data must be consistent across multiple instances — local caches diverge after a write.
- Stateless, horizontally scaled services — local cache is lost on instance restart.

---

## 8. Distributed Cache

### What it is
A **shared cache cluster** accessible by all service instances over the network. Every instance reads from and writes to the same cache, ensuring a consistent view of cached data.

### Topology

```
Instance A ──┐
Instance B ──┼──► [ Redis Cluster / Memcached ]
Instance C ──┘           │
Instance D ──┘           │
                    [ Database ]
```

### Redis Cluster — distributed cache

```python
from redis.cluster import RedisCluster

# Connect to Redis Cluster
rc = RedisCluster(
    startup_nodes=[
        {"host": "redis-node-1", "port": 6379},
        {"host": "redis-node-2", "port": 6379},
        {"host": "redis-node-3", "port": 6379},
    ],
    decode_responses=True,
    skip_full_coverage_check=True
)

# Keys are automatically sharded across nodes via hash slots
rc.set("order:ord-8821", json.dumps(order), ex=3600)
rc.get("order:ord-8821")

# {hash tags} force related keys to the same slot (for multi-key commands)
rc.set("{user:cust-42}:orders", ...)
rc.set("{user:cust-42}:profile", ...)
```

### When to choose Distributed Cache
- Multiple service instances must share cached state.
- Cache size exceeds what fits in a single node's memory.
- Cache data must survive an instance restart.
- Horizontal scaling — add cache nodes without changing application code.

### Consistency trade-offs

| Deployment | Consistency | Availability | Use when |
|---|---|---|---|
| **Single Redis node** | Strong (one source of truth) | Low (SPOF) | Dev/test only |
| **Redis Sentinel** | Strong reads from primary | Good (auto-failover ~30s) | Moderate HA |
| **Redis Cluster** | Eventual (async replication) | High (no SPOF) | Production, large datasets |
| **Redis Enterprise** | Strong with Active-Active | Very high | Global, multi-region |

---

## 9. CDN Cache

### What it is
A **Content Delivery Network** caches static and dynamic content at **edge nodes** geographically close to users. Responses are served from the edge without reaching the origin server.

### Flow

```
User (New York)
   │
   ▼
CDN Edge Node (New York)
   │
   ├── HIT → serve cached response (< 5ms, no origin hit)
   │
   └── MISS → forward to Origin Server
                    │
               generate response
                    │
               CDN stores response at edge
                    │
                    ▼
              serve to user
              (cached for subsequent requests at this edge)
```

### Cache-Control headers

```http
# Static assets — cache forever at CDN and browser
Cache-Control: public, max-age=31536000, immutable

# API responses — cache at CDN for 1 min, revalidate
Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600

# Personalised — do NOT cache at CDN
Cache-Control: private, no-store

# Dynamic but shareable — CDN caches, browser does not
Cache-Control: public, s-maxage=120, no-store
```

### Surrogate keys / cache tags (purge by tag)

```http
# Response carries a tag
Surrogate-Key: product-123 category-electronics
Cache-Tag: product-123 category-electronics      # Cloudflare

# Purge all responses tagged with this product (on product update)
curl -X POST https://api.cloudflare.com/zones/{zone}/purge_cache \
  -d '{"tags": ["product-123"]}'
```

### When to choose CDN Cache
- Static assets: JS, CSS, images, fonts — always.
- Public API responses that are identical across users.
- High read-to-write ratio on content that can be slightly stale.
- Reduce origin server load and latency for geographically distributed users.

### When NOT to use
- Authenticated, personalised, or user-specific responses — `Cache-Control: private`.
- Rapidly changing data where CDN TTL cannot be short enough.

---

## 10. HTTP Cache

### What it is
HTTP caching uses standard HTTP headers to enable **browser, proxy, and CDN caches** to store and reuse responses without re-requesting the origin. It is built into the HTTP protocol.

### Cache-Control directives

| Directive | Meaning |
|---|---|
| `max-age=N` | Client (browser) caches for N seconds |
| `s-maxage=N` | Shared caches (CDN, proxy) cache for N seconds |
| `no-cache` | Must revalidate with origin before serving (not "don't cache") |
| `no-store` | Never store this response anywhere |
| `private` | Only browser can cache (not CDN, not proxy) |
| `public` | Any cache can store this response |
| `immutable` | Never revalidate while fresh (for versioned assets) |
| `stale-while-revalidate=N` | Serve stale for N seconds while fetching fresh in background |
| `stale-if-error=N` | Serve stale for N seconds if origin errors |

### Conditional requests (validation)

```http
# First response — server sends ETag
HTTP/1.1 200 OK
ETag: "abc123"
Last-Modified: Tue, 01 Jun 2024 10:00:00 GMT
Cache-Control: max-age=300

# Subsequent request — client sends conditional header
GET /orders/ord-8821
If-None-Match: "abc123"
If-Modified-Since: Tue, 01 Jun 2024 10:00:00 GMT

# Not changed → 304 Not Modified (no body — saves bandwidth)
HTTP/1.1 304 Not Modified
ETag: "abc123"

# Changed → 200 OK with new body and new ETag
HTTP/1.1 200 OK
ETag: "def456"
```

### Response caching by content type

```
/static/app.abc123.js    → Cache-Control: public, max-age=31536000, immutable
/api/products            → Cache-Control: public, s-maxage=60, stale-while-revalidate=300
/api/orders/{id}         → Cache-Control: private, no-store
/api/me                  → Cache-Control: private, no-store
/health                  → Cache-Control: no-store
```

### When to choose HTTP Cache
- Always apply to public API endpoints — even 10-second TTLs can absorb large traffic spikes.
- Static assets with content-addressed URLs — use `immutable` + long TTL.
- Use `stale-while-revalidate` for near-real-time data where occasional staleness is fine.

---

## 11. Cache Stampede Prevention

### What it is
A **cache stampede** (thundering herd) occurs when a popular cache key expires and many concurrent requests simultaneously miss the cache, all hitting the database at once. This can overwhelm the database and cause cascading failures.

### Visualisation

```
T=0: cache key "product:catalogue" expires
     │
T=1: 1000 concurrent requests hit cache → all MISS
     │
     └──► 1000 concurrent DB queries ← database saturated → slow → timeout cascade
```

### Prevention strategies

#### Strategy 1: Mutex / distributed lock

```python
import redis, time, json

LOCK_TTL = 10   # seconds

def get_with_mutex(key: str, ttl: int, loader) -> any:
    # 1. Try cache
    value = r.get(key)
    if value:
        return json.loads(value)

    # 2. Acquire lock — only ONE process refills the cache
    lock_key = f"lock:{key}"
    acquired = r.set(lock_key, "1", nx=True, ex=LOCK_TTL)

    if acquired:
        try:
            # Re-check cache (another process may have filled it)
            value = r.get(key)
            if value:
                return json.loads(value)

            # Load from DB and populate cache
            data = loader()
            r.setex(key, ttl, json.dumps(data))
            return data
        finally:
            r.delete(lock_key)
    else:
        # Another process is loading — wait briefly and retry
        time.sleep(0.05)
        return get_with_mutex(key, ttl, loader)   # retry
```

#### Strategy 2: Probabilistic early expiration (XFetch)

```python
import math, random, time

def get_xfetch(key: str, ttl: int, beta: float, loader) -> any:
    """
    XFetch algorithm — stochastically refresh before expiry.
    beta controls aggressiveness (default 1.0).
    """
    cached = r.get(key)
    remaining = r.ttl(key)

    if cached is None:
        # Full miss
        data = loader()
        r.setex(key, ttl, json.dumps(data))
        return data

    # Probabilistic check: refresh early with probability that increases as TTL shrinks
    # Simulates: current_time + delta * beta * log(rand()) > expiry_time
    delta = 1.0   # approximate last compute time (seconds)
    if time.time() - delta * beta * math.log(random.random()) > time.time() + remaining:
        # Early async refresh
        import threading
        def refresh():
            data = loader()
            r.setex(key, ttl, json.dumps(data))
        threading.Thread(target=refresh, daemon=True).start()

    return json.loads(cached)
```

#### Strategy 3: Staggered TTL (jitter)

```python
import random

BASE_TTL = 3600

def set_with_jitter(key: str, value: any) -> None:
    """Add ±10% random jitter so all keys don't expire simultaneously"""
    jitter = random.randint(-BASE_TTL // 10, BASE_TTL // 10)
    ttl    = BASE_TTL + jitter
    r.setex(key, ttl, json.dumps(value))
```

### When to apply stampede prevention
- Always, for any popular key that will receive high concurrent traffic.
- Especially on keys with a fixed TTL that many instances set at the same time.
- Use jitter for bulk cache warming; use mutex or XFetch for hot single keys.

---

## 12. Cache Penetration

### What it is
**Cache penetration** occurs when requests are made for keys that **do not exist** in either the cache or the database. Every request bypasses the cache and hits the database — defeating the cache entirely. Often caused by invalid IDs, bugs, or malicious probing.

### Visualisation

```
Request for order:nonexistent-id-999
   │
   ▼
Cache → MISS (key doesn't exist)
   │
   ▼
Database → empty result (row doesn't exist either)
   │
   ▼
(cache not populated — no value to cache)
   │
Next request for same key → same MISS → same DB hit → forever
```

### Prevention strategies

#### Strategy 1: Cache null results

```python
NEGATIVE_TTL = 60   # cache negative results for 60 seconds

def get_order(order_id: str) -> dict | None:
    key = f"order:{order_id}"

    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)   # may be null sentinel

    result = db.query("SELECT * FROM orders WHERE order_id = %s", order_id)

    if result is None:
        # Cache the null — prevents repeated DB hits
        r.setex(key, NEGATIVE_TTL, json.dumps(None))
        return None

    r.setex(key, 3600, json.dumps(result))
    return result
```

#### Strategy 2: Bloom filter

```python
from pybloom_live import BloomFilter

# Pre-populate bloom filter with all valid order IDs at startup
bloom = BloomFilter(capacity=1_000_000, error_rate=0.001)

def seed_bloom_filter():
    for order_id in db.query("SELECT order_id FROM orders"):
        bloom.add(order_id)

def get_order(order_id: str) -> dict | None:
    # Fast check: is this ID even plausible?
    if order_id not in bloom:
        return None   # definitely doesn't exist — skip cache and DB
    return get_from_cache_or_db(order_id)
```

#### Strategy 3: Rate limit + input validation

```python
def validate_order_id(order_id: str) -> bool:
    """Reject structurally invalid IDs before hitting cache or DB"""
    import re
    return bool(re.match(r'^ord-[a-f0-9]{8}$', order_id))
```

### When to apply cache penetration prevention
- Public APIs where clients supply IDs from user input.
- Any high-traffic endpoint vulnerable to probing with random/invalid IDs.
- Use null caching as the minimum; add a Bloom filter for very high-volume scenarios.

---

## 13. Cache Avalanche

### What it is
A **cache avalanche** occurs when a large number of cache keys expire **at the same time**, sending a sudden spike of database requests simultaneously. Unlike stampede (one key, many requests), avalanche is many keys expiring together.

### Visualisation

```
T=0: all 10,000 product cache keys set (same TTL=3600s, bulk warm)
T=3600: all 10,000 keys expire simultaneously
     │
     └──► 10,000 concurrent DB queries → database overwhelmed → outage
```

### Prevention strategies

#### Strategy 1: TTL jitter on bulk set

```python
import random

def warm_product_cache(products: list) -> None:
    BASE_TTL = 3600
    pipe = r.pipeline()
    for product in products:
        key  = f"product:{product['id']}"
        # ±20% jitter spreads expiry over 48–72 minutes
        ttl  = BASE_TTL + random.randint(-BASE_TTL // 5, BASE_TTL // 5)
        pipe.setex(key, ttl, json.dumps(product))
    pipe.execute()   # batch write — single round-trip
```

#### Strategy 2: Persistent / never-expire hot keys

```python
HOT_KEYS = {"product:catalogue", "config:feature-flags", "tax:rates"}

def set_cache_entry(key: str, value: any, ttl: int = 3600) -> None:
    if key in HOT_KEYS:
        r.set(key, json.dumps(value))       # no TTL — never expires
    else:
        r.setex(key, ttl, json.dumps(value))
```

#### Strategy 3: Multi-layer cache (L1 local + L2 Redis)

```
If Redis cluster goes down entirely:
  L1 local cache (60s TTL) absorbs traffic
  → reduces DB blast radius
  → gives time for Redis to recover
```

#### Strategy 4: Circuit breaker on DB

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
def fetch_from_db(key: str) -> any:
    return db.query("SELECT * FROM products WHERE id = %s", key)
```

#### Strategy 5: Redis High Availability

```
Redis Sentinel or Redis Cluster ensures cache is not a single point of failure.
If one node fails, replicas take over automatically — avalanche is contained.
```

### When to apply cache avalanche prevention
- Any bulk cache warming operation — always use jitter.
- After a cache server restart or cold start — stagger repopulation.
- Combine: jitter + HA Redis + circuit breaker on DB for production systems.

---

## 14. Cache Invalidation

### What it is
Cache invalidation is the process of **removing or updating stale entries** when the underlying data changes. It is one of the hardest problems in computing — too aggressive wastes the cache; too lenient serves stale data.

> *"There are only two hard things in Computer Science: cache invalidation and naming things."*  
> — Phil Karlton

### Invalidation strategies

#### TTL-based (time-to-live)

```python
r.setex("order:ord-8821", 3600, json.dumps(order))   # expires in 1 hour

# Pros:  Simple, no invalidation logic needed
# Cons:  Stale window up to TTL; choose TTL by acceptable staleness
```

#### Event-driven invalidation

```python
# On write: explicitly delete the cached entry
def update_order(order_id: str, status: str) -> None:
    db.execute("UPDATE orders SET status = %s WHERE order_id = %s", status, order_id)
    r.delete(f"order:{order_id}")        # immediate invalidation

# Pros:  Immediate consistency
# Cons:  Every write path must remember to invalidate
```

#### CDC-based invalidation (via Kafka)

```python
# Debezium publishes every DB change to Kafka
# A cache invalidator service consumes the stream and invalidates Redis

@kafka_consumer(topic="postgres.public.orders")
def invalidate_on_change(event: dict) -> None:
    order_id = event["after"]["order_id"]
    r.delete(f"order:{order_id}")
    # Also invalidate derived keys
    r.delete(f"customer:{event['after']['customer_id']}:order-summary")
```

#### Tag-based invalidation

```python
# Store tags alongside cached values
def set_with_tags(key: str, value: any, tags: list[str], ttl: int) -> None:
    pipe = r.pipeline()
    pipe.setex(key, ttl, json.dumps(value))
    for tag in tags:
        pipe.sadd(f"tag:{tag}", key)          # tag → set of keys
        pipe.expire(f"tag:{tag}", ttl + 60)
    pipe.execute()

def invalidate_by_tag(tag: str) -> None:
    keys = r.smembers(f"tag:{tag}")           # all keys with this tag
    if keys:
        r.delete(*keys)                       # bulk delete
    r.delete(f"tag:{tag}")

# Usage
set_with_tags("product:prod-123:detail", product,
              tags=["product:prod-123", "category:electronics"], ttl=3600)

# When product is updated — invalidate all cached views of it
invalidate_by_tag("product:prod-123")
```

#### Versioned keys

```python
# Instead of invalidating, change the key → old key naturally expires
def get_product(product_id: str) -> dict:
    version = r.get(f"product:{product_id}:version") or "0"
    key = f"product:{product_id}:v{version}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    data = db.query_product(product_id)
    r.setex(key, 3600, json.dumps(data))
    return data

def invalidate_product(product_id: str) -> None:
    # Increment version — old versioned key is now unreachable, will expire by TTL
    r.incr(f"product:{product_id}:version")
```

### Invalidation strategy selection

| Strategy | Consistency | Complexity | Best for |
|---|---|---|---|
| **TTL only** | Eventual | Very low | Tolerant-of-staleness data (catalogue, config) |
| **Event-driven DEL on write** | Near-real-time | Low-Medium | Any transactional data |
| **CDC-based** | Near-real-time | High (infrastructure) | High-traffic systems, multiple caches to sync |
| **Tag-based** | Immediate | Medium | Complex cached views with dependencies |
| **Versioned keys** | Immediate (logically) | Medium | High-read keys where atomic swap is needed |

---

## 15. Redis Architecture

### Single-node Redis

```
Client ──► [ Redis Server ]
               │
           In-memory data store
               │
           AOF / RDB persistence (optional)
```

- Single-threaded command processing — no locking needed.
- Sub-millisecond latency for all standard data structure operations.
- Persistence: **RDB** (point-in-time snapshots) and/or **AOF** (append-only log of every write command).

### Redis data structures

| Structure | Commands | Cache use case |
|---|---|---|
| **String** | `GET` `SET` `INCR` `SETEX` | Simple key/value, counters, tokens |
| **Hash** | `HGET` `HSET` `HMGET` `HGETALL` | Object/entity cache (sparse field access) |
| **List** | `LPUSH` `RPOP` `LRANGE` | Write-behind queues, recent activity |
| **Set** | `SADD` `SMEMBERS` `SINTER` | Tag invalidation, unique visitor sets |
| **Sorted Set** | `ZADD` `ZRANGE` `ZRANGEBYSCORE` | Leaderboards, rate limiting, delayed queues |
| **Bitmap** | `SETBIT` `GETBIT` `BITCOUNT` | Bloom filters, daily active users |
| **HyperLogLog** | `PFADD` `PFCOUNT` | Approximate distinct count at low memory |
| **Stream** | `XADD` `XREAD` `XREADGROUP` | Event queues, write-behind |

### Redis persistence modes

```
┌──────────────────────────────────────────────────────────────┐
│  Mode       │  Durability  │  Recovery time  │  Performance  │
├──────────────────────────────────────────────────────────────┤
│  No persist │  None        │  N/A            │  Maximum      │
│  RDB only   │  Minutes     │  Fast           │  High         │
│  AOF always │  Every write │  Slow           │  Lower        │
│  AOF every  │  ~1s         │  Medium         │  High         │
│  second     │              │                 │               │
│  RDB + AOF  │  ~1s         │  Medium         │  High         │
└──────────────────────────────────────────────────────────────┘
```

```ini
# redis.conf — recommended production persistence
appendonly yes
appendfsync everysec          # fsync every second (good balance)
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

save 3600 1                   # RDB snapshot: if 1 key changed in 1 hour
save 300  100                 # RDB snapshot: if 100 keys changed in 5 min
save 60   10000               # RDB snapshot: if 10K keys changed in 1 min
```

### Redis Sentinel — High Availability

```
         ┌─────────────────────────────────────────┐
         │           Redis Sentinel Quorum          │
         │   Sentinel 1 │ Sentinel 2 │ Sentinel 3   │
         └──────┬────────────────────────┬──────────┘
                │                        │
           monitor                  monitor
                │                        │
                ▼                        ▼
         [ Primary ]              [ Replica 1 ]
         port: 6379               port: 6380
                │
         async replication
                │
                ▼
         [ Replica 2 ]
         port: 6381
```

**Sentinel responsibilities:**
- Monitor primary and replicas.
- Detect primary failure (quorum agreement required).
- Elect a new primary (promote replica).
- Notify clients of the new primary address.
- Reconfigure remaining replicas to follow the new primary.

```python
# Client connects via Sentinel (auto-follows failover)
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [('sentinel-1', 26379), ('sentinel-2', 26379), ('sentinel-3', 26379)],
    socket_timeout=0.1
)
primary = sentinel.master_for('mymaster', socket_timeout=0.1)
replica = sentinel.slave_for('mymaster',  socket_timeout=0.1)
```

### Redis Cluster — Distributed Sharding

```
                    16384 hash slots distributed across nodes

Node A (master)     Node B (master)     Node C (master)
slots: 0–5460       slots: 5461–10922   slots: 10923–16383
     │                   │                    │
  Replica A           Replica B            Replica C
```

```
hash_slot = CRC16(key) % 16384

Key "order:ord-8821" → CRC16 → slot 4213 → Node A
Key "user:cust-42"   → CRC16 → slot 9001 → Node B
```

```ini
# redis.conf — cluster node config
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-require-full-coverage no   # serve requests even if some slots unavailable
```

```bash
# Create a 3-master 3-replica cluster
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

**Hash tags — force related keys to same slot:**
```python
# Without hash tag: keys may be on different nodes (MGET fails cross-slot)
r.set("user:42:orders",  ...)   # slot A
r.set("user:42:profile", ...)   # slot B  ← different slot!

# With hash tag: both keys on same slot
r.set("{user:42}:orders",  ...)  # hash slot of "user:42"
r.set("{user:42}:profile", ...)  # same hash slot → same node ✓

# Now MGET works
r.mget("{user:42}:orders", "{user:42}:profile")
```

### Redis memory management

```ini
# Eviction policy when maxmemory is reached
maxmemory 8gb
maxmemory-policy allkeys-lru     # evict least-recently-used keys (recommended for cache)

# Other policies:
# volatile-lru   — evict LRU keys with TTL set
# allkeys-lfu    — evict least-frequently-used (better for skewed access)
# volatile-ttl   — evict keys with shortest TTL first
# noeviction     — return error when full (use for persistent data stores)
```

---

## 16. Distributed Caching Architecture

### Multi-region distributed cache

```
Region: US-EAST                     Region: EU-WEST
┌─────────────────────────┐         ┌─────────────────────────┐
│  App Instances          │         │  App Instances          │
│  ┌──────────────────┐   │         │   ┌──────────────────┐  │
│  │ Local Cache (L1) │   │         │   │ Local Cache (L1) │  │
│  └────────┬─────────┘   │         │   └────────┬─────────┘  │
│           │             │         │            │             │
│  ┌────────▼─────────┐   │         │   ┌────────▼─────────┐  │
│  │  Redis Cluster   │   │◄──────►│   │  Redis Cluster   │  │
│  │  (L2 — regional) │   │  async  │   │  (L2 — regional) │  │
│  └────────┬─────────┘   │  repl.  │   └────────┬─────────┘  │
└───────────┼─────────────┘         └────────────┼────────────┘
            │                                     │
            └──────────────┬──────────────────────┘
                           │
                    [ Primary Database ]
                    (PostgreSQL / Aurora)
```

### Cache topology patterns

#### Pattern 1: Cache per service (sidecar)

```yaml
# Kubernetes: Redis sidecar per service pod
spec:
  containers:
  - name: order-service
    image: order-service:latest
  - name: redis-sidecar
    image: redis:7-alpine
    resources:
      limits:
        memory: "512Mi"
```

#### Pattern 2: Shared Redis cluster per environment

```
Order Service ──┐
Payment Service ─┼──► Redis Cluster (shared, namespaced keys)
Product Service ─┘
```

#### Pattern 3: Read-through proxy (Twemproxy / KeyDB)

```
App ──► Cache Proxy ──► Redis Node 1
                    ──► Redis Node 2
                    ──► Redis Node 3
```

### Cache warming strategies

```python
def warm_cache_on_startup() -> None:
    """Pre-populate cache before accepting traffic"""
    print("Warming cache...")

    # Fetch top 1000 most-accessed products from DB
    hot_products = db.query("""
        SELECT p.* FROM products p
        JOIN product_access_log a ON p.id = a.product_id
        WHERE a.accessed_at > now() - interval '24 hours'
        ORDER BY count(*) DESC
        LIMIT 1000
    """)

    pipe = r.pipeline()
    for product in hot_products:
        key = f"product:{product['id']}"
        ttl = 3600 + random.randint(-360, 360)  # jitter
        pipe.setex(key, ttl, json.dumps(product))
    pipe.execute()

    print(f"Cache warmed with {len(hot_products)} entries")
```

### Monitoring key metrics

```
# Redis INFO stats to monitor
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|evicted_keys"

keyspace_hits:   982340      ← cache hits
keyspace_misses: 17660       ← cache misses
evicted_keys:    0           ← 0 = good (maxmemory not reached)

# Hit rate
hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses)
# Target: > 0.90

# Memory fragmentation ratio (INFO memory)
mem_fragmentation_ratio: 1.2   # 1.0–1.5 = healthy; > 1.5 = fragmented
```

---

## 17. Strategy Comparison & Decision Guide

### Caching strategies at a glance

| Strategy | Who fills on miss | Write path | Consistency | Write latency | Data loss risk | Best for |
|---|---|---|---|---|---|---|
| **Cache-Aside** | Application | DEL on write | Eventual | Low | None | Read-heavy, fine-grained control |
| **Read-Through** | Cache / library | Evict on write | Eventual | Low | None | Transparent caching |
| **Write-Through** | Cache on write | Cache + DB sync | Strong | Higher | None | Read-after-write consistency |
| **Write-Behind** | Cache on write | Async to DB | Eventual | Very low | Yes (unflushed) | High-freq writes, counters |
| **Refresh-Ahead** | Background job | TTL + async refresh | Near-real-time | Low | None | Always-warm hot keys |

### Cache layer selection

| Layer | Latency | Shared | Survives restart | Best for |
|---|---|---|---|---|
| **Local (in-process)** | < 1 µs | ❌ Per-instance | ❌ Lost | Hot immutable config, reference data |
| **Redis (distributed)** | < 1 ms | ✅ All instances | ✅ With persistence | Session, API response, object cache |
| **CDN** | < 10 ms | ✅ By region | ✅ | Static assets, public API responses |
| **HTTP (browser)** | 0 ms | ❌ Per-browser | ✅ | Static assets, GET responses |

### Problem → solution

| Problem | Pattern | Implementation |
|---|---|---|
| High DB read load | Cache-Aside or Read-Through | Redis + TTL |
| Read-after-write staleness | Write-Through | Redis + sync DB write |
| High-frequency writes overwhelming DB | Write-Behind | Redis queue + async flusher |
| Cache miss spike on popular key expiry | Refresh-Ahead + Jitter | Background refresh + random TTL |
| Concurrent misses hammering DB | Cache Stampede (mutex / XFetch) | Redis NX lock or probabilistic |
| Requests for non-existent keys | Cache Penetration (null cache / Bloom) | Cache nulls, Bloom filter |
| Mass expiry → DB overload | Cache Avalanche (jitter + HA) | Staggered TTL + Redis Cluster |
| Stale data after write | Cache Invalidation (event-driven / CDC) | DEL on write or Debezium → invalidator |
| Many instances inconsistent | Distributed Cache | Redis Sentinel or Cluster |
| Sub-microsecond local reads | Local Cache (L1) | Caffeine + L2 Redis |
| Edge caching for global users | CDN Cache | CloudFront / Cloudflare + Cache-Control |

---

*Reference: Martin Kleppmann — Designing Data-Intensive Applications · Redis Documentation (redis.io) · Cloudflare CDN Docs · RFC 9111 — HTTP Caching*
