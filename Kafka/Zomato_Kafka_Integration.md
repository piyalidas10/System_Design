# 🍔 Kafka Integration in Zomato
Zomato uses Apache Kafka as the central event backbone to connect all microservices in real-time.

👉 Instead of services calling each other directly, they publish and consume events.  
👉 Kafka is NOT your database  
👉 It is an event log (stream)  
👉 Data is saved to DB at specific stages by consumers  

In Zomato-like systems, data is saved to the database at every critical state transition (order created, confirmed, assigned, delivered, payment). 
Kafka acts as an event bus, and consumers persist relevant events into their respective databases. 
High-frequency data like GPS is usually cached (Redis) instead of being written directly to the database.
```
✅ Kafka = WhatsApp messages (events) 
✅ DB = Final record (official history)
```

## 🔄 Full Flow (Event → Kafka → DB)

### 1. 📱 Order Created → First DB Write
- User places order
- Order Service
  - ✅ Saves to DB immediately (critical data)
  - ✅ Publishes event to Kafka

```
DB Write #1 → orders table
status = CREATED
```
When a user places an order:
```
{
  "order_id": "ORD123",
  "user_id": "U1",
  "restaurant_id": "R45",
  "items": ["Pizza", "Coke"],
  "status": "CREATED"
}
```
Sent to Kafka topic: order-created

👉 Why?
- You must never lose orders

### 2. 🍳 Restaurant Accepts → Update DB
- Restaurant service consumes event
  - Consumes from order-created
  - Accepts/rejects order
- Updates DB
```
DB Write #2 → orders table
status = CONFIRMED
```
- Then publishes event to Kafka
  - order-confirmed or order-rejected

### 3. 🛵 Delivery Assigned → Another DB Update
- Consumes: order-confirmed
- Logic:
  - Find nearest delivery partner
  - Assign delivery
- Produces: delivery-assigned
```
DB Write #3
delivery_partner_id assigned
status = ASSIGNED
```

### 4. 📍 Driver Location → NOT Always DB
- GPS updates come every 2–5 sec
  - Delivery partner app sends GPS updates: driver-location
- ❌ NOT saved to main DB (too heavy)

Example:
```
{
  "driver_id": "D12",
  "lat": 22.57,
  "lng": 88.36,
  "timestamp": 1710000000
}
```
✔ Frequency: every 2–5 seconds

👉 Instead:
- Stored in:
  - Redis (real-time cache)
  - Kafka (for streaming)

✔ Sometimes batched to DB later

### 5. ⏱️ ETA & Tracking Service  → use Redis (NOT DB)
- Consumes:
  - driver-location
  - order-status
- Produces:
  - eta-updated

👉 Used for:
- Live map tracking
- “Arriving in 10 mins”

Instead of DB:
- Store latest state in Redis
```
order:123 → {
  lat: 22.57,
  lng: 88.36,
  eta: "10 mins"
}
```
- ✔ Fast (milliseconds)
- ✔ Overwrites old data
- ✔ Perfect for real-time

### 5. ⏱️ Order Picked / Delivered
```
DB Write #4 → PICKED
DB Write #5 → DELIVERED
```

### 6. 💳 Payment Completed
```
DB Write #6 → payment table
status = SUCCESS / FAILED
```

### 📊 Final DB State (Single Source of Truth)

At the end:
| order_id | status    | delivery_partner |
| -------- | --------- | ---------------- |
| ORD123   | DELIVERED | D12              |

👉 DB always holds latest state

### ⚙️ Two Real Patterns Used
**✅ Pattern 1: Write DB First, Then Kafka (Most Common)**
```
User → Service → DB → Kafka → Other Services
```
✔ Strong consistency  
✔ No data loss  

**✅ Pattern 2: Event Sourcing (Advanced)**
```
User → Kafka → Consumers → DB
```
✔ DB rebuilt from events  
✔ Used in high-scale systems  

### 🧵 Who Writes to DB?

👉 Each microservice owns its DB:
| Service          | Writes What            |
| ---------------- | ---------------------- |
| Order Service    | Orders                 |
| Delivery Service | Rider assignment       |
| Payment Service  | Payments               |
| Tracking Service | Location (optional DB) |

### ⚡ Important Rule

👉 Kafka does NOT write to DB automatically

✔ Consumers decide:
- WHEN to save
- WHAT to save
- WHERE to save

### When DB used
✅ Only for:
1. Historical Data (Batch Save)
  -  Store route after delivery
  -  Analytics (e.g., delivery time trends)
2. Final State
```
order-delivered → DB update
```

| Use Case          | Storage      |
| ----------------- | ------------ |
| Live location     | ❌ No DB      |
| ETA updates       | ❌ No DB      |
| Current state     | ✅ Redis      |
| Final order state | ✅ DB         |
| Analytics/history | ✅ DB (batch) |

### 🧠 Golden Rule

👉 High-frequency data = NEVER write directly to DB

Instead:
- Kafka → stream
- Redis → latest state
- DB → final or aggregated data

### 🔥 Why driver location is not saved inside DB ?

If you try this 👇
```
driver-location → DB write every 2 sec
```
💥 System will fail at scale:
- Millions of writes/sec
- DB locks
- High latency

