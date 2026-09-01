# IRCTC Tatkal System Design
It covers the key challenges of a Tatkal booking system:

🚦 Traffic spikes → Load Balancer + API Gateway + Rate Limiting  
⚡ Fast search → Redis Cache  
🎟️ No double booking → Redis Seat Lock + Atomic Inventory Update  
📦 Millions of requests → Kafka + Booking Workers  
💳 Payment reliability → Payment Gateway + Callbacks  
🔄 Payment succeeds but booking fails → Idempotency + Retry + Reconciliation + Refund  
🗄️ Data consistency → Master DB + Replicas  
📊 Production readiness → Monitoring, Logging, Autoscaling, Disaster Recovery  

> **User → Load Balancer → API Gateway → Search/Booking → Kafka → Workers → Inventory → Database → Payment**

## Imagine the interviewer says:
```
"Design an IRCTC-like railway ticket booking system that can handle millions of users during Tatkal opening time."
```

**At 10:00 AM, millions of users may click "Book Now" simultaneously. Our biggest challenges are:**
- Huge traffic spike
- Low latency
- No double booking
- Correct payment handling
- High availability
- Scalability
- Consistency

Let's walk through the diagram from left to right and top to bottom.

## 1. Start with the requirements

As an interviewer, I would first clarify the requirements.

**Functional requirements**

Users should be able to:
- Search trains
- Check availability
- Select seats/berths
- Make payment
- Get a confirmed booking
- View booking/PNR
- Cancel booking

**Non-functional requirements**

For Tatkal, these are extremely important:

| Requirement       | Meaning                                         |
| ----------------- | ----------------------------------------------- |
| High Availability | System should remain usable during huge traffic |
| Low Latency       | Search/booking should respond quickly           |
| No Double Booking | Same seat cannot be assigned to two people      |
| Scalability       | Handle millions of concurrent users             |
| Consistency       | Booking/inventory/payment must remain correct   |

The most important one is:
> **We must never sell the same seat twice.**

## 2. The Tatkal traffic spike

At 10:00 AM:
```
              10:00 AM
                 ↓
        ┌─────────────────┐
        │ Millions of     │
        │ Users           │
        │ "BOOK NOW"      │
        └────────┬────────┘
                 ↓
```
Normally, perhaps 10,000 requests/sec are coming.

At Tatkal opening:
```
Normal traffic:
████

Tatkal traffic:
████████████████████████████
```
This is called a traffic spike.

If all requests directly hit our database:
```
Millions of Users
       ↓
       ↓
       ↓
   Database 💥
```
The database becomes the bottleneck.

So we need multiple layers to protect the backend.

## 3. Load Balancer

The first major component is the Load Balancer.
```
Millions of Users
       ↓
 ┌──────────────┐
 │ Load Balancer│
 └──────┬───────┘
        ↓
   API Servers
```
Suppose we have:
```
API Server 1
API Server 2
API Server 3
API Server 4
API Server 5
```
The Load Balancer distributes incoming requests.

For example:
```
User 1 ─────→ Server 1
User 2 ─────→ Server 3
User 3 ─────→ Server 2
User 4 ─────→ Server 5
User 5 ─────→ Server 1
```

**Why?**

Because we don't want one server handling everything.

We can horizontally scale:
```
1 Server
   ↓
10 Servers
   ↓
100 Servers
```
This gives us scalability and availability.

Interview statement
> **"I would make the API layer stateless and horizontally scalable behind a load balancer."**

That's a good system-design answer.

## 4. API Gateway

Next:
```
Load Balancer
      ↓
┌──────────────┐
│ API Gateway  │
└──────────────┘
```
The API Gateway is the entry point to our backend services.

It can handle:
- Authentication
- Authorization
- Rate limiting
- Request validation
- Routing
- Logging
- API-level security

**For example:**
```
GET /trains
POST /booking
POST /payment
GET /booking/{id}
```
The API Gateway decides where the request should go.
```
                API Gateway
                /         \
               ↓           ↓
        Search Service   Booking Service
```

## 5. Traffic Protection

This part is extremely important during Tatkal.

The diagram shows:
```
Rate Limiting
IP Throttling
Captcha
WAF
```

Why?

Imagine one user writes a script:
```
while(true) {
   bookTicket();
}
```
They could generate thousands of requests.

We don't want one client to consume all capacity.

**Rate Limiting**

For example:
```
100 requests / minute / user
```
If the user exceeds the limit:
```
429 Too Many Requests
```
This protects our services.

**IP throttling**

We can limit suspicious traffic from an IP.

**CAPTCHA**

Useful when we suspect:
- Bots
- Automated scripts
- Credential stuffing
- Ticket scalping automation

**WAF**

A Web Application Firewall protects against malicious HTTP traffic.

For example:
```
SQL Injection
XSS
Malicious requests
Bot traffic
```
So:
```
Internet
   ↓
WAF
   ↓
Rate Limiter
   ↓
API Gateway
```
This protects our infrastructure before requests reach business services.

## 6. Search Service

Now suppose the user searches:
```
Delhi → Mumbai
Date → 15 September
Train → Rajdhani
```
Request:
```
User
 ↓
Load Balancer
 ↓
API Gateway
 ↓
Search Service
```
Search is generally read-heavy.

Millions of users may ask:
> **"How many seats are available?"**

We don't want every search request to hit the database.

That's why we introduce Redis Cache.

## 7. Redis Cache

The diagram shows:
```
             Search Service
                  ↓
             Redis Cache
```
Redis can cache information such as:
```
Train schedules
Fare
Availability
Station information
Train routes
```
For example:
```
GET availability:
Delhi → Mumbai
Train 12345
Date: 15 Sept
```
Instead of:
```
Search Service
      ↓
Database
```
we do:
```
Search Service
      ↓
Redis
      ↓
Availability
```
Redis is much faster than querying the database repeatedly.

## 8. Cache Hit vs Cache Miss

Suppose Redis contains:
```
TRAIN_12345_15SEP
AVAILABLE = 23
```
That's a cache hit.

Very fast.

If the information isn't there:
```
Search Service
      ↓
Redis
      ↓
MISS
      ↓
Database
      ↓
Redis
```
We fetch from DB and populate Redis.

## 9. Important interview point: Redis availability is not authoritative

This is very important.

Suppose Redis says:
```
Available = 5
```
But someone else just booked those seats.

We cannot blindly trust cached availability during the final booking.

So:
> **Search can use eventually consistent cached data, but booking must perform an authoritative inventory check. This distinction is excellent to mention in an interview.**

## 10. Booking Service

Now the user clicks:
> **Book Now**

The request goes:
```
User
 ↓
Load Balancer
 ↓
API Gateway
 ↓
Booking Service
```
This is the critical path.

Unlike search, booking involves writes and concurrency.

Imagine:
```
Seat A1

User A → Book A1
User B → Book A1
User C → Book A1
```
All three requests arrive at almost exactly the same time.

We need to ensure:
```
Only ONE user gets A1.
```
This is our biggest system-design challenge.

## 11. Why direct database booking is difficult

Suppose we have:
```
SELECT seat
WHERE seat = 'A1'
AND status = 'AVAILABLE';
```
User A checks:
```
A1 = AVAILABLE
```
User B checks:
```
A1 = AVAILABLE
```
Both see available.

Then:
```
User A → UPDATE A1 = BOOKED
User B → UPDATE A1 = BOOKED
```
We have a race condition.

Potentially:
```
A1 → User A
A1 → User B

💥 Double booking
```
We cannot allow this.

## 12. Redis Seat Lock

The diagram introduces:
```
Booking Service
      ↓
Inventory Service
      ↕
Redis Seat Lock
```
We temporarily lock the seat.

For example:
```
Seat A1
Status = AVAILABLE
```
User A requests A1.

We create:
```
A1 → LOCKED → User A
```
with a timeout.

For example:
```
Lock:
A1
User: U123
TTL: 5 minutes
```

## 13. Why TTL?

Imagine the user locks the seat and then:
- closes browser
- loses internet
- doesn't pay
- abandons the transaction

If the lock never expires:
```
A1 → LOCKED FOREVER
```
That's terrible.

So we use:
```
A1 → LOCKED
       ↓
    5 minutes
       ↓
   LOCK EXPIRES
       ↓
   AVAILABLE
```
This prevents inventory from being permanently blocked.

## 14. But Redis lock alone is NOT enough

This is an important interview discussion.

Redis is useful for fast distributed locking, but the database remains the durable source of truth.

The final inventory update should be atomic.

Conceptually:
```
UPDATE seats
SET status = 'BOOKED'
WHERE seat_id = 'A1'
AND status = 'AVAILABLE';
```
Then check:
```
rows_updated == 1
```
If:
```
1 row updated

→ booking succeeded.
```
If:
```
0 rows updated

→ someone else already took it.
```
This is an atomic inventory update.

## 15. Inventory Service

The diagram has:
```
Booking Workers
      ↓
Inventory Service
      ↓
Database
```
The Inventory Service owns things such as:
- Seat
- Berth
- Train inventory
- Availability
- PNR-related inventory state

Its job is essentially:
> **Who owns which seat?**

It must be highly consistent.

## 16. Kafka / Message Queue

Now we reach another critical component:
```
Booking Service
      ↓
Kafka
      ↓
Booking Workers
```
Why don't we process everything synchronously?

Imagine:
```
10:00 AM

5 million booking requests
```
If every request immediately performs:
```
Booking
 ↓
Inventory
 ↓
Payment
 ↓
Database
```
the backend may become overwhelmed.

Instead:
```
Users
  ↓
Booking Service
  ↓
Kafka
  ↓
Workers
  ↓
Inventory
```
Kafka acts as a buffer.

## 17. Kafka smooths traffic spikes

Suppose our workers can process:
```
50,000 bookings/sec
```
But users generate:
```
500,000 requests/sec
```
Instead of crashing:
```
500k requests
      ↓
    Kafka
      ↓
Workers process at their capacity
```
The requests wait in the queue.

This is called backpressure / traffic smoothing.

## 18. Why Kafka?

Kafka gives us:
- Durable messages
- High throughput
- Horizontal scalability
- Consumer groups
- Replay capability
- Decoupling between services

For example:
```
Booking Service
       ↓
     Kafka
       ↓
 ┌─────┼─────┐
 ↓     ↓     ↓
W1    W2    W3
```
We can add more workers:
```
W1 W2 W3 W4 W5 W6 W7...
```
when traffic increases.

## 19. Booking Workers

Workers consume messages from Kafka.

Example message:
```
{
  "bookingId": "B123",
  "userId": "U456",
  "trainId": "T789",
  "seatId": "A1"
}
```
Worker processes:
```
Kafka
 ↓
Booking Worker
 ↓
Inventory Service
 ↓
Seat Lock
 ↓
Database
```
Workers allow the booking process to be asynchronous.

## 20. But what does the user see?

This introduces an important design decision.

The user might initially receive:
```
Booking Request Accepted

Booking ID: B123
Status: PROCESSING
```
Then the system processes it.

Eventually:
```
PROCESSING
    ↓
CONFIRMED
```
or:
```
PROCESSING
    ↓
FAILED
```
The frontend can:
- Poll status
- Receive WebSocket/SSE notification
- Refresh booking status

## 21. Database

The diagram shows:
```
Inventory Service
       ↓
┌────────────────────┐
│ Database           │
│ Master + Replicas  │
└────────────────────┘
```
The database stores durable information:
- Users
- Trains
- Seats
- Bookings
- Payments
- PNR
- Transactions

## 22. Master + Read Replicas

We can use:
```
                 ┌─────────────┐
                 │   Master DB │
                 └──────┬──────┘
                        │
             ┌──────────┴──────────┐
             ↓                     ↓
        Replica 1             Replica 2
```
Writes:
```
Booking
   ↓
Master

Reads:

Search
   ↓
Replica
```
This distributes read traffic.

## 23. Critical distinction: Booking writes should be strongly consistent

We don't want:
```
User A books A1
       ↓
Master updated
       ↓
Replica hasn't caught up
       ↓
User B sees A1 available
```
For normal search, a small amount of staleness may be acceptable.

But final booking cannot depend on stale replica data.

Therefore:
> **Use replicas for scalable reads, but authoritative inventory decisions should use the primary/strongly consistent path.**

## 24. Payment Service

Now comes payment.
```
Booking Service
      ↓
Payment Service
      ↓
Payment Gateway
      ↓
Razorpay / PayU / etc.
      ↓
External Bank / UPI / Card Network
```
The Payment Service handles:
- Payment creation
- Payment verification
- Payment status
- Refunds
- Payment callbacks/webhooks

## 25. Why do we need a Payment Service?

We don't want the Booking Service directly talking to multiple payment providers.

Instead:
```
Booking
   ↓
Payment Service
   ↓
Payment Gateway
   ↓
Provider
```

Later we can switch providers:
- Razorpay
- PayU
- Stripe
- Other provider

without changing the core booking logic.

## 26. Payment callback

Payment providers are external systems.

The user may pay successfully but our server might not immediately know.

For example:
```
User
 ↓
Payment Provider
 ↓
Payment SUCCESS
```
But:
```
Our Booking Service
        ↓
Network failure
```
Our system may temporarily think:
```
Payment = UNKNOWN
```
Therefore the payment provider sends a callback/webhook:
```
Payment Provider
      ↓
Webhook
      ↓
Payment Service
      ↓
Booking Service
```
## 27. The hardest scenario

The diagram correctly highlights:
> **What if payment succeeds but booking fails?**

This is one of the most important interview questions.

Example:
```
User pays ₹1,500
       ↓
Payment SUCCESS
       ↓
Inventory update fails
```
Now:
```
Money taken ❌
Ticket not booked ❌
```
That's a bad user experience.

We need reliability mechanisms.

## 28. Idempotency Keys

Suppose the frontend sends:
```
POST /payment
```
But due to a network timeout, it retries.

We don't want:
```
Payment 1 → ₹1500
Payment 2 → ₹1500
```
Total:
```
₹3000 💥
```
Instead the client sends:
```
Idempotency-Key: ABC123
```
Our service stores:
```
ABC123 → Payment P1 → SUCCESS
```
If the same request comes again:
```
ABC123
```
we return the previous result.

No duplicate payment.

## 29. Booking State Machine

The diagram mentions:
- Pending
- Confirmed
- Failed
- Expired

This is a very good design.

Instead of simply:
```
booking = true/false
```
we use states:
```
PENDING
   ↓
PAYMENT_PENDING
   ↓
CONFIRMED
```
or:
```
PENDING
   ↓
FAILED
```
or:
```
PENDING
   ↓
EXPIRED
```

For example:
```
Booking B123

Status: PENDING
Payment: PENDING
Seat: LOCKED
```

After payment:
```
Status: CONFIRMED
Payment: SUCCESS
Seat: BOOKED
```

## 30. Retry

Suppose a temporary network problem occurs:
```
Booking Worker
      ↓
Inventory Service
      X
 Network timeout
```
We can retry.
```
Attempt 1 → Failed
Attempt 2 → Failed
Attempt 3 → Success
```
But retries must be idempotent.

Otherwise:
```
Retry
 ↓
Duplicate booking
```
So:

Retry + Idempotency go together.

## 31. Reconciliation

Sometimes systems disagree.

For example:
```
Payment Provider:
SUCCESS

Our Database:
PENDING
```
We need a reconciliation process.

Periodically:
```
Reconciliation Job
       ↓
Compare
       ↓
Payment Provider
       ↕
Our Database
```
If payment succeeded but booking failed:
```
Payment SUCCESS
Booking FAILED
       ↓
Refund
```
This is why the diagram includes:
> **Retry + Reconciliation + Compensation/Refund**

## 32. Compensation / Refund

Distributed transactions are difficult.

We don't normally want one giant transaction across:
```
Booking DB
Payment Provider
Inventory
Kafka
```
because these are separate systems.

Instead, we use a Saga-like approach / compensating actions.

Example:
```
Seat locked
     ↓
Payment successful
     ↓
Booking failed
     ↓
Release seat
     ↓
Refund payment
```
That's a compensation flow.

## 33. Complete booking flow

Now let's connect everything.

### Step 1 — User searches
```
User
 ↓
Load Balancer
 ↓
API Gateway
 ↓
Search Service
 ↓
Redis
```
Fast response.

### Step 2 — User selects a train/seat
```
User
 ↓
Booking Service
```

### Step 3 — Seat lock
```
Booking Service
 ↓
Inventory Service
 ↓
Redis Seat Lock
```

Example:
```
A1 → LOCKED → User123
TTL = 5 min
Step 4 — Booking request
Booking Service
 ↓
Kafka
```
Kafka stores the booking event.

### Step 5 — Worker consumes
```
Kafka
 ↓
Booking Worker
 ↓
Inventory Service
```

### Step 6 — Atomic inventory update
```
Inventory
 ↓
Database
```
Something like:
```
AVAILABLE
    ↓
BOOKED
```
atomically.

### Step 7 — Payment
```
Payment Service
 ↓
Payment Gateway
 ↓
External Provider
Step 8 — Payment callback
Payment Provider
 ↓
Payment Service
 ↓
Booking
```

### Step 9 — Final state

Success:
```
Booking
   ↓
CONFIRMED

Failure:

Booking
   ↓
FAILED
   ↓
Release Seat
   ↓
Refund if necessary
```

## 34. Why not put everything into one service?

The interviewer may ask:
> **"Why do we need Search, Booking, Payment and Inventory as separate services?"**

Because they have different characteristics.
```
Search
Read-heavy
Cache-friendly
Can tolerate some staleness
Booking
Write-heavy
Concurrency-sensitive
Needs strong consistency
Payment
External dependency
Security-sensitive
Requires idempotency
Inventory
Critical resource
Concurrency-sensitive
Needs atomic updates
```
Separating them allows independent scaling and ownership.

## 35. High availability

Suppose one API server crashes.

We should still have:
```
          Load Balancer
          /     |     \
         ↓      ↓      ↓
       API1   API2    API3
        ❌      ✓       ✓
```
Traffic goes to healthy servers.

Similarly, we can run:
- Kafka brokers
- Redis nodes
- Database replicas
- Multiple worker instances
- across availability zones.

## 36. Autoscaling

Tatkal traffic is highly predictable.

Before 10 AM:
```
Low traffic
↓
Few servers
```
Around 10 AM:
```
Huge traffic
↓
Scale out
```
After Tatkal:
```
Traffic drops
↓
Scale down
```
We can autoscale based on:
- CPU
- Memory
- Request rate
- Kafka consumer lag
- Queue depth
- Latency

For Kafka workers, consumer lag is especially useful.

## 37. Monitoring

The diagram mentions:
- Prometheus
- Grafana

We need metrics such as:
```
Requests/sec
Latency
Error rate
CPU
Memory
Kafka lag
Redis hit ratio
DB connections
Booking success rate
Payment success rate
```
For example:
```
Booking Success Rate = 99.8%
Payment Failure Rate = 1.2%
Kafka Lag = 50,000 messages
P95 Latency = 180 ms
```
If Kafka lag suddenly becomes:
```
50,000 → 500,000 → 2 million
```
we know workers aren't keeping up.

## 38. Logging

We need centralized logs.

Example:
```
bookingId = B123
userId = U456
paymentId = P789
```
Then we can trace:
```
Request
 ↓
Booking
 ↓
Kafka
 ↓
Worker
 ↓
Inventory
 ↓
Payment
```
This is called distributed tracing/correlation when combined with trace IDs.

## 39. Disaster Recovery

What if our database fails?

We need:
- Backups
- Replication
- Point-in-time recovery
- Multi-AZ deployment
- Disaster recovery strategy

The goal is:
> **Don't lose confirmed bookings.**

## 40. Security

For a real IRCTC-like system, security is also critical.

We should have:
```
HTTPS/TLS
Authentication
Authorization
WAF
Rate limiting
CAPTCHA
Encryption
Secure payment handling
Audit logs
Secrets management
```
Never log sensitive information such as:
- Card number
- CVV
- Passwords
- Authentication tokens

## 41. The most important consistency problem

Let's focus on the interviewer asking:
> **"How exactly do you prevent double booking?"**

A strong answer would be:
> **"I would use a short-lived distributed seat lock for fast coordination, but I would not rely on Redis as the final source of truth.
> The Inventory Service would perform an atomic conditional update in the authoritative database,
> such as updating a seat from AVAILABLE to BOOKED only if its current state is AVAILABLE.
> Only the transaction that successfully updates one row wins the seat. Idempotency keys prevent duplicate processing during retries."**

That's a very strong interview answer.

## 42. What happens when 1000 users want the same seat?

Suppose:
```
Seat A1
```
1000 users request it.
```
U1 ─┐
U2 ─┤
U3 ─┤
... ├──→ Inventory
U999─┤
U1000┘
```
Only one should succeed.

Conceptually:
```
A1 = AVAILABLE

Request U1:
AVAILABLE → BOOKED ✅

Request U2:
AVAILABLE? ❌

Request U3:
AVAILABLE? ❌

...
```
Therefore:
```
U1 → CONFIRMED
U2 → FAILED
U3 → FAILED
...
```
No double booking.

## 43. What happens if Redis crashes?

Good interview question.

We should not treat Redis as the ultimate source of truth.

Redis is primarily:
```
Fast coordination/cache
```
The durable truth is:
```
Database
```
If Redis fails:
```
Redis ❌
```
we can fail closed for critical seat-lock operations, or use another locking/coordination strategy depending on the architecture.

We should never say:
```
"Redis is our database."
```
Instead:

Redis accelerates and coordinates; the authoritative database guarantees durable inventory state.

## 44. What happens if Kafka crashes?

We don't want booking events to disappear.

Kafka can be deployed with:
```
Broker 1
Broker 2
Broker 3
```
with replication.

Messages are persisted according to configured durability guarantees.

Workers can resume processing after recovery.

## 45. What happens if the worker crashes?

Suppose:
```
Kafka
 ↓
Worker 1
 ↓
Inventory update
 ↓
Worker crashes
```
Kafka can redeliver the message depending on consumer offset/acknowledgment behavior.

But that's why we need:
```
Idempotency
```
The second attempt shouldn't create another booking.

## 46. Search vs Booking consistency

This is another excellent interview point.

Search

Can be:

Eventually consistent

because:

Redis says 3 seats

and perhaps one seat was sold milliseconds ago.

That's acceptable for displaying search results.

Booking

Must be:

Strongly consistent

because we cannot confirm a seat that has already been sold.

Therefore:
- Search → Cache → Fast
- Booking → Authoritative Inventory → Correct

## 47. Why asynchronous processing?

The architecture intentionally separates:

Request acceptance

from:
```
Heavy processing
```
Instead of:
```
User
 ↓
Booking
 ↓
Inventory
 ↓
Payment
 ↓
Everything
 ↓
Response
```
we can do:
```
User
 ↓
Booking API
 ↓
Kafka
 ↓
Worker
 ↓
Inventory
 ↓
Payment
```
This allows the system to absorb spikes.

But remember:

Asynchronous processing improves scalability, but it introduces eventual consistency and more complex state management.

That's a trade-off worth mentioning in an interview.

## 48. Complete architecture

Putting everything together:
```
                         MILLIONS OF USERS
                                │
                                ▼
                        ┌───────────────┐
                        │ Load Balancer │
                        └───────┬───────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  API Gateway  │
                        │ Auth / Rate   │
                        │ Limit / WAF   │
                        └───────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
             ┌─────────────┐        ┌──────────────┐
             │   Search    │        │   Booking    │
             │   Service   │        │   Service    │
             └──────┬──────┘        └──────┬───────┘
                    │                      │
                    ▼                      ▼
             ┌─────────────┐         ┌────────────┐
             │    Redis    │         │   Kafka    │
             │   Cache     │         └─────┬──────┘
             └─────────────┘               │
                                           ▼
                                   ┌───────────────┐
                                   │    Booking    │
                                   │    Workers    │
                                   └───────┬───────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │   Inventory   │
                                   │    Service    │
                                   └───────┬───────┘
                                           │
                                    ┌──────┴──────┐
                                    │             │
                                    ▼             ▼
                              Redis Lock      Database
                                               Master
                                               /   \
                                              ▼     ▼
                                           Replica Replica
```
```

       Booking
          │
          ▼
    Payment Service
          │
          ▼
    Payment Gateway
          │
          ▼
 External Payment Provider
          │
          ▼
       Callback
          │
          ▼
    Payment Service
```

## 49. The interviewer summary

If the interviewer says:
> **"Summarize your design."**

You can answer:
```
"For the Tatkal booking system, I would put a load balancer and API Gateway in front of horizontally scalable stateless services.
WAF, rate limiting and CAPTCHA protect us from abusive traffic. Search is read-heavy, so I would use Redis for train, fare and availability caching.
Booking is write-heavy and concurrency-sensitive, so the Inventory Service would use short-lived seat locks and atomic database updates to prevent double booking.
Booking requests can be placed on Kafka to absorb Tatkal traffic spikes and processed by scalable workers.
Payment would be isolated behind a Payment Service and external payment gateway, with idempotency keys, callbacks, retries, reconciliation and compensating refunds to handle failures. The database would use a primary for authoritative writes and replicas for scalable reads. Finally, Prometheus/Grafana, centralized logging, autoscaling, backups and disaster recovery provide operational reliability."
```
That's the 2-minute interview version.

## 50. The 5 concepts you absolutely must remember

If you're a fresher, don't try to memorize every box. Understand these five core ideas:

### ① Load Balancer

Distributes millions of requests across servers.
```
Millions of users
       ↓
Load Balancer
   ↓   ↓   ↓
 API API API
```

### ② Redis

Makes frequent reads and temporary locks very fast.
```
Search → Redis → Fast
Seat   → Redis Lock → Prevent contention
```

### ③ Kafka

Absorbs traffic spikes and decouples services.
```
Millions
   ↓
 Kafka
   ↓
Workers
````

### ④ Atomic Inventory Update

Prevents double booking.
```
AVAILABLE
    ↓
BOOKED
````
Only one transaction is allowed to win.

### ⑤ Idempotency + Reconciliation

Protects us from retries, duplicate payments, and distributed failures.
```
Payment SUCCESS
      +
Booking FAILURE
      ↓
Reconciliation
      ↓
Refund
```

## 🧠 The easiest way to remember the entire architecture

Think of the system as 5 layers:
```
1. PROTECT
   WAF + Rate Limit + CAPTCHA

             ↓

2. DISTRIBUTE
   Load Balancer + API Gateway

             ↓

3. SPEED
   Redis Cache + Redis Seat Lock

             ↓

4. ABSORB
   Kafka + Booking Workers

             ↓

5. GUARANTEE
   Inventory + Atomic DB Update
   + Idempotency + Reconciliation
```

And the one sentence to remember for an interview is:
> **"Cache for speed, Kafka for spikes, locks for coordination, atomic DB updates for correctness, and idempotency/reconciliation for reliability."**

That sentence captures the core design of the entire diagram.

