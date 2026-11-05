# Database Indexing: Architecture, B+ Trees, and Internals

> *A complete developer interview preparation guide covering what database indexes are, how B+ Trees work internally, Clustered vs. Non-Clustered Indexes, write overhead trade-offs, composite and covering indexes, real-world banking examples, interview Q&A, and self-assessment quizzes.*

---

## Table of Contents
1. [What is Database Indexing?](#1-what-is-database-indexing)
2. [What is a B+ Tree?](#2-what-is-a-b-tree)
3. [Clustered Index](#3-clustered-index)
4. [Non-Clustered Index](#4-non-clustered-index)
5. [Clustered vs. Non-Clustered Index Comparison](#5-clustered-vs-non-clustered-index-comparison)
6. [Why NOT Create Indexes on All Columns? (Trade-offs)](#6-why-not-create-indexes-on-all-columns-trade-offs)
7. [Real-World Example: Banking Application & Composite Indexing](#7-real-world-example-banking-application--composite-indexing)
8. [Top 10 Technical Interview Questions & Answers](#8-top-10-technical-interview-questions--answers)
9. [Test Your Understanding (Quiz & Walkthrough)](#9-test-your-understanding-quiz--walkthrough)
10. [Final Mental Model & System Design Roadmap](#10-final-mental-model--system-design-roadmap)

---

## 1. What is Database Indexing?

**Database Indexing** is a technique used to make data retrieval faster by creating an **additional data structure** that helps the database locate records without scanning the entire table.

### The Book Analogy
* **Without an index:** You must read every page from start to finish to find a specific topic.
* **With an index:** You flip to the index at the back of the book, locate the keyword alphabetically, and jump straight to its exact page number.

A database index works on the exact same principle.

---

### Example: Employee Table with 1 Million Records

Consider an `Employee` table containing **1,000,000 (10 Lakh) records**:

| ID | Name | Department | Salary |
| :--- | :--- | :--- | :--- |
| 1 | Rahul | IT | 50000 |
| 2 | Amit | HR | 45000 |
| 3 | Priya | Finance | 60000 |
| ... | ... | ... | ... |
| 1000000 | John | IT | 70000 |

You execute the following query:

```sql
SELECT * FROM Employee
WHERE ID = 9;
```

#### Scenario A: Without an Index (Full Table Scan)
The database must inspect every single row sequentially until it finds `ID = 9`.

```
+-----------------------------------------------------------------------------------+
|                        SCENARIO A: FULL TABLE SCAN                                |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  Employee Table - 1 Million Rows (Unsorted on disk)                               |
|                                                                                   |
|  [Check Row 1: ID=1] -> [Check Row 2: ID=2] -> ... -> [Check Row 9: ID=9]         |
|  (In worst-case, if ID is at the end or missing, scans all 1,000,000 rows)        |
|                                                                                   |
|  Time Complexity: O(N)                                                            |
|  Disk I/O: Reads thousands of data pages from disk into memory                    |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

#### Scenario B: With an Index (B+ Tree Lookup)
The database searches through the index structure rather than scanning all rows.

```
+-----------------------------------------------------------------------------------+
|                      SCENARIO B: INDEX-BASED SEEK (B+ TREE)                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                            [ Root Node ]                                          |
|                              [ 50 | 500 ]                                         |
|                             /     |      \                                        |
|                     [ Node ]   [ Node ]   [ Node ]                                |
|                     [ 5 | 20 ]                                                    |
|                     /   |    \                                                    |
|                    v    v     v                                                   |
|             [ Leaf Node: ID=9 ] ---> Direct Record Access                         |
|                                                                                   |
|  Time Complexity: O(log N)                                                        |
|  Disk I/O: Only ~3 to 4 page reads for 1,000,000 records                          |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. What is a B+ Tree?

A **B+ Tree** is a self-balancing tree data structure universally employed by relational databases (MySQL InnoDB, PostgreSQL, SQL Server, Oracle) to implement indexes for fast search, insertion, and deletion.

```
                              [ Root Node ]
                                [ 20 | 50 ]
                               /     |     \
                             /       |       \
               [ Internal ]     [ Internal ]    [ Internal ]
                [ 5 | 10 ]       [ 30 | 40 ]     [ 60 | 80 ]
                /   |    \       /   |     \     /   |     \
               v    v     v     v    v      v   v    v      v
Leaf Nodes:  [1-4]<->[5-9]<->[10-19]<->[20-29]<->[30-39]<->... (Doubly-Linked List)
```

### Core Components of a B+ Tree:
1. **Root Node:** The single entry point where index searches begin.
2. **Internal (Routing) Nodes:** Contain key ranges and pointers to guide the search path toward the appropriate child node.
3. **Leaf Nodes:** Contain the indexed keys along with pointers/references to the actual table rows (or the full row data in clustered tables).

### Why Leaf Node Linking Matters for Range Queries:
Unlike standard Binary Search Trees, all leaf nodes in a B+ Tree are **connected via a bidirectional linked list**.

```sql
SELECT * FROM Employee
WHERE ID BETWEEN 10 AND 100;
```

* **Execution:** The engine traverses $O(\log N)$ down the tree to locate the starting key (`ID = 10`), then sequentially scans across the linked leaf nodes until reaching `ID = 100`.
* **Efficiency:** Eliminates the need to re-traverse the root or internal nodes for every subsequent matching key.

> **Key Rule:** B+ Tree search complexity is **$O(\log N)$**, not $O(1)$.

---

## 3. Clustered Index

A **Clustered Index** determines the **physical and logical organization** of the actual table records on disk according to the indexed key.

```sql
CREATE CLUSTERED INDEX idx_employee_id
ON Employee(ID);
```

```
                     B+ Tree (Clustered Index on Employee ID)
                                   [ Root Node ]
                                      [ 500 ]
                                     /       \
                             [ Internal ]   [ Internal ]
                                [ 250 ]        [ 750 ]
                                /     \        /     \
                               v       v      v       v
 Leaf Nodes:            [ ID: 1..249 ] <----> [ ID: 250..499 ] <----> [ ID: 500..749 ]
 (Actual Table Rows)    (Full Row Data)       (Full Row Data)         (Full Row Data)
```

### Important Characteristics:
* **Data Organization:** The table's data rows are stored directly at the **leaf level** of the B+ Tree.
* **Only ONE per Table:** Physical rows on disk can only be stored in one sorted sequence. You cannot physically sort the same table simultaneously by `ID`, `Name`, and `Department`.
* **Primary Key Default:** In most RDBMS engines (e.g., MySQL InnoDB), the `PRIMARY KEY` automatically forms the clustered index.
* **Optimal Use Cases:** Primary key point lookups (`WHERE ID = 9`) and range queries (`WHERE ID BETWEEN 100 AND 200`).

---

## 4. Non-Clustered Index

When you need to search on columns other than the clustered key (such as `Name` or `Department`), you cannot create another clustered index. Instead, you create a **Non-Clustered Index (Secondary Index)**.

```sql
CREATE NONCLUSTERED INDEX idx_employee_name
ON Employee(Name);
```

A non-clustered index creates a **completely separate, secondary index structure** (its own B+ Tree).

```
 Query: SELECT * FROM Employee WHERE Name = 'Priya';

 [Step 1: Non-Clustered Index B+ Tree on 'Name']
                       [ Root Node ]
                          [ 'M' ]
                         /       \
                     [ 'D' ]   [ 'S' ]
                     /     \
                    v       v
 Leaf: ['Priya' | Row Reference: ID=3]
              |
              | (Step 2: Key / Bookmark Lookup)
              v
 [Clustered Table / Base Data Page]
 [ ID: 3 | Priya | Finance | 60000 ] ===> Returns full record to client
```

### Visual Representation of Separate Storage:

**Original Employee Table (Clustered on ID):**
| ID | Name | Department | Salary |
| :--- | :--- | :--- | :--- |
| 1 | Rahul | IT | 50000 |
| 2 | Amit | HR | 45000 |
| 3 | Priya | Finance | 60000 |
| 4 | John | IT | 70000 |

**Separate Name Index (Non-Clustered B+ Tree):**
| Name (Sorted) | Row Reference (Locator) |
| :--- | :--- |
| Amit | ID 2 |
| John | ID 4 |
| Priya | ID 3 |
| Rahul | ID 1 |

### Retrieval Flow for `WHERE Name = 'Priya'`:
1. Search the **Name Non-Clustered Index** using B+ Tree traversal ($O(\log N)$).
2. Locate the key `'Priya'` and extract its row locator (`ID = 3`).
3. If non-indexed columns (`Department`, `Salary`) are needed, perform a **Key Lookup / Bookmark Lookup** to the base clustered table using `ID = 3`.

---

## 5. Clustered vs. Non-Clustered Index Comparison

| Feature | Clustered Index | Non-Clustered Index |
| :--- | :--- | :--- |
| **Organization** | Organizes and sorts the actual table data | Separate independent index structure |
| **Actual Data Location** | Stored directly at the leaf level of the index | Located through a row locator (pointer or PK value) |
| **Quantity per Table** | Exactly **1** per table | **Multiple** (up to engine limits, e.g. 64–999) |
| **Storage Overhead** | Built into the base table data pages | Requires additional disk space for each index tree |
| **Lookup Mechanism** | Single traversal retrieves entire row directly | Requires B+ Tree traversal + potential Key Lookup |
| **Best Used For** | Primary Key, sequential IDs, range queries | Frequently filtered/joined columns (`WHERE`, `JOIN`) |

> **Engine Note:** Implementation details vary across DBMS engines. For example, in **MySQL InnoDB**, secondary indexes store the Primary Key value as their row locator, whereas in **SQL Server Heap tables** (without a clustered index), secondary indexes store physical Row Identifiers (RID: File# : Page# : Slot#).

---

## 6. Why NOT Create Indexes on All Columns? (Trade-offs)

> *"If indexing makes reading faster, why not index every single column?"*

Indexes dramatically improve **Read** performance (`SELECT`), but introduce significant overhead for **Write** operations (`INSERT`, `UPDATE`, `DELETE`).

```
+-----------------------------------------------------------------------------------+
|                        WRITE OVERHEAD WITH MULTIPLE INDEXES                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  INSERT INTO Employee VALUES (10, 'Amit', 'IT', 60000);                          |
|                                                                                   |
|                       [ Base Employee Table ]                                     |
|                       (Insert row into data page)                                 |
|                                  |                                                |
|         +------------------------+------------------------+                       |
|         |                        |                        |                       |
|         v                        v                        v                       |
|    [ ID Index ]            [ Name Index ]           [ Dept Index ]                |
|  (Insert key 10 &       (Insert key 'Amit' &      (Insert key 'IT' &              |
|   rebalance B+ Tree)      rebalance B+ Tree)       rebalance B+ Tree)             |
|                                                                                   |
|  ===> 1 INSERT query triggers 4 separate disk write & rebalancing operations!     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Operation Impact Summary:

| Operation | Effect of Indexes | Underlying Reason |
| :--- | :--- | :--- |
| **`SELECT`** | **Faster** | Replaces full table scans with logarithmic $O(\log N)$ seeks. |
| **`INSERT`** | **Slower** | Must insert into base table and update/rebalance every B+ Tree. |
| **`UPDATE`** | **Slower** | If indexed columns change, the corresponding B+ Trees must be re-sorted. |
| **`DELETE`** | **Slower** | Removing records requires finding and deleting entries across all index trees. |
| **Storage** | **Higher** | Each index consumes extra disk and RAM buffer pool space. |

### Strategic Indexing Rule:
Indexes should be created only on columns frequently present in:
* `WHERE` filter conditions
* `JOIN` clauses
* `ORDER BY` sorting
* `GROUP BY` aggregations

---

## 7. Real-World Example: Banking Application & Composite Indexing

Imagine a banking system with a `Transactions` table containing millions of records:

| Transaction ID | Account ID | Amount | Date |
| :--- | :--- | :--- | :--- |
| 101 | 5001 | 5000 | 2026-11-01 |
| 102 | 5002 | 2000 | 2026-11-02 |
| 103 | 5001 | 1000 | 2026-11-03 |
| 104 | 5003 | 3000 | 2026-11-04 |

### Case 1: Single-Column Index
If your application frequently filters by account:

```sql
SELECT * FROM Transactions
WHERE Account_ID = 5001;
```

A single-column index is created:
```sql
CREATE INDEX idx_account_id ON Transactions(Account_ID);
```

---

### Case 2: Multi-Column Filter and Sort (Composite Index)
Now suppose user dashboards query recent transactions sorted by date:

```sql
SELECT * FROM Transactions
WHERE Account_ID = 5001
ORDER BY Date DESC;
```

With only `idx_account_id`, the database finds matching rows via the index but must perform an expensive **in-memory file sort (`Sort` / `filesort`)** on disk/memory for the `ORDER BY Date DESC`.

To optimize both filtering and sorting simultaneously, create a **Composite Index**:

```sql
CREATE INDEX idx_account_date ON Transactions(Account_ID, Date);
```

```
                    Composite Index (Account_ID, Date)
                                   [ Root ]
                        [ (5001, 'Nov 2') | (5002, 'Nov 1') ]
                                 /                     \
       [ (5001, 'Nov 1'), (5001, 'Nov 3') ]    [ (5002, 'Nov 2'), (5003, 'Nov 4') ]
```

### Critical Interview Insight: The Leftmost Prefix Rule
Column order in composite indexes is paramount:
* `(Account_ID, Date)` can satisfy queries filtering on `Account_ID` alone, or `Account_ID` **AND** `Date`.
* `(Account_ID, Date)` **CANNOT** be used for queries filtering on `Date` alone!
* An index on `(Account_ID, Date)` is **not equivalent** to an index on `(Date, Account_ID)`.

---

## 8. Top 10 Technical Interview Questions & Answers

### Q1. What is database indexing?
> **Answer:** Database indexing is a performance optimization technique that maintains an auxiliary data structure (typically a B+ Tree) to locate specific rows quickly without scanning every row in a table.

### Q2. Which data structure is commonly used for database indexing and why?
> **Answer:** B+ Tree. It maintains balanced depth for consistent $O(\log N)$ lookups, features high fan-out to minimize disk I/O, and links leaf nodes sequentially to provide optimal range queries.

### Q3. What is the difference between clustered and non-clustered indexes?
> **Answer:** A clustered index determines the physical/logical sort order of the table data itself, storing full rows at leaf nodes (1 per table). A non-clustered index is an auxiliary B+ Tree storing indexed keys and row pointers back to the base table (multiple per table).

### Q4. Why can a table have only one clustered index?
> **Answer:** Because physical table records on disk can only be stored in one physical order at any given time.

### Q5. Can we create multiple non-clustered indexes on a single table?
> **Answer:** Yes. You can create multiple non-clustered indexes on different individual columns or composite column combinations.

### Q6. Why shouldn't we create indexes on every column?
> **Answer:** Every additional index increases disk storage and introduces write latency overhead. Every `INSERT`, `UPDATE`, and `DELETE` must rebalance and update every associated index structure.

### Q7. What is the time complexity of an index lookup?
> **Answer:** For a B+ Tree index, point search and range start lookups have a time complexity of **$O(\log N)$**.

### Q8. Does indexing always improve query performance?
> **Answer:** No. Full table scans are faster for small tables (avoiding extra index page I/O). Indexes also provide low benefit for low-selectivity columns (e.g. boolean flags) or queries returning >20–30% of the entire table.

### Q9. What is a Composite Index?
> **Answer:** An index defined on two or more columns (e.g., `CREATE INDEX idx_emp ON Employee(Department, Salary)`). It optimizes multi-column filters, joins, and sorts based on the leftmost prefix rule.

### Q10. What is a Covering Index?
> **Answer:** An index that includes all columns referenced in the query's `SELECT`, `WHERE`, `JOIN`, and `ORDER BY` clauses. The database retrieves the entire result set directly from the index leaf nodes without performing a secondary key/bookmark lookup to the base table.

---

## 9. Test Your Understanding (Quiz & Walkthrough)

### Question 1
**You have 1 million employee records and no index on `Employee_ID`. What occurs when querying `WHERE Employee_ID = 900000`?**
- A) $O(1)$ Hash lookup
- B) Full table scan – $O(N)$
- C) B+ Tree lookup – $O(\log N)$

> **Correct Answer: B**  
> *Explanation:* Without an index, the database engine has no pre-sorted structure and must scan pages sequentially from the beginning of the table until the matching record is found ($O(N)$).

---

### Question 2
**You already have a clustered index on `Employee_ID`. You need fast searches on `Employee_Name`. What should you create?**
- A) Another clustered index
- B) A non-clustered index on `Employee_Name`
- C) Delete and recreate the table

> **Correct Answer: B**  
> *Explanation:* A table can only have one clustered index. To accelerate searches on a secondary column, create a non-clustered index on `Employee_Name`.

---

### Question 3
**Why can having too many indexes be harmful to a database?**
- A) They slow down every `SELECT` query
- B) They increase write overhead (`INSERT`/`UPDATE`/`DELETE`) and consume extra disk storage
- C) They cause permanent data loss

> **Correct Answer: B**  
> *Explanation:* Every write operation must synchronously update and rebalance all associated index B+ Trees, degrading write throughput and ballooning disk/memory consumption.

---

### Question 4
**Which index design is most effective for `WHERE Account_ID = 5001 ORDER BY Date DESC`?**
- A) Composite index on `(Account_ID, Date)`
- B) Single index on `Date`
- C) Index on an unrelated column

> **Correct Answer: A**  
> *Explanation:* A composite index on `(Account_ID, Date)` allows the engine to seek directly to `Account_ID = 5001` and retrieve records in pre-sorted date order without an additional in-memory sort.

---

## 10. Final Mental Model & System Design Roadmap

```
+-----------------------------------------------------------------------------------+
|                        DATABASE INDEXING MENTAL MODEL                             |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   CLUSTERED INDEX        NON-CLUSTERED INDEX            B+ TREE                   |
|   Organizes table        Separate helper tree +         Balanced search tree      |
|   data by key.           row locator pointer.           O(log N) lookup speed.    |
|   (1 per table)          (Multiple per table)           Linked leaf nodes.        |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                    TRADE-OFFS                                     |
+-----------------------------------------------------------------------------------+
|   READ PERFORMANCE       WRITE PERFORMANCE              STORAGE                   |
|   Usually Improves       Decreases                      Increases                 |
|   (O(log N) vs O(N))     (Maintains N trees)            (Disk + RAM buffer pool)  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Next Topics for System Design Preparation:
To master database internals for Senior Backend and System Design interviews, proceed to:
1. **Index Selectivity & Cardinality:** Understanding how unique values affect whether the optimizer chooses an index seek vs. scan.
2. **Index Seek vs. Index Scan:** Difference between navigating tree branches (Seek) and reading through leaf pages (Scan).
3. **Covering Indexes & Index-Only Scans:** Eliminating table lookups entirely.
4. **Execution Plans (`EXPLAIN / EXPLAIN ANALYZE`):** Analyzing query execution cost, index usage, and bottlenecks.
5. **LSM Trees vs. B+ Trees:** How write-heavy NoSQL databases (Cassandra, RocksDB, ScyllaDB) trade read latency for blazing write throughput.

---

*Document compiled for Developer Interview Preparation.*
