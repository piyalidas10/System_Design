# Designing a Production-Ready URL Shortener

**A comprehensive system design guide covering architecture diagrams, request flows, capacity planning, distributed ID generation, database sharding, caching strategies, failure recovery, security, observability, and interview Q&A.**

---

<img src="./Production-Grade URL Shortener Architecture-1.png" width="90%" />

### Architecture Highlights:
- **Traffic Entry & Routing:** Client → CDN/WAF → Highly Available Load Balancer → Stateless Application Tier.
- **Write Flow:** URL Validation → Distributed ID Generation (Snowflake) → Base62 Encoding → Sharded Database Persistence → Return Short URL.
- **Read Flow:** Short Code Lookup → Edge / Redis Cache (Hit) → Database Shard (Miss) → Cache Backfill → HTTP 301/302 Redirect.
- **Data & Caching Layer:** Distributed Redis Cluster, Hash-based Database Sharding, Asynchronous Read Replicas.
- **Reliability & Security:** Automated Failover, Graceful Degradation, Rate Limiting (Token Bucket), Domain/IP Blacklisting, Link Expiry (TTL).
- **Observability:** Metrics (Prometheus/Grafana), Distributed Tracing (OpenTelemetry), Structured Logging (ELK Stack).

> **Architect's Principle:** Start with a stateless service, a durable primary database, and Redis caching. Introduce database sharding, replication, distributed ID generation, and multi-region deployment as traffic volume and availability SLOs demand.

---

<img src="./Production-Grade URL Shortener Architecture (1).png" width="90%" />

The architecture includes:
- Traffic entry: Client → CDN/WAF → highly available Load Balancer.
- Application layer: Stateless application servers for URL creation and redirection.
- Write path: URL validation → distributed ID generation → Base62 encoding → database shard → optional Redis caching.
- Read path: Short-code lookup → Redis cache → database shard on cache miss → HTTP 301/302 redirect.
- Data layer: Sharded databases with replicas, backups, and disaster recovery.
- Production operations: Metrics, logs, distributed tracing, alerting, rate limiting, and abuse protection.
- Capacity planning: Illustrative traffic of 100 million writes/day and 1 billion reads/day.
One important design detail: Redis, ID generation, and database routing are separate responsibilities. The ID generator creates unique identifiers, the encoder converts them into compact short codes, and the shard router determines where the mapping is stored.

---

## 1. Problem Statement and Goals

A URL Shortener accepts a long URL and generates a compact, unique alias. When a visitor requests the short URL, the service resolves the alias and redirects them to the original destination.

```text
Long URL:
https://example.com/products/category/item?campaign=spring&source=social

Short URL:
https://sho.rt/aZ81kQ

Visitor opens https://sho.rt/aZ81kQ
                  |
                  v
          Redirect to long URL
```

### Core Functional Requirements
1. **Create Short Link:** Accept a long URL and return a unique short code.
2. **Resolve Short Link:** Map a short code to the original URL and issue an HTTP redirect.
3. **Durable Persistence:** Reliably store the mapping between short codes and long URLs.
4. **Analytics & Metrics:** Track click counts, referrers, geographic locations, and timestamps.
5. **Lifecycle & Abuse Controls:** Support link expiration (TTL), custom aliases, URL validation, and rate limiting.

### Scope & Interview Clarifications
- Are custom aliases supported?
- Do links expire by default, and can owners manually revoke/delete them?
- What analytics granularity is required (aggregate counts vs. real-time event streaming)?
- What is the expected read-to-write traffic ratio?
- What are the target latency (e.g., < 20ms TTFB for reads) and availability (99.99%) SLOs?
- Which HTTP redirect status code (`301` vs `302/307`) is required?

---

## 2. Capacity Planning and Traffic Estimations

### Scale Assumptions

| Operation | Baseline Daily Volume | Average QPS | Peak QPS (3x Multiplier) |
| :--- | :--- | :--- | :--- |
| **Writes (URL Creation)** | 100 Million / day | $\frac{100,000,000}{86,400} \approx 1,157$ writes/sec | ~3,500 writes/sec |
| **Reads (Redirections)** | 1 Billion / day | $\frac{1,000,000,000}{86,400} \approx 11,574$ reads/sec | ~35,000 reads/sec |
| **Read-to-Write Ratio** | **10 : 1** (Heavy Read-Dominant Workload) | — | — |

### Storage Estimations (5-Year Retention)
- **Total Records:** 100 Million writes/day $\times$ 365 days $\times$ 5 years $\approx$ **182.5 Billion URLs**.
- **Record Size:**
  - `short_code` (Base62 string): ~8 bytes
  - `long_url` (Original destination): ~500 bytes
  - `user_id` / `created_at` / `expires_at`: ~32 bytes
  - Total per record $\approx$ **550 bytes** (including DB indexes).
- **5-Year Storage Capacity:** $182.5\text{ Billion} \times 550\text{ bytes} \approx$ **100.375 Terabytes (TB)**.

### Memory / Caching Estimates (80/20 Pareto Rule)
- 20% of the daily URLs generate 80% of read traffic.
- Daily read requests = 1 Billion.
- Unique URLs visited daily $\approx 100\text{ Million}$.
- Memory needed to cache 20% of daily requests:
  $$20\text{ Million URLs} \times 550\text{ bytes} \approx \mathbf{11\text{ GB RAM}}$$
- With overhead and connection buffers, a **32 GB – 64 GB Redis cluster** easily caches the entire active working set in memory.

---

## 3. Step-by-Step Architecture Evolution

### 3.1 Initial Baseline: Single Application Server & Single Database

```text
                 +------------------+
                 |      Client      |
                 +---------+--------+
                           |
                           v
                 +------------------+
                 | CDN (Static      |
                 | Assets / UI)     |
                 +------------------+
                           |
                           v
                 +------------------+
                 | Application      |
                 | Server (Single)  |
                 +---------+--------+
                           |
                           v
                 +------------------+
                 | Database         |
                 | (Single RDBMS)   |
                 +------------------+
```

**Bottlenecks & Failure Modes:**
- **Single Point of Failure (SPOF):** If the app server or database crashes, the entire service goes down.
- **Resource Exhaustion:** A single server cannot handle 35,000 peak concurrent read connections.
- **Disk I/O Contention:** Heavy concurrent reads and writes saturate database disk queues.

---

### 3.2 Horizontal Scaling: Stateless App Tier & Load Balancing

```text
                       +--------------------+
Client --------------->| Load Balancer (HA) |
                       +---------+----------+
                                 |
                 +---------------+---------------+
                 |               |               |
                 v               v               v
         +---------------+ +---------------+ +---------------+
         | App Server 1  | | App Server 2  | | App Server 3  |
         +-------+-------+ +-------+-------+ +-------+-------+
                 |                 |                 |
                 +-----------------+-----------------+
                                   |
                                   v
                          +------------------+
                          | Database Cluster |
                          +------------------+
```

**Key Improvements:**
- Traffic is distributed evenly across multiple app instances using **Round Robin** or **Least Connections**.
- Health checks automatically detect unhealthy instances and route traffic away within seconds.
- Compute scaling is independent of storage scaling.
- *Best Practice:* Keep application servers completely **stateless**; avoid sticky sessions so any instance can handle any URL creation or resolution request.

---

### 3.3 In-Memory Caching Tier (Redis / Memcached)

```text
Client
  |
  v
Load Balancer
  |
  v
Application Server
  |
  v
Redis Cache ------- HIT -------> Return Destination URL (< 2ms)
  |
 MISS
  v
Database Lookup
  |
  v
Populate Redis (Lazy Loading / TTL)
  |
  v
Return Destination URL
```

**Benefits:**
- Lower average lookup latency.
- Fewer repeated reads against the database.
- Reduced database load for frequently visited links.

**Production notes:**
- Cache entries need a TTL or explicit invalidation strategy.
- The cache should not be the only durable copy of URL mappings.
- Handle cache misses, cache timeouts, eviction, and Redis outages.
- Prevent cache stampedes when many requests miss the same key at once.
- For revoked or expired links, ensure cache policy does not keep redirecting after revocation longer than permitted.

**Key Improvements:**
- 80%+ of read requests are served directly from RAM in < 2ms, offloading massive read pressure from the database.
- Uses **Lazy Loading (Cache-Aside)** with Time-to-Live (TTL) expiration.
- Protects the database from sudden viral traffic spikes.

---

### 3.4 Distributed ID Generation & Sharded Database Architecture

```text
                         +----------------------+
Create URL ------------->| Stateless App Tier   |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Distributed ID       |
                         | Generator (Snowflake)|
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Base62 Short Code    |
                         | Encoding             |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Database Shard Router|
                         +----+----------+------+
                              |          |
                      +-------v--+  +----v-------+
                      | Shard 0  |  | Shard 1     |  ... N Shards
                      +----+-----+  +----+-------+
                           |             |
                       +---v---+     +---v---+
                       |Replica|     |Replica|
                       +-------+     +-------+
```
**Terminology:**
- **Sharding:** divides records across multiple database partitions/shards.
- **Replication:** maintains copies of a shard's data on additional database nodes for availability and/or read scaling.
- **Distributed ID generation:** generates unique identifiers across multiple app instances or machines without relying on one serial bottleneck.

**Technical correction:** Replication and sharding solve different problems. Sharding distributes data and load; replication copies data within a shard or across nodes. Replication alone does not divide a large dataset into independent shards.


---

## 4. Final High-Level Production Architecture

```text
                         +----------------------+
                         | Browser / Mobile App |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | DNS / CDN Edge / WAF |
                         | Anycast, TLS, DDoS,  |
                         | Edge Caching & Assets|
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Redundant Active /   |
                         | Standby Load Balancer|
                         +----------+-----------+
                                    |
                     +--------------+--------------+
                     |              |              |
                     v              v              v
               +-----------+  +-----------+  +-----------+
               | App 1     |  | App 2     |  | App N     |
               +-----+-----+  +-----+-----+  +-----+-----+
                     |              |              |
                     +--------------+--------------+
                                    |
                          +---------+---------+
                          |                   |
                          v                   v
                 +----------------+  +-------------------+
                 | Redis Cluster  |  | Distributed ID    |
                 | Multi-Node LRU |  | Generator         |
                 | Cache (Key->URL)| | (Twitter Snowflake)|
                 +-------+--------+  +-------------------+
                         |
                         | Cache Miss
                         v
                 +----------------------+
                 | Database Shard       |
                 | Router / Proxy Layer |
                 +----------+-----------+
                            |
               +------------+-------------+
               |            |             |
               v            v             v
          +---------+  +---------+   +---------+
          | Shard 0 |  | Shard 1 |   | Shard N |
          +----+----+  +----+----+   +----+----+
               |            |             |
            Replicas     Replicas      Replicas

     Cross-Cutting Services:
     • Telemetry (Prometheus, Grafana, OpenTelemetry, ELK)
     • Security & Abuse (Rate Limiter, WAF, Domain Blacklist)
     • Async Event Streaming (Kafka / SQS for Click Analytics)
```

### Component Responsibility Matrix

| Component | Primary Function | High-Availability Strategy |
| :--- | :--- | :--- |
| **Edge CDN / WAF** | Terminates TLS, absorbs DDoS, caches static assets & hot redirects | Anycast DNS routing across 300+ global PoPs |
| **Load Balancers** | Layer 7 routing, SSL termination, health checking | Active-Passive / Active-Active pairing via VRRP / Keepalived |
| **Stateless App Servers**| Input validation, encoding, business logic, redirection | Auto-Scaling Groups (ASG) across multiple Availability Zones |
| **Redis Cache Cluster** | In-memory key-to-URL mapping lookup | Redis Sentinel / Redis Cluster with multi-replica failover |
| **Distributed ID Gen** | Generates 64-bit unique IDs (Snowflake) | Decentralized worker nodes; independent bit-sequence tracking |
| **Database Shards** | Durable persistent storage of mappings | Hash-partitioned shards + asynchronous read replicas |
| **Analytics Stream** | Asynchronously logs clicks and geo-telemetry | Kafka / RabbitMQ consumer workers decoupled from read path |

---

## 5. Write Path: Creating a Short URL

```text
Client
  |
  | 1. POST /api/v1/urls { "longUrl": "https://example.com/..." }
  v
Load Balancer
  |
  | 2. Routes to healthy instance
  v
Application Server
  |
  +-- 3. Validate URL format & check Domain Blacklist / Phishing APIs
  |
  +-- 4. Check Rate Limiter (Token Bucket: max 30 creates/min per IP)
  |
  +-- 5. Request 64-bit Unique ID from Snowflake Worker
  |        |
  |        v
  |    Snowflake ID Generator (e.g., 1542894719283712000)
  |
  +-- 6. Encode ID to Base62 (e.g., "7xQ2aB")
  |
  +-- 7. Determine Shard = Hash("7xQ2aB") % TotalShards
  |
  +-- 8. Persist Record to Target Primary Shard:
  |        INSERT INTO url_mapping (short_code, long_url, user_id, expires_at)
  |        VALUES ('7xQ2aB', 'https://example.com/...', 101, '2028-01-01');
  |
  +-- 9. (Optional) Warm up Redis Cache with Short Code -> Long URL
  |
  v
Return HTTP 201 Created: { "shortUrl": "https://sho.rt/7xQ2aB" }
```

### Production correctness details

- **Persist before returning success:** do not return a usable link before its mapping is durably accepted according to the system's durability contract.
- **Uniqueness:** enforce a unique constraint on the short code. Handle conflicts safely.
- **Idempotency:** consider an idempotency key for client retries so a retried create request does not unintentionally create duplicate records.
- **URL validation:** accept only supported schemes (typically HTTP/HTTPS), normalize carefully, and reject malformed or prohibited destinations.
- **Retries:** retry only transient failures and use bounded retries with backoff; avoid retry storms.
- **Cache write:** the transcript's main write path focuses on ID generation and database persistence. A cache entry can be written after persistence or populated lazily on the first read; it should not replace durable storage.

### Snowflake 64-Bit ID Structure

```
 1 bit       41 bits               10 bits            12 bits
┌─────┬──────────────────────┬──────────────────┬─────────────────┐
│  0  │  Timestamp (Millis)  │ Machine / Node ID │ Sequence Number │
└─────┴──────────────────────┴──────────────────┴─────────────────┘
```
- **Sign Bit (1 bit):** Always 0.
- **Timestamp (41 bits):** Milliseconds since custom epoch ($\sim 69\text{ years}$ of unique IDs).
- **Node ID (10 bits):** Supports up to $2^{10} = 1,024$ distinct worker nodes.
- **Sequence Number (12 bits):** Generates up to $2^{12} = 4,096$ unique IDs per millisecond per node ($\sim 4\text{ Million IDs/sec}$).

---

## 6. Read Path: Resolving a Short URL

```text
Visitor opens https://sho.rt/7xQ2aB
                  |
                  | 1. HTTP GET /7xQ2aB
                  v
            Edge / CDN Layer*
                  |
                  | 2. CDN Miss (or dynamic bypass)
                  v
            Load Balancer
                  |
                  | 3. Route to App Server
                  v
            Application Server
                  |
                  | 4. Check Redis Cache: GET "7xQ2aB"
                  |
          +-------+-------+
          |               |
     [Cache HIT]     [Cache MISS]
          |               |
          |               v
          |      5. Compute Target DB Shard = Hash("7xQ2aB") % N
          |               |
          |               v
          |      6. Query DB Read Replica: SELECT long_url FROM url_mapping...
          |               |
          |               v
          |      7. Backfill Redis Cache: SET "7xQ2aB" <long_url> EX 86400
          |               |
          +-------+-------+
                  |
                  +-- 8. Asynchronously emit Click Event to Kafka / Message Queue
                  |
                  v
        Return HTTP 302 Found (Location: https://example.com/...)
                  |
                  v
        Browser redirects to destination webpage
```

### HTTP 301 vs. HTTP 302/307 Redirects

| Redirect Code | Type | Browser Caching Behavior | Analytics Tracking Impact |
| :--- | :--- | :--- | :--- |
| **HTTP 301 / 308** | Permanent | Browser caches redirect indefinitely; subsequent visits bypass shortener server. | ❌ Analytics are lost after the initial click. |
| **HTTP 302 / 307** | Temporary | Browser sends request to shortener server on every click. | ✅ Accurate analytics tracking for every visit. |

*Recommendation:* Use **HTTP 302** (or **307** to preserve HTTP verbs) when click analytics, real-time link revocation, or dynamic routing are required.

---

## 7. Database Sharding and Replication

### Sharding Strategy: Hash-Based Partitioning

To scale beyond the storage and connection limits of a single database, records are partitioned using hash-based sharding:

$$\text{Shard ID} = \text{hash}(\text{short\_code}) \pmod{\text{Total Shard Count}}$$

```text
short_code: "aZ81kQ"
    |
    v
MurmurHash3("aZ81kQ") % 4
    |
    +---- 0 ----> DB Shard 0 (Primary + 2 Replicas)
    +---- 1 ----> DB Shard 1 (Primary + 2 Replicas)
    +---- 2 ----> DB Shard 2 (Primary + 2 Replicas)
    +---- 3 ----> DB Shard 3 (Primary + 2 Replicas)
```

**Benefits:**
- Spreads storage across nodes.
- Distributes query and write load.
- Makes horizontal database growth possible.

**Caution:** Modulo-based routing is simple, but changing the shard count can remap many keys. Production systems may use consistent hashing, virtual buckets, or a routing metadata layer to make resharding more controlled.

### Replication

```text
                 +------------------+
Writes --------->| Shard primary     |
                 +--------+---------+
                          |
                   replication
                    /         \
                   v           v
             +----------+ +----------+
             | Replica A| | Replica B|
             +----------+ +----------+
```

Replication may help with failover and read scaling. Its exact guarantees depend on synchronous/asynchronous replication, promotion policy, replication lag, and the database technology.

**Correction:** A replica is not a substitute for backups. Replication can copy accidental deletions or corrupted writes. Maintain backups and test restoration.

### Relational Schema (PostgreSQL / MySQL)

```sql
CREATE TABLE url_mapping (
    short_code   VARCHAR(10) PRIMARY KEY,
    long_url     VARCHAR(2048) NOT NULL,
    user_id      BIGINT NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at   TIMESTAMP WITH TIME ZONE NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_user_id ON url_mapping(user_id);
CREATE INDEX idx_expires_at ON url_mapping(expires_at) WHERE is_active = TRUE;
```

---

## 8. Cache Scaling and Hot-Key Mitigation

### The Hot-Key Dilemma
When a viral short link receives hundreds of thousands of concurrent requests, traffic concentrates on the specific Redis node hosting that key, risking CPU saturation and network bandwidth exhaustion.

```text
Millions of Concurrent Visitors
  |    |    |    |    |    |
  +----+----+----+----+----+
             |
             v
     key = "viralDeal"
             |
             v
   Single Redis Instance
   (Saturated CPU & Network)
```

### Hot-Key Mitigation Techniques:
1. **Edge Caching at CDN:** Cache 302 redirects with short TTLs (e.g., 60 seconds) at CDN edge PoPs, absorbing 99% of viral spikes before they reach origin servers.
2. **Local In-Process Cache:** Store top hot keys in local app server memory (e.g., Guava / Caffeine cache) with a 10-second TTL.
3. **Key Salted Replication:** Write hot keys across multiple Redis nodes under salted aliases (`viralDeal_1`, `viralDeal_2`, ..., `viralDeal_N`) and query random instances:
   ```python
   replica_id = random.randint(0, NUM_REPLICAS - 1)
   long_url = redis.get(f"{short_code}_{replica_id}")
   ```
4. **Request Coalescing (Singleflight):** If 5,000 requests miss cache concurrently for the same key, collapse them into a single database query while other threads wait for the result.

---

## 9. Failure Handling and Graceful Degradation

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Failure Recovery Matrix                                │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ Failure Scenario     │ Potential Impact     │ Automated Production Handling │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ App Server Crashes   │ Capacity reduction   │ LB health checks drop node;   │
│                      │                      │ Auto-Scaling spawns replace.  │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Load Balancer Fails  │ Complete outage if   │ Active-Passive failover via   │
│                      │ standalone           │ Keepalived / VRRP / DNS VIP.  │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Single Redis Node    │ Increased database   │ Redis Sentinel auto-promotes  │
│ Crashes              │ read latency         │ read replica to master.       │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Entire Redis Cluster │ Severe database      │ Circuit breaker + database    │
│ Outage               │ cache stampede       │ rate-limiting + load shedding.│
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ DB Primary Shard     │ Writes fail for 1/N  │ Auto-failover promoting       │
│ Crashes              │ of total keys        │ secondary replica to primary. │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ ID Generator Fails   │ Write path blocked   │ Redundant generator workers   │
│                      │                      │ maintain independent ranges.  │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## 10. Security and Abuse Controls

1. **Rate Limiting (Token Bucket / Sliding Window):**
   - Max 30 writes/minute per IP / authenticated token.
   - Max 1,000 reads/minute per IP to prevent automated link scraping.
2. **Malicious Domain Blacklisting & Phishing Detection:**
   - Scan destination URLs against Google Safe Browsing / PhishTank APIs prior to storing.
   - Block private IP ranges (e.g., `10.0.0.0/8`, `127.0.0.1`, `169.254.169.254`) to prevent Server-Side Request Forgery (SSRF).
3. **CAPTCHA Challenges:**
   - Trigger CAPTCHA verification when anomalous request patterns or bot signatures are detected.
4. **HTTPS / TLS 1.3 Strict Transport Security:**
   - Enforce HTTPS across all short domain endpoints.

---

## 11. Observability and Production Telemetry

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Key Production Observability Metrics                      │
├──────────────────────────┬───────────────────────────────────────────────────┤
│ Metric                   │ Diagnostic Purpose                                │
├──────────────────────────┼───────────────────────────────────────────────────┤
│ QPS (Queries / Sec)      │ Real-time traffic throughput (Read vs Write)      │
│ Cache Hit Ratio (CHR)    │ Health of caching tier (Target: > 85% hit rate)   │
│ DB Query Latency         │ Pinpoints slow disk I/O, lock waits, index misses │
│ P95 / P99 Tail Latency   │ Identifies worst-case response times for users    │
│ HTTP 4xx / 5xx Rates     │ Detects client errors, broken routes, or outages  │
│ Shard Data Imbalance     │ Detects non-uniform hash key distribution         │
│ ID Generation Collisions │ Verifies Snowflake uniqueness and clock drift     │
└──────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 12. Layer-by-Layer Optimization Strategy

```text
Level 1: Database Tier       ──► Shard partitions by hash(key) + Asynchronous Read Replicas
Level 2: Compute Tier        ──► Stateless Horizontal Workers behind Active-Passive Load Balancers
Level 3: In-Memory Caching   ──► Multi-node Redis Cluster with LRU Eviction & Request Coalescing
Level 4: Edge Delivery       ──► Anycast CDN Edge PoPs for static assets & DDoS mitigation
Level 5: Core Services       ──► Decoupled Snowflake 64-bit ID Generation & Async Kafka Analytics
Level 6: Security & Telemetry──► Token-Bucket Rate Limiting + Prometheus/Grafana/ELK Monitoring
```

---

## 13. Architecture Review: Common Pitfalls and Corrections

| Architecture Topic | Common Misconception | Correct Engineering Practice |
| :--- | :--- | :--- |
| **CDN Usage** | "CDNs should blindly cache every redirect response." | Redirect caching must be intentional; permanent `301` caching destroys click analytics and prevents real-time link revocation. |
| **Sticky Sessions** | "Load balancers should use sticky sessions for URL shorteners." | URL shortener APIs are completely stateless; sticky sessions reduce balancing flexibility and impair seamless failover. |
| **Hot-Key Replication** | "Copying a key to multiple Redis servers automatically distributes load." | Redis Cluster routes a key to a single hash slot; multi-node replication requires application-level key salting (`key_1`, `key_2`). |
| **Tail Latency (P95)** | "P95 represents the worst-case system latency." | P95 means 95% of requests completed under that time; the remaining 5% experienced higher latency. P99, P99.9, and max latency capture extreme tail issues. |

---

## 14. Comprehensive Interview Q&A

### Q1. What is a URL shortener, and what are its two primary request paths?
**Answer:** A URL shortener maps long URLs to compact short aliases and redirects visitors to the original destination. The **write path** (`POST /shorten`) validates input, generates a unique ID, encodes it into a short code, and persists the mapping. The **read path** (`GET /{code}`) looks up the short code in cache/database and returns an HTTP redirect response.

### Q2. Why is a single application server insufficient at high scale?
**Answer:** A single server represents a Single Point of Failure (SPOF) and has finite CPU, memory, socket connections, and bandwidth. Horizontal scaling across multiple stateless instances behind a load balancer ensures high availability and elastic throughput.

### Q3. Why use a load balancer in front of the application tier?
**Answer:** Load balancers distribute incoming HTTP traffic evenly across healthy compute instances, terminate SSL/TLS connections, and continuously perform health checks to isolate crashed instances.

### Q4. What is the difference between horizontal and vertical scaling?
**Answer:** Vertical scaling upgrades hardware specifications (CPU, RAM, NVMe disk) on a single node, which has physical hardware ceilings and downtime risks. Horizontal scaling adds more independent server instances to a cluster, providing elastic and cost-effective scaling.

### Q5. Why introduce Redis when data is already stored in the database?
**Answer:** Disk-bound databases incur millisecond latency and have finite connection pools. In-memory caches like Redis resolve lookups in microseconds (< 2ms), offloading read pressure from storage and dramatically improving system throughput.

### Q6. Explain Cache Hit vs. Cache Miss.
**Answer:** A **Cache Hit** occurs when the requested short code mapping exists in Redis, allowing instant response return. A **Cache Miss** requires the application to query the persistent database shard, populate the retrieved mapping into Redis with a TTL, and then return the response.

### Q7. What happens if the entire Redis cache crashes?
**Answer:** Without protection, massive read traffic suddenly inundates database shards, causing a catastrophic **cache stampede**. Mitigations include circuit breakers, aggressive database rate limiting, request coalescing (singleflight), and local in-memory fallback caches.

### Q8. What is a Hot Key, and why is it dangerous?
**Answer:** A hot key is a single URL alias that receives an extreme spike in traffic (e.g., viral social media post). Because Redis Cluster assigns a key to a specific hash slot on a single node, that node's CPU and network become saturated, risking instance failure.

### Q9. How do you mitigate the Hot Key problem?
**Answer:** 
1. Cache redirect responses at CDN edge PoPs with short TTLs.
2. Store hot entries in local in-memory application caches.
3. Salt keys across multiple Redis nodes (`key_0`, `key_1`, ..., `key_N`) and query random shards.
4. Implement request coalescing to collapse identical concurrent misses into one database query.

### Q10. What is Database Sharding?
**Answer:** Sharding partitions a monolithic dataset horizontally across multiple independent database servers. Each shard stores a subset of total records, distributing disk storage and query throughput.

### Q11. What is the difference between Database Sharding and Replication?
**Answer:** Sharding divides data across different machines to scale storage and write capacity. Replication copies identical data across primary and replica nodes to scale read throughput and provide high-availability failover.

### Q12. What is the drawback of simple modulo sharding (`hash(key) % N`)?
**Answer:** When the number of shards $N$ changes (e.g., scaling from 4 to 5 shards), almost all keys are remapped to different shards, necessitating complex global data migration. Consistent hashing or virtual bucket routers minimize key relocation.

### Q13. Why use a distributed ID generator like Twitter Snowflake?
**Answer:** Centralized auto-incrementing database sequences create serial write bottlenecks and single points of failure. Snowflake generates 64-bit globally unique, time-sortable IDs across decentralized worker nodes without coordination lag.

### Q14. Is a 64-bit Snowflake ID directly used as the short URL?
**Answer:** No. The 64-bit numeric ID (e.g., `1542894719283712000`) is converted into a compact alphanumeric string using **Base62 encoding** (`[0-9, a-z, A-Z]`), yielding a concise 6-to-8 character code like `7xQ2aB`.

### Q15. Why enforce a UNIQUE constraint on the database `short_code` column?
**Answer:** It acts as an authoritative defense-in-depth guarantee against ID collisions, software race conditions, or worker node clock rollback bugs, ensuring existing mappings are never overwritten.

### Q16. Detail the complete Write Path flow.
**Answer:** Client $\rightarrow$ Load Balancer $\rightarrow$ Stateless App Server $\rightarrow$ URL validation and rate-limit check $\rightarrow$ Snowflake ID generation $\rightarrow$ Base62 encoding $\rightarrow$ Write to persistent DB shard $\rightarrow$ Return short URL to client.

### Q17. Detail the complete Read Path flow.
**Answer:** Client $\rightarrow$ CDN Edge / Load Balancer $\rightarrow$ App Server $\rightarrow$ Check Redis. On hit, return 302 redirect. On miss, query DB shard replica $\rightarrow$ Backfill Redis with TTL $\rightarrow$ Asynchronously publish click event to Kafka $\rightarrow$ Return 302 redirect.

### Q18. How do you handle a database primary shard failure?
**Answer:** Database orchestrators (e.g., Orchestrator / Patroni / Raft consensus) detect primary node failure via heartbeats, promote a synchronous read replica to primary within seconds, and update shard proxy routing tables.

### Q19. Why are sticky sessions generally an anti-pattern for URL Shorteners?
**Answer:** URL resolution and creation APIs are completely stateless. Sticky sessions introduce server affinity, causing uneven traffic distribution and broken user sessions during server restarts or deployments.

### Q20. What is P95 latency?
**Answer:** P95 latency is the 95th percentile response time, meaning 95% of requests completed faster than this threshold and 5% experienced slower latency. It provides a more accurate metric of user experience than average latency.

### Q21. Which telemetry metrics must be tracked in production?
**Answer:** Queries Per Second (QPS), Cache Hit Ratio (CHR), Database Query Latency, P90/P95/P99 Tail Latency, HTTP 4xx/5xx Error Rates, Shard Data Distribution, and ID Generation Collision Rates.

### Q22. What observability stack is commonly used?
**Answer:** Prometheus for time-series metric collection, Grafana for real-time visualization dashboards, OpenTelemetry/Jaeger for distributed request tracing, and the ELK Stack (Elasticsearch, Logstash, Kibana) for centralized log analysis.

### Q23. How do you protect a URL Shortener against malicious abuse?
**Answer:** Apply token-bucket rate limiting per IP/user, integrate malware/phishing scanning APIs (Google Safe Browsing), block internal network ranges to prevent SSRF, and require CAPTCHA challenges upon detecting anomalous bot behavior.

### Q24. How is link expiration handled at scale?
**Answer:** When resolving links, the application checks `expires_at > NOW()`. A background scheduled cleanup worker lazily deletes or archives expired records during low-traffic periods, and Redis TTLs automatically evict expired cached keys.

### Q25. How do you prevent a Cache Stampede?
**Answer:** Use request coalescing (Singleflight pattern), apply randomized expiration jitter (`TTL + random(0, 300)` seconds), and utilize probabilistic early expiration algorithms (XFetch) to refresh cache before keys expire.

### Q26. Should click analytics be processed synchronously in the redirect request?
**Answer:** No. Synchronous analytics writes add database lock contention and increase redirect latency. The application should asynchronously publish click events to a high-throughput message queue (Apache Kafka / AWS SQS) for decoupled downstream processing.

### Q27. How do you make URL creation idempotent?
**Answer:** Require clients to supply an optional `idempotency_key` header (or hash the user ID + destination URL). If a duplicate request arrives during network retries, the server returns the existing short URL without creating duplicate records.

### Q28. What is the difference between Availability and Durability?
**Answer:** **Availability** is the percentage of time the system successfully processes incoming read/write requests. **Durability** guarantees that once a URL mapping is acknowledged as stored, it will not be lost even in catastrophic hardware failure events.

### Q29. What happens if a short link is revoked but cached by clients or CDNs?
**Answer:** If cached via permanent `301` headers, browsers will continue redirecting until local caches expire. Using temporary `302/307` redirects with short `Cache-Control: max-age=60` headers ensures revocations propagate rapidly.

### Q30. Summarize the complete production URL Shortener design in 60 seconds.
**Answer:** *"I design the system with stateless application servers behind active-passive load balancers. The write path validates the URL, gets a 64-bit unique ID from a decentralized Snowflake generator, encodes it to Base62, and writes to a hash-sharded database with asynchronous replicas. The read path checks a distributed Redis cache cluster first, querying the appropriate database shard on a miss with lazy loading. I use temporary 302 redirects to preserve click analytics emitted asynchronously to Kafka, protect hot keys via CDN edge caching and key salting, enforce token-bucket rate limiting, and monitor the system end-to-end using Prometheus and Grafana."*

---

## 15. Final Revision Checklist

- [ ] Capacity and storage estimations calculated and justified.
- [ ] Write path vs. Read path separation clearly defined.
- [ ] Stateless application tier and high-availability load balancing.
- [ ] Redis cache-aside pattern, TTL eviction, and cache stampede controls.
- [ ] Snowflake 64-bit ID generation and Base62 encoding mechanics.
- [ ] Hash-based database sharding, replication, and failover orchestration.
- [ ] Hot-key mitigation (CDN edge, local cache, key salting).
- [ ] Security defenses: rate limiting, domain scanning, SSRF prevention.
- [ ] Asynchronous event streaming for click telemetry (Kafka / SQS).
- [ ] Comprehensive observability (QPS, CHR, P95/P99 latency, error rates).

---

## 16. Core Takeaway

**A production-ready URL shortener is a high-throughput, read-heavy distributed system. Its reliability and sub-20ms performance depend on efficient in-memory caching, stateless horizontal compute, decentralized collision-free ID generation, hash-sharded persistent storage, and graceful failure handling at every layer.**
