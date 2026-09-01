# REST, SOAP, GraphQL, gRPC & WebSockets
These are five different ways for applications/services to communicate. The key difference is how data is exchanged, how the contract is defined, and whether communication is request/response or real-time.

## REST vs SOAP vs GraphQL vs gRPC vs WebSockets
| Technology     | Communication                  | Data Format      | Best For               | Main Strength                |
| -------------- | ------------------------------ | ---------------- | ---------------------- | ---------------------------- |
| **REST**       | Request → Response             | JSON, XML        | Web/mobile APIs        | Simple & widely supported    |
| **SOAP**       | Request → Response             | XML              | Enterprise systems     | Strong standards & contracts |
| **GraphQL**    | Request → Response             | JSON             | Flexible frontend APIs | Client chooses data          |
| **gRPC**       | Request → Response / Streaming | Protobuf         | Microservices          | Very fast & strongly typed   |
| **WebSockets** | Bidirectional, persistent      | JSON/Binary/etc. | Real-time apps         | Server can push instantly    |

## 1. REST

**REST = Representational State Transfer**

Usually uses HTTP methods:
```
GET     /users/101
POST    /users
PUT     /users/101
DELETE  /users/101
```
Example:
```
GET /api/users/101
```
Response:
```
{
  "id": 101,
  "name": "Piyali",
  "role": "Developer"
}
```

**Architecture**
```
Angular / React / Mobile
          │
          │ HTTP + JSON
          ▼
     REST API
          │
          ▼
      Database
```

**Advantages**
- Simple
- Easy to debug
- Browser-friendly
- Excellent tooling
- Works well with HTTP caching/CDNs
- Very common for public APIs

**Disadvantages**

Suppose frontend needs:
```
User
 ├── name
 ├── email
 └── orders
      ├── id
      └── amount
```
You may need multiple endpoints:
```
GET /users/101
GET /users/101/orders
GET /orders/5001
```
This can result in over-fetching or under-fetching.

Best use
- Public APIs, CRUD applications, web/mobile backends.

## 2. SOAP

SOAP = Simple Object Access Protocol

SOAP is an XML-based messaging protocol.

**Example:**
```
<soap:Envelope>
  <soap:Body>
    <GetUser>
      <UserId>101</UserId>
    </GetUser>
  </soap:Body>
</soap:Envelope>
```

**Response:**
```
<soap:Envelope>
  <soap:Body>
    <GetUserResponse>
      <User>
        <Id>101</Id>
        <Name>Piyali</Name>
      </User>
    </GetUserResponse>
  </soap:Body>
</soap:Envelope>
```

**Architecture:**
```
Client
   │
   │ XML SOAP Message
   ▼
SOAP Service
   │
   ├── WS-Security
   ├── Transactions
   ├── Reliable Messaging
   │
   ▼
Database / Enterprise System
```
SOAP commonly uses WSDL to formally describe the service contract.

**Advantages**
- Strong contract
- XML schema validation
- Mature enterprise standards
- WS-Security
- Transaction support
- Reliable messaging standards

**Disadvantages**
- Verbose XML
- More complex
- Heavier than REST
- Less convenient for modern frontend development

**Best use**

You will often encounter SOAP in:
- Banking
- Insurance
- Government systems
- Legacy enterprise applications
- B2B integrations

## 3. GraphQL

GraphQL allows the client to specify exactly what data it wants.

**Instead of:**
```
GET /users/101
GET /users/101/orders
```

**The client can send:**
```
query {
  user(id: 101) {
    name
    email
    orders {
      id
      amount
    }
  }
}
```

**Response:**
```
{
  "data": {
    "user": {
      "name": "Piyali",
      "email": "piyali@example.com",
      "orders": [
        {
          "id": 5001,
          "amount": 1200
        }
      ]
    }
  }
}
```

**Architecture:**
```
                ┌── User Service
                │
Angular ──► GraphQL ── Order Service
                │
                └── Product Service
```
GraphQL acts as an API layer over multiple backend services.

**Key concepts**
```
Query       → Read data
Mutation    → Change data
Subscription → Real-time updates
Schema      → API contract
Resolver    → Fetches data
```

**Biggest advantage**

The frontend controls the response shape.
```
REST:

GET /products/10

May return:
name
price
description
supplier
reviews
inventory
...

GraphQL:

query {
  product(id: 10) {
    name
    price
  }
}
```

### Best use

Particularly useful when:
- Multiple frontend clients need different data
- UI screens require nested data
- Mobile bandwidth matters
- Backend has many data sources

## 4. gRPC

gRPC = Google Remote Procedure Call

Instead of JSON, gRPC commonly uses:

Protocol Buffers (Protobuf)

Example .proto contract:
```
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
}

message GetUserRequest {
  int32 id = 1;
}

message User {
  int32 id = 1;
  string name = 2;
}
```
**Architecture:**
```
Service A
   │
   │ HTTP/2
   │ Protobuf
   ▼
┌─────────────┐
│ gRPC Server │
└─────────────┘
   │
   ▼
Service B
```

### Why is gRPC fast?

Traditional REST:
```
JSON
 ↓
Text serialization
 ↓
HTTP
```
gRPC:
```
Protobuf
 ↓
Binary serialization
 ↓
HTTP/2
```
Protobuf messages are generally smaller and faster to serialize/deserialize than JSON.

### gRPC also supports streaming
```
Client ───────────────► Server
       request

Server ───────────────► Client
       response 1
       response 2
       response 3
       response 4
```
Types include:
```
Unary
Server Streaming
Client Streaming
Bidirectional Streaming
```

### Best use

**Excellent for:**
- Microservices
- Internal service-to-service communication
- High-throughput systems
- Low-latency systems
- Streaming

## 5. WebSockets

WebSocket is fundamentally different from REST.

**REST:**
```
Client ── Request ──► Server
Client ◄─ Response ── Server
```
Connection ends

**WebSocket:**
```
Client ◄══════════════════► Server
          Persistent
          connection

Server can push data
at any time
```

**Example:**
```
Angular Application
       │
       │ WebSocket
       ▼
WebSocket Server
       │
       ├── Order Service
       ├── Redis Pub/Sub
       └── Database
```

**Imagine a trading application:**
```
                    ┌── Price Service
                    │
Browser ══WebSocket══►
                    │
                    ├── Order Service
                    │
                    └── Market Data
```

**Server can send:**
```
{
  "event": "PRICE_UPDATED",
  "symbol": "AAPL",
  "price": 228.45
}
```
without the browser asking for it.

**Best use**
- Chat
- Live notifications
- Stock prices
- Online gaming
- Live dashboards
- Real-time order tracking

## The Most Important Difference

Think about who initiates communication.

**REST**
```
Client ─────────► Server
       request

Client ◄───────── Server
       response
```
Server normally waits for a request.

**GraphQL**
```
Client ─────────► GraphQL
     "Give me exactly this"

Client ◄───────── GraphQL
       requested data
```

**gRPC**
```
Service A ───────► Service B
          RPC

Service B ───────► Service A
          response
```
Designed especially well for service-to-service communication.

**WebSocket**
```
Client ◄══════════► Server
        anytime
```
Both sides can send messages whenever needed.

**SOAP**
```
Client ── XML Request ──► SOAP Service
Client ◄─ XML Response ── SOAP Service
```
The key distinction is its formal XML-based messaging and enterprise standards, rather than being primarily about real-time communication.

## A Practical Architecture

In a large application, you don't necessarily choose one.

You can use all of them:
```
                     Internet
                        │
                        ▼
                ┌──────────────┐
                │ API Gateway  │
                └──────┬───────┘
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
       REST         GraphQL       WebSocket
          │            │             │
          │            ▼             │
          │       BFF / API         │
          │            │             │
          └────────────┼─────────────┘
                       │
                 Internal Network
                       │
                 ┌─────┴─────┐
                 │           │
                 ▼           ▼
             gRPC         gRPC
           Service A     Service B
                 │           │
                 └─────┬─────┘
                       ▼
                   Database

Legacy Enterprise System
          ▲
          │ SOAP
          │
      Integration
       Service
```

### For an Angular 19 + Node.js/FastAPI microservices application, I would typically consider:
```
Angular
   │
   ├── REST / GraphQL ──► API/BFF
   │
   └══ WebSocket ═══════► Real-time Gateway

API/BFF
   │
   ├── gRPC ──► User Service
   ├── gRPC ──► Order Service
   ├── gRPC ──► Payment Service
   │
   └── REST ──► External APIs

Legacy Bank/Insurance API
   │
   └── SOAP
Interview shortcut
```

## Remember it like this:
```
REST = resources
SOAP = enterprise contract
GraphQL = client-controlled data
gRPC = fast service-to-service RPC
WebSocket = real-time bidirectional communication
```
And one important interview point:
> **REST, SOAP, GraphQL and gRPC are not all direct substitutes for WebSockets. WebSockets solve a different problem: maintaining a persistent bidirectional connection for real-time communication.**
