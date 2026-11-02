# Caching in System Design --- Structured Study Notes

> **Purpose:** Consolidated study notes based on the supplied caching
> lecture transcript. The six-category taxonomy and examples follow the
> lecture; a final section flags important technical nuances so the
> notes are safe to use in interviews and production discussions.

## 1. What is caching?

**Caching** stores a copy of data that is expensive or slow to retrieve
or compute, so a later request can be served faster. A cache is usually
optimized for reads and may hold data only temporarily.

A cache can help to: - Reduce response latency. - Reduce database
queries and load on origin services. - Absorb repeated reads and some
traffic spikes. - Reduce repeated computation. - Improve perceived
performance for users far from the origin when data can be served at an
edge location.

Caching is not free: it consumes memory or storage, adds operational
complexity, and creates a **freshness / invalidation** problem. Cached
data may be stale, so each design must decide how fresh the result must
be.

## 2. The six caching categories in the lecture

  --------------------------------------------------------------------------------
  Category            Where the cache lives  Typical purpose     Examples
  ------------------- ---------------------- ------------------- -----------------
  1\. In-memory /     RAM inside one         Very fast repeated  Local map, LRU
  local cache         application process or reads by that       cache, Caffeine,
                      host                   instance            in-process
                                                                 config/token
                                                                 metadata

  2\. Distributed     Separate cache service Shared cached state Redis, Memcached,
  cache               or cluster shared by   and data across     Hazelcast, Apache
                      app instances          instances           Ignite

  3\. CDN / edge      Edge locations close   Serve cacheable     Cloudflare,
  cache               to users               content near the    Akamai, AWS
                                             user and reduce     CloudFront
                                             origin traffic      

  4\. Database-level  Inside the database    Reuse database      MySQL InnoDB
  cache               engine                 pages/data already  buffer pool,
                                             in memory           PostgreSQL shared
                                                                 buffers, MongoDB
                                                                 WiredTiger cache

  5\.                 Managed by             Cache               Trending URLs,
  Application-level   application/business   business-specific   top products,
  cache               logic; may use local   or precomputed      leaderboards,
                      or shared storage      results             precomputed
                                                                 results

  6\. OS-level / page Operating system RAM   Avoid repeated      Linux page cache
  cache               used to cache          physical disk reads 
                      file-system pages                          
  --------------------------------------------------------------------------------

> These categories describe **where or how caching is managed**, not six
> mutually exclusive products. For example, an application-level cache
> may be implemented with an in-process map or with Redis. A database
> also benefits from OS page cache underneath its own cache.

------------------------------------------------------------------------

## 3. Category 1 --- In-memory / local cache

### Concept

The application fetches data from a database or another service. It
retains a copy in its own process memory (RAM). Subsequent requests
handled by the same instance can use that copy instead of making another
remote call.

### Architecture diagram

``` text
                    First request / cache miss
[Client] ──request──> [Application instance]
                              │
                              ├── lookup ──> [Local in-process cache]
                              │                  │
                              │             miss │ hit
                              │                  └──────> return cached value
                              │
                              └── on miss ──> [Database / service]
                                                │
                                                └── result ──> populate local cache
```

### Example

An API gateway or application instance repeatedly needs a relatively
stable configuration value or feature-flag definition. It reads the
value once, keeps it in memory for a short period, and serves subsequent
reads from RAM.

The lecture also mentions authentication-token metadata and rate-limit
counters. These can be local-cache candidates **only when the semantics
permit it**. If a rate limit must be enforced consistently across many
application instances, per-instance counters alone are usually
insufficient.

### Advantages

-   Very low lookup latency: no separate cache network hop.
-   Simple to implement for small, well-understood use cases.
-   No separate cache cluster to operate.
-   Useful for hot, read-heavy data with a manageable size.

### Disadvantages

-   Usually lost when the process restarts or the instance is replaced.
-   Each instance has its own copy; values can differ between instances.
-   Memory is limited and competes with the application itself.
-   Cache invalidation and freshness still need to be handled.
-   A cache miss still incurs the underlying database/service cost.

### Good fit

-   Small services or applications with one instance.
-   Stable configuration, metadata, or frequently read reference data.
-   Data where a short-lived stale value is acceptable.
-   As the first cache layer in front of a shared cache or database.

### Watch-outs

Use a TTL (time to live), explicit invalidation, or versioning strategy.
Consider cache stampedes: many requests may miss at once and overwhelm
the origin. Single-flight/request coalescing, jittered TTLs, and
controlled refresh can help.

------------------------------------------------------------------------

## 4. Category 2 --- Distributed cache

### Concept

A separate cache service or cluster is shared by multiple application
instances. Each instance can read and write the same logical cache
rather than keeping completely independent copies.

### Architecture diagram

``` text
                       ┌──────────────────────┐
[Client] ─────────────>│ Load balancer / API   │
                       └──────────┬───────────┘
                                  │
                     ┌────────────┼────────────┐
                     ▼            ▼            ▼
                 [App A]       [App B]       [App C]
                     │            │            │
                     └────────────┼────────────┘
                                  ▼
                        [Shared cache cluster]
                         (e.g. Redis / Memcached)
                                  │ cache miss
                                  ▼
                              [Database]
```

### Example: URL shortener

A URL shortener may receive very frequent reads for popular short codes.
The application looks up a short code in a shared cache first. If the
mapping is present, the redirect can be prepared without querying the
primary database. If absent, the service reads the database and may
populate the cache.

For a rough sizing illustration, **100 million entries × 200 bytes ≈ 20
GB** of raw entry data. Real capacity needs to be higher because keys,
metadata, object overhead, replication, fragmentation, and operational
headroom add memory requirements. This is an estimate, not a production
sizing formula.

### Common technologies

-   **Redis** --- data structures, TTLs, atomic operations, and optional
    persistence; Redis Cluster can shard data across nodes.
-   **Memcached** --- a simple distributed in-memory key/value cache.
-   **Hazelcast** and **Apache Ignite** --- distributed in-memory data
    and compute capabilities, depending on the use case.

### Advantages

-   Shared cache view across multiple app instances.
-   Can reduce repeated database reads and backend work.
-   Centralized cache policy and observability.
-   Can scale through replicas, partitioning/sharding, and additional
    nodes depending on the product and workload.
-   Useful for sessions, shared counters, hot records, and API response
    caching.

### Disadvantages

-   Adds network latency compared with an in-process lookup.
-   Requires separate infrastructure, monitoring, capacity planning, and
    failure handling.
-   Can become a bottleneck if under-sized or poorly partitioned.
-   Cache outages or evictions can increase database load sharply.
-   Consistency and invalidation are design concerns; persistence is not
    automatically enabled or a guarantee against data loss.

### Good fit

-   Multiple application instances need shared cached data.
-   Read-heavy workloads with repeated access to hot keys.
-   Session state or counters that must be shared across instances.
-   Large systems where reducing database pressure justifies the added
    component.

### Watch-outs

Define the cache's role clearly: **is it disposable acceleration data,
or is it being used as a system of record?** If losing the cache would
lose business-critical state, a cache-only design may be unsafe. Use
appropriate persistence, replication, backups, and/or a durable primary
store as required. A Redis Cluster provides partitioning and
availability features, but does not remove the need to design for
failures.

------------------------------------------------------------------------

## 5. Category 3 --- CDN / edge cache

### Concept

A Content Delivery Network stores eligible content at edge locations
geographically closer to users. If a request can be served from the edge
cache, it may not need to travel to the origin application or database.

### Architecture diagram

``` text
                   ┌─────────────────────────┐
[User in Region A] ─> [Nearest CDN edge POP] │
                   └────────────┬────────────┘
                                │
                     cache hit  ├──────────────> return cached response
                                │
                     cache miss │
                                ▼
                      [Origin / application]
                                │
                                ▼
                         [Database / storage]
                                │
                                └── response can populate CDN cache
```

### What is commonly cached?

-   Versioned JavaScript, CSS, fonts, and images.
-   Public static files and downloadable assets.
-   Video segments and other large media objects.
-   Some public, cacheable API responses.
-   In carefully designed cases, URL redirect responses.

### Example

A user in Delhi requests a cacheable image. If the CDN has a fresh copy
at a nearby edge location, it can return the image without fetching it
from the origin in another region. The exact latency improvement depends
on geography, routing, cache hit rate, object size, and the CDN
configuration; any numbers in the lecture are illustrative rather than
guarantees.

### Advantages

-   Can greatly reduce user-to-origin network latency for cache hits.
-   Offloads requests and bandwidth from the origin.
-   Helps handle traffic spikes for cacheable content.
-   Improves global delivery of static assets and media.
-   Can complement backend caching rather than replace it.

### Disadvantages

-   Not every request or response is safely cacheable.
-   Purging or invalidating content can be complex.
-   A cache miss still has to reach the origin.
-   Personalized or authenticated responses can leak data if cache rules
    are wrong.
-   Adds configuration, cost, and another layer to debug.

### Good fit

-   Globally distributed users.
-   Static assets, media, and public content.
-   Stable content that can be versioned or cached with well-defined
    TTLs.
-   High-volume cacheable reads where origin offload matters.

### Watch-outs: correctness and security

Configure cache keys, TTLs, `Cache-Control`, `Vary`, and
purge/versioning behavior deliberately. Do not accidentally cache
private user-specific responses as public content. For a URL shortener,
a CDN can cache some redirect responses, but changes to a mapping,
expiry rules, authorization, analytics requirements, and redirect
semantics must be considered before enabling it.

------------------------------------------------------------------------

## 6. Category 4 --- Database-level cache

### Concept

Database engines maintain internal caches or memory areas for frequently
accessed data and pages. The database may serve reads from memory rather
than repeatedly reading storage.

### Architecture diagram

``` text
[Application]
     │ SQL / query
     ▼
[Database engine]
     │
     ├── lookup in database memory cache / buffer pool
     │          ├── hit  ──> serve from memory
     │          └── miss ──> read required page from storage
     │
     ▼
[Database storage files]
```

### Examples

-   **MySQL/InnoDB:** buffer pool caches data and index pages.
-   **PostgreSQL:** shared buffers cache database pages; the OS page
    cache may also help.
-   **MongoDB/WiredTiger:** uses an internal cache for data and indexes,
    alongside operating-system caching.

### Advantages

-   Built into the database engine; no separate cache service is
    necessarily required.
-   Can improve repeated reads and reduce physical storage I/O.
-   The database manages cache behavior in the context of its storage
    engine.
-   Helps even when the application has no explicit caching code.

### Disadvantages

-   Does not remove all database query, locking, CPU, or connection
    bottlenecks.
-   Cache effectiveness depends on working-set size and access patterns.
-   Memory is a finite resource and may be shared with other database
    needs.
-   Tuning varies by engine and workload.

### Good fit

-   Almost any database-backed system benefits from an appropriately
    sized database cache.
-   Workloads that repeatedly access a working set of data or index
    pages.
-   Systems where database tuning is preferable before adding another
    cache layer.

### Watch-outs

A database cache is not the same as an application-level query-result
cache. A query can still consume CPU and execute query planning or
filtering even when the underlying pages are in memory. Diagnose with
database metrics, query plans, I/O metrics, and working-set behavior
rather than assuming that "data is cached" means every query is fast.

------------------------------------------------------------------------

## 7. Category 5 --- Application-level cache

### Concept

The application deliberately caches results that are meaningful to its
business logic. The cache might be local to the process or backed by a
shared cache; the defining feature is that the application chooses
**what result to cache and when it is valid**.

### Architecture diagram

``` text
[Client request]
      │
      ▼
[Application / business logic]
      │
      ├── read business-result cache
      │        ├── hit ──> return cached/precomputed result
      │        └── miss
      │
      ├── compute / aggregate / query dependencies
      ▼
[Services / database / event stream]
      │
      └── result ──> store or refresh business-result cache
```

### Examples

-   Top trending short URLs or most-clicked links.
-   Top products, trending posts, or leaderboard entries.
-   Precomputed reports or expensive aggregations.
-   Reused machine-learning inference results when the input and
    model/version make reuse valid.
-   A business-specific API response assembled from several services.

### Advantages

-   Understands business meaning and can cache exactly the expensive
    result.
-   Can avoid repeated computation and downstream calls, not just disk
    reads.
-   Can apply business-aware refresh and invalidation rules.
-   Can be tailored to hot paths and specific endpoint requirements.

### Disadvantages

-   The application team owns freshness and invalidation logic.
-   Results may become stale if source data changes.
-   Business logic and cache behavior can become tightly coupled.
-   Cache keys must include all inputs that affect the result.
-   Precomputing and refreshing values can introduce complexity.

### Good fit

-   Expensive, repeated computations or aggregations.
-   "Top N" lists, trending items, leaderboards, and common dashboard
    queries.
-   Responses that are costly to assemble but can tolerate a defined
    freshness window.

### Watch-outs

A cache key must represent every input that changes the answer (tenant,
user permissions, locale, filters, model version, etc.). Otherwise, one
user's result may be incorrectly served to another. State the acceptable
staleness and refresh policy explicitly.

------------------------------------------------------------------------

## 8. Category 6 --- OS-level / page cache

### Concept

The operating system uses available RAM to cache file-system pages that
have been read from storage. Repeated file reads may be served from
memory rather than physical disk. Applications often benefit without
explicitly managing this cache.

### Architecture diagram

``` text
[Application reads a file / database file]
                 │
                 ▼
          [Operating system]
                 │
                 ├── page-cache hit ──> serve bytes from RAM
                 │
                 └── page-cache miss ──> read from disk / storage
                                               │
                                               └── page may enter page cache
```

### Advantages

-   Transparent to many applications.
-   Reduces repeated physical disk I/O.
-   Uses otherwise available memory to accelerate file access.
-   Can complement database-engine caches and application caches.

### Disadvantages

-   Application-level control is limited compared with an explicit
    cache.
-   Cache contents can be evicted under memory pressure.
-   It is local to the operating system/host, not shared across a fleet.
-   A warm page cache does not guarantee that an entire application
    request is fast.

### Good fit

-   File-intensive workloads.
-   Database and application workloads that repeatedly access the same
    files.
-   Systems where operating-system memory can cache a useful working
    set.

### Watch-outs

Do not confuse the OS page cache with a durable store or a business-key
cache. It caches file pages, not necessarily logical records or complete
query results. Database engines may have their own memory cache as well,
so measure the combined memory and I/O behavior.

------------------------------------------------------------------------

## 9. How the categories fit together: layered caching

A production application may use multiple cache layers because each
addresses a different cost.

### General request path

``` text
                         cacheable public content
[User] ──> [CDN / edge cache] ───────────────────────────> response on hit
                  │ miss
                  ▼
            [Load balancer]
                  │
          ┌───────┴────────┐
          ▼                ▼
      [App A]            [App B]
          │                │
          ├─ local cache   ├─ local cache
          └───────┬────────┘
                  ▼
        [Distributed cache: Redis]
                  │ miss
                  ▼
             [Database]
                  │
          [DB engine cache]
                  │
             [Storage]
```

**Important:** This is a conceptual combination, not a mandatory
sequence. A CDN may serve only static files while API requests bypass
it; an app may check local cache before Redis; and database and OS
caches are internal to their respective layers.

### Which layer solves which problem?

  -----------------------------------------------------------------------
  Problem                 Most relevant layer(s)  Why
  ----------------------- ----------------------- -----------------------
  Repeated reads within   Local in-memory cache   Avoids a network hop
  one process                                     

  Multiple app instances  Distributed cache       Shared access across
  need the same cached                            instances
  state                                           

  Users are far from the  CDN / edge cache        Serves cacheable
  origin                                          responses closer to
                                                  users

  Repeated database page  Database and OS page    Keep hot pages in
  reads cause storage I/O caches                  memory

  Expensive business      Application-level cache Reuses
  aggregation or                                  business-specific
  computation repeats                             results
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 10. URL shortener: combining Redis and a CDN

A URL shortener illustrates why one cache layer may not solve every
performance problem.

### Request flow

``` text
[Browser requests short URL]
          │
          ▼
 [CDN / edge cache, if redirect is safely cacheable]
          │ hit ───────────────────────────────> [HTTP redirect]
          │ miss
          ▼
 [URL-shortener application]
          │
          ▼
 [Redis / distributed cache: short-code → long URL]
          │ hit
          ├────────────────────────────────────> [HTTP redirect]
          │ miss
          ▼
 [Primary database: durable mapping]
          │
          └── mapping returned; optionally populate Redis
```

### Redis vs CDN

  -----------------------------------------------------------------------
  Dimension               Redis / distributed     CDN / edge cache
                          cache                   
  ----------------------- ----------------------- -----------------------
  Primary location        Near the                Edge locations near
                          application/data        users
                          services                

  Main benefit            Reduces database work   Reduces user-to-origin
                          and backend lookup cost network distance and
                                                  origin traffic

  Typical data            Key/value mappings,     Cacheable HTTP
                          sessions, counters, hot responses, static
                          records                 assets, media

  Helps a distant user    Usually no; app must    Yes, for an eligible
  avoid reaching origin?  still be reached to     cache hit
                          query Redis             

  Key concerns            Eviction, cluster       Cache headers, cache
                          sizing, network hop,    keys, invalidation,
                          consistency             privacy

  Best role in the        Shared                  Cache eligible redirect
  example                 short-code-to-URL       responses or static
                          lookup                  content
  -----------------------------------------------------------------------

**Key interview point:** Redis can make the backend lookup faster, but
the user's request still has to travel to the application region. A CDN
can avoid that trip for a valid edge-cache hit. Neither layer replaces
the primary database's role in durable storage unless the overall system
is explicitly designed differently.

### Cache-miss flow

1.  Request arrives at the application (or reaches origin after a CDN
    miss).
2.  Application checks Redis using the short code.
3.  On a Redis hit, use the mapping and prepare the redirect.
4.  On a miss, query the primary database.
5.  If the mapping exists, return it and optionally populate Redis with
    a suitable TTL.
6.  If the redirect response is safely cacheable, the CDN may cache it
    according to the configured policy.
7.  When a mapping changes or expires, invalidate or version relevant
    cache entries and edge responses as required.

For URL shorteners, consider click analytics and access timestamps: if
every click must be counted, a CDN-cached redirect can bypass
origin-side logging. A design may need edge logging, asynchronous
analytics, a shorter TTL, or no CDN caching for those redirects. The
correctness requirement determines the policy.

------------------------------------------------------------------------

## 11. Cache fundamentals that apply to every category

### Cache hit and cache miss

-   **Hit:** requested data is present and usable in the cache.
-   **Miss:** data is absent, expired, or invalid; the system must
    retrieve or compute it elsewhere.
-   **Hit ratio:** hits divided by total cache lookups. A high hit ratio
    often helps, but latency, correctness, and origin load matter too.

### Expiration and invalidation

-   **TTL:** automatically expires an entry after a configured duration.
-   **Explicit invalidation:** remove/update a cached entry when source
    data changes.
-   **Versioned keys:** use a version or content hash so new content
    gets a new key.
-   **Stale-while-revalidate:** serve a recently stale value while
    refreshing it in the background, where safe.
-   **Write-through / write-around / write-back:** common write policies
    describing how writes interact with cache and backing storage.
    Choose according to durability and consistency requirements.

### Common failure modes

  -----------------------------------------------------------------------
  Failure mode            What happens            Common mitigations
  ----------------------- ----------------------- -----------------------
  Cache stampede /        Many requests miss the  Request coalescing, TTL
  thundering herd         same key and hit the    jitter, single-flight
                          origin together         refresh, prewarming

  Hot key                 One key receives        Replication, sharding
                          disproportionate        strategy, local
                          traffic                 near-cache, request
                                                  shaping

  Stale data              Cache doesn't reflect a TTL, invalidation,
                          source update           versioned keys,
                                                  explicit freshness
                                                  contract

  Cache outage            Requests fall back to   Timeouts, circuit
                          origin and may overload breakers, graceful
                          it                      fallback, origin
                                                  protection

  Unbounded memory growth Cache evicts            Capacity limits,
                          unpredictably or host   eviction policy, TTLs,
                          runs out of memory      metrics

  Cache pollution         Low-value items         Admission policy, size
                          displace hot data       limits, workload-aware
                                                  TTL/eviction

  Cross-user data leak    A cache key omits       Correct cache keys,
                          tenant/auth/locale      private/no-store
                          inputs                  policy, authorization
                                                  checks
  -----------------------------------------------------------------------

### Metrics to monitor

-   Hit ratio and miss ratio.
-   Cache lookup latency and timeout/error rate.
-   Evictions, expirations, memory usage, and fragmentation.
-   Origin/database request rate and latency.
-   Hot keys and skew across shards.
-   Data age / freshness, invalidation delay, and stale-response rate.
-   CDN cache status and origin offload.
-   End-to-end p50/p95/p99 latency---not just cache lookup time.

------------------------------------------------------------------------

## 12. Advantages and disadvantages at a glance

  ----------------------------------------------------------------------------
  Cache category          Main advantages         Main disadvantages
  ----------------------- ----------------------- ----------------------------
  Local in-memory         Fast, simple, no cache  Per-instance copies, lost on
                          network hop             restart, limited memory

  Distributed             Shared across           Network hop,
                          instances, reduces      infrastructure/operations,
                          database load, scalable failure and consistency
                          with design             concerns

  CDN / edge              Low-latency global      Only eligible responses,
                          delivery, origin        invalidation/security
                          offload, spike          complexity, misses still
                          absorption              reach origin

  Database-level          Built in, improves      Does not eliminate query
                          memory reuse and        CPU/locking/connection
                          reduces storage I/O     bottlenecks

  Application-level       Business-aware; avoids  Custom invalidation, stale
                          repeated computation    results, cache-key
                          and downstream calls    complexity

  OS-level / page cache   Transparent disk-read   Limited application control;
                          optimization            host-local and subject to
                                                  eviction
  ----------------------------------------------------------------------------

------------------------------------------------------------------------

## 13. Interview questions and answer cues

### Q1. What is caching, and why do we use it?

**Answer cue:** Keep a reusable copy of expensive-to-fetch or compute
data to reduce latency and load. Discuss freshness, memory cost, and
invalidation as trade-offs.

### Q2. What is the difference between local and distributed caching?

**Answer cue:** Local cache is inside one process/host and is very fast,
but each instance has its own copy. A distributed cache is a shared
service accessible by many instances, adding network latency and
operational complexity.

### Q3. Why might Redis not solve high latency for a geographically distant user?

**Answer cue:** The user still has to reach the application region;
Redis only shortens the backend data lookup. A CDN can serve eligible
responses from a nearby edge location.

### Q4. Is Redis always persistent?

**Answer cue:** No. Redis is commonly used as an in-memory cache, and
persistence is configurable. Even with persistence/replication, recovery
guarantees depend on configuration and failure scenarios. Do not assume
a cache is a durable system of record.

### Q5. Why use a CDN if Redis already exists?

**Answer cue:** They solve different problems. Redis reduces
backend/database work; a CDN reduces origin traffic and user-to-origin
network distance for cacheable responses.

### Q6. What is database-level caching?

**Answer cue:** The database engine keeps frequently used
pages/data/index pages in memory. It reduces storage I/O but doesn't
mean every query is free or avoids query execution.

### Q7. What is application-level caching?

**Answer cue:** Business logic chooses to cache expensive computed or
aggregated results, such as trending URLs or leaderboards. It provides
fine control but makes freshness and cache-key correctness the
application's responsibility.

### Q8. What is the OS page cache?

**Answer cue:** The operating system caches file-system pages in RAM to
reduce disk reads. It is usually transparent and host-local; it is not a
business-key cache.

### Q9. How would you cache a URL shortener?

**Answer cue:** Keep the durable mapping in the database, use Redis for
shared hot mappings, and consider CDN caching for safe redirect
responses. Decide how click counting, mapping updates, expiry, and
invalidation work.

### Q10. How do you prevent a cache stampede?

**Answer cue:** Coalesce concurrent requests for the same missing key,
add jitter to TTLs, refresh before expiry, use locks carefully, and
protect the origin with rate limits or circuit breakers.

### Q11. How do you keep cached data fresh?

**Answer cue:** Define a freshness requirement first. Use TTL, explicit
invalidation, versioned keys, event-driven invalidation, or
stale-while-revalidate where appropriate. No single policy fits all
data.

### Q12. Should every endpoint be cached?

**Answer cue:** No. Cache only when reuse and correctness justify it.
Personalized, authorization-sensitive, rapidly changing, or
side-effecting responses need special care and may not be suitable.

### Q13. What happens when the cache is unavailable?

**Answer cue:** Define a fallback policy. Falling back to the database
can cause a load surge, so use timeouts, circuit breakers, bounded
retries, load shedding, and origin capacity protection.

### Q14. What metrics tell you whether caching is helping?

**Answer cue:** Hit ratio plus cache latency, origin load, p95/p99
end-to-end latency, eviction rate, memory, stale-data behavior, and
error rate. Hit ratio alone is insufficient.

### Q15. When would you avoid a cache?

**Answer cue:** When data is rarely reused, freshness requirements are
strict and invalidation is expensive, caching risks data leakage, or
cache complexity costs more than the performance benefit.

------------------------------------------------------------------------

## 14. Technical nuance and corrections to keep in mind

These notes preserve the lecture's main concepts while clarifying a few
statements that should not be repeated as universal rules:

1.  **Redis persistence is optional.** Redis supports persistence
    mechanisms, but it is not automatically durable merely because it is
    Redis. Configure and test recovery based on requirements.
2.  **Local rate-limit counters are not automatically global.** If
    requests can reach multiple application instances, per-instance
    counters enforce per-instance limits unless the design coordinates
    state.
3.  **CDNs do not safely cache every response by default.** Cacheability
    depends on HTTP headers, CDN rules, cache keys, authorization,
    cookies, and the application's correctness requirements.
4.  **Database caches do not remove all query cost.** Queries can still
    consume CPU, locks, memory, and connection capacity even when needed
    pages are cached.
5.  **Redis command execution is not the same as saying Redis does no
    multithreaded work.** Redis has historically executed commands
    largely on a main thread, while modern versions use threads for some
    I/O and background tasks. Avoid oversimplifying this in interviews.
6.  **Latency numbers are workload-specific.** The lecture's example
    values illustrate the concept; actual latency depends on network
    paths, region, payload, cache hit, processing, and load.
7.  **A CDN redirect can affect analytics.** If redirects are served
    entirely at the edge, origin-side click logging may not run for
    every request. Design analytics separately if every click must be
    counted.
8.  **"Application-level" describes ownership of the caching decision.**
    It may be implemented by an in-process cache, Redis, or another
    store; it is not necessarily a separate physical layer.

## 15. Quick revision sheet

-   **Local cache:** fastest nearby lookup; one process/host;
    per-instance and often ephemeral.
-   **Distributed cache:** shared across application instances; useful
    for hot data and shared state; adds a network hop.
-   **CDN:** edge cache near users; reduces geographic latency and
    origin load for eligible responses.
-   **Database cache:** database engine keeps hot pages/data in memory;
    reduces storage I/O.
-   **Application cache:** caches business-aware computed results;
    requires correct keys and freshness logic.
-   **OS page cache:** RAM cache for file-system pages; transparent and
    host-local.
-   **Redis vs CDN:** Redis optimizes backend lookups; CDN can avoid the
    origin trip on a cache hit.
-   **Always design:** cache keys, TTL/freshness, invalidation, misses,
    stampedes, outages, security, observability, and fallback behavior.

------------------------------------------------------------------------

## 16. One-minute interview summary

"Caching stores reusable data closer to where it is needed. A local
in-memory cache is very fast but per-instance; a distributed cache such
as Redis shares hot data across application instances but adds a network
hop. A CDN caches eligible HTTP content at edge locations, reducing
user-to-origin latency and origin load. Database engines cache
frequently used pages, while the OS page cache reduces repeated disk
reads. Application-level caching is business-aware and can reuse
expensive aggregates or computations. In production, I choose layers
based on the bottleneck and define cache keys, TTLs, invalidation,
failure fallback, security, and metrics. For a URL shortener, the
database remains the durable mapping store, Redis accelerates shared
lookups, and a CDN may cache safe redirects---but click analytics and
invalidation must be designed deliberately."
