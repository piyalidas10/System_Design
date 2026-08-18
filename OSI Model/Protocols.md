# Protocols

**Application Layer — Where Your APIs Live**

Layer 7 is where actual application data lives. HTTP requests, WebSocket messages, gRPC calls — all of these are application-layer protocols. This is the layer most system design discussions happen at. API gateways, reverse proxies, and most authentication logic operate here.

## HTTPS — HTTP over TLS (Encrypted, TLS 1.3, Mandatory in 2024)
HTTPS is HTTP wrapped inside a TLS (Transport Layer Security) tunnel. TLS does three things: verifies identity (server is who it claims), negotiates keys, and encrypts everything. Modern web requires it — browsers mark plain HTTP as "Not Secure".

> **Analogy: Imagine sending a postcard (HTTP) — anyone delivering it can read it. HTTPS is like putting that postcard in a tamper-proof sealed envelope. Before sealing, both sender and receiver verify each other's identity (certificate) and agree on a secret code (encryption key) only they know.**

**🔐 TLS 1.3 Handshake Flow**

TLS 1.3 reduced the handshake to just 1 round-trip (down from 2 in TLS 1.2). Combined with QUIC, can even be 0-RTT for returning clients.
```
💻 CLIENT                                      🔐 SERVER
    │                                               │
    │  ClientHello                                 │
    │──────────────────────────────────────────────>│
    │                                               │
    │  • Supported cipher suites                   │
    │  • Random                                    │
    │  • Key share (ECDHE)                         │
    │  • Supported TLS versions                    │
    │                                               │
    │                                               │
    │                       ServerHello             │
    │<──────────────────────────────────────────────│
    │                                               │
    │                       • Selected cipher       │
    │                       • Server key share      │
    │                       • Certificate           │
    │                       • CertificateVerify     │
    │                       • Finished              │
    │                                               │
    │                                               │
    │  Verify certificate                           │
    │  + calculate shared secret                    │
    │                                               │
    │  Finished                                    │
    │──────────────────────────────────────────────>│
    │                                               │
    │        🔐 HANDSHAKE COMPLETE                  │
    │                                               │
    │═══════════════════════════════════════════════│
    │          🔒 ENCRYPTED APPLICATION DATA       │
    │                                               │
    │  HTTPS Request                                │
    │──────────────────────────────────────────────>│
    │                                               │
    │  HTTPS Response                               │
    │<──────────────────────────────────────────────│
    │                                               │
```

**🧠 What's actually happening?**
```
Client Private Key Material
          +
Server Private Key Material
          │
          ▼
       ECDHE
          │
          ▼
   Shared Secret
          │
          ▼
   TLS Key Derivation
          │
     ┌────┴────┐
     ▼         ▼
Client Key   Server Key
     │         │
     └────┬────┘
          ▼
   🔒 Symmetric Encryption
          │
          ▼
     HTTPS Traffic
```
The server's certificate doesn't directly encrypt the HTTP data. Its primary role is to authenticate the server's identity. The actual application traffic is encrypted using symmetric keys derived during the handshake.

**🔥 TLS 1.3 vs HTTP**

The complete stack looks like:
```
┌─────────────────────────────┐
│       HTTP / HTTPS          │  ← Application
├─────────────────────────────┤
│       TLS 1.3               │  ← Encryption + authentication
├─────────────────────────────┤
│       TCP                   │  ← Reliable transport
├─────────────────────────────┤
│       IPv4 / IPv6           │  ← Network
└─────────────────────────────┘
```
For HTTP/3, the lower layers change:
```
┌─────────────────────────────┐
│       HTTP/3                │
├─────────────────────────────┤
│       QUIC + TLS 1.3        │
├─────────────────────────────┤
│       UDP                   │
├─────────────────────────────┤
│       IPv4 / IPv6           │
└─────────────────────────────┘
```

## WebSocket — Persistent two-way channel (Persistent, Bidirectional, Real-time)
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


## 🚀 gRPC — High-performance service-to-service RPC (HTTP/2, Binary (Protobuf), RPC)

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


