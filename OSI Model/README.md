# 📚 OSI Model
The OSI (Open Systems Interconnection) Model is a 7-layer conceptual model that explains how data travels from one application on one device to an application on another device over a network.

🧠 System Design Fundamentals 4: ✅ OSI Model Explained for System Design | Networking Made Easy : https://www.youtube.com/watch?v=66RgQUTekfs

## 🧱 The 7 Layers
| Layer | Name             | Main Responsibility                               | Examples                      |
| ----: | ---------------- | ------------------------------------------------- | ----------------------------- |
| **7** | **Application**  | Network services used by applications             | HTTP, HTTPS, DNS, SMTP, FTP   |
| **6** | **Presentation** | Data format, encryption, compression              | TLS/SSL, JSON, XML, JPEG      |
| **5** | **Session**      | Establish/manage/terminate communication sessions | RPC, NetBIOS                  |
| **4** | **Transport**    | End-to-end delivery, reliability, flow control    | **TCP, UDP**                  |
| **3** | **Network**      | Routing between networks                          | **IP, ICMP**, routers         |
| **2** | **Data Link**    | Frames, MAC addressing, local network delivery    | Ethernet, Wi-Fi, switches     |
| **1** | **Physical**     | Transmits raw bits                                | Cables, fiber, radio, signals |

**Easy way to remember**

A P S T N D P
> All People Seem To Need Data Processing

Or from Layer 1 → 7:
> Please Do Not Throw Sausage Pizza Away

## 🌐 Real-Life Example: Opening https://example.com

Suppose you enter a URL in your browser.

### Layer 7 — Application

Your browser uses HTTPS to request the webpage.
```
GET / HTTP/1.1
Host: example.com
```
Protocols/services:
- HTTP
- HTTPS
- DNS
- SMTP
- FTP

### Layer 6 — Presentation

Data may be:
- Encoded
- Serialized
- Compressed
- Encrypted

For HTTPS, TLS encryption is involved here conceptually.
```
Plain Data
    ↓
Encryption
    ↓
Encrypted Data
```
> In real-world TCP/IP implementations, OSI Layers 5–7 don't always map cleanly to separate protocol layers.

### Layer 5 — Session

Manages the communication session.

Conceptually:
```
Client
  │
  ├── Establish session
  │
  ├── Exchange data
  │
  └── Terminate session
```

### Layer 4 — Transport

TCP provides reliable delivery.

The HTTP data is broken into TCP segments.
```
HTTP Data
   ↓
TCP Segment
```

**TCP handles things such as:**
- Sequencing
- Acknowledgements
- Retransmission
- Flow control
- Port numbers

Example:
```
Source Port: 52341
Destination Port: 443
Protocol: TCP
```

### Layer 3 — Network

IP determines where the packet should go.
```
Source IP
192.168.1.10


        ↓


Router


        ↓


Destination IP
93.x.x.x
```
The router operates primarily at Layer 3.

### Layer 2 — Data Link

The IP packet is placed inside an Ethernet/Wi-Fi frame.
```
MAC Address
   ↓
Frame
   ↓
Switch
```
Example:
```
Source MAC      →  AA:BB:CC:11:22:33
Destination MAC →  DD:EE:FF:44:55:66
```
A switch primarily operates at Layer 2.

### Layer 1 — Physical

Finally, the frame becomes physical signals:
```
Bits
 ↓
Electrical signals
     OR
Light pulses
     OR
Radio waves
```

Examples:
- Ethernet cable
- Fiber optic
- Wi-Fi radio
- Network interface hardware

## 📦 Encapsulation

This is one of the most important OSI concepts for interviews.

When sending data, each layer adds its own information.
```
Application
    │
    ▼
   DATA
    │
    ▼
Transport
    │
    ▼
[TCP HEADER][DATA]
    │
    ▼
Network
    │
    ▼
[IP HEADER][TCP HEADER][DATA]
    │
    ▼
Data Link
    │
    ▼
[ETHERNET HEADER][IP HEADER][TCP HEADER][DATA][TRAILER]
    │
    ▼
Physical
    │
    ▼
0101010101010101
```
This process is called encapsulation.

**At the receiving machine, the reverse happens:**
```
Physical
    ↓
Data Link
    ↓
Network
    ↓
Transport
    ↓
Session
    ↓
Presentation
    ↓
Application
```
This is decapsulation.

## 🔥 OSI Layers and Devices

A useful interview mapping:
```
Layer 7 ───────── Application
Layer 6 ───────── Presentation
Layer 5 ───────── Session
Layer 4 ───────── Transport       → TCP / UDP
Layer 3 ───────── Network         → Router
Layer 2 ───────── Data Link       → Switch
Layer 1 ───────── Physical        → Cable / Hub
```

**Common devices**

| Device                    | Primary Layer |
| ------------------------- | ------------: |
| Hub                       |            L1 |
| Switch                    |            L2 |
| Router                    |            L3 |
| L4 Load Balancer          |            L4 |
| Application/Reverse Proxy |            L7 |
| API Gateway               |    Usually L7 |

## 🧠 OSI vs TCP/IP

In actual modern networking, the TCP/IP model is more directly representative of the Internet.

| OSI          | TCP/IP         |
| ------------ | -------------- |
| Application  | Application    |
| Presentation | Application    |
| Session      | Application    |
| Transport    | Transport      |
| Network      | Internet       |
| Data Link    | Network Access |
| Physical     | Network Access |

So:
```
OSI                         TCP/IP


┌───────────────┐
│ Application   │
├───────────────┤
│ Presentation  │ ────────┐
├───────────────┤         │
│ Session       │         ├── Application
├───────────────┤         │
│ Transport     │ ────────┤── Transport
├───────────────┤         │
│ Network       │ ─────────── Internet
├───────────────┤         │
│ Data Link     │ ────────┐
├───────────────┤         ├── Network Access
│ Physical      │ ────────┘
└───────────────┘
```

## 🎯 Interview shortcut

Remember these four mappings particularly well:
```
Layer 7 → HTTP/HTTPS → Application

Layer 4 → TCP/UDP → Transport

Layer 3 → IP → Routing

Layer 2 → MAC → Switching
```

**And the key distinction:**
> IP tells you where the packet needs to go.
> MAC tells you which device/interface to deliver it to on the local network.
> TCP ensures reliable end-to-end delivery.
> HTTP defines what the application is asking for.

## Real-Life Walkthrough - 🎁 Sending a birthday gift to your sister in Mumbai
Forget the textbook for a moment. Let's walk through all 7 OSI layers using something we've all done — sending a courier package. Every layer maps to something you've actually experienced.

**📖 The story**
> **You live in Bangalore. Your sister Priya's birthday is next week and she lives in Mumbai. You decide to send her a silk saree as a gift. Here's how every step of that journey maps to an OSI layer.**

### L7 Application
🎯 What you actually want to do - https://www.interviewwithbunny.com/systemdesignfundamentals/04
You sit down and decide: "I'll send Priya a silk saree for her birthday, along with a handwritten card."

That's it. No technical details yet. Just pure intent and the message.

This is you opening Chrome and typing youtube.com. Pure user intent — what the app wants to do.

|  Layer | OSI Layer        | Birthday Gift Analogy 🎁                                                             | Networking Equivalent 🌐      | Key Concept                           |
| -----: | ---------------- | ------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------- |
| **L7** | **Application**  | 🎯 Decide **what you want to send** — silk saree + birthday card to Priya            | HTTP, HTTPS, DNS, SMTP        | **User intent / application request** |
| **L6** | **Presentation** | 📦 **Format and prepare** the gift — translate card, wrap saree, encrypt secret note | UTF-8, JSON, compression, TLS | **Format, encode, compress, encrypt** |
| **L5** | **Session**      | 📞 **Open and maintain the courier booking** using a tracking/AWB number             | Session IDs, cookies, RPC     | **Establish & maintain conversation** |
| **L4** | **Transport**    | 🚚 Choose **reliable vs fast delivery** — tracked/retried delivery vs fast delivery  | **TCP / UDP**                 | **End-to-end delivery**               |
| **L3** | **Network**      | 📍 Use the **destination address** to route the package from Bangalore → Mumbai      | **IP, ICMP, Routers**         | **Routing between networks**          |
| **L2** | **Data Link**    | 🛵 Local delivery from **Mumbai hub → Sunshine Apartments**                          | **Ethernet, Wi-Fi, MAC**      | **Local network delivery**            |
| **L1** | **Physical**     | ⚡ Actual **flight, truck, scooter** physically carrying the package                  | Fiber, copper, radio waves    | **Bits/signals over physical medium** |

**🧠 Remember it as a journey**

L7 → L1
```
🎯 What → 📦 Format → 📞 Conversation → 🚚 Deliver → 📍 Route → 🛵 Local → ⚡ Physical
```
And when receiving the data, the journey happens in reverse:

L1 → L7
```
⚡ Physical → 🛵 Data Link → 📍 Network → 🚚 Transport → 📞 Session → 📦 Presentation → 🎯 Application
```

When you send data, it travels down the OSI stack on the sender, across the wire, then up the stack on the receiver. At each layer going down, headers are added (encapsulation). Going up, headers are stripped (decapsulation).
```
L7 (HTTP) → [HTTP request: GET /users]
L4 (TCP) → [TCP header | HTTP request]
L3 (IP) → [IP header | TCP header | HTTP request]
L2 (Ethernet) → [Eth header | IP | TCP | HTTP | Eth trailer]
L1 (Physical) → [0101010100100101...] ⚡ goes on the wire
```
