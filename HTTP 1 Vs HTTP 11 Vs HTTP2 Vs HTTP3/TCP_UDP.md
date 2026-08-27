# TCP vs UDP

1. TCP vs UDP Explained — With Real World Examples: https://www.youtube.com/watch?v=DVSsduOYYsI

## What is a Protocol?

A protocol is basically an agreement between two computers.

It's like an agreement about:
> “How are we going to communicate with each other?”

For example, when two computers or browsers communicate, there needs to be an agreed-upon way of communicating.

TCP and UDP are Transport Layer protocols.

This means they handle how data travels from one machine to another machine.

**Think about it this way:**
- IP address → Decides where the data should go.
- Transport protocol → Decides how the data should travel.

**Protocols define things such as:**
- What information should be included in the headers
- How data should be transmitted
- How errors should be handled
- How computers should communicate
- What rules should be followed

These rules provide consistency between different computers.

For example, if I request something from a server, I expect the server to respond in a specific way. Both sides need to follow a common set of rules.

Those rules are called protocols.

There are many different protocols for different purposes, such as:
- SSH
- UDP
- TCP
- HTTP
- HTTPS
- SMTP

Now let's understand TCP and UDP.

## TCP

You can think of TCP like a registered courier service with tracking.

Imagine that you send a parcel through a courier company.

**The courier:**
```
Accepts your parcel.
Tracks the parcel.
Confirms delivery.
If the parcel doesn't arrive, it can be sent again.
Makes sure the parcels arrive in the correct order.
```
TCP works similarly.

If you send:
```
Packet 1
Packet 2
Packet 3
```
TCP makes sure the data is delivered reliably and in the correct order.

### TCP Three-Way Handshake

One of the most important TCP concepts is the Three-Way Handshake.

Before transmitting data, the client and server establish a connection.

**The three steps are:**
```
Client                         Server
  |                              |
  | -------- SYN --------------> |
  |                              |
  | <----- SYN + ACK ------------ |
  |                              |
  | -------- ACK --------------> |
  |                              |
  |       Connection Ready       |
```

**Step 1 — SYN**

The client sends a SYN message to the server.

It is essentially saying:
> “I want to establish a connection with you.”

**Step 2 — SYN-ACK**

The server responds with SYN + ACK.

It is essentially saying:
> “Yes, I'm available. We can communicate.”

The server also sends its sequence information.

**Step 3 — ACK**

The client sends an ACK back.

It is saying:
> “I received your response. The connection is established.”

Now both sides can start communicating.

## Why is TCP Reliable?

Once the TCP connection is established, TCP provides several important features.

### 1. Reliable Delivery

TCP makes sure that data reaches the destination.

If a packet is lost, TCP can request/retransmit it.
```
Packet 1 ✅
Packet 2 ❌
Packet 3 ✅

        ↓

Packet 2 is retransmitted
```

### 2. Ordered Delivery

TCP maintains the correct sequence of data.

**For example:**
```
Sent:

1 → 2 → 3 → 4

Received:

1 → 2 → 3 → 4
```
Even if packets take different network paths, TCP ensures that the application receives the byte stream in the correct order.

### 3. Error Checking

TCP performs error detection.

If transmitted data is corrupted, it can detect the problem and retransmit the required data.

Therefore TCP is considered a reliable transport protocol.

### Disadvantages of TCP

TCP's reliability comes with a cost.

**Connection Setup**

Before sending application data, TCP needs to establish a connection.

That introduces overhead.
```
Connection setup
       ↓
Data transmission
       ↓
Possible retransmission
       ↓
Data received
```
If packets are lost, retransmission also takes additional time.

Therefore, TCP can be slower than UDP in situations where low latency is more important than perfect delivery.

---------------------------------

## UDP

Now let's look at UDP.

UDP is much simpler and faster.

You can imagine UDP like a courier who simply throws the package toward your house and doesn't wait for confirmation.

**The courier doesn't ask:**
```
“Did you receive it?”
```
He simply sends it.

**Similarly, UDP doesn't inherently care whether:**
```
The packet arrived
The packet was lost
The packet arrived out of order
The packet was corrupted
```
There is no connection establishment like TCP's three-way handshake.

That's one reason UDP has lower overhead.

## Advantages of UDP
### 1. Fast

UDP doesn't need the TCP connection-establishment process.

### 2. Low Overhead

UDP has a relatively small header and doesn't provide TCP's extensive reliability mechanisms.

### 3. Good for Real-Time Communication

For some real-time applications, receiving data late can be worse than losing a small amount of data.

For example, during a live video call:
```
Frame 1 ✅
Frame 2 ✅
Frame 3 ❌
Frame 4 ✅
Frame 5 ✅
```
If Frame 3 is lost, you usually don't want the application to stop and wait for Frame 3 to be retransmitted.

It's better to continue with Frame 4 and 5.

-------------------------------------------
## TCP vs UDP in the Real World

We don't use only TCP or only UDP.

We choose the protocol depending on the requirements.

### Banking / UPI

For financial transactions, reliable and correct data delivery is extremely important.

**You don't want:**
```
₹1000

to become

₹100
```
or for some part of the transaction data to be lost.

So reliable communication is essential.

### Web Browsing

Traditional HTTP/1.1 and HTTP/2 commonly run over TCP.

**For example:**
```
Browser
   ↓
TCP
   ↓
Internet
   ↓
Web Server
```
HTTPS also traditionally uses TCP underneath HTTP/1.1 and HTTP/2.

### Email

Protocols such as SMTP traditionally use TCP because reliable delivery is important.

## Where UDP is Useful

UDP is useful when speed and low latency are more important than guaranteed delivery.

Examples include:

### Video Calls

For example:
- WhatsApp calls
- Zoom calls
- Other real-time video communication

If one video frame is lost, you generally don't want the entire conversation to freeze while waiting for that frame.

### Online Gaming

In games such as BGMI, your current position and actions need to reach the server quickly.

A slightly outdated position isn't useful several seconds later.

So low latency is extremely important.

### Live Streaming

Real-time streaming can also benefit from low-latency transport.

### DNS

DNS commonly uses UDP for queries because the messages are usually small and fast request/response communication is desirable.

-----------------------------------------------

## What About QUIC?

There is another important protocol: QUIC.

**TCP provides: Reliability + Ordering**

**UDP provides: Low overhead + Speed**

Google developed QUIC to provide a modern transport protocol that combines UDP's underlying datagram transport with features needed for reliable, secure, connection-oriented communication.

QUIC runs over UDP.

**Conceptually:**
```
        HTTP/3
           ↓
          QUIC
           ↓
          UDP
           ↓
           IP
```
This is why HTTP/3 uses QUIC.

**By contrast:**
```
        HTTP/2
           ↓
          TCP
           ↓
           IP
```

**So the evolution can be summarized as:**
```
HTTP/1.1  → TCP
HTTP/2    → TCP
HTTP/3    → QUIC → UDP
```

-----------------------------------------

## Final Comparison

| Feature           | TCP                               | UDP                              |
| ----------------- | --------------------------------- | -------------------------------- |
| Connection        | Connection-oriented               | Connectionless                   |
| Handshake         | Yes                               | No                               |
| Reliable delivery | Yes                               | No                               |
| Ordering          | Yes                               | No inherent ordering             |
| Retransmission    | Yes                               | No inherent retransmission       |
| Overhead          | Higher                            | Lower                            |
| Speed/latency     | Generally higher overhead         | Generally lower overhead         |
| Best for          | Reliable data                     | Real-time/latency-sensitive data |
| Example           | Web, email, reliable transactions | DNS, real-time media, games      |

### The easiest way to remember

#### TCP:

“Make sure the data arrives correctly, even if it takes more time.”

#### UDP:

“Send the data quickly; don't wait around for guarantees.”

#### QUIC:

“Use UDP underneath, but add modern transport features such as reliability and connection management.”

One correction worth making to the original transcript: HTTP/3 uses QUIC, while HTTP/2 uses TCP. HTTP/1.0 and HTTP/1.1 are also traditionally TCP-based.




