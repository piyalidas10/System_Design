# From Single Server to Distributed System

> Step-by-step visual architecture evolution — vertical scaling, horizontal scaling, and distributed computing.

As the number of users grows, one machine may no longer have enough CPU, memory, network capacity, or storage. The architecture must evolve to keep up.

---

## 1️⃣ Step 1 — Single Server `Starting Point`

One machine runs the application and the database. Simple to build and deploy — but a single point of failure.

```
              👤 Users
           (All incoming traffic)
                  │
                  ▼
     ┌────────────────────────────┐
     │  🖥️  Single Server         │
     │  Application + Database    │
     │      on one machine        │
     └────────────────────────────┘
```

| ✅ Pros | ❌ Cons |
|---|---|
| Simple to develop and deploy | Server becomes a bottleneck as users grow |
| Suitable for low traffic and prototypes | Single point of failure — everything goes down together |

---

↓ *traffic grows → upgrade the machine* ↓

---

## 2️⃣ Step 2 — Vertical Scaling `Scale Up`

Upgrade the same machine with more CPU cores, RAM, faster storage, or greater network capacity. No distribution needed — yet.

```
              👤 Users
            (Growing traffic)
                  │
                  ▼
     ┌────────────────────────────────────┐
     │  🖥️  Upgraded Server               │
     │  Application + Database            │
     │  Still one machine                 │
     │                                    │
     │  [+ More CPU]  [+ More RAM]        │
     │  [+ Faster SSD]  [+ More Bandwidth]│
     └────────────────────────────────────┘
```

| ✅ Pros | ❌ Cons |
|---|---|
| No distributed complexity | Hardware has a ceiling — eventually maxes out |
| Simpler application code — no coordination needed | Downtime often required to upgrade hardware |
| Less operational overhead | Still a single point of failure |

---

↓ *traffic keeps growing → add more machines* ↓

---

## 3️⃣ Step 3 — Horizontal Scaling `Scale Out`

Add multiple application servers behind a load balancer. The database may still be a single shared node at this stage — it can become the next bottleneck.

```
              👤 Users
         (High and growing traffic)
                  │
                  ▼
     ┌────────────────────────────┐
     │  ⚖️  Load Balancer          │
     │  Distributes requests evenly│
     └──────┬──────────┬──────────┘
            │          │          │
            ▼          ▼          ▼
     ┌───────────┐ ┌───────────┐ ┌───────────┐
     │⚙️ App      │ │⚙️ App      │ │⚙️ App      │
     │  Server 1 │ │  Server 2 │ │  Server 3 │
     │ (Stateless)│ │ (Stateless)│ │ (Stateless)│
     └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
           │              │              │
           └──────────────┼──────────────┘
                          │ all read / write
                          ▼
              ┌─────────────────────┐
              │  🗄️  Database        │
              │  Shared · May become │
              │  the next bottleneck │
              └─────────────────────┘
```

| ✅ Pros | ❌ Cons |
|---|---|
| Handles more concurrent requests | Database can become the new bottleneck |
| Add or remove servers as demand changes | Stateless design required — sessions must be shared |
| Individual server failure does not take down service | More operational complexity: monitoring, health checks |

> **Important:** Horizontal scaling does not automatically mean the database is distributed. You can scale application servers horizontally while keeping one central database. That database may later become the next bottleneck.

---

↓ *data volume grows → distribute storage too* ↓

---

## 4️⃣ Step 4 — Distributed Computing `Full Scale`

Both computation and storage are distributed. A cache layer absorbs read traffic. A message queue decouples async work. The database is partitioned and replicated.

```
  🌐 Web       📱 Mobile      🔌 External API
     └─────────────┼─────────────┘
                   │
                   ▼
     ┌─────────────────────────────────┐
     │  ⚖️  Load Balancer / API Gateway │
     │  Routes, rate-limits, distributes│
     └────┬──────┬──────┬──────┬───────┘
          │      │      │      │
          ▼      ▼      ▼      ▼
     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
     │⚙️ App 1│ │⚙️ App 2│ │⚙️ App 3│ │⚙️ App N│
     └────────┘ └────────┘ └────────┘ └────────┘
          │           │                    │
     reads│      events│              writes│
          ▼            ▼                   ▼
  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐
  │ ⚡ Redis     │  │ 📨 Message   │  │  Database Layer    │
  │   Cache     │  │    Queue     │  │                    │
  │             │  │ (Decouples   │  │  ┌──────────────┐  │
  │ Hot lookups │  │  producers & │  │  │🗃️ DB Shard A  │  │
  │ Session data│  │  consumers)  │  │  │  Users 1–5M  │  │
  │ Frequent    │  └──────┬───────┘  │  └──────────────┘  │
  │ reads       │         │          │  ┌──────────────┐  │
  └─────────────┘         ▼          │  │🗃️ DB Shard B  │  │
                  ┌──────────────┐   │  │  Users 5M+   │  │
                  │ 🔧 Worker    │   │  └──────────────┘  │
                  │   Servers   │   │  ┌──────────────┐  │
                  │ Analytics   │   │  │📋 Read Replica│  │
                  │ Emails      │   │  │ Read scaling  │  │
                  │ Background  │   │  └──────────────┘  │
                  └─────────────┘   └────────────────────┘
```

| ✅ Pros | ❌ Cons |
|---|---|
| Work processed in parallel across many machines | Network failures and partial failures must be managed |
| Data partitioned (sharding) and replicated for scale | Distributed coordination adds significant overhead |
| Cache absorbs read traffic; queue decouples async work | Requires observability, tracing, and failure recovery |
| Can tolerate individual machine or component failures | — |

---

## Quick Comparison

| Factor | 🖥️ Single Server | 🖥️ Vertical Scaling | ⚖️ Horizontal Scaling | 🌐 Distributed |
|---|---|---|---|---|
| **Complexity** | Very Low | Low | Medium | High |
| **Capacity ceiling** | Hardware | Hardware | App ✓, DB ✗ | Can scale further |
| **Availability** | Single PoF | Single PoF | Redundant app layer | Highly available |
| **Data management** | Simple | Simple | Shared DB | Sharding + Replication |
| **Maintenance** | Easy | Hardware downtime | Rolling upgrades possible | Requires automation |
| **Best suited for** | Prototype / MVP | Small–medium apps | Growing traffic | Large-scale production |

---

## Node Legend

| Icon | Node Type |
|---|---|
| ⚙️ | Application Server |
| 🗄️ | Database |
| ⚖️ | Load Balancer |
| ⚡ | Cache (Redis) |
| 📨 | Message Queue |
| 🔧 | Worker Server |
| 🗃️ | DB Shard |
| 📋 | Read Replica |
| 👤 | Users / Clients |
| 🖥️ | Server |
| 🌐 | Web Client |
| 📱 | Mobile Client |
| 🔌 | External API |

---

## Key Concepts

| Concept | Meaning |
|---|---|
| **Horizontal scaling** | Increasing capacity by adding machines or instances |
| **Vertical scaling** | Increasing capacity by upgrading the same machine |
| **Distributed computing** | Multiple network-connected machines cooperate to perform work |
| **Distributed storage** | Data is stored or managed across multiple machines |
| **Parallel processing** | Multiple computations execute at the same time |
| **Load balancing** | Incoming requests are distributed across available servers |
| **Sharding** | Splitting data across multiple database nodes |
| **Replication** | Maintaining copies of data on multiple nodes |

> **Key takeaway:** Horizontal scaling is a *scaling strategy*. Distributed computing is a *broader architectural approach* that makes cooperation across multiple machines possible.
>
> Adding more machines does not automatically solve every scaling problem. The application must distribute work efficiently, and shared dependencies must also have enough capacity.

---

## Typical Evolution Path in Real Systems

```
Step 1  →  🖥️  Start with one server (App + DB on same machine)
Step 2  →  🖥️  Increase CPU/RAM when traffic grows (vertical scaling)
Step 3  →  ⚖️  Add load balancer + multiple app instances (horizontal scaling)
Step 4  →  🔍  Identify the new bottleneck (often the database)
Step 5  →  ⚡  Add cache (Redis), read replicas, then sharding
Step 6  →  📨  Introduce message queues for async work
Step 7  →  🔧  Design for failures: redundancy, health checks, observability
```

> In real production systems, vertical and horizontal scaling are often combined. Most companies start simple and evolve the architecture as actual bottlenecks appear — not in anticipation of every possible scale problem.
