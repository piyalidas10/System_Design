# If HTTPS Provides Secure Data, Why Not Use HTTPS Everywhere?

A common question in system design interviews and architectural reviews is:

> *"If HTTPS provides encryption, authentication, and secure data transfer, why don't we use HTTPS for every network communication instead of HTTP, raw TCP, or UDP?"*

**The short answer:** **HTTPS is designed for secure HTTP-based communication.** It is an application-layer protocol with security extensions, not a universal replacement for all lower-level network transport protocols. Different systems have fundamentally different communication patterns, latency budgets, and architectural constraints.

---

## 1. What HTTPS Actually Does

HTTPS is **not** a separate standalone protocol; it is **HTTP layered on top of TLS (Transport Layer Security)**:

$$\text{HTTPS} = \text{HTTP} + \text{TLS}$$

```
┌────────────────────────────────────────────────────────┐
│                      APPLICATION                       │
├────────────────────────────────────────────────────────┤
│                     HTTP Payload                       │
├────────────────────────────────────────────────────────┤
│                 TLS (Security Layer)                   │
│   • Encryption: Confidentiality in transit             │
│   • Authentication: Identity verification via certs    │
│   • Integrity: Prevents tampering and data mutation    │
├────────────────────────────────────────────────────────┤
│                Transport Layer (TCP / QUIC)            │
└────────────────────────────────────────────────────────┘
```

### Three Core Pillars of TLS in HTTPS:
1. **Encryption (Confidentiality):** Encrypts plaintext data so eavesdroppers on the network cannot read user credentials, payment details, or personal data.
2. **Authentication (Identity Verification):** Uses digital certificates issued by Certificate Authorities (CAs) to verify that the client is actually talking to the genuine server, preventing Man-in-the-Middle (MitM) attacks.
3. **Integrity (Tamper Proofing):** Uses Message Authentication Codes (MAC / HMAC) to detect if any packet was altered or corrupted in transit.

---

## 2. Why Not Use HTTPS Everywhere?

While HTTPS is the **gold standard and mandatory default for public web traffic and REST APIs**, it is not suitable for every system component due to the following architectural factors:

| Reason | Explanation & Architectural Impact |
|---|---|
| **Protocol Purpose & Semantics** | HTTPS is built around the HTTP request-response / streaming model (headers, methods, status codes, URLs). Non-web workloads (e.g., database wire protocols, raw message queues, storage replication) do not need or benefit from HTTP semantics. |
| **Performance & Latency Overhead** | TLS handshakes (negotiating ciphers, exchanging certificates, asymmetric key exchange) and cryptographic symmetric encryption introduce compute and round-trip time (RTT) overhead. |
| **Different Transport Needs (Low Latency vs. Reliability)** | Real-time workloads (gaming state synchronization, live audio) require ultra-low latency without retransmission delays. HTTPS traditionally runs over TCP, which suffers from head-of-line blocking and retransmission delays. |
| **Protocol Compatibility** | Many enterprise and legacy protocols (DNS, BGP, SNMP, SSH, MQTT, AMQP, gRPC native, internal RPC engines) are built on top of raw TCP or UDP directly, not HTTP. |
| **Resource-Constrained Devices (IoT / Embedded)** | Low-power microcontrollers (MCUs), sensors, and battery-powered IoT devices often lack the CPU power, memory, or battery bandwidth to perform continuous TLS handshakes and parse heavy HTTP headers. |

> **Note on Modern TLS Performance:** In modern web systems, TLS 1.3 has reduced the TLS handshake to **1 RTT** (or **0-RTT** with session resumption), and hardware-accelerated AES-NI CPU instructions make symmetric encryption negligible for standard servers. Therefore, **for web and API workloads, HTTPS should always be used by default**.

---

## 3. Real-World Architectural Examples

Different system tiers choose protocols tailored to their specific data lifecycles and business guarantees:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  REAL-WORLD PROTOCOL SELECTION BY WORKLOAD                   │
├───────────────────────┬─────────────────────────┬────────────────────────────┤
│ Workload / System     │ Primary Protocol Choice │ Why Not Plain HTTPS?       │
├───────────────────────┼─────────────────────────┼────────────────────────────┤
│ 🏦 Online Banking     │ **HTTPS (HTTP + TLS)**  │ Strict requirement for     │
│    & Payments         │                         │ confidentiality, identity  │
│                       │                         │ verification, & integrity. │
├───────────────────────┼─────────────────────────┼────────────────────────────┤
│ 🎮 Online Multiplayer │ **UDP / Custom UDP**    │ Millisecond responsiveness │
│    Gaming (Movement)  │                         │ matters; stale player      │
│                       │                         │ updates are useless.       │
├───────────────────────┼─────────────────────────┼────────────────────────────┤
│ 📺 Video Streaming    │ **HTTPS (HLS / DASH)**  │ Chunked video segments     │
│    (Netflix, YouTube) │ or **QUIC (HTTP/3)**    │ cached via CDNs; needs     │
│                       │                         │ encryption & bandwidth.    │
├───────────────────────┼─────────────────────────┼────────────────────────────┤
│ 🌡️ IoT & Smart Home   │ **MQTT / CoAP**         │ Minimal packet overhead;   │
│    Sensors            │ (often over TLS/DTLS)   │ designed for battery & RAM │
│                       │                         │ constrained devices.       │
├───────────────────────┼─────────────────────────┼────────────────────────────┤
│ ⚡ Internal Service   │ **gRPC (HTTP/2 / TLS)** │ Multiplexed binary streams │
│    to Service (RPC)   │ or **Raw TCP (mTLS)**   │ with low serialization     │
│                       │                         │ overhead (Protobuf).       │
└───────────────────────┴─────────────────────────┴────────────────────────────┘
```

---

## 4. HTTPS and UDP Are Not Competitors

A widespread misconception is that *HTTPS* and *UDP* are mutually exclusive or competing alternatives. 

They operate at different layers of the networking stack:
- **UDP** is a Layer 4 (Transport Layer) protocol.
- **HTTPS** is a Layer 7 (Application Layer) protocol secured with TLS.

### Evolution of the HTTPS Protocol Stack

```
Traditional HTTPS (HTTP/1.1 & HTTP/2)             Modern HTTPS (HTTP/3)
┌────────────────────────────────────┐       ┌────────────────────────────────────┐
│              HTTP / 2              │       │              HTTP / 3              │
├────────────────────────────────────┤       ├────────────────────────────────────┤
│         TLS 1.2 / TLS 1.3          │       │               QUIC                 │
├────────────────────────────────────┤       │  (Built-in TLS 1.3 + Reliability)  │
│                TCP                 │       ├────────────────────────────────────┤
├────────────────────────────────────┤       │                UDP                 │
│                 IP                 │       ├────────────────────────────────────┤
└────────────────────────────────────┘       │                 IP                 │
                                             └────────────────────────────────────┘
```

### Key Takeaways from HTTP/3:
1. **HTTP/3 runs over UDP:** HTTP/3 does not use TCP. It uses **QUIC**, which runs entirely on top of UDP.
2. **QUIC embeds TLS 1.3 directly:** QUIC implements encryption, stream multiplexing, and reliable retransmissions at user-space on top of UDP.
3. **UDP does not mean "insecure":** UDP-based communications can be fully encrypted using **DTLS (Datagram Transport Layer Security)** or **QUIC**.

---

## 5. System Design Interview Guide

### Common Interview Question:
> *"If HTTPS provides encryption and data integrity, why don't we use it for every service-to-service and real-time interaction?"*

### Model Answer:
> *"HTTPS is an application-layer protocol combining HTTP semantics with TLS encryption. It is not a universal transport mechanism. In system design, we match protocols to application requirements:*
> 1. *For user-facing web applications, e-commerce, and APIs, HTTPS is the industry standard because correctness, confidentiality, and authentication are non-negotiable.*
> 2. *For real-time streaming, telemetry, or multiplayer gaming, low latency is critical, so we prefer UDP or QUIC to avoid TCP retransmission delays and connection overhead.*
> 3. *For microservices and internal service-to-service communication, we often prefer binary RPC frameworks like gRPC over HTTP/2 with mTLS, or raw TCP/mTLS to eliminate HTTP header overhead while preserving security.*
> 4. *Furthermore, modern HTTP/3 actually runs HTTPS over UDP using QUIC, demonstrating that security and transport mechanisms are orthogonal decisions."*

---

## 6. Check Your Understanding

### Question:
**If HTTP/3 uses UDP as its underlying transport protocol, does that mean HTTP/3 is unreliable and cannot guarantee packet delivery?**

- **A.** Yes, because UDP is inherently unreliable.
- **B.** No, because the QUIC layer implements reliability, retransmissions, and flow control on top of UDP. *(Correct)*
- **C.** Yes, because HTTPS is incompatible with UDP.

> **Explanation:** While UDP itself is an unreliable transport protocol, **QUIC** implements connection management, packet ordering, loss detection, retransmissions, and TLS 1.3 encryption directly in the QUIC layer above UDP.

---

## Summary & Key Takeaways

1. **HTTPS = HTTP + TLS:** It secures web communication through encryption, server authentication, and tamper-proofing.
2. **HTTPS is not a universal network protocol:** Different workloads require different transport characteristics (e.g., real-time low latency, low battery footprint, custom binary wire protocols).
3. **Security is protocol-independent:** You can secure TCP (via TLS), UDP (via DTLS or QUIC), and custom protocols (via IPsec or application-layer encryption).
4. **Choose by constraints:** Balance data persistence requirements, latency tolerances, bandwidth limits, and computational overhead when picking your communication stack.
