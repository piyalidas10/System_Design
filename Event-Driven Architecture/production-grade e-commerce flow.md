# 🛒 Complete E-Commerce Flow - A Complete Real-World E-Commerce flow with Failure Scenarios and Retries
Let’s design a production-grade e-commerce flow the way you would explain it in a system-design interview, including normal flow, failures, retries, idempotency, events, eventual consistency, and compensation.

**Imagine a customer buying:**
```
1 × iPhone — ₹80,000
```

**A realistic system might look like:**
```
                    ┌──────────────┐
                    │   Customer   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ API Gateway  │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Product Service    Cart Service       Auth Service
        │                  │
        ▼                  ▼
    PostgreSQL          Redis
                           │
                           ▼
                    ┌──────────────┐
                    │ Order Service│
                    └──────┬───────┘
                           │
                     OrderCreated
                           │
                           ▼
                    ┌──────────────┐
                    │    Kafka     │
                    └──────┬───────┘
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
       Inventory       Payment        Notification
        Service        Service          Service
             │             │
             ▼             ▼
          Database     Payment Gateway
             │             │
             └─────────────┴──────┐
                                  │
                                  ▼
                           Order Completed
```

## 1. Customer Opens Product Page

**Customer requests:**
```
GET /products/iphone-17
```

**Flow:**
```
Browser
   │
   ▼
CDN
   │
   ▼
API Gateway
   │
   ▼
Product Service
   │
   ▼
Redis Cache
   │
   ├── HIT ──► return product
   │
   └── MISS
         │
         ▼
     PostgreSQL
         │
         ▼
      Redis
         │
         ▼
     Customer
```

**Failure: Redis is down**

Don't make the entire application unavailable.
```
Product Service
      │
      ▼
Redis ❌
      │
      ▼
PostgreSQL
```

**Use:**
```
Redis failure
   ↓
fallback to DB
   ↓
return product
```

**But you should also have:**
- timeout
- circuit breaker
- connection pool limits
- monitoring

## 2. Customer Adds Product to Cart
```
POST /cart/items

{
   "productId": "iphone-17",
   "quantity": 1
}
```

**Flow:**
```
Frontend
   │
   ▼
Cart Service
   │
   ▼
Redis
   │
   ▼
Cart
```

**Example:**
```
cart:user123

iphone-17
quantity = 1
```

**Redis is useful because cart operations are:**
- frequent
- low latency
- temporary

## 3. Customer Clicks "Checkout"

Now things become interesting.

**The frontend sends:**
```
POST /orders
Idempotency-Key: abc-123
```

**Body:**
```
{
  "items": [
    {
      "productId": "iphone-17",
      "quantity": 1
    }
  ],
  "addressId": "address-1"
}
```
The system should not blindly trust the price from the browser.

**Instead:**
```
Frontend
   │
   ▼
Order Service
   │
   ├──► Product Service
   │       │
   │       └── current price
   │
   ├──► Inventory Service
   │
   └──► Order DB
```

## 4. Create Order

**Order Service creates:**
```
Order #ORD123
Status = PENDING
```

**Example:**
```
ORD123

customer = user123
product = iphone-17
quantity = 1
price = ₹80,000
status = PENDING
```
Important:

**Don't keep the request open while calling 5–6 services.**

Instead, transition toward an event-driven workflow.
```
Order Service
      │
      ▼
OrderCreated
      │
      ▼
Kafka
```

## 5. Why Kafka?

**Kafka becomes the communication backbone.**
```
                 Kafka
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   Inventory    Payment   Notification
```
The Order Service doesn't need to know exactly how every downstream operation works.

**This gives us:**
- loose coupling
- asynchronous processing
- retries
- buffering
- scalability
- event replay

## 6. Inventory Reservation

**Inventory receives:**
```
OrderCreated
```

**It checks:**
```
iphone-17
available = 10
```

**Reserve:**
```
available = 9
reserved = 1
```
**Then publishes:**
```
InventoryReserved
```

## 🚨 Failure Scenario #1 — Product Out of Stock

**Suppose:**
```
available = 0
```
**Inventory publishes:**
```
InventoryReservationFailed
```
**Order Service receives it:**
```
PENDING
   ↓
CANCELLED
```
**Customer sees:**
```
Sorry, this product is no longer available.
```
No payment should happen.

### 7. Payment

**After inventory is successfully reserved:**
```
InventoryReserved
        │
        ▼
Payment Service
```

**Payment Service calls:**
```
Payment Gateway
```

**For example:**
```
₹80,000
```
**Payment request:**
```
{
   "orderId": "ORD123",
   "amount": 80000,
   "currency": "INR",
   "idempotencyKey": "ORD123"
}
```
The idempotency key is extremely important.

## 🚨 Failure Scenario #2 — Payment Request Times Out

Imagine:
```
Payment Service
      │
      ▼
Payment Gateway
      │
      │
      X timeout
```
The application doesn't know:
> **Did payment happen?**

This is one of the most dangerous distributed-system problems.

Because:
```
Request timeout
≠
Payment failed
```

The gateway may have successfully charged the customer.
```
❌ Bad Retry
```
**Don't do:**
```
timeout
   ↓
retry payment
   ↓
₹80,000 charged
   ↓
retry
   ↓
₹80,000 charged again
```
Customer gets charged twice.

### ✅ Correct Retry

**Use:**
```
Idempotency-Key = ORD123
```

**Retry:**
```
Payment request
      │
      ▼
Timeout
      │
      ▼
Retry
      │
      ▼
Payment Gateway
      │
      ▼
same idempotency key
      │
      ▼
return existing payment result
```

**Therefore:**
```
₹80,000
charged only once
```

## 8. Payment Succeeds

Payment Service publishes:
```
PaymentSucceeded
```

**Kafka:**
```
PaymentSucceeded
        │
        ├──► Order Service
        │
        └──► Notification Service
```

**Order becomes:**
```
PENDING
   ↓
CONFIRMED
```

## 9. What if Payment Fails?

**Suppose:**
```
Payment Gateway
      │
      ▼
DECLINED
```
Payment Service publishes:

PaymentFailed

**Then:**
```
Order
  │
  ▼
CANCELLED
```
But remember:

Inventory was already reserved.

**So we need:**
```
PaymentFailed
      │
      ▼
Release Inventory
```

**Inventory:**
```
available = 10
reserved = 1

       ↓

available = 10
reserved = 0
```
This is a compensating transaction.

## 10. This Is the Saga Pattern

**The complete workflow is essentially a Saga.**
```
Create Order
     │
     ▼
Reserve Inventory
     │
     ▼
Process Payment
     │
     ▼
Confirm Order
```

**If something fails:**
```
                 ┌──────────────┐
                 │ Create Order │
                 └──────┬───────┘
                        ▼
                Reserve Inventory
                        │
                        ▼
                  Process Payment
                        │
                  ❌ FAILURE
                        │
                        ▼
                Release Inventory
                        │
                        ▼
                  Cancel Order
```

**Instead of one giant database transaction:**
```
BEGIN TRANSACTION

Order DB
Inventory DB
Payment DB
Notification DB

COMMIT
```
—which doesn't work well across independent services—we use local transactions + events + compensation.

## 11. Two Saga Approaches
**Choreography**

Services react to events.
```
OrderCreated
     ↓
Inventory Service
     ↓
InventoryReserved
     ↓
Payment Service
     ↓
PaymentSucceeded
     ↓
Order Service
```
No central orchestrator.

**Advantage**

Simple for small workflows.

**Disadvantage**

With many services it can become difficult to understand:
```
who triggers whom?
```

## 12. Orchestration

**A dedicated:**
```
Order Saga Orchestrator
```

**controls the workflow.**
```
             ┌──────────────────┐
             │ Saga Orchestrator│
             └────────┬─────────┘
                      │
       ┌──────────────┼───────────────┐
       ▼              ▼               ▼
  Inventory        Payment        Shipping
```

**It says:**
```
1. Reserve inventory
2. Charge payment
3. Create shipment
4. Confirm order
```

**If payment fails:**
```
Release inventory
       ↓
Cancel order
```
For a complex e-commerce system, orchestration is often easier to reason about.

## 13. Retry Strategy

Not every error should be retried.

**Retryable**
```
HTTP 500
HTTP 502
HTTP 503
HTTP 504
network timeout
connection reset
temporary DB failure
```

**Usually NOT retryable**
```
400 Bad Request
401 Unauthorized
403 Forbidden
insufficient inventory
invalid card
payment declined
```

## 14. Exponential Backoff

**Don't do:**
```
retry
retry
retry
retry
```
immediately.

**Use:**
```
Attempt 1 → immediately

Attempt 2 → 1 sec

Attempt 3 → 2 sec

Attempt 4 → 4 sec

Attempt 5 → 8 sec
```

**Usually add jitter:**
```
delay = exponential_backoff + random_jitter
```
This prevents thousands of services from retrying simultaneously.

## 15. 🚨 Failure Scenario #3 — Kafka Is Temporarily Down

**Suppose:**
```
Order DB
   │
   ├── Order created ✅
   │
   ▼
Kafka ❌
```

**If you simply do:**
```
DB commit
   ↓
publish Kafka
```

**and Kafka fails:**
```
Order exists
BUT
OrderCreated event doesn't exist
```
Now the system is inconsistent.

## 16. Transactional Outbox Pattern

**Use:**
```
Order DB
┌─────────────────────┐
│ orders              │
│                     │
│ outbox_events       │
└─────────────────────┘
```

**Inside one local DB transaction:**
```
BEGIN

INSERT order

INSERT OrderCreated event into outbox

COMMIT
```
Both succeed or both fail.

**Then:**
```
Outbox Publisher
      │
      ▼
Kafka
```

**If Kafka is temporarily unavailable:**
```
Outbox
   │
   ▼
retry
   │
   ▼
Kafka
```
Nothing is lost.

## 17. 🚨 Failure Scenario #4 — Kafka Message Delivered Twice

**Kafka consumer receives:**
```
OrderCreated
```
Processes it.

Then crashes before committing the consumer offset.

**Kafka sends the event again.**
```
OrderCreated
      ↓
Inventory Reserve
      ↓
CRASH
      ↓
OrderCreated AGAIN
```

**Without protection:**
```
reserve 1 item
reserve another item
```
Bad.

## 18. Consumer Idempotency

**Store processed event IDs.**
```
processed_events

event_id
---------
evt-123
```

**Consumer:**
```
Receive event
      │
      ▼
Already processed?
   │          │
  YES         NO
   │           │
ignore       process
               │
               ▼
          save event ID
```
Therefore duplicate delivery becomes harmless.

## 19. 🚨 Failure Scenario #5 — Payment Succeeds but Response Is Lost

This is a classic production problem.
```
Payment Service
      │
      ▼
Payment Gateway
      │
      ▼
₹80,000 charged ✅
      │
      X
response lost
```

**Payment Service thinks:**
```
UNKNOWN
```

**Not:**
```
FAILED
```

**Use:**
```
Payment status inquiry
```

**or webhook:**
```
Payment Gateway
      │
      ▼
Webhook
      │
      ▼
Payment Service
      │
      ▼
PaymentSucceeded
```
This is why payment systems commonly need reconciliation.

## 20. Payment Reconciliation

**Periodically:**
```
Reconciliation Job
        │
        ▼
Payment Gateway
        │
        ▼
```

**Compare:**
```
Gateway transactions
       VS
Internal transactions
```

**Find:**
```
Internal = PENDING
Gateway = SUCCESS
```

**Then:**
```
PENDING
   ↓
SUCCESS
```
This protects against lost responses, webhook failures, and other edge cases.

## 21. 🚨 Failure Scenario #6 — Order Service Is Down

**Kafka retains the event.**
```
Kafka
 │
 │ OrderCreated
 │
 ▼
Order Service ❌
```
The message remains available.

**When Order Service comes back:**
```
Kafka
 │
 ▼
Order Service
 │
 ▼
process event
```
This is one of the major advantages of asynchronous architecture.

## 22. Dead Letter Queue

**Suppose an event repeatedly fails.**
```
Kafka
  │
  ▼
Consumer
  │
  ├── attempt 1 ❌
  ├── attempt 2 ❌
  ├── attempt 3 ❌
  └── attempt 4 ❌
          │
          ▼
       DLQ
```
**DLQ = Dead Letter Queue.**

**Example:**
```
order-events-dlq
```
Operations team can inspect and replay the event after fixing the problem.

## 23. 🚨 Failure Scenario #7 — Database Is Slow

Suppose Order Service uses PostgreSQL.

**Requests:**
```
10,000 requests/sec
```

**But DB connection pool:**
```
20 connections
```

**Now:**
```
10,000 requests
       │
       ▼
Connection Pool
       │
       ├── 20 executing
       │
       └── 9,980 waiting
```
Latency increases.

**You need:**
- connection pool tuning
- query optimization
- indexes
- caching
- read replicas
- timeouts
- backpressure

And don't simply increase the pool to 1,000—because the database can become overloaded.

## 24. 🚨 Failure Scenario #8 — Customer Clicks "Pay" Twice

**User double-clicks:**
```
PAY
PAY
```

**Two requests arrive:**
```
POST /payments
POST /payments
```

**Both contain:**
```
Idempotency-Key: ORD123
```

**Payment service:**
```
ORD123
   │
   ▼
Already processed?
   │
   ├── YES → return existing result
   │
   └── NO → process payment
```
Only one charge.

## 25. 🚨 Failure Scenario #9 — Inventory Race Condition

**Two customers:**
```
Customer A → Buy last iPhone
Customer B → Buy last iPhone
```

**Inventory:**
```
available = 1
```

**Both read:**
```
available = 1
```

**Without concurrency control:**
```
A → 1 → reserve
B → 1 → reserve

Result:
available = -1 ❌
```

**Use atomic update:**
```
UPDATE inventory
SET available = available - 1
WHERE product_id = ?
AND available >= 1;
```

**Then check:**
```
rows_updated = 1
```

**Success.**
```
rows_updated = 0
```
Out of stock.

## 26. Order State Machine

**A production system should have explicit states.**
```
                 ┌────────────┐
                 │   CREATED  │
                 └─────┬──────┘
                       ▼
                 ┌────────────┐
                 │  PENDING   │
                 └─────┬──────┘
                       │
             ┌─────────┴──────────┐
             ▼                    ▼
       INVENTORY_FAILED       INVENTORY_RESERVED
             │                    │
             ▼                    ▼
        CANCELLED              PAYMENT
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                     SUCCESS             FAILED
                         │                 │
                         ▼                 ▼
                     CONFIRMED         CANCELLED
                         │
                         ▼
                    SHIPPED
                         │
                         ▼
                    DELIVERED
```
This prevents invalid transitions.

For example:
```
DELIVERED → PENDING ❌
```
should never be allowed.

## 27. Shipping

After successful payment:
```
OrderConfirmed
       │
       ▼
Shipping Service
       │
       ▼
Create Shipment
       │
       ▼
Courier API
```
Courier returns:
```
trackingId = TRK123
```
Order:
```
CONFIRMED
   ↓
SHIPPED
```

## 28. 🚨 Courier API Failure

Suppose:
```
Shipping Service
      │
      ▼
Courier API
      │
      X timeout
```

Again:
```
timeout ≠ failure
```

Use:
- idempotency key
- retry
- status inquiry
- webhook
- reconciliation

Exactly the same distributed-system principles appear again.

## 29. Notification Should Not Block Checkout

**Don't do:**
```
Order
 │
 ▼
Payment
 │
 ▼
Email Service
 │
 ▼
SMS Service
 │
 ▼
Order response
```
**If email is down:**
```
checkout ❌
```
**Instead:**
```
OrderConfirmed
      │
      ▼
Kafka
      │
      ├──► Email
      ├──► SMS
      └──► Push
```
Notification failure shouldn't cancel a successful order.

## 30. Complete Production Flow

Putting everything together:
```
                   CUSTOMER
                       │
                       ▼
                 API GATEWAY
                       │
                       ▼
                    CART
                       │
                       ▼
                  ORDER API
                       │
                       ▼
              ┌─────────────────┐
              │   Order DB      │
              │   Outbox        │
              └────────┬────────┘
                       │
                       ▼
                     KAFKA
                       │
        ┌──────────────┼─────────────────┐
        │              │                 │
        ▼              ▼                 ▼
   INVENTORY         PAYMENT         NOTIFICATION
        │              │
        │              ▼
        │         PAYMENT GATEWAY
        │              │
        ▼              ▼
   PostgreSQL       PostgreSQL
        │              │
        └──────┬───────┘
               │
               ▼
          ORDER CONFIRMED
               │
               ▼
          SHIPPING SERVICE
               │
               ▼
          COURIER API
               │
               ▼
             SHIPPED
               │
               ▼
           DELIVERED
```

## 31. The 10 Most Important Reliability Patterns

For a system-design interview, remember these:

| Problem                   | Solution                        |
| ------------------------- | ------------------------------- |
| Duplicate API request     | **Idempotency key**             |
| Duplicate Kafka message   | **Consumer idempotency**        |
| Temporary service failure | **Retry + exponential backoff** |
| Too many retries          | **Circuit breaker**             |
| Kafka unavailable         | **Transactional Outbox**        |
| Poison message            | **DLQ**                         |
| Distributed transaction   | **Saga**                        |
| Payment timeout           | **Status inquiry / webhook**    |
| Lost payment response     | **Reconciliation**              |
| Database overload         | **Pool limits + backpressure**  |

## 32. The Most Important Interview Concept

If the interviewer asks:
> **"Why don't you use one database transaction for the entire checkout?"**

Answer:
```
"Because Order, Inventory, Payment, and Shipping are independent services and may have different databases and external systems. A distributed ACID transaction across all of them would introduce significant coupling and availability problems. Instead, I would use local transactions, an event-driven workflow, idempotency, and the Saga pattern with compensating actions."
```
That's a strong system-design answer.

## 33. One Simple Mental Model

**Think of the checkout process as:**
```
                HAPPY PATH

Customer
   ↓
Create Order
   ↓
Reserve Inventory
   ↓
Charge Payment
   ↓
Confirm Order
   ↓
Create Shipment
   ↓
Deliver
```
**And every arrow needs:**
```
             ┌──────────────┐
             │   Operation  │
             └──────┬───────┘
                    │
             ┌──────▼──────┐
             │   Timeout?  │
             └──────┬──────┘
                    YES
                     │
                     ▼
                  Retry
                     │
                     ▼
              Idempotency
                     │
              ┌──────▼──────┐
              │ Still fails?│
              └──────┬──────┘
                    YES
                     │
                     ▼
               Compensation
                     │
                     ▼
                  Recovery
```
That is the mindset behind a real-world resilient e-commerce system.

If you're preparing this for a system-design interview, the next level is to design the same flow with Angular + Node.js + PostgreSQL + Redis + Kafka, including the actual APIs, 
database tables, Kafka topics, order state machine, retry/DLQ strategy, and a complete architecture diagram.





