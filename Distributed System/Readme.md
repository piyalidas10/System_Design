# Distributed Systems: From Vertical Scaling to Horizontal Scaling

> To understand modern system design, start with a simple idea:
> - **Vertical scaling (scale up):** Make one machine more powerful.
> - **Horizontal scaling (scale out):** Add more machines and distribute the workload across them.
> - **Distributed computing:** Use multiple connected machines that coordinate to perform computation, store data, or both.

As the number of users grows, one machine may no longer have enough CPU, memory, network capacity, or storage. Horizontal scaling helps address these limits by distributing work across multiple machines.

---

## 1. Step-by-Step Evolution

### Step 1 — Start with One Server

A single server runs your application and handles all user requests. It may also store data in a database on the same machine.

- Simple to develop and deploy.
- Suitable for low traffic.
- The server becomes a bottleneck as demand grows.

```
Users → Single Server (App + DB)
```

---

### Step 2 — Vertical Scaling (Scale Up)

Upgrade the existing server with more CPU cores, RAM, faster storage, or greater network capacity.

- No need to distribute application requests across multiple servers.
- Usually simpler than a distributed architecture.
- Hardware capacity and cost eventually become limiting factors.

```
Users → One Powerful Server
         (More CPU · More RAM · Faster Storage)
```

---

### Step 3 — Horizontal Scaling (Scale Out)

Add multiple application servers and distribute incoming requests using a load balancer.

- More machines can handle more concurrent requests.
- You can add or remove servers as demand changes.
- Requires coordination, monitoring, and handling failures across machines.

```
Users → Load Balancer → Server 1
                      → Server 2
                      → Server 3
```

---

### Step 4 — Distributed Computing

Multiple network-connected machines cooperate. Computation is distributed across application servers, while data is distributed or replicated across storage systems.

- Work can be processed in parallel.
- Data can be partitioned or replicated for scale and availability.
- Network failures, consistency, coordination, and partial failures become important concerns.

```
Users → Load Balancer → App Servers (1..N)
                      → Distributed Storage (Sharded / Replicated DB)
                      → Worker Servers (async processing)
```

---

## 2. Architecture Comparison

### A. Vertical Scaling

```
Many users
    ↓
One powerful server
├── More CPU
├── More RAM
├── Faster storage
└── Application + Database (if colocated)

Scale up by upgrading the same machine.
```

### B. Horizontal Scaling

```
Many users
    ↓
Load Balancer
├── Server 1
├── Server 2
└── Server 3

Servers cooperate over a network.
Shared or distributed storage is added separately.
```

> **Important:** Horizontal scaling does not automatically mean the database is distributed. You can scale application servers horizontally while keeping one central database. That database may later become the next bottleneck.

---

## 3. Advantages and Disadvantages

| Factor | Vertical Scaling (Scale Up) | Horizontal Scaling (Scale Out) |
|---|---|---|
| **Approach** | Upgrade one machine | Add more machines |
| **Implementation** | Relatively simple | More complex |
| **Capacity** | Limited by machine hardware | Can grow by adding machines |
| **Cost** | Powerful hardware can be expensive | More smaller machines may be cost-effective |
| **Performance** | More resources for one machine | More requests processed concurrently |
| **Availability** | One machine = single point of failure | Can tolerate individual server failures |
| **Data management** | Usually simpler | May require replication, partitioning, or coordination |
| **Networking** | Less inter-machine coordination | Network latency and communication overhead |
| **Maintenance** | Upgrades may require downtime | Rolling upgrades may be possible |
| **Best suited for** | Small/medium workloads, simpler systems | Large workloads, high availability, growing traffic |

### When Should You Choose Each?

- **Choose vertical scaling** when the workload is moderate, the application is simple, and upgrading the server is sufficient.
- **Choose horizontal scaling** when traffic is growing, you need greater availability, or a single machine cannot provide enough capacity.

> In real production systems, both approaches are often combined.

---

## 4. How Distributed Computing Handles Computation and Storage

When users increase, there are two major dimensions to address:

```
Increasing users and workload
        ↓
More requests · More processing · More data
        ↓
┌─────────────────────────┐   ┌──────────────────────────────┐
│  Distributed Computation │   │    Distributed Storage        │
├─────────────────────────┤   ├──────────────────────────────┤
│  Multiple app servers   │   │  Data partitioning (sharding) │
│  Parallel processing    │   │  Replication                  │
│  Load balancing         │   │  Distributed databases        │
│  Background workers     │   │  Distributed file storage     │
└─────────────────────────┘   └──────────────────────────────┘
             ↑                               ↑
             └──── Network + Communication ──┘
                   (machines exchange requests,
                    results, and data to cooperate)
```

---

### A. Distributed Computation Example

Suppose an online banking application has 100,000 concurrent users. Instead of one server handling every request, multiple servers process requests simultaneously.

| Server | Example Responsibility |
|---|---|
| Application Server 1 | Process incoming banking requests |
| Application Server 2 | Process incoming banking requests |
| Application Server 3 | Process incoming banking requests |
| Worker Servers | Process asynchronous tasks and notifications |

A load balancer distributes incoming traffic. The application servers can increase processing capacity by adding more instances, assuming other dependencies can keep up.

---

### B. Distributed Storage Example

Suppose a banking application stores 10 TB of customer and transaction data. A single database server might eventually face storage, I/O, or throughput limits.

Possible solutions:

| Strategy | What It Does |
|---|---|
| **Sharding** | Split data across multiple database nodes |
| **Replication** | Maintain copies of data on multiple nodes for availability and read scaling |
| **Distributed storage** | Store large amounts of data across multiple machines |

> Replication and sharding solve different problems. Production systems often use both.

---

## 5. The Important Distinction: Horizontal Scaling vs. Distributed Computing

These concepts are closely related, but they are not identical.

| Concept | Meaning |
|---|---|
| **Horizontal scaling** | Increasing capacity by adding machines or instances |
| **Distributed computing** | Multiple network-connected machines cooperate to perform work |
| **Distributed storage** | Data is stored or managed across multiple machines |
| **Parallel processing** | Multiple computations execute at the same time |
| **Load balancing** | Incoming requests are distributed across available servers |

> **Key takeaway:** Horizontal scaling is a *scaling strategy*. Distributed computing is a *broader architectural approach* that makes cooperation across multiple machines possible.
>
> A horizontally scaled application typically uses distributed computing concepts, but adding application servers does not necessarily distribute the database or storage.

---

## 6. How the Architecture Evolves in a Real Application

```
Clients (Web · Mobile · External APIs)
          ↓
Load Balancer / API Gateway
          ↓
  ┌───────────────────┐
  │  App 1 · App 2 · App N  │   ← Add instances as traffic grows
  └───────────────────┘
          ↓
  ┌──────────────────────────────────────────┐
  │              Database Layer               │
  │  Initially one DB → later replicated      │
  │  or sharded as data volume grows          │
  └──────────────────────────────────────────┘
```

### Typical Progression

1. Start with one application server.
2. Increase CPU and RAM when necessary (vertical scaling).
3. Add a load balancer and multiple application instances (horizontal scaling).
4. Identify bottlenecks in the database, cache, network, or other dependencies.
5. Introduce distributed storage, replication, sharding, queues, and other patterns where needed.
6. Design for failures, consistency, observability, and recovery.

> **Remember:** Adding more machines does not automatically solve every scaling problem. The application must distribute work efficiently, and shared dependencies must also have enough capacity.
