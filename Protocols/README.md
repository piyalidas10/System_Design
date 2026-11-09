# Transport Layer Protocols: TCP vs. UDP

In distributed systems and networking, **Transmission Control Protocol (TCP)** and **User Datagram Protocol (UDP)** are the two foundational transport layer protocols of the Internet. System architects constantly make decisions balancing **reliability** and **latency**—and understanding how TCP and UDP operate is central to making the right architectural trade-offs.

---

## High-Level Comparison

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           TRANSPORT LAYER PROTOCOLS                           │
├──────────────────────────────────────┬────────────────────────────────────────┤
│     TCP (Transmission Control)       │        UDP (User Datagram)             │
├──────────────────────────────────────┼────────────────────────────────────────┤
│  🎯 Focus: Reliability & Correctness │  🎯 Focus: Speed & Low Latency         │
│  🔗 Connection-oriented (Handshake)  │  ⚡ Connectionless (Fire & Forget)     │
│  📦 Guarantees delivery & ordering   │  💨 No delivery or ordering guarantees │
│  ⏳ Higher latency & protocol overhead│ 🚀 Minimal overhead & near-zero setup │
└──────────────────────────────────────┴────────────────────────────────────────┘
```

---

## 1. Transmission Control Protocol (TCP)

<img src="./TCP.png" width="90%" />

### What is TCP?
Transmissions over physical networks are inherently unpredictable: packets can get delayed, arrive out of order, get duplicated, or disappear entirely due to congestion and hardware issues.

**TCP** sits between the application and the physical network to hide this unpredictability, providing the **illusion of a dependable, lossless, and ordered communication channel**.

### How TCP Works

1. **Connection-Oriented (Three-Way Handshake):**
   Before any application payload is transmitted, both client and server must agree to communicate and synchronize sequence numbers:
   - **SYN:** Client sends a synchronization request.
   - **SYN-ACK:** Server acknowledges the request and sends its own synchronization.
   - **ACK:** Client acknowledges the server's response.
   
   > *Analogy:* Like placing a phone call—both parties pick up, say hello, and confirm they can hear each other before the conversation begins.

2. **Packet Tracking & Acknowledgments (ACKs):**
   Every data segment is tagged with a unique sequence number. The receiver sends back acknowledgment messages confirming receipt of specific bytes.

3. **Automatic Retransmission (ARQ):**
   If the sender does not receive an ACK within a given timeout window (or receives duplicate ACKs indicating packet loss), it automatically retransmits the missing segment.

4. **In-Order Reassembly:**
   Packets may take different physical network paths and arrive out of order. TCP buffers received packets and reorders them according to their sequence numbers before delivering them to the application layer.

5. **Flow Control & Congestion Control:**
   - **Flow Control (Sliding Window):** Prevents a fast sender from overwhelming a slow receiver buffer.
   - **Congestion Control (e.g., Slow Start, Congestion Avoidance):** Dynamically throttles transmission rates to prevent network saturation.

```
TCP Communication Flow (Three-Way Handshake + ACK/Retransmission)

  Client                                Server
    │                                     │
    │ ─── 1. SYN (seq=x) ───────────────► │ (Connection Setup)
    │ ◄── 2. SYN-ACK (seq=y, ack=x+1) ─── │
    │ ─── 3. ACK (ack=y+1) ─────────────► │
    │                                     │
    │ ─── Data Segment 1 (seq=1) ───────► │ (Reliable Data Transfer)
    │ ◄── ACK 1 ───────────────────────── │
    │                                     │
    │ ─── Data Segment 2 (seq=2) ───X     │ (Packet lost in network)
    │     [Retransmission Timeout]        │
    │ ─── Data Segment 2 (seq=2) ───────► │ (Auto-Retransmit)
    │ ◄── ACK 2 ───────────────────────── │
    ▼                                     ▼
```

### Trade-Offs
- **Pros:** 100% data integrity, guaranteed delivery, no duplicate or out-of-order data delivered to the application.
- **Cons:** Added latency from connection establishment (1 RTT), acknowledgment overhead, head-of-line blocking, and retransmission delays.

---

## 2. User Datagram Protocol (UDP)

<img src="./UDP.png" width="90%" />

### What is UDP?
**UDP** was designed for a completely different objective: **minimizing latency and protocol overhead**. It operates on the premise that getting data to its destination as fast as possible is often far more critical than guaranteeing that every single packet arrives.

### How UDP Works

1. **Connectionless:**
   There is no three-way handshake, no session initialization, and no ongoing connection state maintained between the sender and receiver.

2. **Fire and Forget:**
   An application packages data into a datagram and transmits it immediately. The sender does not wait for an acknowledgment or track if the packet arrived.

3. **No Retransmission or Reordering:**
   If a packet drops or arrives out of sequence, UDP does not attempt recovery or buffering. It delivers whatever arrives directly to the application layer.

```
UDP Communication Flow (Direct / Fire-and-Forget)

  Client                                Server
    │                                     │
    │ ─── Datagram 1 ───────────────────► │ (No Handshake)
    │ ─── Datagram 2 ───────────────X     │ (Dropped - Not recovered)
    │ ─── Datagram 3 ───────────────────► │ (Delivered immediately)
    │ ─── Datagram 4 ───────────────────► │
    ▼                                     ▼
```

### Trade-Offs
- **Pros:** Extremely lightweight, minimal protocol overhead (8-byte header vs 20–60-byte TCP header), zero connection delay, highest possible transmission throughput.
- **Cons:** No delivery guarantee, no ordering guarantee, no duplicate detection, no built-in flow/congestion control. If reliability is required, the application layer must implement its own recovery mechanisms (e.g., QUIC over UDP).

---

## 3. Key Differences: TCP vs. UDP

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Core Question** | *"Did every piece of data arrive correctly?"* | *"What is the fastest way to get data moving?"* |
| **Connection Type** | Connection-oriented (3-way handshake) | Connectionless (no handshake) |
| **Reliability** | Guaranteed delivery (Lossless) | Best-effort delivery (Loss-tolerant) |
| **Ordering** | In-order delivery guaranteed | No ordering guarantee (Packets can arrive out of sequence) |
| **Retransmission** | Automatic retransmission on packet loss | No retransmission |
| **Header Size** | 20 to 60 bytes | 8 bytes |
| **Flow & Congestion Control** | Yes (Sliding window, slow-start, congestion avoidance) | No built-in congestion control |
| **Speed & Latency** | Slower (overhead from handshake, ACKs, retransmissions) | Extremely fast (low latency, minimal overhead) |
| **Broadcasting / Multicasting** | Unicast only (point-to-point) | Supports Unicast, Multicast, and Broadcast |

---

## 4. Architectural Principle: The Value of Data Over Time

A foundational concept in system architecture is that **not all data maintains the same value over time**:

```
Data Value Degradation Curve

Value
 ▲
 │  [Banking / DB / File Transfer]
 │  ══════════════════════════════════════► (Value stays constant over time)
 │
 │  [Live Voice / Gaming / Video Feed]
 │  ╲
 │   ╲
 │    ╲
 │     ╲
 │      ──────────────────────────────────► (Value drops to zero in milliseconds)
 └────────────────────────────────────────► Time
```

- **Data with Persistent Value (TCP):**
  A banking transaction, database mutation, or file download from 5 seconds ago is just as important now as it was when it was sent. Missing or corrupted bytes corrupt the system state.
  
- **Data with Ephemeral Value (UDP):**
  A voice packet or a multiplayer player-coordinate update from 2 seconds ago is completely obsolete. Waiting for retransmission would introduce artificial lag ("jitter" or stuttering), degrading the real-time experience far more than simply skipping the missing frame.

---

## 5. When to Choose TCP vs. UDP

```
                           What is your primary constraint?
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          Correctness & Integrity                     Ultra-Low Latency & Speed
                   │                                           │
                   ▼                                           ▼
             Choose **TCP**                              Choose **UDP**
        ┌─────────────────────────┐                 ┌─────────────────────────┐
        │ • Web Browsing (HTTP/1,2)│                │ • Live Video Streaming  │
        │ • Financial Transactions│                 │ • Online Multiplayer    │
        │ • File Transfers (FTP/SFTP)│              │ • VoIP / Video Calls    │
        │ • Database Connections  │                 │ • DNS Lookups           │
        │ • Email (SMTP / IMAP)   │                 │ • Market Tickers / Feeds│
        └─────────────────────────┘                 └─────────────────────────┘
```

### When to Use TCP:
- **Web Browsing & APIs:** HTTP/1.1 and HTTP/2 rely on TCP to ensure HTML, CSS, JavaScript, and JSON payloads arrive without corruption.
- **Financial & E-Commerce Systems:** Payment processing, credit debits, order placement where packet loss results in financial inconsistencies.
- **File Transfers:** SFTP, FTP, downloading binaries, documents, or operating system updates.
- **Database Communication:** SQL/NoSQL driver connections executing queries, commits, and transaction logs.
- **Messaging & Email:** SMTP, IMAP, and enterprise message brokers requiring at-least-once or exactly-once delivery semantics.

### When to Use UDP:
- **Online Multiplayer Gaming:** Player movement, aiming vectors, and world states require immediate updates where stale data is discarded.
- **Real-Time Audio / Video (VoIP & Conferencing):** Zoom, WebRTC media channels, Discord voice streams where minor packet loss is masked by codecs.
- **Live Video Broadcasting:** IPTV, live sports streaming protocols (RTP/RTSP).
- **DNS Queries:** Fast, single-packet request/response lookups where retransmission can easily be handled at the application level if timed out.
- **High-Frequency Market Data:** Financial ticker feeds where the newest price snapshot invalidates older prices.
- **Modern Protocols Built on UDP (QUIC / HTTP/3):** Combines the latency benefits of UDP with custom application-layer reliability and encryption (TLS 1.3).

---

## 6. System Design Interview Focus

In system design interviews, questions around TCP vs. UDP evaluate your ability to evaluate trade-offs:

| Interview Question | Key Architectural Talking Points |
|---|---|
| **"Why does DNS use UDP by default?"** | DNS queries are small (single packet request/response). Using UDP avoids the 3-way handshake latency overhead. If a timeout occurs, the client simply retries. (DNS falls back to TCP for responses > 512 bytes or zone transfers). |
| **"How would you design a real-time multiplayer game server?"** | Use UDP for real-time state synchronization (player position, velocity) to maintain low latency. Use TCP (or WebSocket over TCP) for critical actions like authentication, in-game purchases, and lobby matchmaking. |
| **"Why is HTTP/3 moving to UDP (QUIC)?"** | TCP suffers from **Head-of-Line (HoL) blocking** across multiplexed streams (a single lost packet halts all streams). HTTP/3 runs on QUIC (over UDP) to solve HoL blocking while implementing reliability and encryption at user space. |
| **"Can UDP be made reliable?"** | Yes. UDP itself does not provide reliability, but reliability can be implemented at the **application layer** (e.g., custom ACKs, sequence tracking, or protocols like QUIC / SRT / RUDP). |

---

## Summary & Key Takeaways

1. **Protocol selection is always about trade-offs:** Never choose a protocol purely because it is "faster" or "more reliable"—choose the one whose trade-offs align with your system's business and user experience constraints.
2. **TCP guarantees correctness:** Connection-oriented, ordered, lossless, flow-controlled, but incurs connection latency and retransmission overhead.
3. **UDP optimizes for speed:** Connectionless, minimal overhead, fire-and-forget, ideal for real-time systems where timely delivery outweighs 100% packet arrival.

---

## Related Topics

- [Why Not Use HTTPS Everywhere? (Trade-offs & Protocol Selection)](./Why_Not_HTTPS_Everywhere.md)
- [REST and RESTful API Design Principles](./REST_and_RESTful_API_Design.md)
- [TCP vs. HTTP/HTTPS vs. REST: Architectural Differences & Trade-Offs](./HTTPS_vs_TCP.md)
