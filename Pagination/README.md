# Offset-Based vs. Cursor-Based Pagination

Your API returns 20 records per page. The frontend requests page 1, then page 2. Everything looks fine.

Now imagine new records are inserted between those two requests.

With offset-based pagination, the records shift positions. The next page might repeat an item or skip one entirely. This becomes especially noticeable in busy feeds, transaction histories, and audit logs.

For large, frequently changing datasets, **cursor-based pagination** can be a better choice. For example, use the last record's timestamp and a unique ID to determine where the next page starts.

- The unique ID matters because timestamps can be identical.
- The query needs a matching, deterministic sort order.

> Pagination isn't just about limiting results. It's about defining where the next page begins when the data keeps changing.

This is an important System Design concept, especially for high-traffic applications such as banking transaction histories, social media feeds, and audit logs. Let's understand it from a beginner's perspective, with a practical example.

---

## 1. Offset-Based Pagination: The Problem

Imagine your database initially contains these records (newest first):

| Position | Record ID |
| :---: | :---: |
| 1 | 101 |
| 2 | 102 |
| 3 | 103 |
| 4 | 104 |
| 5 | 105 |
| 6 | 106 |

Your API returns 3 records per page.

### Page 1 request

```sql
SELECT *
FROM transactions
ORDER BY created_at DESC
LIMIT 3 OFFSET 0;
```

Returns: `101, 102, 103`

Now, before the frontend requests page 2, a new record (`107`) is inserted at the beginning:

| Position | Record ID |
| :---: | :---: |
| 1 | **107** |
| 2 | 101 |
| 3 | 102 |
| 4 | 103 |
| 5 | 104 |
| 6 | 105 |
| 7 | 106 |

### Page 2 request

```sql
SELECT *
FROM transactions
ORDER BY created_at DESC
LIMIT 3 OFFSET 3;
```

Returns: `103, 104, 105`

**Problem: duplicate record `103`.** The frontend already received record 103 on page 1. This happens because `OFFSET` counts *positions*, not previously retrieved records.

---

## 2. Cursor-Based Pagination: The Solution

Instead of remembering the position, remember the **last record received**.

For example, page 1 returns `101, 102, 103`. The frontend remembers the cursor associated with record 103. The cursor could contain:

```json
{
  "created_at": "2026-11-09T10:30:00Z",
  "id": 103
}
```

The next request sends this cursor to the backend:

```
GET /transactions?limit=3&cursor=...
```

The backend executes:

```sql
SELECT *
FROM transactions
WHERE
    (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 3;
```

The database starts looking *after* the last received record in the defined ordering. Even if a new record is inserted at the beginning, the next page still starts after record 103.

---

## 3. Why Do We Need a Unique ID Along with the Timestamp?

Imagine two transactions have exactly the same timestamp:

| Transaction ID | Timestamp |
| :---: | :---: |
| 103 | 10:30:00 |
| 104 | 10:30:00 |
| 105 | 10:29:00 |

If you use only the timestamp, the database cannot uniquely determine the position between records 103 and 104. Therefore, use:

```sql
ORDER BY created_at DESC, id DESC
```

The ID acts as a **tie-breaker**. This gives us a **deterministic ordering**.

---

## 4. Architecture Comparison

**Offset-based pagination**

1. Frontend requests page 2
2. Database skips `OFFSET` records
3. Returns the next `LIMIT` records
4. Positions can shift when records change

**Cursor-based pagination**

1. Frontend sends last-record cursor
2. Database finds records after the cursor
3. Returns the next `LIMIT` records
4. Stable continuation point for inserts before the cursor

---

## 5. When Should You Use Each?

| Use case | Recommended |
| :--- | :--- |
| Small admin tables | Offset |
| Search results with page numbers | Offset |
| Social media feeds | Cursor |
| Banking transaction history | Cursor |
| Audit logs | Cursor |
| Large datasets | Cursor |
| Jump directly to page 50 | Offset |

> **Important:** Cursor pagination reduces duplicate/skip problems caused by inserts before the cursor, but it does not automatically provide a perfectly consistent snapshot. Updates, deletions, and backdated inserts can still affect results. For strict audit or financial reporting, consider snapshot-based pagination or a fixed upper-bound timestamp.

---

## 6. Interview Question

Suppose you are designing a banking application:

- Each API request returns 20 transactions.
- Millions of transactions exist.
- New transactions are continuously inserted.
- Users scroll through their transaction history.

**Question:** Why would you choose cursor-based pagination instead of offset-based pagination?

### A strong interview answer

> "I would choose cursor-based pagination because offset-based pagination relies on row positions, which can shift when new transactions are inserted. Cursor-based pagination uses the last retrieved record's timestamp and unique transaction ID as a continuation point. Combined with deterministic sorting and a suitable database index, it provides more reliable pagination and avoids the performance cost of large offsets."

---

# Working Node.js + PostgreSQL Cursor-Based Pagination

Let's build a practical transaction-history API, similar to what you would find in a banking application.

We'll implement:

- Node.js + Express backend.
- PostgreSQL database.
- Cursor-based pagination using `created_at` and `id`.
- REST API returning 20 records per request.
- Frontend requests for page 1 and page 2.
- Demonstration of inserting a new transaction between requests.
- Handling duplicate timestamps correctly.

---

## 1. Architecture

```
Frontend (Browser)
   Fetch API / JavaScript
        │
        │  HTTP GET /transactions?limit=20
        ▼
Node.js + Express API
   Validates cursor and constructs SQL query
        │
        │  SQL query with cursor condition
        ▼
PostgreSQL
   Transactions table + composite index
```

---

## 2. Project Structure

```
cursor-pagination/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   │   └── transactions.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   └── index.html
│
└── docker-compose.yml
```

---

## 3. Start PostgreSQL Using Docker

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17
    container_name: pagination-db
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secret123
      POSTGRES_DB: banking
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start the database:

```bash
docker compose up -d
```

**Important networking detail:**

- Node.js running directly on your Windows machine connects to `localhost:5432`.
- Node.js running inside another Docker container connects to `postgres:5432`.

---

## 4. Create the PostgreSQL Table

Connect to the database and execute:

```sql
CREATE TABLE transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id BIGINT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    transaction_type VARCHAR(20),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Create a composite index:

```sql
CREATE INDEX idx_transactions_cursor
ON transactions (
    account_id,
    created_at DESC,
    id DESC
);
```

**Why this index?**

- `account_id` filters transactions belonging to an account.
- `created_at` establishes chronological order.
- `id` provides a unique tie-breaker.

For a banking system, account-level filtering is important. Never expose another account's transactions by accepting an arbitrary cursor.

---

## 5. Insert Sample Data

For this demonstration, insert 50 transactions with different timestamps:

```sql
INSERT INTO transactions
(account_id, amount, transaction_type, description, created_at)
SELECT
    1001,
    (100 + n)::NUMERIC(12,2),
    'DEBIT',
    'Transaction ' || n,
    NOW() - (n * INTERVAL '1 minute')
FROM generate_series(1, 50) AS n;
```

The database now has 50 transactions.

---

## 6. Configure the Node.js Backend

Inside `backend`, initialize the project:

```bash
npm init -y
npm install express pg dotenv cors
npm install --save-dev nodemon
```

Create `.env`:

```
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=appuser
DB_PASSWORD=secret123
DB_NAME=banking
```

Create `db.js`:

```javascript
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

module.exports = pool;
```

---

## 7. Implement the Cursor-Based Pagination API

Create `routes/transactions.js`. This is the most important part of the implementation.

```javascript
const express = require("express");
const router = express.Router();
const pool = require("../db");

// Encode cursor
function encodeCursor(transaction) {
    const cursorData = {
        createdAt: transaction.created_at.toISOString(),
        id: transaction.id
    };

    return Buffer
        .from(JSON.stringify(cursorData))
        .toString("base64url");
}

// Decode cursor
function decodeCursor(cursor) {
    try {
        const decoded = JSON.parse(
            Buffer.from(cursor, "base64url").toString("utf8")
        );

        if (
            typeof decoded.createdAt !== "string" ||
            !Number.isFinite(Date.parse(decoded.createdAt)) ||
            !/^[1-9]\d*$/.test(String(decoded.id))
        ) {
            throw new Error("Invalid cursor");
        }

        return decoded;

    } catch {
        throw new Error("Invalid cursor");
    }
}

// GET /transactions
router.get("/", async (req, res) => {

    try {
        const accountId = 1001; // Demo only; use authenticated account ID
        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
            100
        );

        const cursor = req.query.cursor;

        let result;

        if (cursor) {

            const { createdAt, id } = decodeCursor(cursor);

            result = await pool.query(
                `
                SELECT
                    id,
                    account_id,
                    amount,
                    transaction_type,
                    description,
                    created_at
                FROM transactions
                WHERE account_id = $1
                  AND (created_at, id) < ($2::timestamptz, $3::bigint)
                ORDER BY created_at DESC, id DESC
                LIMIT $4
                `,
                [accountId, createdAt, id, limit + 1]
            );

        } else {

            result = await pool.query(
                `
                SELECT
                    id,
                    account_id,
                    amount,
                    transaction_type,
                    description,
                    created_at
                FROM transactions
                WHERE account_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT $2
                `,
                [accountId, limit + 1]
            );
        }

        // Fetch one extra record to determine if another page exists.
        const hasMore = result.rows.length > limit;

        const transactions = result.rows.slice(0, limit);

        // Cursor must point to the last returned record.
        const lastTransaction =
            transactions[transactions.length - 1];

        const nextCursor =
            hasMore && lastTransaction
                ? encodeCursor(lastTransaction)
                : null;

        res.json({
            data: transactions,
            pagination: {
                limit,
                hasMore,
                nextCursor
            }
        });

    } catch (error) {

        if (error.message === "Invalid cursor") {
            return res.status(400).json({
                error: "Invalid cursor"
            });
        }

        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

module.exports = router;
```

### Understand the most important SQL statement

```sql
WHERE account_id = $1
AND (created_at, id) < ($2, $3)

ORDER BY created_at DESC, id DESC

LIMIT $4
```

| SQL | Purpose |
| :--- | :--- |
| `account_id = $1` | Fetch only this account's records |
| `created_at, id` | Define deterministic ordering |
| `< ($2, $3)` | Find records older than the cursor |
| `ORDER BY ... DESC` | Newest transactions first |
| `LIMIT 21` | Fetch 20 + 1 extra record |

**Why fetch 21 records when the frontend only wants 20?**

Because the extra record tells us whether another page exists.

- 21 records returned → `hasMore = true`.
- 20 or fewer returned → `hasMore = false`.

This avoids an additional `COUNT(*)` query.

---

## 8. Start the Express Server

Create `server.js`:

```javascript
const express = require("express");
const cors = require("cors");

const transactionRoutes = require("./routes/transactions");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/transactions", transactionRoutes);

app.get("/health", (req, res) => {
    res.json({ status: "UP" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

Run:

```bash
node server.js
```

Your API is available at:

```
GET http://localhost:3000/transactions?limit=20
```

---

## 9. Frontend: Page 1 and Page 2 Requests

Create `frontend/index.html`. This is a simple browser frontend that remembers the cursor received from the backend.

```html
<!DOCTYPE html>
<html>
<head>
<title>Banking Transactions</title>
<style>
        body {
            font-family: Arial, sans-serif;
            margin: 30px;
        }

        button {
            padding: 10px 18px;
            margin-right: 10px;
            cursor: pointer;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }

        pre {
            background: #f3f3f3;
            padding: 12px;
            overflow-wrap: anywhere;
        }
    </style>
</head>
<body>
<h2>Banking Transaction History</h2>
<button onclick="loadPage1()">Load Page 1</button>
<button onclick="loadPage2()" id="nextButton" disabled>
        Load Page 2
    </button>
<p id="status">Click Load Page 1</p>
<p>
<strong>Next Cursor:</strong>
</p>
<pre id="cursorDisplay">No cursor yet</pre>
<table>
<thead>
<tr>
<th>ID</th>
<th>Amount</th>
<th>Type</th>
<th>Description</th>
<th>Date</th>
</tr>
</thead>
<tbody id="transactionBody">
</tbody>
</table>
<script>

        const API_URL = "http://localhost:3000/transactions";

        let nextCursor = null;

        async function loadPage1() {

            // Reset previous pagination state
            nextCursor = null;

            document.getElementById("transactionBody").innerHTML = "";

            const response = await fetch(
                `${API_URL}?limit=20`
            );

            if (!response.ok) {
                throw new Error("Page 1 request failed");
            }

            const result = await response.json();

            renderTransactions(result.data);

            nextCursor = result.pagination.nextCursor;

            document.getElementById("cursorDisplay").textContent =
                nextCursor || "No more records";

            document.getElementById("nextButton").disabled =
                !result.pagination.hasMore;

            document.getElementById("status").textContent =
                `Page 1 loaded: ${result.data.length} records`;

            console.log("PAGE 1 RESPONSE:", result);
        }

        async function loadPage2() {

            if (!nextCursor) {
                return;
            }

            const response = await fetch(
                `${API_URL}?limit=20&cursor=${encodeURIComponent(nextCursor)}`
            );

            if (!response.ok) {
                throw new Error("Page 2 request failed");
            }

            const result = await response.json();

            renderTransactions(result.data);

            nextCursor = result.pagination.nextCursor;

            document.getElementById("cursorDisplay").textContent =
                nextCursor || "No more records";

            document.getElementById("nextButton").disabled =
                !result.pagination.hasMore;

            document.getElementById("status").textContent =
                `Page 2 loaded: ${result.data.length} records`;

            console.log("PAGE 2 RESPONSE:", result);
        }

        function renderTransactions(transactions) {

            const tbody =
                document.getElementById("transactionBody");

            transactions.forEach(transaction => {

                const row = document.createElement("tr");

                const values = [
                    transaction.id,
                    transaction.amount,
                    transaction.transaction_type,
                    transaction.description,
                    new Date(transaction.created_at).toLocaleString()
                ];

                values.forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value ?? "";
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });
        }

    </script>
</body>
</html>
```

**How to run:** Open `index.html` in your browser, click **Load Page 1**, then **Load Page 2**. The browser retains the cursor returned by the API.

---

## 10. Test the Actual Problem: Insert a New Record Between Requests

This is where cursor-based pagination becomes interesting.

### Step A — Frontend requests page 1

```
GET /transactions?limit=20
```

Suppose the database returns:

```
ID: 50
ID: 49
ID: 48
...
ID: 31
```

The last record is ID 31. The backend generates a cursor using ID 31's timestamp and ID.

### Step B — Insert a new transaction

Before requesting page 2, execute this SQL:

```sql
INSERT INTO transactions (
    account_id,
    amount,
    transaction_type,
    description,
    created_at
)
VALUES (
    1001,
    5000.00,
    'CREDIT',
    'New transaction inserted between requests',
    NOW() + INTERVAL '1 second'
);
```

Now the database has a new record at the beginning of the descending order.

### Step C — Frontend requests page 2

The browser sends the cursor from page 1:

```
GET /transactions?limit=20&cursor=eyJjcmVhdGVkQXQiOi...
```

The backend decodes the cursor and executes:

```sql
SELECT *
FROM transactions
WHERE account_id = 1001
AND (created_at, id) < (
    '2026-11-09T10:30:00Z',
    31
)
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

The result starts with ID 30, followed by older transactions.

### What happens to the records?

| Stage | Records | Note |
| :--- | :--- | :--- |
| Page 1 | IDs 50 → 31 | 20 records |
| New insertion | ID 51 | Inserted at beginning |
| Page 2 | IDs 30 → 11 | 20 records |

No duplicate is caused by the new insertion. No previously unseen older record is skipped.

Notice that ID 51 is **not** returned on page 2. That's intentional: it was inserted *before* the cursor. A refresh of page 1 would show it.

---

## 11. What If Two Transactions Have Identical Timestamps?

This is an important test. Imagine:

| ID | created_at |
| :---: | :---: |
| 105 | 10:30:00 |
| 104 | 10:30:00 |
| 103 | 10:30:00 |
| 102 | 10:29:00 |

Suppose page 1 ends at ID 104. The cursor contains:

```json
{
  "createdAt": "2026-11-09T10:30:00.000Z",
  "id": "104"
}
```

The next query uses:

```sql
WHERE (created_at, id) < ($1, $2)
```

It correctly returns ID 103, even though its timestamp is identical to ID 104. This is why the unique ID is essential.

---

## 12. Production Considerations

For a real banking application, I would improve this implementation in the following ways:

| Concern | Production solution |
| :--- | :--- |
| Account security | Get account ID from authenticated JWT/session |
| Cursor tampering | Sign cursor using HMAC |
| Cursor validation | Validate timestamp, ID and cursor version |
| Database performance | Composite index and `EXPLAIN ANALYZE` |
| Concurrent inserts | Cursor pagination with documented consistency semantics |
| Strict historical consistency | Snapshot or fixed upper-bound strategy |
| API security | Rate limiting, authorization and HTTPS |
| Large cursor values | Keep cursor opaque and compact |

One particularly important distinction: **cursor pagination does not guarantee snapshot consistency.**

For example, if a transaction is inserted later with an old, backdated timestamp that falls after the cursor, it could appear in a subsequent page. If you need an absolutely consistent audit-history snapshot, use an appropriate snapshot or versioning strategy.

---

## 13. Test Your Understanding

**1. Why do we use `LIMIT 21` when the frontend requests 20 records?**

- To improve database indexing
- **To determine whether another page exists** ✅
- To prevent duplicate timestamps

*The 21st record tells the backend whether another page exists without running `COUNT(*)`.*

**2. Why do we use `created_at` and `id` together in the cursor?**

- To encrypt the cursor
- **To create deterministic ordering when timestamps are identical** ✅
- To reduce the API response size

*The unique ID is a tie-breaker when multiple transactions share the same timestamp.*

**3. A new transaction is inserted before the cursor. What happens to page 2?**

- It starts returning the new transaction
- **It continues after the previous cursor** ✅
- It skips all remaining transactions

*The cursor represents the last retrieved record, not a row position. Newer inserts before it don't shift the continuation point.*

---

**My recommendation:** Run this implementation locally using Docker Desktop, PostgreSQL and Node.js. Then inspect the SQL with `EXPLAIN ANALYZE` to understand how the composite index helps PostgreSQL retrieve the next 20 records efficiently.
