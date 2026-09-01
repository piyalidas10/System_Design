 # IRCTC Tatkal System Design

A production-grade system design for the IRCTC Tatkal booking platform — one of the highest-concurrency ticketing systems in the world. Tatkal booking opens at **10:00 AM sharp** and millions of users attempt to book simultaneously.

---

## System Architecture Diagram

```
                            ┌─────────────────────────────────────────────────────────────────────┐
                            │                          CLIENTS                                     │
                            │          Browser / Mobile App / IRCTC App / Third-party APIs        │
                            └────────────────────────────┬────────────────────────────────────────┘
                                                         │ HTTPS
                                                         ▼
                            ┌─────────────────────────────────────────────────────────────────────┐
                            │                        CDN (Cloudflare / Akamai)                    │
                            │          Static Assets · Train Search Pages · CSS/JS Bundles        │
                            └────────────────────────────┬────────────────────────────────────────┘
                                                         │
                                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     LOAD BALANCER  (AWS ALB / Nginx)                                 │
│                        Round-robin · Health checks · SSL Termination · DDoS protection               │
└───────────────┬──────────────────────────────┬──────────────────────────────┬───────────────────────┘
                │                              │                              │
                ▼                              ▼                              ▼
   ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
   │   API Gateway #1   │         │   API Gateway #2   │         │   API Gateway #3   │
   │  ─────────────── │         │  ─────────────── │         │  ─────────────── │
   │  Rate Limiting    │         │  Rate Limiting    │         │  Rate Limiting    │
   │  Auth (JWT/OAuth) │         │  Auth (JWT/OAuth) │         │  Auth (JWT/OAuth) │
   │  Request Routing  │         │  Request Routing  │         │  Request Routing  │
   │  Idempotency Keys │         │  Idempotency Keys │         │  Idempotency Keys │
   └────────┬───────────┘         └────────┬───────────┘         └────────┬───────────┘
            │                              │                              │
            └──────────────┬───────────────┘                              │
                           │          (Autoscaled — 10–100 instances)     │
                           ▼                                               │
        ┌──────────────────────────────────────────────────────────────────┘
        │
        ├──────────────────────────────────────────────────────────────────────────┐
        │                                                                          │
        ▼                                                                          ▼
┌───────────────────────────────┐                              ┌───────────────────────────────┐
│       SEARCH SERVICE          │                              │      BOOKING SERVICE          │
│  ─────────────────────────── │                              │  ─────────────────────────── │
│  Train availability lookup   │                              │  Initiate booking request     │
│  Seat availability (cached)  │                              │  Generate booking_ref UUID    │
│  Coach/class filter          │                              │  Validate idempotency key     │
│  ETA / quota status          │                              │  Acquire Redis seat lock      │
└───────────┬───────────────────┘                              └───────────┬───────────────────┘
            │                                                              │
            ▼                                                              ▼
┌───────────────────────────────┐                  ┌────────────────────────────────────────────┐
│     REDIS CACHE CLUSTER       │◄─────────────────│          REDIS SEAT LOCK + INVENTORY       │
│  ─────────────────────────── │                  │  ────────────────────────────────────────  │
│  Train schedule cache (TTL)  │                  │  SET seat:TRN123:S4:B34 <user_id> NX PX 300000 │
│  Seat availability snapshot  │                  │  (lock seat for 5 min, atomic SET NX)      │
│  Fare / quota cache          │                  │  DECRBY seats_available:TRN123:S4  1       │
│  User session tokens         │                  │  (atomic decrement — no oversell)          │
│  OTP / CAPTCHA tokens        │                  │  Release lock on payment failure           │
└───────────────────────────────┘                  └────────────────┬───────────────────────────┘
                                                                     │ Lock acquired
                                                                     ▼
                                                   ┌────────────────────────────────────────────┐
                                                   │           KAFKA MESSAGE BUS                │
                                                   │  ──────────────────────────────────────── │
                                                   │  Topic: booking-requests                  │
                                                   │  Topic: payment-events                    │
                                                   │  Topic: booking-confirmations             │
                                                   │  Topic: refund-requests                   │
                                                   │  Topic: notification-events               │
                                                   │                                           │
                                                   │  Partitioned by train_id                  │
                                                   │  Replication factor: 3                    │
                                                   │  Retention: 7 days                        │
                                                   └──────────┬──────────────────┬─────────────┘
                                                              │                  │
                          ┌───────────────────────────────────┘                  └─────────────────────────────┐
                          │                                                                                     │
                          ▼                                                                                     ▼
           ┌──────────────────────────────┐                                               ┌──────────────────────────────┐
           │      BOOKING WORKERS         │                                               │   NOTIFICATION WORKERS       │
           │  (Consumer Group — 50+)      │                                               │  ─────────────────────────── │
           │  ────────────────────────── │                                               │  SMS Gateway (Twilio)        │
           │  Dequeue booking request     │                                               │  Email (SES/SendGrid)        │
           │  Idempotency check (DB)      │                                               │  Push Notification           │
           │  Persist booking to DB       │                                               │  PNR generation & dispatch   │
           │  Call Payment Gateway        │                                               └──────────────────────────────┘
           │  Emit payment-events topic   │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌──────────────────────────────────────────────────────────────┐
           │                    PAYMENT GATEWAY                           │
           │  ─────────────────────────────────────────────────────────── │
           │  RazorPay / PayU / HDFC Payment Gateway / UPI                │
           │                                                              │
           │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
           │  │ Initiate Txn│───►│  Authorize  │───►│ Capture/Settle  │  │
           │  └─────────────┘    └─────────────┘    └────────┬────────┘  │
           │                                                  │           │
           │                    ┌─────────────────────────────┘           │
           │                    │  Async Callback (webhook)               │
           │                    ▼                                         │
           │         ┌─────────────────────┐                             │
           │         │ Payment Callback API│ (idempotent endpoint)       │
           │         └─────────────────────┘                             │
           └──────────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
   ┌──────────────────┐    ┌───────────────────────────────┐
   │  Payment SUCCESS │    │       Payment FAILED          │
   └────────┬─────────┘    └──────────────┬────────────────┘
            │                             │
            ▼                             ▼
   ┌──────────────────┐    ┌───────────────────────────────┐
   │  Confirm booking │    │  Release Redis seat lock      │
   │  Generate PNR    │    │  Increment seats_available    │
   │  Write to DB     │    │  Emit refund-request event    │
   │  Emit confirm    │    │  Notify user of failure       │
   │  event → Kafka   │    └───────────────────────────────┘
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │                         DATABASE LAYER                               │
   │  ──────────────────────────────────────────────────────────────────  │
   │                                                                      │
   │   ┌──────────────────┐     Streaming     ┌──────────────────────┐   │
   │   │  PRIMARY DB       │──────────────────►│  READ REPLICA 1      │   │
   │   │  (PostgreSQL)     │   replication     │  (for search/reports)│   │
   │   │  ──────────────── │                  └──────────────────────┘   │
   │   │  bookings         │                                              │
   │   │  passengers       │   Streaming     ┌──────────────────────┐    │
   │   │  trains           │──────────────────►│  READ REPLICA 2      │   │
   │   │  seats            │   replication     │  (for user portal)   │   │
   │   │  payments         │                  └──────────────────────┘   │
   │   │  pnr_records      │                                              │
   │   │  idempotency_keys │                                              │
   │   │  outbox_events    │                                              │
   │   └──────────────────┘                                              │
   │                                                                      │
   │   ┌──────────────────────────────────────────────────────────────┐   │
   │   │  SHARDING STRATEGY                                           │   │
   │   │  Shard key: train_id % N                                     │   │
   │   │  Each shard owns seats + bookings for a subset of trains     │   │
   │   └──────────────────────────────────────────────────────────────┘   │
   └──────────────────────────────────────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │               RECONCILIATION & RELIABILITY LAYER                    │
   │  ──────────────────────────────────────────────────────────────────  │
   │                                                                      │
   │  ┌────────────────────────┐   ┌─────────────────────────────────┐   │
   │  │  OUTBOX PATTERN        │   │   RECONCILIATION JOB            │   │
   │  │  ─────────────────── │   │  ───────────────────────────── │   │
   │  │  Write booking + event │   │  Runs every 5 minutes           │   │
   │  │  to DB atomically      │   │  Finds payments without PNR     │   │
   │  │  Relay publishes to    │   │  Checks payment gateway status  │   │
   │  │  Kafka after commit    │   │  Confirms booking OR refunds    │   │
   │  └────────────────────────┘   └─────────────────────────────────┘   │
   │                                                                      │
   │  ┌────────────────────────┐   ┌─────────────────────────────────┐   │
   │  │  IDEMPOTENCY STORE     │   │   REFUND WORKER                 │   │
   │  │  ─────────────────── │   │  ───────────────────────────── │   │
   │  │  booking_ref → status  │   │  Consumes refund-requests topic │   │
   │  │  TTL: 24 hours         │   │  Calls payment gateway refund   │   │
   │  │  Prevents double       │   │  Updates booking status = REFUNDED│ │
   │  │  charge on retry       │   │  Notifies user                  │   │
   │  └────────────────────────┘   └─────────────────────────────────┘   │
   └──────────────────────────────────────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │               OBSERVABILITY & PRODUCTION READINESS                  │
   │  ──────────────────────────────────────────────────────────────────  │
   │                                                                      │
   │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
   │  │  MONITORING    │  │  LOGGING       │  │  AUTOSCALING         │   │
   │  │  ──────────── │  │  ──────────── │  │  ────────────────── │   │
   │  │  Prometheus    │  │  ELK Stack     │  │  Kubernetes HPA      │   │
   │  │  Grafana       │  │  Structured    │  │  AWS ASG             │   │
   │  │  Alerts:       │  │  JSON logs     │  │  Scale on QPS/CPU    │   │
   │  │  QPS spike     │  │  Trace ID on   │  │  Pre-scale at 9:50AM │   │
   │  │  DB CPU >80%   │  │  every request │  │  (before Tatkal opens)│  │
   │  │  Seat lock fail│  │  Correlation   │  └──────────────────────┘   │
   │  │  Payment errors│  │  across svc    │                             │
   │  └────────────────┘  └────────────────┘                             │
   │                                                                      │
   │  ┌──────────────────────────────────────────────────────────────┐   │
   │  │  DISASTER RECOVERY                                           │   │
   │  │  ─────────────────────────────────────────────────────────── │   │
   │  │  Multi-AZ PostgreSQL (Patroni / RDS Multi-AZ)                │   │
   │  │  Kafka with 3-broker replication across availability zones   │   │
   │  │  Redis Cluster (6 nodes — 3 primary + 3 replica)             │   │
   │  │  Daily DB snapshots + point-in-time recovery (PITR)          │   │
   │  │  Failover RTO: < 60 seconds | RPO: < 5 seconds               │   │
   │  └──────────────────────────────────────────────────────────────┘   │
   └──────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions Explained

### 🚦 Traffic Spikes → Load Balancer + API Gateway + Rate Limiting

Tatkal booking opens at exactly **10:00 AM**, creating an instantaneous surge of millions of requests.

| Layer | Mechanism | Purpose |
|---|---|---|
| **CDN** | Cloudflare / Akamai | Cache static pages; absorb bot traffic before it hits servers |
| **Load Balancer** | AWS ALB / Nginx | Distribute across API gateway instances; health-check aware |
| **API Gateway** | Kong / custom | Rate limit per-user (e.g., 5 req/s), per-IP (e.g., 20 req/s) |
| **Autoscaling** | Kubernetes HPA | Pre-scale to 100 instances at 9:50 AM; scale down after peak |
| **Queue at API level** | Virtual waiting room | Hold excess users in a virtual queue instead of rejecting them |

**Rate limiting strategy:**
```
Per user:  5 requests/second  (prevents bot hammering)
Per IP:    20 requests/second (handles shared IPs / proxies)
Per train: 10,000 req/second  (protects popular-route shards)
```

---

### ⚡ Fast Search → Redis Cache

Train search must be sub-100ms even under peak load. Querying PostgreSQL for every search would be catastrophic.

```
Cache key:  search:{src}:{dst}:{date}:{class}
TTL:        30 seconds  (seat availability changes rapidly during Tatkal window)
Strategy:   Cache-aside (lazy load on first search miss)
Warm-up:    Pre-populate cache at 9:55 AM for top 500 routes
```

**Seat availability snapshot:**
- Redis holds a cached count of available seats per train/class.
- This is an *approximate* count used for search display.
- The *authoritative* count is the atomic Redis counter used for actual booking locks.

---

### 🎟️ No Double Booking → Redis Seat Lock + Atomic Inventory

This is the most critical correctness constraint. Two users must never be confirmed on the same seat.

**Seat lock flow:**
```
1. User initiates booking for Train TRN123, Sleeper class, Berth B34
2. Booking Service executes:
      SET seat:TRN123:S:B34 <user_id> NX PX 300000
      (NX = only if not exists; PX 300000 = expire in 5 minutes)
3. If SET returns OK  → lock acquired; proceed to payment
4. If SET returns NIL → seat already locked; return "seat unavailable"

5. Atomic inventory decrement:
      DECRBY seats_available:TRN123:S  1
      (If result < 0 → rollback: INCRBY seats_available:TRN123:S 1 + release lock)

6. On payment success → mark seat as BOOKED in DB; lock can be released
7. On payment failure / timeout → release lock + restore inventory
```

**Why Redis and not a DB transaction?**
- Redis `SET NX` is a single atomic operation across a cluster — no distributed lock overhead.
- DB-level locking (SELECT FOR UPDATE) doesn't scale to millions of concurrent seats.

---

### 📦 Millions of Requests → Kafka + Booking Workers

Direct synchronous booking would overwhelm the DB during the 10:00 AM spike.

```
Flow:
API Gateway → [validate & rate limit] → Booking Service
Booking Service → [acquire seat lock] → publish to Kafka topic: booking-requests
Booking Worker (consumer group) → dequeue → persist to DB → call payment gateway

Benefits:
  - API responds in <50ms (just queue acknowledgement)
  - DB writes are smoothed over time
  - Workers scale independently from API servers
  - Failed bookings are retried without user re-submission
```

**Kafka configuration:**
```
Topic:              booking-requests
Partitions:         200  (one per major train route)
Replication factor: 3
Consumer group:     booking-workers (50–200 instances during peak)
Partition key:      train_id  (ensures seat operations for one train are ordered)
```

---

### 💳 Payment Reliability → Payment Gateway + Callbacks

Payments are asynchronous. The booking worker initiates payment but confirmation comes via webhook callback.

```
Booking Worker                Payment Gateway              IRCTC Callback API
      │                             │                             │
      │── initiatePayment(ref) ────►│                             │
      │◄─ txn_id returned ─────────│                             │
      │                             │── async processing ────────►│
      │                             │                             │
      │                             │◄── user pays (UPI/Card) ───│
      │                             │                             │
      │                             │── webhook: SUCCESS/FAIL ──►│
      │                             │                             │── update DB
      │                             │                             │── emit Kafka event
      │                             │                             │── notify user
```

**Callback API is idempotent:** The same webhook can be delivered multiple times. The server checks `booking_ref` in the idempotency table before acting.

---

### 🔄 Payment Succeeds But Booking Fails → Idempotency + Retry + Reconciliation + Refund

This is the hardest failure scenario — money is taken but no ticket is issued.

**Root causes:**
- Booking Worker crashes after payment is captured but before DB write.
- DB write fails (deadlock, timeout).
- Network partition between worker and DB.

**Defence layers:**

#### Layer 1 — Outbox Pattern
```sql
BEGIN;
  INSERT INTO bookings (booking_ref, status) VALUES (:ref, 'PAYMENT_RECEIVED');
  INSERT INTO outbox_events (event_type, payload) VALUES ('BOOKING_CONFIRMED', :payload);
COMMIT;
-- Outbox relay reads outbox_events and publishes to Kafka *after* DB commit
-- Guarantees: event is published if and only if booking is persisted
```

#### Layer 2 — Idempotency Key
```
Booking ref (UUID) generated by client → sent in header: X-Idempotency-Key
Server stores: idempotency_keys(key, status, response, created_at)
On retry: return stored response without re-processing
TTL: 24 hours
```

#### Layer 3 — Reconciliation Job
```
Runs every 5 minutes (cron / Kubernetes CronJob)

SELECT * FROM bookings
WHERE status = 'PAYMENT_RECEIVED'
AND updated_at < NOW() - INTERVAL '10 minutes';

For each:
  → Query payment gateway: GET /transactions/:txn_id
  → If payment SUCCESS → confirm booking, generate PNR, notify user
  → If payment FAILED  → set status = FAILED, emit refund event
  → If payment PENDING → skip (will be caught in next run)
```

#### Layer 4 — Refund Worker
```
Consumes: refund-requests Kafka topic
For each refund event:
  → Call payment gateway refund API
  → Update booking status = REFUNDED
  → Send refund confirmation to user (SMS + email)
  → Retry with exponential backoff on failure
  → DLQ after 5 failed attempts → manual intervention
```

---

### 🗄️ Data Consistency → Master DB + Replicas

```
Primary PostgreSQL (Master)
├── All WRITES go here (bookings, payments, seat updates)
├── Synchronous replication to at least 1 replica (RPO = 0 for critical data)
│
├── Read Replica 1 → Search queries, availability lookups
└── Read Replica 2 → User portal (booking history, PNR status)

Sharding:
  Shard key: train_id % num_shards
  Shard 1: Trains 1–10,000   (New Delhi routes)
  Shard 2: Trains 10,001–20,000 (Mumbai routes)
  ...
  Each shard has its own Primary + 2 Replicas
```

**Idempotency table (on Primary):**
```sql
CREATE TABLE idempotency_keys (
  key         UUID PRIMARY KEY,
  status      VARCHAR(20),     -- PROCESSING, SUCCESS, FAILED
  response    JSONB,
  created_at  TIMESTAMP,
  expires_at  TIMESTAMP        -- TTL: 24 hours
);
CREATE INDEX ON idempotency_keys(expires_at);  -- for cleanup job
```

---

### 📊 Production Readiness → Monitoring, Logging, Autoscaling, Disaster Recovery

#### Monitoring Alerts (Prometheus + Grafana + PagerDuty)
| Metric | Threshold | Action |
|---|---|---|
| API QPS | > 50,000 req/s | Trigger autoscale |
| API error rate | > 1% | Alert on-call |
| Seat lock failure rate | > 5% | Check Redis cluster |
| Payment success rate | < 95% | Alert + check gateway |
| DB primary CPU | > 80% | Scale up / optimise queries |
| Kafka consumer lag | > 10,000 messages | Scale consumers |
| Redis memory usage | > 80% | Eviction risk alert |

#### Structured Logging (ELK Stack)
```json
{
  "timestamp": "2025-06-15T10:00:04.123Z",
  "trace_id": "abc-123-xyz",
  "user_id": "U9876",
  "booking_ref": "BK-20250615-00042",
  "train_id": "TRN12345",
  "event": "SEAT_LOCK_ACQUIRED",
  "seat": "S4-B34",
  "latency_ms": 12,
  "service": "booking-service"
}
```

#### Autoscaling Schedule (pre-emptive scaling)
```
09:50 AM → Scale API servers to 100 instances
09:55 AM → Warm Redis cache with top 500 routes
10:00 AM → Tatkal opens — peak load begins
10:05 AM → HPA kicks in for booking workers based on Kafka lag
11:00 AM → Scale down begins (most Tatkal quota booked)
```

#### Disaster Recovery
| Component | Strategy | RTO | RPO |
|---|---|---|---|
| PostgreSQL | Patroni auto-failover / RDS Multi-AZ | < 60s | < 5s |
| Redis | Redis Cluster (3 primary + 3 replica, cross-AZ) | < 30s | ~1s |
| Kafka | 3 brokers across availability zones, ISR = 2 | < 30s | 0 (synchronous ISR) |
| Application | Kubernetes multi-node, rolling deploys | < 10s | N/A |
| Backups | Daily snapshots + PITR for DB | < 4 hours (full restore) | < 5min |

---

## End-to-End Request Flow (Happy Path)

```
1.  User opens IRCTC app at 09:59 AM
2.  CDN serves static page; search results loaded from Redis cache
3.  At 10:00 AM, user clicks "Book Now" on Train TRN12345, Sleeper, Berth B34
4.  Request → Load Balancer → API Gateway (rate limit check passes)
5.  API Gateway validates JWT token, extracts user_id
6.  API Gateway checks idempotency key (new request)
7.  Booking Service receives request:
      a. Calls Redis: SET seat:TRN12345:S:B34 <user_id> NX PX 300000
      b. Returns OK → seat locked for 5 minutes
      c. DECRBY seats_available:TRN12345:S 1 → 47 remaining
8.  Booking Service publishes to Kafka: booking-requests topic
9.  API responds to user: { status: "PROCESSING", booking_ref: "BK-XYZ-001" }
10. Booking Worker dequeues from Kafka:
      a. Idempotency check → not seen before
      b. Writes booking (status=PAYMENT_PENDING) to PostgreSQL via Outbox
      c. Calls Payment Gateway: initiatePayment(booking_ref, amount)
11. User completes UPI payment on phone
12. Payment Gateway fires webhook → IRCTC Callback API
13. Callback API:
      a. Validates webhook signature
      b. Checks idempotency table → first time processing
      c. Emits payment-events Kafka event (status=SUCCESS)
14. Booking Worker consumes payment-events:
      a. Confirms booking in DB (status=CONFIRMED)
      b. Generates PNR: 1234567890
      c. Emits booking-confirmations event
15. Notification Worker sends SMS + Email with PNR
16. User receives: "Booking confirmed! PNR: 1234567890"

Total user-perceived latency from click to "PROCESSING": ~80ms
Total time to PNR: ~3–8 seconds (async)
```

---

## Failure Scenario Handling Summary

| Failure | Detection | Recovery |
|---|---|---|
| App server crash | LB health check removes it | Kubernetes restarts pod; other servers absorb traffic |
| Redis seat lock lost | Lock TTL expires | Seat unlocked automatically; user can retry |
| Redis cluster down | Circuit breaker | Fall back to DB-level locking (slower but correct) |
| Kafka broker down | Producer buffer + retry | Other brokers serve; 3× replication preserves messages |
| Payment success, booking not persisted | Reconciliation job (runs every 5 min) | Confirm booking + generate PNR retroactively |
| Payment captured, user double-charged | Idempotency key dedup | Return original response; no re-charge |
| DB primary crash | Patroni auto-failover | Replica promoted in < 60s; minimal booking disruption |
| Hot shard (popular train) | Shard-level Redis cache | Reads served from cache; writes isolated to shard |
| DDoS at 10:00 AM | CDN + Rate limiting | Bots blocked at edge; real users rate-limited fairly |

---

*Related: IRCTC, Tatkal, System Design, Redis, Kafka, PostgreSQL, Idempotency, Outbox Pattern, CAP Theorem, Distributed Locking*
