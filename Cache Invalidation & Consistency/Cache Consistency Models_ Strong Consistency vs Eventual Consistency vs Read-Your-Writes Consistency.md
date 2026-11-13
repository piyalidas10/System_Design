# Cache Consistency Models: Strong Consistency vs Eventual Consistency vs Read-Your-Writes Consistency

> **Core Idea:** A cache is a copy of the database. The moment you have two copies, you must decide **how much staleness the system can tolerate**. A *consistency model* is the contract that answers: *"After a write, what is a reader allowed to see, and when?"*

---

## Table of Contents
1. [Why Consistency Models Matter for Caching](#1-why-consistency-models-matter-for-caching)
2. [Running Example](#2-running-example)
3. [Strong Consistency](#3-strong-consistency)
4. [Eventual Consistency](#4-eventual-consistency)
5. [Read-Your-Writes Consistency](#5-read-your-writes-consistency)
6. [Side-by-Side Comparison](#6-side-by-side-comparison)
7. [Implementing Each Model with PostgreSQL + Redis](#7-implementing-each-model-with-postgresql--redis)
8. [How Much Staleness Can You Tolerate? (Choosing a Model)](#8-how-much-staleness-can-you-tolerate-choosing-a-model)
9. [Related Models Worth Knowing](#9-related-models-worth-knowing)
10. [Interview-Ready Summary Answer](#10-interview-ready-summary-answer)
11. [Self-Assessment Quiz](#11-self-assessment-quiz)

---

## 1. Why Consistency Models Matter for Caching

Previous topics showed that **cache deletion is a strategy, not a complete consistency guarantee**. Even with invalidation, versioning, TTL and CDC, some window of staleness may remain.

So the real production question is not *"Can I eliminate staleness?"* but:

- **How long** can data be stale?
- **Who** is allowed to see stale data (everyone, or only other users)?
- **What does it cost** (latency, availability, complexity) to reduce it?

```mermaid
flowchart LR
    S["Strong Consistency<br/>No stale reads<br/>Highest cost"] --> R["Read-Your-Writes<br/>Writer never sees stale data<br/>Others may"]
    R --> E["Eventual Consistency<br/>Stale reads allowed temporarily<br/>Lowest cost, highest speed"]
```

---

## 2. Running Example

We reuse the same example from earlier notes:

- PostgreSQL (source of truth) holds `user:101` with `city = "Mumbai"`.
- Redis caches `user:101`.
- User **John** updates his city from `Mumbai` to `Pune`.
- John's friend **Priya** views John's profile.

We will ask: *after the write, what do John and Priya see under each model?*

---

## 3. Strong Consistency

**Definition:** Once a write completes, **every** subsequent read, from any client, returns that write (or something newer). The system behaves as if there were a single copy of the data.

### Behaviour

```mermaid
sequenceDiagram
    autonumber
    actor John
    actor Priya
    participant App as Application
    participant DB as PostgreSQL
    participant Cache as Redis

    John->>App: Update city to Pune
    App->>DB: UPDATE users SET city = 'Pune'
    App->>Cache: DEL user:101 (synchronous, must succeed)
    App-->>John: OK (only after DB commit and cache invalidation)
    Priya->>App: Get user 101
    App->>Cache: GET user:101 (miss)
    App->>DB: SELECT city
    DB-->>App: Pune
    App-->>Priya: Pune
```

Both John and Priya see `Pune` immediately after the write returns.

### How It Is Achieved
- Read directly from the database (bypass cache) for critical data.
- Write-through caching with synchronous, atomic updates of DB and cache.
- Distributed locks or consensus (e.g. Raft/Paxos-backed stores) so reads and writes are serialized.
- Versioning/fencing with atomic checks so stale writes are rejected.

### Trade-offs
| Pros | Cons |
| :--- | :--- |
| No stale reads, simplest mental model | Higher latency (synchronous coordination) |
| Safe for money/inventory/security data | Lower availability during failures or partitions |
| Easy to reason about correctness | Poor scalability; limits cache benefit |

> **Reality check:** A plain Cache-Aside setup with a separate Redis and PostgreSQL is **not** strongly consistent, because the DB write and cache invalidation are two separate steps and the repopulation race can still occur. True strong consistency usually means *not caching* that data, or paying the cost of coordination.

### Typical Use Cases
- Account balances and payment state
- Inventory counts at checkout
- Authorization/permission revocation
- Seat or ticket booking

---

## 4. Eventual Consistency

**Definition:** If no new writes occur, all copies will **eventually** converge to the same value. In the meantime, reads may return stale data.

### Behaviour

```mermaid
sequenceDiagram
    autonumber
    actor John
    actor Priya
    participant App as Application
    participant DB as PostgreSQL
    participant Cache as Redis
    participant Bus as Kafka (CDC)

    John->>App: Update city to Pune
    App->>DB: UPDATE (Pune) + outbox event
    App-->>John: OK
    Priya->>App: Get user 101
    App->>Cache: GET user:101
    Cache-->>App: Mumbai (stale)
    App-->>Priya: Mumbai
    DB->>Bus: CDC publishes UserUpdated
    Bus->>Cache: Invalidate user:101
    Note over Cache: Converged. Next read returns Pune
```

Priya may see `Mumbai` for a short window (the **inconsistency window**). After invalidation or TTL expiry, everyone sees `Pune`.

### How It Is Achieved
- Cache-Aside with TTL as a safety net.
- Asynchronous invalidation through Transactional Outbox + CDC + Kafka.
- Delayed double deletion to shrink the window.
- Replica lag in read replicas and multi-region caches is also eventual consistency.

### Trade-offs
| Pros | Cons |
| :--- | :--- |
| Highest performance and cache hit ratio | Users can read stale data |
| High availability, tolerant of partitions | Hard to reason about ordering and conflicts |
| Scales horizontally across services/regions | Needs retries, idempotency and monitoring |

### Typical Use Cases
- Social feeds, like/view counters
- Product catalog and search results
- Profile data shown to other users
- Recommendations and analytics dashboards

> **Key metric:** the **staleness bound**, e.g. *"stale for at most 5 minutes (TTL) or typically under 1 second (CDC lag)"*.

---

## 5. Read-Your-Writes Consistency

**Definition:** After a client performs a write, **that same client** will always see its own write in subsequent reads. Other clients may still see older data temporarily.

It is a *session-level guarantee*, a middle ground that fixes the most visible user-facing bug of eventual consistency: *"I just changed it, why does the page still show the old value?"*

### Behaviour

```mermaid
sequenceDiagram
    autonumber
    actor John
    actor Priya
    participant App as Application
    participant DB as PostgreSQL
    participant Cache as Redis

    John->>App: Update city to Pune
    App->>DB: UPDATE (Pune)
    App-->>John: OK (mark: John must read from DB for N seconds)
    John->>App: Refresh my profile
    App->>DB: Bypass cache, read primary
    DB-->>App: Pune
    App-->>John: Pune (own write visible)
    Priya->>App: Get user 101
    App->>Cache: GET user:101
    Cache-->>App: Mumbai (stale, tolerated)
    App-->>Priya: Mumbai
```

John always sees `Pune`. Priya may briefly see `Mumbai`, which is acceptable.

### How It Is Achieved
1. **Read from primary after write:** For a short window after a user writes, route that user's reads to the primary DB (or skip the cache).
2. **Session/version token:** Return a version or timestamp (or WAL LSN) to the client; reads must be served from a source at least that fresh, otherwise fall through to the primary.
3. **Sticky routing:** Pin the user's session to a node or replica that already has their write.
4. **Write-through for the writer's key:** Update the cache with the new value for that user's session/keyspace.

```python
RYW_WINDOW_SECONDS = 10

async def update_city(user_id, new_city):
    await db.update_user(user_id, new_city)
    await redis.delete(f"user:{user_id}")
    # Remember that this user just wrote
    await redis.set(f"recent_write:{user_id}", "1", ex=RYW_WINDOW_SECONDS)

async def get_own_profile(user_id):
    # Writer's reads bypass possibly stale cache during the window
    if await redis.exists(f"recent_write:{user_id}"):
        return await db.get_user(user_id)
    return await cached_get_user(user_id)
```

### Trade-offs
| Pros | Cons |
| :--- | :--- |
| Great UX: users trust their own changes | Extra routing/session logic |
| Cheaper than global strong consistency | Other users can still read stale data |
| Cache still serves most traffic | Extra primary DB load right after writes |

### Typical Use Cases
- Editing a profile, settings, or a post, then seeing it immediately
- Shopping cart updates
- Posting a comment and seeing it in the thread

---

## 6. Side-by-Side Comparison

| Aspect | Strong Consistency | Read-Your-Writes | Eventual Consistency |
| :--- | :--- | :--- | :--- |
| **Writer sees own write** | Always | Always | Not guaranteed |
| **Other readers see write** | Immediately | Eventually | Eventually |
| **Stale reads possible** | No | Yes, for other users | Yes |
| **Latency** | Highest | Medium | Lowest |
| **Availability under failure** | Lowest | Medium | Highest |
| **Cache hit ratio** | Low | Medium to high | Highest |
| **Implementation complexity** | High (coordination) | Medium (session routing) | Low to medium (TTL, invalidation) |
| **Typical tools** | Direct DB reads, locks, consensus | Primary reads after write, version tokens | TTL, CDC, Kafka, async invalidation |

---

## 7. Implementing Each Model with PostgreSQL + Redis

| Model | Write path | Read path |
| :--- | :--- | :--- |
| **Strong** | Commit to DB, then atomically invalidate/update cache with version check (Lua) or skip cache entirely | Read from DB, or read cache only after verifying its version against the DB |
| **Read-Your-Writes** | Commit to DB, delete key, record "recent write" marker or version token for the session | If the session has a recent write, read from primary; else read cache |
| **Eventual** | Commit to DB, delete key (plus TTL, optional outbox + CDC) | Read cache; on miss, load from DB and repopulate |

How this connects to the strategies from the previous note:

| Strategy | Moves you toward |
| :--- | :--- |
| Cache versioning / fencing tokens | Strong consistency (rejects stale writes) |
| Distributed lock | Strong consistency (serializes operations), at a latency cost |
| Primary read after write / session token | Read-Your-Writes |
| Delayed double deletion | Narrower eventual consistency window |
| TTL | Bounds eventual consistency staleness |
| Outbox + CDC + Kafka | Reliable eventual consistency across services |

---

## 8. How Much Staleness Can You Tolerate? (Choosing a Model)

Ask these questions per data type, not per system:

```mermaid
flowchart TD
    Q1{"Is stale data a correctness<br/>or safety problem?<br/>(money, stock, permissions)"}
    Q1 -- "Yes" --> STRONG["Strong Consistency<br/>Read from DB or use fencing/locks"]
    Q1 -- "No" --> Q2{"Will the writer be confused<br/>if they don't see their change?"}
    Q2 -- "Yes" --> RYW["Read-Your-Writes<br/>Primary read after write"]
    Q2 -- "No" --> EVENTUAL["Eventual Consistency<br/>TTL + invalidation / CDC"]
```

| Data | Tolerable staleness | Suggested model |
| :--- | :--- | :--- |
| Account balance, payment status | None | Strong |
| Inventory at checkout | None | Strong |
| Permission/role revocation | Seconds at most | Strong (or very short TTL + event invalidation) |
| User's own profile edits | None for the owner | Read-Your-Writes |
| Other users' view of a profile | Seconds to minutes | Eventual |
| Product descriptions, catalog | Minutes | Eventual |
| Like counts, view counts | Minutes to hours | Eventual |
| Analytics dashboards | Hours | Eventual |

> **Rule of thumb:** Default to eventual consistency with TTL and invalidation. Upgrade specific paths to read-your-writes for UX, and to strong consistency only where correctness demands it.

---

## 9. Related Models Worth Knowing

- **Monotonic Reads:** A client never sees data go backwards in time (e.g. Pune, then Mumbai on the next refresh). Prevented by sticky sessions or version-aware reads.
- **Monotonic Writes:** A client's writes are applied in the order issued.
- **Causal Consistency:** If write B depends on write A, everyone sees A before B.
- **Bounded Staleness:** Reads are at most *N* seconds or *K* versions behind (what TTL approximates).
- **Linearizability:** The formal, strongest form of strong consistency for single objects.

---

## 10. Interview-Ready Summary Answer

> **Interviewer Question:**
> *"What consistency model do you use for a Redis cache in front of PostgreSQL?"*

> **Target Response:**
> *"It depends on the data. The database is the source of truth and I use Cache-Aside by default: commit to the database first, then invalidate the cache, with a TTL as a safety net. That gives **eventual consistency** with a bounded staleness window, which is fine for most read-heavy data like catalogs or other users' profiles.*
>
> *Where users must see their own changes, I add **read-your-writes consistency**, routing a user's reads to the primary or using a session version token for a short period after they write.*
>
> *For data where staleness is unacceptable, such as payments or inventory, I either skip the cache or enforce **strong consistency** using atomic version/fencing checks or locks, accepting higher latency and lower availability. For multi-service systems I propagate invalidations with Transactional Outbox, CDC and Kafka, which is eventually consistent by design."*

### Key Distinctions
- **Strong:** everyone sees the latest write immediately.
- **Read-Your-Writes:** the writer sees their write immediately; others eventually.
- **Eventual:** everyone sees the write eventually.
- Stronger consistency means **higher latency and lower availability**; weaker consistency means **higher speed and scale**.

---

## 11. Self-Assessment Quiz

### Question 1
**Scenario:** A user edits their display name and, on page refresh, still sees the old name because the page was served from a Redis cache. Which guarantee was violated?
- [ ] A) Strong consistency for all users
- [x] B) Read-your-writes consistency
- [ ] C) Durability of the database

---

### Question 2
**Scenario:** An e-commerce site shows product like counts that may lag by a few minutes. Which model fits best?
- [ ] A) Strong consistency
- [ ] B) Linearizability across all replicas
- [x] C) Eventual consistency

---

### Question 3
**Scenario:** Why is Cache-Aside with a separate Redis and PostgreSQL not strongly consistent?
- [ ] A) Redis cannot store the same data as PostgreSQL.
- [x] B) The database write and cache invalidation are separate steps, and a concurrent slow reader can repopulate stale data after invalidation.
- [ ] C) PostgreSQL does not support transactions.

---

### Question 4
**Scenario:** Which approach most directly provides read-your-writes consistency?
- [ ] A) Increasing the Redis TTL
- [x] B) Routing a user's reads to the primary database (or checking a session version token) for a short period after they write
- [ ] C) Adding more Redis replicas

---

### Question 5
**Scenario:** Which data should NOT rely on eventually consistent cache reads?
- [ ] A) Product descriptions
- [ ] B) Like counts
- [x] C) Account balance used to authorize a payment
