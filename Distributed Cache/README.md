# Distributed Cache System Design (e.g., Redis / Memcached Cluster)

---

## 0. Problem Statement

> **Interview Question**: *"Design a Distributed Cache that can handle millions of requests per second for large-scale applications like Instagram, LinkedIn, or Facebook."*

### Why Not Just Query the Database Directly?

Consider Instagram: every profile load, like count, comment fetch, or image metadata is a data read. If every single request hits the database directly, two inherently slow operations stack up:

| Bottleneck | Why It's Slow |
| :--- | :--- |
| **Disk I/O** | Data on disk takes orders of magnitude longer to read than RAM |
| **Network I/O** | Round-trip latency between app server and DB adds up at scale |

This leads to a cascade of problems:

1. **Slow response times** → poor user experience (Instagram-class apps live or die by speed).
2. **High DB load** → a single viral event (e.g., Virat Kohli posts a Reel) can spike traffic and crash the database.
3. **Cascading failures** → one slow DB causes timeouts, which cause retries, which cause more load — the system collapses.

Instagram (and every major platform) is **heavily read-skewed**: a Reel is uploaded once but viewed millions of times. The solution is to avoid hitting the database for repeated reads by keeping hot data closer to the application.

---

## 0.1 What Is Caching?

### The Sweet Shop Analogy

Rahul is addicted to sweets. The sweet shop is 1 hour away. He visits 3 times a day → wastes **6 hours/day** just commuting.

His friend Simran's advice: *"When you go in the morning, bring enough sweets for the whole day and store them at home."*

Result: Rahul now goes **once a day** instead of three times → saves **4 hours/day**.

**This is caching.** Instead of making an expensive trip (disk/network I/O to the database) every time, store the result locally (in memory) so future requests are served instantly.

```
Without Cache:              With Cache:
App ──── (slow) ──→ DB      App ──→ Cache (fast, in-memory)
App ──── (slow) ──→ DB           └─(cache miss only)──→ DB
App ──── (slow) ──→ DB
```

### Technical Definition

A **Distributed Cache** is a **high-speed, temporary storage layer** that:
- Stores data in **RAM** (not disk) → constant-time O(1) reads.
- Is **spread across multiple machines** → scales horizontally and avoids a single point of failure.
- Acts as a **buffer** between application servers and the persistent database.

> **Distributed** = cache data is partitioned and replicated across more than one machine, enabling scale and fault tolerance.

---

## 1. Overview
A **Distributed Cache** is an in-memory, highly available, distributed data store that sits between application servers and persistent storage (databases) to reduce latency, offload read/write pressure from persistent databases, and provide sub-millisecond retrieval times for frequently accessed data.

### Why do we need caching ?
• Problems:
	• high DB load
	• slower responses
	• expensive scaling
	• connection exhaustion
	• repeated computation

---

## 2. Requirements

### Functional Requirements

These are the **core use-cases** the system must support — what the user demands:

| # | Requirement | Detail |
| :--- | :--- | :--- |
| FR1 | **Put(key, value, ttl)** | Store data as key-value pairs. The key-value structure ensures O(1) read/write (like a HashMap / Python dict). |
| FR2 | **Get(key)** | Retrieve data by key. **Must be O(1) time complexity** — caching only makes sense if reads are faster than DB. |
| FR3 | **Delete(key)** | Explicitly remove a key-value pair immediately. |
| FR4 | **TTL Support** | Every entry can carry a Time-To-Live. Expired data (stale data) auto-deletes. Example: a movie's cache entry is relevant for weeks, not years. |
| FR5 | **Eviction Strategy** | Cache has limited memory (unlike a DB). When full, old/less-used data must be removed automatically via LRU, LFU, or FIFO. |
| FR6 | **Distributed Storage** | Data must be partitioned across multiple nodes to support scale (millions of RPS). |
| FR7 | **High Throughput + Concurrency** | Must handle many concurrent read/write operations without contention. |
| FR8 | **Replication Support** | Data must be replicated across nodes to ensure availability even if a node fails. |

> **Key Insight**: The storage model is **key → value** (like a HashMap), chosen specifically because it guarantees O(1) average-case lookup — the fundamental guarantee of any cache.

### Non-Functional Requirements

These drive **quality of experience** — not what the system does, but *how well* it does it:

| # | Requirement | Detail |
| :--- | :--- | :--- |
| NFR1 | **Low Latency** | O(1) read times. Sub-millisecond in-memory reads (< 5ms p99). |
| NFR2 | **High Availability** | 99.999% uptime. No single point of failure (SPOF). |
| NFR3 | **Scalability** | Horizontally scalable — add nodes to handle more traffic. |
| NFR4 | **Fault Tolerance** | If one cache node goes down, traffic re-routes to replicas. The DB must not be suddenly overwhelmed (Cache Stampede risk). |
| NFR5 | **Consistency Trade-off** | Per **CAP Theorem**: in a distributed system with Partition Tolerance (required), we choose **high availability over strong consistency**. Cache can serve slightly stale data — that's acceptable. |
| NFR6 | **Memory Efficiency** | Cache RAM is expensive. Eviction, TTL, and compact data structures are critical. |
| NFR7 | **High Throughput** | Sustain high requests/second per unit time. |

> **CAP Theorem Recap**: A distributed system can guarantee at most 2 of {Consistency, Availability, Partition Tolerance}. Since Partition Tolerance is non-negotiable in distributed caches, we trade off some consistency to keep availability high.

---

## 3. Capacity Estimation & Calculations

### Base Assumptions (Global-Scale App)

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| Daily Active Users (DAU) | 10 Million | Global-scale application (Instagram/LinkedIn tier) |
| Requests per user per day | 10 | Profile loads, like counts, feed fetches, etc. |
| **Total requests/day** | **100 Million** | = 10M × 10 |
| Cache Hit Ratio | 80% | 80M requests served from cache, 20M hit DB |
| Read/Write Ratio | 90:10 | Read-heavy (upload once, read millions of times) |

### Throughput Calculation

```
Total requests/day      = 100,000,000
Requests/second (avg)   = 100,000,000 / 86,400 ≈ 1,200 RPS
Peak traffic (5× spike) = 1,200 × 5 = 6,000 RPS
```

> At **6,000 RPS peak**, a single cache node (Redis can handle ~100K RPS) is sufficient in theory — but distribution is required for **fault tolerance**, **geographic locality**, and **data volume**.

### Memory Estimation

| Parameter | Value |
| :--- | :--- |
| Total Keys | 1 Billion active keys |
| Average Key Size | 32 bytes |
| Average Value Size | 1 KB |
| Metadata Overhead | ~64 bytes/entry |
| **Total per entry** | **~1.12 KB** |
| **Raw storage needed** | **1.12 TB** |
| With 3× Replication | ~3.36 TB RAM |
| RAM per node | 64 GB |
| **Nodes required** | **~54 nodes** |

### Why Caching Dramatically Helps

With an 80% cache hit rate on 100M daily requests:
- **80M requests** → served from in-memory cache (< 1ms latency each)
- **20M requests** → hit the database (10–50ms each)
- DB load reduction: **80%** — preventing overload and cascading failures

---

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    Client[Application Servers] --> Router[Routing Layer / Consistent Hashing Ring]
    Router --> CacheNode1[Cache Shard 1 - Master]
    Router --> CacheNode2[Cache Shard 2 - Master]
    Router --> CacheNode3[Cache Shard 3 - Master]
    
    CacheNode1 --> Replica1A[Replica 1A]
    CacheNode1 --> Replica1B[Replica 1B]
    
    CacheNode2 --> Replica2A[Replica 2A]
    CacheNode2 --> Replica2B[Replica 2B]
    
    CacheNode3 --> Replica3A[Replica 3A]
    CacheNode3 --> Replica3B[Replica 3B]
    
    Coord[Consensus / Cluster Manager: ZooKeeper / Raft / Gossip] <--> CacheNode1
    Coord <--> CacheNode2
    Coord <--> CacheNode3
```

---

## 5. Core Components & Deep Dive

### 5.1 Consistent Hashing & Virtual Nodes
- **Problem**: Plain modulo hashing (`hash(key) % N`) causes $O(Keys)$ remapping when nodes are added or removed.
- **Solution**:
  - Hash ring mapped across $2^{32} - 1$ points.
  - Nodes and keys are mapped to positions on the ring using cryptographic or non-cryptographic hashes (e.g., MurmurHash3, MD5).
  - To prevent hotspots and non-uniform distribution, each physical node is assigned multiple **Virtual Nodes (vnodes)** (typically 100–256 vnodes per server).

```
        [ Node A_v1 (0) ]
        /               \
 [ Node C_v2 ]        [ Node B_v1 ]
      |                      |
 [ Node B_v2 ]        [ Node C_v1 ]
        \               /
        [ Node A_v2 ]
```

### 5.2 Eviction Policies
1. **LRU (Least Recently Used)**:
   - Data structure: Doubly Linked List + Hash Map ($O(1)$ lookup, $O(1)$ eviction).
   - Redis optimization: Approximated LRU (samples random $k$ keys to save pointer memory overhead).
2. **LFU (Least Frequently Used)**:
   - Evicts items with lowest access count; uses logarithmic decay to prevent stale frequent items from lingering.
3. **TTL Clean-up**:
   - **Passive Expiration**: Checked and expired upon read access.
   - **Active Expiration**: Periodic background sampling (e.g., 20 random keys every 100ms) to purge expired keys.

### 5.3 Cache Invalidation Patterns
- **Cache-Aside (Lazy Loading)**: App reads cache; if miss, reads DB and updates cache. App updates DB then invalidates cache.
- **Write-Through**: App writes to cache; cache synchronously writes to DB before returning.
- **Write-Behind (Write-Back)**: App writes to cache; cache asynchronously writes to DB in batches (high throughput, risk of data loss on crash).
- **Refresh-Ahead**: Cache predicts data access and refreshes before expiration.

### 5.4 Replication & High Availability
- **Primary-Replica Replication**:
  - Writes always go to Primary; Reads can be served by Primary or distributed to Replicas.
  - Replication can be asynchronous (low latency) or semi-synchronous (durability).
- **Cluster Heartbeat & Failure Detection**:
  - Gossip Protocol or centralized coordinator (ZooKeeper/etcd) detects failed primaries and promotes replicas using Raft/Paxos.

---

## 6. Cache Penetration, Breakdown & Avalanche

| Problem | Cause | Mitigation |
| :--- | :--- | :--- |
| **Cache Penetration** | Requests for non-existent keys bypass cache and hit DB directly. | **Bloom Filter** before cache lookup; Cache null/empty values with short TTL. |
| **Cache Breakdown** (Hotspot Key Expired) | A heavily accessed key expires; concurrent requests flood DB at once. | **Mutex/Distributed Lock** on cache miss so only one worker queries DB; Refresh asynchronously before expiry. |
| **Cache Avalanche** | Large batch of keys expire at the same time, causing DB overload. | Add **Random Jitter** to TTLs; Distributed multi-region caching; Circuit breakers. |

---

## 7. Data Structure & Code Outline

```python
import time
from collections import OrderedDict
from typing import Any, Optional

class LRUCacheWithTTL:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()  # key -> (value, expiry_time)

    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        value, expiry = self.cache[key]
        if expiry and time.time() > expiry:
            del self.cache[key]
            return None
        self.cache.move_to_end(key)
        return value

    def put(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        expiry = time.time() + ttl if ttl else None
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = (value, expiry)
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)  # Evict oldest (LRU)
```

---

## 8. Key Challenges in Distributed Caching

Understanding these challenges is what separates a junior from a senior engineer in a system design interview:

| # | Challenge | Root Cause | Solution Direction |
| :--- | :--- | :--- | :--- |
| C1 | **Limited Memory** | Cache is RAM-based, not disk — capacity is finite and expensive | Implement Eviction Policies (LRU, LFU); tune TTLs aggressively |
| C2 | **Single Point of Failure (SPOF)** | One cache node going down collapses the entire cache layer | Distribute cache across multiple nodes; add replicas |
| C3 | **Partitioning** | How to split data across nodes fairly and minimise reshuffling when nodes join/leave? | Consistent Hashing + Virtual Nodes |
| C4 | **Redundancy / Node Failure** | A cache node crashes → its data is lost → DB gets flooded | Replication (Primary-Replica); data re-hashing |
| C5 | **Stale Data / Cache Invalidation** | DB data changes but cache still holds old values | Write-Through / Write-Behind / Cache-Aside patterns; TTL |
| C6 | **Hot Keys** | One key (e.g., "Ronaldo" on Instagram, "Dhurander" on BookMyShow) gets hammered by millions of concurrent requests, overloading a single shard | Local in-memory micro-caches; read replicas for hot key shards |
| C7 | **Cache Stampede** | Cache suddenly goes down; all traffic floods the DB simultaneously | Mutex/distributed lock on cache miss; circuit breakers; gradual warm-up |
| C8 | **Scalability** | Single-machine cache can't handle millions of RPS | Horizontal partitioning; cluster management (ZooKeeper / Raft / Gossip) |

> These challenges are the topics of deep-dive sessions in subsequent parts of this series.

---

## What If a Cache Node Fails?
Let's understand this with an example.

Imagine a happy scenario.
```
You, as a user, request:

"Please get me the profile of the user whose ID is 123."
```

**We have a distributed caching solution containing:**
- Cache A
- Cache B
- Cache C


### What is this architecture called?
Ans. Partitioning. Each cache contains data belonging to different users.

### How is the data distributed across these caches?
Ans. Using Consistent Hashing.

When you request a particular user, consistent hashing helps determine which cache contains that user's data.
```
For example, if the requested user's data is stored in Cache B, the system retrieves the data from Cache B.

We cannot store all the data in a single cache when the dataset becomes too large. Therefore, we use multiple cache nodes.

This is called partitioning.
```

> **Consistent Hashing is a very important concept. Large companies such as Google, Microsoft, and LinkedIn frequently ask interview questions about consistent hashing.**

Now, let's consider another scenario.

### What happens if one of the cache nodes fails?

Suppose Cache B fails.

Your system is distributed across three caches, so it is scalable. However, if the user data was stored in Cache B and that cache fails, the data will no longer be available there.

### What happens next?

The application must retrieve the data directly from the database.

This can lead to several problems:
1. The cache fails.
2. The application has to fetch data from the database.
3. Response time increases.
4. Application performance decreases.
5. The load on the database increases.
If too many cache nodes fail or too many requests reach the database, the entire application could potentially crash.

So, partitioning alone is not enough.

Our system is scalable, but what if we lose an entire cache node?

We need another concept to solve this problem.

That concept is called Replication.

---

## What Is Replication?
The simplest meaning of replication is:
> **Instead of storing data in only one place, we create duplicate copies of that data and store them in multiple places.**

In other words, we introduce redundancy.

Let's understand with our previous example.

Suppose Cache B contains some data.

Now, I create another copy of Cache B's data and store it in another cache node called B'.

So, if Cache B goes down, the data is still available in B'.

As a result, the application can continue serving the data.

This process is called:
- Replication
- Redundancy
Large companies such as Google and Netflix operate thousands of servers.

When you operate thousands of servers, some servers will inevitably fail.

Server failures are unavoidable.

If cache nodes fail and cached data becomes unavailable, applications like Google or Netflix may become slower.

How do these companies handle this?

They use replication to achieve high availability.

The idea is simple:

Store the same data in multiple locations so that if one location fails, another location can continue serving the data.

Let's understand how this works.

---

## Primary-Secondary Replication Architecture
Consider the following architecture.
```
We have a client application that wants to write some data into the cache.
We designate one cache node as the primary node.
This is the main node where actual write operations take place.
We also want to maintain backup copies of its data.
```

### Why?

Because if the primary node crashes or loses data, we should not lose everything.

Therefore, we create replicas of the primary node.

An important point here is that we generally perform replication asynchronously in this architecture.

### How does asynchronous replication work?
Suppose a user sends a write request.
1. The application writes the data into the primary cache.
2. The primary cache acknowledges the write request.
3. The application returns the response to the user.
4. The primary cache asynchronously sends the updated data to its replica nodes.
The user does not need to wait for the replica nodes to finish writing the data.

The replication process continues independently in the background.

This improves write performance because the application does not have to wait for every replica to complete its write operation.

### Two types of nodes
In this architecture, we generally have two types of nodes.

```mermaid
flowchart TD
    %% Primary Node Section
    subgraph Primary [Primary-Secondary Architecture]
        direction TB
        PN["Primary Node<br><b>Cache A</b><br>Handles write operations"]
    end

    %% Mid-connection label
    Repl[Asynchronous replication]

    %% Secondary Nodes Section
    subgraph Secondaries [ ]
        direction LR
        SNB["Secondary Node<br><b>Cache B</b><br>Read replica"]
        SNC["Secondary Node<br><b>Cache C</b><br>Read replica"]
    end

    %% Connections
    Primary --> Repl
    Repl --> SNB
    Repl --> SNC

    %% Styling
    style Primary fill:#effaf3,stroke:#d0d7de,stroke-width:1px
    style Secondaries fill:none,stroke:none
    style PN fill:none,stroke:none
    
    style SNB fill:#ffffff,stroke:#e1e4e8,stroke-width:1px,border-radius:6px
    style SNC fill:#ffffff,stroke:#e1e4e8,stroke-width:1px,border-radius:6px
    style Repl fill:#d1e7dd,stroke:#a2e9b9,stroke-width:1px
```

Primary node:
- The main node.
- Handles write operations.
- Sends updates to secondary nodes.

Secondary nodes:
- Maintain replicated copies of primary data.
- Are commonly used for read operations.
- Are also called read replicas.

So, in this architecture:
- Primary = Write
- Secondary = Read

---

## Why Not Write to Every Replica Simultaneously?
An obvious question is:

### Why don't we simply write to every cache node simultaneously?

For example, whenever a write request arrives, why not write to Cache A, Cache B, and Cache C at the same time?

This would ensure that every cache contains the latest data.

The problem is write latency.

Suppose writing to each cache takes the following amount of time:
- Cache A = T1
- Cache B = T2
- Cache C = T3

If we perform synchronous writes to all three nodes, the total completion time is approximately:
```
$$
T_{\text{write}} = T_1 + T_2 + T_3
$$
```

In comparison, if we write only to the primary node and replicate asynchronously:
```
$$
T_{write}\approx T1
$$
```

The write operation becomes faster because the application does not have to wait for every replica.

This is why we generally follow a parent-child relationship.
- Primary cache: handles the main write operation.
- Child/secondary nodes: receive replicated data and serve read requests.

This architecture improves write performance.

---

## What Happens If the Primary Fails Before Replication Completes?
Now let's consider an important failure scenario.

Suppose the application writes the following data:
```
name = "Vishwa"
```
The primary cache successfully stores this data.

However, before the data gets replicated to the secondary node, the primary cache crashes.

### What happens now?

The secondary node does not have the latest update.

As a result, we may lose the data that was written to the primary but had not yet been replicated.

This is called data loss due to asynchronous replication.

### Understanding Cache Lag
Suppose the primary writes data at time T1.

The secondary receives that data at time T2.

The difference between these two times is called replication lag (or cache lag, as described in the lecture).
```
$$
\Delta T=T2-T1
$$
```

This represents the delay between writing data to the primary and replicating it to the secondary.

If the primary fails during this period, the latest updates may be lost.

Therefore, if we want to minimize the possibility of data loss, we should try to keep replication lag as small as possible.

This is an important production scenario.

Asynchronous replication improves performance, but it introduces a potential risk of losing recent writes.

---

## What Is Failover?
When working in software engineering, you will sometimes meet developers who say:
```
"My code never fails."
```
If you encounter someone who says that, remember that it is an unrealistic statement.

A good software engineer understands that any system can fail.

No matter how well you design a system, it can fail under certain uncontrollable circumstances.

However, what is in your control is how you plan for those failures.

You should design your system so that even if a failure occurs, it can handle that failure gracefully.

For example, a server, computer, or cache node can fail at any time.

Saying that a system will never fail is not practically possible.

### As software developers, we need to think about this:

If a failure happens, how will my system recover gracefully?

Let's return to our primary-secondary replication architecture.

Suppose the primary node fails.

### What should happen?

One of the secondary replica nodes should be promoted to become the new primary node.

The new primary node will then handle write operations.

The application must also be informed that the primary node has changed.

This entire process is called Failover.

### Three steps involved in failover
1. Step 1: Detect Failure
   Identify that the primary cache node has failed.
2. Step 2: Select a New Primary
   Choose one of the available secondary replica nodes and promote it to primary.
3. Step 3: Communicate With the Client
   Inform the application that a new primary node has been selected. The application can now send write requests to the new primary.

This is how failover works in a replication-based architecture.

---

## What Is a Sentinel Cluster?
Now the next question is:

How do we detect that a primary node has failed?

For this, we need a dedicated system.

In this lecture, the instructor introduces a system called the Sentinel Cluster.

It is responsible for failover management.
Responsibilities of a Sentinel Cluster

### 1. Monitor the health of the entire system

It continuously monitors the health of all cache nodes.

For example:
- Is Cache A healthy?
- Is Cache B healthy?
- Is Cache C healthy?
It continuously sends pings to the nodes and checks their heartbeats.

This helps determine whether the nodes are functioning correctly.

### 2. Detect failures

Suppose the Sentinel Cluster identifies that the primary node has failed.

It detects the failure and initiates the recovery process.

### 3. Promote a replica

Once the failure is detected, Sentinel selects one of the available replica nodes.

It promotes that replica to become the new primary.

### 4. Inform the client

After promoting the new primary, the system informs the application about the change.

The application can then start sending write requests to the new primary node.
Sentinel should also be highly available
There is another important consideration.

### What if the Sentinel itself fails?

We don't want the Sentinel Cluster to become a single point of failure.

Therefore, we can also distribute and replicate the Sentinel components.

We can have multiple Sentinel instances.

**Their configuration determines:**
- How frequently they should ping the nodes.
- Which servers they should monitor.
- How failure detection should work.
- How failover should be coordinated.
The Sentinel system itself should also be distributed and highly available.
Real-world example: Redis Sentinel
The instructor gives the example of Redis.

> **Redis provides a feature called Redis Sentinel.**
> **Redis Sentinel helps Redis achieve high availability through monitoring, failure detection, and automatic failover.**

---

## Summary Checklist for Interviews
- [x] Problem statement clearly articulated (why caching exists).
- [x] Caching concept explained with analogy (Rahul & sweet shop).
- [x] Functional Requirements: key-value store, O(1) get/put/delete, TTL, eviction, distribution, replication.
- [x] Non-Functional Requirements: low latency, high availability, scalability, fault tolerance, CAP trade-off.
- [x] Capacity estimation: DAU → RPS → peak RPS → memory → node count.
- [x] Cache hit/miss ratio quantified and DB load reduction calculated.
- [x] Memory capacity & node counts calculated.
- [x] Consistent hashing with virtual nodes explained.
- [x] Cache invalidation vs eviction strategies compared.
- [x] Key challenges listed: SPOF, partitioning, hot keys, stampede, stale data.
- [x] Resiliency strategies (Penetration, Breakdown, Avalanche) addressed.
