# Cache Partitioning / Sharding — Deep Dive

> **Core problem:** A single cache node has finite RAM and is a Single Point of Failure.  
> Partitioning splits data across many nodes. The hard part is *how* to split — and what happens when nodes join or leave.

---

## Table of Contents

1. [Why Partition a Cache?](#1-why-partition-a-cache)
2. [Naive Modulo Hashing — and why it fails](#2-naive-modulo-hashing--and-why-it-fails)
3. [Consistent Hashing](#3-consistent-hashing)
4. [Hash Ring](#4-hash-ring)
5. [Virtual Nodes (vnodes)](#5-virtual-nodes-vnodes)
6. [Redis Cluster](#6-redis-cluster)
7. [Replication](#7-replication)
8. [Side-by-Side Comparison](#8-side-by-side-comparison)
9. [Which Strategy for Which Scenario?](#9-which-strategy-for-which-scenario)
10. [Combining Strategies — Production Blueprint](#10-combining-strategies--production-blueprint)
11. [Quick Decision Flowchart](#11-quick-decision-flowchart)

---

## 1. Why Partition a Cache?

```
┌───────────────────────────────────────────────────────────┐
│  Single Node Cache                                        │
│                                                           │
│   App ──► [ Redis / Memcached ]  64 GB RAM               │
│                   │                                       │
│         PROBLEMS:                                         │
│         • Memory cap → can only cache 64 GB of data      │
│         • SPOF → if node dies, entire cache is gone       │
│         • Throughput cap → single process bottleneck      │
└───────────────────────────────────────────────────────────┘

                        ▼  Partition / Shard  ▼

┌───────────────────────────────────────────────────────────┐
│  Partitioned Cache Cluster                                │
│                                                           │
│   App ──► [ Routing Layer ]                              │
│                │                                          │
│       ┌────────┼────────┐                                │
│       ▼        ▼        ▼                                │
│    [Node 1]  [Node 2]  [Node 3]    each 64 GB RAM        │
│    64 GB     64 GB     64 GB                              │
│    Total: 192 GB cache, 3× throughput                    │
└───────────────────────────────────────────────────────────┘
```

**Goals of partitioning:**
- Scale memory beyond a single machine
- Distribute request load
- Eliminate single points of failure (when combined with replication)
- Allow rolling upgrades without full outages

---

## 2. Naive Modulo Hashing — and why it fails

### How it works

```
node_index = hash(key) % N          (N = number of nodes)

Example with N=3:
  hash("user:101") % 3  =  1  → Node 1
  hash("user:202") % 3  =  2  → Node 2
  hash("user:303") % 3  =  0  → Node 0
```

### The catastrophic reshuffling problem

```
BEFORE (N=3):                       AFTER adding 1 node (N=4):

  Key            Node               Key            Node    Changed?
  "user:101"  →  1                  "user:101"  →  1       ✅ same
  "user:202"  →  2                  "user:202"  →  2       ✅ same
  "user:303"  →  0                  "user:303"  →  3       ❌ moved!
  "user:404"  →  1                  "user:404"  →  0       ❌ moved!
  "user:505"  →  2                  "user:505"  →  1       ❌ moved!
  "user:606"  →  0                  "user:606"  →  2       ❌ moved!

  ~75% of ALL keys must be remapped when a single node is added/removed!
```

### Pros & Cons of Modulo Hashing

| ✅ Pros | ❌ Cons |
|---------|---------|
| Trivial to implement | Massive key reshuffling on any topology change |
| Uniform distribution (ideally) | Entire cache effectively invalidated on node add/remove |
| Zero extra infrastructure | Not suitable for dynamic / auto-scaling environments |
| Works fine for static, fixed-size clusters | Cache stampede risk during reshuffling |

### Real-World Use

| Use case | Notes |
|----------|-------|
| **Small static clusters** | Works if N never changes (e.g., 3-node fixed setup) |
| **Memcached clients** (old `libmemcached` without ketama) | Legacy deployments |
| **Database read replicas** | Fixed replica count, rarely changed |

---

## 3. Consistent Hashing

### Core Idea

Map **both nodes and keys** onto the same circular hash space (0 … 2³²−1).  
A key is stored on the **first node clockwise** from the key's hash position.

```
Hash space: 0 ────────────────────────────── 2³²−1
                 (wraps around → forms a ring)
```

When a node is added or removed, **only the keys between the new/removed node and its predecessor** need to move — typically `1/N` of all keys.

### Key Movement Comparison

```
  Modulo hashing:    add 1 node →  ~(N-1)/N ≈ 75% keys remapped
  Consistent hash:   add 1 node →  ~  1/N   ≈ 25% keys remapped
```

### Pros & Cons of Consistent Hashing

| ✅ Pros | ❌ Cons |
|---------|---------|
| Only ~1/N keys remapped on node change | Slightly more complex implementation |
| Scales smoothly for auto-scaling clusters | Without virtual nodes, uneven data distribution |
| Foundation of Redis Cluster, DynamoDB, Cassandra | Hash ring lookup is O(log N) with binary search |
| Supports heterogeneous node capacity (via vnodes) | Node failure can cascade if successor is already hot |

### Real-World Use

| System | Notes |
|--------|-------|
| **Amazon DynamoDB** | Consistent hashing across partitions |
| **Apache Cassandra** | Token ring (murmur3 hash) |
| **Redis Cluster** | Uses hash slots (a discrete consistent-hash variant) |
| **Memcached (libketama)** | Ketama client-side consistent hashing |
| **Akamai CDN** | Origin consistent hashing for edge nodes |

---

## 4. Hash Ring

### Visual Diagram

```
                        0 (= 2³²)
                         │
              ┌──────────┼──────────┐
         C_v1 │          │          │ A_v1
              │          ▲          │
      B_v2 ───┤          │          ├─── A_v2
              │     Hash Ring       │
      C_v2 ───┤   (0 to 2³²−1)     ├─── B_v1
              │                     │
              └──────────┬──────────┘
                         │
                        C_v3 / B_v3

  • Node A placed at positions:  A_v1, A_v2
  • Node B placed at positions:  B_v1, B_v2, B_v3
  • Node C placed at positions:  C_v1, C_v2, C_v3

  GET("user:101"):
    hash("user:101") → position P on ring
    Walk clockwise → land on first node token → that node owns the key
```

### Key Lookup Algorithm

```
Step 1:  position = hash(key) mod 2³²
Step 2:  binary search sorted token list for first token ≥ position
Step 3:  if no token found → wrap around → use token[0]
Step 4:  resolve token → physical node

Time complexity: O(log V)    where V = total virtual tokens
```

### Adding a Node

```
BEFORE:
  Ring: ... [A_v1]───[key1, key2, key3]───[B_v1] ...

ADD Node D between A_v1 and B_v1:
  Ring: ... [A_v1]───[D_v1]───[key3]───[B_v1] ...

Result: only key3 (between A_v1 and D_v1) moved to D.
        key1, key2 stay on A. All other keys unaffected.
```

### Removing / Failing a Node

```
BEFORE:
  Ring: ... [A_v1]───[B_v1]───[B_v2] ...
              B owns: key5, key6, key7

REMOVE Node B (crash):
  Ring: ... [A_v1]───[C_v1] ...
  B's keys (key5, key6, key7) → reassigned to C (next clockwise node)
  Only B's key range is affected — everything else is untouched.
```

### Pros & Cons of Hash Ring

| ✅ Pros | ❌ Cons |
|---------|---------|
| Minimal key movement on topology change | Ring skew without vnodes (one node can get disproportionate load) |
| O(log N) lookup with sorted token list | Hot spot risk if a large key range lands on a single physical node |
| Foundation for most production distributed caches | Complexity increases with dynamic membership |
| Works naturally with heterogeneous hardware | Requires gossip/coordination protocol to keep ring state consistent |

---

## 5. Virtual Nodes (vnodes)

### The Problem with a Plain Ring

```
With 3 physical nodes and 1 token each:

      0                 2³²
      │──── A ────── B ────── C ──│

  Node A owns: 0 → A    (33% of ring)
  Node B owns: A → B    (33% of ring)
  Node C owns: B → 2³²  (34% of ring)

  BUT: hash functions are not perfectly uniform.
  In practice, one node might own 50% of the key space,
  another 20%, causing severe load imbalance.
```

### The Solution: Multiple Tokens Per Node

```
Each physical node gets V virtual tokens (V = 150–256 in production):

      0──A1──C2──B1──A2──C1──B2──A3──B3──C3──...──2³²

  Node A: tokens at positions A1, A2, A3, ...
  Node B: tokens at positions B1, B2, B3, ...
  Node C: tokens at positions C1, C2, C3, ...

  Result:
    • Load is spread in V small slices instead of 1 large block
    • Statistical law of large numbers → near-uniform distribution
    • Adding/removing a node affects V/total_tokens ≈ 1/N fraction of keys
```

### vnode Diagram (3 nodes, 3 vnodes each)

```
Ring position (0 → 2³²):
──────────────────────────────────────────────────────────────────►
  [A1]  [C2]  [B1]  [A2]  [C1]  [B2]  [A3]  [B3]  [C3]  [A1]...
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
  Node A    Node B    Node A    Node B    Node C

  Each arc between consecutive tokens owned by the token's node.
  Short arcs = small key ranges → many small, balanced slices.
```

### Adding a Node with vnodes

```
Adding Node D (with 3 vnodes D1, D2, D3):

  Before: [A1]─[C2]─[B1]─[A2]─[C1]─[B2]─[A3]─[B3]─[C3]
  After:  [A1]─[D1]─[C2]─[B1]─[D2]─[A2]─[C1]─[B2]─[A3]─[D3]─[B3]─[C3]

  D1 steals a slice from A, D2 steals a slice from B, D3 from A again.
  Each existing node loses a small, uniform fraction of its keys.
  Total keys moved ≈ 1/N  (same as consistent hashing, but now EVENLY spread)
```

### Pros & Cons of Virtual Nodes

| ✅ Pros | ❌ Cons |
|---------|---------|
| Near-uniform key distribution regardless of hash function | More tokens in ring → larger in-memory token table |
| Supports heterogeneous nodes (stronger node → more vnodes) | Higher vnode count → more keys move during rebalancing (within the 1/N bound) |
| Graceful rebalancing when nodes join/leave | Managing vnode counts adds operational complexity |
| Industry standard (Cassandra, DynamoDB, Redis Cluster) | Gossip convergence slower with thousands of tokens |

### vnode Count Guidelines

| Cluster Size | Recommended vnodes/node |
|-------------|------------------------|
| 3–10 nodes  | 64–128 |
| 10–50 nodes | 128–256 |
| 50+ nodes   | 256–512 |
| Redis Cluster | Fixed 16,384 hash slots ÷ N |

---

## 6. Redis Cluster

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Redis Cluster                               │
│                                                                     │
│   16,384 hash slots split across N master shards                   │
│                                                                     │
│   Shard 1 (Master)        Shard 2 (Master)        Shard 3 (Master) │
│   Slots: 0–5460           Slots: 5461–10922        Slots: 10923–16383│
│      │                        │                        │           │
│   Replica 1A              Replica 2A              Replica 3A       │
│   Replica 1B              Replica 2B              Replica 3B       │
│                                                                     │
│   All nodes gossip with each other (no central coordinator)         │
└─────────────────────────────────────────────────────────────────────┘
```

### How Hash Slots Work

```
  CRC16(key) % 16384  →  slot number  →  node that owns the slot

  Example:
    CRC16("user:101") % 16384  =  7320  →  Shard 2  (slots 5461–10922)
    CRC16("user:202") % 16384  =  1024  →  Shard 1  (slots 0–5460)

  Hash tags: "{user:101}.profile"  →  only "{user:101}" is hashed
             Forces related keys onto the same shard for multi-key ops
```

### Client Routing — MOVED & ASKING Redirects

```
Client          Node 1               Node 2
  │                │                    │
  │  GET user:101  │                    │
  │───────────────►│                    │
  │                │  slot 7320 lives   │
  │                │  on Node 2!        │
  │  MOVED 7320    │                    │
  │◄───────────────│                    │
  │                                     │
  │  GET user:101 (retry)               │
  │────────────────────────────────────►│
  │                                     │
  │  "value"                            │
  │◄────────────────────────────────────│

  Smart clients cache the slot→node mapping and skip the redirect next time.
```

### Cluster Failover Timeline

```
Time 0:    Master 2 goes down
Time 0–5s: Replicas detect missing heartbeats (gossip)
Time 5s:   Replicas vote — Replica 2A wins election (Raft-like)
Time 5s:   Replica 2A promoted to new Master 2
Time 5s:   Cluster state broadcast via gossip to all nodes
Time ~10s: Clients receive MOVED redirects to new Master 2
           (Smart clients update slot map immediately)
```

### Pros & Cons of Redis Cluster

| ✅ Pros | ❌ Cons |
|---------|---------|
| Automatic sharding + rebalancing built-in | No cross-shard multi-key operations (unless hash tags used) |
| No single point of failure | Minimum 6 nodes recommended (3 masters + 3 replicas) |
| Gossip protocol — no central coordinator | Gossip overhead grows O(N²) in very large clusters |
| Horizontal scaling without downtime | Lua scripts must target a single slot |
| Automatic failover (5–10s) | Configuration complexity vs. standalone Redis |
| Hash tags enable co-location of related keys | Client must handle MOVED / ASKING redirects |

### Real-World Use

| Company | Usage |
|---------|-------|
| **Twitter** | Real-time timeline / tweet cache |
| **GitHub** | Session and object caching |
| **Shopify** | Product catalog, session, cart |
| **Stack Overflow** | Hot question and user profile cache |
| **Airbnb** | Search result and pricing cache |

---

## 7. Replication

### Why Replicate?

```
Without Replication:              With Replication:

  Master ──► dies                 Master ──► dies
     │                               │
  ALL data LOST                   Replica A ──► promoted to Master
  ALL requests hit DB             Replica B ──► becomes new Replica
  Cache stampede!                 Data intact, failover in seconds
```

### Replication Modes

#### Primary-Replica (Master-Slave)

```
  ┌────────────────────────────────────────────────────┐
  │  WRITE flow:                                       │
  │                                                    │
  │  Client ──► Master (write)                        │
  │              │                                     │
  │              ├──► Replica A  (async replication)  │
  │              └──► Replica B  (async replication)  │
  │                                                    │
  │  READ flow (read scaling):                         │
  │                                                    │
  │  Client ──► Load Balancer ──► Master               │
  │                          └──► Replica A            │
  │                          └──► Replica B            │
  └────────────────────────────────────────────────────┘
```

#### Synchronous vs Asynchronous Replication

```
SYNCHRONOUS:
  Client → Master → [waits] → Replica confirms → ACK to client
  ✅ Strong consistency — Replica always up to date
  ❌ Higher write latency (must wait for replica)
  ❌ If replica is slow → master stalls

ASYNCHRONOUS (Redis default):
  Client → Master → ACK to client immediately
                  └──► Replica (replication happens in background)
  ✅ Low write latency
  ❌ Small replication lag → replica may be slightly behind
  ❌ If master crashes before replication → data loss possible

SEMI-SYNCHRONOUS:
  Client → Master → waits for at least 1 replica to confirm
  Balanced trade-off: durability + acceptable latency
```

#### Redis Replication in Detail

```
Initial Sync (full):
  Replica ──PSYNC──► Master
  Master creates RDB snapshot + buffers new commands
  Master sends RDB to replica → replica loads it
  Master sends buffered commands → replica applies them
  State: REPLICATED

Incremental Sync (after reconnect):
  Master tracks replication offset (repl_offset)
  Replica sends last known offset
  Master sends only the delta (replication backlog)
  Much faster than full re-sync
```

### Failover — Sentinel Mode

```
┌────────────────────────────────────────────────────────────┐
│  Redis Sentinel (for standalone / non-cluster deployments) │
│                                                            │
│   Sentinel 1   Sentinel 2   Sentinel 3  (quorum = 2)      │
│       │             │             │                        │
│       └─────────────┼─────────────┘                       │
│                     │ heartbeat monitoring                 │
│                     ▼                                      │
│              [ Master ]                                    │
│                   │                                        │
│           ┌───────┴───────┐                               │
│        [Replica A]   [Replica B]                          │
│                                                            │
│  Master fails:                                             │
│    1. Sentinels detect via missed heartbeats               │
│    2. Quorum vote (≥2 sentinels agree)                    │
│    3. Sentinel leader elected                              │
│    4. Sentinel promotes Replica A → new Master            │
│    5. Replica B repoints to new Master                    │
│    6. Clients notified via pub/sub                        │
└────────────────────────────────────────────────────────────┘
```

### Replication Factor Guidance

| Use Case | Replication Factor | Notes |
|----------|-------------------|-------|
| Dev / non-critical | 1 (no replica) | Acceptable data loss risk |
| Production web app | 2 (1 master + 1 replica) | Minimum for HA |
| High-availability | 3 (1 master + 2 replicas) | Standard Redis Cluster config |
| Mission-critical (finance, healthcare) | 5+ | Cross-AZ or cross-region replicas |

### Pros & Cons of Replication

| ✅ Pros | ❌ Cons |
|---------|---------|
| Eliminates single point of failure | Replication lag → stale reads on replicas |
| Read scaling — spread reads across replicas | Storage cost multiplies by replication factor |
| Fast failover (Redis Sentinel: ~30s; Cluster: ~5–10s) | Async replication risks small data loss on crash |
| Geographic distribution (replicate across AZs/regions) | Split-brain possible if network partition occurs |
| Warm standby — replica always up-to-date | Operational complexity: sentinel or cluster management |

### Real-World Use

| System | Replication Config |
|--------|--------------------|
| **Redis Cluster (Shopify, GitHub)** | 1 master + 2 replicas per shard |
| **Instagram (Redis)** | Cross-AZ replicas for session cache |
| **Netflix EVCache** | Multi-region active-active replication |
| **Twitter Twemproxy** | Replica per master for timeline cache |

---

## 8. Side-by-Side Comparison

```
┌──────────────────┬──────────────┬───────────────────┬──────────────────┬──────────────────┐
│  Property        │ Modulo Hash  │ Consistent Hash   │ Virtual Nodes    │ Redis Cluster    │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Keys remapped    │ ~(N-1)/N     │ ~1/N              │ ~1/N (uniform)   │ ~slots/N         │
│ on node change   │ (~75–90%)    │                   │                  │ (automatic)      │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Load balance     │ Good (ideal) │ Poor without vnodes│ Excellent        │ Excellent        │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Implementation   │ Trivial      │ Moderate          │ Moderate         │ Built-in         │
│ complexity       │              │                   │                  │                  │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Dynamic scaling  │ ❌ Painful   │ ✅ Good           │ ✅ Excellent     │ ✅ Native        │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Heterogeneous    │ ❌ No        │ ❌ No             │ ✅ Yes           │ ✅ Weighted      │
│ node weights     │              │                   │ (more vnodes)    │ slot assignment  │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Coordination     │ None (client)│ Client-side       │ Client-side      │ Gossip protocol  │
│ mechanism        │              │ sorted token list │ sorted token list│ (built-in)       │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Multi-key ops    │ ✅ Yes       │ ✅ Yes            │ ✅ Yes           │ ⚠️ Hash tags only │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Failover         │ Manual       │ Manual            │ Manual           │ Automatic        │
│                  │              │                   │                  │ (5–10s)          │
├──────────────────┼──────────────┼───────────────────┼──────────────────┼──────────────────┤
│ Best for         │ Static small │ Library-level      │ Production       │ Production Redis │
│                  │ clusters     │ sharding           │ custom clusters  │ deployments      │
└──────────────────┴──────────────┴───────────────────┴──────────────────┴──────────────────┘
```

---

## 9. Which Strategy for Which Scenario?

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO                                │  RECOMMENDED STRATEGY              │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Fixed-size cluster, N never changes     │  Modulo hashing                    │
│  (e.g., 3 DB read replicas)             │                                    │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Cloud auto-scaling, nodes added/removed │  Consistent Hashing + vnodes       │
│  frequently                              │                                    │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Heterogeneous hardware                  │  Virtual Nodes                     │
│  (some nodes have 2× RAM)               │  (more vnodes for bigger node)     │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Redis-based caching, production grade   │  Redis Cluster (native sharding)   │
│  with automatic failover                 │                                    │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  High-read workload, read scaling needed │  Replication (1 master + N replica)│
│  (social feed, product catalog reads)   │                                    │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Mission-critical, zero data loss        │  Sync replication + Sentinel/      │
│  (finance, healthcare auth tokens)      │  Cluster with min-replicas=2       │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Multi-region, geographic distribution   │  Redis Cluster + cross-AZ replicas │
│  (global CDN, gaming leaderboards)      │  or active-active (CRDT)           │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Co-locating related keys (user profile  │  Redis Cluster + Hash Tags         │
│  + user sessions + user feed)           │  e.g., {user:101}.profile          │
├──────────────────────────────────────────┼────────────────────────────────────┤
│  Custom distributed cache (not Redis)    │  Consistent Hashing + vnodes +     │
│  e.g., in-house Memcached wrapper       │  client-side routing library       │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Combining Strategies — Production Blueprint

### Instagram / Facebook scale

```
  ┌────────────────────────────────────────────────────────────────────┐
  │  Production Cache Architecture                                     │
  │                                                                    │
  │  Client Request                                                    │
  │       │                                                            │
  │       ▼                                                            │
  │  ┌─────────────┐                                                   │
  │  │  L1 Cache   │  In-process (e.g., Caffeine/Guava)               │
  │  │  LRU + TTL  │  ~100 MB per app node, microsecond latency       │
  │  └──────┬──────┘                                                   │
  │         │ miss                                                     │
  │         ▼                                                          │
  │  ┌─────────────────────────────────────────────────────────┐      │
  │  │  L2: Redis Cluster  (Consistent Hashing + vnodes)        │      │
  │  │                                                          │      │
  │  │  Shard 1 ──── Replica 1A ──── Replica 1B               │      │
  │  │  Shard 2 ──── Replica 2A ──── Replica 2B               │      │
  │  │  Shard 3 ──── Replica 3A ──── Replica 3B               │      │
  │  │                                                          │      │
  │  │  Each shard: LRU eviction + TTL per key                 │      │
  │  └────────────────────────┬────────────────────────────────┘      │
  │                           │ miss                                   │
  │                           ▼                                        │
  │                   Database / Origin                                │
  │                   (PostgreSQL, MySQL, Cassandra)                   │
  └────────────────────────────────────────────────────────────────────┘
```

### Key design decisions at each layer

| Layer | Partitioning | Eviction | Replication | TTL |
|-------|-------------|----------|-------------|-----|
| L1 (in-process) | Per app node (no sharding needed) | LRU | None (each app has its own) | Short (1–10s) |
| L2 (Redis Cluster) | Consistent hash + 16,384 slots | LRU or LFU | 1 master + 2 replicas | Medium (60s–1hr) |
| L3 (DB) | DB partitioning (separate concern) | — | DB replicas | Permanent |

---

## 11. Quick Decision Flowchart

```
                  ┌─────────────────────────────┐
                  │  Is the cluster size FIXED   │
                  │  and will NEVER change?      │
                  └──────────────┬──────────────┘
                       YES       │        NO
                ┌────────┘       │        └──────────────────┐
                ▼                │                            ▼
          Modulo Hashing         │              ┌─────────────────────────┐
          (simplest)             │              │  Are you using Redis?   │
                                 │              └──────────┬──────────────┘
                                 │                YES      │       NO
                                 │           ┌─────┘       │       └──────────────┐
                                 │           ▼             │                      ▼
                                 │     Redis Cluster       │          Consistent Hashing
                                 │     (hash slots,        │          + Virtual Nodes
                                 │      auto failover)     │          (client-side routing)
                                 │                         │
                                 └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────┐
                    │  Do you need high read       │
                    │  throughput / fault tolerance│
                    │  on top of sharding?         │
                    └──────────────┬──────────────┘
                          YES      │       NO
                    ┌──────┘       │       └───────────┐
                    ▼              │                   ▼
             Add Replication       │            Single master
             (1M + 2 replicas)     │            per shard is fine
             per shard             │
                                   │
                    ┌──────────────┘
                    │  Do related keys need
                    │  to land on same shard?
                    └──────────────┬──────────────┐
                          YES      │       NO
                          ▼        │       ▼
                     Hash Tags     │   Default routing
                    {user:101}.*   │   is fine
```

---

## Summary

| Concept | One-liner |
|---------|-----------|
| **Modulo Hashing** | Simple, but `(N-1)/N` keys move on any topology change — avoid for dynamic clusters. |
| **Consistent Hashing** | Maps nodes & keys to a ring — only `1/N` keys move when a node joins/leaves. |
| **Hash Ring** | The circular data structure that makes consistent hashing work — walk clockwise for owner. |
| **Virtual Nodes** | Give each physical node multiple ring positions — eliminates load hotspots, supports heterogeneous hardware. |
| **Redis Cluster** | Production-grade sharding (16,384 hash slots) + gossip failover + optional replication, all built-in. |
| **Replication** | Copy data to replica nodes — eliminates SPOF, enables read scaling, provides fast automatic failover. |

> **Golden Rule:** Use **Redis Cluster** with **1 master + 2 replicas** per shard for any production distributed cache.  
> Add **hash tags** for co-location, **LRU + TTL** for eviction, and an **L1 in-process cache** for microsecond hot reads.

---

*Part of the [Distributed Cache](./README.md) series · [System Design](../README.md) reference.*
