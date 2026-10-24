# How GraphQL Increases Performance When Calling REST APIs

## The Core Question

> If GraphQL still calls REST APIs on the backend, and the same REST APIs take the same time to respond, why would GraphQL be faster?

Your understanding is correct. **GraphQL does not automatically make data fetching faster** just because it uses GraphQL instead of REST. If the GraphQL server calls the same REST APIs sequentially and returns the same amount of data, it may take the same time or longer.

The real advantage comes from **reducing the number of network requests**, **fetching only the required fields**, and **combining data from multiple services efficiently**.

<img src="./GraphQL Performance Infographic-1.png" width="100%" />

---

## Scenario A: Calling REST APIs Directly

Suppose your Angular application needs to display a user profile containing:

- User details
- Bank account details
- Recent transactions

Your frontend makes **three separate REST API calls**:

```
GET /api/users/101
GET /api/accounts/101
GET /api/transactions/101
```

Each API may be called independently. The frontend must combine the responses.

| Execution Model | Time (each API = 200 ms) |
|---|---|
| Sequential calls | ~600 ms + overhead |
| Parallel calls (`forkJoin` / `Promise.all`) | ~200 ms + overhead |

> **Important:** REST does not require sequential calls. Angular can use `forkJoin` or `Promise.all()` to call them in parallel.

---

## Scenario B: Calling GraphQL

Instead of three requests, the Angular frontend sends **one GraphQL query**:

```graphql
query {
  user(id: "101") {
    name
    email
    accounts {
      accountNumber
      balance
    }
    recentTransactions {
      amount
      date
    }
  }
}
```

The GraphQL server internally calls the necessary resolvers, each of which may call a downstream REST API or database. It combines the results and returns only the requested fields.

```
Angular Frontend
    │
    └── POST /graphql  (one request)
            │
            ├── User Resolver     → GET /api/users/101
            ├── Account Resolver  → GET /api/accounts/101
            └── Transaction Resolver → GET /api/transactions/101
                        │
                (executed in parallel on the server)
                        │
            ◄── One combined JSON response ──
```

> **Key point:** One frontend request does not mean one backend request. The GraphQL server may still call multiple REST APIs — the difference is *where* the coordination happens and *how* it is executed.

Instead, your Angular application sends one GraphQL query asking for precisely the data it needs.

A system where the frontend makes sequential REST calls and the GraphQL server can replace them with concurrent downstream calls.

GraphQL can reduce end-to-end latency by consolidating client requests, enabling efficient parallel orchestration, and reducing unnecessary data transfer. It does not inherently make the underlying REST APIs faster.

GraphQL does not automatically execute REST API calls in parallel, and internal server networking is not always faster enough to explain the difference.

Suppose three REST APIs each take 200 ms to respond.

### A. Direct REST — Sequential Calls
The frontend waits for each response before starting the next request.

<img src="./Direct REST — Sequential Calls.webp" width="100%" />

Total: approximately 600 ms

### B. GraphQL — Parallel Downstream Calls
All three independent requests begin at approximately the same time.

<img src="./GraphQL — Parallel Downstream Calls.webp" width="100%" />

Total: approximately 200 ms

Plus request overhead, GraphQL processing, and response delivery.


### C. Combined comparison diagram

<img src="./Combined comparison diagram.webp" width="100%" />

Total: approximately 200 ms

Plus request overhead, GraphQL processing, and response delivery.


---

## Phase-by-Phase Execution Comparison

| Phase | Direct Sequential REST (Client-Driven) | GraphQL Gateway (Parallelized) | Why GraphQL can win |
|---|---|---|---|
| **Request Phase** | 3 separate HTTP requests over public internet | 1 single HTTP request over public internet | Eliminates multiple network handshakes |
| **Execution Phase** | Client waits sequentially: 200ms → 200ms → 200ms | Server fires all 3 requests concurrently over fast internal network | Reduces backend wait from 600ms to 200ms |
| **Processing Phase** | Client browser parses 3 separate JSON payloads | GraphQL server filters fields and shapes one JSON | Heavy processing on the server, not the client device |
| **Response Phase** | 3 separate payloads downloaded over mobile/wifi | 1 optimised payload sent to client | Saves bandwidth; faster frontend rendering |

---

## The Crucial Comparison: What If REST Also Runs in Parallel?

| Approach | Approximate time (3 independent 200 ms APIs) |
|---|---|
| Frontend calls REST **sequentially** | 600 ms + overhead |
| Frontend calls REST **in parallel** (`Promise.all`) | 200 ms + overhead |
| GraphQL calls REST **in parallel** | 200 ms + gateway overhead |

If the frontend **already uses `Promise.all()`** to call REST APIs concurrently, GraphQL may not make the operation faster. In fact, it adds an extra network hop and resolver processing overhead.

> GraphQL becomes a performance advantage when the **frontend cannot or does not** coordinate parallel calls efficiently — for example, a mobile app on a high-latency network.

---

## Does the Internal Network Make GraphQL Faster?

Sometimes, but it is not guaranteed.

- A **mobile client** communicating with public REST endpoints faces high-latency connections.
- A **GraphQL server** communicating with downstream services over a private data-center network has near-zero internal latency.
- However, the GraphQL server must still **wait for the downstream services** to execute and return their data.
- If a downstream service takes 500 ms to query a database, placing GraphQL in front of it does **not** eliminate that 500 ms.
- A GraphQL resolver may also call another resolver **sequentially** if a data dependency requires it. Parallelism depends on the implementation and the dependency graph.

---

## Where GraphQL Provides a Real Performance Benefit

### 1. Reducing Frontend Round Trips
A mobile app on a slow network benefits from fetching profile, account, and transaction data through **one request instead of three**, avoiding multiple TCP/TLS handshakes and round trips.

### 2. Avoiding Over-fetching
A dashboard that needs only a user's name and account balance can request exactly those fields. REST often returns full objects regardless of what the client needs.

### 3. Parallel Orchestration and Batching
The GraphQL server can fetch independent data concurrently and batch repeated lookups — provided the resolvers and data sources are designed to do so.

---

## The N+1 Problem: A GraphQL Pitfall

A **poorly designed** GraphQL server can be *slower* than direct REST calls:

> Fetching 100 users and then making one separate account request per user results in **101 backend calls**.

Solutions:
- **DataLoader** — batches and deduplicates requests within a single execution tick.
- **Better query design** — join data at the source where possible.

---

## Does GraphQL Automatically Reduce Response Payload?

Not necessarily.

GraphQL lets the client select fields, but the **server must implement that selection efficiently**. If a resolver fetches a large REST response and then discards most of it, the server still pays the cost of downloading and processing the full response from the downstream service.

The client receives only the requested fields, but the overall system may not transfer less data unless the downstream APIs support field-level filtering too.

---

## Summary

| Question | Answer |
|---|---|
| Does GraphQL make individual REST APIs faster? | **No.** The backend processing time is unchanged. |
| Does GraphQL reduce frontend HTTP requests? | **Yes**, often to one. |
| Does GraphQL automatically parallelize resolver calls? | **Only if implemented that way.** It is not automatic. |
| Is GraphQL always faster than REST? | **No.** A well-designed REST frontend using parallel calls is comparable. |
| Where does GraphQL clearly win? | Mobile clients, over-fetching, orchestrating multiple services, developer ergonomics. |

> **Think of GraphQL as an API layer that changes how the client requests and receives data — not as a replacement for the underlying data sources.**
>
> Performance depends on: network round trips, concurrency, payload size, caching, batching, and backend response times.

---

## Related Topics

- [API Fundamentals Part 1](./System_Design_API_Fundamentals_Part1.md)
- [API Fundamentals Part 2](./System_Design_API_Fundamentals_Part2.md)
