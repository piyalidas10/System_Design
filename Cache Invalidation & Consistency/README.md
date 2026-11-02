# Cache Invalidation & Consistency

> *"There are only two hard problems in Computer Science: cache invalidation and naming things."*  
> — Phil Karlton

Caching improves performance dramatically — but introduces a new problem: **how do you keep cached data consistent with the source of truth?** This document covers every major failure mode and its mitigation.

---

## Table of Contents

1. [Cache Invalidation — Strategies](#1-cache-invalidation--strategies)
2. [Cache Stampede](#2-cache-stampede)
3. [Cache Penetration](#3-cache-penetration)
4. [Cache Avalanche](#4-cache-avalanche)
5. [TTL Management](#5-ttl-management)
6. [Data Consistency Models](#6-data-consistency-models)
7. [Side-by-Side Problem Comparison](#7-side-by-side-problem-comparison)
8. [Which Strategy for Which Scenario?](#8-which-strategy-for-which-scenario)
9. [Production Blueprint](#9-production-blueprint)
10. [Quick Decision Flowchart](#10-quick-decision-flowchart)

---

## 1. Cache Invalidation — Strategies

### The Core Problem

```
  DB updated → cache still has the old value → users see stale data

  Time →   0s         5s           10s
  DB:     v1    ──── v2 (update) ─────────────────────► v2
  Cache:  v1    ─────────────────────────────────────►  v1  ← STALE!

  Every read between 0s and cache expiry returns stale v1.
```

Cache invalidation answers: **when and how do we remove/update a cache entry when the underlying data changes?**

---

### Strategy 1 — Cache-Aside (Lazy Loading)

```
READ flow:
  ┌────────┐      GET key      ┌────────┐
  │  App   │ ───────────────► │ Cache  │
  │        │                  │        │
  │        │ ◄─ HIT: value ── │        │
  │        │                  └────────┘
  │        │   MISS: null
  │        │ ──────────────────────────────► DB
  │        │ ◄────────────── value ──────── DB
  │        │ ──── SET(key, value, TTL) ──► Cache
  └────────┘

WRITE flow:
  ┌────────┐   UPDATE row    ┌────────┐
  │  App   │ ──────────────► │   DB   │
  │        │   DEL key       │        │
  │        │ ──────────────► │ Cache  │  ← invalidate, not update
  └────────┘                 └────────┘
```

**Pros & Cons:**

| ✅ Pros | ❌ Cons |
|---------|---------|
| Cache only contains data actually requested | First request always a cache miss (cold start) |
| Cache failure doesn't break writes | Race condition: read-miss → DB read → another write → cache SET overwrites fresh DB value |
| Works well for read-heavy workloads | Requires manual cache invalidation on every write path |
| Simple to implement | Stale window between DB write and cache DEL |

**Real-World Use:** Instagram (profile data), Twitter (tweet cache), most general-purpose web apps.

---

### Strategy 2 — Write-Through

```
WRITE flow:
  ┌────────┐   PUT(key, v2)   ┌────────┐   SET(key, v2)   ┌────────┐
  │  App   │ ───────────────► │ Cache  │ ───────────────►  │   DB   │
  │        │                  │        │  (synchronous)    │        │
  │        │ ◄── ACK ──────── │        │ ◄─── ACK ──────── │        │
  └────────┘                  └────────┘                   └────────┘

  Cache and DB are ALWAYS in sync after every write.
  Read is always a cache hit (no cold-start after first write).
```

**Pros & Cons:**

| ✅ Pros | ❌ Cons |
|---------|---------|
| Cache is always fresh — no stale data | Write latency increases (must wait for DB ACK) |
| Read after write always hits cache | Cache filled with data never read (write amplification) |
| No cache invalidation logic needed | If DB write fails → inconsistency between cache and DB |
| Good for write + immediate read patterns | Not suitable for write-heavy workloads at scale |

**Real-World Use:** Financial dashboards, booking confirmations, leaderboards (Zynga, gaming).

---

### Strategy 3 — Write-Behind (Write-Back)

```
WRITE flow:
  ┌────────┐   PUT(key, v2)   ┌────────┐
  │  App   │ ───────────────► │ Cache  │ ──► ACK immediately
  │        │                  │        │
  │        │                  │   ▼ async (batch, after Δt)  │
  │        │                  │        │ ──────────────────────► DB
  └────────┘                  └────────┘

  Writes acknowledged from cache instantly.
  DB updated asynchronously in background (batched).
```

**Pros & Cons:**

| ✅ Pros | ❌ Cons |
|---------|---------|
| Ultra-low write latency (no DB round-trip) | Data loss risk if cache node crashes before DB flush |
| Absorbs write bursts efficiently | Complex to implement safely |
| DB load dramatically reduced | Inconsistency window between cache and DB |
| Great for high-frequency writes (counters, analytics) | Not suitable for data requiring ACID guarantees |

**Real-World Use:** Social media like counts, view counters (YouTube), real-time analytics, gaming scores.

---

### Strategy 4 — Refresh-Ahead (Read-Ahead)

```
  Entry inserted at T=0, TTL=60s

  T=0   ──► cache SET
  T=42s ──► cache GET   → still valid (42 < 60)
            [threshold: TTL × 0.75 = 45s]
  T=46s ──► cache GET   → still valid BUT passes threshold
            ──► background async refresh from DB
            ──► cache updated silently, TTL reset to 60s
  T=60s ──► entry expires (but was already refreshed at T=46s)
            → NO cache miss! Zero cold-start on expiry

  Without Refresh-Ahead:
  T=60s ──► TTL expires → cache miss → DB hit → cache SET → slow response
```

**Pros & Cons:**

| ✅ Pros | ❌ Cons |
|---------|---------|
| Eliminates expiry-driven cache misses | May refresh data nobody will read (wasted DB calls) |
| Consistent low latency even at TTL boundary | Requires prediction of what data to refresh |
| Ideal for predictable, scheduled data | Complex to implement correctly |
| Prevents stampede at TTL boundary | Slightly stale for the refresh window duration |

**Real-World Use:** CDN content pre-warming, news feed pre-loading, stock ticker caches.

---

### Strategy Comparison

```
┌──────────────────┬─────────────────┬────────────────────┬──────────────────┐
│  Strategy        │ Write Latency   │ Staleness Risk     │ Read Latency     │
├──────────────────┼─────────────────┼────────────────────┼──────────────────┤
│ Cache-Aside      │ Low (no cache   │ Medium (TTL or     │ High on miss     │
│                  │ write on update)│ manual invalidation│                  │
├──────────────────┼─────────────────┼────────────────────┼──────────────────┤
│ Write-Through    │ High (sync DB)  │ None               │ Low (always hit) │
├──────────────────┼─────────────────┼────────────────────┼──────────────────┤
│ Write-Behind     │ Very Low (async)│ High (async lag)   │ Low (always hit) │
├──────────────────┼─────────────────┼────────────────────┼──────────────────┤
│ Refresh-Ahead    │ Low             │ Very Low           │ Very Low         │
└──────────────────┴─────────────────┴────────────────────┴──────────────────┘
```

---

## 2. Cache Stampede

### What Is It?

```
Timeline:
  T=0    Cache entry for "trending:posts" TTL set to 60s
  T=60   TTL expires → entry evicted

  T=60   Request 1  ──► cache miss → query DB
  T=60   Request 2  ──► cache miss → query DB   ← all concurrent!
  T=60   Request 3  ──► cache miss → query DB
  T=60   Request 4  ──► cache miss → query DB
  ...    1000 concurrent requests → 1000 simultaneous DB queries

  ┌────────────────────────────────────┐
  │           DB Server                │
  │                                    │
  │  Normal load:  50 RPS             │
  │  Stampede:  1000 RPS spike ──►    │
  │             ████████ OVERLOAD      │
  └────────────────────────────────────┘
```

Also called **"Thundering Herd Problem"** or **"Dog-piling"**.

### Mitigation 1 — Mutex / Distributed Lock

```
  T=60  TTL expires

  Request 1 ──► cache miss
              ──► TRY ACQUIRE lock "trending:posts:lock"
              ──► LOCK ACQUIRED
              ──► query DB → get fresh value
              ──► SET cache "trending:posts" = v2
              ──► RELEASE lock

  Request 2 ──► cache miss
              ──► TRY ACQUIRE lock
              ──► LOCK BUSY (wait / return stale / return empty)
              ──► lock released → READ cache (now populated)
              ──► HIT → return v2  ✅

  Request 3..1000 → same as Request 2 → wait on lock → hit cache

  DB sees: exactly 1 query instead of 1000
```

**Trade-off:** Lock contention adds latency; deadlock risk if lock holder crashes.  
**Tools:** Redis `SET NX PX` (atomic lock), Redlock algorithm.

### Mitigation 2 — Probabilistic Early Expiry (XFetch)

```
  Do NOT wait for TTL=0 to refresh.
  Start refreshing probabilistically as TTL approaches:

  refresh_probability = exp(-β × remaining_TTL × log(fetch_time))

  High β  → aggressive pre-refresh (more DB calls, less stampede risk)
  Low  β  → conservative (fewer DB calls, small stampede window)

  result: refresh happens ~seconds before expiry,
          spread across multiple requests → no simultaneous expiry
```

### Mitigation 3 — Stale-While-Revalidate

```
  Cache entry format: { value: v1, ttl: 60s, serve_stale_for: 10s }

  T=60s:  TTL expires
          ──► Return stale v1 to client immediately (no miss latency!)
          ──► Trigger async background refresh from DB
          ──► T=60s+Δ: cache updated with v2

  T=70s:  serve_stale_for expires → now truly stale → hard miss

  Clients get a fast response (stale data) while refresh happens silently.
```

### Pros & Cons Summary

| Mitigation | ✅ Pros | ❌ Cons |
|-----------|---------|---------|
| **Mutex / Lock** | Exactly 1 DB query | Lock contention, deadlock risk, added latency |
| **XFetch / Early Expiry** | No lock needed, smooth | Slightly more DB traffic (pre-emptive) |
| **Stale-While-Revalidate** | Zero miss latency | Serves stale data briefly |
| **Refresh-Ahead** | Proactive, no miss | Wasted refreshes for cold keys |

### Real-World Use Cases

| System | Mitigation Used |
|--------|----------------|
| **Redis** (HOT keys) | `SET NX` mutex + Lua atomic scripts |
| **Facebook** (Memcached) | Lease mechanism (similar to mutex) |
| **HTTP CDN** (Nginx, Varnish) | `stale-while-revalidate` cache-control header |
| **GitHub Pages** | Refresh-ahead for static asset caches |

---

## 3. Cache Penetration

### What Is It?

```
  Normal flow:        key EXISTS in DB:
  Client ──► cache miss ──► DB hit ──► cache SET ──► next request: HIT ✅

  Penetration flow:   key DOES NOT EXIST in DB:
  Client ──► cache miss ──► DB miss (null) ──► nothing cached
  Client ──► cache miss ──► DB miss (null) ──► nothing cached
  Client ──► cache miss ──► DB miss (null) ──► nothing cached
             (every request goes through to DB, cache is bypassed entirely)

  Attacker exploit:
    for i in range(1_000_000):
        GET /user?id=nonexistent_id_{i}   ← all bypass cache → hammer DB
```

### Mitigation 1 — Cache Null / Empty Values

```
  BEFORE (no null caching):
  GET "user:9999" → cache miss → DB miss → ∅  → nothing stored
  (1000 requests for user:9999 → 1000 DB queries)

  AFTER (null caching):
  GET "user:9999" → cache miss → DB miss → ∅
                                          → SET "user:9999" = NULL, TTL=30s
  Next 999 requests for user:9999 → cache HIT (returns null) → 0 DB queries

  Trade-off: Must use short TTL (30–60s) so legitimate new entries
             (user:9999 later gets created in DB) appear quickly.
```

### Mitigation 2 — Bloom Filter

```
  Bloom Filter: probabilistic set membership structure
                False-positive possible, false-negative IMPOSSIBLE.
                "If Bloom says NO → key definitely does not exist in DB"

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │   Client Request                                             │
  │        │                                                     │
  │        ▼                                                     │
  │   ┌──────────────┐                                          │
  │   │ Bloom Filter │◄──── populated from DB at startup        │
  │   │  (in-memory) │      updated on every INSERT             │
  │   └──────┬───────┘                                          │
  │      NO  │  YES (maybe)                                     │
  │          │                                                   │
  │   ┌──────┴──────┐                                           │
  │   │  Return 404 │      ┌────────┐      ┌────────┐          │
  │   │  immediately│      │ Cache  │────► │   DB   │          │
  │   │  (no DB hit)│      └────────┘      └────────┘          │
  │   └─────────────┘                                           │
  └──────────────────────────────────────────────────────────────┘

  Bloom filter kills non-existent key lookups before they reach cache/DB.
  Memory: ~10 bits/element → 1 billion keys ≈ 1.2 GB (tiny vs DB)
```

### Pros & Cons

| Mitigation | ✅ Pros | ❌ Cons |
|-----------|---------|---------|
| **Null caching** | Simple, immediate | Wastes cache memory on non-existent keys; short TTL needed |
| **Bloom Filter** | Tiny memory, stops attacks at gate | False positives (rare); must be updated on new inserts; cold-start loading |

### Real-World Use Cases

| System | Mitigation Used |
|--------|----------------|
| **Google Bigtable** | Row existence Bloom filter |
| **Cassandra** | Per-SSTable Bloom filter (avoids disk reads) |
| **Redis** (anti-abuse) | Null value caching + short TTL |
| **Akamai CDN** | Bloom filter for non-existent URL early rejection |
| **HBase** | Bloom filter per block |

---

## 4. Cache Avalanche

### What Is It?

```
  Mass simultaneous TTL expiry:

  T=0    1,000,000 keys SET with TTL=3600s (1 hour)
         (e.g., after a cache warm-up or server restart)

  T=3600 ALL 1,000,000 keys expire simultaneously

  T=3600 All 1,000,000 next requests → cache miss → DB
         ████████████████████████████ DB OVERLOAD / CRASH

  Also triggered by:
  • Cache server crash / restart (entire cache wiped)
  • Network partition isolating cache from app servers
  • Deployment causing cache flush
```

```
  Normal traffic:                  Cache Avalanche:

  DB Load │                        DB Load │
          │     ____                       │              ██
          │  __/    \__                    │           ████████
          │_/          \___                │        ████████████
          └──────────────────► time        └────────────────────► time
                                                     ▲
                                              mass TTL expiry
```

### Mitigation 1 — TTL Jitter (Random Scatter)

```
  BEFORE (identical TTLs):
    key_1   TTL = 3600s  │
    key_2   TTL = 3600s  │ all expire at T=3600 → avalanche
    key_3   TTL = 3600s  │

  AFTER (jitter applied):
    base_ttl = 3600
    jitter   = random(0, 600)   ← ±10% window

    key_1   TTL = 3600 + 127 = 3727s
    key_2   TTL = 3600 + 391 = 3991s
    key_3   TTL = 3600 + 558 = 4158s

  Expirations spread across a 10-minute window → DB load smoothed out.
```

### Mitigation 2 — Circuit Breaker

```
  Normal state: requests flow freely
  ┌──────┐          ┌────────┐          ┌────────┐
  │ App  │─────────►│ Cache  │─────────►│   DB   │
  └──────┘          └────────┘    miss  └────────┘

  Cache avalanche detected (DB error rate > threshold):
  Circuit OPENS → stop sending requests to DB

  ┌──────┐          ┌────────┐   OPEN   ┌────────┐
  │ App  │─────────►│ Cache  │──── ✗ ───│   DB   │
  └──────┘          └────────┘          └────────┘
        │                                    │
        └──► return fallback / cached stale  DB recovering...
             or "service degraded" response

  After timeout (e.g., 30s):
  Circuit HALF-OPEN → allow 1 probe request → if DB recovers → CLOSE circuit
```

### Mitigation 3 — Multi-Level Cache

```
  L1 (local in-process, tiny TTL):
    Very fast, rarely evicted all at once

  L2 (Redis cluster, medium TTL):
    Shared, clustered

  L3 (DB):
    Source of truth

  Even if L2 (Redis) goes down entirely:
    L1 absorbs many requests → DB hit rate much lower than 100%
    Partial availability maintained
```

### Mitigation 4 — Cache Warming / Gradual Restart

```
  After restart or deployment:
  DON'T cold-start with empty cache → every request → DB miss

  DO:
  1. Read-through warming: first N requests populate cache gradually
  2. Pre-warming script: load top-K hot keys from DB into cache before traffic
  3. Snapshot restore: reload last RDB snapshot (Redis) before going live

  ┌─────────────────────────────────────────────────────────────┐
  │  Pre-warming sequence:                                      │
  │                                                             │
  │  0%  ──────────────────────────────────────────► 100%      │
  │  Cache empty           cache filling           cache warm  │
  │  DB: 100% traffic    DB: 80% traffic        DB: 20% traffic│
  └─────────────────────────────────────────────────────────────┘
```

### Pros & Cons Summary

| Mitigation | ✅ Pros | ❌ Cons |
|-----------|---------|---------|
| **TTL Jitter** | Simple one-line change | Slightly unpredictable expiry times |
| **Circuit Breaker** | Protects DB from overload; graceful degradation | Adds infrastructure complexity; tuning thresholds is tricky |
| **Multi-Level Cache** | L1 provides buffer even if L2 collapses | More moving parts; consistency harder |
| **Cache Warming** | Smooth traffic ramp-up | Requires pre-warm scripts; stale data at startup |

### Real-World Use Cases

| System | Mitigation Used |
|--------|----------------|
| **Netflix** | Multi-level cache (EVCache) + circuit breakers (Hystrix) |
| **Facebook** | Memcached + regional failover to reduce avalanche blast radius |
| **Amazon** | Jitter in CloudFront TTLs + warm-up before deployments |
| **Twitter** | Pre-warmed timeline caches before major events |
| **Alibaba Singles Day** | Aggressive cache warming hours before peak traffic |

---

## 5. TTL Management

### Why TTL Is Critical

```
  TOO SHORT:                          TOO LONG:
  ┌──────────────────────────┐       ┌──────────────────────────┐
  │ TTL = 1s                 │       │ TTL = 86400s (1 day)     │
  │                          │       │                          │
  │ Every ~1s → cache miss   │       │ Data updated at T=100s   │
  │ DB: nearly 100% traffic  │       │ Cache serves stale data  │
  │ Caching barely helps!    │       │ for up to 23h 58m!       │
  └──────────────────────────┘       └──────────────────────────┘

  OPTIMAL: TTL = how long can your application tolerate stale data?
```

### TTL by Data Type — Guidelines

```
┌──────────────────────────────┬───────────┬─────────────────────────────────────┐
│  Data Type                   │  TTL      │  Reasoning                          │
├──────────────────────────────┼───────────┼─────────────────────────────────────┤
│ Stock price / exchange rate  │  1–5s     │ Changes every second                │
│ Sports live scores           │  5–10s    │ Fast-changing, small staleness ok   │
│ Social media like/view count │  10–30s   │ Eventual consistency acceptable     │
│ Search autocomplete results  │  60s      │ Changes slowly, fast response needed│
│ User profile / settings      │  5–15 min │ Rarely changes; read-heavy          │
│ Product catalog / prices     │  5–30 min │ Updated infrequently                │
│ Auth token validation cache  │  1–5 min  │ Security: must not be too stale     │
│ Static config / feature flags│  1–5 min  │ Pushed via config service on change │
│ News article metadata        │  15–60 min│ Infrequent updates                  │
│ Static assets (images, CSS)  │  Hours    │ Content-addressed, immutable        │
│ User sessions                │  15–30 min│ Security requirement                │
└──────────────────────────────┴───────────┴─────────────────────────────────────┘
```

### TTL Strategies

#### 1. Fixed TTL
```
  SET key value EX 300    ← expires in 300 seconds, every time
  ✅ Simple    ❌ Can avalanche if many keys set at same time
```

#### 2. Sliding TTL (Activity-Based)
```
  Every access RESETS the TTL:
  T=0   SET key, TTL=300
  T=100 GET key → still alive → TTL reset to 300 from now
  T=400 GET key → still alive → TTL reset again
  ...
  Key stays alive as long as it is accessed at least every 300s

  ✅ Hot keys never expire    ❌ Cold keys eventually evicted
  Redis: GETEX key EX 300    (atomic GET + reset TTL)
```

#### 3. Tiered TTL
```
  Tier 1 (L1, in-process):  TTL = 5s   (accept slightly stale)
  Tier 2 (L2, Redis):       TTL = 300s (ground truth cache)
  Tier 3 (DB):              permanent

  L1 miss → L2 hit → return value → repopulate L1 with 5s TTL
  L2 miss → DB hit → return value → populate both L1 and L2
```

#### 4. Versioned / Tag-Based Invalidation
```
  Instead of waiting for TTL:
  Tag each cache key with a version or namespace tag:

    "user:101:profile" → tag: "user:101"
    "user:101:feed"    → tag: "user:101"
    "user:101:follows" → tag: "user:101"

  When user:101 updates profile:
    DELETE tag "user:101" → ALL keys under that tag invalidated atomically

  ✅ Precise, no staleness    ❌ More complex key management
  Tools: Redis SCAN + DEL pattern, Memcached tag plugins
```

### Pros & Cons of TTL-Based Invalidation

| ✅ Pros | ❌ Cons |
|---------|---------|
| Simple to implement — just set EX | Data remains stale until TTL expires |
| Works without any write-side coordination | Mass expiry can cause avalanche |
| Automatic cleanup, no manual deletion needed | TTL must be carefully tuned per data type |
| Prevents unbounded cache growth | Doesn't react to DB changes in real-time |

---

## 6. Data Consistency Models

### The Consistency Spectrum

```
  STRONG                                                   EVENTUAL
  CONSISTENCY                                           CONSISTENCY
       │                                                       │
       ▼                                                       ▼
  ┌─────────┐   ┌────────────────┐   ┌──────────┐   ┌───────────────┐
  │Read-Your-│   │ Monotonic Read │   │Consistent│   │  Eventual     │
  │  Writes  │   │  Consistency   │   │  Prefix  │   │ Consistency   │
  └─────────┘   └────────────────┘   └──────────┘   └───────────────┘
       │                │                  │                  │
  After write,    Never see older    Reads in order     Eventually
  reads always    data than you      of writes          all replicas
  return it       saw before                             converge
```

### Consistency Models in Practice

#### Strong Consistency (Read-Your-Writes)

```
  Write to DB → immediately invalidate cache → next read hits DB

  Client A: UPDATE user:101 name="Alice"
            ──► DB: name=Alice
            ──► DEL cache:user:101          ← immediate invalidation

  Client A: GET user:101
            ──► cache miss (just deleted)
            ──► DB read: name=Alice ✅       ← sees own write

  ✅ User always sees their own updates
  ❌ Every write → cache miss → DB hit → higher DB load
```

#### Eventual Consistency (TTL-based)

```
  Write to DB → cache NOT immediately invalidated → stale for TTL duration

  T=0   Client A: UPDATE user:101 name="Alice"
                  ──► DB: name=Alice
                  (cache: still "Bob" with TTL remaining 45s)

  T=0   Client B: GET user:101
                  ──► cache HIT → returns "Bob" (stale!)

  T=45  TTL expires → next GET → DB hit → cache SET name=Alice
  T=45  Client B: GET user:101 → returns "Alice" ✅

  ✅ High cache hit rate, low DB load
  ❌ 45s window where stale data is served
```

#### Read-Your-Writes with Version Numbers

```
  Write response includes version:
  POST /user/101  →  { name: "Alice", version: 42 }

  Next read carries version expectation:
  GET /user/101?min_version=42

  Cache: { name: "Bob", version: 41 }  → version < 42 → cache BYPASS
  DB:    { name: "Alice", version: 42 } → correct value returned ✅

  After cache TTL: value updated, version≥42 served from cache again

  Used by: DynamoDB conditional reads, Cassandra lightweight transactions
```

### CAP Theorem Applied to Cache

```
  Distributed Cache must tolerate Network Partitions (P).
  Therefore choose: CP or AP

  ┌────────────────────────────────────────────────────────────────┐
  │  CP (Consistency + Partition Tolerance):                       │
  │    - Cache returns error/miss rather than stale data           │
  │    - Use case: financial systems, inventory counts             │
  │    - Risk: availability drops during partition                 │
  │                                                                │
  │  AP (Availability + Partition Tolerance) — most caches:        │
  │    - Cache continues serving (possibly stale) data             │
  │    - Use case: social media, content caching, profiles         │
  │    - Risk: stale data served during partition                  │
  └────────────────────────────────────────────────────────────────┘
```

### Consistency by Write Strategy

```
┌──────────────────┬─────────────────────────────┬────────────────────────────┐
│  Strategy        │  Consistency Model           │  Best For                  │
├──────────────────┼─────────────────────────────┼────────────────────────────┤
│ Cache-Aside      │ Eventual (TTL-bounded)       │ Read-heavy, tolerate stale │
│ Write-Through    │ Strong (always fresh)        │ Read-after-write critical  │
│ Write-Behind     │ Weak (async lag)             │ Throughput > consistency   │
│ Refresh-Ahead    │ Near-strong (proactive)      │ Predictable access patterns│
│ TTL + Jitter     │ Eventual (TTL-bounded)       │ General purpose            │
│ Tag Invalidation │ Strong (event-driven)        │ Grouped key invalidation   │
└──────────────────┴─────────────────────────────┴────────────────────────────┘
```

---

## 7. Side-by-Side Problem Comparison

```
┌─────────────────┬───────────────────────────┬──────────────────────────────────┐
│  Problem        │  Root Cause               │  Primary Mitigations             │
├─────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Cache Stampede  │ Popular key expires;       │ Mutex lock, XFetch,              │
│                 │ many concurrent misses     │ Stale-While-Revalidate           │
├─────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Cache           │ Requests for non-existent │ Bloom filter,                    │
│ Penetration     │ keys bypass cache+hit DB   │ cache null values                │
├─────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Cache Avalanche │ Mass simultaneous TTL      │ TTL jitter, circuit breaker,     │
│                 │ expiry or full cache wipe  │ multi-level cache, pre-warming   │
├─────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Stale Data      │ Cache not invalidated      │ Write-through, tag invalidation, │
│ (Consistency)   │ after DB update            │ short TTL, event-driven eviction │
└─────────────────┴───────────────────────────┴──────────────────────────────────┘
```

---

## 8. Which Strategy for Which Scenario?

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO                                │  RECOMMENDED APPROACH               │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  User profile, social posts              │  Cache-Aside + TTL (5–15 min)       │
│  (read-heavy, tolerate slight staleness) │                                     │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  Shopping cart, order confirmation       │  Write-Through                      │
│  (read after write must be consistent)  │                                     │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  Like/view counters, analytics           │  Write-Behind (async flush)         │
│  (high write rate, eventual OK)          │                                     │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  News feed, trending content             │  Refresh-Ahead + TTL jitter         │
│  (predictable access, zero miss latency) │                                     │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  API DDoS / random key attacks           │  Bloom Filter (null key guard)      │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  High-traffic event (Black Friday,       │  TTL jitter + circuit breaker +     │
│  IPL final — concurrent mass expiry)    │  cache warming before event         │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  Auth tokens, session data               │  TTL (short, 5–15 min) +           │
│  (security: must expire)                │  sliding TTL on activity            │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  Stock prices, live sports scores        │  TTL (1–5s) + Refresh-Ahead        │
│  (data freshness is paramount)           │                                     │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  Group of related keys (user's data)     │  Tag-based invalidation             │
│  (invalidate all at once on update)     │                                     │
├──────────────────────────────────────────┼─────────────────────────────────────┤
│  Hot key (viral post, celebrity profile) │  Mutex/lock + local L1 micro-cache  │
│  (stampede risk on expiry)              │  to absorb burst                    │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Production Blueprint

### Full Defense-in-Depth Cache Architecture

```
                              Client Request
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Bloom Filter        │
                         │   (non-existent key   │
                         │    guard)             │
                         └──────────┬───────────┘
                          NO (404)  │  YES / MAYBE
                                    ▼
                         ┌──────────────────────┐
                         │   L1: In-Process      │
                         │   Cache (Caffeine)    │
                         │   TTL = 5s (jittered) │
                         │   LRU eviction        │
                         └──────────┬───────────┘
                              HIT ◄─┤ MISS
                                    ▼
                         ┌──────────────────────┐
                         │   L2: Redis Cluster   │
                         │   TTL = 5min (jitter) │
                         │   LRU + mutex on miss │
                         │   Stale-while-reval.  │
                         └──────────┬───────────┘
                              HIT ◄─┤ MISS
                                    ▼
                         ┌──────────────────────┐
                         │  Circuit Breaker      │
                         │  (Hystrix / Resilience│
                         │   4j)                 │
                         │  OPEN → return stale  │
                         │  CLOSED → pass through│
                         └──────────┬───────────┘
                                    ▼
                         ┌──────────────────────┐
                         │      Database         │
                         │  (PostgreSQL/MySQL)   │
                         └──────────────────────┘
                                    │
                         populate L2, then L1
```

### Write Path with Consistency

```
  Write Request
       │
       ▼
  ┌─────────────────────┐
  │  Strategy choice:   │
  │                     │
  │  Strong required?   │──YES──► Write-Through (update cache + DB sync)
  │                     │         OR Tag-based invalidation
  │  Throughput first?  │──YES──► Write-Behind (cache first, async DB)
  │                     │
  │  General purpose?   │──YES──► Cache-Aside (DEL cache, update DB)
  └─────────────────────┘
```

---

## 10. Quick Decision Flowchart

```
                 ┌──────────────────────────────────┐
                 │  What problem are you solving?   │
                 └──────────────────┬───────────────┘
                                    │
         ┌──────────────────────────┼────────────────────────────┐
         │                          │                            │
         ▼                          ▼                            ▼
  "Cache has stale data"   "DB getting hammered          "Sudden DB spike"
  "write → cache sync"      by cache misses"
         │                          │                            │
         ▼                          ▼                            ▼
  ┌─────────────────┐      ┌─────────────────────┐   ┌───────────────────────┐
  │ Is consistency  │      │ Are keys non-existent│   │ Did many keys expire  │
  │ critical?       │      │ (attacker/bad input)?│   │ all at once?          │
  └────────┬────────┘      └──────────┬──────────┘   └──────────┬────────────┘
    YES    │    NO               YES  │  NO               YES   │   NO
     │     │     │                │   │   │                │    │    │
     ▼     ▼     ▼                ▼   ▼   ▼                ▼    ▼    ▼
  Write- Cache- Refresh        Bloom  Null TTL           Jitter Circuit Hot-key
  Through Aside  Ahead        Filter cache              + Warm  Breaker Stampede
                                                                       Mutex/Lock
```

---

## Summary

| Problem / Concept | One-liner |
|-------------------|-----------|
| **Cache-Aside** | App populates cache on miss; invalidates on write. Most common pattern. |
| **Write-Through** | Every write goes to cache AND DB synchronously — always consistent, slower writes. |
| **Write-Behind** | Write to cache only; DB updated async — fastest writes, risk of data loss. |
| **Refresh-Ahead** | Proactively refresh before TTL expires — zero miss latency at expiry. |
| **Cache Stampede** | Many concurrent misses on one hot key — fix with mutex or stale-while-revalidate. |
| **Cache Penetration** | Non-existent keys bypass cache — fix with Bloom filter or null caching. |
| **Cache Avalanche** | Mass simultaneous expiry hammers DB — fix with TTL jitter + circuit breaker. |
| **TTL Management** | TTL = staleness tolerance; use jitter, sliding TTL, and tiered TTLs. |
| **Data Consistency** | Choose AP (eventual) for social/content; CP (strong) for financial/booking. |

> **Golden Rule:** Defend in layers — Bloom Filter → L1 → L2 (Redis with jittered TTL + mutex) → Circuit Breaker → DB.  
> Never rely on a single mechanism. Production caches fail in ways you don't anticipate.

---

*Part of the [Distributed Cache](../Distributed Cache/README.md) series · [System Design](../README.md) reference.*
