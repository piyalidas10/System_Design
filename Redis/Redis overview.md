# Redis Overview

> **TL;DR:**  
> Redis is an open-source, in-memory data structure store used as a database, cache, message broker, and streaming engine. It delivers sub-millisecond latency, supports rich data types (Strings, Hashes, Lists, Sets, Sorted Sets, Streams, JSON, vector sets), and scales horizontally with Redis Cluster. Redis also supports vector search for GenAI apps, including semantic search, RAG, and recommendation systems. Redis is free to use, runs anywhere, and offers a managed option through Redis Cloud.

---

Redis is an open-source, in-memory data structure store that can be used as a database, cache, message broker, and streaming engine. It belongs to the class of **NoSQL** databases known as key/value stores, where unique keys map to values of various data types. Redis is widely adopted for its sub-millisecond response times, rich data structures, and versatility across use cases from caching to real-time analytics.

**Prerequisites:** No prior Redis experience is needed. This overview is designed for beginners who want to understand what Redis is and why developers choose it.

---

## How Does Redis Work?

Redis stores all data in memory as key/value pairs, where each key is a unique identifier mapped to a typed value. Each data type has its own set of commands for reading and writing data.

For example, you can store a name in a Redis String and associate it with the key `"myname"` using the `SET` command, then retrieve it using `GET`:

```bash
127.0.0.1:6379> SET myname "Will Johnston"
OK
127.0.0.1:6379> GET myname
"Will Johnston"
```

Keys in a Redis database are distributed in a **flat keyspace**. Redis does not enforce a rigid schema or naming policy for keys, giving developers full flexibility over how to organize their data.

---

## What are Redis Data Types?

Redis goes far beyond simple key/value string storage. It supports a rich set of data types, each optimized for specific access patterns:

| Data Type | Description | Example Use |
| :--- | :--- | :--- |
| **Strings** | The simplest type; stores text, numbers, or binary data up to 512 MB | Counters, cached values, session tokens |
| **Lists** | Ordered collections of strings (linked lists) | Activity feeds, message queues |
| **Sets** | Unordered collections of unique strings | Tags, unique visitors, set operations |
| **Hashes** | Maps of field-value pairs, similar to objects | User profiles, product details |
| **Sorted Sets** | Sets ordered by a numeric score (`ZSET`) | Leaderboards, priority queues, rate limiters |
| **Streams** | Append-only log data structures | Event sourcing, activity logs |
| **JSON** | Native JSON document storage and querying | Complex nested data, API response caching |
| **Vector sets** | Elements associated with vector embeddings for similarity search | Semantic search, recommendations, RAG |

> Redis also supports specialized types like **Bitmaps**, **Bitfields**, **HyperLogLog**, and **Geospatial indexes** for advanced use cases.

---

## What is Redis Used For?

Redis is used across industries wherever fast data access matters. Common use cases include:

- **Caching:** Store frequently accessed data in memory to reduce database load and speed up response times.
- **Session Management:** Maintain user session data across distributed web applications with built-in expiration (`TTL`).
- **Leaderboards and Ranking:** Use Sorted Sets to build real-time leaderboards with automatic ordering by score.
- **Real-Time Analytics:** Track metrics, counts, and time-series data with sub-millisecond writes.
- **Pub/Sub Messaging:** Broadcast messages to multiple subscribers for real-time notifications and chat systems.
- **Rate Limiting:** Control API usage and prevent abuse using counters with expiration.
- **Queues and Background Jobs:** Use Lists or Streams as lightweight, high-performance task queues.
- **GenAI and Vector Search:** Store vector embeddings and run similarity searches for semantic search, context retrieval, agent memory, retrieval-augmented generation (RAG), and recommendation systems.

---

## What are the Advantages of Redis?

Redis combines in-memory speed with rich data structures, persistence, and horizontal scalability:

1. **Sub-millisecond Latency:** All data lives in RAM, so reads and writes complete in microseconds rather than milliseconds.
2. **Rich Data Structures:** Go beyond simple key/value strings with Lists, Sets, Hashes, Sorted Sets, Streams, JSON, and more.
3. **Built-in Persistence:** RDB snapshots and AOF logs keep your data durable without sacrificing performance.
4. **Horizontal Scalability:** Redis Cluster distributes data across multiple nodes with automatic sharding and failover.
5. **Broad Language Support:** Official client libraries exist for Python, Node.js, Java, Go, .NET, and many other languages.
6. **Vector Search and GenAI:** Native support for vector embeddings, similarity search, and hybrid queries makes Redis a strong fit for GenAI apps.
7. **Versatile Use Cases:** Use Redis as a cache, primary database, message broker, vector database, streaming engine, or all of the above in a single deployment.
8. **Active Ecosystem:** A large open-source community, comprehensive docs, and Redis University courses make it easy to learn and adopt.

---

## Is Redis a NoSQL Database?

**Yes, Redis is a NoSQL database.** Unlike relational databases that store data in tables with rigid schemas, Redis uses flexible key/value pairs with typed data structures. This makes Redis well suited for use cases where speed, flexibility, and horizontal scalability matter more than complex relational queries.

Redis differs from other NoSQL databases like MongoDB or Cassandra in that it primarily operates in-memory, making it significantly faster for read and write operations.

---

## How Fast is Redis?

Redis is one of the fastest databases available. Because it stores and serves all data from RAM rather than disk, typical operations complete in **under one millisecond**—often in the range of single-digit microseconds. 

- A single Redis instance can handle over **100,000 operations per second** on modest hardware.
- Optimized multi-threaded I/O configurations regularly exceed **1 million ops/sec**.

This speed makes Redis an excellent choice for apps that require real-time data access, such as gaming leaderboards, financial trading platforms, and ad-tech bidding systems.

---

## How Does Redis Persist Data?

Redis persists data to disk so it survives restarts, even though all reads and writes happen in memory:

- **RDB (Redis Database):** Takes point-in-time snapshots of your data at configured intervals.
- **AOF (Append Only File):** Logs every write operation, providing stronger durability guarantees.
- **RDB + AOF:** Combines both methods for a balance of performance and data safety.

This means your data is durable even though all reads are served from an in-memory copy, giving you both speed and reliability.

---

## Is Redis Single-Threaded?

Redis uses a **single-threaded event loop** for command processing, which avoids locking overhead and keeps every operation atomic. By processing commands sequentially on one thread, Redis eliminates race conditions and delivers predictable, low-latency performance.

**I/O Threading (Redis 6.0+):**  
Starting with Redis 6.0, I/O threading offloads network read/write work to background threads while the main thread still handles command execution. This allows Redis to saturate multi-core network interfaces without changing its single-threaded execution model. For workloads that need multi-core parallelism, you can run multiple Redis instances or use Redis Cluster to shard data across nodes.

---

## Is Redis Free?

**Yes, Redis is free and open-source software.**

- **Redis 8+:** Source code is available under the **RSALv2**, **SSPLv1**, and **AGPLv3** licenses, allowing free usage, modification, and deployment.
- **Redis 7.2 and prior:** Subject to the **BSD 3-clause** license.
- **Redis Cloud:** Offers a free tier with 30 MB of storage (no credit card required) for learning and prototyping. Paid tiers offer Auto Tiering, Active-Active Geo Distribution, and automated backups.

---

## Can Redis Replace a Traditional Database?

Redis can serve as a primary database for many apps, especially when combined with persistence and rich data structures.

### When Redis works well as a primary database:
- Fast reads and writes with sub-millisecond latency.
- Flexible data modeling using Hashes, JSON, and Sorted Sets instead of rigid table schemas.
- Horizontal scaling through Redis Cluster.
- Built-in expiration (`TTL`) for data with a natural lifecycle.

### When to use a Relational Database alongside Redis:
For apps requiring complex joins, foreign key constraints, or ACID transactions across multiple keys, a relational database (PostgreSQL, MySQL) remains the source of truth, with Redis serving as the hot-path cache in front of it.

---

## How Does Redis Support AI Apps?

Redis provides built-in vector search and vector sets, making it a fast, unified data layer for GenAI applications without requiring a separate standalone vector database:

1. **Vector Sets:** Native data type associating items with vector embeddings (`VADD` to insert, `VSIM` to query nearest neighbors).
2. **Vector Search with Indexing:** Store embeddings in Hash or JSON fields, index via `FT.CREATE`, and query via `FT.SEARCH` with KNN or range queries. Supports **FLAT** and **HNSW** indexing algorithms with L2, Cosine, and Inner Product metrics.
3. **Hybrid Search:** Combine vector similarity with structured filters (numeric ranges, tags, full-text) in a single query (e.g., *"Find similar products under $50"*).
4. **Semantic Caching:** Cache LLM responses keyed by embedding similarity rather than exact string matches, avoiding redundant LLM API calls.
5. **Agent Memory:** Store short-term chat history and long-term memory across sessions. The Redis Agent Memory Server offers REST APIs, MCP servers, and two-tier working/persistent memory.
6. **RAG (Retrieval-Augmented Generation):** Chunk documents, index embeddings, and retrieve relevant context at query time to ground LLM generations.

---

## Redis vs. Other Technologies

### Redis vs. Memcached

| Feature | Redis | Memcached |
| :--- | :--- | :--- |
| **Data Structures** | Strings, Hashes, Lists, Sets, Sorted Sets, Streams, JSON, Vectors | Simple Strings only |
| **Persistence** | RDB snapshots & AOF logs | In-memory only (lost on restart) |
| **Pub/Sub & Streaming** | Built-in Pub/Sub & Streams | Not supported |
| **Clustering** | Native Redis Cluster (sharding + auto failover) | Client-side sharding |
| **Scripting** | Lua scripting & Redis Functions | Not supported |

---

### Redis vs. MongoDB

| Feature | Redis | MongoDB |
| :--- | :--- | :--- |
| **Storage Model** | In-memory with disk persistence | Disk-based with in-memory caching |
| **Data Format** | Key/value with typed data structures | JSON-like documents (BSON) |
| **Query Language** | Command-based (`GET`, `SET`, `HSET`, etc.) | Rich query language with aggregations |
| **Latency** | Sub-millisecond (Microseconds) | Single-digit milliseconds |
| **Scaling** | Redis Cluster (hash slot sharding) | Replica sets and sharding |
| **Best For** | Caching, real-time data, leaderboards, sessions | Content management, catalogs, complex document queries |
| **Schema** | Schema-free | Schema-free (optional schema validation) |

---

### Redis vs. DynamoDB

| Feature | Redis | DynamoDB |
| :--- | :--- | :--- |
| **Deployment** | Self-managed, Docker, or Redis Cloud | AWS-managed only |
| **Storage Model** | In-memory with disk persistence | Disk-based with DAX caching option |
| **Latency** | Sub-millisecond | Single-digit milliseconds (microseconds with DAX) |
| **Data Structures** | Strings, Lists, Sets, Hashes, Sorted Sets, Streams, JSON | Key/value and document items |
| **Pricing** | Open source (free) or Redis Cloud usage-based | Pay-per-request or provisioned capacity |
| **Querying** | Commands per data type | Primary key, secondary indexes, PartiQL |
| **Best For** | Real-time apps, multi-cloud caching | AWS-native serverless architectures |

---

## Frequently Asked Questions (FAQ)

### What language is Redis written in?
Redis is written in **C**, providing minimal overhead, direct memory management control, and maximum hardware performance.

### Does Redis support transactions?
Yes, via `MULTI` / `EXEC` blocks. Commands run sequentially and atomically without interference from other clients. Redis also supports optimistic locking via `WATCH`.

### How much data can Redis store?
Redis can store up to **$2^{32}$ keys** (over 4 billion keys), and individual string values can hold up to **512 MB**. Data scale is expanded horizontally across multiple nodes with Redis Cluster.

### What is Redis Pub/Sub?
Pub/Sub is a real-time messaging pattern where publishers push messages to channels and subscribed clients receive them instantaneously. For persistent message delivery with consumer groups, **Redis Streams** is recommended.

### Is Redis ACID-compliant?
Redis provides atomicity for individual commands and `MULTI`/`EXEC` transaction blocks, but does not support full ACID transactions with automatic rollback across multi-key failures in the way a relational RDBMS does.

### What companies use Redis?
Twitter/X, GitHub, Stack Overflow, Airbnb, Uber, Netflix, and thousands of enterprise platforms rely on Redis for real-time caching, sessions, and data streaming.

### Can Redis be used as a vector database?
**Yes.** Redis natively supports vector sets, indexed vector fields in Hash or JSON documents, KNN/range vector searches, and hybrid filtering.

### What are Redis client libraries?
Official and community client libraries exist for all major languages:
- **Python:** `redis-py`
- **Node.js:** `node-redis`, `ioredis`
- **Java:** `Jedis`, `Lettuce`
- **Go:** `go-redis`
- **.NET:** `StackExchange.Redis`

---

## Getting Started with Redis

### Run Redis Locally with Docker:
```bash
docker run -d --name redis -p 6379:6379 -p 8001:8001 redis:latest
```

### Basic Commands Quick-Start:
```bash
# Connect to Redis CLI
redis-cli

# Set and Get string keys
SET user:1001 "Alice"
GET user:1001

# Work with Hashes
HSET user:profile:1001 name "Alice" age 28 role "Engineer"
HGETALL user:profile:1001

# Set expiration (TTL in seconds)
EXPIRE user:1001 3600
TTL user:1001
```
