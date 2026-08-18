# Protocols

**Transport Layer — Ports & Reliability**

Layer 4 sits on top of IP and provides end-to-end communication between applications. While IP gets packets to the right machine, L4 gets them to the right app on that machine using port numbers. Two main flavors: TCP (reliable but slower) and UDP (fast but no guarantees).

**Application Layer — Where Your APIs Live**

Layer 7 is where actual application data lives. HTTP requests, WebSocket messages, gRPC calls — all of these are application-layer protocols. This is the layer most system design discussions happen at. API gateways, reverse proxies, and most authentication logic operate here.

## TCP — Transmission Control Protocol
A reliable, connection-oriented protocol. Before sending data, both sides perform a 3-way handshake. Every packet is acknowledged. Lost packets are retransmitted. Data arrives in order. This reliability comes at the cost of higher latency and overhead.

> **Analogy: Like a formal phone call. You dial, the other person picks up and says "hello?" (SYN-ACK), you respond "hi!" (ACK) — only then does the real conversation start. After every sentence, you wait for acknowledgement before continuing.**

**TCP 3-Way Handshake + Connection Termination**
Before any data flows, both sides must agree to talk. This costs ~1 round-trip but ensures reliability.

| Step | Direction       | TCP Flag                     | Meaning                                                                 |
| ---- | --------------- | ---------------------------- | ----------------------------------------------------------------------- |
| 1    | Client → Server | **SYN** `seq=x`              | “Can we talk? My initial sequence number is **x**.”                     |
| 2    | Client ← Server | **SYN-ACK** `seq=y, ack=x+1` | “Yes! I received your SYN. My sequence number is **y**.”                |
| 3    | Client → Server | **ACK** `ack=y+1`            | “Got it. Connection established!”                                       |
| 4    | Client → Server | **DATA + ACK**               | Actual application data starts flowing; TCP acknowledges received data. |
| 5    | Client → Server | **FIN**                      | “I’m done sending data. Goodbye.”                                       |
| 6    | Client ← Server | **ACK**                      | “Your FIN is acknowledged.”                                             |
| 7    | Server → Client | **FIN**                      | “I’m also done. Goodbye.”                                               |
| 8    | Client → Server | **ACK**                      | “FIN received. Connection closed.”                                      |

Important: TCP connection establishment is 3-way, but graceful termination is typically a 4-way exchange because each direction of the TCP connection is closed independently.
```
CLIENT                                      SERVER
  │                                           │
  │ ─────── SYN (seq=x) ───────────────────→ │
  │                                           │
  │ ←──── SYN-ACK (seq=y, ack=x+1) ───────── │
  │                                           │
  │ ─────── ACK (ack=y+1) ─────────────────→ │
  │                                           │
  │         🔗 CONNECTION ESTABLISHED        │
  │                                           │
  │ ─────── DATA + ACK ─────────────────────→ │
  │ ←────── DATA + ACK ───────────────────── │
  │                                           │
  │ ─────── FIN ───────────────────────────→ │
  │ ←────── ACK ──────────────────────────── │
  │                                           │
  │ ←────── FIN ──────────────────────────── │
  │ ─────── ACK ───────────────────────────→ │
  │                                           │
  │          ❌ CONNECTION CLOSED             │
```

**TCP Header — 160 bits / 20 bytes minimum**
| Field                      |     Size | Purpose                                                               |
| -------------------------- | -------: | --------------------------------------------------------------------- |
| **Source Port**            |  16 bits | Identifies the sender application/process                             |
| **Destination Port**       |  16 bits | Identifies the receiver application/process                           |
| **Sequence Number**        |  32 bits | Position of the first data byte in the TCP stream                     |
| **Acknowledgement Number** |  32 bits | Next byte the sender expects to receive                               |
| **Data Offset**            |   4 bits | Indicates where the TCP payload begins; effectively the header length |
| **Reserved**               |   3 bits | Reserved for future use                                               |
| **Flags**                  |   9 bits | Connection/control flags such as **SYN, ACK, FIN, RST, PSH, URG**     |
| **Window Size**            |  16 bits | Advertises how much data the receiver can accept — **flow control**   |
| **Checksum**               |  16 bits | Detects corruption/errors in the TCP segment                          |
| **Urgent Pointer**         |  16 bits | Points to urgent data when **URG** is set                             |
| **Options + Padding**      | Variable | Optional features such as timestamps, MSS, window scaling, SACK       |

```
TCP HEADER
┌─────────────────────────────────────────────┐
│ Source Port        │ Destination Port       │
├─────────────────────────────────────────────┤
│ Sequence Number                            │
├─────────────────────────────────────────────┤
│ Acknowledgement Number                     │
├──────┬────────┬───────────────┬────────────┤
│Offset│Reserved│    Flags      │Window Size │
├──────────────────────┬─────────────────────┤
│ Checksum             │ Urgent Pointer      │
├─────────────────────────────────────────────┤
│ Options + Padding (optional)               │
└─────────────────────────────────────────────┘
                       ↓
                 Application Data
```

**✅ Why use TCP**
- Guaranteed delivery — no lost data
- Data arrives in order
- Built-in flow & congestion control
- Connection state — easier app logic

**⚠️ Trade-offs**
- Handshake adds latency (~1 RTT)
- Acknowledgement overhead
- Head-of-line blocking — one lost packet blocks all
- Not ideal for real-time (lost = stale anyway)

**📍 Where it's used**
- HTTP/HTTPS (web traffic)
- Email (SMTP, IMAP)
- File transfer (FTP, SSH, SCP)
- Database connections (Postgres, MySQL)
- WebSocket (built on TCP)


## HTTP — HyperText Transfer Protocol (Request-Response, Stateless, Text-based)
The foundation of the web. A simple request-response protocol where a client sends a request and the server returns a response. Stateless by default — each request is independent. Runs over TCP (HTTP/1.1, HTTP/2) or QUIC (HTTP/3).

> Analogy: Like ordering at a counter. You walk up (request), say what you want (method + URL + headers + body), the staff fetches it and hands it over (response). Then you walk away. No memory of you for next time — each visit is fresh.

**HTTP methods**
- GET : Read data. Safe & idempotent.
- POST : Create new resource. Not idempotent.
- PUT : Replace resource entirely. Idempotent.
- PATCH : Update parts of a resource.
- DELETE : Remove a resource. Idempotent.
- HEAD : Like GET but only returns headers.

**Status code families**
- 1xx : Informational
- 2xx : Success
- 3xx : Redirect
- 4xx : Client Error
- 5xx : Server Error

**HTTP versions evolution**

| Version      | Year | Transport  | Key Feature                                           |
| ------------ | ---: | ---------- | ----------------------------------------------------- |
| **HTTP/1.0** | 1996 | TCP        | One request per connection                            |
| **HTTP/1.1** | 1997 | TCP        | Keep-alive, pipelining                                |
| **HTTP/2**   | 2015 | TCP        | Multiplexing, header compression, binary framing      |
| **HTTP/3**   | 2022 | QUIC (UDP) | No TCP head-of-line blocking, faster connection setup |

**✅ Why HTTP wins**
- Universally supported
- Simple request-response model
- Easy to debug & cache
- Works through firewalls & proxies
- Stateless = horizontally scalable

**⚠️ Limitations**
- Plain HTTP is not encrypted
- Not ideal for real-time push from server
- Polling is wasteful
- Stateless = need sessions/tokens

**📍 Where it's used**
- Every website you visit
- REST APIs
- Webhooks
- Static content delivery
- Server-to-server APIs

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

**The 3 pillars of TLS**

**🔐 Encryption**
- Symmetric AES after handshake
- Eavesdroppers see only random bytes
- Forward secrecy — past sessions stay safe even if keys leak

**✅ Authentication**
- Server proves identity via certificate
- Certificate signed by trusted CA
- Prevents impersonation / MITM

**📋 Integrity**
- MAC (Message Auth Code) on every message
- Tampering is detected immediately
- Connection drops if integrity fails

**Certificate chain**
```
🏛️ Root CA (DigiCert, Let's Encrypt, etc — trusted by your browser)
↓ signs
🏢 Intermediate CA (issued by the root)
↓ signs
🌐 Server Certificate (your website's cert)
```
Browser walks this chain up to a root it trusts → connection allowed.

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


