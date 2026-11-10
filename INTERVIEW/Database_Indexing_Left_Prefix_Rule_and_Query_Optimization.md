# Database Indexing, Left-Prefix Rule & Slow Query Optimization Guide

## Problem Statement

> **The Scenario:**
> You created a composite index on your database table:
> ```sql
> CREATE INDEX idx_orders ON orders (customer_id, status, created_at);
> ```
> Then, you run a query filtering orders by status:
> ```sql
> SELECT * FROM orders WHERE status = 'PENDING';
> ```
> **The Issue:** The query is still slow. When you check the query execution plan with `EXPLAIN ANALYZE`, PostgreSQL **completely ignores your index** and performs a full **Sequential Scan (`Seq Scan`)**.

Why does this happen, and how do we resolve it?

---

## 1. What is a Database Index? (Explain Like I'm a Fresher)

Imagine you are reading a textbook with **10,000 pages** looking for the topic *"Database Indexing"*.

```
WITHOUT AN INDEX (Sequential Scan / Table Scan):
Page 1 -> Page 2 -> Page 3 -> ... -> Page 4,500 (Found it!)
Time taken: Very High (reads every single page from disk).

WITH AN INDEX (Index Scan):
Check index at the back of the book:
- Angular ............. Page 120
- Database Indexing ... Page 450
- Docker .............. Page 620
- Kubernetes .......... Page 850
Directly jump to Page 450!
Time taken: Instantaneous (O(log N) tree traversal).
```

### Base Table Setup

```sql
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Sample records:

| `order_id` | `customer_id` | `status` | `created_at` |
| :---: | :---: | :---: | :---: |
| 1 | 101 | PENDING | 2026-11-01 |
| 2 | 102 | COMPLETED | 2026-11-02 |
| 3 | 101 | PENDING | 2026-11-03 |
| 4 | 103 | CANCELLED | 2026-11-04 |
| 5 | 102 | PENDING | 2026-11-05 |
| 6 | 104 | COMPLETED | 2026-11-06 |

---

## 2. Composite B-Tree Indexes & The Left-Prefix Rule

When you create a composite index with multiple columns:

```sql
CREATE INDEX idx_orders ON orders (customer_id, status, created_at);
```

### How the B-Tree is Physically Sorted

A multi-column B-Tree is sorted **hierarchically from left to right**:
1. First, sorted by **`customer_id`**.
2. If `customer_id` values are identical, sorted by **`status`**.
3. If both `customer_id` and `status` are identical, sorted by **`created_at`**.

```
+-------------------------------------------------------------+
|               COMPOSITE B-TREE INDEX ORDER                  |
+-------------------+--------------------+--------------------+
| customer_id (1st) |   status (2nd)     |  created_at (3rd)  |
+-------------------+--------------------+--------------------+
| 101               | PENDING            | 2026-11-01         |
| 101               | PENDING            | 2026-11-03         |
| 102               | COMPLETED          | 2026-11-02         |
| 102               | PENDING            | 2026-11-05         |
| 103               | CANCELLED          | 2026-11-04         |
| 104               | COMPLETED          | 2026-11-06         |
+-------------------+--------------------+--------------------+
```

### The Phonebook Analogy

A phonebook is sorted by `(LastName, FirstName)`:
- Finding everyone with `LastName = 'Smith'` &rarr; **Easy** (open the book directly to 'S').
- Finding everyone with `LastName = 'Smith' AND FirstName = 'John'` &rarr; **Very Easy**.
- Finding everyone with `FirstName = 'John'` (without knowing their last name) &rarr; **Impossible to index lookup**; you must scan through all entries from A to Z!

### The Left-Prefix Rule in Practice

| Query Pattern | Index Usability | Why? |
| :--- | :---: | :--- |
| `WHERE customer_id = 101` | **Fast Index Scan** | Matches 1st leading column (`customer_id`). |
| `WHERE customer_id = 101 AND status = 'PENDING'` | **Fast Index Scan** | Matches 1st and 2nd leading columns in order. |
| `WHERE customer_id = 101 AND status = 'PENDING' AND created_at >= '2026-11-01'` | **Fast Index Scan** | Matches all 3 columns in exact hierarchical order. |
| `WHERE status = 'PENDING'` | **Ignored / Inefficient** | Skips column 1 (`customer_id`). Database cannot seek to a contiguous index range. |
| `WHERE created_at >= '2026-11-01'` | **Ignored / Inefficient** | Skips columns 1 and 2. |

---

## 3. Four Other Reasons PostgreSQL Might Ignore an Index

Even if your query matches the indexed columns, PostgreSQL's Cost-Based Optimizer (CBO) may still choose a **Sequential Scan**:

```
                                  QUERY PLANNER DECISION
                                            |
         +----------------------------------+----------------------------------+
         |                                                                     |
         v                                                                     v
  Sequential Scan                                                          Index Scan
- Reads entire data pages sequentially                               - Reads B-Tree index pages
- Single sequential I/O read stream                                  - Traverses tree to find pointers
- Cheaper when fetching >15-20% of table                             - Random I/O to fetch table heap pages
- Faster for small tables (few pages)                                - Cheaper for highly selective queries (<5%)
```

### 1. Low Selectivity / High Cardinality Match
- If the `status = 'PENDING'` condition matches a large percentage of table rows (e.g., 70,000 out of 100,000 orders), an index lookup introduces substantial **random I/O** (index page lookup &rarr; heap table page lookup per row).
- Sequential scan reads contiguous disk blocks at full disk throughput and is significantly faster in this case.

### 2. Table is Too Small
- If the table has only a few hundred or thousand rows, all data blocks fit into one or two 8KB disk pages.
- Traversing a B-Tree structure adds extra CPU and buffer overhead compared to simply reading the entire table page into RAM.

### 3. Non-SARGable Queries (Functions or Type Coercion on Columns)
- **Function Wrapping:**
  ```sql
  -- BAD: Index on created_at cannot be used
  SELECT * FROM orders WHERE DATE(created_at) = '2026-11-10';

  -- GOOD (SARGable): Range scan leverages the index directly
  SELECT * FROM orders 
  WHERE created_at >= '2026-11-10 00:00:00' 
    AND created_at <  '2026-11-11 00:00:00';
  ```
- **Implicit Type Mismatch:**
  If `customer_id` is defined as `VARCHAR` and queried with an integer `WHERE customer_id = 12345`, PostgreSQL converts the column value `customer_id::integer = 12345`, disabling standard index lookup.

### 4. Outdated Optimizer Statistics
- PostgreSQL relies on internal table statistics in `pg_statistic` to calculate query costs.
- If large bulk inserts or deletions occur, statistics may become stale.
- **Fix:** Run `ANALYZE orders;` or `VACUUM ANALYZE orders;`.

---

## 4. How to Fix the Problem: 3 Battle-Tested Solutions

```
+---------------------------------------------------------------------------------------------------------+
|                                    INDEXING REMEDIATION STRATEGIES                                      |
+-------------------+----------------------------------------------------------------+--------------------+
| Strategy          | SQL Definition                                                 | Best Used For      |
+-------------------+----------------------------------------------------------------+--------------------+
| 1. Reorder Index  | CREATE INDEX idx_orders_status_cust ON orders (status, customer_id); | Frequent queries on|
|                   |                                                                | status + customer  |
+-------------------+----------------------------------------------------------------+--------------------+
| 2. Dedicated Index| CREATE INDEX idx_orders_status ON orders (status);             | Standalone status  |
|                   |                                                                | lookups            |
+-------------------+----------------------------------------------------------------+--------------------+
| 3. Partial Index  | CREATE INDEX idx_orders_pending ON orders (created_at)          | Specific status    |
|    (Recommended)  | WHERE status = 'PENDING';                                      | workload filtering |
+-------------------+----------------------------------------------------------------+--------------------+
```

### Solution 1: Reorder the Composite Index

If queries primarily filter by `status` first, or by `status` and `customer_id` together:

```sql
CREATE INDEX idx_orders_status_customer ON orders (status, customer_id, created_at);
```
- Satisfies `WHERE status = 'PENDING'`
- Satisfies `WHERE status = 'PENDING' AND customer_id = 101`

### Solution 2: Create a Dedicated Single-Column Index

If `customer_id` and `status` are queried independently across different parts of the application:

```sql
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_status ON orders (status);
```
- PostgreSQL can use **Bitmap Index Scan** to combine `idx_orders_customer_id` and `idx_orders_status` using bitmap AND/OR operations if a query filters by both!

### Solution 3: Create a Partial Index (Best for High-Scale Workloads)

In e-commerce and banking systems, 95% of orders are `COMPLETED` or `CANCELLED`, while only 5% are actively `PENDING`.

```sql
CREATE INDEX idx_orders_pending_active 
ON orders (customer_id, created_at) 
WHERE status = 'PENDING';
```

**Benefits of Partial Indexes:**
- **Tiny Storage Footprint:** Ignores the millions of historical completed orders.
- **Lightning-Fast Lookups:** B-Tree depth remains shallow (1–2 levels).
- **Lower Write Overhead:** Updates to `COMPLETED` orders do not rewrite this index.

---

## 5. Understanding `EXPLAIN (ANALYZE, BUFFERS)`

To diagnose index execution, run:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM orders WHERE status = 'PENDING';
```

### Scan Types Decoded

#### 1. Sequential Scan (`Seq Scan`)
```text
Seq Scan on orders  (cost=0.00..1887.00 rows=68500 width=36) (actual time=0.012..8.450 rows=70000 loops=1)
  Filter: ((status)::text = 'PENDING'::text)
  Rows Removed by Filter: 30000
  Buffers: shared hit=887
```
- **Meaning:** Entire table was scanned sequentially.

#### 2. Index Scan (`Index Scan`)
```text
Index Scan using idx_orders_status on orders  (cost=0.29..8.30 rows=1 width=36) (actual time=0.024..0.026 rows=1 loops=1)
  Index Cond: ((status)::text = 'PENDING'::text)
  Buffers: shared hit=3
```
- **Meaning:** Index was traversed to locate exact rows; table heap pages were accessed for selected records.

#### 3. Bitmap Index Scan & Bitmap Heap Scan
```text
Bitmap Heap Scan on orders  (cost=42.15..612.30 rows=500 width=36) (actual time=0.250..1.120 rows=500 loops=1)
  Recheck Cond: ((status)::text = 'PENDING'::text)
  Buffers: shared hit=45
  ->  Bitmap Index Scan on idx_orders_status  (cost=0.00..42.02 rows=500 width=0)
        Index Cond: ((status)::text = 'PENDING'::text)
```
- **Meaning:** 
  1. `Bitmap Index Scan` scans the index and builds a bitmap of matching table page memory addresses.
  2. `Bitmap Heap Scan` reads the relevant table pages in physical disk order, converting random I/O into sequential page fetches.

---

## 6. Practical PostgreSQL Lab (Test & Verify)

```sql
-- 1. Create table with 100,000 synthetic rows
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO orders (customer_id, status, created_at)
SELECT 
    (random() * 1000)::INT,
    CASE 
        WHEN random() < 0.90 THEN 'COMPLETED'
        WHEN random() < 0.95 THEN 'CANCELLED'
        ELSE 'PENDING'
    END,
    NOW() - (random() * 30 || ' days')::INTERVAL
FROM generate_series(1, 100000);

-- Refresh statistics
ANALYZE orders;

-- 2. Create composite index with customer_id first
CREATE INDEX idx_orders_cust_status ON orders (customer_id, status, created_at);

-- 3. Query with status only (Observe Seq Scan due to Left-Prefix Rule)
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'PENDING';

-- 4. Create Partial Index optimized for pending orders
CREATE INDEX idx_orders_partial_pending ON orders (customer_id, created_at) WHERE status = 'PENDING';

-- 5. Query matching partial index (Observe instant Bitmap/Index Scan)
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'PENDING' AND customer_id = 101;
```

---

## 7. Knowledge Check / Interview Quiz

```
Q1: You have an index on (A, B, C). Which WHERE clause CANNOT use the index efficiently?
[A] WHERE A = 5 AND B = 10
[B] WHERE A = 5 AND C = 20
[C] WHERE B = 10 AND C = 20
[D] WHERE A = 5

Answer: [C] (Skips leading column A; violates Left-Prefix Rule).
---------------------------------------------------------------------------------------------------
Q2: Why does PostgreSQL choose Seq Scan over an Index Scan on a table with 1,000,000 rows when filtering by status = 'ACTIVE'?
[A] The index is corrupted.
[B] 'ACTIVE' represents 85% of total table rows, making sequential disk I/O faster than 850,000 random index lookups.
[C] PostgreSQL does not support indexes on VARCHAR columns.

Answer: [B] (Low selectivity / high match percentage favors Sequential Scan).
---------------------------------------------------------------------------------------------------
Q3: What is the primary benefit of a Partial Index (WHERE status = 'PENDING')?
[A] It allows wildcard searches.
[B] It keeps the index size small, reduces memory buffer usage, and avoids index update overhead for non-pending rows.
[C] It bypasses ACID constraints.

Answer: [B].
```

---

## 8. Summary Cheat Sheet for Developers

| Rule | Guideline |
| :--- | :--- |
| **Leading Columns First** | Place the most frequently filtered, high-selectivity equality columns first in composite indexes. |
| **Beware of Non-SARGable Code** | Never wrap indexed columns in functions (`DATE()`, `LOWER()`, `SUBSTR()`) or mismatched data types. |
| **Use Partial Indexes** | Index only the active subset of skewed data distributions (e.g., `WHERE status = 'PENDING'`). |
| **Keep Stats Fresh** | Always run `ANALYZE` after large batch data operations. |
| **Verify with Execution Plans** | Always inspect queries using `EXPLAIN (ANALYZE, BUFFERS)` before going to production. |
