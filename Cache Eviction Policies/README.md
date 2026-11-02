# Cache Eviction Policies

> When a cache is full, an **eviction policy** decides which existing entry to remove to make room for a new one.  
> Choosing the right policy directly impacts cache hit-rate, latency, and memory efficiency.

---

## Table of Contents

1. [Why Eviction Policies Matter](#why-eviction-policies-matter)
2. [LRU — Least Recently Used](#1-lru--least-recently-used)
3. [LFU — Least Frequently Used](#2-lfu--least-frequently-used)
4. [FIFO — First In First Out](#3-fifo--first-in-first-out)
5. [TTL — Time To Live](#4-ttl--time-to-live)
6. [Side-by-Side Comparison](#side-by-side-comparison)
7. [Which Policy for Which Scenario?](#which-policy-for-which-scenario)
8. [Combining Policies](#combining-policies)
9. [Quick Decision Flowchart](#quick-decision-flowchart)

---

## Why Eviction Policies Matter

```
┌─────────────────────────────────────────────────────────┐
│                        Cache                            │
│                                                         │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│   │  A   │  │  B   │  │  C   │  │  D   │  │  E   │   │
│   └──────┘  └──────┘  └──────┘  └──────┘  └──────┘   │
│                         FULL                            │
│                           │                             │
│              New request for key F arrives              │
│                           │                             │
│                           ▼                             │
│         Which entry do we kick out? ──► EVICTION        │
│                                          POLICY         │
└─────────────────────────────────────────────────────────┘
```

A poor eviction policy causes:
- **Cache thrashing** — entries evicted before they are reused
- **Stale data** served to users
- **Wasted memory** storing entries never accessed again

---

## 1. LRU — Least Recently Used

### How it works

Evicts the entry that was **accessed least recently**.  
Every read/write moves the key to the "most recently used" end.  
The key at the "least recently used" end is the eviction candidate.

### Internal Data Structure

```
Doubly Linked List + Hash Map  (O(1) get & put)

                 HEAD (MRU)                  TAIL (LRU)
                    │                            │
                    ▼                            ▼
  GET(D) ──►  [D] ↔ [B] ↔ [A] ↔ [C] ↔ [E]  ← evict next

  After GET(D):
                    │                            │
                    ▼                            ▼
               [D] ↔ [B] ↔ [A] ↔ [C] ↔ [E]

  Cache FULL → new key F arrives → evict E (LRU tail):
                    │
                    ▼
               [F] ↔ [D] ↔ [B] ↔ [A] ↔ [C]
```

### Step-by-Step Trace (capacity = 3)

```
Operation   Cache State (MRU → LRU)   Action
──────────  ────────────────────────  ──────────────────
PUT A       [A]                       Insert
PUT B       [B, A]                    Insert
PUT C       [C, B, A]                 Insert  (FULL)
GET A       [A, C, B]                 Hit  – A moves to front
PUT D       [D, A, C]                 Miss – evict B (LRU tail)
GET B       [B, D, A]                 Miss – B was evicted, reload
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Excellent for temporal locality | Extra memory for doubly-linked list + hash map |
| O(1) get & put with proper impl. | Scan-resistant problem (one large sequential scan pollutes cache) |
| Widely supported (Redis, Memcached) | Not ideal when frequency matters more than recency |
| Simple mental model | "LRU ghost" — hot keys can age out if access pattern cycles |

### Real-World Use Cases

| System | Why LRU? |
|--------|----------|
| **Web browser cache** | Recently visited pages likely to be revisited soon |
| **Database buffer pool** (PostgreSQL, InnoDB) | Recently read pages are hot |
| **CDN edge nodes** | Recently requested assets likely requested again |
| **DNS cache** | Recently resolved names tend to be queried repeatedly |
| **Redis** (`maxmemory-policy: allkeys-lru`) | General-purpose web app caching |

---

## 2. LFU — Least Frequently Used

### How it works

Evicts the entry that has been **accessed fewest times total**.  
Maintains a frequency counter per key.  
Ties in frequency are broken by recency (evict the older of the two).

### Internal Data Structure

```
Min-Heap of (frequency, timestamp) + Hash Map  (O(log n) or O(1) with frequency buckets)

Frequency Buckets:
  freq=1 : [E, D]      ← eviction candidates
  freq=3 : [B]
  freq=5 : [A, C]      ← hot keys, kept

  PUT F  → evict E (lowest freq, oldest among ties)
  freq=1 : [D, F]
  freq=3 : [B]
  freq=5 : [A, C]
```

### Step-by-Step Trace (capacity = 3)

```
Operation   Cache State {key:freq}        Action
──────────  ──────────────────────────    ──────────────────────
PUT A       {A:1}                         Insert
PUT B       {A:1, B:1}                    Insert
PUT C       {A:1, B:1, C:1}              Insert  (FULL)
GET A       {A:2, B:1, C:1}              Hit  – A freq++ 
GET A       {A:3, B:1, C:1}              Hit  – A freq++
GET B       {A:3, B:2, C:1}              Hit  – B freq++
PUT D       {A:3, B:2, D:1}              Miss – evict C (min freq=1)
GET C       —                             Miss – C was evicted, reload
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Protects truly hot keys from eviction | "Frequency pollution" — old popular keys block new trending items |
| Excellent for skewed access (80/20 rule) | More complex implementation |
| Scan-resistant | Slow start: new keys always begin at freq=1 and are vulnerable |
| Great cache hit-rate when access is stable | Requires aging mechanism to forget old counts |

### Real-World Use Cases

| System | Why LFU? |
|--------|----------|
| **YouTube / Netflix recommendation cache** | Trending videos accessed millions of times stay hot |
| **Search engine query cache** | Popular queries (google, weather, news) always hit |
| **E-commerce product catalog** | Bestsellers (iPhone, shoes) always in cache |
| **Ad-tech bid cache** | Top-performing ads fetched far more often than others |
| **Redis** (`maxmemory-policy: allkeys-lfu`) | Workloads with highly skewed key popularity |

---

## 3. FIFO — First In First Out

### How it works

Evicts the entry that was **inserted first**, regardless of how many times it was accessed.  
Implemented as a simple queue — enqueue on insert, dequeue on eviction.

### Internal Data Structure

```
Queue (circular buffer or linked list)

 Enqueue →  [ E | D | C | B | A ]  → Dequeue (evict)
             new                    oldest

Cache FULL → PUT F:
  Evict A (first inserted)
 Enqueue →  [ F | E | D | C | B ]
```

### Step-by-Step Trace (capacity = 3)

```
Operation   Cache State [oldest → newest]   Action
──────────  ──────────────────────────────  ──────────
PUT A       [A]                             Insert
PUT B       [A, B]                          Insert
PUT C       [A, B, C]                       Insert  (FULL)
GET A       [A, B, C]                       Hit  – position unchanged!
PUT D       [B, C, D]                       Miss – evict A (first in)
GET A       —                               Miss – A was evicted despite being accessed
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Simplest possible implementation | Ignores access frequency & recency — poor hit-rate |
| O(1) enqueue & dequeue | Evicts hot keys just because they are old |
| Predictable, deterministic | "Belady's Anomaly": more cache space can sometimes hurt hit-rate |
| No metadata overhead per entry | Rarely the best choice for general caching |
| Useful for fairness / ordering guarantees | Can't protect popular items from eviction |

### Real-World Use Cases

| System | Why FIFO? |
|--------|----------|
| **Message queues** (Kafka, RabbitMQ) | Order of processing must be preserved |
| **Printer / job queues** | Fair, ordered task scheduling |
| **Network packet buffers** | Routers drop oldest packets first under congestion |
| **Log rotation / ring buffers** | Oldest log entries overwritten by newest |
| **CDN prefetch queues** | Batch-loaded assets evicted in insertion order |

---

## 4. TTL — Time To Live

### How it works

Each cache entry has an **expiry timestamp**.  
When the TTL expires the entry is considered invalid and is evicted  
(either lazily on next access, or proactively by a background sweeper).

### Internal Data Structure

```
Hash Map + Min-Heap (expiry time) or Sorted Set

 Key  │ Value │  Inserted  │ TTL  │   Expires At
──────┼───────┼────────────┼──────┼─────────────
  A   │  v1   │ 10:00:00   │  60s │ 10:01:00  ← next to expire
  B   │  v2   │ 10:00:15   │ 120s │ 10:02:15
  C   │  v3   │ 10:00:30   │  30s │ 10:01:00  (tie with A)

Timeline:
  10:01:00 → A, C expire (removed by sweeper or on next GET)
  10:02:15 → B expires

  New entry D inserted with TTL=45s at 10:01:05:
  D expires at 10:01:50
```

### Lazy vs Eager Eviction

```
┌─────────────────────────────────────────────────────┐
│  LAZY  (on access)                                  │
│                                                     │
│  GET key ──► check expiry ──► expired? ──► evict   │
│                                        └──► return │
│  ✅ Simple    ❌ Stale entries linger in memory     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  EAGER  (background sweeper)                        │
│                                                     │
│  Timer thread ──► scan expiry heap ──► evict batch  │
│  ✅ Memory freed promptly  ❌ CPU overhead          │
└─────────────────────────────────────────────────────┘

Redis uses BOTH: lazy on access + probabilistic random sampling sweep.
```

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Prevents stale data automatically | TTL must be tuned carefully per use case |
| Works well with data that changes on a schedule | Short TTL = many cache misses; Long TTL = stale data |
| Simple to reason about (data freshness) | Does not consider access frequency or recency |
| Pairs well with LRU or LFU | "Thundering herd" on mass expiry — all keys expire together |
| Mandatory for auth tokens, session data | Not a full eviction policy alone (needs LRU/LFU when cache is full) |

### Real-World Use Cases

| System | Why TTL? |
|--------|----------|
| **Session tokens / JWT cache** | Must expire after 15 min / 1 hour for security |
| **API rate-limit counters** | Counter resets every minute/hour |
| **Stock price / exchange rate cache** | Prices stale after 1–5 seconds |
| **DNS TTL** | Records expire when upstream TTL dictates |
| **OTP / verification code cache** | Codes expire after 5–10 minutes |
| **Weather / sports score API cache** | Data refreshes every N seconds |

---

## Side-by-Side Comparison

```
┌─────────────┬──────────────┬──────────────┬───────────────┬──────────────┐
│  Property   │     LRU      │     LFU      │     FIFO      │     TTL      │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Evict based │  Recency of  │  Frequency   │  Insertion    │  Expiry      │
│ on          │  last access │  of access   │  order        │  timestamp   │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Data        │ DLL +        │ Freq buckets │ Queue /       │ HashMap +    │
│ structure   │ HashMap      │ + HashMap    │ Ring buffer   │ Min-heap     │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Complexity  │ O(1)         │ O(1)*        │ O(1)          │ O(log n)     │
│             │              │ (*with bkts) │               │ sweep        │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Memory      │ Medium       │ Higher       │ Lowest        │ Medium       │
│ overhead    │              │              │               │              │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Handles     │ ✅ Good      │ ✅ Excellent │ ❌ Poor       │ ➖ N/A       │
│ hot keys    │              │              │               │              │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Scan        │ ❌ Vulnerable│ ✅ Resistant │ ❌ Vulnerable │ ➖ N/A       │
│ resistance  │              │              │               │              │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Freshness   │ ❌ No expiry │ ❌ No expiry │ ❌ No expiry  │ ✅ Built-in  │
│ guarantee   │              │              │               │              │
├─────────────┼──────────────┼──────────────┼───────────────┼──────────────┤
│ Best fit    │ General web  │ Skewed/hot   │ Ordered jobs  │ Time-bound   │
│             │ caching      │ key workload │ & queues      │ data         │
└─────────────┴──────────────┴──────────────┴───────────────┴──────────────┘
```

---

## Which Policy for Which Scenario?

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SCENARIO                          │  RECOMMENDED POLICY                 │
├────────────────────────────────────┼─────────────────────────────────────┤
│  Web app page / object caching     │  LRU                                │
│  (users revisit recent content)    │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│  Video streaming (trending titles) │  LFU                                │
│  E-commerce (bestseller catalog)   │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│  Auth tokens / sessions            │  TTL (+ LRU for space management)   │
│  OTP codes / rate-limit windows    │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│  Message / job queues              │  FIFO                               │
│  Network packet buffers            │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│  Real-time prices / sports scores  │  TTL (short, 1–5 s)                 │
│  Financial tick data               │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│  Search engine query cache         │  LFU                                │
│  (power-law query distribution)    │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│  Database buffer pool              │  LRU (or LRU-K variant)             │
│  (InnoDB, PostgreSQL shared buf)   │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│  CDN / reverse proxy               │  LRU + TTL combined                 │
│  (recency + freshness both matter) │                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Combining Policies

In production systems, policies are almost always **combined**:

### LRU + TTL (most common)
```
  ┌────────────────────────────────────────────────┐
  │  Redis default config:                         │
  │  maxmemory-policy: allkeys-lru                 │
  │  + per-key EXPIRE (TTL)                        │
  │                                                │
  │  → TTL ensures data freshness                  │
  │  → LRU manages memory pressure                 │
  └────────────────────────────────────────────────┘
```

### LFU + TTL (trending content)
```
  ┌────────────────────────────────────────────────┐
  │  Used by: YouTube, Netflix, Spotify            │
  │  maxmemory-policy: allkeys-lfu                 │
  │  + TTL to expire season/event content          │
  │                                                │
  │  → LFU keeps evergreen popular content hot     │
  │  → TTL removes time-limited promotional items  │
  └────────────────────────────────────────────────┘
```

### Two-Level Cache (L1 + L2)
```
  Request
    │
    ▼
  ┌──────────────────┐     miss     ┌──────────────────┐
  │  L1: In-process  │ ──────────► │  L2: Redis/       │
  │  (LRU, small,    │             │  Memcached        │
  │   microseconds)  │ ◄─────────── │  (LRU+TTL, large, │
  └──────────────────┘    fill      │   milliseconds)  │
                                    └──────────────────┘
                                            │ miss
                                            ▼
                                       Database / Origin
```

---

## Quick Decision Flowchart

```
                     ┌──────────────────────────┐
                     │  Does the data have a     │
                     │  natural expiry / must    │
                     │  not be stale after T?    │
                     └────────────┬─────────────┘
                      YES         │         NO
              ┌─────────┘         │         └──────────────┐
              ▼                   │                         ▼
        Use TTL                   │            ┌────────────────────────┐
        (+ LRU for                │            │  Is access pattern     │
         memory mgmt)             │            │  highly skewed?        │
                                  │            │  (few keys >> rest)    │
                                  │            └──────────┬─────────────┘
                                  │             YES       │       NO
                                  │        ┌──────┘       │       └────────┐
                                  │        ▼              │                ▼
                                  │      Use LFU          │     ┌──────────────────┐
                                  │                       │     │  Is ordering /   │
                                  │                       │     │  fairness the    │
                                  │                       │     │  primary concern?│
                                  │                       │     └────────┬─────────┘
                                  │                       │    YES       │      NO
                                  │                       │   ┌───┘      │      └──┐
                                  │                       │   ▼          │         ▼
                                  │                       │  FIFO        │       Use LRU
                                  │                       │              │       (default)
                                  └───────────────────────┘
```

---

## Summary

| Policy | One-liner |
|--------|-----------|
| **LRU** | "If you haven't used it recently, you probably won't need it soon." |
| **LFU** | "If nobody uses it much, it doesn't deserve to stay." |
| **FIFO** | "First come, first served — oldest goes first, no favourites." |
| **TTL** | "All good things come to an end — data expires by the clock." |

> **Golden Rule:** Start with **LRU + TTL** for most production systems.  
> Switch to **LFU** when you observe cache pollution from scan workloads or highly skewed access.  
> Use **FIFO** only when ordering and simplicity matter more than hit-rate.

---

*Part of the [System Design](../README.md) reference series.*
