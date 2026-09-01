# System Design Interview — Questions & Answers

A comprehensive reference covering Requirements, Scalability, Load Balancing, Databases, Caching, Distributed Systems, and common failure scenarios.

---

## 1. Requirements & Scope

### How do you clarify functional and non-functional requirements?

**Functional requirements** define *what* the system does:
- Ask: "What are the core user actions?" (e.g., post a tweet, upload a file, place an order)
- Ask: "What does the system need to return?" (e.g., a feed, a confirmation, a report)
- Ask: "Are there read-heavy or write-heavy workflows?"
- Ask: "What are the input/output contracts for each API?"

**Non-functional requirements** define *how well* the system performs:
- **Availability**: 99.9% vs 99.99% uptime?
- **Latency**: p99 < 100ms? Sub-second for all users?
- **Consistency**: Is strong consistency required or is eventual consistency acceptable?
- **Durability**: Can any data loss be tolerated (e.g., analytics vs financial records)?
- **Security**: Auth, encryption, PII handling?
- **Scalability**: Expected peak QPS, data growth rate?

> **Interview tip:** Always restate the requirements back to the interviewer to confirm alignment before designing.

---

### How do you identify the most important requirements when the problem is vague?

1. **Identify the core user journey** — what is the single most critical action a user must be able to perform?
2. **Ask about scale** — is this for 100 users or 100 million users? The scale determines the architecture.
3. **Ask about constraints** — budget, team size, delivery timeline?
4. **Prioritise by impact** — use MoSCoW: Must-Have, Should-Have, Could-Have, Won't-Have.
5. **Clarify edge cases** — "What happens if a user submits twice?" or "What if the user is offline?"
6. **Look for implicit requirements** — e.g., a payments system implicitly needs idempotency and audit logs even if not stated.

---

### How do you estimate traffic — QPS/RPS, concurrent users, and data volume?

Use back-of-envelope estimation with round numbers:

**Daily Active Users (DAU) → QPS:**
```
QPS = DAU × avg_requests_per_user_per_day / 86,400 seconds
```

Example: 10M DAU, each makes 10 requests/day:
```
QPS = 10,000,000 × 10 / 86,400 ≈ 1,157 QPS
Peak QPS ≈ 2–3× average ≈ ~3,000 QPS
```

**Concurrent users:**
```
Concurrent users ≈ QPS × avg_request_duration_in_seconds
```
If avg request takes 0.1s: `3,000 × 0.1 = 300 concurrent connections`

**Data volume:**
```
Writes per day = write_QPS × 86,400
Storage per year = Writes per day × avg_record_size × 365
```

---

### How do you estimate storage requirements?

Break storage into components:

| Component | Estimation Approach |
|---|---|
| **User records** | num_users × avg_record_size |
| **Media / blobs** | uploads_per_day × avg_file_size × retention_days |
| **Logs** | events_per_day × avg_log_entry_size |
| **Database indexes** | ~10–30% overhead on top of raw data |
| **Replication** | multiply by replication factor (typically 3×) |

**Example:** A photo-sharing app with 1M uploads/day at 2 MB avg per photo:
```
Daily storage = 1,000,000 × 2 MB = 2 TB/day
Annual = 2 TB × 365 = 730 TB/year
With 3× replication = ~2.2 PB/year
```

---

### How do you identify the system's bottleneck before choosing technologies?

1. **Profile the critical path** — trace a user request end-to-end and identify the slowest step.
2. **Identify the resource limit** — is it CPU, memory, disk I/O, or network bandwidth?
3. **Find the fan-out factor** — does one request trigger many downstream calls?
4. **Separate reads from writes** — most systems are read-heavy; optimising reads (cache, replicas) often yields the biggest gains.
5. **Model the data access pattern** — is the bottleneck a hot key? A full table scan? An N+1 query?
6. **Use Little's Law** — `Throughput = Concurrency / Latency`. If latency is high, reduce concurrency or increase throughput.

Common bottlenecks by layer:

| Layer | Typical Bottleneck |
|---|---|
| Application | CPU-bound computation, thread-pool exhaustion |
| Database | Slow queries, lock contention, connection limits |
| Cache | Cold cache, cache stampede, memory eviction |
| Network | High latency between services, bandwidth saturation |
| Storage | Disk I/O, IOPS limits on spinning disks |

---

## 2. Scalability

### When would you choose vertical scaling vs horizontal scaling?

| | Vertical Scaling | Horizontal Scaling |
|---|---|---|
| **What** | Upgrade CPU/RAM/disk on one machine | Add more machines |
| **When** | Early stage, stateful services, quick fix | High traffic, commodity hardware, fault tolerance |
| **Pros** | Simple, no code changes, no distributed complexity | Near-infinite scale, fault tolerance, cheaper at scale |
| **Cons** | Hard ceiling (largest machine available), single point of failure, expensive | Requires stateless design, load balancer, distributed coordination |
| **Examples** | RDS instance size upgrade, PostgreSQL | Web servers, microservices, Kafka consumers |

> **Rule of thumb:** Scale vertically first for simplicity; switch to horizontal when you hit the hardware ceiling or need fault tolerance.

---

### How do you scale a monolithic application?

1. **Vertical scale** — increase instance size (CPU/RAM).
2. **Horizontal scale behind a load balancer** — run multiple copies; ensure the app is **stateless** (sessions in Redis, no local file writes).
3. **Separate reads and writes** — add read replicas; route read traffic to replicas.
4. **Extract the bottleneck** — identify the most resource-intensive component (e.g., image processing) and extract it as a separate service.
5. **Add caching** — Redis/Memcached to reduce DB pressure.
6. **Async offloading** — move slow work (emails, reports, image resizing) to a background queue.
7. **CDN for static assets** — offload all static file serving from the app.

---

### When should you introduce load balancers?

Introduce a load balancer when:
- You run **more than one application server instance**.
- You need **zero-downtime deployments** (rolling deploys with health checks).
- You need **automatic failover** when an instance goes down.
- You need to **route traffic by path or host** (API gateway, A/B testing).
- You need **SSL termination** at a central point.

> Even for a single instance, a load balancer (e.g., AWS ALB) is cheap and enables future scaling without DNS changes.

---

### What happens when one server cannot handle the traffic anymore?

1. **Response times increase** — threads/goroutines queue up waiting for CPU.
2. **Connection queues fill** — new connections get refused (TCP RST) or timed out.
3. **Memory pressure** — heap grows, GC pauses increase, eventually OOM kills the process.
4. **Cascading timeouts** — upstream callers retry, amplifying load.

**Mitigation strategies:**
- Add horizontal instances behind a load balancer.
- Implement rate limiting to shed excess load.
- Use a circuit breaker to fail fast instead of queuing.
- Enable autoscaling (Kubernetes HPA, AWS ASG) to provision capacity automatically.

---

### How would you handle 10× traffic growth?

A phased approach:

| Phase | Action |
|---|---|
| **Immediate** | Scale out app servers (horizontal); increase DB connection pool; enable autoscaling |
| **Short-term** | Introduce caching (Redis) to reduce DB hits; add read replicas |
| **Medium-term** | Shard the database; move static assets to CDN; implement async messaging |
| **Long-term** | Decompose into microservices; introduce event-driven architecture; multi-region deployment |

Always start with the bottleneck — don't optimise what isn't breaking.

---

### How do you scale a database when read traffic increases?

1. **Read replicas** — route all `SELECT` queries to replica(s); write only to primary.
2. **Caching layer** — Redis/Memcached in front of the DB for hot data.
3. **Connection pooling** — PgBouncer/ProxySQL to reduce connection overhead.
4. **Query optimisation** — indexes, query rewriting, `EXPLAIN ANALYSE`.
5. **Materialised views** — precompute expensive aggregations.
6. **Search offloading** — move full-text search to Elasticsearch; move analytics to a data warehouse.

---

### How do you scale when write traffic increases?

1. **Vertical scale the primary** — bigger machine handles more IOPS.
2. **Write batching** — buffer writes and flush in batches (reduces round-trips).
3. **Async writes via message queue** — accept writes to Kafka/SQS; process and persist asynchronously.
4. **Database sharding** — split data across multiple primaries by shard key (user_id, region, etc.).
5. **CQRS (Command Query Responsibility Segregation)** — separate write model from read model.
6. **Time-series / append-only stores** — use Cassandra, ScyllaDB, or TimescaleDB for high-write workloads.
7. **In-memory write buffer** — write-behind cache; persist to DB asynchronously.

---

## 3. Load Balancing

### How does a load balancer work?

A load balancer sits between clients and backend servers. It:
1. **Accepts incoming connections** on a virtual IP/port.
2. **Selects a backend server** based on a routing algorithm.
3. **Forwards the request** to the selected server (L4: TCP level; L7: HTTP level).
4. **Health checks** backend servers; removes unhealthy ones from the pool.
5. **Returns the response** to the client (pass-through or proxy).

**L4 vs L7:**
| | Layer 4 | Layer 7 |
|---|---|---|
| Works on | TCP/UDP | HTTP/HTTPS |
| Routing | IP + port | URL path, headers, cookies |
| Examples | AWS NLB, HAProxy TCP | AWS ALB, Nginx, Envoy |

---

### Round-robin vs least-connections vs weighted routing — when would you use each?

| Algorithm | How it works | Best for |
|---|---|---|
| **Round-robin** | Distributes requests sequentially | Homogeneous servers, stateless requests of similar cost |
| **Least-connections** | Routes to the server with the fewest active connections | Variable request duration (e.g., long-polling, file uploads) |
| **Weighted round-robin** | Assigns more traffic to higher-capacity servers | Heterogeneous fleet (some servers are more powerful) |
| **IP hash** | Hashes client IP to a server | Sticky routing without cookies |
| **Random** | Picks a server at random | Simple, low-overhead; works well at scale |

---

### What happens if one application server goes down?

1. The load balancer's **health check** detects the server is unhealthy (failed TCP connect or HTTP 5xx).
2. The server is **removed from the pool** — no new connections are routed to it.
3. **In-flight requests** to that server are lost (unless the LB retries on another server).
4. Clients may see a brief spike in errors during the detection window (typically 5–30 seconds).
5. The remaining servers absorb the traffic.

**Mitigations:** Short health-check intervals, connection draining (graceful shutdown), retry-safe idempotent APIs.

---

### What is health checking?

Health checking is how a load balancer determines whether a backend server can serve traffic.

**Types:**
| Type | How it works |
|---|---|
| **TCP check** | Opens a TCP connection; marks healthy if it succeeds |
| **HTTP check** | Sends `GET /health`; marks healthy if HTTP 200 is returned |
| **Deep health check** | `/health` endpoint verifies DB connectivity, cache connectivity, disk space |

**Key parameters:**
- `interval` — how often to check (e.g., every 10s)
- `timeout` — how long to wait for a response (e.g., 5s)
- `unhealthy_threshold` — consecutive failures before marking unhealthy (e.g., 3)
- `healthy_threshold` — consecutive successes before marking healthy again (e.g., 2)

---

### How do sticky sessions affect scalability?

**Sticky sessions** (session affinity) route all requests from a client to the same backend server. This breaks horizontal scalability because:

- **Uneven load distribution** — one server may be overloaded if it handles many active users.
- **No fault tolerance** — if the pinned server goes down, the session is lost.
- **Prevents autoscaling** — new instances don't receive existing sessions.

**When sticky sessions exist:** They typically indicate server-side session state (in-memory sessions, local file state).

---

### How would you make the application stateless?

Move all state out of the application server:

| State type | Where to move it |
|---|---|
| **User sessions** | Redis (centralised session store with TTL) |
| **Uploaded files** | S3/GCS (object storage) |
| **Temporary computation state** | Redis, Memcached |
| **Auth tokens** | JWT (client-held, stateless) or Redis-backed session |
| **Websocket state** | Redis Pub/Sub or a dedicated connection broker |

Once stateless, any server can handle any request → full horizontal scalability.

---

## 4. Database

### SQL vs NoSQL — how do you decide?

| Choose **SQL** when | Choose **NoSQL** when |
|---|---|
| Data is relational with joins | Data is document-shaped (nested, variable schema) |
| You need ACID transactions | You need extreme write throughput or horizontal scale |
| Schema is stable and well-defined | Schema evolves rapidly or is dynamic |
| Complex queries and aggregations | Simple key-value or time-series lookups |
| Strong consistency is mandatory | Eventual consistency is acceptable |
| Examples: financial records, user accounts | Examples: user activity feeds, logs, product catalogs |

---

### When should you use PostgreSQL/MySQL instead of MongoDB/DynamoDB?

**Use PostgreSQL/MySQL when:**
- You have **relational data** with foreign keys (orders → line items → products).
- You need **multi-table ACID transactions** (e.g., debit account A, credit account B atomically).
- You need **complex SQL queries** (window functions, CTEs, aggregations).
- Your schema is **fixed and normalised**.

**Use MongoDB when:**
- Data is **hierarchical or document-like** (e.g., a product with variable attributes).
- Schema changes **frequently** during development.
- You need **flexible queries** without strict joins.

**Use DynamoDB when:**
- You need **massive scale** (millions of writes/sec) with predictable low latency.
- Access patterns are **well-defined and key-based** (no complex queries).
- You want **fully managed, serverless** infrastructure.

---

### What is database replication?

Replication is the process of **copying data from one database node (primary) to one or more other nodes (replicas)**.

**Why:** High availability, read scaling, disaster recovery, backups without impacting the primary.

**How it works (PostgreSQL WAL streaming):**
1. Primary writes changes to the Write-Ahead Log (WAL).
2. Replica streams the WAL and replays it to stay in sync.
3. Replica is readable but read-only.

**Replication lag:** Replicas may be milliseconds to seconds behind the primary — reads from replicas may return slightly stale data.

---

### Primary-replica vs multi-primary — when would you use them?

| | Primary-Replica | Multi-Primary |
|---|---|---|
| **Writes** | Only to primary | To any node |
| **Reads** | From replicas | From any node |
| **Consistency** | Strong on primary | Eventual / conflict resolution needed |
| **Complexity** | Low | High (write conflicts, split-brain risk) |
| **Use case** | Most web applications | Geo-distributed writes (e.g., global e-commerce), CockroachDB, Cassandra |

---

### What happens when the primary database fails?

1. **Replication stops** — replicas stop receiving updates.
2. **Writes fail** — all write queries to the primary fail.
3. **Automatic failover** (if configured) — a replica is promoted to primary; DNS or proxy is updated.
4. **Data loss risk** — if replication was async, the promoted replica may be behind the failed primary (RPO > 0).
5. **Split-brain risk** — if the old primary comes back online, two nodes may both think they are primary.

**Solutions:** Patroni (PostgreSQL HA), AWS RDS Multi-AZ, synchronous replication for zero data loss, fencing/STONITH to prevent split-brain.

---

### What is database sharding?

Sharding is **horizontal partitioning** — splitting a large dataset across multiple independent database nodes (shards), each owning a subset of the data.

```
User IDs 1–1M    → Shard 1 (DB server A)
User IDs 1M–2M   → Shard 2 (DB server B)
User IDs 2M–3M   → Shard 3 (DB server C)
```

A **shard router** (or application logic) determines which shard to query for a given key.

**Benefits:** Each shard handles a fraction of total load; data volume per shard is manageable.

---

### How do you choose a shard key?

A good shard key must:
1. **Distribute data evenly** — avoid one shard receiving disproportionate traffic.
2. **Co-locate related data** — queries that access related records should hit the same shard.
3. **Not be monotonically increasing** — auto-increment IDs all land on the last shard → hot partition.

| Shard key | Good for | Risk |
|---|---|---|
| `user_id` (hash) | User-centric apps | Cross-user queries span shards |
| `tenant_id` | Multi-tenant SaaS | Large tenants = hot shard |
| `geo_region` | Geo-distributed apps | Uneven regional traffic |
| `hash(user_id) % N` | Even distribution | No locality guarantees |

---

### What happens if your shard key creates a hot partition?

A **hot partition** is when one shard receives significantly more traffic than others — becoming the bottleneck.

**Causes:** Celebrity users, trending events, monotonically increasing keys.

**Fixes:**
1. **Add a random suffix/prefix** to the shard key (e.g., `user_id + random(0–9)`) — spreads hot key across 10 sub-shards.
2. **Re-shard** — redistribute data with a new shard key.
3. **Cache the hot key** — serve hot reads from Redis instead of hitting the DB.
4. **Application-level routing** — detect hot shards and route differently.

---

### How do indexes improve performance, and when can they hurt?

**How they help:**
- Indexes allow the DB to find rows in `O(log N)` (B-tree) instead of `O(N)` (full table scan).
- Covering indexes avoid reading the actual table — the index contains all needed columns.
- Dramatically improve `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` performance.

**When they hurt:**
- **Write overhead** — every `INSERT`, `UPDATE`, `DELETE` must update all relevant indexes.
- **Storage cost** — indexes consume disk space (can exceed the table size).
- **Too many indexes** — the query planner may pick a suboptimal index.
- **Low-cardinality indexes** — an index on a boolean column (true/false) is often useless.

> **Rule:** Index columns used in `WHERE` clauses and `JOIN` conditions; avoid over-indexing write-heavy tables.

---

### How do you handle database connection-pool exhaustion?

**What happens:** App servers exceed the DB's `max_connections` limit → new queries fail with "too many connections".

**Solutions:**
1. **Connection pooler** — deploy PgBouncer (PostgreSQL) or ProxySQL (MySQL) between app and DB; they multiplex many app connections onto fewer DB connections.
2. **Reduce pool size per app instance** — set `max_pool_size = max_db_connections / num_app_instances`.
3. **Timeout and queue** — queue connection requests briefly instead of failing immediately.
4. **Async I/O** — use async DB drivers (asyncpg, Drizzle ORM) that are more connection-efficient.
5. **Scale the DB** — larger instance supports more connections.

---

## 5. Caching

### When should you introduce Redis/cache?

Introduce a cache when:
- **Read traffic is much higher than write traffic** (data rarely changes but is read frequently).
- **Database queries are slow** and the same query is executed repeatedly.
- **Computation is expensive** (e.g., aggregation, ML inference) and results can be reused.
- **Session storage** is needed without a full DB round-trip.
- **Rate limiting / counters** need sub-millisecond increments.
- **Pub/Sub messaging** between services.

> Don't cache unless you've profiled and confirmed the DB is the bottleneck.

---

### Cache-aside vs write-through vs write-behind — which would you choose?

| Strategy | How it works | Pros | Cons | Best for |
|---|---|---|---|---|
| **Cache-aside (lazy loading)** | App checks cache first; on miss, reads DB and populates cache | Simple, only caches what is needed | Cache miss on first read, stale data possible | Read-heavy, general purpose |
| **Write-through** | Every write goes to both cache and DB synchronously | Cache always fresh | Higher write latency, caches data that may never be read | Write + read workloads where freshness is critical |
| **Write-behind (write-back)** | Write to cache immediately; async flush to DB | Very fast writes | Risk of data loss if cache crashes before flush | High-write, latency-sensitive (counters, analytics) |

> **Most common choice:** Cache-aside for reads + write-through for critical data.

---

### What happens when cached data becomes stale?

Stale data means the cache returns an outdated value because the underlying DB was updated without the cache being invalidated.

**Consequences:** Users see outdated information — acceptable for some use cases (product catalog) but not for others (account balance, inventory).

**Prevention:**
- Set a **TTL (Time to Live)** — cache entries expire and are refreshed from DB.
- **Invalidate on write** — when DB is updated, delete or update the corresponding cache key.
- **Event-driven invalidation** — use CDC (Change Data Capture) or DB triggers to invalidate caches.

---

### How do you invalidate a cache?

| Strategy | How | Tradeoff |
|---|---|---|
| **TTL expiry** | Set `EXPIRE` on the key | Simple, eventual consistency |
| **Delete on write** | `DEL key` every time the DB record changes | Immediate consistency, requires write-path coordination |
| **Cache versioning** | Include a version in the key (`user:42:v7`) | Avoids stale reads, old keys stay until evicted |
| **Event-driven** | Kafka/DB CDC fires invalidation events to cache workers | Decoupled, scalable, slight delay |

> Prefer **delete on write** over TTL alone for data where stale reads cause real problems.

---

### What is a cache stampede?

A **cache stampede** (also called "thundering herd") occurs when a popular cache key **expires** and many concurrent requests all find a cache miss at the same time. Every request simultaneously queries the database, overwhelming it.

```
T=0:  Key expires
T=1:  1,000 requests find cache MISS
T=1:  1,000 requests hit the DB simultaneously
T=2:  DB is overwhelmed, latency spikes, some requests time out
```

---

### How would you prevent cache stampede?

1. **Mutex / distributed lock** — only the first thread to get a lock recomputes; others wait and read from cache when done.
2. **Probabilistic early expiration** — start refreshing the cache slightly before it expires (random jitter on TTL).
3. **Background refresh** — a background worker refreshes cache keys before they expire (never let them go cold).
4. **Stale-while-revalidate** — serve stale data to users while a background process refreshes the cache.
5. **Request coalescing** — collapse multiple identical in-flight requests into one DB query.

---

### What happens if Redis goes down?

**Immediate impact:**
- Cache misses for all requests → all traffic falls through to the database.
- **DB is hit directly** — risk of DB overload if traffic is high.
- Session-based auth may fail if sessions are stored only in Redis.
- Rate limiters/counters may stop working.

**Mitigation:**
- **Circuit breaker** — detect Redis failure; fall back to DB directly with reduced rate limiting.
- **Redis Sentinel / Redis Cluster** — automatic failover to a replica.
- **Graceful degradation** — serve stale responses or reduced-functionality pages.
- **DB capacity headroom** — size the DB to handle full traffic as a safety net.

---

## 6. Distributed Systems

### What happens when services cannot communicate with each other?

A **partial network failure** or **service outage** causes:
- Requests time out or return errors.
- Connection pools fill with waiting threads.
- Upstream services queue retries → **retry storms** amplify the failure.
- Without circuit breakers, the failure **cascades** to healthy services.

**Solutions:**
- **Timeouts** — never wait indefinitely; set aggressive read/connection timeouts.
- **Retries with exponential backoff** — reduce retry pressure.
- **Circuit breaker** — stop sending requests to a failing service; fail fast.
- **Bulkhead** — isolate thread pools per downstream service so one failure doesn't starve others.
- **Fallback** — serve cached/default responses when the dependency is down.

---

### What is the CAP theorem?

In any distributed system, you can guarantee only **2 of 3** properties simultaneously:

| Property | Meaning |
|---|---|
| **C — Consistency** | Every read receives the most recent write or an error |
| **A — Availability** | Every request receives a response (not necessarily the latest data) |
| **P — Partition Tolerance** | The system continues to operate despite network partitions |

> **Network partitions are inevitable** in distributed systems (P must always be tolerated). The real choice is between **C** and **A** during a partition.

---

### CP vs AP — how do you decide?

| | CP (Consistency + Partition Tolerance) | AP (Availability + Partition Tolerance) |
|---|---|---|
| **During partition** | Rejects requests to avoid serving stale data | Continues serving, possibly stale data |
| **Examples** | HBase, Zookeeper, etcd, MongoDB (with writeConcern: majority) | Cassandra, DynamoDB, CouchDB, DNS |
| **Choose when** | Data correctness is critical (banking, inventory, config) | Always-on availability matters more (social feeds, search, recommendations) |

---

### What is eventual consistency?

Eventual consistency guarantees that **if no new updates are made, all replicas will converge to the same value over time**. There is no guarantee of when — it could be milliseconds or seconds.

**Example:** You update your Twitter bio. For a few seconds, some data centres show the old bio, others the new one. Eventually all nodes converge.

**Acceptable for:** Social media feeds, product recommendations, search indexes, analytics dashboards.

**Not acceptable for:** Bank balances, inventory counts, booking confirmations.

---

### How do you prevent duplicate processing of the same request/event?

**Idempotency** — design operations so they can be executed multiple times with the same result:

1. **Idempotency key** — client generates a unique key per request (UUID). Server stores processed keys; if the same key arrives again, return the cached response.
2. **Deduplication table** — store `(event_id, processed_at)` in DB; skip events whose ID already exists.
3. **Idempotent operations** — use `INSERT ... ON CONFLICT DO NOTHING` or `UPSERT` instead of plain `INSERT`.
4. **Exactly-once semantics** — Kafka transactional producers + idempotent consumers can guarantee exactly-once delivery.
5. **Conditional writes** — use optimistic locking (version numbers) or DB transactions to prevent double-processing.

---

## 7. Failure Scenarios

### Traffic

#### What if traffic suddenly becomes 100× higher?

1. **Autoscaling triggers** — Kubernetes HPA / AWS ASG adds app instances (handles burst within minutes).
2. **CDN absorbs static traffic** — offloads 60–80% of web traffic.
3. **Rate limiting** — shed excess load at the edge (API gateway, load balancer).
4. **Queue the work** — push write requests to Kafka/SQS; process asynchronously to smooth load spikes.
5. **Circuit breakers** — stop non-critical services from getting overwhelmed.
6. **Pre-scale** — if the spike is predictable (flash sale, product launch), provision capacity ahead of time.

---

#### What if one API receives a traffic spike?

1. **Rate limit** that specific endpoint.
2. **Cache the response** — if the response is cacheable, serve from Redis/CDN.
3. **Throttle per-user** — identify clients causing the spike (DDoS? crawler?) and throttle/block.
4. **Async processing** — accept the request immediately, process in background, return job ID.
5. **Scale that service independently** (microservices advantage).

---

#### What if a single customer generates most of the traffic?

This is a **hot tenant** problem in multi-tenant systems:

1. **Per-tenant rate limiting** — apply stricter limits to the high-volume tenant.
2. **Tenant isolation** — route the large tenant to dedicated infrastructure (database shard, app instance).
3. **Billing tiers** — large tenants pay for dedicated capacity.
4. **Async offloading** — their heavy operations run in isolated worker queues.

---

### Database

#### What if PostgreSQL reaches 90% CPU?

1. **Identify the cause**: `pg_stat_activity` shows running queries; `pg_stat_statements` shows the heaviest ones.
2. **Kill long-running queries**: `SELECT pg_terminate_backend(pid)`.
3. **Add missing indexes** on the problematic queries.
4. **Enable connection pooling** (PgBouncer) to reduce overhead.
5. **Route reads to replicas** — remove read load from the primary.
6. **Vertical scale** — increase instance size for more CPU cores.
7. **Query optimisation** — rewrite slow queries, use `EXPLAIN ANALYSE`.

---

#### What if database connections are exhausted?

1. **Deploy PgBouncer** in transaction-pooling mode immediately — this multiplexes thousands of app connections onto tens of DB connections.
2. **Reduce pool size** per app server (`max_pool = max_db_connections / num_servers`).
3. **Kill idle connections**: `SELECT pg_terminate_backend(pid) WHERE state = 'idle'`.
4. **Increase `max_connections`** in `postgresql.conf` (requires restart; also increases memory usage).
5. **Audit connection leaks** — ensure app code closes connections in `finally` blocks.

---

#### What if the primary database crashes?

1. **Automatic failover** (Patroni, AWS RDS Multi-AZ) promotes a replica to primary within 30–60 seconds.
2. **Update application config** (or DNS) to point to the new primary.
3. **Check for data loss** — how far behind was the promoted replica (replication lag)?
4. **Inform clients** — return 503 during failover window with `Retry-After` header.
5. **Post-mortem** — identify root cause (OOM? disk full? hardware failure?); prevent recurrence.

---

#### What if one shard becomes extremely hot?

1. **Cache the hot keys in Redis** — remove the hot-shard reads from the DB entirely.
2. **Sub-shard the hot key** — split the hot shard into 2–4 smaller shards.
3. **Add random prefix** — split a single hot key into N virtual keys distributed across shards.
4. **Read replicas for that shard** — add read replicas specifically for the overloaded shard.
5. **Re-shard** — long-term, choose a better shard key with more even distribution.

---

#### What if a query suddenly takes 10 seconds?

1. **Run `EXPLAIN ANALYSE`** — identify full table scans, missing indexes, bad join order.
2. **Check for lock contention** — `pg_locks` / `pg_stat_activity` may show blocked queries.
3. **Check for autovacuum** — a table bloated with dead tuples causes slow sequential scans.
4. **Add an index** for the column in the `WHERE` clause.
5. **Kill the query** if it's blocking other operations.
6. **Set `statement_timeout`** — prevent slow queries from holding connections indefinitely.
7. **Rewrite the query** — break up into smaller steps, use CTEs, avoid `SELECT *`.

---

### Cache

#### What if Redis crashes?

1. **Circuit breaker opens** — app detects Redis unavailability; falls back to DB.
2. **Redis Sentinel / Cluster failover** — replica promoted to primary automatically.
3. **DB load spike** — all cache misses hit DB; monitor DB CPU and connections.
4. **Graceful degradation** — disable non-critical features that depend on Redis (e.g., recommendation engine).
5. **Warm the cache** — after Redis recovers, pre-populate critical keys to avoid cold-cache storm.

---

#### What if the cache is empty? (Cold Start)

A **cold cache** after a restart sends all requests to the DB:

1. **Cache warming** — on startup, proactively load the most frequently accessed keys into Redis.
2. **Lazy population** — let the cache fill naturally through cache-aside; ensure the DB can handle the initial load.
3. **Staggered rollout** — restart Redis replicas one at a time so some cached data remains available.
4. **Rate limiting** — temporarily rate limit traffic during cache warm-up to protect the DB.

---

#### What if millions of requests try to populate the same key? (Cache Stampede)

1. **Distributed lock (Redis `SET NX`)** — only one request gets the lock and populates the cache; others wait.
2. **Probabilistic early expiration** — start refreshing before TTL expires using jitter.
3. **Stale-while-revalidate** — serve the stale value while one background process refreshes.
4. **Request coalescing** — deduplicate in-flight requests for the same key.

---

#### What if cached data is stale?

1. **Evaluate the tolerance** — is stale data acceptable for this use case (product images: yes; account balance: no)?
2. **Reduce TTL** — shorter TTL means data goes stale less.
3. **Invalidate on write** — delete the cache key whenever the DB record changes.
4. **Event-driven invalidation** — subscribe to DB change events (CDC via Debezium) to invalidate proactively.
5. **Cache versioning** — embed a version number in the cache key; writes increment the version.

---

### Messaging

#### What if Kafka is unavailable?

1. **Producer-side buffering** — Kafka producers buffer messages locally and retry when Kafka recovers (configure `retries` and `buffer.memory`).
2. **Outbox pattern** — write messages to a DB "outbox" table first; a separate relay process reads from the outbox and publishes to Kafka. DB write and message sending are atomic.
3. **Circuit breaker** — stop publishing; accumulate in-memory or in local storage.
4. **Fallback queue** — write to a secondary queue (SQS, RabbitMQ) if Kafka is down.
5. **Alerting and SLA monitoring** — Kafka downtime is a P1 incident; ensure auto-recovery with multiple brokers.

---

#### What if a consumer crashes?

1. **Kafka retains messages** — uncommitted offsets mean the message is not lost; the consumer group rebalances and another consumer picks up from the last committed offset.
2. **Dead-letter queue (DLQ)** — after N failed retries, route the message to a DLQ for manual inspection.
3. **Idempotent processing** — ensure consuming the same message twice has no side effects (see idempotency section).
4. **Health checks and restart policies** — Kubernetes `restartPolicy: Always` auto-restarts crashed consumers.

---

#### What if the same message is delivered twice?

At-least-once delivery is the default in Kafka and most message queues — **design consumers to be idempotent**:

1. **Deduplication table** — store processed `message_id`s; skip duplicates.
2. **Idempotent DB operations** — `UPSERT` / `INSERT ON CONFLICT DO NOTHING`.
3. **Kafka exactly-once** — use Kafka transactions with `enable.idempotence=true` and transactional producers.
4. **Business-level idempotency** — "apply a discount" is idempotent if you check whether it was already applied.

---

#### What if messages arrive out of order?

1. **Partition ordering** — Kafka guarantees order only within a partition. Use the same partition key for related events (e.g., all events for `order_id=42` go to the same partition).
2. **Sequence numbers** — embed a sequence number in each message; consumer reorders before processing.
3. **Event-time windowing** — use a short buffering window (e.g., 5 seconds) to collect and reorder events before processing.
4. **Design for idempotency and commutativity** — if possible, design operations that tolerate out-of-order delivery.

---

#### What if a consumer is slower than the producer? (Backpressure)

1. **Scale consumers horizontally** — add more consumer instances (up to the number of partitions).
2. **Increase Kafka partitions** — more partitions = more parallel consumers.
3. **Optimise the consumer** — batch processing, async I/O, reduce DB round-trips.
4. **Rate-limit the producer** — slow down the source if the consumer cannot keep up.
5. **Monitor consumer lag** — alert when `consumer_lag` exceeds a threshold.
6. **Separate fast and slow consumers** — split into two topics: fast-path for real-time, slow-path for batch processing.

---

### APIs

#### What if the client retries the same request?

If the API is not idempotent, retries can cause duplicate operations (e.g., charging a credit card twice).

**Solution:** Implement **idempotency keys**:
1. Client generates a unique UUID per logical request and sends it in the header (`Idempotency-Key: uuid`).
2. Server stores the result of the first request keyed by the UUID.
3. Subsequent requests with the same key return the stored result without re-executing.
4. Store idempotency keys with a TTL (e.g., 24 hours).

---

#### What if a request times out but actually succeeds?

This is the **"dual write" problem** — the operation completed server-side but the client never received the confirmation.

**Solutions:**
1. **Idempotency keys** — the client retries with the same key; the server returns the cached response.
2. **Check-then-act** — client queries the status endpoint before retrying (`GET /orders/{id}`).
3. **Return a job/request ID immediately** — client polls the status endpoint asynchronously.
4. **Optimistic locking** — the server rejects duplicate writes if the resource already reflects the change.

---

#### How do you make the API idempotent?

1. **Use PUT/PATCH instead of POST** for state-changing operations where possible (PUT is naturally idempotent).
2. **Idempotency key header** — store and replay results for duplicate requests.
3. **Unique constraint in DB** — `INSERT ... ON CONFLICT DO NOTHING` prevents duplicate records.
4. **Version/condition checks** — `If-Match: etag` or `version: 3` prevents double-processing.
5. **Check-before-write** — check if the desired end state already exists; skip the operation if so.

---

#### How do you handle duplicate requests?

1. **At the API gateway** — detect duplicates by hashing request body + user ID within a short window.
2. **Idempotency key** — as above.
3. **DB unique index** — `(user_id, order_reference)` unique constraint rejects true duplicates at the DB level.
4. **Request fingerprinting** — hash the request payload and store recently seen hashes.

---

### Distributed Services

#### What if Service A is healthy but Service B is down?

1. **Timeouts** — Service A must not wait indefinitely; set connection and read timeouts.
2. **Circuit breaker** — after N failures, Service A stops calling Service B and fails fast.
3. **Fallback** — return cached data, a default response, or a degraded response.
4. **Retry with backoff** — for transient failures, retry 2–3 times with exponential backoff + jitter.
5. **Async decoupling** — if Service B can process requests asynchronously, enqueue the work and process when B recovers.

---

#### What if Service B takes 30 seconds to respond?

1. **Set timeouts aggressively** — if the SLA is 200ms, reject after 500ms; never wait 30 seconds.
2. **Thread pool exhaustion** — 30-second waits tie up threads, starving other requests; bulkheads isolate thread pools per downstream service.
3. **Circuit breaker** — after repeated slow responses, open the circuit and fail fast.
4. **Async + callback** — don't block synchronously; accept the request and notify via webhook/event when done.
5. **Investigate Service B** — is it a query bottleneck? A memory leak? An external dependency?

---

#### What if there is a network partition?

A network partition means some nodes cannot communicate. Per CAP theorem, you must choose:

**If you chose CP (consistency):**
- Nodes on the minority side of the partition reject requests (return errors) to prevent serving stale data.
- System is unavailable during the partition.

**If you chose AP (availability):**
- All nodes continue serving requests, possibly with stale data.
- When the partition heals, conflict resolution runs (last-write-wins, CRDTs, vector clocks).

**Design guidance:**
- Use **fencing tokens** to prevent split-brain writes.
- Design data models to be **conflict-free** where possible (append-only, CRDTs).
- Implement **reconciliation jobs** to detect and fix diverged state after partitions heal.

---

#### How do you prevent cascading failures?

Cascading failures occur when one service's failure propagates to others through dependency chains.

**Prevention toolkit:**

| Pattern | How it helps |
|---|---|
| **Timeouts** | Prevent waiting indefinitely for a slow dependency |
| **Circuit breaker** | Stop sending requests to a failing service; fail fast |
| **Bulkhead** | Isolate thread pools so one dependency can't starve others |
| **Rate limiting** | Prevent any one client from overwhelming a service |
| **Retry with backoff + jitter** | Avoid retry storms amplifying the original failure |
| **Load shedding** | Drop low-priority requests under extreme load to protect core functionality |
| **Graceful degradation** | Return partial/cached responses instead of hard failures |
| **Health checks + autoscaling** | Replace unhealthy instances; scale up before saturation |

> **Key insight:** Most cascading failures are caused by the absence of timeouts and circuit breakers. Add both to every synchronous service call.

---

*Related: System Design, Distributed Systems, CAP Theorem, Kafka, Redis, PostgreSQL, Kubernetes*
