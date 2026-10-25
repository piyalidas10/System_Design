# Distributed Systems: From Vertical Scaling to Horizontal Scaling

> **Core idea:** Vertical scaling makes one machine more powerful.
> Horizontal scaling adds more machines. Distributed computing is the
> broader approach of coordinating network-connected machines to perform
> computation, manage data, or both.

As user traffic and data volume grow, a single machine may run short of
CPU, memory, storage capacity, I/O throughput, or network capacity.
Scaling addresses these constraints---but adding machines also
introduces communication, coordination, consistency, and
failure-handling challenges.

## Contents

1.  [Step-by-step evolution](#1-step-by-step-evolution)
2.  [Architecture comparison](#2-architecture-comparison)
3.  [Advantages and disadvantages](#3-advantages-and-disadvantages)
4.  [Distributed computation and
    storage](#4-distributed-computation-and-storage)
5.  [Production example: online
    banking](#5-production-example-online-banking)
6.  [Common distributed-systems
    challenges](#6-common-distributed-systems-challenges)
7.  [Interview-ready questions and
    answers](#7-interview-ready-questions-and-answers)
8.  [Practical decision framework](#8-practical-decision-framework)
9.  [Key takeaways](#9-key-takeaways)

------------------------------------------------------------------------

## 1. Step-by-Step Evolution

### Step 1 --- Start with one server

A single machine runs the application and may also host the database.

``` text
                 ┌───────────────────┐
Users ──────────►│ Single Server      │
                 │ Application + DB   │
                 └───────────────────┘
```

**Advantages** - Simple to build, deploy, debug, and operate. - Low
infrastructure overhead. - Suitable for small workloads.

**Disadvantages** - CPU, RAM, disk I/O, or network capacity can become a
bottleneck. - The machine may be a single point of failure. - Scaling
capacity may require downtime or migration.

**Production example:** A small online store runs its API and database
on one virtual machine.

### Step 2 --- Vertical scaling (scale up)

Upgrade the existing machine with more CPU, RAM, faster storage, or
greater network capacity.

``` text
                 ┌──────────────────────────────┐
Users ──────────►│ One more powerful server      │
                 │ More CPU · More RAM            │
                 │ Faster storage · Better I/O    │
                 │ Application + DB (if colocated)│
                 └──────────────────────────────┘
```

**Advantages** - Usually simpler than distributing work across
machines. - May improve performance without major application
redesign. - Can be effective for databases and workloads that benefit
from a larger machine.

**Disadvantages** - Hardware and service-tier limits still apply. -
Larger machines can become disproportionately expensive. - A single
machine can remain a single point of failure. - More resources do not
fix inefficient queries or algorithms.

**Production example:** Increase a PostgreSQL instance's memory and
storage IOPS after monitoring shows memory pressure and slow disk reads.

### Step 3 --- Horizontal scaling (scale out)

Add multiple application instances and distribute incoming requests
through a load balancer.

``` text
                         ┌────────────────┐
Users ──────────────────►│ Load Balancer  │
                         └───────┬────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
           ┌──────────┐    ┌──────────┐    ┌──────────┐
           │ App 1    │    │ App 2    │    │ App 3    │
           └──────────┘    └──────────┘    └──────────┘
```

**Advantages** - Can increase aggregate request-processing capacity. -
Capacity can often be increased or decreased as demand changes. - Can
improve availability when instances and dependencies are designed
redundantly. - Supports rolling deployments and fault isolation.

**Disadvantages** - Requires routing, health checks, monitoring, and
deployment coordination. - Shared dependencies can become bottlenecks. -
Session state, caches, rate limits, and background jobs need appropriate
designs. - More instances do not guarantee linear performance
improvement.

**Production example:** A banking API runs several stateless instances
behind a load balancer. Instances can be added when traffic grows,
provided the database and other dependencies can support the extra load.

### Step 4 --- Distributed computing and storage

Multiple network-connected machines cooperate. Computation can run
across application servers and workers, while data may be partitioned or
replicated across storage nodes.

``` text
Clients
   │
   ▼
┌─────────────────┐
│ Load Balancer   │
└────────┬────────┘
         │
    ┌────┼───────────────┐
    ▼    ▼               ▼
  App 1 App 2          App N
    │    │               │
    ├────┴──────┬────────┤
    │           │        │
    ▼           ▼        ▼
 Database    Cache     Queue
 cluster                 │
                         ▼
                    Worker pool
```

This is a conceptual view, not a requirement to deploy every component.

**Advantages** - Enables parallel processing and distributed
workloads. - Data can be partitioned to spread storage and query load. -
Replication can improve availability and read capacity. - Different
components can scale independently.

**Disadvantages** - Network latency and partial failures become normal
design concerns. - Replication and partitioning introduce consistency
and coordination trade-offs. - Retries can cause duplicate work unless
operations are designed safely. - Operations, observability, security,
and incident response become more complex.

**Production example:** A payment platform uses multiple API instances,
a transactional database, a durable event queue, and workers for
notifications and reconciliation.

------------------------------------------------------------------------

## 2. Architecture Comparison

### A. Vertical scaling

``` text
Many users
    │
    ▼
┌─────────────────────────────┐
│ One powerful machine        │
│                             │
│  • More CPU                 │
│  • More RAM                 │
│  • Faster storage            │
│  • Application + DB*         │
└─────────────────────────────┘

Scale up by upgrading the same machine.
*The database may instead be on a separate server.
```

### B. Horizontal application scaling

``` text
Many users
    │
    ▼
┌─────────────────┐
│ Load Balancer   │
└────────┬────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
  App 1 App 2 App 3
    └────┼────┘
         ▼
   One central database
```

**Important:** Horizontal application scaling does **not** automatically
mean the database is distributed. Multiple application instances can use
one central database. That database may become the next bottleneck.

### C. Horizontally scaled application with distributed data

``` text
Clients
   │
   ▼
Load Balancer / API Gateway
   │
   ├────────────┬────────────┐
   ▼            ▼            ▼
 App 1         App 2        App N
   └────────────┼────────────┘
                ▼
       ┌────────────────────┐
       │ Data access layer  │
       └─────────┬──────────┘
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
  DB shard A             DB shard B
  replicas as            replicas as
  required               required
```

The data design depends on the workload, consistency requirements,
database technology, and failure model.

------------------------------------------------------------------------

## 3. Advantages and Disadvantages

  -----------------------------------------------------------------------
  Factor                  Vertical scaling (scale Horizontal scaling
                          up)                     (scale out)
  ----------------------- ----------------------- -----------------------
  Approach                Upgrade one machine     Add machines or
                                                  instances

  Complexity              Usually lower           Usually higher

  Capacity                Limited by              Can grow by adding
                          machine/service limits  capacity, within
                                                  architectural limits

  Cost                    Larger machines may be  Smaller instances may
                          expensive               be cost-effective, but
                                                  coordination adds costs

  Performance             Adds resources to one   Can increase concurrent
                          machine                 processing and
                                                  aggregate throughput

  Availability            One machine may be a    Can tolerate instance
                          single point of failure failures if redundancy
                                                  and failover are
                                                  designed

  Data management         Often simpler           May require
                                                  replication,
                                                  partitioning, or
                                                  coordination

  Networking              Less inter-machine      Network latency and
                          communication           communication overhead
                                                  matter

  Maintenance             Some upgrades may       Rolling upgrades may be
                          require downtime        possible

  Best fit                Moderate workloads and  Growing workloads,
                          simpler systems         elastic capacity, or
                                                  availability needs
  -----------------------------------------------------------------------

### When should you choose each?

**Choose vertical scaling when:** - The workload is moderate and a
larger machine meets requirements. - Simplicity and low operational
overhead are priorities. - The application or database benefits from
more resources on one host.

**Choose horizontal scaling when:** - Traffic or throughput exceeds
practical single-machine capacity. - The service needs elastic
capacity. - Availability requirements justify redundant instances. -
Work can be distributed without excessive coordination.

Production systems often combine both strategies.

------------------------------------------------------------------------

## 4. Distributed Computation and Storage

As users and workload grow, consider two related dimensions.

``` text
Increasing users and workload
             │
             ▼
  More requests · More processing · More data
             │
       ┌─────┴──────────┐
       ▼                ▼
Distributed          Distributed
computation          storage
       │                │
       ├─ App servers   ├─ Sharding
       ├─ Parallel work ├─ Replication
       ├─ Load balance  ├─ Distributed DBs
       └─ Worker pools  └─ Distributed files
             │                │
             └───────┬────────┘
                     ▼
         Network, communication,
           coordination, failures
```

### A. Distributed computation

Suppose a banking application has 100,000 concurrent users. Instead of
routing all requests to one application process, multiple instances can
process requests concurrently.

  Component               Example responsibility
  ----------------------- --------------------------------------
  Application servers     Process API requests
  Background workers      Process suitable asynchronous tasks
  Load balancer           Route traffic to healthy instances
  Queue or event broker   Buffer and deliver asynchronous work

A load balancer distributes requests, but it cannot make a slow database
or external dependency faster. Confirm that downstream components can
handle the additional traffic.

### B. Distributed storage

Suppose a platform stores 10 TB of customer and transaction data. A
single database may eventually reach limits in storage capacity, I/O, or
throughput.

  -----------------------------------------------------------------------
  Strategy                What it does            Main trade-off
  ----------------------- ----------------------- -----------------------
  **Sharding**            Splits data across      Queries across shards
                          nodes or partitions     and rebalancing can be
                                                  complex

  **Replication**         Maintains copies of     Replication lag,
                          data on multiple nodes  failover, and
                                                  consistency need
                                                  attention

  **Distributed           Stores data across      Requires availability,
  file/object storage**   multiple machines or    durability, and access
                          storage devices         policies
  -----------------------------------------------------------------------

Sharding and replication solve different problems, and production
systems may use both. Replication does not automatically increase write
throughput; the result depends on the database's replication model and
workload.

### Key definitions

  -----------------------------------------------------------------------
  Concept                             Meaning
  ----------------------------------- -----------------------------------
  Horizontal scaling                  Increasing capacity by adding
                                      machines or instances

  Distributed computing               Networked machines cooperate to
                                      perform work

  Distributed storage                 Data is stored or managed across
                                      multiple machines

  Parallel processing                 Multiple computations execute at
                                      the same time

  Load balancing                      Incoming requests are distributed
                                      across available instances

  Sharding                            Data is split into partitions

  Replication                         Copies of data are maintained on
                                      multiple nodes
  -----------------------------------------------------------------------

**Interview distinction:** Horizontal scaling is a scaling strategy.
Distributed computing is a broader architectural approach. They are
related, but not interchangeable.

------------------------------------------------------------------------

## 5. Production Example: Online Banking

Consider a banking application supporting login, balance inquiries,
payments, and notifications.

``` text
Web / Mobile Clients
         │
         ▼
CDN / WAF / API Gateway
         │
         ▼
Load Balancer
         │
    ┌────┼─────────────┐
    ▼    ▼             ▼
 Banking API 1    API 2    API N
    │    │             │
    └────┼─────────────┘
         │
   ┌─────┴───────────────┐
   ▼                     ▼
Transactional DB      Queue / Events
(accounts, balances,       │
 payments)                 ▼
                       Worker pool
                       (notifications,
                        reconciliation)
```

This is illustrative. A real system may separate gateway,
load-balancing, and service-mesh responsibilities, and may use a
different data architecture.

### Scaling scenarios

  -----------------------------------------------------------------------
  Symptom                 Potential response      What to verify
  ----------------------- ----------------------- -----------------------
  Application CPU is      Add instances or        CPU profile, request
  saturated               optimize code           mix, downstream
                                                  capacity

  Database reads are slow Tune queries, add       Query plans, cache
                          indexes, consider       correctness,
                          caching or read         replication lag
                          replicas                

  Database writes are     Optimize transactions   Lock contention,
  saturated               and writes; consider    transaction duration,
                          partitioning when       write patterns
                          justified               

  Notifications delay API Move suitable work to   Delivery guarantees,
  responses               durable asynchronous    retries, idempotency
                          processing              

  One application         Health checks and       Remaining capacity and
  instance fails          traffic failover        dependency health

  One availability zone   Deploy redundant        Data replication,
  fails                   capacity across zones   failover behavior,
                                                  recovery objectives
  -----------------------------------------------------------------------

### Financial correctness matters

Payment operations require stronger guarantees than ordinary
notification jobs.

-   **Idempotency keys** help ensure retries of the same logical payment
    do not create duplicate transfers.
-   **Database transactions** preserve invariants within the
    transactional boundary.
-   **Concurrency control** protects against conflicting updates.
-   **Outbox patterns and durable messaging** can help publish events
    reliably after database commits.
-   **Timeouts and bounded retries** reduce the risk of cascading
    failures.
-   **Reconciliation** detects and resolves discrepancies between
    systems.

Do not assume a network timeout means a payment failed: the server may
have committed the transaction but the response may have been lost.
Design a safe way to query or retry the same logical operation.

------------------------------------------------------------------------

## 6. Common Distributed-Systems Challenges

### 6.1 Partial failures

In a distributed system, one component can fail while others remain
healthy. A request may time out even though a downstream operation
completed.

**Useful practices:** timeouts, bounded retries with backoff, circuit
breakers where appropriate, health checks, and recovery testing.

### 6.2 Data consistency

Replicas may not reflect a recent write immediately. A read replica can
return stale data depending on the database's replication model.

**Useful practices:** choose consistency guarantees according to the
operation; use the authoritative transactional path for operations that
require strong correctness.

### 6.3 Duplicate processing

Queues and network retries can cause a task to be delivered or attempted
more than once.

**Useful practices:** idempotent handlers, unique operation identifiers,
deduplication, and durable processing records.

### 6.4 Bottlenecks move

After application servers scale out, the bottleneck may move to the
database, cache, connection pool, queue, or third-party API.

**Useful practices:** measure end-to-end latency, throughput, error
rates, saturation, and queue depth; test under realistic load.

### 6.5 Coordination costs

Machines must communicate to share state, agree on certain outcomes, or
coordinate changes. This can add latency and complexity.

**Useful practices:** minimize unnecessary cross-service calls, define
ownership boundaries, and avoid distributing state unless the benefits
justify the cost.

------------------------------------------------------------------------

## 7. Interview-Ready Questions and Answers

### Q1. What is the difference between vertical and horizontal scaling?

**Answer:** Vertical scaling increases the resources of an existing
machine, such as CPU, RAM, or storage performance. Horizontal scaling
adds machines or instances to distribute workload. Vertical scaling is
generally simpler but constrained by machine limits; horizontal scaling
can provide greater aggregate capacity but introduces routing,
coordination, and failure-handling complexity.

### Q2. Why do we need distributed computing?

**Answer:** When one machine cannot meet the required processing
capacity, storage, throughput, or availability, multiple
network-connected machines can cooperate. This enables parallel
processing, partitioned data, replication, and resilient services.
However, network latency and partial failures must be handled
explicitly.

### Q3. Does horizontal scaling require a distributed database?

**Answer:** No. Multiple stateless application instances can share a
single central database. This scales the application tier, but the
database may become a bottleneck. First measure and optimize it; then
consider caching, read replicas, partitioning, or sharding based on the
actual workload.

### Q4. What is the difference between sharding and replication?

**Answer:** Sharding splits data into partitions distributed across
nodes. Replication maintains copies of data on multiple nodes. Sharding
can distribute storage and workload; replication can improve
availability and read capacity. Replication does not automatically
improve write throughput, and both approaches require careful handling
of consistency and failover.

### Q5. Does horizontal scaling automatically improve availability?

**Answer:** No. Multiple instances help only if traffic can be routed
around failures and remaining capacity is sufficient. A shared database,
single gateway, or single availability zone can still be a point of
failure. High availability requires redundancy, tested failover, and
recovery mechanisms.

### Q6. When would you choose vertical scaling?

**Answer:** I would start with vertical scaling when the workload is
manageable on one machine, simplicity is valuable, and a larger instance
meets performance and availability requirements. I would consider
horizontal scaling when demand exceeds practical single-machine limits
or when redundancy and elasticity justify the added complexity. In
production, I would often combine both.

### Q7. Does adding more application servers always improve performance?

**Answer:** No. It can increase concurrency and throughput when
application compute is the bottleneck. If all instances contend for the
same database, connection pool, lock, or external API quota, additional
instances may not help and can make the bottleneck worse. I would
measure first and validate with load tests.

------------------------------------------------------------------------

## 8. Practical Decision Framework

Use this sequence when designing a system or answering a system-design
interview question.

``` text
1. Measure the bottleneck
   CPU · RAM · latency · database I/O · network · queue depth
                     │
                     ▼
2. Optimize and scale up where appropriate
   Fix inefficient queries, indexes, algorithms, and resource limits
                     │
                     ▼
3. Scale out the application if needed
   Stateless instances · load balancing · health checks
                     │
                     ▼
4. Address shared dependencies
   Database · cache · queues · external services
                     │
                     ▼
5. Add distributed data patterns when justified
   Replication · partitioning · sharding
                     │
                     ▼
6. Validate resilience and correctness
   Load tests · failure tests · consistency · recovery · monitoring
```

### Interview checklist

Before proposing an architecture, clarify:

1.  **Scale:** How many users, requests per second, and how much data?
2.  **Workload:** Read-heavy, write-heavy, CPU-intensive, or
    I/O-intensive?
3.  **Latency:** What are the response-time targets?
4.  **Availability:** What downtime and data loss are acceptable?
5.  **Consistency:** Can the application tolerate stale reads?
6.  **Growth and cost:** How quickly will demand grow, and what is the
    operational budget?

These constraints help determine whether vertical scaling, horizontal
scaling, or a combination is appropriate.

------------------------------------------------------------------------

## 9. Key Takeaways

1.  **Vertical scaling** makes one machine more powerful; **horizontal
    scaling** adds machines or instances.
2.  **Distributed computing** enables networked machines to cooperate;
    distributed storage is a related but distinct concern.
3.  Horizontal application scaling does not automatically distribute the
    database.
4.  Sharding distributes data; replication maintains copies. They solve
    different problems.
5.  More machines do not guarantee linear performance or higher
    availability.
6.  Distributed systems introduce coordination, consistency,
    network-failure, and operational challenges.
7.  Scale the actual bottleneck, preserve correctness, and test failure
    scenarios before calling a system production-ready.

> **One-sentence interview answer:** "I would begin by measuring the
> bottleneck, scale up when a larger machine is sufficient, scale out
> stateless application instances when workload requires it, and
> distribute storage only when data capacity, throughput, or
> availability requirements justify the additional complexity."

------------------------------------------------------------------------

**Suggested practical lab:** Run a FastAPI service with one instance,
generate load, add a second instance behind a load balancer, and observe
throughput and latency. Then connect both instances to one database to
demonstrate why the database can become the next bottleneck.
