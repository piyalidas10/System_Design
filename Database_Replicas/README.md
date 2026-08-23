# Replicas

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

## Why replicas improve performance

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

## Why use replicas?

Imagine an application with:
```
1,000,000 requests/minute
```
Suppose:
```
90% = READ
10% = WRITE
```

**Without replicas:**
```
                ┌─────────────┐
                │  Database   │
                └──────┬──────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       READ           READ           WRITE

The database has to handle everything.
```

**With replicas:**
```
                         ┌─────────────┐
                         │   PRIMARY   │
                         │    WRITE    │
                         └──────┬──────┘
                                │
                         Replication
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
               ┌─────────┐ ┌─────────┐ ┌─────────┐
               │Replica 1│ │Replica 2│ │Replica 3│
               │  READ   │ │  READ   │ │  READ   │
               └─────────┘ └─────────┘ └─────────┘
```
Now read traffic can be distributed across multiple machines.

## How replication works

**Suppose the application creates a new order:**
```
INSERT INTO orders
VALUES (101, 'Piyali', 5000);
```

**The write goes to the primary:**
```
Application
     │
     │ INSERT
     ▼
 Primary DB
     │
     │ Replication
     ├──────────────► Replica 1
     │
     ├──────────────► Replica 2
     │
     └──────────────► Replica 3
```
The replicas receive the changes and update their local copies.

## Read Replicas

A read replica is primarily used for executing read queries.

For example:
```
                Application
                     │
          ┌──────────┴──────────┐
          │                     │
        WRITE                  READ
          │                     │
          ▼                     ▼
     ┌──────────┐       ┌──────────────┐
     │ Primary  │       │ Load Balancer│
     └────┬─────┘       └──────┬───────┘
          │                    │
          │              ┌─────┼─────┐
          │              ▼     ▼     ▼
          │             R1    R2    R3
          │
          └──── Replication ────────►
```
This is called read scaling.

## Replication is often asynchronous.

**For example:**
```
Time 10:00:00

Primary:
User balance = ₹10,000

        ↓ replication

Replica:
User balance = ₹10,000
```

**User makes a payment:**
```
Primary:
User balance = ₹7,000
```

**But the replica hasn't received the update yet:**
```
Replica:
User balance = ₹10,000
```
If the application immediately reads from the replica, it may see stale data.

This is called:

**Replication Lag**
```
Primary
₹7,000
   │
   │  200 ms lag
   ▼
Replica
₹10,000
```

## Primary vs Replica

| Feature        | Primary         | Replica           |
| -------------- | --------------- | ----------------- |
| INSERT         | ✅               | Usually ❌         |
| UPDATE         | ✅               | Usually ❌         |
| DELETE         | ✅               | Usually ❌         |
| SELECT         | ✅               | ✅                 |
| Handles writes | ✅               | Usually ❌         |
| Handles reads  | ✅               | ✅                 |
| Number         | Usually 1       | Multiple          |
| Main purpose   | Source of truth | Read scaling / HA |

## Replication vs Sharding

These two concepts are often confused.

### Replication

Copies the same data.
```
Primary
 ├── Replica 1
 ├── Replica 2
 └── Replica 3
```
All contain roughly the same data.

Purpose:
```
Read scalability
High availability
Disaster recovery
```

### Sharding

**Splits the data.**
```
Shard 1 → Users 1–1M
Shard 2 → Users 1M–2M
Shard 3 → Users 2M–3M
```

**Purpose:**
```
Write scalability
Storage scalability
Horizontal scaling
Together
```

**Large systems often use both:**
```
                 Application
                      │
                 Shard Router
             ┌────────┼────────┐
             ▼        ▼        ▼
           Shard 1  Shard 2  Shard 3
             │        │        │
           ┌─┴─┐    ┌─┴─┐    ┌─┴─┐
           ▼   ▼    ▼   ▼    ▼   ▼
          P    R    P    R    P    R
```

Where:
- Sharding → splits the data
- Replication → copies each shard

This combination is common in large-scale distributed database architectures.