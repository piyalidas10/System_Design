# Event-Driven Architecture
Let’s understand Event-Driven Architecture (EDA) from a beginner/system-design perspective.

**Event-Driven Architecture is a design pattern where components communicate by publishing and consuming events. An event represents something that has happened, such as OrderCreated or PaymentCompleted. Instead of services directly calling each other, they can communicate through a message broker such as Kafka or RabbitMQ. This provides loose coupling, asynchronous processing, independent scalability, better resilience, and allows multiple consumers to react to the same event. It is especially useful for large-scale distributed and real-time systems.**

<img src="./Event-Driven Architecture Redesign.png" width="100%" />

## What is Event-Driven Architecture?

In simple words:
```
Event-Driven Architecture means different parts of a system communicate by producing and reacting to events.
```
An event is simply a statement that something happened.

Examples:
- OrderPlaced
- PaymentCompleted
- UserRegistered
- FileUploaded
- TicketBooked
- ProductCreated
- EmailSent

### Real-world example

Imagine you order a pizza.

You place the order:
```
🍕 Order Placed
```
Now several things can happen:
```
                 Order Placed
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
      Payment      Restaurant   Notification
       Service       Service       Service
          │           │           │
          ↓           ↓           ↓
    Process Payment  Prepare     Send SMS
```
The person taking your order doesn't need to personally call every department.

Instead:
```
"Order #123 has been placed."
````

## Traditional architecture vs Event-Driven Architecture

Suppose you have an e-commerce application.

### Traditional synchronous approach

**When the user places an order:**
```
Angular
   │
   ↓
Order API
   │
   ├──→ Payment Service
   │
   ├──→ Inventory Service
   │
   ├──→ Shipping Service
   │
   └──→ Notification Service
```
The Order Service directly calls everything.

Different departments react to that event.

That's the basic idea behind event-driven architecture.

### For example:
```
POST /orders

       ↓

Order Service

       ↓
Payment Service

       ↓
Inventory Service

       ↓
Shipping Service

       ↓
Notification Service
```
This creates strong coupling.

## Event-driven approach

**Instead:**
```
Angular
   │
   ↓
Order Service
   │
   │ publishes
   ↓
┌─────────────────────┐
│   OrderPlaced Event  │
└─────────────────────┘
           │
           ↓
      Message Broker
      Kafka / RabbitMQ
           │
      ┌────┼────┬─────────┐
      ↓    ↓    ↓         ↓
 Payment Inventory Shipping Notification
 Service  Service Service  Service
```
The Order Service doesn't need to know all the consumers.

**It simply says:**
```
"OrderPlaced happened."
```
Other services decide whether they care about it.

## What exactly is an "event"?

An event usually contains information about something that happened.

For example:
```
{
  "eventType": "OrderPlaced",
  "orderId": "ORD-123",
  "userId": "USER-456",
  "amount": 2500,
  "timestamp": "2026-08-29T10:30:00Z"
}
```
Notice the important concept:
```
Event = fact
```
It describes something that already happened.

For example:
- OrderPlaced
- PaymentCompleted
- UserRegistered
- TicketBooked

Compare this with a command:
- PlaceOrder
- ProcessPayment
- SendEmail

A command says:
```
"Please do this."
```
An event says:
```
"This already happened."
```
That's an important distinction in system design.

## What is the Event Bus / Message Broker?

You normally need something that transports events.

**Popular technologies include:**
- Apache Kafka
- RabbitMQ
- Amazon SNS/SQS
- Azure Service Bus
- Google Pub/Sub
- NATS
- Redis Streams

**Think of it as a post office.**
```
Producer
   │
   │ Event
   ↓
┌──────────────┐
│ Message      │
│ Broker       │
└──────────────┘
   │
   ├──→ Consumer A
   ├──→ Consumer B
   └──→ Consumer C
```
The producer doesn't have to directly call every consumer.

## Why is Event-Driven Architecture so popular?

There are several major reasons.

### Reason 1 — Loose coupling

This is probably the biggest reason.

**Without events:**
```
Order Service
     │
     ├──→ Payment
     ├──→ Inventory
     ├──→ Shipping
     └──→ Email
```
Order Service knows about all these services.

**With events:**
```
Order Service
     │
     ↓
OrderPlaced
     │
     ↓
Kafka
  │  │  │
  ↓  ↓  ↓
 P  I  S
```
The Order Service doesn't need to know who consumes the event.

You can add:
- Analytics Service
- Fraud Service
- Recommendation Service
- Loyalty Service

without necessarily modifying the Order Service.

### Reason 2 — Scalability

Imagine Amazon-like traffic.

Suppose:
```
10,000 orders/sec
```

**Your system has:**
- Order Service
- Payment Service
- Inventory Service
- Notification Service
- Analytics Service

Each service can scale independently.
```
                    Kafka
                      │
       ┌──────────────┼───────────────┐
       ↓              ↓               ↓
 Payment           Inventory       Notification
 10 instances       20 instances     5 instances
```

**If inventory processing becomes the bottleneck:**
```
Inventory: 20 → 50 instances
```
You don't necessarily need to scale everything.

### Reason 3 — Asynchronous processing

This is another huge benefit.

Suppose the user uploads a video.

**Without asynchronous processing:**
```
User
 ↓
Upload API
 ↓
Process Video
 ↓
Generate Thumbnail
 ↓
Run AI Analysis
 ↓
Store Result
 ↓
Response
```
The user may wait 30 seconds.

**With events:**
```
User
 ↓
Upload API
 ↓
Store Video
 ↓
VideoUploaded Event
 ↓
Return response immediately
```
**Meanwhile:**
```
VideoUploaded
      │
      ├──→ Thumbnail Service
      │
      ├──→ AI Processing
      │
      ├──→ Transcoding
      │
      └──→ Notification
```
The user doesn't have to wait.

### Reason 4 — Resilience

Suppose:
```
Order Service
     ↓
Kafka
     ↓
Payment Service
```
Payment Service temporarily crashes.

The event can remain in the broker.

**When Payment Service comes back:**
```
Kafka
 │
 │ OrderPlaced
 ↓
Payment Service
```
It can process the event.

**This is much better than:**
```
Order Service → Payment Service ❌
```
where the direct request might fail immediately.

### Reason 5 — Multiple consumers

One event can be consumed by many services.

**For example:**
```
UserRegistered
       │
       ↓
     Kafka
       │
 ┌─────┼──────────┐
 ↓     ↓          ↓
Email  Analytics  Recommendation
Service Service    Service
```
The same event can have multiple independent consumers.

This is extremely useful in large systems.

### Reason 6 — Real-time systems

EDA is particularly useful when systems need to react to things happening continuously.

Examples:

**Uber**
```
DriverLocationUpdated
        ↓
     Kafka
        ↓
 ┌──────┼────────┐
 ↓      ↓        ↓
Maps   Pricing  ETA
Banking
TransactionCreated
        ↓
     Event Bus
        ↓
 ┌──────┼──────────┐
 ↓      ↓          ↓
Fraud  Ledger   Notification
Ticket booking
SeatBooked
    ↓
Kafka
    │
    ├──→ Payment
    ├──→ Ticket Generation
    ├──→ Notification
    └──→ Analytics
```

## Is Node.js the only technology using Event-Driven Architecture?

Absolutely not.

Many technologies and platforms use event-driven programming or architecture.

### Java

Popular technologies:
- Spring Boot
- Spring WebFlux
- Project Reactor
- Kafka
- Akka

**For example:**
```
Spring Boot
     ↓
Kafka
     ↓
Event consumers
```

### Python

**Python can use:**
- asyncio
- FastAPI
- Celery
- Kafka clients
- RabbitMQ
- aiohttp

**For example:**
```
FastAPI
   ↓
Kafka
   ↓
Background Consumers
```

### .NET / C#

**.NET supports:**
- async/await
- SignalR
- Channels
- Reactive programming
- Azure Service Bus
- Kafka
- RabbitMQ

**Example:**
```
ASP.NET Core
     ↓
Azure Service Bus
     ↓
Consumers
```

### Go

**Go applications commonly use:**
- goroutines
- channels
- Kafka
- NATS
- RabbitMQ

**Example:**
```
Go Service
    ↓
Kafka
    ↓
Consumer
```

## Cloud platforms are heavily event-driven

Modern cloud architecture uses EDA extensively.

For example, 

### AWS:
```
S3 File Uploaded
      ↓
     Event
      ↓
EventBridge
      ↓
 ┌────┼─────┐
 ↓    ↓     ↓
Lambda SQS  SNS
```

### Azure:
```
Event Grid
    ↓
Service Bus
    ↓
Functions
```

### Google Cloud:
```
Pub/Sub
   ↓
Cloud Run
   ↓
Cloud Functions
```
So event-driven architecture is much bigger than Node.js.

## Technologies you should know

For system-design interviews, remember this ecosystem:

| Technology               | Main purpose                          |
| ------------------------ | ------------------------------------- |
| **Kafka**                | High-throughput event streaming       |
| **RabbitMQ**             | Message broker / queues               |
| **Redis Streams**        | Lightweight event streaming           |
| **NATS**                 | High-performance messaging            |
| **AWS SNS/SQS**          | Cloud messaging                       |
| **Azure Service Bus**    | Cloud messaging                       |
| **Google Pub/Sub**       | Cloud messaging                       |
| **WebSockets**           | Real-time client-server communication |
| **Node.js EventEmitter** | In-process events                     |
| **Java Reactor**         | Reactive/event-driven programming     |
| **Python asyncio**       | Asynchronous event loop               |

## One complete real-world example

Let's take an e-commerce application.

User clicks:
```
BUY NOW
```

### Step 1

Angular:
```
POST /orders
```

### Step 2

Node.js Order Service:
```
Create Order
```

### Step 3

Order Service publishes:
```
OrderCreated
```

### Step 4

**Kafka receives it:**
```
                    Kafka
                      │
             OrderCreated
                      │
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
 Payment          Inventory       Notification
 Service           Service          Service
       │              │              │
       ↓              ↓              ↓
 Payment          Reserve         Send Email
```

### Step 5

**Payment service publishes:**
```
PaymentCompleted
```

**Then:**
```
PaymentCompleted
       ↓
     Kafka
       ↓
 ┌─────┼───────────┐
 ↓     ↓           ↓
Order Inventory Notification
Service Service    Service
```
This creates a chain of events.

## Why companies love this architecture

**At large scale:**
```
                    Event Bus
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
    Service A       Service B        Service C
       │               │                │
       ↓               ↓                ↓
    Database        Database         Database
```

**You get:**
- Loose coupling
- Independent scaling
- Asynchronous processing
- Better resilience
- Multiple consumers
- Real-time processing
- Easier integration between services
- Ability to replay events in systems such as Kafka

## But EDA is NOT always better

This is important for interviews.

**Don't say:**
```
"Event-driven architecture is always better."
```
It introduces complexity.

**For example:**
```
Service A
   ↓
Kafka
   ↓
Service B
   ↓
Kafka
   ↓
Service C
```
Now debugging can become difficult.

**You have to deal with:**
- eventual consistency
- duplicate events
- ordering
- retries
- dead-letter queues
- idempotency
- monitoring/tracing
- schema evolution
- message delivery guarantees

**So a simple application may be better with:**
```
Frontend
   ↓
Backend
   ↓
PostgreSQL
```
You don't need Kafka just because it's popular.

## The easiest way to remember

Think of restaurant waiters.

### Traditional synchronous
```
Customer
   ↓
Waiter
   ↓
Kitchen
   ↓
Wait
   ↓
Food
   ↓
Customer
```

### Event-driven
```
Customer
   ↓
OrderCreated Event
   ↓
Kitchen Queue
   ↓
Chef reacts
   ↓
FoodReady Event
   ↓
Waiter reacts
   ↓
Customer
```

The key idea is:
> **Don't constantly ask another component to do something. Publish what happened, and let interested components react to it.**

------------------------------------------------------------------------------

## Event-Driven Architecture — Core Components

Think of Event-Driven Architecture (EDA) as a system where:
> **Something happens → an event is produced → an event is transported → interested services consume it → they react.**

**The core components are:**
```
                  EVENT-DRIVEN ARCHITECTURE

 ┌──────────────┐
 │   Producer   │
 │  Service A   │
 └──────┬───────┘
        │
        │ 1. Publish Event
        ↓
 ┌──────────────────┐
 │  Event Broker /  │
 │   Event Bus      │
 │ Kafka/RabbitMQ   │
 └────────┬─────────┘
          │
          │ 2. Deliver Event
          ↓
    ┌─────┼─────────┬──────────┐
    ↓     ↓         ↓          ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Consumer│ │Consumer│ │Consumer│ │Consumer│
│Payment │ │Inventory│ │ Email │ │Analytics│
└────────┘ └────────┘ └────────┘ └────────┘
    │          │          │          │
    ↓          ↓          ↓          ↓
  Action     Action     Action     Action
```
There are 6 major components you should know.

### 1. Event Producer

The producer is the component that detects that something happened and publishes an event.

**Example:**
```
Order Service
     │
     │ OrderCreated
     ↓
   Kafka
```

**For example, a user places an order:**
```
{
  "eventType": "OrderCreated",
  "orderId": "ORD-101",
  "userId": "U-500",
  "amount": 2500
}
```
The Order Service is the event producer.

**Examples**
- Order Service
- Payment Service
- User Service
- IoT device
- Web application
- Database CDC system

### 2. Event

An event is the message representing something that happened.

**Examples:**
```
UserRegistered
OrderCreated
PaymentCompleted
PaymentFailed
SeatBooked
FileUploaded
ProductUpdated
```

**A good mental model:**
```
Command:
"Please create an order."

Event:
"Order has been created."
```

**Example event**
```
{
  "eventId": "EVT-123",
  "eventType": "PaymentCompleted",
  "timestamp": "2026-08-29T10:30:00Z",
  "data": {
    "paymentId": "PAY-100",
    "orderId": "ORD-101",
    "amount": 2500
  }
}
```

**An event normally contains:**
```
Event ID
Event Type
Timestamp
Source
Payload/Data
Metadata
```

### 3. Event Broker / Event Bus

This is the middle layer that transports events between producers and consumers.
```
Producer
   │
   ↓
┌─────────────────┐
│  Event Broker   │
│                 │
│ Kafka           │
│ RabbitMQ        │
│ NATS            │
│ AWS SNS/SQS     │
└─────────────────┘
   │
   ↓
Consumers
```

**Popular technologies:**
- Apache Kafka
- RabbitMQ
- NATS
- AWS SNS/SQS
- Azure Service Bus
- Google Pub/Sub
- Redis Streams

**The broker handles things like:**
- storing messages
- delivering messages
- routing
- buffering
- retrying
- scaling consumers
- sometimes replaying events

### 4. Event Consumer

A consumer is a component that listens for events and performs some action.

Example:
```
                OrderCreated
                     ↓
                  Kafka
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
     Payment      Inventory     Email
     Consumer      Consumer     Consumer
```
When:
```
OrderCreated
```
occurs:

Payment Consumer
```
Process payment
```
Inventory Consumer
```
Reserve product
```
Email Consumer
```
Send confirmation email
```
Each consumer can independently react to the same event.

### 5. Event Handler / Processor

The consumer receives an event, but something needs to process it.

That's the event handler/processor.
```
Kafka
  │
  │ OrderCreated
  ↓
Consumer
  │
  ↓
Event Handler
  │
  ├── Validate
  ├── Process
  ├── Update DB
  └── Publish next event
```

**For example:**
```
async function handleOrderCreated(event) {

    const order = event.data;

    await reserveInventory(order.orderId);

    await publishEvent({
        type: "InventoryReserved",
        orderId: order.orderId
    });
}
```

**So:**
```
Consumer
   ↓
Handler
   ↓
Business Logic
```

### 6. Event Store

An Event Store stores events for future use.

This becomes particularly important in systems using event sourcing.

For example:

### Event Store
```
EVT-001  UserRegistered
EVT-002  OrderCreated
EVT-003  PaymentCompleted
EVT-004  OrderShipped
EVT-005  OrderDelivered
```
Why store events?

#### Replay

Suppose your Analytics Service was down.

Later:
```
Event Store
     ↓
Replay events
     ↓
Analytics Service
```
It can reconstruct the information it missed.

Kafka, for example, can retain events for a configured period, allowing consumers to replay them.

### Complete Architecture

Putting everything together:
```
                         EVENT-DRIVEN ARCHITECTURE

 ┌──────────────────┐
 │   Event Producer │
 │                  │
 │   Order Service  │
 └────────┬─────────┘
          │
          │  OrderCreated
          ↓
 ┌──────────────────────────┐
 │      EVENT BROKER         │
 │                           │
 │   Kafka / RabbitMQ/NATS   │
 │                           │
 │  Topic: orders            │
 └────────────┬─────────────┘
              │
      ┌───────┼───────────┐
      ↓       ↓           ↓
 ┌────────┐ ┌─────────┐ ┌──────────┐
 │Payment │ │Inventory│ │Notification│
 │Consumer│ │Consumer │ │ Consumer │
 └───┬────┘ └────┬────┘ └─────┬────┘
     │            │             │
     ↓            ↓             ↓
 Handler       Handler       Handler
     │            │             │
     ↓            ↓             ↓
 Payment DB   Inventory DB   Email/SMS
```



