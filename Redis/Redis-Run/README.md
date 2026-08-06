# Where Redis Runs
Redis runs as an independent service, just like your database. It is not embedded inside your application server.

- **Application Server** → scales compute
- **Redis Server** → scales memory
- **Primary Database** → scales storage

They are independent so each can be scaled, upgraded, or restarted separately.

"Redis is an in-memory key-value data store that runs as a completely separate process — typically on its own server or container — positioned between the application layer and the primary database. It is not part of the application code and it is not part of the database itself.

The application connects to Redis using a host address, port — typically 6379 — and authentication credentials. On every incoming request, the application checks Redis first. If the data is found — Cache Hit — it is returned immediately from memory without any database query. If not found — Cache Miss — the application fetches the data from the database, stores it in Redis with an appropriate TTL and returns the response. Subsequent requests for the same data are served entirely from Redis.

In production, Redis is commonly deployed as a Redis Cluster for horizontal scalability or as a managed service like AWS ElastiCache or Azure Cache for Redis. Key production configurations include setting a memory limit with an appropriate eviction policy — LRU is common for caching use cases — enabling password authentication, configuring persistence for recovery after restarts and setting up read replicas for high availability.

The core value Redis provides is eliminating repeated database queries for frequently accessed data — reducing latency from milliseconds to microseconds and allowing the database to handle only write-heavy or complex query workloads."

There are several deployment options.

### Option 1: Separate Physical Server (Traditional)
```
Machine 1
---------
Application Server

Machine 2
---------
Redis

Machine 3
---------
PostgreSQL
```
This was common years ago.

### Option 2: Separate Virtual Machine (Very Common)
```
VM1
----
Node.js

VM2
----
Redis

VM3
----
PostgreSQL
```
Cloud providers like AWS, Azure, and GCP commonly use VMs.

### Option 3: Docker Containers (Very Common)

Each service runs in its own container.
```
Docker Host
----------------------------------------

+----------------------+
| Node Container       |
+----------------------+

+----------------------+
| Redis Container      |
+----------------------+

+----------------------+
| PostgreSQL Container |
+----------------------+
```

Example Docker Compose:
```
version: "3.9"

services:

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:8
    ports:
      - "6379:6379"

  postgres:
    image: postgres:17
    ports:
      - "5432:5432"
```
Each container is isolated but can communicate over Docker's internal network.

### Option 4: Kubernetes (Production)
```
Kubernetes Cluster

+---------------------+
| App Pod 1           |
+---------------------+

+---------------------+
| App Pod 2           |
+---------------------+

+---------------------+
| App Pod 3           |
+---------------------+

        |
        |
Redis Service ---> Redis Pod

        |
        |
Postgres Service ---> PostgreSQL Pod
```
This is a common cloud-native deployment model.

## Why Not Install Redis Inside the Application Server?

Suppose everything runs on one machine:
```
Machine

Node.js
Redis
PostgreSQL
```
Problems include:
- If the machine crashes, all three services go down.
- Redis competes with Node.js for RAM.
- PostgreSQL competes for CPU and disk I/O.
- You can't scale Redis independently.
- You can't add more application servers without redesigning the setup.





