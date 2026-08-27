# Low-Level Design (LLD)
Designed the Low-Level Design (LLD) of a scalable, event-driven real-time stock trading platform using Microservices, Apache Kafka, Redis Pub/Sub, InfluxDB, and WebSockets.

LLD defines the internal implementation of those components—classes, methods, database schema, APIs, and design patterns.

> HLD: "We need an Order Service."
> LLD: "Here is exactly how OrderService.createOrder() works."

**Easy way to remember:**
```
HLD = What + Where
LLD = How
```

<img src="./HLD_vs_LLD.jpg" width="100%" />

## High-Level Design (HLD) vs Low-Level Design (LLD)
Think of HLD and LLD as building a house 🏠.

|           | HLD                             | LLD                                       |
| --------- | ------------------------------- | ----------------------------------------- |
| Full form | High-Level Design               | Low-Level Design                          |
| Focus     | **What components do we need?** | **How exactly will each component work?** |
| Level     | Big picture                     | Detailed implementation                   |
| Audience  | Architects, senior developers   | Developers                                |
| Example   | API + DB + Redis + Kafka        | Classes, methods, DB tables, algorithms   |

## 🔧 LLD = Inside the component

Now take the Order Service from the HLD.

LLD goes deeper:

OrderController
      │
      ▼
OrderService
      │
      ├── createOrder()
      ├── cancelOrder()
      ├── getOrder()
      │
      ▼
OrderRepository
      │
      ▼
PostgreSQL

Then you define things like:
```
Order
----------------
id
userId
totalAmount
status
createdAt
```

**And classes/interfaces:**
- OrderController
- OrderService
- OrderRepository
- PaymentService
- InventoryService

**LLD answers:**
- What classes do we need?
- What methods do they have?
- What are the parameters?
- What database tables do we need?
- What relationships exist?
- What design patterns should we use?
- What happens step-by-step when createOrder() is called?

LLD = detailed design of individual components.

## Why is an SSE connection not recommended for extracting stock exchange data?
Ans. SSE is one-directional (server → client only) and works over plain HTTP, so it can’t handle things like subscribe/unsubscribe requests 
or acks on the same connection, and it doesn’t support binary frames efficiently. Stock exchange feeds are high-frequency and need low-latency, 
two-way communication — so WebSockets are a much better fit than SSE here.
