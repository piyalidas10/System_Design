# Day 6 — Designing a Production-Ready URL Shortener

**The cartoon-style infographic above illustrates a production-grade URL Shortener architecture, from the initial user request through caching, distributed ID generation, database sharding, security, and monitoring.**

<img src="./Production-Grade URL Shortener Architecture-1.png" width="90%" />

The architecture includes:
- System architecture: Client → CDN/WAF → Load Balancer → Stateless Application Servers.
- Write flow: Generate a unique ID → encode it using Base62 → persist the URL mapping → return the short URL.
- Read flow: Resolve the short code → check Redis → query the appropriate database shard on a cache miss → return an HTTP redirect.
- Production components: Redis cache, ID generator, shard router, database replicas, and observability stack.
- Reliability and security: Cache failures, replication lag, resharding, URL validation, rate limiting, and abuse protection.
- Capacity planning: Illustrative assumptions of 100 million writes/day and 1 billion reads/day, with average requests per second.
- Interview-ready considerations: P95 latency, collision prevention, high availability, scalability, and operational monitoring.

> Architect's recommendation: Start with a stateless application, a durable database, and Redis caching. Introduce sharding, replication, distributed ID generation, and multi-region deployment as measured traffic and availability requirements justify them.


**It focuses on system components, request flows, data storage, scaling, reliability, and security.**

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

> For an actual implementation, I would start with a stateless service, a primary database, and Redis, then introduce sharding and multi-region deployment when measured traffic and availability requirements justify the added complexity.


## Structured study notes, architecture diagrams, technical accuracy review, and interview Q&A

**Primary source:** Uploaded Day 6 transcript, "Production-Ready URL Shortener" (~44 minutes).  
**How to read these notes:**
- **Transcript content** means the point is present in the speaker's explanation.
- **Technical correction / production note** means clarification or additional engineering context added to make the design more accurate and useful in interviews.
- Capacity numbers are **illustrative assumptions from the transcript**, not universal requirements or measured production facts.

---

## 1. Problem statement and goals

A URL shortener accepts a long URL and returns a compact URL. When someone visits the short URL, the service finds the original URL and redirects the visitor.

Example:

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

The transcript mentions sharing short links on social media and other places, plus collecting analytics.

### Core functional requirements

1. **Create a short link:** accept a long URL and generate a unique short code.
2. **Resolve a short link:** map a short code to the original URL and redirect the visitor.
3. **Store the mapping:** persist short-code-to-long-URL data.
4. **Support analytics:** the transcript describes the service as useful for analytics, though it does not fully specify the analytics data model.
5. **Optional expiration and abuse controls:** the transcript later mentions link expiry, validation, blacklisting, and rate limiting.

### Important requirements to clarify in an interview

- Are custom aliases supported?
- Do links expire? Can the owner revoke them?
- Is click analytics required? Which fields: count, timestamp, referrer, geography?
- Is a link public or private?
- What are the expected write/read rates and retention period?
- What redirect status code and caching policy are required?
- What are the latency, availability, durability, and consistency targets?

**Production note:** These are scope questions, not all requirements established by the transcript. Clarify them before choosing the architecture.

---

## 2. Capacity assumptions from the transcript

The speaker uses a large-scale example of approximately:

| Operation | Transcript assumption | Why it matters |
| :--- | :--- | :--- |
| **URL creation / writes** | ~100 million per day | The write path and durable storage must scale |
| **Short-link visits / reads** | ~1 billion per day | Reads greatly outnumber writes; caching and efficient lookups matter |

The transcript has an inconsistent spoken figure in one section, briefly referring to around one million reads, while repeatedly using approximately **one billion reads per day** elsewhere. These notes retain the repeated figure as the working assumption.

Using 100 million writes/day and 1 billion reads/day:

- **Average writes/second:** $\frac{100,000,000}{86,400} \approx 1,157$
- **Average reads/second:** $\frac{1,000,000,000}{86,400} \approx 11,574$
- **Read-to-write ratio:** approximately **10:1**

These are averages, not peak traffic. Real capacity planning must account for peaks, regional patterns, retries, bot traffic, cache hit rate, data size, and growth.

**Technical correction:** A daily total alone is not enough to size servers. Estimate peak requests per second, request/response sizes, latency goals, database operations per request, and expected cache hit rate.

---

## 3. Architecture evolution

### 3.1 Starting point: one application server and one database

**Transcript content:** The initial design has a client, CDN for static content, one application server, and one database. This may work at low load but becomes a bottleneck at the assumed scale.

```text
                 +------------------+
                 |      Client      |
                 +---------+--------+
                           |
                           v
                 +------------------+
                 | CDN (static      |
                 | assets/content)  |
                 +------------------+
                           |
                           v
                 +------------------+
                 | Application      |
                 | Server (single)  |
                 +---------+--------+
                           |
                           v
                 +------------------+
                 | Database         |
                 | (single)         |
                 +------------------+
```

**Problems:**
- The application server is a single point of failure (SPOF).
- A single app instance has finite CPU, memory, connection, and throughput capacity.
- A single database can become a read/write, storage, or connection bottleneck.
- The design has limited fault tolerance.

**Technical correction:** A CDN is not automatically in the redirect path for every URL-shortener request. It commonly serves static frontend assets. It can cache redirect responses if deliberately configured, but redirect caching must respect expiration, revocation, cache keys, and freshness requirements.

---

### 3.2 Scale the application tier horizontally

**Transcript content:** Add multiple application servers and use a load balancer to decide which server receives each request.

```text
                       +------------------+
Client --------------->| Load Balancer    |
                       +--------+---------+
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
                         | Database tier    |
                         +------------------+
```

**Benefits:**
- Requests can be spread across instances.
- One failed application instance need not take down the whole service.
- Capacity can be increased by adding instances.
- Deployments and maintenance can be safer with health checks and rolling replacement.

**Load-balancing approaches mentioned in the transcript:**
- Round robin
- Weighted round robin
- Sticky sessions

**Technical correction:** Sticky sessions are usually unnecessary for a stateless URL-shortener API. They can reduce balancing flexibility and make failover less smooth. Prefer stateless app servers and shared external state unless there is a specific reason to use session affinity. A load balancer also needs high availability; a single self-hosted load balancer can simply become the next SPOF.

---

### 3.3 Add a cache

**Transcript content:** Redis is introduced to reduce database reads and improve response time. A cache hit avoids a database lookup; a cache miss requires a database read, after which the result can be cached.

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
Redis Cache -- HIT --> Return destination / redirect
  |
 MISS
  v
Database lookup
  |
  v
Populate cache
  |
  v
Return destination / redirect
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

---

### 3.4 Add distributed ID generation and scale the database

**Transcript content:** The speaker says ID generation should be distributed, and discusses scaling beyond one database using sharding and replication.

```text
                         +----------------------+
Create URL ------------->| Application tier     |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Distributed ID       |
                         | generator            |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Short-code creation  |
                         | / encoding           |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Shard routing        |
                         +----+----------+------+
                              |          |
                      +-------v--+  +----v-------+
                      | Shard 1  |  | Shard 2     |  ... more shards
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

## 4. Final high-level architecture

The following diagram combines the transcript's main components into one logical view. It is a conceptual architecture, not a vendor-specific deployment diagram.

```text
                         +----------------------+
                         | Browser / Mobile App |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | DNS / CDN / WAF      |
                         | static assets, edge  |
                         | protections/cache*   |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Highly available     |
                         | Load Balancer /      |
                         | API entry point      |
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
                 | Redis Cache    |  | ID Generator      |
                 | short_code ->  |  | distributed       |
                 | long_url       |  | uniqueness logic  |
                 +-------+--------+  +-------------------+
                         |
                         | cache miss
                         v
                 +----------------------+
                 | Shard Router /       |
                 | database access layer|
                 +----------+-----------+
                            |
               +------------+-------------+
               |            |             |
               v            v             v
          +---------+  +---------+   +---------+
          | Shard 1 |  | Shard 2 |   | Shard N |
          +----+----+  +----+----+   +----+----+
               |            |             |
            replicas      replicas      replicas

     Cross-cutting: metrics, logs, traces, alerts, security,
     rate limiting, URL validation, expiry/revocation policy
```

`*` **Production note:** Edge caching of redirects is optional and policy-dependent. Static assets are the more conventional CDN use case. The redirect mapping and its freshness requirements determine whether caching a redirect is safe.

### Responsibilities by component

| Component | Responsibility | Key consideration |
| :--- | :--- | :--- |
| **Client** | Creates links and opens short URLs | Retry behavior and user experience |
| **CDN / WAF** | Serves static assets; may provide edge protections and carefully configured caching | Cache policy, abuse filtering, invalidation |
| **Load balancer** | Routes traffic to healthy application instances | Health checks and high availability |
| **Application servers** | Validate input, execute create/resolve logic, return redirects | Statelessness, timeouts, idempotency |
| **Redis** | Caches hot/recent short-code mappings | TTL, eviction, outage fallback, stampede control |
| **ID generator** | Creates unique IDs | Worker uniqueness, clock behavior, collision handling |
| **Short-code encoder** | Converts an ID into a compact representation, such as Base62 | Code length and public predictability |
| **Shard router** | Chooses the database shard for a code | Stable mapping and resharding |
| **Database shards** | Persist URL mappings | Durability, indexes, backups, capacity |
| **Replicas** | Provide copies for failover and/or read traffic | Replication lag and consistency |
| **Observability stack** | Metrics, logs, traces, dashboards, alerts | Actionable SLOs and alert thresholds |

---

## 5. Write path: creating a short URL

### Transcript flow

1. Client sends a create request with a long URL.
2. Load balancer routes the request to an application server.
3. The application validates the input.
4. A distributed ID generator supplies a unique identifier.
5. The system derives a short code from the identifier.
6. The mapping from short code to long URL is stored in the database.
7. The application returns the short URL to the client.

```text
Client
  |
  | POST /urls { "longUrl": "https://example.com/..." }
  v
Load Balancer
  |
  v
Application Server
  |
  +--> Validate URL and apply policy
  |
  +--> Request unique ID
  |        |
  |        v
  |    Distributed ID Generator
  |
  +--> Encode ID as short code
  |
  +--> Persist (short_code, long_url, metadata)
  |        |
  |        v
  |    Correct database shard
  |
  v
Return short URL to client
```

### Production correctness details

- **Persist before returning success:** do not return a usable link before its mapping is durably accepted according to the system's durability contract.
- **Uniqueness:** enforce a unique constraint on the short code. Handle conflicts safely.
- **Idempotency:** consider an idempotency key for client retries so a retried create request does not unintentionally create duplicate records.
- **URL validation:** accept only supported schemes (typically HTTP/HTTPS), normalize carefully, and reject malformed or prohibited destinations.
- **Retries:** retry only transient failures and use bounded retries with backoff; avoid retry storms.
- **Cache write:** the transcript's main write path focuses on ID generation and database persistence. A cache entry can be written after persistence or populated lazily on the first read; it should not replace durable storage.

### Snowflake-style ID versus short code

A Snowflake-style generator commonly produces a structured numeric identifier using fields such as timestamp, worker/machine identity, and a per-time-unit sequence. The exact bit layout varies by implementation.

The generated ID is **not automatically the public short code**. A common design is:

```text
Snowflake-style numeric ID
          |
          v
Base62 (or another encoding)
          |
          v
Compact short code, e.g. aZ81kQ
```

**Production note:** The ID generator must ensure worker IDs are unique, define behavior during clock rollback, and avoid sequence exhaustion. The short code should be checked for uniqueness in persistent storage. If unpredictability matters, consider whether a sequentially derived code exposes creation volume or is easy to enumerate.

---

## 6. Read path: resolving a short URL

### Transcript flow

1. Visitor requests a short URL.
2. The request reaches the application tier through the relevant edge/network path.
3. The application checks Redis.
4. **Cache hit:** use the cached long URL and redirect.
5. **Cache miss:** query the database, obtain the long URL, populate the cache, and redirect.
6. Later requests can be served from cache, reducing database load and latency.

```text
Visitor opens https://sho.rt/aZ81kQ
                  |
                  v
             Edge / CDN*
                  |
                  v
             Load Balancer
                  |
                  v
            Application Server
                  |
                  v
          Redis GET "aZ81kQ"
             /          \
         HIT              MISS
          |                 |
          |                 v
          |           Query DB shard
          |                 |
          |                 v
          |           Get long URL
          |                 |
          |                 v
          |           Populate Redis
          |                 |
          +--------+--------+
                   |
                   v
        Return HTTP redirect response
                   |
                   v
          Browser visits destination
```

`*` The edge may serve a cached redirect only when the cache rules and freshness requirements permit it.

### Redirect response

A URL shortener commonly returns an HTTP redirect such as `301`, `302`, `307`, or `308`. The choice matters:
- `301` / `308` indicate permanent redirects and may be cached more aggressively.
- `302` / `307` indicate temporary redirects; caching still depends on headers and client/CDN behavior.
- `307` / `308` preserve the HTTP method, while `301` / `302` have historically had method-changing behavior in some clients.

**Production note:** For mutable, expiring, or revocable links, use a deliberate redirect status and cache policy. Do not assume every redirect is cached—or that it is never cached.

### Cache policy and consistency

- Use a key such as `short_code`.
- Store the destination plus any needed status/expiry metadata.
- Set a TTL based on link lifecycle and freshness needs.
- On deletion/revocation, invalidate the cache or use a policy that bounds stale redirects.
- If analytics are required, consider sending click events asynchronously to a queue rather than making every redirect wait for analytics persistence.

The asynchronous analytics recommendation is an additional design option; it is not a detailed queue architecture specified in the transcript.

---

## 7. Database sharding and replication

### Sharding

**Transcript content:** The speaker discusses using multiple databases and distributing records, with a hash-based routing idea such as `hash(short_id) % shard_count`.

```text
short_code
    |
    v
hash(short_code) % N
    |
    +---- 0 ----> Shard 0
    +---- 1 ----> Shard 1
    +---- 2 ----> Shard 2
    ...
    +---- N-1 --> Shard N-1
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

### Data model (illustrative)

```sql
CREATE TABLE url_mapping (
    short_code   VARCHAR(32) PRIMARY KEY,
    long_url     TEXT NOT NULL,
    created_at   TIMESTAMP NOT NULL,
    expires_at   TIMESTAMP NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
```

This is an illustrative schema, not one supplied by the transcript. Add indexes and fields based on the actual database and requirements. Analytics may be better stored separately so high-volume click events do not overwhelm the mapping table.

---

## 8. Cache scaling and hot keys

**Transcript content:** Redis lowers database load and response time. The speaker also identifies a hot-key problem: one very popular short URL may attract a disproportionate number of requests.

### What is a hot key?

If one short link becomes viral, many requests can repeatedly hit the same cache key. Even if the overall request volume is distributed, that one key or the node/partition serving it can become a bottleneck.

```text
Many visitors
  |  |  |  |  |  |
  +--+--+--+--+--+
           |
           v
   key = "viralCode"
           |
           v
   One cache slot / node
   may receive excessive load
```

### Mitigation options

1. **CDN / edge caching:** useful when redirect responses can safely be cached with correct TTL and revocation rules.
2. **Local in-process cache:** keeps very hot mappings close to application instances, with bounded TTL and memory.
3. **Request coalescing:** concurrent cache misses for the same key share one database lookup.
4. **Read replicas / appropriate cache topology:** distribute reads where the datastore supports it.
5. **Controlled hot-key replication:** duplicate hot entries only with an explicit routing strategy that spreads reads across copies.
6. **Rate limiting and abuse controls:** prevent abusive traffic from overwhelming the service.

**Technical correction:** Simply copying a key/value to several Redis servers does not automatically spread requests. Redis Cluster routes a given key to a hash slot; the application or cache layer needs an intentional strategy to distribute requests across copies. Also guard against cache stampedes and full-cache outages.

---

## 9. Failure handling and graceful degradation

The transcript emphasizes that production systems will fail; the goal is controlled, graceful failure rather than pretending failure is impossible.

| Failure | Transcript's core idea | Production handling / correction |
| :--- | :--- | :--- |
| **Application server fails** | Other app servers can continue serving traffic | Health checks, remove unhealthy instance, capacity headroom, safe deployment rollback |
| **Load balancer fails** | A single entry point can become a SPOF | Use a highly available managed or redundant load-balancing setup |
| **CDN fails** | Static content may load more slowly | Origin fallback where supported, multi-region/origin resilience, monitor edge error rates |
| **Redis node fails** | A distributed cache can reduce dependence on one node | Use supported HA/cluster configuration, timeouts, circuit breakers, and DB protection |
| **Entire cache unavailable** | Database may receive a sudden traffic surge | Rate-limit fallback reads, request coalescing, concurrency limits, load shedding, and recovery plan |
| **Database shard fails** | Replication can support recovery/availability | Define failover, replica promotion, consistency behavior, backups, and restore procedures |
| **ID generator fails** | ID generation is a dependency on the write path | Run redundant generators or a robust distributed library/service; define worker identity and clock behavior |
| **Cache has stale mapping** | A revoked link may still redirect | Invalidation, short TTL, versioning, and carefully controlled edge caching |
| **Traffic spike / bot flood** | Service can be overwhelmed | WAF, rate limits, quotas, adaptive controls, and upstream filtering |

### Graceful-degradation principles

- Set timeouts for every network dependency.
- Use bounded retries with exponential backoff and jitter.
- Avoid retrying indefinitely.
- Use circuit breakers or concurrency limits when a dependency is unhealthy.
- Protect the database from a cache-failure traffic surge.
- Keep sufficient spare capacity for an instance or zone failure.
- Define which operations may fail closed versus fail open.
- Test failures through load tests and game days.

**Important nuance:** "The app remains available if one server fails" is only true if the remaining instances have enough capacity and the failed server was not holding irreplaceable local state.

---

## 10. Abuse prevention and security

### Controls mentioned in the transcript

- Rate limiting by domain, IP address, region, or email identity.
- Restrict or blacklist malicious domains.
- Block known abusive IP addresses.
- Use CAPTCHA when traffic appears bot-like.
- Use HTTPS/TLS certificates.
- Validate submitted URLs.
- Add link expiry where appropriate.

### Additional production considerations

- Enforce request size limits and supported URL schemes.
- Use domain reputation / phishing and malware checks where appropriate.
- Apply per-account and per-tenant quotas, not only IP limits (many users can share an IP).
- Treat IP-based blocking carefully because NAT, VPNs, proxies, and shared networks can cause false positives.
- CAPTCHA is a friction mechanism for suspicious flows, **not a primary DDoS defense**.
- Keep audit logs for administrative actions, revocations, and abuse reports.
- Do not fetch user-provided URLs from the server unless necessary; if URL preview/scanning does fetch them, defend against SSRF, private IP ranges, redirects, DNS rebinding, and timeouts.
- Protect management endpoints and secrets; apply least privilege.
- Define an abuse-reporting and takedown process.

**Transcript versus correction:** The transcript lists simple controls; the additional items above are production hardening suggestions rather than claims made in the source.

---

## 11. Observability: knowing what the system is doing

The transcript says observability gives insight into how components behave and which parts are under load or failing.

### Metrics / Observabilities

| Metric | What it tells you | Example interpretation |
| :--- | :--- | :--- |
| **QPS / requests per second** | Current request load | Sudden spike may require scaling or abuse investigation |
| **Cache hit rate** | Fraction of cache lookups served from cache | A falling hit rate can increase database load |
| **Database latency** | Time spent on database operations | Slow queries, saturation, locks, or network issues |
| **P95 response time** | 95% of requests complete at or below this latency | Captures slower-tail user experience better than average alone |
| **P99 response time** | More extreme tail latency | Useful for high-scale systems with latency-sensitive requests |
| **Error rate** | Fraction of requests failing | Indicates regressions or dependency outages |
| **Shard imbalance** | Uneven data or traffic distribution | May indicate skew, hot partitions, or routing problems |
| **ID collision / duplicate-key events** | Potential ID-generation or encoding issue | Should be rare; investigate immediately if observed |

### P95 example

If P95 latency is 1.2 seconds, then 95% of measured requests completed in 1.2 seconds or less, while approximately 5% took longer.

**Technical correction:** P95 is not the "worst-case" latency; it is a percentile. P99, P99.9, maximum latency, and histograms may be useful depending on the service-level objective.

### Tooling mentioned in the transcript

- **Prometheus:** metrics collection and alerting ecosystem.
- **Grafana:** dashboards and visualization.
- **ELK stack:** Elasticsearch, Logstash, and Kibana for logs/search/analysis (the exact deployed components can vary).

### Production additions

- **Logs:** structured request logs with trace/request IDs; avoid logging sensitive query strings or tokens.
- **Traces:** follow a request across load balancer, application, Redis, and database.
- **Alerts:** alert on user-impacting symptoms, not just CPU; include error rate, latency, saturation, availability, and cache/database behavior.
- **SLOs:** define availability and latency targets and use error budgets to guide reliability work.
- **Dashboards:** split metrics by endpoint, status code, region, shard, and dependency.

**ID metric correction:** A high collision rate should not be accepted as routine behavior. Monitor generator health, duplicate-key/unique-constraint violations, sequence exhaustion, clock drift, and worker-ID conflicts.

---

## 12. Layer-by-layer optimization: transcript's closing summary

The transcript's closing strategy is to optimize the system layer by layer, starting with the data tier:

1. **Database:** shard and replicate based on data size, throughput, and availability requirements.
2. **Application tier:** run multiple app instances.
3. **Load balancing:** route traffic to healthy instances.
4. **Caching:** use Redis to reduce repeated database reads.
5. **Network / geography:** use a CDN for static content and potentially carefully cacheable redirect responses.
6. **Resilience:** plan for failures in every dependency.
7. **Security and abuse controls:** validate, rate-limit, and block harmful activity.
8. **Observability:** measure load, latency, errors, cache effectiveness, and shard balance.

```text
Start with a working service
          |
          v
Scale database (sharding + replication)
          |
          v
Scale application tier (multiple instances)
          |
          v
Add highly available load balancing
          |
          v
Add Redis cache and cache-failure protection
          |
          v
Use CDN/edge capabilities where safe
          |
          v
Add security, abuse controls, observability
          |
          v
Test failure modes and refine capacity
```

This sequence is a useful mental model, not a universal implementation order. In real systems, database, cache, security, and observability design often need to be considered from the beginning.

---

## 13. Technical accuracy review: key corrections at a glance

| Topic | Transcript framing | Clarification for technical accuracy |
| :--- | :--- | :--- |
| **CDN** | Brings content closer to users and caches static content | Correct for static assets. Redirect caching is possible but optional and must respect TTL, revocation, and cache-control rules. |
| **Traffic estimate** | ~100M writes/day and ~1B reads/day | Treat as illustrative assumptions; calculate peak RPS and test real traffic distributions. |
| **Load balancer** | Chooses which app server receives a request | Correct. The load-balancing layer itself must be highly available. |
| **Sticky sessions** | Listed as a load-balancing strategy | Often unnecessary for stateless APIs; can reduce flexibility and resilience. |
| **Redis cache** | Reduces database reads and latency | Correct, but cache outage, stampede, stale entries, and cold-cache recovery need explicit design. |
| **Distributed ID** | Needed to generate IDs at scale | Correct as a possible strategy. A Snowflake-like numeric ID usually needs encoding to become a compact public short code. |
| **Sharding** | Distribute records across databases, e.g. hash/modulo | Valid simple approach. Changing shard count can remap many records; plan resharding. |
| **Replication** | Copies data to improve availability | Correct in principle, but consistency, replication lag, promotion, and backups still matter. |
| **Hot-key fix** | Copying the same value to multiple Redis nodes is suggested | Not automatic. Redis Cluster maps a key to a slot; spreading reads across copies requires explicit application/cache routing. |
| **Failure handling** | Other instances/replicas can take over | Only if configured, health-checked, tested, and provisioned with enough spare capacity. |
| **P95** | Described as response time under which 95% of requests finish | Correct. It is a percentile, not the worst case. |
| **ID collision metric** | Discussed as an operational metric | Monitor duplicate-key violations and generator health; expected collision frequency should be effectively zero under a correct design. |
| **CAPTCHA** | Used when bot activity is suspected | Useful friction in some flows, not a substitute for upstream DDoS defense or rate limiting. |
| **URL validation** | Validate URLs and blacklist malicious domains | Good start; also consider phishing/malware, SSRF if fetching URLs server-side, and safe redirect policy. |

---

## 14. Interview questions and answers

### Q1. What is a URL shortener, and what are its two main request paths?
**Answer:** It creates a compact code for a long URL and later resolves that code to the destination. The write path validates and stores the mapping; the read path looks up the mapping and returns a redirect.

### Q2. Why is one application server insufficient at high scale?
**Answer:** It has finite throughput and is a single point of failure. Multiple stateless app instances behind a highly available load balancer improve capacity and resilience.

### Q3. Why use a load balancer?
**Answer:** It distributes incoming traffic among healthy instances, supports health checks, and helps scale the app tier horizontally. The load-balancing layer itself must not be a single point of failure.

### Q4. What is the difference between vertical and horizontal scaling?
**Answer:** Vertical scaling increases resources on one machine; horizontal scaling adds machines/instances. The transcript focuses on horizontal scaling by adding app servers and database shards.

### Q5. Why add Redis if the database already stores URL mappings?
**Answer:** Popular or repeated lookups can be served from memory, reducing database load and latency. Redis is a cache, not the authoritative durable store.

### Q6. Explain cache hit and cache miss.
**Answer:** A hit means the requested mapping is in the cache and can be returned without a database read. A miss means the app queries the database, retrieves the mapping, may populate the cache, and then responds.

### Q7. What is the main risk when Redis becomes unavailable?
**Answer:** Requests that normally hit cache can flood the database, potentially causing a cascading failure. Use timeouts, concurrency limits, rate limiting, request coalescing, and a tested fallback policy.

### Q8. What is a hot key?
**Answer:** A single key receives disproportionately high traffic—for example, a viral short link. It can overload the cache partition or node serving that key even if overall traffic is distributed.

### Q9. How would you mitigate a hot key?
**Answer:** Consider safe CDN/edge caching, bounded local caches, request coalescing, and deliberate replication/routing for hot entries. Do not assume copying a Redis key to several nodes spreads traffic automatically.

### Q10. What is database sharding?
**Answer:** Partitioning records across multiple database shards to distribute storage and load. A routing function maps a short code to the shard that stores it.

### Q11. What is the difference between sharding and replication?
**Answer:** Sharding splits the dataset across partitions; replication creates copies of data. Sharding helps distribute data/load, while replication can support availability and read scaling, subject to consistency and failover behavior.

### Q12. What is a limitation of `hash(key) % shard_count`?
**Answer:** It is simple and can distribute keys, but changing `shard_count` may remap many keys. Consistent hashing, virtual buckets, or an explicit routing map can make resharding more controlled.

### Q13. Why use a distributed ID generator?
**Answer:** To generate unique IDs across multiple application instances without relying on one serial ID-generation bottleneck. It must handle worker identity, sequence limits, and clock behavior correctly.

### Q14. Is a Snowflake ID itself the short URL?
**Answer:** Not necessarily. It is commonly a numeric ID. The system can encode it, for example with Base62, into a compact short code. The code must remain unique and be validated by storage constraints.

### Q15. Why does a URL shortener need a unique constraint on short code?
**Answer:** It protects correctness if the generator or encoder produces a duplicate due to a bug, collision, or misconfiguration. The application should handle the conflict safely rather than overwrite another mapping.

### Q16. What is the write path?
**Answer:** Client → load balancer → application → validate URL → obtain ID → encode short code → write mapping to the correct database shard → return short URL. Success should only be returned after the mapping is persisted according to the durability contract.

### Q17. What is the read path?
**Answer:** Visitor → edge/network entry → load balancer → app → Redis lookup. On hit, redirect; on miss, query the correct DB shard, populate cache as appropriate, and redirect.

### Q18. How do you handle database shard failure?
**Answer:** Use an explicit replica/failover design, health checks, controlled promotion, retry/timeout policies, and tested recovery. Maintain backups because replication does not protect against every kind of data loss.

### Q19. Why are sticky sessions often unnecessary?
**Answer:** A URL-shortener API can generally be stateless, with shared data in Redis/database. Sticky sessions can reduce balancing flexibility and complicate failover without providing much benefit.

### Q20. What does P95 latency mean?
**Answer:** 95% of requests completed at or below the P95 value; approximately 5% took longer. It describes tail behavior better than an average alone, but it is not the worst-case latency.

### Q21. Which observability metrics are important?
**Answer:** Request rate/QPS, error rate, P95/P99 latency, cache hit rate, database latency, shard traffic/data balance, and ID-generator health. Also use structured logs, traces, dashboards, and actionable alerts.

### Q22. Which tools does the transcript mention for observability?
**Answer:** Prometheus, Grafana, and the ELK stack—Elasticsearch, Logstash, and Kibana. The exact tools depend on the organization's stack.

### Q23. How can the service prevent abuse?
**Answer:** Rate-limit by appropriate identities or network signals, validate submitted URLs, block known malicious destinations, apply quotas, use WAF/upstream filtering, and challenge suspicious flows when appropriate. CAPTCHA is not a standalone DDoS solution.

### Q24. Why is URL expiry more complicated than storing an expiry timestamp?
**Answer:** The application must enforce expiry on reads, remove or bypass stale cache entries, and ensure CDN/client caching does not keep serving a revoked destination beyond policy. Clock and consistency behavior must be considered.

### Q25. How would you prevent a cache stampede?
**Answer:** Coalesce concurrent misses for the same key, use short-lived locks or single-flight logic where appropriate, apply jitter to expirations, and limit concurrent database fallback requests.

### Q26. Should click analytics run synchronously in the redirect request?
**Answer:** It depends on the required accuracy and latency. For high-volume systems, asynchronously publishing click events to a queue can keep redirect latency low, while a separate pipeline aggregates analytics. This is an additional design option beyond the transcript's high-level mention of analytics.

### Q27. How do you make create requests safe to retry?
**Answer:** Support idempotency keys or a deterministic request identity where appropriate, enforce uniqueness in storage, and use bounded retries with backoff. Otherwise, a client retry may create multiple links.

### Q28. What is the difference between availability and durability?
**Answer:** Availability is the ability to serve requests; durability is the ability to retain acknowledged data. Replicas may improve availability, while durable storage, backups, and recovery testing help protect data.

### Q29. What happens if a popular short link is revoked but the redirect is cached?
**Answer:** A cached redirect may continue to work until it expires or is invalidated. Use a cache policy that bounds staleness, invalidation/versioning where supported, and careful edge-cache configuration.

### Q30. Summarize the design in one minute.
**Answer:** "I'd put a highly available load balancer in front of stateless application instances. The create path validates the URL, generates a unique ID, encodes it into a short code, and persists the mapping in a sharded database with an explicit replication and backup strategy. The resolve path checks Redis first and queries the appropriate shard on a miss. I'd protect against hot keys, cache outages, and database overload, use a CDN only where caching semantics are safe, and add rate limiting, URL-abuse controls, metrics, logs, traces, alerts, and tested failover procedures."

---

## 15. Final revision checklist

Before presenting this design in an interview, be ready to explain:

- [ ] Requirements, assumptions, and peak traffic estimates
- [ ] Write path and read path
- [ ] Load balancing and stateless application servers
- [ ] Cache hit/miss, TTL, invalidation, and cache-outage strategy
- [ ] Distributed ID generation versus short-code encoding
- [ ] Database sharding versus replication
- [ ] Hot-key mitigation and cache stampede prevention
- [ ] Failure modes and graceful degradation
- [ ] URL validation, rate limiting, abuse prevention, and expiry
- [ ] QPS, cache hit rate, database latency, P95/P99, errors, and shard imbalance
- [ ] Backups, recovery, idempotency, and uniqueness guarantees

---

## 16. One-line takeaway

**A production-ready URL shortener is not just a mapping table and redirect endpoint: it is a read-heavy distributed system whose performance and reliability depend on efficient lookup, careful caching, scalable storage, unique IDs, explicit failure handling, security controls, and observability.**
