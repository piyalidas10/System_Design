# Shard vs Replica
The easiest way to remember the difference is:
```
Sharding = Split the data
Replication = Copy the data
```

## 1. Sharding (Horizontal Partitioning)

Each database stores different data.
```
                 Application
                      │
              Shard Router / Hash
                      │
     ┌────────────────┼────────────────┐
     │                │                │
     ▼                ▼                ▼
┌───────────┐   ┌───────────┐   ┌───────────┐
│ Shard 1   │   │ Shard 2   │   │ Shard 3   │
├───────────┤   ├───────────┤   ├───────────┤
│Users 1-1M │   │Users1M-2M │   │Users2M-3M │
│Orders     │   │Orders     │   │Orders     │
│Indexes    │   │Indexes    │   │Indexes    │
│CPU/RAM    │   │CPU/RAM    │   │CPU/RAM    │
└───────────┘   └───────────┘   └───────────┘
```

Data Distribution
```
Shard 1
---------
User 1
User 2
User 3

Shard 2
---------
User 4
User 5
User 6

Shard 3
---------
User 7
User 8
User 9
```
Each shard has different rows.

**Characteristics**
- ✔ Different data
- ✔ Increases storage capacity
- ✔ Increases write throughput
- ✔ Each shard has independent CPU, RAM, storage, indexes

## 2. Replication

Every replica contains the same data.
```
                     Application
                           │
                           ▼
                    Primary Database
                  (Read + Write Server)
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   Replica A          Replica B         Replica C
   Read Only          Read Only         Read Only
```

Data
```
Primary
---------
User1
User2
User3
User4

Replica A
---------
User1
User2
User3
User4

Replica B
---------
User1
User2
User3
User4
```
All databases contain identical data.

**Replication Flow**
```
Client
   │
Write
   │
   ▼
Primary
   │
   │ Replicate Changes
   ▼
Replica 1

Replica 2

Replica 3
```

## Side-by-Side Comparison
```
SHARDING                          REPLICATION

User1 ─────────► Shard1           User1 ─────────► Primary
User2 ─────────► Shard1                        │
User3 ─────────► Shard2                        ├────► Replica1
User4 ─────────► Shard3                        ├────► Replica2
                                               └────► Replica3
```

## Real-Life Example

Imagine an e-commerce site with 9 million users.

**Sharding**
```
Shard 1
Asia Users

Shard 2
Europe Users

Shard 3
America Users
```
Each server stores different customers.

**Replication**
```
Primary
All 9 Million Users

Replica 1
All 9 Million Users

Replica 2
All 9 Million Users

Replica 3
All 9 Million Users
```

Every server has the complete dataset.

## When to Use Which?
| Requirement                   | Sharding                                      | Replication             |
| ----------------------------- | --------------------------------------------- | ----------------------- |
| More storage                  | ✅                                             | ❌                       |
| More write capacity           | ✅                                             | ❌                       |
| More read capacity            | ⚠️ Limited                                    | ✅                       |
| High availability             | ⚠️ Partial                                    | ✅                       |
| Fault tolerance               | ⚠️ One shard failure affects part of the data | ✅ Replica can take over |
| Same data on multiple servers | ❌                                             | ✅                       |


## In Large Systems (Netflix, Amazon, Uber)

Most large distributed systems use both together:
```
                         Application
                               │
                        Shard Router
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
   Shard 1                                      Shard 2
        │                                             │
   ┌──────────────┐                           ┌──────────────┐
   │ Primary DB   │                           │ Primary DB   │
   │ (Writes)     │                           │ (Writes)     │
   └──────┬───────┘                           └──────┬───────┘
          │                                          │
   Replication                                Replication
          │                                          │
   ┌──────┴───────┐                          ┌───────┴───────┐
   ▼              ▼                          ▼               ▼
Replica 1     Replica 2                 Replica 1      Replica 2
(Read)         (Read)                   (Read)          (Read)
```
- Sharding distributes different portions of the data across multiple databases to scale storage and writes.
- Replication keeps copies of each shard to improve read performance, availability, and disaster recovery.

Memory trick:
- Shard = Slice (split the dataset).
- Replica = Repeat (duplicate the dataset or a shard).

### Example: Amazon Orders

Suppose Amazon shards its customer database.

**Shard 1**

Contains customers:
```
Customer IDs
1 – 10 Million
```

**Within Shard 1:**
```
Primary
---------
Customers
Orders
Payments
Inventory

Replica 1
---------
Copy of Primary

Replica 2
---------
Copy of Primary
```

**If Customer 12345 places an order:**
```
Customer
    │
Create Order
    │
    ▼
Primary
    │
Save Order
    │
    ├────────► Replica 1
    │
    └────────► Replica 2
```
The order is written only to the Primary. After the write succeeds, the change is replicated to the replicas.

