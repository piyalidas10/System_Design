# gRPC

> *Notes from the System Design course (API Part 4). Previous parts: [`SOAP.md`](SOAP.md), [`REST.md`](REST.md), [`GraphQL.md`](GraphQL.md).*

**gRPC** is a **high-performance API framework developed by Google** for communication between internal services in distributed systems / microservices architectures. It is an acronym: **g**RPC = **Google Remote Procedure Call**.

**In one line:** gRPC = calling a function that runs on another machine, using binary data over HTTP/2.

---

## 1. Where gRPC Fits in API Evolution

```
+-----------+      +-----------+      +-------------+      +-----------+
| SOAP API  | ---> | REST API  | ---> | GraphQL API | ---> | gRPC API  |
| (XML)     |      | (JSON)    |      | (Query)     |      | (HTTP/2 + |
|           |      |           |      |             |      |  Protobuf)|
+-----------+      +-----------+      +-------------+      +-----------+
```

gRPC is the next, more advanced form of API after SOAP, REST and GraphQL.

---

## 2. Intuition: REST vs gRPC

| Aspect | REST | gRPC |
| :--- | :--- | :--- |
| **Feels like** | Sending an HTTP request to a URL | Calling a function that runs on another server |
| **Building blocks** | URL, HTTP verb (GET / POST / PUT), request body | Remote method call with typed arguments |
| **Payload format** | Usually JSON | Protocol Buffers (binary) |
| **Transport** | HTTP/1.1 (typically) | HTTP/2 |

**REST - create a user:**

```http
POST /users
Content-Type: application/json

{ "name": "Vishwa" }
```

**gRPC - create a user:**

```
CreateUser(name = "Vishwa")
```

With gRPC the client appears to call a local function, but the function is actually executed on a **different machine**. It does not feel like you are making an API call.

---

## 3. Why Was gRPC Created?

A new technology is built only when previous systems have problems. Google engineers working on large distributed systems / microservices saw that **REST + JSON** for **internal service-to-service communication** was:

- **Slow** - takes a lot of time.
- **Bandwidth hungry** - consumes a lot of network bandwidth.
- **Heavy** - JSON, once considered lightweight (when it replaced SOAP/XML), became heavy at this scale.

> In IT, everything is relative. What is light today can be heavy tomorrow; what is fast today can be slow tomorrow.

**Consequences of heavy JSON:**

```
Heavy JSON
   │
   ▼
Slower serialization (converting data to 0s and 1s)
   │
   ▼
More space + too much bandwidth
   │
   ▼
Higher cost + more lag
   │
   ▼
Inefficient microservice communication
```

Google decided REST had reached its limit for internal communication and built something new that solves this: **gRPC**.

---

## 4. Core Technologies Behind gRPC

| # | Pillar | What it gives you |
| :--- | :--- | :--- |
| 1 | **HTTP/2** as the transport layer | Fast, two-way communication between client and server |
| 2 | **Protocol Buffers (Protobuf)** instead of JSON/XML | Compact **binary serialization** - less space, very efficient |
| 3 | **RPC model** | Remote function calling between services |

### 4.1 HTTP/2 (Transport Layer)

- gRPC is built on top of HTTP/2 (REST commonly uses HTTP/1.1).
- All client ↔ server request/response traffic flows over HTTP/2.
- HTTP/2 allows a **two-way handshake / bidirectional communication**.
- Features HTTP/2 brings over HTTP/1.x:
  - **Persistent connections**
  - **Header compression**
  - **Multiplexing** (many requests on one connection)
  - **Server push**

> **Assignment from the video:** read about how HTTP/2 is better than HTTP/1.1.

### 4.2 Protocol Buffers (Protobuf)

| API style | Data format |
| :--- | :--- |
| SOAP | XML |
| REST | JSON |
| gRPC | **Protocol Buffers** (compact binary serialization) |

Result: **less space**, very **optimal**.

### 4.3 RPC Model (Remote Procedure Call)

- Looks like **remote function calling between services**.
- When a client calls a service it does not feel like an API call - it feels like the client is calling a function (e.g. `GetUser`).
- The function (RPC method) is executed remotely on another service.

---

## 5. gRPC Architecture and Workflow

### Step 1 - Define a `.proto` file

Create a `.proto` file (e.g. `user.proto`) that defines:

1. **Request** structure
2. **Response** structure
3. **Service** with its available methods

```protobuf
syntax = "proto3";

// Request
message UserRequest {
  int32 id = 1;          // field type + name + field number
}

// Response
message UserResponse {
  string name  = 1;
  string email = 2;
}

// Service
service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
}
```

### Step 2 - Generate client and server code

Based on the `.proto` file, **auto-generate** the code for both sides using the **`protoc`** compiler (Protocol Buffers compiler).

```
              user.proto
                  │
                protoc
         ┌────────┴────────┐
         ▼                 ▼
  Client stub code    Server stub code
```

- Works for many languages: Java, Python, Node.js, etc.
- You do **not** write this code by hand - `protoc` generates it.

### Step 3 - Make the call

```
┌───────────────────┐                                      ┌───────────────────┐
│  Client App       │                                      │  gRPC Server      │
│  (gRPC client     │                                      │  (server stub +   │
│   stub)           │                                      │   business logic) │
│                   │                                      │                   │
│ GetUser(1001)     │                                      │ - DB calls        │
│   │               │                                      │ - remote services │
│   ▼               │   Binary (Protobuf) over HTTP/2      │ - other APIs      │
│ Serialize with    │ ───────────────────────────────────► │   │               │
│ Protobuf (binary) │                                      │   ▼               │
│                   │                                      │ Compute response  │
│                   │   Binary (Protobuf) over HTTP/2      │   │               │
│ Deserialize       │ ◄─────────────────────────────────── │   ▼               │
│ response          │                                      │ Serialize w/      │
│                   │                                      │ Protobuf (binary) │
└───────────────────┘                                      └───────────────────┘
```

Detailed flow:

1. Client application calls the generated **client stub** function, e.g. `GetUser(1001)`.
2. The request object is **serialized with Protobuf** into compact binary data (very space optimized).
3. Binary data is sent over **HTTP/2** (persistent connection, header compression, multiplexing, server push).
4. **gRPC server** accepts the request and runs the **business logic** (calls DB, remote services, APIs, does calculations).
5. The response is again **serialized with Protobuf** into binary.
6. Response travels back over **HTTP/2** to the client.
7. Client **deserializes** the binary data and gets the response.

### Key takeaway - three main things

1. **Transport layer** = HTTP/2
2. **Data format** = Protocol Buffers instead of JSON
3. **Calling style** = looks like a remote function call

---

## 6. Why Is gRPC Faster Than REST?

| # | Reason | Explanation |
| :--- | :--- | :--- |
| 1 | **Protobuf binary serialization** | JSON serialized directly becomes bulky; Protobuf is very lightweight, so serialization is cheaper and payloads are smaller. |
| 2 | **HTTP/2** | An advanced version of HTTP with built-in optimizations (multiplexing, header compression, persistent connections). |
| 3 | **Strongly typed contracts** | Client and server already know the schema, so field names need not be sent repeatedly. |
| 4 | **Auto code generation + streaming support** | `protoc` generates code; streaming is possible because of HTTP/2 (REST has no native streaming support). |

### Strongly typed contract - example

REST - every call sends field names again:

```json
{ "name": "Vishwa" }
```

Whether you call once, 50 times or 2000 times, the key `name` is sent every time, which is redundant.

gRPC - the contract is strongly typed and known to both sides, so only the **value** is sent. This **saves size**.

---

## 7. Types of gRPC Communication

### 7.1 Unary RPC

The simplest form - very similar to normal REST request/response. One request, one response. The only difference is that it looks like a remote function call.

```
Client ── Request ──► Server
Client ◄─ Response ── Server
```

### 7.2 Server Streaming

Client sends **one request**; the server keeps sending **multiple responses**.

```
Client ── Request 1 ──────────► Server
Client ◄─ Response 1 ─────────── Server
Client ◄─ Response 2 ─────────── Server
Client ◄─ Response 3 ─────────── Server
```

**Use cases:** live stock prices (update every few seconds), logs, notifications, live cricket scores (e.g. Cricinfo during IPL pushing updates to your browser).

### 7.3 Client Streaming

Opposite of server streaming. The client keeps sending **continuous requests** over a single open connection.

```
Client ── Request 1 ──► Server
Client ── Request 2 ──► Server
Client ── Request 3 ──► Server
Client ◄─ Response ──── Server
```

**Use cases:** video upload, telemetry data. A long-duration connection stays open and the client continuously sends data to the server.

### 7.4 Bidirectional Streaming

Once a connection is established, **both client and server keep sending data** to each other.

```
Client ◄────────────────► Server
   (both send continuously)
```

**Use cases:** live chat, multiplayer games, real-time AI systems.

### Summary

| Type | Client sends | Server sends | Example |
| :--- | :--- | :--- | :--- |
| **Unary** | 1 request | 1 response | Get user by ID |
| **Server streaming** | 1 request | Many responses | Live stock prices, notifications |
| **Client streaming** | Many requests | 1 response | Video upload, telemetry |
| **Bidirectional streaming** | Many requests | Many responses | Chat, multiplayer games, real-time AI |

---

## 8. Use Cases of gRPC

| Use case | Why gRPC fits |
| :--- | :--- |
| **Microservices** | Many small services talking to each other. |
| **High-performance systems** | Minimal network bandwidth, low cost, fast. |
| **Polyglot systems** | Multiple technologies, languages and databases in use; `protoc` generates code for each language. |
| **Streaming systems** | Two-way communication; data sent in chunks instead of all at once. |

> The instructor mentioned that at LinkedIn they started moving away from REST and leveraging gRPC.

---

## 9. REST vs gRPC - What to Use When (2026 view)

| Scenario | Recommended | Reason |
| :--- | :--- | :--- |
| **Internal microservice ↔ microservice** | **gRPC** | Better performance (people still use REST, but gRPC is the right design). |
| **Browser → public API** | **REST** | Browser-level gRPC support is limited. |
| **Frontend (browser) calling backend** | **REST** | Same browser limitation. |
| **Real-time streaming** | **gRPC** | More efficient. |
| **High-throughput systems** | **gRPC** | More efficient. |
| **Mobile backend efficiency** | **gRPC** | Smaller payloads, faster. |
| **Public / third-party API** | **REST** | You don't know who is calling or whether they know how to call gRPC. |

**Thumb rule:** If you are building **internal** applications / microservices / distributed systems where **performance is a criterion**, go with **gRPC**. For public, browser-facing APIs, go with **REST**.

---

## 10. Challenges of gRPC

| Challenge | Description |
| :--- | :--- |
| **Browser support** | gRPC-Web exists, but using gRPC directly in the browser is a challenge. |
| **Debugging is complicated** | Client and server stubs are auto-generated, so identifying the source of a problem is harder than in REST. |
| **Steeper learning curve** | Harder to learn than REST. |
| **Not human readable** | Protobuf is serialized to binary (0s and 1s), so payloads cannot be read directly. |
| **API gateway complexity** | Gateways need extra support/handling for gRPC. |
| **Versioning complexity** | Evolving `.proto` contracts needs care. |

---

## 11. SOAP vs REST vs GraphQL vs gRPC (Quick Comparison)

| Feature | SOAP | REST | GraphQL | gRPC |
| :--- | :--- | :--- | :--- | :--- |
| **Data format** | XML | JSON | JSON | Protobuf (binary) |
| **Transport** | HTTP (and others) | HTTP/1.1 | HTTP | HTTP/2 |
| **Style** | Strict contract | Resource + HTTP verbs | Client-controlled queries | Remote function call |
| **Streaming** | No | No (native) | Limited | Yes (4 types) |
| **Human readable** | Yes | Yes | Yes | No |
| **Best for** | Legacy / enterprise | Public APIs, web | Flexible client data fetching | Internal microservices, high performance |

---

## 12. Key Takeaways

1. **gRPC = Google Remote Procedure Call** - high-performance API framework by Google.
2. Built on **HTTP/2** + **Protocol Buffers** + **RPC model**.
3. Workflow: write `.proto` → generate stubs with `protoc` → call like a local function → Protobuf binary over HTTP/2.
4. Faster than REST because of binary serialization, HTTP/2, strongly typed contracts, and code generation + streaming.
5. Four communication types: **Unary, Server streaming, Client streaming, Bidirectional streaming**.
6. Best for **internal microservices, high-performance, polyglot and streaming systems**; use REST for **browser / public / third-party APIs**.
7. Challenges: browser support, debugging, learning curve, non-human-readable payloads, API gateway and versioning complexity.

---

## 13. Follow-ups from the Video

- Read about **HTTP/2 vs HTTP/1.1** and explain how HTTP/2 is better.
- Try building a **small gRPC application** yourself (the instructor offered a dedicated project video if viewers ask for it).
