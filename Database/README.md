# Database

## Database Types

There are several types of databases, and the best way to understand them is to classify them by how they store and access data.

1. Relational Databases (SQL)

Store data in tables with rows and columns.

Examples:
- PostgreSQL
- MySQL
- Oracle
- SQL Server

```
Users
+----+--------+------------------+
| id | name   | email            |
+----+--------+------------------+
| 1  | John   | john@example.com |
| 2  | Alice  | alice@example.com |
+----+--------+------------------+
```
Good for: transactions, relationships, strong consistency.

Common use cases:
- Banking
- E-commerce
- Ticket booking
- ERP systems

### 2. Document Databases (NoSQL)

Store data as JSON-like documents rather than tables.

Examples:
- MongoDB
- Couchbase
- Firestore

```
{
  "id": 101,
  "name": "John",
  "orders": [
    {
      "product": "Laptop",
      "price": 80000
    }
  ]
}
```
Good for: flexible schemas, rapidly changing data, hierarchical data.

### 3. Key-Value Databases

Store data as:
```
KEY → VALUE
```

Examples:
- Redis
- Amazon DynamoDB
- Riak

```
"user:101" → "{ name: 'John', age: 30 }"
"session:xyz" → "authenticated"
```

Good for:
- Caching
- Sessions
- Rate limiting
- Fast lookups

### 4. Wide-Column Databases

Store data using rows and column families and are designed for very large distributed datasets.

Examples:
- Apache Cassandra
- ScyllaDB
- Google Bigtable

```
UserId | Name | Age | City
-------|------|-----|------
101    | John | 30  | Delhi
102    | Alice| 28  | Mumbai
```
Unlike traditional SQL databases, the storage model is optimized for distributed, high-scale workloads.

Good for:
- IoT
- Time-series-like workloads
- Massive-scale applications
- High write throughput

### 5. Graph Databases

Store data as nodes + relationships.

Examples:
```
Neo4j
Amazon Neptune
John
  │
  ├── FRIEND_OF ──> Alice
  │
  └── WORKS_AT ──> Google
```

Good for:
- Social networks
- Recommendation engines
- Fraud detection
- Network analysis

### 6. Time-Series Databases

Optimized for data that changes over time.

Examples:
- InfluxDB
- TimescaleDB
- Prometheus

```
timestamp           CPU
10:00               45%
10:01               51%
10:02               63%
10:03               58%
```

Good for:
- Monitoring
- Metrics
- IoT
- Stock/financial data

### 7. Vector Databases

Store embeddings/vectors and perform similarity searches.

Examples:
- Qdrant
- Pinecone
- Weaviate
- Milvus

```
"How do I reset my password?"
          ↓
     Embedding
          ↓
[0.12, -0.45, 0.78, ...]
          ↓
    Vector Database
          ↓
Similar documents
```

Good for:
- RAG
- Semantic search
- AI assistants
- Recommendation systems
- Image/audio similarity

### 8. Search Databases / Search Engines

Optimized for full-text search.

Examples:
- Elasticsearch
- OpenSearch
- Apache Solr

Search:
```
"Angular authentication"

        ↓

Indexed documents
        ↓

Relevant results
```

Good for:
- Product search
- Log search
- Full-text search
- Filtering and analytics

| Database Type   | Examples              | Best For                     |
| --------------- | --------------------- | ---------------------------- |
| **Relational**  | PostgreSQL, MySQL     | Transactions & relationships |
| **Document**    | MongoDB               | Flexible JSON data           |
| **Key-Value**   | Redis                 | Cache & sessions             |
| **Wide-Column** | Cassandra             | Massive distributed data     |
| **Graph**       | Neo4j                 | Relationships                |
| **Time-Series** | InfluxDB, TimescaleDB | Metrics & time-based data    |
| **Vector**      | Qdrant, Pinecone      | AI/RAG & semantic search     |
| **Search**      | Elasticsearch         | Full-text search             |

**For system design, remember this simple mapping**
```
Transactional data       → PostgreSQL
Flexible JSON data       → MongoDB
Cache / Session          → Redis
Huge distributed writes  → Cassandra
Relationships            → Neo4j
Metrics                  → TimescaleDB / InfluxDB
AI / RAG                 → Qdrant
Full-text search         → Elasticsearch
```
One important point: a real production system often uses multiple database types together.

## Structured, Unstructured, Semi Structured data

### 1. Structured Data

Data has a fixed schema and follows a well-defined format.

Think: rows + columns.

Example:
|  ID | Name  | Age | City    |
| --: | ----- | --: | ------- |
| 101 | John  |  30 | Kolkata |
| 102 | Alice |  28 | Mumbai  |

```
User
----------------
id       INTEGER
name     VARCHAR
age      INTEGER
city     VARCHAR
```

Characteristics:
- Fixed schema
- Easy to query
- Highly organized
- Usually stored in relational databases

Examples:
- Customer records
- Bank transactions
- Employee information
- Product inventory
- Orders

Databases: PostgreSQL, MySQL, Oracle, SQL Server

### 2. Semi-Structured Data

Data doesn't follow a strict table structure, but it contains tags, keys, metadata, or hierarchy that provide structure.

Think: JSON / XML.

Example:
```
{
  "id": 101,
  "name": "John",
  "skills": [
    "Angular",
    "Python",
    "PostgreSQL"
  ],
  "address": {
    "city": "Kolkata",
    "country": "India"
  }
}
```
Notice that another user could have completely different fields:
```
{
  "id": 102,
  "name": "Alice",
  "experience": 5
}
```
There isn't necessarily a fixed set of columns.

Characteristics:
- Flexible schema
- Self-describing
- Hierarchical/nested
- Easier to evolve than structured data

Examples:
- JSON
- XML
- YAML
- Application API responses
- Configuration files
- Event messages

Databases: MongoDB, Couchbase, DynamoDB

### 3. Unstructured Data

Data doesn't have a predefined data model or organized structure that a traditional database can easily represent.

Examples:   
📄 PDF documents  
🖼️ Images   
🎥 Videos   
🎵 Audio 
📧 Emails   
📝 Word documents 
📑 Scanned documents 

For example, a resume PDF might contain:
```
John Doe

Senior Software Engineer

Experience:
8 years

Skills:
Angular
Python
AWS
PostgreSQL
```
The content is meaningful to humans, but it isn't naturally organized into rows and columns.

Characteristics:
- No fixed schema
- Large and varied
- Requires specialized processing
- Often processed using search, AI, OCR, or embeddings

Storage: Object storage such as S3/Azure Blob/GCS, file systems, document stores, etc.

### The easiest way to remember
```
STRUCTURED
    ↓
Fixed schema
    ↓
Tables
    ↓
PostgreSQL / MySQL


SEMI-STRUCTURED
    ↓
Flexible schema
    ↓
JSON / XML
    ↓
MongoDB / DynamoDB


UNSTRUCTURED
    ↓
No predefined schema
    ↓
PDF / Image / Video / Audio
    ↓
Object Storage + Search / AI
```

### Real-world example: IT Helpdesk

Suppose you build an IT Helpdesk system.

**Structured:**
```
Ticket
--------------------------------
id | user_id | status | priority
1  | 101     | OPEN   | HIGH
2  | 102     | CLOSED | LOW
```
→ PostgreSQL

**Semi-structured:**
```
{
  "ticketId": 101,
  "metadata": {
    "browser": "Chrome",
    "os": "Windows 11",
    "device": "Laptop"
  }
}
```
→ PostgreSQL JSONB / MongoDB

**Unstructured:**
```
incident-report.pdf
screenshot.png
error-log.txt
voice-recording.mp3
```
→ Object storage

And if you want an AI/RAG system to understand those documents:
```
PDF / DOCX / TXT
       ↓
   Text Extraction
       ↓
     Chunking
       ↓
    Embeddings
       ↓
      Qdrant
       ↓
    RAG / LLM
```
So, in modern systems, structured + semi-structured + unstructured data often coexist rather than using only one type.


## Database Performance/Scaling Techniques
Yes — these are four major database performance/scaling techniques, but they solve different bottlenecks. The easiest way to understand them is as a progression:
```
Scale → Replicate → Partition → Shard
```
> Scaling increases database capacity, either vertically by adding CPU/RAM or horizontally by adding nodes. Replication creates copies of data, typically primary and read replicas, to improve read scalability and availability. Partitioning divides a large table into smaller logical partitions based on a key such as date or customer ID, improving query and maintenance efficiency. Sharding distributes those partitions across multiple database servers, allowing the system to scale datasets and workloads beyond the limits of a single database server.

```
Replication = copy the same data
Partitioning = split data logically
Sharding = split data across machines
Scaling = increase overall capacity
```

### 1. Scaling

Scaling means increasing the database's ability to handle more workload.

There are two types:

**Vertical Scaling (Scale Up)**

Increase resources of the same database server:
```
Before
Database Server
CPU: 4 cores
RAM: 16 GB
Disk: 500 GB

        ↓ Scale Up

After
Database Server
CPU: 16 cores
RAM: 64 GB
Disk: 2 TB
```

Good when:
- Traffic is moderate
- Database is still relatively simple
- You need a quick improvement
- The database supports larger machines

Limitation: there is a physical/resource ceiling.

**Horizontal Scaling (Scale Out)**

Add more database servers.
```
                Application
                     |
          +----------+----------+
          |          |          |
       DB Node 1  DB Node 2  DB Node 3
```
Horizontal scaling commonly leads to replication and sharding.

### 2. Replicas

Replication means maintaining copies of the database on multiple servers.

A common pattern is Primary + Read Replicas:
```
                  Application
                      |
                +-----+-----+
                |           |
             WRITE        READ
                |           |
           +----v----+  +----v----+
           | Primary |  | Replica |
           +----+----+  +---------+
                |
          Replication
                |
           +----v----+
           | Replica |
           +---------+
```
Example:
```
INSERT / UPDATE / DELETE
          ↓
       Primary

SELECT → Replica 1
SELECT → Replica 2
SELECT → Replica 3
```

**Why replicas improve performance**

Suppose you have:
```
10,000 requests/sec

9,000 READ
1,000 WRITE
```

Instead of making one database handle everything:
```
              DB
        10,000 req/sec
```

you can distribute reads:
```
              Primary
             1,000 writes
                  |
        +---------+---------+
        ↓         ↓         ↓
     Replica 1 Replica 2 Replica 3
      3,000      3,000      3,000
       reads      reads      reads
```
Important: Replicas primarily help with read scalability, not write scalability.

They can also improve availability/failover.

### 3. Partitioning

Partitioning divides one logical database/table into smaller pieces, usually while keeping them within the same database system.

For example, an orders table:
```
Orders
------------------------------------------------
id | customer | date       | amount
------------------------------------------------
1  | C101     | 2024-01-10 | 500
2  | C102     | 2024-03-15 | 800
3  | C103     | 2025-01-20 | 200
4  | C104     | 2026-02-10 | 900
...
```
Partition by year:
```
Orders
   |
   +---- orders_2024
   |
   +---- orders_2025
   |
   +---- orders_2026
```
A query like:
```
SELECT *
FROM orders
WHERE order_date >= '2026-01-01';
```
can potentially scan only:
```
orders_2026
```
instead of the entire table.

**Common partitioning strategies**

Range partitioning
```
2024 → Partition 1
2025 → Partition 2
2026 → Partition 3
```
List partitioning
```
India     → Partition 1
USA       → Partition 2
UK        → Partition 3
```
Hash partitioning
```
hash(customer_id)

        ↓

Partition 1
Partition 2
Partition 3
Partition 4
```
Partitioning is particularly useful for very large tables, query performance, maintenance, and data lifecycle management.

### 4. Sharding

Sharding is horizontal partitioning across multiple database servers.

This is the important distinction:
```
Partitioning can divide data within a database system. Sharding distributes those partitions across different database nodes.
```
For example, suppose you have 1 billion users.

Instead of:
```
                    Database
                 1 Billion Users
                       |
              Single DB Server
```
Shard by user_id:
```
                       Application
                            |
                     Shard Router
                            |
             +--------------+--------------+
             |              |              |
             ↓              ↓              ↓
          Shard 1        Shard 2        Shard 3
       user_id 0-99M  user_id 100-199M user_id 200-299M
```
Or using hashing:
```
shard = hash(user_id) % 4
```
So:
```
user 101 → hash → Shard 2
user 202 → hash → Shard 3
user 305 → hash → Shard 1
user 406 → hash → Shard 4
```
Now the workload is distributed across multiple machines.

**Sharding primarily helps with**
- Massive datasets
- Very high traffic
- Write scalability
- Storage limitations
- Distributing CPU/IO workload

But it introduces significant complexity:
- Cross-shard queries
- Transactions across shards
- Rebalancing
- Choosing a good shard key
- Hot shards
- Data migration

### The key difference

| Technique        | What is divided?   | Multiple DB servers? | Main benefit                    |
| ---------------- | ------------------ | -------------------: | ------------------------------- |
| **Scaling Up**   | Hardware resources |                    ❌ | More CPU/RAM/IO                 |
| **Replication**  | Copies of data     |                    ✅ | Read scalability + availability |
| **Partitioning** | Table/data         |            Usually ❌ | Query/maintenance efficiency    |
| **Sharding**     | Data               |                    ✅ | Massive horizontal scalability  |

### Think about it like a library

Imagine one huge library.

**Scaling**
```
Make the library building bigger
```
More CPU/RAM/storage.

**Replication**
```
Create additional copies of the library
```
Readers can go to different copies.

**Partitioning**
```
Organize books into sections
```
Computer Science → Section A    
Finance → Section B     
History → Section C     

**Sharding**
```
Create multiple library buildings
```
Library A → customers 1–1M      
Library B → customers 1M–2M     
Library C → customers 2M–3M     

### How they work together in a real system

A large production architecture may use all four:
```
                         Users
                           |
                           ↓
                    Load Balancer
                           |
                    Application Servers
                           |
                    Database Router
                           |
             +-------------+-------------+
             |             |             |
             ↓             ↓             ↓
          Shard 1       Shard 2       Shard 3
             |             |             |
          Primary       Primary       Primary
             |             |             |
          +--+--+       +--+--+       +--+--+
          ↓     ↓       ↓     ↓       ↓     ↓
        Read   Read   Read   Read   Read   Read
        Rep.   Rep.   Rep.   Rep.   Rep.   Rep.
```

And each shard may itself use partitioning:
```
Shard 1
   |
   +--- orders_2024
   +--- orders_2025
   +--- orders_2026
```
So the concepts are not mutually exclusive.