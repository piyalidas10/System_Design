# How Distributed Caches Survive Failures

> *"Any system you design — that can fail, and that WILL always fail."*  
> The question is not **if** it fails, but **how gracefully you handle it**.

Partitioning / consistent hashing makes a cache **scalable**.  
**Replication** makes it **highly available** — able to survive node failures without losing data or crashing the application.

---

## Table of Contents

1. [The Problem — Why Partitioning Alone is Not Enough](#1-the-problem--why-partitioning-alone-is-not-enough)
2. [Replication — The Core Solution](#2-replication--the-core-solution)
3. [Primary-Replica Architecture](#3-primary-replica-architecture)
4. [Synchronous vs Asynchronous Replication](#4-synchronous-vs-asynchronous-replication)
5. [Replication Lag & Cache Lag](#5-replication-lag--cache-lag)
6. [Failover — How a Dead Primary is Replaced](#6-failover--how-a-dead-primary-is-replaced)
7. [Sentinel Cluster — The Failover Manager](#7-sentinel-cluster--the-failover-manager)
8. [Redis Sentinel — Real-World Implementation](#8-redis-sentinel--real-world-implementation)
9. [Full Distributed Cache with HA Architecture](#9-full-distributed-cache-with-ha-architecture)
10. [Pros & Cons Comparison](#10-pros--cons-comparison)
11. [Which Strategy for Which Scenario?](#11-which-strategy-for-which-scenario)
12. [Real-World Use Cases](#12-real-world-use-cases)
13. [Quick Decision Flowchart](#13-quick-decision-flowchart)
14. [Summary](#14-summary)

---

## 1. The Problem — Why Partitioning Alone is Not Enough

### The Happy Scenario (3-node partitioned cache)

```
  Client ──► Routing Layer (Consistent Hashing)
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
   [Cache A]  [Cache B]  [Cache C]
   user:1–33  user:34–66 user:67–100

  → Data distributed evenly ✅
  → Horizontally scalable ✅
  → Single node RAM limit removed ✅
```

### The Failure Scenario

```
  Client ──► Routing Layer (Consistent Hashing)
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
   [Cache A]  [Cache B]  [Cache C]
                  ✗
               CRASHED!

  Client requests user:34–66 → Cache B is DOWN → CACHE MISS
                                                       │
                                                       ▼
                                               Goes to Database

  Consequences:
  ┌─────────────────────────────────────────────────────────┐
  │  1. Response time   ──► SLOW  (DB is 10–100× slower)    │
  │  2. Database load   ──► SPIKES (all missed cache hits)  │
  │  3. Cascading risk  ──► DB overloads → entire app DOWN  │
  └─────────────────────────────────────────────────────────┘

  Partitioning alone = scalable but NOT highly available.
```

---

## 2. Replication — The Core Solution

### Core Concept

```
  WITHOUT Replication:              WITH Replication:

  Cache B ──► CRASH                Cache B ──► CRASH
      │                                │
  DATA LOST                       Cache B' (replica) ──► PROMOTED
  All traffic → DB                Data intact → continue serving ✅
  Stampede → DB crash             DB is shielded ✅
```

**Replication** = store the same data in **more than one place**.  
Also called: **Redundancy**.

```
  Original node (Primary):
    ┌─────────┐
    │ Cache B │  ──► user:34 = "Alice"
    │         │      user:50 = "Bob"
    └─────────┘      user:66 = "Carol"
         │
         │  async copy
         ▼
  Replica node (Secondary):
    ┌──────────┐
    │ Cache B' │  ──► user:34 = "Alice"
    │          │      user:50 = "Bob"
    └──────────┘      user:66 = "Carol"

  If Cache B fails → Cache B' has the same data → no data loss ✅
```

### Why Major Companies Use Replication

```
  Google, Netflix, Facebook operate THOUSANDS of servers.

  Thousands of servers → some will ALWAYS fail.
  (hardware faults, network partitions, OOM kills, deployments)

  Without replication:
    Node fails → data lost → cache cold → DB hammered → app slow

  With replication:
    Node fails → replica promoted → data intact → app continues ✅
```

---

## 3. Primary-Replica Architecture

### Node Types

```
  ┌─────────────────────────────────────────────────────────────┐
  │  Two Types of Nodes in a Replicated Cache                   │
  │                                                             │
  │  ┌─────────────────────────────────────────────────────┐   │
  │  │  PRIMARY (Master) Node                              │   │
  │  │  • Receives ALL write operations                    │   │
  │  │  • Single authoritative source of truth             │   │
  │  │  • Asynchronously pushes data to secondaries        │   │
  │  └─────────────────────────────────────────────────────┘   │
  │                          │                                  │
  │           async replication (Δt delay)                      │
  │                          │                                  │
  │          ┌───────────────┴───────────────┐                 │
  │          ▼                               ▼                 │
  │  ┌──────────────────┐       ┌──────────────────┐          │
  │  │  SECONDARY Node  │       │  SECONDARY Node  │          │
  │  │  (Replica 1)     │       │  (Replica 2)     │          │
  │  │  • Handles READ  │       │  • Handles READ  │          │
  │  │    operations    │       │    operations    │          │
  │  │  • Also called   │       │  • Failover      │          │
  │  │  "Read Replica"  │       │    candidate     │          │
  │  └──────────────────┘       └──────────────────┘          │
  └─────────────────────────────────────────────────────────────┘
```

### Read / Write Flow

```
  WRITE path:
  Client ──── SET user:101 = "Alice" ────► PRIMARY
              (only one write destination)   │
                                             │ async
                                             ├──────► Replica 1
                                             └──────► Replica 2

  READ path:
  Client ──── GET user:101 ──► Load Balancer
                                    │
                         ┌──────────┼──────────┐
                         ▼          ▼          ▼
                      Primary   Replica 1  Replica 2
                      (any of the three can serve reads)

  Result: reads are load-balanced across all nodes (3× read throughput)
          writes go to one place (no write conflicts)
```

### Why NOT Write to All Nodes Simultaneously?

```
  Naive approach (write everywhere at once):

  Client ──► SET user:101 = "Alice"
              │
         ┌────┼────┐
         ▼    ▼    ▼
       t1ms  t2ms t3ms
       Node1 Node2 Node3

  Total write latency = t1 + t2 + t3

  With async replication:
  Client ──► SET user:101 = "Alice" ──► PRIMARY (t1ms) ──► ACK
                                           └──async──► Replica 1 (background)
                                           └──async──► Replica 2 (background)

  Write latency = t1 only ← MUCH FASTER

  Conclusion:
  ┌─────────────────────────────────────────────────────────┐
  │  Synchronous multi-write → high latency, slow writes    │
  │  Async replication      → low latency, fast writes ✅   │
  └─────────────────────────────────────────────────────────┘
```

---

## 4. Synchronous vs Asynchronous Replication

```
SYNCHRONOUS:
  ┌────────┐  SET key=v  ┌──────────┐  confirm  ┌───────────┐
  │ Client │────────────►│ Primary  │───────────►│ Replica 1 │
  │        │             │          │◄───────────│           │
  │        │◄── ACK ─────│          │  confirmed │           │
  └────────┘             └──────────┘            └───────────┘

  Client waits until at least 1 replica has confirmed the write.
  ✅ Zero data loss (replica always up-to-date)
  ❌ Write latency = Primary latency + Replica latency
  ❌ If replica is slow / down → Primary stalls

─────────────────────────────────────────────────────────────────

ASYNCHRONOUS (Redis default):
  ┌────────┐  SET key=v  ┌──────────┐
  │ Client │────────────►│ Primary  │──► ACK immediately
  │        │◄── ACK ─────│          │
  └────────┘             └──────────┘
                              │ (background, after ACK)
                              ├──────────────► Replica 1
                              └──────────────► Replica 2

  Client gets ACK before replica is updated.
  ✅ Low write latency (no replica wait)
  ✅ Replica failure doesn't block writes
  ❌ Small data loss window if Primary crashes before replica sync
  ❌ Replica reads may be slightly stale (Cache Lag)

─────────────────────────────────────────────────────────────────

SEMI-SYNCHRONOUS (balanced):
  Wait for at least 1 replica to confirm, then ACK client.
  ✅ At least one replica always has the data
  ✅ Acceptable write latency
  ❌ Still possible to lose data if BOTH primary and that replica fail
```

### Comparison Table

| Property | Synchronous | Asynchronous | Semi-Synchronous |
|----------|-------------|--------------|-----------------|
| Write latency | High | Low | Medium |
| Data loss risk | None | Small window | Very small |
| Read staleness | None | Possible | Minimal |
| Replica failure impact | Blocks writes | No impact | Minimal |
| Best for | Financial, critical data | General caching | Balanced production |

---

## 5. Replication Lag & Cache Lag

### What is Cache Lag?

```
  Timeline:
  T=0ms   Client: SET user:101 = "Alice" ──► Primary updated ✅
  T=0ms   Primary sends async replication to Replica 1 and 2
  T=5ms   Replica 1 receives and applies update ✅
  T=5ms   Replica 2 receives and applies update ✅

  The gap between T=0ms and T=5ms is called:

  ╔══════════════════════════════════╗
  ║        CACHE LAG  (Δt)          ║
  ║   (replication lag)             ║
  ╚══════════════════════════════════╝

  During this Δt window:
    Read from Primary  → "Alice" ✅ (fresh)
    Read from Replica  → "Bob"   ❌ (stale — not yet replicated)
```

### Data Loss Scenario

```
  T=0ms   SET user:101 = "Alice" ──► Primary updated
  T=3ms   Replication in progress (Δt = 5ms total)
  T=3ms   PRIMARY CRASHES! ← hardware failure

  Replica 1 state: still has user:101 = "Bob" (old value)
  Replica 2 state: still has user:101 = "Bob" (old value)

  "Alice" was NEVER replicated → DATA LOST

  ┌─────────────────────────────────────────────────────────┐
  │  To minimise data loss:                                 │
  │                                                         │
  │  Keep Δt (Cache Lag) as SMALL as possible.             │
  │                                                         │
  │  Tactics:                                               │
  │  • High-bandwidth, low-latency network between nodes   │
  │  • Co-locate primary and replicas in same AZ           │
  │  • Tune replication buffer size                        │
  │  • Use semi-synchronous for critical data              │
  └─────────────────────────────────────────────────────────┘
```

### Handling Stale Reads

```
  Option A — Always read from Primary:
    ✅ Always fresh data
    ❌ Primary handles all reads → no read scaling benefit

  Option B — Read from replicas, tolerate staleness:
    ✅ Distributes read load
    ❌ Stale data for Δt window

  Option C — Read-Your-Writes (version tracking):
    After a write, client tracks version V.
    Read requests carry min_version=V.
    Cache serves from Primary if replica version < V.
    ✅ Writer always sees their own writes
    ✅ Others read from replicas (scaled)
```

---

## 6. Failover — How a Dead Primary is Replaced

### Three-Step Failover Process

```
  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │  Step 1: DETECT FAILURE                                     │
  │  ────────────────────────────────────────────────────────   │
  │  Monitor sends heartbeat pings to Primary every N ms.      │
  │  Primary stops responding → missed heartbeats threshold.   │
  │  FAILURE DETECTED.                                          │
  │                                                             │
  │  Step 2: SELECT NEW PRIMARY                                 │
  │  ────────────────────────────────────────────────────────   │
  │  Among the surviving replicas, choose the most up-to-date  │
  │  (replica with highest replication offset = least lag).    │
  │  That replica is PROMOTED to Primary.                       │
  │                                                             │
  │  Step 3: COMMUNICATE TO CLIENTS                             │
  │  ────────────────────────────────────────────────────────   │
  │  Notify all app servers / routing layer:                   │
  │  "New Primary = Replica 1 at address X.X.X.X"             │
  │  Remaining replicas repoint to new Primary.                │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
```

### Failover Timeline Diagram

```
  T=0s    Primary is healthy
          ┌──────────┐
          │ Primary  │◄──── writes ──── Client
          └──────────┘
               │ async
          ┌────┴────┐
      [Replica 1]  [Replica 2]

  T=5s    Primary goes down (hardware fault / OOM / network)
          ┌──────────┐
          │ Primary  │  ✗  DEAD
          └──────────┘
          Sentinel detects: no heartbeat for 3 consecutive pings

  T=7s    Sentinel votes: Replica 1 has highest replication offset
          ┌───────────────────┐
          │ Replica 1         │ ──► PROMOTED to new Primary ✅
          │ (new Primary)     │
          └───────────────────┘
               │ repoints
          [Replica 2] ──► now replicates FROM new Primary

  T=8s    Sentinel broadcasts new Primary address to all clients
          Clients update routing table → writes go to new Primary

  T=8s+   System fully operational. Old Primary excluded until recovered.
          ┌───────────────────┐
          │  New Primary      │◄──── writes ──── Client ✅
          │  (was Replica 1)  │
          └───────────────────┘
               │ async
          [Replica 2]
```

### Split-Brain Risk

```
  Network partition: Primary still running but unreachable from Sentinel.
  Sentinel promotes Replica 1 → TWO primaries exist simultaneously!

  Client A writes to old Primary  →  "Alice"
  Client B writes to new Primary  →  "Bob"
  (same key, different values — DATA DIVERGENCE)

  ┌─────────────────────────────────────────────────────────┐
  │  Mitigation:                                            │
  │  • Require quorum: Sentinel only promotes if            │
  │    majority (>N/2) of Sentinels agree Primary is dead. │
  │  • Old Primary: reject writes if it can't reach         │
  │    quorum Sentinels (Redis: min-replicas-to-write).    │
  └─────────────────────────────────────────────────────────┘
```

---

## 7. Sentinel Cluster — The Failover Manager

### What is a Sentinel?

```
  A Sentinel is a DEDICATED monitoring and failover management process.
  It is NOT a cache node — it stores no data.
  Its sole purpose: watch nodes and manage failover.
```

### Sentinel Architecture

```
  ┌──────────────────────────────────────────────────────────────┐
  │                   SENTINEL CLUSTER                           │
  │                                                              │
  │    Sentinel 1       Sentinel 2       Sentinel 3             │
  │       │                 │                 │                  │
  │       └────────────────┬┘─────────────────┘                 │
  │                        │ quorum votes                       │
  │                        ▼                                    │
  │  ┌──────────────────────────────────────────────────────┐   │
  │  │              CACHE CLUSTER                           │   │
  │  │                                                      │   │
  │  │  Partition 1:     Partition 2:     Partition 3:      │   │
  │  │  [Primary A]      [Primary B]      [Primary C]       │   │
  │  │  [Replica A1]     [Replica B1]     [Replica C1]      │   │
  │  │  [Replica A2]     [Replica B2]     [Replica C2]      │   │
  │  └──────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────┘
```

### Sentinel Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│  RESPONSIBILITY 1: MONITORING                                   │
│  ─────────────────────────────────────────────────────────────  │
│  Continuously pings all Primary and Replica nodes.             │
│  Checks: heartbeat every 1–10 seconds.                         │
│  If a node misses N consecutive pings → flagged as DOWN.       │
│                                                                 │
│  RESPONSIBILITY 2: FAILURE DETECTION                            │
│  ─────────────────────────────────────────────────────────────  │
│  Subjectively-Down (SDOWN): one Sentinel sees node as down.    │
│  Objectively-Down (ODOWN): quorum Sentinels agree node is down.│
│  Only ODOWN triggers failover (prevents false positives).      │
│                                                                 │
│  RESPONSIBILITY 3: FAILOVER EXECUTION                           │
│  ─────────────────────────────────────────────────────────────  │
│  Sentinels elect a LEADER Sentinel (via Raft-like vote).       │
│  Leader selects best Replica (most up-to-date).                │
│  Leader sends SLAVEOF NO ONE to promote it.                    │
│  Leader repoints other replicas to new Primary.                │
│                                                                 │
│  RESPONSIBILITY 4: CLIENT NOTIFICATION                          │
│  ─────────────────────────────────────────────────────────────  │
│  Publishes new Primary address via pub/sub channel.            │
│  Smart clients subscribe → auto-update routing.               │
│  Clients can also query Sentinel directly for current Primary. │
└─────────────────────────────────────────────────────────────────┘
```

### Why Multiple Sentinels?

```
  Single Sentinel:
  ┌──────────┐ ──monitors──► ┌──────────┐
  │ Sentinel │               │ Primary  │
  └──────────┘               └──────────┘
      ✗ dies
      → No one detects Primary failure!
      → Single Point of Failure for the failover system itself

  Multiple Sentinels (odd number, typically 3):
  ┌──────────┐
  │Sentinel 1│─┐
  └──────────┘ │
  ┌──────────┐ ├──monitors──► ┌──────────┐
  │Sentinel 2│─┤              │ Primary  │
  └──────────┘ │              └──────────┘
  ┌──────────┐ │
  │Sentinel 3│─┘
  └──────────┘

  Sentinel 1 crashes → Sentinel 2 and 3 still monitor.
  Quorum = 2 (majority of 3) → failover can still proceed ✅
  No SPOF in the failover system itself.

  Configuration:
    quorum = ceil(N/2) + 1  where N = number of Sentinels
    Recommended minimum: 3 Sentinels
```

---

## 8. Redis Sentinel — Real-World Implementation

### Redis Sentinel Config

```
# sentinel.conf

# Monitor primary named "mymaster" at 192.168.1.1:6379
# Quorum = 2 (2 out of 3 Sentinels must agree before failover)
sentinel monitor mymaster 192.168.1.1 6379 2

# Primary is considered down after 5 seconds of no response
sentinel down-after-milliseconds mymaster 5000

# After failover, give new primary 10s to sync replicas
sentinel failover-timeout mymaster 10000

# Minimum replicas that must be reachable for Primary to accept writes
# (prevents split-brain: Primary refuses writes if isolated)
sentinel min-replicas-to-write 1
sentinel min-replicas-max-lag  10
```

### Redis Replication Config (Primary)

```
# redis.conf (Primary node)

# Replication backlog: buffer for replica reconnect (incremental sync)
repl-backlog-size 64mb

# Async replication (default) — low latency writes
# To require at least 1 replica to ACK before write completes:
# (semi-synchronous behaviour)
min-replicas-to-write 1
min-replicas-max-lag  10
```

### Redis Replication Internals

```
  INITIAL FULL SYNC (replica connects for first time):

  Replica ──── PSYNC ? -1 ────────────────► Primary
                                             │
                                    Takes RDB snapshot
                                    Buffers new commands
                                             │
  Replica ◄─── RDB file ──────────────────── Primary
  (apply snapshot)                           │
  Replica ◄─── buffered commands ──────────── Primary
  (apply delta)                              │
  STATE: CONNECTED, REPLICATED ✅            │

  INCREMENTAL SYNC (replica reconnects after brief disconnect):

  Replica ──── PSYNC <repl_id> <offset> ───► Primary
                                             │
                               Checks backlog buffer:
                               if offset within backlog → send delta only
  Replica ◄─── delta commands ─────────────── Primary
  (much faster than full re-sync) ✅
```

### Sentinel Failover Step-by-Step

```
  1. Sentinel 1 pings Primary → no response (SDOWN on S1)
  2. Sentinel 1 asks Sentinel 2 and 3: "Is Primary down for you too?"
  3. S2 and S3 confirm → quorum=2 reached → ODOWN declared
  4. Sentinels vote for a LEADER Sentinel (Raft-like election)
  5. Leader Sentinel selects best replica:
     - Replica with smallest replication offset (most data)
     - Highest priority (configurable)
     - Lowest run-ID as tiebreaker
  6. Leader sends: REPLICAOF NO ONE to chosen Replica
  7. Replica becomes new Primary ✅
  8. Leader sends: REPLICAOF <new_primary_addr> to all other replicas
  9. Leader sends: CLIENT SETNAME / pub-sub notification to all clients
  10. Clients update their Primary address → writes resume ✅

  Total failover time: typically 5–30 seconds
  (down-after-milliseconds + election + promotion + client update)
```

---

## 9. Full Distributed Cache with HA Architecture

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                    APPLICATION LAYER                                   │
  │  App Server 1   App Server 2   App Server 3   App Server 4            │
  └──────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │              ROUTING LAYER (Consistent Hashing Ring)                  │
  │  hash(key) → which partition?                                         │
  └───────┬──────────────────────┬───────────────────────┬────────────────┘
          │                      │                       │
          ▼                      ▼                       ▼
  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
  │  PARTITION 1  │    │  PARTITION 2  │    │  PARTITION 3  │
  │               │    │               │    │               │
  │ [Primary A]   │    │ [Primary B] ✗ │    │ [Primary C]   │
  │    │           │    │    FAILED!    │    │    │           │
  │ [Replica A1]  │    │ [Replica B1]  │    │ [Replica C1]  │
  │ [Replica A2]  │    │ [Replica B2]  │    │ [Replica C2]  │
  └───────────────┘    └───────────────┘    └───────────────┘
                              │
                   Sentinel detects Primary B failed
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                   SENTINEL CLUSTER                                     │
  │   Sentinel 1 ─── Sentinel 2 ─── Sentinel 3                           │
  │                (quorum = 2/3)                                         │
  │   1. ODOWN declared for Primary B                                     │
  │   2. Replica B1 selected (highest replication offset)                 │
  │   3. Replica B1 promoted → NEW Primary B                              │
  │   4. Replica B2 repoints to New Primary B                             │
  │   5. App servers notified: "Primary B is now at B1 address"           │
  └────────────────────────────────────────────────────────────────────────┘

  Result after failover:
  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
  │  PARTITION 1  │    │  PARTITION 2  │    │  PARTITION 3  │
  │               │    │  (recovered)  │    │               │
  │ [Primary A]   │    │ [Primary B1]  │    │ [Primary C]   │
  │    │           │    │    (promoted) │    │    │           │
  │ [Replica A1]  │    │ [Replica B2]  │    │ [Replica C1]  │
  │ [Replica A2]  │    │ (now replica) │    │ [Replica C2]  │
  └───────────────┘    └───────────────┘    └───────────────┘

  Application continues serving without data loss ✅
  Replication factor per partition: 3× (1 Primary + 2 Replicas)
```

---

## 10. Pros & Cons Comparison

### Replication (Async)

| ✅ Pros | ❌ Cons |
|---------|---------|
| Data survives single node failure | Replication lag (Δt) — small window of potential data loss |
| Read scaling — replicas serve reads | Stale reads from replicas during lag window |
| Low write latency (no replica wait) | More memory cost (2–3× data stored) |
| Failover possible without data loss (if lag is small) | Replica promotion takes 5–30 seconds |

### Replication (Sync)

| ✅ Pros | ❌ Cons |
|---------|---------|
| Zero data loss — replica always in sync | Higher write latency |
| Strong consistency for reads | Slow / failed replica blocks all writes |
| Safe for financial / mission-critical data | Reduced write throughput |

### Sentinel Cluster

| ✅ Pros | ❌ Cons |
|---------|---------|
| Automated failover — no human intervention | Sentinel itself must be replicated (3+ nodes) |
| Fast detection (configurable: 5–30 seconds) | Adds operational complexity |
| No SPOF when 3+ Sentinels deployed | Failover gap: 5–30s where writes are blocked |
| Clients auto-discover new Primary | Split-brain risk in network partitions |
| Works alongside partitioning (Sentinel per shard) | Not suitable for very large clusters (use Redis Cluster instead) |

---

## 11. Which Strategy for Which Scenario?

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SCENARIO                                    │  RECOMMENDED CONFIG           │
├──────────────────────────────────────────────┼───────────────────────────────┤
│  General web app caching                     │  Async replication            │
│  (social media, e-commerce)                  │  1 Primary + 2 Replicas       │
│                                              │  Sentinel (3 nodes)           │
├──────────────────────────────────────────────┼───────────────────────────────┤
│  Financial data / booking / inventory        │  Semi-synchronous replication │
│  (data loss is unacceptable)                │  min-replicas-to-write = 1    │
│                                              │  Sentinel with quorum = 2     │
├──────────────────────────────────────────────┼───────────────────────────────┤
│  Session / auth token caching                │  Async replication            │
│  (tolerate brief inconsistency)              │  Short TTL as safety net      │
├──────────────────────────────────────────────┼───────────────────────────────┤
│  High read throughput, read-heavy workload   │  1 Primary + 4–5 Replicas     │
│  (news feed, product catalog)                │  All replicas serve reads     │
├──────────────────────────────────────────────┼───────────────────────────────┤
│  Multi-region deployment                     │  Async cross-region replica   │
│  (global CDN, gaming leaderboards)           │  Accept higher lag for geo    │
│                                              │  distribution                 │
├──────────────────────────────────────────────┼───────────────────────────────┤
│  Large-scale Redis (100+ nodes)              │  Redis Cluster (built-in      │
│  (Twitter, Shopify, GitHub scale)            │  replication + gossip)        │
│                                              │  NOT Redis Sentinel           │
├──────────────────────────────────────────────┼───────────────────────────────┤
│  Low-cost / small team                       │  1 Primary + 1 Replica        │
│  (startup, MVP)                              │  Sentinel not mandatory but   │
│                                              │  highly recommended           │
└──────────────────────────────────────────────┴───────────────────────────────┘
```

---

## 12. Real-World Use Cases

| Company | Replication Strategy | Details |
|---------|---------------------|---------|
| **Netflix** | EVCache (Memcached) with cross-AZ async replication | Each AZ has a full cache replica; AZ failure → traffic routes to another AZ instantly |
| **Twitter** | Redis with Primary-Replica per shard | Timeline cache, tweet objects; Sentinel manages per-shard failover |
| **Facebook** | Memcached with regional replication | "Lease" mechanism prevents stale reads during replication lag |
| **GitHub** | Redis Sentinel for session + job queues | Failover in <30s; uses sentinel for auto-promotion |
| **Shopify** | Redis Cluster (1 Primary + 2 Replicas/shard) | Product, session, cart cache; automatic cluster failover |
| **Airbnb** | Redis with Sentinel + async replication | Pricing, search result caches with 3-Sentinel quorum |
| **Slack** | Redis Cluster with replicas | Channel state, presence, session data; cluster gossip handles failover |
| **Uber** | Redis replicated across AZs | Surge pricing, driver location cache; cross-AZ async replica for durability |

---

## 13. Quick Decision Flowchart

```
                  ┌──────────────────────────────────┐
                  │  Do you need high availability?   │
                  │  (cache node failure tolerable?)  │
                  └──────────────────┬───────────────┘
                          NO         │       YES
                    ┌────────┘       │       └──────────────────────┐
                    ▼                │                               ▼
              Single node            │                 ┌────────────────────────┐
              (dev/test only)        │                 │  Is data loss          │
                                     │                 │  acceptable?           │
                                     │                 └──────────┬─────────────┘
                                     │                  YES       │      NO
                                     │             ┌──────┘       │      └──────────────┐
                                     │             ▼              │                     ▼
                                     │       Async Replication    │           Semi-Synchronous
                                     │       (default, fast)      │           Replication
                                     │                            │           (min-replicas=1)
                                     │
                                     │
                  ┌──────────────────┘
                  │  How many nodes?
                  └───────────────────────────────────────────────┐
                            < 100 nodes                           │  100+ nodes
                               │                                  │
                               ▼                                  ▼
                      Redis Sentinel                       Redis Cluster
                      (per-shard failover                  (built-in replication
                       management, 3 Sentinels)             + gossip failover)
                               │
                               ▼
              ┌────────────────────────────────────┐
              │  Replication factor per shard?      │
              │  Low criticality: 1 Primary + 1 Rep │
              │  Production:      1 Primary + 2 Rep │
              │  Mission-critical:1 Primary + 4 Rep │
              └────────────────────────────────────┘
```

---

## 14. Summary

| Concept | One-liner |
|---------|-----------|
| **Partitioning** | Splits data across nodes for scalability — but NOT fault tolerance. |
| **Replication** | Copies data to multiple nodes — makes cache survive failures. |
| **Primary node** | Receives all writes; the authoritative source of truth per shard. |
| **Secondary / Replica node** | Copy of Primary data; serves reads; becomes Primary on failover. |
| **Async replication** | Write returns immediately; replica updated in background. Fast but small loss window. |
| **Sync replication** | Write waits for replica confirm. Zero loss, slower writes. |
| **Cache lag (Δt)** | Time gap between Primary write and Replica catching up. Keep as small as possible. |
| **Failover** | Detect → Select new Primary → Notify clients. Automated by Sentinel. |
| **Sentinel Cluster** | Dedicated monitor + failover manager. Must run 3+ nodes for its own HA. |
| **Redis Cluster** | Built-in sharding + replication + gossip failover. Use for 100+ node scale. |

> **Golden Rule:**  
> Scalability = Partitioning (Consistent Hashing)  
> High Availability = Replication (Primary + Replicas) + Sentinel (automated failover)  
> Every production cache needs BOTH.

---

*Part of the [Distributed Cache](./README.md) series · [System Design](../README.md) reference.*
