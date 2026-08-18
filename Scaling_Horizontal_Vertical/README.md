# Scaling

## What Is Scaling?

1. Scaling means increasing a system's ability to handle more users, requests, data, traffic, or background work.
2. A system usually needs scaling when CPU, memory, disk, network bandwidth, database capacity, or request latency becomes a bottleneck.
3. Scaling is not only about adding servers. It also includes better architecture, caching, load balancing, database optimization, queues, partitioning, and reducing unnecessary work.
4. The two basic scaling strategies are vertical scaling and horizontal scaling.
5. Vertical scaling means increasing the power of an existing machine.
6. Horizontal scaling means adding more machines and distributing traffic or data across them.

## Why Scaling Matters in System Design
1. Performance: The system should respond quickly even as traffic increases.
2. Availability: The system should keep working even if one server fails.
3. Reliability: The system should handle load spikes without collapsing.
4. Cost Control: The system should add capacity efficiently instead of wasting resources.
5. User Experience: Slow pages, failed requests, and timeouts directly hurt users.
6. Business Growth: A system that cannot scale becomes a business bottleneck.
7. Interview Relevance: Scaling trade-offs are one of the most common system design discussion areas.

## Vertical Scaling

### Definition
- Meaning — Increase the capacity of a single machine by adding more CPU, RAM, storage, IOPS, or network bandwidth.
- Common phrase — Scale up.
- Example — Move from a 4-core 16 GB RAM server to a 32-core 128 GB RAM server.

### Where It Is Used
- Application server — Increase CPU and memory to handle more requests on the same instance.
- Database server — Increase RAM, CPU, storage speed, or IOPS to handle more queries.
- Cache server — Increase memory to store more cached data.
- Analytics workload — Use a larger machine for heavy computation.

### Pros of Vertical Scaling
- Simple to understand and implement.
- Usually requires fewer architectural changes.
- No need to split traffic across many servers in the beginning.
- Good for early-stage systems where traffic is still moderate.
- Useful for databases because a bigger machine can immediately improve query performance.
- Lower operational complexity compared with distributed systems.
- Fewer problems with distributed coordination, data partitioning, replication, and consistency.
- Can be faster to apply during an urgent capacity issue if a larger instance is available.

### Cons of Vertical Scaling
- Hard physical or cloud-provider limits exist. A single machine can only become so powerful.
- Cost grows sharply at the high end. Very large machines are often disproportionately expensive.
- Still creates a single point of failure if there is only one machine.
- Upgrades may require downtime, restart, migration, or failover.
- Does not naturally improve availability.
- A single machine can still be overwhelmed by sudden traffic spikes.
- Hardware failure affects the whole workload if redundancy is not added.
- Eventually, vertical scaling hits a ceiling and the system must move toward horizontal scaling or workload reduction.

## Horizontal Scaling
### Definition
- Meaning — Increase capacity by adding more machines or instances and distributing work across them.
- Common phrase — Scale out.
- Example — Run 10 application servers behind a load balancer instead of one large application server.

### Where It Is Used
- Application servers — Multiple stateless servers handle requests behind a load balancer.
- Databases — Read replicas, sharding, partitioning, or distributed databases spread query and data load.
- Caches — Distributed cache clusters store data across nodes.
- Workers — Multiple background workers consume jobs from a queue.
- Storage — Distributed object storage spreads data across many machines.

### Pros of Horizontal Scaling
- Can support much larger scale than a single machine.
- Improves availability when traffic can move away from failed instances.
- Capacity can be added incrementally by adding more nodes.
- Works well with stateless application servers.
- Supports auto scaling based on traffic, CPU, memory, queue length, or custom metrics.
- Can use commodity machines instead of one extremely expensive machine.
- Better fault isolation if the system is designed correctly.
- Allows regional distribution for lower latency and disaster recovery.
- Works naturally with queues and worker pools because jobs can be processed in parallel.

### Cons of Horizontal Scaling
- Adds distributed-system complexity.
- Requires load balancing, service discovery, health checks, monitoring, and deployment automation.
- State management becomes harder because requests may go to different servers.
Session handling requires stateless tokens, shared session storage, sticky sessions, or another coordination mechanism.
- Databases are harder to horizontally scale than stateless application servers.
- Data consistency becomes more difficult with replication and sharding.
- Debugging is harder because requests may pass through many machines and services.
- Network failures, partial failures, retries, duplicate requests, and race conditions become common design concerns.
- Operational cost can increase if many underutilized instances are running.

## Vertical Scaling vs Horizontal Scaling
| Aspect               | Vertical Scaling (Scale Up)                            | Horizontal Scaling (Scale Out)             |
| -------------------- | ------------------------------------------------------ | ------------------------------------------ |
| **What?**            | Make one server stronger                               | Add more servers                           |
| **Example**          | 8 CPU → 32 CPU, 32 GB → 128 GB RAM                     | 2 servers → 10 servers                     |
| **Architecture**     | Simpler                                                | Distributed                                |
| **Load Balancer**    | Usually not required                                   | Usually required                           |
| **Availability**     | Limited — one machine can be a single point of failure | Better — traffic can move to healthy nodes |
| **Maximum scale**    | Limited by hardware                                    | Much higher                                |
| **Failure handling** | Server failure can take down workload                  | Individual node failure can be tolerated   |
| **Complexity**       | Low                                                    | High                                       |
| **Data consistency** | Easier                                                 | More challenging                           |
| **Cost**             | Expensive at the high end                              | Often more economical at large scale       |
| **Typical use**      | Small/medium workloads, databases                      | Large-scale web applications               |

Vertical scaling:

             ┌─────────────────────┐
Users ──────►│   Powerful Server   │
             │  32 CPU / 128 GB    │
             └─────────────────────┘


                  SCALE UP
              ↑ More CPU/RAM

Horizontal scaling:

                    ┌──────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        ┌─────────┐   ┌─────────┐   ┌─────────┐
        │ Server 1│   │ Server 2│   │ Server 3│
        └─────────┘   └─────────┘   └─────────┘


                    SCALE OUT
                 → Add more nodes


## When to Use Vertical Scaling — Scale Up

Use vertical scaling when:
1. The system is still simple and traffic is moderate.
2. The immediate bottleneck is CPU, RAM, disk IOPS, network bandwidth, or storage on a single machine.
3. You're building an early-stage product, where engineering simplicity is more valuable than distributed-system complexity.
4. You're running a monolith that doesn't yet justify multiple application nodes.
5. You're scaling a database where more RAM, CPU, or faster SSD/storage can provide significant gains.
6. You need a quick performance improvement without redesigning the architecture.
7. Your workload has a relatively predictable traffic pattern.
8. Downtime tolerance and single-machine failure risk are acceptable.
9. Your cloud/provider still offers a sufficiently large machine within your budget.

Important: Vertical scaling should generally be viewed as a pragmatic optimization, not an infinite scaling strategy.

## When to Use Horizontal Scaling — Scale Out

Use horizontal scaling when:
1. Traffic exceeds what a single machine can safely handle.
2. High availability is a requirement.
3. You need to tolerate individual server failures.
4. Traffic is spiky, making autoscaling useful.
5. You have stateless application servers that can sit behind a load balancer.
6. Background jobs can be distributed among multiple independent workers.
7. You need to serve users from multiple geographic regions.
8. Read traffic can be distributed across database replicas.
9. Data volume becomes too large for one database, requiring partitioning or sharding.
10. You need zero/low-downtime deployments by gradually replacing or draining instances.

## Key Interview Tips

> [!CAUTION]
> ⚠️ Do not scale blindly. First identify the real bottleneck. Adding more app servers will not fix a slow database.

> [!TIP]
> ⭐ Interviewers often ask vertical vs horizontal scaling. Answer with simplicity, limits, availability, cost, and distributed-system complexity.

> [!NOTE]
> 💡For application servers, the clean path is: make them stateless → put them behind a load balancer → add health checks → auto scale.

> [!CAUTION]
> ⚠️ Sticky sessions are usually a shortcut, not a clean long-term scaling strategy. Prefer stateless servers or shared session storage.

> [!TIP]
> ⭐ Must mention that scaling the wrong layer is useless. Always talk about bottleneck measurement: CPU, memory, database, network, disk, latency, and queue length.

> [!NOTE]
> 💡 Use queues when work is slow, bursty, retryable, or not required immediately in the user-facing request.
