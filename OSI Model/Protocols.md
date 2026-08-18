# Protocols

## WebSocket — Persistent two-way channel
A protocol that upgrades from HTTP to a persistent, full-duplex connection. After the upgrade, both client and server can send messages anytime — no polling, no new requests. Perfect for real-time apps.

> **Analogy: HTTP is like exchanging letters — you write, mail, wait for reply, then write again. WebSocket is like picking up the phone and keeping the line open. Both sides can talk anytime without redialing.**

```
WebSocket uses an initial HTTP Upgrade handshake and receives 101 Switching Protocols;
after that, the connection becomes a persistent, full-duplex channel where both client and server can independently send WebSocket frames.
```

**WebSocket Upgrade Flow**
```
       💻 CLIENT                                      🛰️ SERVER
           │                                             │
           │  1. HTTP Upgrade Request                    │
           │────────────────────────────────────────────>│
           │  GET /chat HTTP/1.1                         │
           │  Host: example.com                          │
           │  Upgrade: websocket                         │
           │  Connection: Upgrade                        │
           │  Sec-WebSocket-Key: <key>                   │
           │                                             │
           │                                             │
           │  2. HTTP 101 Switching Protocols            │
           │<────────────────────────────────────────────│
           │  HTTP/1.1 101 Switching Protocols           │
           │  Upgrade: websocket                         │
           │  Connection: Upgrade                        │
           │                                             │
           │                                             │
           │       🔄 HTTP → WEBSOCKET                   │
           │                                             │
           │  3. WebSocket Frames                       │
           │<═══════════════════════════════════════════>│
           │                                             │
           │  Client → Server: "Hello"                   │
           │────────────────────────────────────────────>│
           │                                             │
           │  Server → Client: "Hi!"                     │
           │<────────────────────────────────────────────│
           │                                             │
           │  Server → Client: Notification              │
           │<────────────────────────────────────────────│
           │                                             │
           │  Client → Server: Chat message              │
           │────────────────────────────────────────────>│
           │                                             │
           │                                             │
           │       ❤️ PING / PONG                        │
           │<────────────────────────────────────────────>│
           │       Keep connection alive                 │
           │                                             │
           │                                             │
           │       🔴 CLOSE                              │
           │<────────────────────────────────────────────>│
           │       Connection terminated                 │
           │                                             │
```

**The important system-design concept**
```
HTTP Connection
      │
      │  Upgrade: websocket
      ▼
101 Switching Protocols
      │
      ▼
┌───────────────────────────────┐
│      WebSocket Connection     │
│                               │
│  Client ────────────────►     │
│  Client ◄────────────────     │
│                               │
│  Full Duplex                  │
│  Persistent Connection        │
│  Low Latency                  │
│  Server Push                  │
└───────────────────────────────┘
```

**🔥 Why WebSocket instead of polling?**

Traditional polling:
```
Client ── GET ──► Server
Client ◄─ data ── Server


wait...


Client ── GET ──► Server
Client ◄─ data ── Server


wait...


Client ── GET ──► Server
```
Lots of unnecessary HTTP requests.

WebSocket:
```
Client ═══════════════════════ Server
             persistent
             connection


Client ◄──────── message ───── Server
Client ──────── message ─────► Server
Client ◄──── notification ──── Server
Client ──────── event ───────► Server
```
The server doesn't have to wait for the client to ask for new data.


## 🚀 gRPC — High-performance service-to-service RPC

A modern Remote Procedure Call framework built by Google. 
Runs over HTTP/2 with binary Protocol Buffers for serialization. 
Designed for service-to-service communication where performance and strict contracts matter.

> **Analogy: REST is like writing letters in natural language — flexible but verbose. gRPC is like both sides agreeing on a strict standardized form with pre-printed fields. Everyone knows exactly what goes where, no parsing needed — way faster.**

**The 4 communication patterns**
- Unary : 1 request → 1 response (like REST)
- Server Streaming : 1 request → many responses
- Client Streaming : Many requests → 1 response
- Bidirectional : Many ↔ Many (concurrent)

**gRPC vs REST**

| **Feature**           | **REST + JSON**                              | **gRPC + Protobuf**                                       |
| --------------------- | -------------------------------------------- | --------------------------------------------------------- |
| **Transport**         | HTTP/1.1 or HTTP/2                           | HTTP/2 required                                           |
| **Payload**           | JSON — text, verbose                         | Protobuf — binary, compact                                |
| **Contract**          | OpenAPI — optional                           | `.proto` file — required                                  |
| **Streaming**         | Limited — SSE / chunked responses            | **Full bidirectional streaming**                          |
| **Browser Support**   | **Native**                                   | Requires **gRPC-Web / proxy**                             |
| **Debug-ability**     | **Easy** — `curl`, browser DevTools, Postman | Requires specialized tools such as `grpcurl`              |
| **Performance**       | Good                                         | **Typically faster and more efficient**                   |
| **Payload Size**      | Larger                                       | **Smaller**                                               |
| **Serialization**     | JSON parsing — relatively expensive          | **Binary serialization — efficient**                      |
| **Human Readability** | **Excellent**                                | Low — binary format                                       |
| **Code Generation**   | Optional                                     | **Built-in from `.proto`**                                |
| **Best For**          | Public APIs, web/mobile clients              | Internal microservices, high-performance communication    |
| **Language Support**  | Virtually universal                          | Strong multi-language support through generated clients   |
| **API Evolution**     | Managed through API/versioning conventions   | Strong schema evolution with Protobuf                     |
| **Caching**           | **Easy with HTTP semantics/CDNs**            | Less straightforward                                      |
| **Load Balancing**    | Easy with standard HTTP infrastructure       | Requires HTTP/2-aware/service-mesh/load-balancing support |
| **Typical Example**   | `GET /users/123` → JSON                      | `GetUser(UserRequest)` → Protobuf                         |
| **Interview Choice**  | **Public-facing API**                        | **Service-to-service communication**                      |


**✅ Why use gRPC**
- Binary = small + fast
- Strong typed contracts
- Generated client/server code (12+ langs)
- Native streaming support

**⚠️ Trade-offs**
- Not browser-native
- Harder to debug manually
- Schema must be kept in sync
- Overkill for simple public APIs

**📍 Where it's used**
- Microservice ↔ microservice
- Internal backend APIs
- Mobile clients (low bandwidth)
- Kubernetes internal APIs


