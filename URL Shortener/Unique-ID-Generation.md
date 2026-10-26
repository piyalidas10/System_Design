# URL Shortener: Unique ID Generation (Concepts)

**Problem:** the user submits a long URL and the system returns a short one, e.g. `https://tiny.url/<id>`. Only the `<id>` part changes, so we need a way to generate that ID **uniquely, quickly, and at scale**. This ID problem appears in many systems, not just URL shorteners (tweets, orders, messages, etc.).

```
https://www.example.com/some/very/long/path?x=1&y=2   -->   https://tiny.url/aZ3x9Q
```

---

## 1. Requirements for the ID

### Functional
| Requirement | Meaning |
|---|---|
| **Unique** | Two different long URLs must never get the same short ID |
| **Deterministic / retrievable** | Long URL -> short URL, and short URL -> original long URL, quickly |
| **Mapping is preserved** | The short ID <-> long URL mapping must stay intact (stored in a DB) |

### Non-functional
| Requirement | Meaning |
|---|---|
| **Scalable** | Must handle billions of URLs |
| **No collisions** | Same ID must never be issued twice |
| **Fast generation** | Slow generation means a bad user experience |
| **Works in a distributed system** | Servers in several regions (US, UK, India, Australia) must still produce globally unique IDs |
| **Short length** | Typically 6-8 characters |

---

## 2. Approach 1: Random String Generation

Use the Base62 alphabet (`0-9` = 10, `a-z` = 26, `A-Z` = 26, total **62**) and pick 6 random characters.

- Each position has 62 possibilities, so the total space is **62^6 = 56,800,235,584** (about 56.8 billion).
- Simple, but it has a major problem: **collisions**.

### Why collisions are inevitable: the Birthday Paradox
In a room of **23 people**, the probability that at least two share a birthday is about **50%**, even though there are 365 possible days. This is counter-intuitive but true.

```
P(at least 2 share a birthday) = 1 - P(no one shares a birthday)

P(no match) = (365/365) x (364/365) x (363/365) x ... x (343/365)  ≈ 0.493
P(match)    = 1 - 0.493 ≈ 0.507  (~50%)
```

Generalized: with **N** possible values, once you have already generated about **sqrt(N)** values, the chance that the next one collides becomes significant (roughly 50% or more).

For us: sqrt(62^6) = 62^3 = **238,328**. After only ~238K IDs, collisions become likely, which is tiny compared to billions of URLs.

### Practical consequences of collisions
- Every generated ID must first be **checked against the DB**; if it already exists, regenerate.
- More DB reads -> **higher load on the DB**.
- Retries -> **slower ID creation**.
- Hence it is **not scalable**.

---

## 3. Approach 2: Hash of the Original URL (e.g. MD5) + Truncate

1. Compute `MD5(long_url)`.
2. Take the first 6 characters (truncate).
3. Use that as the ID.

- Pros: fast, simple, practically unlimited inputs.
- Cons:
  - **Hashing itself can collide.**
  - **Truncation makes collisions far more likely** (a full 128-bit hash is reduced to ~6 characters).
  - Collisions again mean DB lookups and retries -> load and latency.

---

## 4. Approach 3: Auto-Increment ID + Base62 Encoding

- A DB primary key is unique and auto-generated: `1, 2, 3, ...`.
- The raw number can grow large (e.g. `1287652968`), but we need a **short (6-char) ID**, so we encode the number in **Base62**.

### Base62 encoding by repeated division
Example: ID = **125**

```
125 / 62 = 2  remainder 1
  2 / 62 = 0  remainder 2

Read remainders in reverse -> 2, 1 -> "21"
```

So `125` becomes `21` in Base62 (each digit maps to a character in `0-9a-zA-Z`). Analogy: decimal has 10 symbols, binary has 2, Base62 has 62.

```python
ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def base62_encode(n: int) -> str:
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, r = divmod(n, 62)
        out.append(ALPHABET[r])
    return "".join(reversed(out))
```

- Pros: guaranteed unique, no collision checks, simple.
- **Cons (distributed systems):** with multiple databases, each may generate `1, 2, 3...` independently -> **duplicate IDs across DBs**.

### Possible fix: range allocation
Give each DB/machine its own range:
- Machine 1: `1 .. 1 billion`
- Machine 2: `1 billion .. 2 billion`
- Machine 3: `2 billion+`

This works, but you must **manage state and metadata** about ranges, which gets complicated in a distributed system.

> **KISS** (Keep It Simple, Stupid): the simpler the design, the better it tends to work.

---

## 5. Approach 4: UUID (Universally Unique Identifier)

- Easy and effectively unique without coordination.
- Cons:
  - **Too long** (128 bits / 36 chars) for a short URL.
  - Truncating it to fit brings **collision risk back**.
  - Generation and handling are heavier than needed.

---

## 6. Approach 5: Twitter Snowflake (Distributed ID Generator)

Twitter needed a unique ID for every tweet at massive scale. Their solution is **Snowflake**: a centralized ID-generator service producing **64-bit** IDs.

```
| 1 bit  |      41 bits      |   10 bits   |   12 bits   |
|  sign  |    timestamp      |  machine ID |  sequence   |
```

| Part | Bits | Purpose |
|---|---|---|
| Sign bit | 1 | Unused/kept 0 so the ID stays positive |
| Timestamp | 41 | Milliseconds since a custom epoch; makes IDs time-sortable |
| Machine ID | 10 | Identifies the generating machine/node (up to 1024) |
| Sequence | 12 | Counter for multiple IDs in the same millisecond on one machine (up to 4096) |

(1 + 41 + 10 + 12 = 64 bits.)

- Because timestamp + machine ID + sequence are combined, the ID is **always unique**, even across many servers.
- Works very well in **distributed, scalable** environments.
- Good to remember: interviewers sometimes ask you to **design Snowflake itself**.

---

## 7. Final Design for the URL Shortener

1. Generate a unique **64-bit ID** using a Snowflake-style centralized ID service.
2. **Base62-encode** it and keep it to a **6-character** short code (`0-9`, `a-z`, `A-Z`).
3. **Store the mapping** `short_id -> long_url` in the database.
4. Return the short URL to the user.

> Note: a Snowflake ID is 64 bits (up to ~19 decimal digits, around 11 Base62 characters). To meet a strict 6-character limit you need a different strategy, e.g. a smaller counter-based ID space or a range/ticket-server approach, because 62^6 ≈ 56.8 billion is smaller than the full 64-bit range.

---

## 8. Comparison Summary

| Approach | Unique? | Collision risk | Distributed-friendly | Short output | Notes |
|---|---|---|---|---|---|
| Random Base62 string | No guarantee | High (Birthday Paradox) | Yes, but needs DB check | Yes | Retries, more DB load |
| Hash (MD5) + truncate | No guarantee | High (esp. after truncation) | Yes, but needs DB check | Yes | Deterministic per URL, still collides |
| Auto-increment + Base62 | Yes (single DB) | None (single DB) | Needs range/state management | Yes | Simple, complex when sharded |
| UUID | Practically yes | Low (full) / higher (truncated) | Yes | No (too long) | Needs truncation to be short |
| Snowflake | Yes | None | Yes | No (64-bit) | Time-sortable, needs ID service |

---

## 9. Key Takeaways
- **Collisions** are the central challenge; the **Birthday Paradox** shows they appear after ~sqrt(N) IDs.
- **Counter + Base62** is simple and short but needs coordination across databases.
- **Snowflake-style IDs** are the standard answer for unique IDs in distributed systems.
- **Base62 is encoding, not encryption**; it only changes how an integer is represented.
- Always **persist the short <-> long mapping** in the database.

See also: [Base62 encoding](../Encoding%20Algorithm/Base62-encoding.md)
