# ⭐ Indexing in Database

1. How do indexes make databases read faster? : https://www.youtube.com/watch?v=3G293is403I
2. How does indexing work in Databases in Hindi ( How to optimize SQL Queries in Hindi ) : https://www.youtube.com/watch?v=xXtig5uLQS4

**A database index is a separate, optimized data structure—often a B-tree—that stores searchable column values along with references to the corresponding rows. 
Instead of scanning every row, the database searches the index to quickly locate the matching records, significantly reducing disk I/O and improving query performance. 
The trade-off is additional storage and slower INSERT, UPDATE, and DELETE operations because indexes must also be maintained.**

```
INDEX

          Sorted keys
              │
              ▼
       Find matching key
              │
              ▼
       Row reference
              │
              ▼
       Actual table row
```
```
NO INDEX
Query → Full Table Scan → Many rows → Slow

WITH INDEX
Query → Index Lookup → Matching rows → Fast
```

## What an index actually does


**✅ Indexing creates separate index data structure/pages, not simply "separate memory location or not a separate table", although it is stored separately from the table as its own database structure.**

Think of it like this:
```
DATABASE
│
├── USERS TABLE
│   ├── Data Page 1
│   ├── Data Page 2
│   ├── Data Page 3
│   └── ...
│
└── INDEX ON age
    ├── Index Page 1
    ├── Index Page 2
    ├── Index Page 3
    └── ...
```

Your table:
```
USERS TABLE
┌────┬───────┬─────┐
│ id │ name  │ age │
├────┼───────┼─────┤
│ 1  │ Asha  │ 23  │
│ 2  │ Rahul │ 21  │
│ 3  │ Neha  │ 22  │
│ 4  │ Kiran │ 23  │
│ 5  │ Ishan │ 22  │
│ 6  │ Meera │ 24  │
└────┴───────┴─────┘
```
If you create:
```
CREATE INDEX idx_age ON users(age);
```

**the database maintains a separate index structure:**
```
INDEX: idx_age

       B+ TREE
          │
      ┌───┴───┐
     22       24
    /  \       \
   21  22      23,24
       │
       └── 23 → row reference
             23 → row reference
```
**More conceptually:**
```
                 DATABASE
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
     USERS TABLE          idx_age
     actual data          index structure
          │                   │
     ┌────┴────┐         ┌────┴────┐
     │         │         │         │
   Pages     Pages      Pages     Pages
     │                   │
     ▼                   ▼
Full records        age + row references
```

**So what does "separate index pages" mean?**

It means the database allocates database storage pages/blocks for the index, separately from the pages containing the actual table data.

For example:
```
Disk
────────────────────────────────────

TABLE DATA PAGES
┌──────────┐
│ Page 1   │ → User records
├──────────┤
│ Page 2   │ → User records
├──────────┤
│ Page 3   │ → User records
└──────────┘


INDEX PAGES
┌──────────┐
│ Page 101  │ → B+Tree root
├──────────┤
│ Page 102  │ → B+Tree node
├──────────┤
│ Page 103  │ → Leaf entries
└──────────┘
```

The index pages contain index information, not necessarily complete copies of the table rows.

**🔑 The easiest way to remember**
```
Table = actual data
Index = separate data structure that helps locate the actual data
```
So don't think:
```
Table + another copy of the table ❌
```
Think:
```
Table + a searchable map to the table ✅
```
And that's why creating 5 indexes doesn't create 5 copies of your table. It creates 5 additional index structures, each consuming storage and requiring maintenance when the underlying data changes.

## Example
```
USERS TABLE
────────────────────────
ID   Name    Age
1    Asha    23
2    Rahul   21
3    Neha    22
4    Kiran   23
5    Ishan   22
6    Meera   24
```
**Create:**
```
CREATE INDEX idx_users_age
ON users(age);
```
**The database creates an index structure:**
```
        B+ TREE INDEX
             │
       ┌─────┴─────┐
       │           │
      21          22
                   │
              ┌────┴────┐
              ▼         ▼
           22 → ID 3   23 → ID 1
                     23 → ID 4
                     24 → ID 6
```
Conceptually:
```
Indexed value       Row reference
     ↓                    ↓
     23  ──────────────→ ID 1
     23  ──────────────→ ID 4
     24  ──────────────→ ID 6
```
The exact "pointer" depends on the database and index type. It may point to a row location, or contain the primary-key value used to locate the row.

## Why is the index sorted?

**Suppose we have:**
```
21
22
22
23
23
24
25
26
...
```
**Now query:**
```
SELECT *
FROM users
WHERE age = 23;
```
**Because the index is ordered, the database can navigate directly toward 23.**
```
21
 ↓
22
 ↓
23  ← START
23  ← MATCH
24  ← STOP
```
It doesn't need to examine every row in the table.

That's the major performance benefit.

## B-tree is not a binary search tree
**Binary Search Tree**
```
             50
           /    \
         30      70
        /  \    /  \
      20   40  60   80
```
Each node has at most 2 children.

**B-tree / B+Tree**

A database index can have many children per node:
```
                [30 | 60]
              /     |     \
             /      |      \
      [10|20]   [40|50]   [70|80]
```
This is called a multi-way / multi-child balanced tree.

And in many relational databases, B+ trees are especially common for indexes.

So a better statement is:
```
B-trees/B+ trees are balanced multi-way tree data structures commonly used to implement database indexes.
```

## Indexing should be used in read intensive database
✅ Generally correct.

For example:
```
READ-HEAVY DATABASE

1000 SELECT
     ↓
  10 INSERT
     ↓
Index provides huge benefit
```
The index can dramatically reduce the amount of data that must be scanned.

## Why indexes make writes more expensive

This is also correct.

**Suppose we have:**
```
TABLE

ID   Age
1    21
2    22
3    23
4    24
```
**and an index:**
```
INDEX ON AGE

21 → ID 1
22 → ID 2
23 → ID 3
24 → ID 4
```
**Now:**
```
INSERT INTO users VALUES (5, 'Amit', 23);
```
**The database has to do two conceptual things:**
```
             INSERT
                │
       ┌────────┴────────┐
       ▼                 ▼
  USERS TABLE       AGE INDEX
       │                 │
    Add row 5       Add 23 → ID 5
                         │
                         ▼
                 Maintain ordering
```
**If the index page doesn't have enough space, the B-tree/B+Tree may need to split a page, which adds additional work.**

**So:**
```
INSERT / UPDATE / DELETE
          │
          ├── Update table
          │
          └── Update indexes
```
More indexes = potentially more write overhead.

> Indexes should be used selectively in write-intensive databases because every index adds storage and write-maintenance overhead.
> A write-heavy database may still absolutely need indexes.

```
                 INDEX
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
     READS                  WRITES
        │                     │
        ▼                     ▼
     Faster                 Slower
        │                     │
        ▼                     ▼
 Less scanning          Index maintenance
 Less I/O               Extra I/O
 Faster queries         Extra storage
```

## 🔍 How do indexes make databases read faster?

Think of a database index like the index at the back of a book.

Without an index, the database may have to check every row to find matching data. With an index, it can quickly locate the relevant rows.

**1. Without an index — Full Table Scan**

Suppose we have 10 million users:
```
SELECT * FROM users
WHERE email = 'piyali@example.com';
```
If email has no index, the database may do:
```
users table
│
├── Row 1       ❌
├── Row 2       ❌
├── Row 3       ❌
├── Row 4       ❌
├── ...
├── Row 9,999,999 ❌
└── Row 10,000,000 ✅
```
It potentially examines millions of rows.

This is called a Full Table Scan.

Complexity is roughly:
```
O(N)
```
where N = number of rows.

**2. With an index**

Create an index:
```
CREATE INDEX idx_users_email
ON users(email);
```
The database creates a separate data structure, commonly a B-tree for traditional relational databases:
```
                [email index]
                     │
              ┌──────┴──────┐
             [M-R]         [S-Z]
              │               │
          [Piyali...]      ...
              │
              ▼
        Row location
              │
              ▼
       users table row
```
Now the database doesn't need to inspect every user.

It searches the index first:
```
Query
  │
  ▼
email index
  │
  │  Find "piyali@example.com"
  ▼
Matching index entry
  │
  ▼
Row location
  │
  ▼
Actual row
```
The lookup is approximately:
```
O(log N)
```
So instead of potentially examining 10 million rows, the database may traverse only a small number of index pages before reaching the desired entry.

## 3. What is actually stored in an index?

Conceptually:
```
INDEX
────────────────────────────────
email                  row pointer
────────────────────────────────
alice@gmail.com        → Row 125
bob@gmail.com          → Row 892
john@gmail.com         → Row 451
piyali@example.com     → Row 7,832,451
────────────────────────────────
```
The index usually doesn't contain the complete row.

It contains something like:
```
SEARCH KEY + ROW LOCATION
```
The database uses that location to fetch the actual record.

## Example with an analogy

Imagine a 1,000-page book.

You want:

"Distributed Systems"

**Without index**

You start from page 1:
```
Page 1 ❌
Page 2 ❌
Page 3 ❌
...
Page 731 ✅
```

**With index**

You look at the book's index:
```
Distributed Systems → Page 731
```
Then:
```
Index
  │
  ▼
Page 731
```
That's essentially what a database index provides.

## Indexes aren't always faster

Indexes have a cost.

When you execute:
```
INSERT INTO users ...
UPDATE users ...
DELETE FROM users ...
```
the database may also need to update the indexes.

So:
```
                Database
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
     Table                 Index
        │                     │
        └────── Update ───────┘
```
Therefore:

Indexes improve reads but add overhead to writes and consume storage.



