# Data Architecture Patterns

A complete reference for designing data layers in distributed systems — from database topology to caching strategies, streaming pipelines, and analytics architectures.

---

## Table of Contents

1. [Shared Database](#1-shared-database)
2. [Database per Service](#2-database-per-service)
3. [Database per Tenant](#3-database-per-tenant)
4. [CQRS](#4-cqrs)
5. [Event Sourcing](#5-event-sourcing)
6. [Read Replicas](#6-read-replicas)
7. [Primary-Replica](#7-primary-replica)
8. [Sharding](#8-sharding)
9. [Partitioning](#9-partitioning)
10. [Federation](#10-federation)
11. [Polyglot Persistence](#11-polyglot-persistence)
12. [Materialized Views](#12-materialized-views)
13. [Data Lake](#13-data-lake)
14. [Data Warehouse](#14-data-warehouse)
15. [Lambda Architecture](#15-lambda-architecture)
16. [Kappa Architecture](#16-kappa-architecture)
17. [CDC — Change Data Capture](#17-cdc--change-data-capture)
18. [Cache-Aside](#18-cache-aside)
19. [Read-Through Cache](#19-read-through-cache)
20. [Write-Through Cache](#20-write-through-cache)
21. [Write-Behind Cache](#21-write-behind-cache)
22. [Caching Strategies Compared](#22-caching-strategies-compared)
23. [Pattern Decision Guide](#23-pattern-decision-guide)

---

## 1. Shared Database

### What it is
Multiple services (or application modules) read and write to the **same database schema**. There is no data boundary between services — they share tables, sequences, and transactions.

### Topology
```
Service A ──┐
Service B ──┼──► [ Single Database ]
Service C ──┘
```

### When to choose
- Monolithic applications or modular monoliths where strong transactional consistency is required.
- Small teams where operational simplicity outweighs the coupling risk.
- Migration starting point — before splitting into independent databases.
- Reporting and analytics that must join data across logical domains at query time.

### When NOT to choose
- Independent deployment of services — a schema change by Service A can break Service B.
- Independent scaling — all services share the same database I/O ceiling.
- Mixed storage requirements — a single SQL DB cannot be optimal for all services.
- Any microservices system with strong team boundaries and independent release cycles.

### Risks
| Risk | Description |
|---|---|
| **Schema coupling** | Every team must coordinate schema changes |
| **Tight deployment coupling** | DB migration for Service A may block Service B deployment |
| **Single point of failure** | One DB outage takes down all services |
| **Performance interference** | One service's heavy queries degrade all others |

---

## 2. Database per Service

### What it is
Each service **owns its own database**, invisible to all other services. Data is accessed only through the service's API, never by direct DB connection from another service.

### Topology
```
Order Service    ──► [ Orders DB    (PostgreSQL) ]
Customer Service ──► [ Customers DB (PostgreSQL) ]
Inventory Service──► [ Inventory DB (Redis)      ]
Search Service   ──► [ Search Index (Elasticsearch)]
```

### Why it matters
```
Without: Service B queries Orders table directly → schema coupling
With:    Service B calls Order Service API → contract coupling (looser, versioned)
```

### When to choose
- Microservices with independent deployment and scaling requirements.
- Services with different storage technology needs (polyglot persistence).
- Teams that must release without coordinating with other teams.
- High-growth systems where individual services will need to scale independently.

### When NOT to choose
- Strong ACID transactions spanning multiple services — distributed transactions (Saga) add complexity.
- Heavy cross-service joins at query time — requires API composition or CQRS projections.
- Small teams or early-stage products — operational overhead is significant.

### Cross-service data access patterns
| Pattern | When |
|---|---|
| **API call** | Real-time, low-volume data access |
| **Event-driven sync** | Eventual consistency acceptable; high write volume |
| **CQRS projection** | Read-heavy cross-service queries |
| **Saga** | Multi-service transactional workflows |

---

## 3. Database per Tenant

### What it is
In a multi-tenant SaaS system, each tenant's data is isolated in a **separate database** (or schema). There are three isolation levels:

| Level | Isolation | Cost | Use when |
|---|---|---|---|
| **DB per tenant** | Full — separate DB instance | High | Enterprise, regulated, high-isolation requirement |
| **Schema per tenant** | Strong — separate schema, shared DB | Medium | Mid-market SaaS with many tenants |
| **Row-level isolation** | Weak — `tenant_id` column on every table | Low | High-volume, cost-sensitive, many small tenants |

### Topology (schema per tenant)
```
Tenant A ──► [ DB Server → schema: tenant_a ]
Tenant B ──► [ DB Server → schema: tenant_b ]
Tenant C ──► [ DB Server → schema: tenant_c ]
```

### PostgreSQL examples

**Schema per tenant**
```sql
-- Create isolated schema per tenant
CREATE SCHEMA tenant_a;
CREATE TABLE tenant_a.orders (
    order_id   UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    total      NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Application sets search_path per connection
SET search_path TO tenant_a;
SELECT * FROM orders;
```

**Row-level security (shared table)**
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Application sets tenant on connection
SET app.current_tenant = 'tenant-uuid-here';
SELECT * FROM orders; -- automatically filtered by RLS
```

### When to choose each level
- **DB per tenant**: regulated industries (finance, healthcare), enterprise contracts with data residency requirements, tenants who need independent backups and maintenance windows.
- **Schema per tenant**: balanced isolation and cost, up to a few thousand tenants.
- **Row-level**: tens of thousands of tenants, cost-sensitive, commodity SaaS.

---

## 4. CQRS

### What it is
Command Query Responsibility Segregation separates the **write model** (commands that mutate state) from the **read model** (queries that return data). They use different data stores optimised for their respective workloads.

### Topology
```
Client
  │
  ├──► Command ──► Write Service ──► [ Write DB: PostgreSQL ]
  │                     │                      │
  │                     │           emit domain event
  │                     ▼
  │              [ Event Bus: Kafka ]
  │                     │
  │         ┌───────────┼───────────┐
  │         ▼           ▼           ▼
  │   Projection A  Projection B  Projection C
  │   [ Redis ]    [ Elasticsearch ] [ PostgreSQL ]
  │
  └──► Query ──► Read Service ──► appropriate read store
```

### Write model — PostgreSQL
```sql
-- Normalised, consistent write model
CREATE TABLE orders (
    order_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    status      TEXT NOT NULL DEFAULT 'PENDING',
    total       NUMERIC(10,2) NOT NULL,
    version     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Read model examples

**Redis — order status projection (fast lookup)**
```bash
# Projection builder consumes Kafka event, writes to Redis Hash
HSET order:ord-8821 status SHIPPED tracking 1Z999AA customerId cust-42
EXPIRE order:ord-8821 86400

# Query service reads
HGETALL order:ord-8821
```

**Elasticsearch — order search projection**
```json
PUT /orders/_doc/ord-8821
{
  "orderId": "ord-8821",
  "customerName": "Alice Smith",
  "status": "SHIPPED",
  "items": ["sku-A1", "sku-B3"],
  "total": 39.98,
  "createdAt": "2024-06-01T10:00:00Z"
}
```

### When to choose CQRS
- Read and write workloads have very different scaling requirements.
- Multiple specialised read views of the same data are needed.
- Combined with Event Sourcing — events feed projections naturally.
- Complex domain where a single model is too heavy for querying.

### When NOT to choose CQRS
- Simple CRUD — two codepaths and eventual consistency add complexity for no benefit.
- Teams not experienced with eventual consistency — synchronisation bugs are subtle.

---

## 5. Event Sourcing

### What it is
Instead of storing current state, the system stores the **ordered sequence of domain events** that caused state changes. Current state is derived by replaying events. The event log is the single source of truth.

### Topology
```
Command ──► Aggregate ──► Domain Events ──► Event Store
                                                │
                               ┌────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
               Projection  Projection  External
               (Redis)     (PostgreSQL) Event Bus (Kafka)
```

### Event store — Kafka as append-only log
```bash
# Compacted topic per aggregate type — key = aggregate ID
# Each message = one domain event
kafka-topics.sh --create \
  --topic order-events \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.1 \
  --replication-factor 3 --partitions 6

# Event schema (Avro)
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "eventId",     "type": "string"},
    {"name": "aggregateId", "type": "string"},
    {"name": "eventType",   "type": "string"},
    {"name": "version",     "type": "int"},
    {"name": "occurredAt",  "type": "string"},
    {"name": "payload",     "type": "string"}
  ]
}
```

### Replay — rebuild a projection from scratch
```bash
# Reset consumer group to beginning — full replay
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group order-projection-service \
  --topic order-events \
  --reset-offsets --to-earliest --execute
```

### Event store — PostgreSQL
```sql
CREATE TABLE event_store (
    event_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id  UUID NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type    TEXT NOT NULL,
    version       INTEGER NOT NULL,
    payload       JSONB NOT NULL,
    occurred_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (aggregate_id, version)  -- optimistic concurrency
);

-- Append event
INSERT INTO event_store (aggregate_id, aggregate_type, event_type, version, payload)
VALUES ('ord-8821', 'Order', 'OrderPlaced', 1, '{"customerId":"cust-42","total":39.98}');

-- Replay aggregate
SELECT * FROM event_store
WHERE aggregate_id = 'ord-8821'
ORDER BY version ASC;
```

### When to choose Event Sourcing
- Complete, immutable audit trail is a hard requirement (finance, healthcare, legal).
- Temporal queries: "what was the state on date X?"
- Multiple independent projections needed from the same data.
- Undo/redo semantics in the domain.

### When NOT to choose
- Simple CRUD with no history requirement — massive added complexity.
- Small teams unfamiliar with the pattern — event schema design is hard to get right.

---

## 6. Read Replicas

### What it is
One or more **read-only copies** of the primary database that serve read queries. Replication is asynchronous; replicas may lag slightly behind the primary.

### Topology
```
Write Traffic ──► [ Primary ]
                      │
             replication stream
                      │
            ┌─────────┼─────────┐
            ▼         ▼         ▼
       [ Replica 1 ] [ Replica 2 ] [ Replica 3 ]
            │
       Read Traffic (queries, reports, analytics)
```

### PostgreSQL streaming replication
```ini
# postgresql.conf (primary)
wal_level = replica
max_wal_senders = 5
synchronous_commit = off     # async replication (higher throughput)

# pg_hba.conf (primary)
host replication replicator 10.0.0.0/8 md5
```

```sql
-- On replica: application routes read-only queries here
-- pg_is_in_recovery() returns true on replicas
SELECT pg_is_in_recovery();  -- true on replica
```

**Application-level routing**
```yaml
# Spring Boot datasource routing example
datasource:
  primary:
    url: jdbc:postgresql://primary:5432/mydb
  replica:
    url: jdbc:postgresql://replica:5432/mydb

# Route reads to replica, writes to primary via @Transactional(readOnly=true)
```

### When to choose
- Read-heavy workloads where the primary is the bottleneck.
- Reporting and analytics queries that would impact primary performance.
- Geographic distribution — place replicas closer to read-heavy regions.
- Disaster recovery — promote a replica if the primary fails.

### Replication lag considerations
- Accept stale reads for non-critical queries (product catalogue, user profile).
- Route to primary for read-your-own-writes scenarios (post-write read of the same record).
- Monitor `pg_stat_replication` and `pg_replication_slots` for lag.

---

## 7. Primary-Replica

### What it is
A topology where one node is the **primary** (write master) and one or more nodes are **replicas** (standby). All writes go to the primary; replicas apply changes via replication. Replicas can promote to primary on failover.

### Topology
```
            Writes
              │
              ▼
         [ Primary ]
              │
    wal/binlog replication
              │
     ┌────────┴────────┐
     ▼                 ▼
[ Replica 1 ]    [ Replica 2 ]
 (hot standby)   (hot standby)
     │
  Reads + Failover target
```

### Failover modes
| Mode | Description | RPO | RTO |
|---|---|---|---|
| **Manual failover** | DBA promotes replica | Near-zero | Minutes |
| **Automatic failover** | Patroni, Repmgr, AWS RDS Multi-AZ | Near-zero | 30–60s |
| **Synchronous replication** | Primary waits for replica ack | Zero | 30–60s |

### PostgreSQL with Patroni (auto-failover)
```yaml
# patroni.yml
scope: postgres-cluster
name: node1

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.1:5432
  data_dir: /data/postgres
  parameters:
    wal_level: replica
    hot_standby: "on"
    synchronous_commit: "on"
    synchronous_standby_names: "*"   # wait for at least one replica

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1 MB max lag for promotion
```

### When to choose
- Any production database — primary-replica is the baseline HA pattern.
- Zero-downtime deployments — promote replica before maintenance on primary.
- Disaster recovery — replica in a different AZ or region.

---

## 8. Sharding

### What it is
Sharding (horizontal partitioning) distributes data **across multiple independent database nodes** (shards) based on a shard key. Each shard holds a subset of the data and is fully independent.

### Topology
```
Client
  │
  ▼
[ Shard Router / Proxy ]
  │  hash(customerId) % N  or  range-based
  │
  ├──► Shard 0: customers 0000–3FFF  (PostgreSQL node A)
  ├──► Shard 1: customers 4000–7FFF  (PostgreSQL node B)
  ├──► Shard 2: customers 8000–BFFF  (PostgreSQL node C)
  └──► Shard 3: customers C000–FFFF  (PostgreSQL node D)
```

### Sharding strategies
| Strategy | How | Pros | Cons |
|---|---|---|---|
| **Hash sharding** | `hash(key) % N` | Uniform distribution | Range queries span all shards |
| **Range sharding** | Key ranges per shard | Range queries stay on one shard | Hotspots if data skewed |
| **Directory sharding** | Lookup table maps key → shard | Flexible, rebalance possible | Lookup table is a bottleneck/SPOF |
| **Geographic sharding** | Region → shard | Data residency, low latency | Uneven shard sizes |

### PostgreSQL sharding with Citus
```sql
-- Citus extension — distributed PostgreSQL
CREATE EXTENSION citus;

-- Designate distribution column
SELECT create_distributed_table('orders', 'customer_id');

-- All queries automatically routed to the correct shard
SELECT * FROM orders WHERE customer_id = 'cust-42';
-- Citus routes to the shard holding cust-42's data

-- Cross-shard aggregation (coordinator broadcasts and merges)
SELECT status, COUNT(*) FROM orders GROUP BY status;
```

### When to choose sharding
- Single database cannot handle write throughput or storage volume.
- Data set exceeds the vertical scaling ceiling of a single node.
- Proven other patterns first — sharding adds significant operational complexity.

### When NOT to choose sharding
- Cross-shard joins and transactions are expensive — avoid if many queries span multiple shards.
- Choose partitioning (within one DB) before sharding (across multiple DBs).

---

## 9. Partitioning

### What it is
Partitioning splits a large table into **smaller physical segments (partitions) within the same database**. The database engine routes queries to the relevant partition(s) automatically, dramatically improving query performance and maintenance.

### Partition types
| Type | Split by | Best for |
|---|---|---|
| **Range** | Date, ID range | Time-series, logs, events |
| **List** | Discrete values (country, status) | Categorical data |
| **Hash** | Hash of column value | Uniform distribution |

### PostgreSQL declarative partitioning
```sql
-- Range partitioning by month
CREATE TABLE orders (
    order_id   UUID NOT NULL,
    customer_id UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    total       NUMERIC(10,2)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Partition pruning — only scans 2024-01 partition
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';

-- Drop old partition (instant, vs. DELETE which is slow)
DROP TABLE orders_2023_01;
```

**Automated partition creation with pg_partman**
```sql
SELECT partman.create_parent(
    p_parent_table := 'public.orders',
    p_control      := 'created_at',
    p_interval     := 'monthly',
    p_premake      := 3   -- create 3 future partitions ahead
);
```

### When to choose partitioning
- Tables exceeding ~50–100 GB where query performance degrades.
- Time-series data with clear retention windows — drop old partitions instead of DELETE.
- Queries almost always include the partition key in WHERE clause (partition pruning).

---

## 10. Federation

### What it is
Federation splits a single large database into **multiple smaller databases** by **functional domain** (not by row count like sharding). Each federated database owns a logical business domain and is accessed via a unified query layer or API.

### Topology
```
Unified Query Layer (GraphQL / API / Federated Query Engine)
  │
  ├──► [ Users DB ]     — auth, profiles, preferences
  ├──► [ Orders DB ]    — orders, line items, fulfilment
  ├──► [ Products DB ]  — catalogue, pricing, inventory
  └──► [ Analytics DB ] — aggregated, denormalised, read-only
```

### Difference from sharding

| | Sharding | Federation |
|---|---|---|
| **Split by** | Rows (same table, different nodes) | Domain (different tables, different DBs) |
| **Purpose** | Scale write throughput | Separate concerns, reduce coupling |
| **Cross-node joins** | Expensive, same schema | Rare, different schemas |

### When to choose federation
- Large monolithic database being decomposed into microservices.
- Different domains have dramatically different performance/scaling profiles.
- Separate teams own separate domains and should not share a schema.

---

## 11. Polyglot Persistence

### What it is
**Use the best storage technology for each use case** rather than forcing all data into a single database. Different services use different stores optimised for their access patterns.

### Storage technology fit

| Store | Best for | Examples |
|---|---|---|
| **PostgreSQL** | Transactional data, complex queries, relational integrity | Orders, customers, inventory |
| **Redis** | Low-latency key/value, sessions, caching, pub/sub, queues | Sessions, rate limits, leaderboards |
| **Kafka** | Event streaming, audit logs, event sourcing | Domain events, CDC, analytics pipeline |
| **Elasticsearch/OpenSearch** | Full-text search, faceted search, log aggregation | Product search, log analytics, APM |
| **MongoDB** | Flexible schema, document hierarchies | CMS, user preferences, product catalogue |
| **Cassandra** | High-write time-series, wide-column | IoT telemetry, activity feeds |
| **S3/Blob** | Object storage, large files, data lake | Media, backups, data exports |

### Example: e-commerce polyglot stack
```
Order write       ──► PostgreSQL   (ACID transactions)
Order search      ──► Elasticsearch (full-text, facets)
Session store     ──► Redis         (sub-ms key/value)
Event stream      ──► Kafka         (audit, projections)
Product images    ──► S3            (blob storage)
Analytics         ──► Redshift/BigQuery (columnar warehouse)
```

### Data synchronisation
```
PostgreSQL (write) ──► Debezium CDC ──► Kafka ──► Elasticsearch (search index)
                                             ──► Redis (projection cache)
```

### When to choose polyglot persistence
- Services have genuinely different data access patterns.
- Performance of a shared general-purpose DB is insufficient.
- Combined with Database per Service — each service naturally chooses the right store.

### When NOT to choose
- Operational complexity is high — each store requires expertise, monitoring, backups.
- Cross-store ACID transactions are needed — distributed transactions are complex.
- Small teams without breadth of operational experience.

---

## 12. Materialized Views

### What it is
A Materialized View is a **pre-computed, persisted query result** stored as a table. Instead of running an expensive query on every request, the result is computed once and refreshed on schedule or on-demand.

### PostgreSQL materialized views
```sql
-- Define the materialized view
CREATE MATERIALIZED VIEW order_summary AS
SELECT
    c.customer_id,
    c.name           AS customer_name,
    COUNT(o.order_id) AS total_orders,
    SUM(o.total)      AS lifetime_value,
    MAX(o.created_at) AS last_order_at
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
WITH DATA;  -- populate immediately

-- Index for fast lookup
CREATE UNIQUE INDEX ON order_summary (customer_id);

-- Query is now instant — reads from the persisted result
SELECT * FROM order_summary WHERE customer_id = 'cust-42';

-- Refresh (can run on schedule via pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY order_summary;
-- CONCURRENTLY: no lock, stale reads allowed during refresh
```

### Elasticsearch as a materialised view
```
PostgreSQL (source) ──► CDC/Debezium ──► Kafka ──► Logstash/Kafka Connect ──► Elasticsearch index
```
The Elasticsearch index is effectively a materialised, searchable projection of the relational data.

### Redis as a materialised view
```bash
# Projection builder writes pre-computed view to Redis Hash
HSET customer:cust-42:summary totalOrders 14 lifetimeValue 523.40 lastOrderAt 2024-06-01
EXPIRE customer:cust-42:summary 3600

# Read service queries Redis — sub-millisecond
HGETALL customer:cust-42:summary
```

### When to choose materialized views
- Expensive aggregation queries run frequently on slowly-changing data.
- Reporting dashboards where slight staleness is acceptable.
- Pre-joining data from multiple tables for read-heavy endpoints.
- Cross-service projections in CQRS.

---

## 13. Data Lake

### What it is
A Data Lake is a **centralised repository that stores raw, unprocessed data** at any scale — structured, semi-structured, and unstructured — in its native format. Data is stored first, schema applied on read (schema-on-read).

### Topology
```
Sources
  │
  ├── Transactional DBs (via CDC)
  ├── Application logs
  ├── IoT / sensor streams
  ├── Third-party APIs
  └── Files (CSV, JSON, Parquet)
  │
  ▼
[ Ingestion Layer ]
  Kafka / Kinesis / Fluentd
  │
  ▼
[ Data Lake Storage ]
  S3 / Azure Data Lake / GCS
  Raw zone   → /raw/orders/2024/06/01/
  Refined zone→ /refined/orders/
  Curated zone→ /curated/order-kpis/
  │
  ▼
[ Query / Processing Layer ]
  Apache Spark, Trino, Athena, Databricks
```

### Kafka → Data Lake pipeline
```properties
# Kafka Connect S3 Sink Connector
connector.class=io.confluent.connect.s3.S3SinkConnector
tasks.max=4
topics=orders,customers,inventory
s3.region=us-east-1
s3.bucket.name=my-data-lake
s3.part.size=67108864
flush.size=1000
storage.class=io.confluent.connect.s3.storage.S3Storage
format.class=io.confluent.connect.s3.format.parquet.ParquetFormat
partitioner.class=io.confluent.connect.storage.partitioner.TimeBasedPartitioner
path.format='year'=YYYY/'month'=MM/'day'=dd/'hour'=HH
locale=en_US
timezone=UTC
```

### When to choose a Data Lake
- Storing data before you know all the ways you will query it.
- Machine learning and data science — raw data enables experimentation.
- Long-term data retention at low cost (object storage is cheap).
- Ingesting diverse data types from many sources into one place.

### When NOT to choose
- Operational queries requiring sub-second response — query-on-read is slow.
- Strong schema enforcement required — schema-on-read leads to data swamps.

---

## 14. Data Warehouse

### What it is
A Data Warehouse is a **structured, query-optimised store for historical, analytical data**. Data is cleaned, transformed, and loaded (ETL/ELT) into a schema optimised for reporting and BI queries (schema-on-write).

### Topology
```
Operational DBs ──► ETL/ELT ──► [ Data Warehouse ]
                   (Airbyte,           (Redshift,
                    dbt,               Snowflake,
                    Fivetran)          BigQuery,
                                       Postgres + columnar)
                                         │
                                    BI Tools
                                 (Tableau, Grafana,
                                  Metabase, Looker)
```

### Star schema (dimensional modelling)
```sql
-- Fact table — measurements and foreign keys
CREATE TABLE fact_orders (
    order_id      UUID PRIMARY KEY,
    customer_key  INTEGER REFERENCES dim_customer(customer_key),
    product_key   INTEGER REFERENCES dim_product(product_key),
    date_key      INTEGER REFERENCES dim_date(date_key),
    quantity      INTEGER,
    total_amount  NUMERIC(10,2)
);

-- Dimension table — descriptive attributes
CREATE TABLE dim_customer (
    customer_key  INTEGER PRIMARY KEY,
    customer_id   UUID,
    name          TEXT,
    country       TEXT,
    segment       TEXT
);
```

### PostgreSQL as a lightweight warehouse
```sql
-- TimescaleDB extension for time-series aggregation
CREATE EXTENSION timescaledb;

-- Continuous aggregation (materialised, refreshed automatically)
CREATE MATERIALIZED VIEW hourly_revenue
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', created_at) AS bucket,
    SUM(total) AS revenue,
    COUNT(*) AS order_count
FROM orders
GROUP BY bucket;
```

### When to choose a Data Warehouse
- BI reporting, executive dashboards, fixed analytical queries.
- Historical analysis and trend identification.
- Data governance — enforced schemas, data quality rules.
- When query performance on large datasets must be sub-second.

---

## 15. Lambda Architecture

### What it is
Lambda Architecture processes data through **two parallel pipelines**: a **batch layer** (high latency, accurate, processes all historical data) and a **speed layer** (low latency, approximate, processes recent data in real time). A **serving layer** merges both to answer queries.

### Topology
```
Incoming Data
     │
     ├──► [ Speed Layer ]   ──► real-time views
     │    (Kafka Streams,        (approximate,
     │     Spark Streaming,       recent only)
     │     Flink)                      │
     │                                 ▼
     └──► [ Batch Layer ]  ──► batch views    ──► [ Serving Layer ] ──► Query
          (Spark, Hadoop,       (accurate,          (merge batch +
           scheduled jobs)       complete)            speed views)
```

### When to choose Lambda Architecture
- You need both real-time approximate results AND accurate batch results.
- Fraud detection — real-time alert + daily accurate batch reconciliation.
- Metrics dashboards — live counters (speed) + historical trends (batch).

### When NOT to choose
- Maintaining two codepaths (batch + streaming) is operationally expensive.
- Kappa Architecture (streaming only) is usually preferred for new systems — simpler.

---

## 16. Kappa Architecture

### What it is
Kappa Architecture uses a **single streaming pipeline** for both real-time and historical processing. All data flows through a durable, replayable stream (Kafka). Historical reprocessing is done by replaying the stream with a new consumer — no separate batch layer.

### Topology
```
Incoming Data
     │
     ▼
[ Kafka — durable, replayable event log ]
     │
     │  Real-time consumer (latest events)
     │
     ▼
[ Stream Processor ]
(Kafka Streams / Flink / Spark Structured Streaming)
     │
     ▼
[ Serving Store ]
(Redis / PostgreSQL / Elasticsearch)
     │
     ▼
   Query
```

**Reprocessing (replay):** Reset consumer group to offset 0 → stream processor rebuilds the serving store from scratch.

### Kafka Streams example
```java
StreamsBuilder builder = new StreamsBuilder();

builder.stream("orders", Consumed.with(Serdes.String(), orderSerde))
    .filter((key, order) -> order.getStatus().equals("COMPLETED"))
    .groupBy((key, order) -> order.getCustomerId())
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofHours(1)))
    .aggregate(
        () -> new RevenueAggregate(),
        (customerId, order, agg) -> agg.add(order.getTotal()),
        Materialized.as("customer-hourly-revenue")
    )
    .toStream()
    .to("customer-revenue-output");
```

### When to choose Kappa Architecture
- New systems where real-time streaming can cover all analytics needs.
- You want a single codebase for both real-time and historical processing.
- Kafka is already in your stack.
- Prefer operational simplicity over the accuracy guarantees of Lambda's batch layer.

---

## 17. CDC — Change Data Capture

### What it is
CDC captures **every row-level change** (INSERT, UPDATE, DELETE) in a database and publishes those changes as a stream of events — without modifying the application code. It enables real-time data synchronisation, event-driven pipelines, and audit logging.

### How it works (PostgreSQL WAL-based)
```
[ Application ] ──► INSERT/UPDATE/DELETE ──► [ PostgreSQL ]
                                                    │
                                           WAL (Write-Ahead Log)
                                                    │
                                           [ Debezium Connector ]
                                                    │
                                           [ Kafka Topic ]
                                           (e.g., postgres.public.orders)
                                                    │
                      ┌─────────────────────────────┼─────────────────────┐
                      ▼                             ▼                     ▼
               Elasticsearch               Redis projection           Data Lake (S3)
               (search index sync)         (cache invalidation)      (audit trail)
```

### PostgreSQL CDC setup
```sql
-- Enable logical replication
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 4;
SELECT pg_reload_conf();

-- Create replication slot for Debezium
SELECT pg_create_logical_replication_slot('debezium_slot', 'pgoutput');

-- Grant replication permission
ALTER USER debezium_user REPLICATION;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium_user;
```

```json
// Debezium PostgreSQL connector config
{
  "name": "postgres-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium_user",
    "database.password": "secret",
    "database.dbname": "mydb",
    "database.server.name": "postgres",
    "table.include.list": "public.orders,public.customers",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_slot",
    "publication.name": "debezium_publication",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter"
  }
}
```

### CDC event structure (Debezium envelope)
```json
{
  "before": { "order_id": "ord-8821", "status": "PENDING" },
  "after":  { "order_id": "ord-8821", "status": "SHIPPED" },
  "op": "u",
  "ts_ms": 1717235200000,
  "source": { "db": "mydb", "table": "orders" }
}
```

### CDC → Elasticsearch sync
```json
// Kafka Connect Elasticsearch Sink
{
  "name": "elasticsearch-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "connection.url": "http://elasticsearch:9200",
    "topics": "postgres.public.orders",
    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "true",
    "transforms": "extractAfter",
    "transforms.extractAfter.type": "org.apache.kafka.connect.transforms.ExtractField$Value",
    "transforms.extractAfter.field": "after"
  }
}
```

### When to choose CDC
- Real-time data synchronisation across stores (DB → Elasticsearch, DB → Cache).
- Transactional Outbox pattern — CDC replaces a polling relay.
- Audit log — capture every change without modifying application code.
- Event Sourcing bootstrapping — seed the event stream from existing DB state.
- Zero-downtime migrations — sync old and new databases in parallel.

---

## 18. Cache-Aside

### What it is
The application manages the cache explicitly. On a read miss, the **application fetches from the database and populates the cache itself**. On writes, the application updates the database and **invalidates or updates the cache**.

### Flow
```
Read:
  Application ──► Cache (Redis) ──► HIT → return cached value
                       │
                      MISS
                       │
                       ▼
                  Database (PostgreSQL)
                       │
                  fetch value
                       │
                       ▼
                  Cache ← store value with TTL
                       │
                       ▼
                  Application ← return value

Write:
  Application ──► Database (PostgreSQL) ──► update
                       │
                       ▼
                  Cache (Redis) ──► DEL (invalidate) or SET (update)
```

### Redis implementation
```python
def get_order(order_id: str) -> dict:
    cache_key = f"order:{order_id}"

    # 1. Check cache
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Cache miss — fetch from DB
    order = db.query("SELECT * FROM orders WHERE order_id = %s", order_id)
    if not order:
        return None

    # 3. Populate cache with TTL
    redis.setex(cache_key, 3600, json.dumps(order))
    return order

def update_order_status(order_id: str, status: str) -> None:
    # 1. Update DB
    db.execute("UPDATE orders SET status = %s WHERE order_id = %s", status, order_id)

    # 2. Invalidate cache
    redis.delete(f"order:{order_id}")
```

### When to choose Cache-Aside
- Read-heavy workloads with cacheable, frequently accessed data.
- You want explicit control over what gets cached and when.
- Cache failures must not prevent reads (fall back to DB).
- Data is read far more often than it is written.

### Pitfalls
| Pitfall | Description | Mitigation |
|---|---|---|
| **Cache stampede** | Many concurrent misses hit DB simultaneously | Lock/mutex on cache miss; background refresh |
| **Thundering herd** | TTL expires for popular key | Jitter on TTL; probabilistic early refresh |
| **Stale data** | Write invalidates cache but window exists | Short TTL; write-through for critical data |

---

## 19. Read-Through Cache

### What it is
The **cache sits in front of the database** and handles the miss logic automatically. The application always reads from the cache; if the cache misses, the cache itself fetches from the database and stores the result before returning it.

### Flow
```
Application ──► Cache (Redis / Memcached)
                      │
                   HIT → return
                   MISS → Cache fetches from DB automatically
                          → stores in cache
                          → returns to application
```

### Redis implementation (using a cache library / proxy)
```java
// Spring Cache abstraction — cache handles miss automatically
@Cacheable(value = "orders", key = "#orderId")
public Order getOrder(String orderId) {
    // Only called on cache miss — Spring puts result into cache
    return orderRepository.findById(orderId).orElse(null);
}

@CacheEvict(value = "orders", key = "#order.orderId")
public void updateOrder(Order order) {
    orderRepository.save(order);
}
```

### Difference from Cache-Aside
| | Cache-Aside | Read-Through |
|---|---|---|
| **Who fetches on miss** | Application | Cache / cache library |
| **Application coupling** | Application knows about the cache | Application only talks to cache |
| **Flexibility** | Full control | Less control; cache must support the data fetcher |
| **Cold start** | Cache is empty; all misses until warmed | Same — but warming is transparent |

### When to choose Read-Through
- You want to completely hide cache logic from application code.
- Using a caching framework or proxy (Spring Cache, Amazon ElastiCache, DAX).
- Cache-aside logic is duplicated across many services.

---

## 20. Write-Through Cache

### What it is
Every write goes **through the cache first** — the cache updates itself and the database in the same operation before acknowledging the write. Cache and database are always in sync.

### Flow
```
Application ──► Cache (Redis)
                      │
               write to cache
                      │
                      ▼
               Database (PostgreSQL)
                      │
               write to DB
                      │
                      ▼
               Acknowledge to application
```

### Redis + PostgreSQL implementation
```python
def update_order_status(order_id: str, status: str) -> None:
    # Write-through: update cache and DB atomically (best-effort)
    # 1. Update DB first (source of truth)
    db.execute("UPDATE orders SET status = %s WHERE order_id = %s", status, order_id)

    # 2. Update cache (same transaction context if using Lua script)
    redis.setex(f"order:{order_id}:status", 3600, status)
```

**Redis Lua script for atomic write-through**
```lua
-- Atomic update of hash field + expiry reset
local key = KEYS[1]
local field = ARGV[1]
local value = ARGV[2]
local ttl = tonumber(ARGV[3])

redis.call('HSET', key, field, value)
redis.call('EXPIRE', key, ttl)
return 1
```

### When to choose Write-Through
- Data must be consistent between cache and DB at all times.
- Reads are very frequent and must never return stale data.
- Write performance is not the primary concern (writes are slower — two stores updated).
- Combined with Read-Through for a fully transparent caching layer.

### Pitfalls
- **Write latency** is higher — must write to both stores synchronously.
- **Cache pollution** — infrequently-read data fills the cache on every write; mitigate with TTL.

---

## 21. Write-Behind Cache

### What it is
Also called **Write-Back** cache. Writes go to the cache immediately (fast acknowledgement), and the cache **asynchronously persists to the database** in the background. Writes are batched and flushed at intervals.

### Flow
```
Application ──► Cache (Redis)
                      │
               write to cache immediately
               acknowledge to application ← fast response
                      │
               (async, batched)
                      │
                      ▼
               Database (PostgreSQL) ← flushed every N ms / N writes
```

### Redis implementation pattern
```python
import redis, time
from threading import Thread

r = redis.Redis()

def write_behind_update(order_id: str, data: dict):
    # 1. Write to cache immediately (fast path)
    r.hset(f"order:{order_id}", mapping=data)
    # 2. Add to write-behind queue
    r.lpush("write-behind-queue", json.dumps({"id": order_id, "data": data}))

def write_behind_flusher():
    """Background thread — drains queue to DB every 100ms"""
    while True:
        batch = []
        while len(batch) < 100:
            item = r.rpop("write-behind-queue")
            if not item:
                break
            batch.append(json.loads(item))

        if batch:
            with db.transaction():
                for record in batch:
                    db.execute("INSERT INTO orders ... ON CONFLICT DO UPDATE ...",
                               record["id"], record["data"])
        time.sleep(0.1)

Thread(target=write_behind_flusher, daemon=True).start()
```

### When to choose Write-Behind
- Write-heavy workloads where write latency is critical (gaming, leaderboards, counters).
- Batching writes to DB is more efficient than writing each one individually.
- Short-term data loss on crash is acceptable (cache not yet flushed to DB).

### Pitfalls
| Pitfall | Mitigation |
|---|---|
| **Data loss on cache crash** | Redis AOF persistence; replicate the write-behind queue |
| **Consistency window** | Cache and DB diverge until flush; do not use for financial data |
| **Queue growth** | Monitor queue depth; backpressure if DB is slow |

---

## 22. Caching Strategies Compared

| Property | Cache-Aside | Read-Through | Write-Through | Write-Behind |
|---|---|---|---|---|
| **Who manages miss** | Application | Cache / library | N/A (always hits on read) | N/A |
| **Write path** | App writes DB, invalidates cache | App writes DB, evicts cache | App writes cache + DB synchronously | App writes cache; async flush to DB |
| **Read consistency** | Eventual (short window after write) | Eventual | Strong | Eventual (flush delay) |
| **Write latency** | Low (DB write only) | Low (DB write only) | Higher (two synchronous writes) | Very low (cache write only) |
| **Cache always populated** | No — miss until first read | No — miss on first read | Yes — write populates | Yes — write populates |
| **Risk of stale data** | Yes (between write and invalidation) | Yes (between write and eviction) | No | Yes (flush delay) |
| **Risk of data loss** | No | No | No | Yes (unflushed writes) |
| **Best for** | Read-heavy, infrequent writes | Transparent read caching | Strong consistency reads | High-frequency writes, counters |

---

## 23. Pattern Decision Guide

### By problem

| You need... | Pattern | Storage recommendation |
|---|---|---|
| Simple service isolation | Database per Service | PostgreSQL per service |
| Tenant data isolation | Database per Tenant | Schema-per-tenant in PostgreSQL |
| Scale reads without scaling writes | Read Replicas | PostgreSQL streaming replication |
| Scale writes beyond one node | Sharding | Citus (PostgreSQL) or native sharding |
| Reduce large table query time | Partitioning | PostgreSQL declarative partitioning |
| Separate domain concerns at DB level | Federation | Separate PostgreSQL instances per domain |
| Different access patterns per service | Polyglot Persistence | PostgreSQL + Redis + Elasticsearch + Kafka |
| Separate read and write scaling | CQRS | PostgreSQL write + Redis/ES read models |
| Full audit trail + temporal queries | Event Sourcing | Kafka + PostgreSQL event store |
| Sync DB changes to other stores in real time | CDC | Debezium + Kafka → Elasticsearch/Redis |
| Pre-compute expensive queries | Materialized Views | PostgreSQL MATERIALIZED VIEW or Redis projection |
| Store raw data at scale for ML/analytics | Data Lake | Kafka → S3 (Parquet) |
| Structured BI reporting | Data Warehouse | PostgreSQL + dbt or Redshift/Snowflake |
| Real-time + historical in one pipeline | Kappa Architecture | Kafka Streams / Flink |
| Real-time approximate + accurate batch | Lambda Architecture | Kafka (speed) + Spark batch |
| Read-heavy, tolerate slight staleness | Cache-Aside | Redis |
| Transparent caching in application layer | Read-Through | Redis + Spring Cache |
| Cache and DB always in sync on writes | Write-Through | Redis + synchronous DB write |
| High-frequency writes, batch to DB | Write-Behind | Redis write queue + background flusher |

### By scale profile

| Scale profile | Recommended patterns |
|---|---|
| Single-region, moderate load | Primary-Replica + Read Replicas + Cache-Aside (Redis) |
| Multi-service, moderate load | Database per Service + Polyglot Persistence + CDC |
| Very high read throughput | Read Replicas + CQRS + Read-Through Cache |
| Very high write throughput | Sharding + Write-Behind Cache + Partitioning |
| Real-time analytics | Kappa (Kafka Streams) + Elasticsearch |
| Historical analytics + BI | Data Warehouse + Materialized Views |
| Multi-tenant SaaS | Database per Tenant + Cache-Aside + Read Replicas |
| Event-driven microservices | Event Sourcing + CQRS + CDC + Polyglot Persistence |

---

*Reference: Martin Kleppmann — Designing Data-Intensive Applications · Pat Helland — Life Beyond Distributed Transactions · Debezium Documentation · PostgreSQL Documentation*
