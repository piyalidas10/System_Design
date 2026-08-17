# OSI Model
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


