# Multi-Level Caching

> **Core idea:** No single cache layer is perfect. Each layer has different latency, capacity, and scope.  
> Stacking multiple layers — each catching what the layer above missed — maximises hit-rate while minimising cost and latency.

---

## Table of Contents

1. [Why Multi-Level Caching?](#1-why-multi-level-caching)
2. [The Full Cache Hierarchy](#2-the-full-cache-hierarchy)
3. [Browser Cache](#3-browser-cache)
4. [CDN Cache](#4-cdn-cache)
5. [Application Cache](#5-application-cache)
6. [Distributed Cache](#6-distributed-cache)
7. [Database Cache](#7-database-cache)
8. [Side-by-Side Comparison](#8-side-by-side-comparison)
9. [Which Layer for Which Scenario?](#9-which-layer-for-which-scenario)
10. [End-to-End Request Flow](#10-end-to-end-request-flow)
11. [Production Blueprint — YouTube-scale](#11-production-blueprint--youtube-scale)
12. [Quick Decision Guide](#12-quick-decision-guide)

---

## 1. Why Multi-Level Caching?

```
  Single-layer cache problems:

  ┌─────────────────────────────────────────────────────────────┐
  │  One Redis node per app:                                    │
  │    • Redis goes down → entire cache gone → DB hammered      │
  │    • Network hop to Redis = 0.5–2ms per request             │
  │    • All app instances share same cache = hot-key contention │
  └─────────────────────────────────────────────────────────────┘

  Multi-level cache solution:

  ┌─────────────────────────────────────────────────────────────┐
  │  L1 (browser)    : 0ms  — already on the user's device      │
  │  L2 (CDN)        : 5ms  — nearest edge PoP, no origin hit   │
  │  L3 (app-local)  : 0.1ms— in-process, no network at all     │
  │  L4 (Redis)      : 1ms  — shared across all app instances   │
  │  L5 (DB buffer)  : 5ms  — avoids disk read on hot pages     │
  │  L6 (DB disk)    : 50ms — source of truth, last resort      │
  └─────────────────────────────────────────────────────────────┘

  Each miss at layer N falls through to layer N+1.
  Most requests are served by L1/L2 — DB load drops by >95%.
```

### Cache Hit-Rate Impact

```
  Without caching:        100% DB reads   →  50ms avg latency
  L1 only (browser):       60% DB reads   →  30ms avg latency
  L1 + CDN:                20% DB reads   →  10ms avg latency
  L1 + CDN + App + Redis:   2% DB reads   →   1ms avg latency
  Full stack:              ~1% DB reads   → <1ms avg latency
```

---

## 2. The Full Cache Hierarchy

```
  USER DEVICE
  ┌───────────────────────────────────────────────────────────────┐
  │  L1: Browser Cache                                            │
  │      Storage: Local disk / memory    Latency: 0ms             │
  │      Scope: Single user session      TTL: seconds to days     │
  └───────────────────────────────┬───────────────────────────────┘
                    MISS           │
                                   ▼
  EDGE NETWORK (closest PoP)
  ┌───────────────────────────────────────────────────────────────┐
  │  L2: CDN Cache (Cloudflare, Akamai, CloudFront)               │
  │      Storage: SSD at edge nodes     Latency: 5–20ms           │
  │      Scope: Shared across all users TTL: minutes to days      │
  └───────────────────────────────┬───────────────────────────────┘
                    MISS           │
                                   ▼
  APPLICATION SERVER
  ┌───────────────────────────────────────────────────────────────┐
  │  L3: Application / In-Process Cache                           │
  │      Storage: JVM Heap / process RAM Latency: 0.01–0.1ms     │
  │      Scope: Single app instance      TTL: seconds to minutes  │
  └───────────────────────────────┬───────────────────────────────┘
                    MISS           │
                                   ▼
  CACHE CLUSTER
  ┌───────────────────────────────────────────────────────────────┐
  │  L4: Distributed Cache (Redis / Memcached Cluster)            │
  │      Storage: RAM across N nodes    Latency: 0.5–2ms          │
  │      Scope: Shared across ALL app   TTL: seconds to hours     │
  │             instances                                         │
  └───────────────────────────────┬───────────────────────────────┘
                    MISS           │
                                   ▼
  DATABASE LAYER
  ┌───────────────────────────────────────────────────────────────┐
  │  L5: Database Buffer / Query Cache                            │
  │      Storage: DB server RAM         Latency: 1–10ms           │
  │      Scope: DB server-local          TTL: managed by DB engine│
  └───────────────────────────────┬───────────────────────────────┘
                    MISS           │
                                   ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  L6: Persistent Storage (Disk / SSD)                          │
  │      Storage: HDD / NVMe SSD        Latency: 10–100ms         │
  │      Source of truth                                          │
  └───────────────────────────────────────────────────────────────┘
```

---

## 3. Browser Cache

### How It Works

```
  First Request (cache COLD):

  Browser ──── GET /logo.png ────────────────────────► Server
  Browser ◄─── 200 OK + body + Cache-Control headers ─ Server
               Store in local cache

  Second Request (cache WARM):

  Browser ──── Check local cache ─────────────────────────────
               Cache-Control: max-age=86400 (24h)
               Age of cached copy = 2h  →  still valid!
  Browser ◄─── Serve from local cache  (0 network round-trip) ✅

  Conditional Request (cache STALE):

  Browser ──── GET /logo.png + If-None-Match: "abc123" ──► Server
  Browser ◄─── 304 Not Modified (no body) ──────────────── Server
               Re-validate cached copy, reset max-age
```

### Key HTTP Cache-Control Headers

```
┌──────────────────────────────────────────────────────────────────────┐
│  Header                      │  Meaning                              │
├──────────────────────────────┼───────────────────────────────────────┤
│  Cache-Control: max-age=3600 │  Cache for 3600s from response time   │
│  Cache-Control: no-cache     │  Revalidate with server on every use  │
│  Cache-Control: no-store     │  Never cache (sensitive data)         │
│  Cache-Control: private      │  Browser only — not CDN/proxy         │
│  Cache-Control: public       │  CDN + browser can both cache         │
│  Cache-Control: immutable    │  Content will never change, no recheck│
│  ETag: "abc123"              │  Content fingerprint for revalidation │
│  Last-Modified: Thu, ...     │  Timestamp for If-Modified-Since      │
│  Vary: Accept-Encoding       │  Different cache per encoding type    │
└──────────────────────────────┴───────────────────────────────────────┘
```

### Browser Cache Storage Types

```
  ┌──────────────────┬────────────────────────────────────────────────┐
  │  Storage Type    │  Contents                                      │
  ├──────────────────┼────────────────────────────────────────────────┤
  │  HTTP Cache      │  GET responses (HTML, CSS, JS, images, JSON)   │
  │  Memory Cache    │  In-tab assets (JS/CSS from current session)   │
  │  Service Worker  │  Programmatic cache (offline, PWA support)     │
  │  LocalStorage    │  App data (key-value, JS-managed, no expiry)   │
  │  SessionStorage  │  Session-scoped app data                       │
  │  IndexedDB       │  Large structured data (offline-first apps)    │
  └──────────────────┴────────────────────────────────────────────────┘
```

### Cache Busting

```
  Problem: deployed new JS bundle but users have old version cached.

  Solution — content-addressed filenames:

  OLD (bad):   /app.js          Cache-Control: max-age=86400
               Browser caches /app.js — next deploy, still serves old file!

  NEW (good):  /app.a3f92bc.js  Cache-Control: max-age=31536000, immutable
               Hash in filename changes on every deploy → forces new download
               Old hash URL → 404 or stale (irrelevant — HTML references new hash)
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Zero network latency — served from local disk/memory | Per-user — no sharing across users |
| Reduces server bandwidth and cost | Stale data if TTL/invalidation not managed carefully |
| Works offline (Service Worker) | Browser cache limits (50–400 MB depending on browser) |
| Automatic via HTTP headers | Cannot invalidate proactively — must wait for TTL or use cache-busting |
| Reduces page load time significantly | Private data must use `Cache-Control: private` |

### Real-World Use Cases

| System | Browser Cache Usage |
|--------|-------------------|
| **Google Search** | Fonts, icons, shared JS: `max-age=31536000, immutable` |
| **Facebook** | Hashed static assets (CSS/JS) with 1-year TTL |
| **Gmail** | Service Worker for offline inbox access |
| **Twitter** | API responses cached in-memory (memory cache) for timeline |
| **Netflix** | Player JS bundles, content thumbnails |

---

## 4. CDN Cache

### How It Works

```
  CDN Network (Points of Presence — PoPs):

  Mumbai User ──► Mumbai PoP ──► [cache hit] → serve instantly
                                  [miss]     → Origin Server (US)
                                               → store in PoP cache
                                               → serve to user

  London User ──► London PoP ──► [cache hit] → serve instantly
  (same content) → served from London PoP, NOT from origin

  Without CDN:                  With CDN:
  Mumbai → US = 200ms RTT       Mumbai → Mumbai PoP = 5ms RTT
  London → US = 80ms RTT        London → London PoP = 3ms RTT
```

### CDN Request Flow Diagram

```
  ┌──────────┐   GET /video.mp4   ┌──────────────────────┐
  │  User    │ ─────────────────► │  CDN Edge (nearest   │
  │ (Mumbai) │                    │  PoP, Mumbai)        │
  │          │                    │                      │
  │          │ ◄── 200 + content ─│  [CACHE HIT]         │
  └──────────┘                    └──────────────────────┘

  [CACHE MISS scenario]:
  ┌──────────┐        miss        ┌────────────────────┐        fetch       ┌──────────────┐
  │  User    │ ─────────────────► │  CDN Edge (Mumbai) │ ────────────────► │ Origin Server│
  │ (Mumbai) │                    │                    │                    │  (US)        │
  │          │ ◄─ serve + cache ──│  store response    │ ◄── 200 + content ─│              │
  └──────────┘                    └────────────────────┘                    └──────────────┘

  Next request from ANY user in Mumbai → CDN cache HIT, origin never called again.
```

### CDN Caching Rules

```
  Edge cache respects:
  • Cache-Control: public, max-age=86400  → CDN caches for 24h
  • Cache-Control: private               → CDN does NOT cache
  • Surrogate-Control: max-age=3600      → CDN-specific TTL (overrides CC)
  • Vary: Accept-Language                → different cache entry per language

  Manual Purge:
  • Cloudflare: POST /zones/{id}/purge_cache (by URL or tag)
  • CloudFront: Invalidation API
  • Akamai: Fast Purge API (<5s propagation globally)
```

### CDN Cache Tiers

```
  ┌─────────────────────────────────────────────────────────────┐
  │  Tiered CDN Caching (Cloudflare Tiered Cache):              │
  │                                                             │
  │  Origin Server                                              │
  │       │                                                     │
  │       ▼                                                     │
  │  Upper Tier PoP (regional hub, e.g., London)                │
  │  (caches aggressively, serves lower tiers)                  │
  │       │                                                     │
  │  ┌────┴────────────────────────────────┐                   │
  │  ▼              ▼              ▼        ▼                   │
  │ Paris PoP   Berlin PoP   Warsaw PoP  Stockholm PoP          │
  │ (lower tier edge nodes serve end users)                     │
  │                                                             │
  │  Miss at edge → upper tier (not origin!) → much cheaper     │
  └─────────────────────────────────────────────────────────────┘
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Global distribution — serve from nearest PoP | Cost: CDN bandwidth + request pricing |
| Absorbs massive traffic spikes (DDoS mitigation) | Stale content until TTL expires or manual purge |
| Reduces origin server load by 80–99% | Dynamic, personalised content cannot be CDN-cached |
| Built-in DDoS protection and WAF | Cache invalidation propagation takes seconds to minutes |
| Zero app-side code changes (HTTP headers only) | Debugging cache misses requires CDN tooling |
| Supports video streaming (HLS/DASH chunked caching) | Purge APIs have rate limits |

### Real-World Use Cases

| System | CDN Usage |
|--------|----------|
| **Netflix** | Static assets + video segments via Open Connect CDN |
| **YouTube** | Video chunks cached at edge PoPs globally |
| **GitHub** | Code tarballs, release assets via Fastly |
| **Cloudflare Workers** | Edge-computed dynamic responses (KV cache) |
| **Amazon CloudFront** | S3 static websites, Lambda@Edge |
| **Akamai** | Enterprise media, streaming (60%+ of internet traffic) |

---

## 5. Application Cache

### How It Works

```
  In-process cache lives inside the application JVM / process heap.
  No network round-trip — reads are nanoseconds to microseconds.

  ┌─────────────────────────────────────────────────────────────┐
  │  App Server Process                                         │
  │                                                             │
  │   ┌──────────────────────────────────────┐                 │
  │   │  Business Logic Layer                │                 │
  │   │      │                               │                 │
  │   │      ▼                               │                 │
  │   │  ┌──────────────────────────────┐   │                 │
  │   │  │   L1 Cache (Caffeine/Guava)  │   │                 │
  │   │  │   ~100–500 MB heap           │   │                 │
  │   │  │   LRU / W-TinyLFU eviction   │   │                 │
  │   │  │   TTL: 5–60 seconds          │   │                 │
  │   │  └──────────────┬───────────────┘   │                 │
  │   │                 │ miss              │                 │
  │   └─────────────────┼───────────────────┘                 │
  │                     │                                      │
  │                     ▼                                      │
  │                Redis / DB (external)                       │
  └─────────────────────────────────────────────────────────────┘

  Latency: ~0.1μs (nanoseconds) vs Redis: ~500μs (microseconds)
  = 5000x faster than Redis for hot keys
```

### Cache Libraries by Platform

```
┌──────────────┬────────────────────────────────────────────────────┐
│  Platform    │  Library / Tool                                    │
├──────────────┼────────────────────────────────────────────────────┤
│  Java / JVM  │  Caffeine (W-TinyLFU, best hit-rate),              │
│              │  Guava Cache, Ehcache, Hazelcast Near Cache        │
├──────────────┼────────────────────────────────────────────────────┤
│  Python      │  functools.lru_cache, cachetools, dogpile.cache    │
├──────────────┼────────────────────────────────────────────────────┤
│  Node.js     │  node-lru-cache, memory-cache                      │
├──────────────┼────────────────────────────────────────────────────┤
│  Go          │  groupcache, ristretto (Dgraph), bigcache          │
├──────────────┼────────────────────────────────────────────────────┤
│  .NET        │  IMemoryCache, System.Runtime.Caching              │
├──────────────┼────────────────────────────────────────────────────┤
│  Ruby        │  Rails.cache (:memory_store)                       │
└──────────────┴────────────────────────────────────────────────────┘
```

### Hot Key Problem — Why L3 Matters

```
  Hot key scenario: "product:iphone15" — 10,000 RPS

  WITHOUT app cache:
    10,000 RPS → all hit Redis → Redis hotspot → latency spike

  WITH app cache (TTL=5s, capacity=1000 hot keys):
    10,000 RPS × 5s = 50,000 requests per TTL window
    All 50,000 served from in-process cache (0 Redis calls!)
    Redis: 1 call per 5s for this key (from 10,000 → 1!)

  Per-instance isolation means:
    Each of 50 app servers caches independently → no shared contention
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Nanosecond latency — no network hop | Per-instance — not shared across app servers |
| Eliminates hot-key contention on Redis | Stale data: different instances may have different cached values |
| Zero infrastructure cost (uses existing JVM heap) | Uses application memory — competes with heap for GC pressure |
| Ideal for static/slow-changing data (config, enums) | Cache not persisted — lost on app restart |
| Works as a "near cache" shield for Redis | Small capacity — typically 100–500 MB |

### Real-World Use Cases

| System | App Cache Usage |
|--------|---------------|
| **Twitter** | In-process cache for user auth tokens, rate-limit counters |
| **LinkedIn** | Near-cache for member profile fragments (Caffeine) |
| **Uber** | In-process config/feature flag cache (updated every 30s) |
| **Netflix** | Zuul API Gateway: in-process route cache |
| **Shopify** | Rails `:memory_store` for shop config, theme settings |

---

## 6. Distributed Cache

### How It Works

```
  Shared in-memory cache cluster accessible by ALL app instances:

  App Server 1 ─┐
  App Server 2 ─┤──► Redis Cluster ──► consistent hash → shard N
  App Server 3 ─┤                      shard N → Master (+ replicas)
  App Server 4 ─┘

  Any app instance writing key "user:101" → same Redis shard
  Any app instance reading key "user:101" → same Redis shard
  → All instances see the same data → no stale divergence

  Capacity: scales horizontally (add shards, add RAM)
  Typical: 3–100 nodes, 64–512 GB RAM per node
```

### Redis Cluster Architecture

```
  ┌─────────────────────────────────────────────────────────────┐
  │                     Redis Cluster                           │
  │                                                             │
  │  16,384 hash slots distributed across N masters:            │
  │                                                             │
  │  Master 1          Master 2          Master 3               │
  │  slots 0–5460      slots 5461–10922  slots 10923–16383      │
  │     │                   │                   │               │
  │  Replica 1A          Replica 2A          Replica 3A         │
  │  Replica 1B          Replica 2B          Replica 3B         │
  │                                                             │
  │  Gossip protocol — all nodes aware of cluster state         │
  │  Automatic failover: replica promoted in ~5–10s             │
  └─────────────────────────────────────────────────────────────┘
```

### Data Structures in Distributed Cache

```
┌──────────────────────┬──────────────────────────────────────────────┐
│  Data Structure      │  Use Case                                    │
├──────────────────────┼──────────────────────────────────────────────┤
│  String              │  Simple key-value, JSON blobs, counters       │
│  Hash                │  User objects, session data (field-level TTL) │
│  List                │  Activity feeds, message queues               │
│  Set                 │  Tags, unique visitors, friend lists          │
│  Sorted Set (ZSet)   │  Leaderboards, rate limiters, priority queues │
│  Bitmap              │  Feature flags per user-id, daily active users│
│  HyperLogLog         │  Approximate unique count (UV counting)       │
│  Stream              │  Event log, pub-sub messaging                 │
└──────────────────────┴──────────────────────────────────────────────┘
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Shared across ALL app instances — consistent view | Network round-trip: 0.5–2ms per call |
| Horizontally scalable — add nodes for more RAM/RPS | Infrastructure cost (RAM expensive) |
| Rich data structures (sorted sets, streams, etc.) | Hot-key problem: single shard bottleneck |
| Persistence options (RDB snapshots, AOF logs) | Operational complexity: cluster management |
| Pub/Sub, Lua scripting, atomic transactions | Not suitable for very large values (>1 MB) |
| Battle-tested (Redis used by virtually every major tech company) | Replication lag → slight inconsistency on replica reads |

### Real-World Use Cases

| System | Distributed Cache Usage |
|--------|------------------------|
| **Twitter** | Timeline cache, tweet object store |
| **Instagram** | Photo metadata, follow graph, feed cache |
| **Airbnb** | Search result cache, pricing cache |
| **Stack Overflow** | Question/answer HTML fragments (serialised) |
| **Slack** | Channel member lists, presence data |
| **Uber** | Surge pricing data, driver location cache |

---

## 7. Database Cache

### How It Works

```
  Database engines maintain their own internal memory caches
  to avoid expensive disk I/O for hot data pages.

  ┌──────────────────────────────────────────────────────────────┐
  │  PostgreSQL / MySQL / InnoDB Architecture                    │
  │                                                              │
  │  ┌───────────────────────────────────────────────────────┐  │
  │  │  Shared Buffer Pool (RAM — typically 25% of server RAM)│  │
  │  │                                                       │  │
  │  │  Page 1 │ Page 2 │ Page 3 │ ... │ Page N             │  │
  │  │  (8 KB  │ each)                                       │  │
  │  └──────────────────────────┬────────────────────────────┘  │
  │                             │ MISS                          │
  │                             ▼                               │
  │  ┌──────────────────────────────────────────────────────┐   │
  │  │  OS Page Cache (kernel RAM)                          │   │
  │  │  (second layer before disk)                          │   │
  │  └──────────────────────────┬───────────────────────────┘   │
  │                             │ MISS                          │
  │                             ▼                               │
  │  ┌──────────────────────────────────────────────────────┐   │
  │  │  Disk / SSD (NVMe)                                   │   │
  │  └──────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────┘
```

### Types of Database Cache

#### a) Buffer Pool (InnoDB / PostgreSQL Shared Buffers)

```
  Caches raw 8 KB data pages in RAM.
  Uses LRU-like algorithm (InnoDB: old/young sub-lists).

  SELECT * FROM users WHERE id=101
  → Hash(page_id) → buffer pool lookup
  → HIT: return page from RAM (μs)
  → MISS: read page from disk (ms) → load into buffer pool

  Config:
    PostgreSQL: shared_buffers = 8GB (set to 25% of server RAM)
    MySQL InnoDB: innodb_buffer_pool_size = 8G
```

#### b) Query Result Cache

```
  Caches the RESULT of a SQL query, not just the data page.

  App → SELECT count(*) FROM orders WHERE status='paid' AND date=TODAY
       → Query cache: key = hash(SQL + params)
       → HIT: return cached count immediately
       → MISS: execute full table scan → cache result with TTL

  ⚠️ MySQL Query Cache (removed in 8.0): notorious for mutex contention
  ✅ Application-level query caching (Redis) is preferred today
```

#### c) Connection Pool Cache

```
  DB connection setup = expensive (TLS handshake, auth, session init)
  Connection pool reuses live connections:

  ┌────────────────────────────────────────────────────┐
  │  PgBouncer / HikariCP Connection Pool              │
  │                                                    │
  │  App request → grab idle connection from pool      │
  │  Execute query → return connection to pool         │
  │                                                    │
  │  Without pool: 5–50ms per connection setup         │
  │  With pool:    ~0ms (connection reused)            │
  └────────────────────────────────────────────────────┘
```

#### d) Index Cache (B-Tree Nodes in RAM)

```
  B-Tree index nodes are also kept in buffer pool.
  Frequently accessed index pages (root, upper levels) stay hot in RAM.

  Ideal scenario:
    Entire index fits in buffer pool → ALL index lookups: RAM-speed
    Only leaf-level data pages occasionally go to disk.
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Transparent — no app code changes required | Limited to DB server's RAM |
| Automatically managed by DB engine | Shared across all queries — hot queries evict cold ones |
| Index + data page caching is extremely effective | Cannot cache computed/aggregated results efficiently |
| Reduces disk I/O by 90%+ for OLTP workloads | Restarting DB cold-starts the buffer pool |
| Warm buffer pool = consistent low-latency queries | Not accessible by app layer for custom logic |

### Real-World Use Cases

| System | DB Cache Usage |
|--------|---------------|
| **MySQL InnoDB** | `innodb_buffer_pool_size` = 60–80% of DB server RAM for OLTP |
| **PostgreSQL** | `shared_buffers` = 25% RAM + OS page cache as second level |
| **Oracle** | SGA (System Global Area) — DB block buffer cache |
| **PgBouncer** (Airbnb, GitHub) | Connection pooling — 1000s of app connections → 100 DB connections |
| **Redis (DB-side)** | App-level query result caching instead of native DB query cache |

---

## 8. Side-by-Side Comparison

```
┌──────────────┬──────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  Property    │   Browser    │     CDN     │   App Cache │ Distributed │  DB Cache   │
│              │   Cache      │   Cache     │  (In-proc)  │   Cache     │  (Buffer)   │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Latency      │ 0 ms         │ 5–20 ms     │ 0.01–0.1 ms │ 0.5–2 ms    │ 1–5 ms      │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Scope        │ One user     │ All users   │ One server  │ All servers │ DB server   │
│              │              │ globally    │ instance    │ (shared)    │ only        │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Capacity     │ 50–400 MB    │ PB (CDN     │ 100–500 MB  │ TBs (across │ Configured  │
│              │ per browser  │ network)    │ per instance│ cluster)    │ RAM size    │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Content type │ Static assets│ Static +    │ Any (app-   │ Any key-    │ DB pages,   │
│              │ (JS,CSS,img) │ semi-dynamic│ managed)    │ value data  │ index nodes │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Invalidation │ TTL / ETag / │ TTL / API   │ TTL / evict │ TTL / DEL / │ Automatic   │
│              │ Service Wkr  │ purge       │ on code     │ LRU         │ (LRU-like)  │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Shared across│ ❌ No        │ ✅ Yes      │ ❌ No       │ ✅ Yes      │ ❌ No       │
│ users        │              │             │             │             │             │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Handles      │ ❌ No        │ ⚠️ Vary     │ ❌ No       │ ✅ Yes      │ ❌ No       │
│ personalised │              │ header      │             │             │             │
│ content      │              │             │             │             │             │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Infra cost   │ Free         │ Medium–High │ Free        │ Medium–High │ Free        │
│              │ (user device)│             │ (app RAM)   │ (cluster)   │ (DB RAM)    │
├──────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Requires code│ Headers only │ Headers /   │ Yes (lib    │ Yes (client │ No          │
│ changes      │              │ CDN config  │ integration)│ integration)│             │
└──────────────┴──────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## 9. Which Layer for Which Scenario?

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO                                   │  BEST CACHE LAYER(S)                │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  Static assets (JS, CSS, images, fonts)     │  Browser + CDN                      │
│  Never change, versioned by content hash    │                                     │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  Video / large media streaming              │  CDN (chunked HLS/DASH)             │
│  (YouTube, Netflix)                         │                                     │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  Personalised user feed / timeline          │  App Cache (L3) + Distributed (L4)  │
│  (Twitter, Instagram)                       │  Browser: no (user-specific)        │
│                                             │  CDN: no (private data)             │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  Product catalog, public pricing            │  CDN + Distributed Cache            │
│  (Amazon, Shopify)                          │  (same for all users → CDN ok)      │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  User session / auth token                  │  Distributed Cache (Redis)          │
│                                             │  (shared across app instances)      │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  Hot DB query results (dashboard counts)    │  App Cache (short TTL) +            │
│                                             │  Distributed Cache (longer TTL)     │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  Config / feature flags                     │  App Cache (in-process, ~30s TTL)   │
│  (rarely changes)                           │  + Distributed as source            │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  Leaderboard / sorted rankings              │  Distributed Cache (Redis ZSet)     │
│  (real-time sorted data)                    │                                     │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  OLTP hot rows (user accounts, products)    │  DB Buffer Pool (automatic)         │
│  (DB read-intensive)                        │  + Distributed Cache above it       │
├─────────────────────────────────────────────┼─────────────────────────────────────┤
│  API responses for public endpoints         │  CDN + App Cache                    │
│  (news, weather, sports scores)             │  (CDN for edge, App for hot keys)   │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. End-to-End Request Flow

### Scenario: User loads Instagram profile page

```
  User in Mumbai opens @virat.kohli profile

  ─────────────────────────────────────────────────────────────────────────────
  Step 1: Static assets (profile photo, CSS, JS)

    Browser ──► Check browser cache
      HIT  → 0ms  → assets served instantly from local disk ✅
      MISS → CDN Mumbai PoP
               HIT  → 10ms → served from edge ✅
               MISS → Origin (US) → 200ms → cached at PoP for next user
  ─────────────────────────────────────────────────────────────────────────────
  Step 2: API call — GET /api/profile/virat.kohli

    Browser ──► App Server
                  │
                  ▼
             App Cache (Caffeine, TTL=30s)
               HIT  → 0.05ms → return profile JSON ✅
               MISS ───────────────────────────────────────────────┐
                                                                   ▼
                                                         Redis Cluster
                                                           HIT  → 1ms  → return ✅
                                                           MISS → DB
                                                                   │
                                                          PostgreSQL Buffer Pool
                                                           HIT  → 2ms  → return ✅
                                                           MISS → disk read 10ms
                                                                  → populate all layers
  ─────────────────────────────────────────────────────────────────────────────
  Step 3: Subsequent requests from 1M concurrent users for same profile

    999,998 users ──► Browser cache (if cached) or CDN (if static)
            +  ──► App Cache on their assigned app server
                   (each of 50 app servers caches locally — 50 DB calls max!)

    DB query rate: 50 calls/30s (one per app server per TTL window)
    NOT 1,000,000 calls → DB completely shielded ✅
  ─────────────────────────────────────────────────────────────────────────────
```

---

## 11. Production Blueprint — YouTube-scale

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  ┌──────────┐  0ms   ┌───────────────────────────────────────────────┐ │
  │  │ Browser  │───────►│ Service Worker Cache (offline, PWA)           │ │
  │  │ Cache    │        │ HTTP Cache (JS, CSS, thumbnails)              │ │
  │  └──────────┘        └─────────────────────────────┬─────────────────┘ │
  │                                              MISS   │                   │
  │                                                     ▼                   │
  │  ┌──────────┐  5ms   ┌───────────────────────────────────────────────┐ │
  │  │   CDN    │───────►│ Cloudflare / Akamai Edge PoPs (200+ locations)│ │
  │  │  Cache   │        │ Video segments, thumbnails, public API resp.  │ │
  │  └──────────┘        └─────────────────────────────┬─────────────────┘ │
  │                                              MISS   │                   │
  │                                                     ▼                   │
  │  ┌──────────┐  0.1ms ┌───────────────────────────────────────────────┐ │
  │  │   App    │───────►│ Caffeine / Ristretto in-process cache         │ │
  │  │  Cache   │        │ Hot keys: config, user prefs, feature flags   │ │
  │  └──────────┘        └─────────────────────────────┬─────────────────┘ │
  │                                              MISS   │                   │
  │                                                     ▼                   │
  │  ┌──────────┐  1ms   ┌───────────────────────────────────────────────┐ │
  │  │Distributed│──────►│ Redis Cluster (3 shards × 3 nodes)            │ │
  │  │  Cache   │        │ User sessions, feed data, watch history       │ │
  │  └──────────┘        │ Eviction: LRU + jittered TTL                  │ │
  │                       └─────────────────────────────┬─────────────────┘ │
  │                                              MISS   │                   │
  │                                                     ▼                   │
  │  ┌──────────┐  2ms   ┌───────────────────────────────────────────────┐ │
  │  │   DB     │───────►│ PostgreSQL / MySQL shared_buffers             │ │
  │  │  Cache   │        │ + OS Page Cache                               │ │
  │  └──────────┘        └─────────────────────────────┬─────────────────┘ │
  │                                              MISS   │                   │
  │                                                     ▼                   │
  │                              ┌───────────────────────────────────────┐  │
  │                              │ NVMe SSD / Distributed Storage        │  │
  │                              │ (Bigtable, Spanner, Cassandra)        │  │
  │                              └───────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────────────┘

  Overall hit rate: >99% requests never reach disk
  Effective latency: <2ms for cached content
```

### Write Path (Cache Invalidation)

```
  User uploads new video / updates profile:
       │
       ▼
  DB Write (source of truth)
       │
       ├──► DEL Redis key (distributed cache invalidated)
       │
       ├──► CDN purge API (edge cache purged for that URL)
       │
       └──► App cache: TTL-based expiry (5–30s eventual)
            (or explicit evict if write-through used)

  Browser cache: content-hashed URLs → old URL never changes
                 new content gets new URL → new browser cache entry
```

---

## 12. Quick Decision Guide

```
  Question 1: Is the content STATIC (same for all users)?
    YES ──► Browser Cache + CDN Cache
    NO  ──► Continue to Q2

  Question 2: Is it a SHARED resource (all users request same data)?
    YES ──► CDN (if public) + Distributed Cache (if auth-required)
    NO  ──► Continue to Q3

  Question 3: Is it a HOT KEY (millions of RPS for same key)?
    YES ──► App Cache (L3 near-cache) in front of Distributed Cache
    NO  ──► Continue to Q4

  Question 4: Is it user-session / cross-instance shared state?
    YES ──► Distributed Cache (Redis)
    NO  ──► Continue to Q5

  Question 5: Is it a heavy DB query on frequently-read rows?
    YES ──► DB Buffer Pool (ensure buffer pool sized correctly)
            + Application-level query result cache (Redis)
    NO  ──► No caching needed — query DB directly

  General rule: LAYER them.
    Static    = Browser + CDN
    Shared    = Distributed Cache
    Hot keys  = App Cache in front of Distributed
    DB heavy  = Tune buffer pool + app query cache
```

---

## Summary

| Cache Layer | One-liner |
|-------------|-----------|
| **Browser Cache** | Fastest possible — 0ms, per-user, HTTP headers control it. |
| **CDN Cache** | Global edge — same content served to millions from nearest PoP. |
| **Application Cache** | In-process near-cache — shields Redis from hot-key hammering. |
| **Distributed Cache** | Shared memory across all app instances — sessions, feeds, computed data. |
| **Database Cache** | DB engine's own RAM buffer — transparent, reduces disk I/O by 90%+. |

> **Golden Rule:** Layer all five. Each layer catches what the one above missed.  
> Design the write path as carefully as the read path — stale data is the price of every cache hit.

---

*Part of the [System Design](../README.md) reference series.*
