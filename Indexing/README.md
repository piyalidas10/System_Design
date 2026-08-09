# ⭐ Indexing in Database

1. How do indexes make databases read faster? : https://www.youtube.com/watch?v=3G293is403I

A database index is a separate, optimized data structure—often a B-tree—that stores searchable column values along with references to the corresponding rows. 
Instead of scanning every row, the database searches the index to quickly locate the matching records, significantly reducing disk I/O and improving query performance. 
The trade-off is additional storage and slower INSERT, UPDATE, and DELETE operations because indexes must also be maintained.

```
NO INDEX
Query → Full Table Scan → Many rows → Slow

WITH INDEX
Query → Index Lookup → Matching rows → Fast
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



