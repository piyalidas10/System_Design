# 🔥HTTP 1 Vs HTTP 11 Vs HTTP2 Vs HTTP3

1. **HTTP/1.1 vs HTTP/2 vs HTTP/3 What’s Changed? (Hindi)** : https://www.youtube.com/shorts/Mw8VUthLj5c
2. **HTTP/2 vs HTTP/3: The End of Head-of-Line Blocking** : https://www.youtube.com/watch?v=ruAtoV3mPfQ

HTTP/1.1 uses persistent TCP connections but has limitations with parallel request processing. HTTP/2 improves performance through binary framing, multiplexing multiple streams over a single TCP connection, and header compression. However, HTTP/2 still suffers from TCP-level head-of-line blocking when packets are lost. HTTP/3 uses QUIC over UDP, providing multiplexed independent streams, integrated TLS, faster connection establishment, and avoiding TCP's connection-level head-of-line blocking.

```
                 HTTP EVOLUTION

HTTP/1.0
   │
   ├── TCP
   ├── Short-lived connections
   └── Expensive
        │
        ▼
HTTP/1.1
   │
   ├── TCP
   ├── Keep-Alive
   ├── Persistent connection
   └── Still limited parallelism
        │
        ▼
HTTP/2
   │
   ├── TCP
   ├── Binary framing
   ├── Multiplexing ⭐
   ├── Header compression
   └── TCP HOL blocking remains
        │
        ▼
HTTP/3
   │
   ├── QUIC
   ├── UDP
   ├── Multiplexing ⭐
   ├── Independent streams ⭐
   ├── TLS integrated
   ├── Faster connection establishment
   └── Connection migration
```

**✅ HTTP/1.0 = new connections**   
**✅ HTTP/1.1 = keep connections alive**   
**✅ HTTP/2 = multiple streams over one TCP connection**   
**✅ HTTP/3 = multiple streams over QUIC/UDP**   

| Scenario               | HTTP/1.0              | HTTP/1.1        | HTTP/2          | HTTP/3                        |
| ---------------------- | --------------------- | --------------- | --------------- | ----------------------------- |
| Simple website         | Works                 | Better          | Better          | Better                        |
| Many resources         | ❌ Poor                | ⚠️ Okay         | ✅ Excellent     | ✅ Excellent                   |
| Connection reuse       | ❌ Limited/traditional | ✅ Yes           | ✅ Yes           | ✅ Yes                         |
| Multiplexing           | ❌                     | ❌               | ✅               | ✅                             |
| Binary framing         | ❌                     | ❌               | ✅               | ✅                             |
| Header compression     | ❌                     | ❌               | ✅ HPACK         | ✅ QPACK                       |
| Transport              | TCP                   | TCP             | TCP             | QUIC/UDP                      |
| TCP-level HOL blocking | N/A                   | Yes             | **Yes**         | **No**                        |
| Mobile network changes | Poor                  | Poor            | Limited by TCP  | **Excellent design for this** |
| Packet loss handling   | TCP                   | TCP             | TCP             | QUIC                          |
| Modern web apps        | Rare                  | Still supported | **Very common** | **Increasingly common**       |

## Intro

**HTTP is the language/rules used by a browser and a web server to communicate.**

For example, when you open:
```
https://example.com/products
```
your browser needs to ask the server:
```
“Please give me /products.”
```
The server responds:
```
“Here is the HTML/data.”
```
HTTP defines how that conversation happens.

## 1. First understand the basic HTTP request

**Imagine you visit:**
```
https://example.com/products
```

**The browser sends something conceptually like:**
```
GET /products HTTP/1.1
Host: example.com
```

**The server responds:**
```
HTTP/1.1 200 OK
Content-Type: text/html

<html>
   ...
</html>
```

**So there are two sides:**
```
Browser                         Server
   |                              |
   | -------- HTTP Request ------>|
   |                              |
   | <------- HTTP Response ------|
   |                              |
```
This basic idea remains true across HTTP/1.0, HTTP/1.1, HTTP/2 and HTTP/3.

The big difference is how efficiently they transport those requests and responses.

## 2. HTTP/1.0 — The Old Approach

HTTP/1.0 was introduced in the early web era.

**Suppose your webpage contains:**
```
index.html
style.css
app.js
logo.png
product.jpg
```
The browser needs all of these resources.

**With the traditional HTTP/1.0 approach, you could have:**
```
Browser
   |
   |---- Request index.html ----> Server
   |<--- Response ---------------|
   |
   |---- Request style.css -----> Server
   |<--- Response ---------------|
   |
   |---- Request app.js ---------> Server
   |<--- Response ---------------|
   |
   |---- Request logo.png -------> Server
   |<--- Response ---------------|
```
Each connection was generally short-lived.

**The big problem**

Creating a TCP connection has overhead.

Think about ordering food from a restaurant.

Every time you want something:
```
Go to restaurant
Order
Get food
Leave
```
Then again:
```
Go to restaurant
Order
Get food
Leave
```
That's inefficient.

## 3. HTTP/1.1 — Reuse the Connection

HTTP/1.1 was a major improvement.

**One important feature was:**
```
Persistent connections / Keep-Alive
```
Instead of creating a new TCP connection for every request, the browser could keep the connection open.

**Conceptually:**
```
Browser                         Server
   |                              |
   |---- Request 1 -------------->|
   |<--- Response 1 --------------|
   |                              |
   |---- Request 2 -------------->|
   |<--- Response 2 --------------|
   |                              |
   |---- Request 3 -------------->|
   |<--- Response 3 --------------|
   |                              |
   |        Same connection       |
```
That's much better.

## 4. But HTTP/1.1 had a big problem

Here's where you should remember an important term:

**Head-of-Line Blocking**

**Suppose we need:**
```
A = index.html
B = style.css
C = app.js
```
**Imagine:**
```
Request A
   ↓
Response A takes 5 seconds
   ↓
Request B
   ↓
Request C
```
Because HTTP/1.1 uses a text-based request/response model over TCP, requests can get stuck behind earlier responses depending on how the connection is being used.

**Think about a single-lane road:**
```
🚗 A -------->
       🚚 SLOW
       🚚 SLOW
       🚚 SLOW

🚗 B cannot easily pass
🚗 C cannot easily pass
```
One slow response can delay others.

## 5. HTTP/1.1 tried to solve this with multiple connections

Browsers could open multiple TCP connections to the same server.

**For example:**
```
Connection 1 → index.html
Connection 2 → style.css
Connection 3 → app.js
Connection 4 → image.jpg
```
Now things can happen somewhat in parallel.

**But there is still a problem:**
```
Browser
   |
   +---- TCP connection 1
   |
   +---- TCP connection 2
   |
   +---- TCP connection 3
   |
   +---- TCP connection 4
```
**More connections mean:**
```
more TCP overhead
more resources
more congestion
more complexity
```
So the industry wanted something better.

## 6. HTTP/2 — Major Improvement

HTTP/2 changed the way HTTP messages are transported.

The most important word to remember is:

**Multiplexing**

**Instead of:**
```
Request 1 → Response 1
Request 2 → Response 2
Request 3 → Response 3
```
HTTP/2 can send multiple streams through one TCP connection.

**Imagine a highway:**
```
              HTTP/2
                |
        One TCP Connection
                |
    ┌───────────┼───────────┐
    ↓           ↓           ↓
 Stream 1    Stream 2    Stream 3
 HTML        CSS         JS
```
All three can be in progress at the same time.

## 7. HTTP/2 uses Binary Framing

HTTP/1.1 is primarily text-based.

**For example:**
```
GET /products HTTP/1.1
Host: example.com
```
HTTP/2 introduced binary framing.

You don't need to understand the binary format as a fresher.

**Just remember:**
```
HTTP/1.1
    ↓
Text-based messages

HTTP/2
    ↓
Binary frames
```
HTTP/2 breaks communication into small binary pieces called frames.

These frames belong to different streams.

**For example:**
```
TCP Connection
│
├── Stream 1
│     ├── Frame
│     ├── Frame
│
├── Stream 3
│     ├── Frame
│
└── Stream 5
      ├── Frame
      ├── Frame
```
This enables multiplexing.

## 8. HTTP/2 also introduced Header Compression

**HTTP requests often contain headers:**
```
Host: example.com
User-Agent: Chrome
Accept: application/json
Authorization: ...
Cookie: ...
```
These headers can become repetitive.

HTTP/2 introduced HPACK compression for HTTP headers.

**So instead of repeatedly sending the same information:**
```
Request 1:
Host: example.com
Cookie: ABC
User-Agent: Chrome

Request 2:
Host: example.com
Cookie: ABC
User-Agent: Chrome

Request 3:
Host: example.com
Cookie: ABC
User-Agent: Chrome
```
HTTP/2 can compress/reuse header information.

## 9. HTTP/2 Server Push

HTTP/2 also introduced a feature called:

**Server Push**

The idea was:

**Browser:**
```
“Give me index.html.”
```
**Server knows:**
```
“The HTML will need style.css.”
```
So the server could proactively send the CSS.

**Conceptually:**
```
Browser
   |
   |---- Give me index.html ---->
   |
   |<--- index.html -------------
   |<--- style.css --------------  Server Push
```
However, HTTP/2 Server Push was later deprecated/removed from major browser implementations, so don't think of it as a modern best practice.

## 10. But HTTP/2 still uses TCP

This is extremely important.

**HTTP/2:**
```
HTTP/2
   ↓
TCP
   ↓
IP
```
TCP provides reliable, ordered delivery.

That sounds good. But it creates a new problem.

## 11. HTTP/2 + TCP Head-of-Line Blocking

**Imagine HTTP/2 has:**

One TCP connection
```
Stream 1 → HTML
Stream 3 → CSS
Stream 5 → JS
```
Suppose one TCP packet is lost.

Because TCP guarantees ordered delivery, the missing packet has to be recovered before the affected byte stream can continue being delivered correctly.

**So even though HTTP/2 multiplexes streams:**
```
Stream 1 ──────────────┐
Stream 3 ──────────────┤
Stream 5 ──────────────┤
                       ↓
                  One TCP connection
                       ↓
                  Packet lost ❌
```
The TCP connection can become the bottleneck.

This is one of the major motivations behind HTTP/3.

## 12. HTTP/3 — The New Generation

HTTP/3 changes something fundamental.

**Instead of:**
```
HTTP/2
   ↓
TCP
   ↓
IP
```
**HTTP/3 uses:**
```
HTTP/3
   ↓
QUIC
   ↓
UDP
   ↓
IP
```
**The important word is:**
```
QUIC
```
QUIC is a modern transport protocol built on top of UDP.

## 13. Why UDP?

You might ask:
```
“TCP is reliable. Why use UDP?”
```
Good question.

UDP itself does not provide the same reliability guarantees as TCP.

QUIC adds the features needed for reliable communication while changing how streams and connections are handled.

**So don't think:**
```
UDP = unreliable = HTTP/3 is unreliable
```
That's incorrect.

**Instead:**
```
HTTP/3
   ↓
QUIC
   ↓
UDP
```

**QUIC provides things such as:**
- reliable delivery
- multiple independent streams
- encryption
- connection migration
- faster connection establishment

## 14. HTTP/3 solves an important HTTP/2 problem

**Remember our HTTP/2 situation:**
```
Stream 1 ──────┐
Stream 2 ──────┤
Stream 3 ──────┤
               ↓
             TCP
               ↓
          Packet lost ❌
```
With HTTP/3/QUIC, streams are more independent.

Conceptually:

**QUIC Connection**
```
Stream 1 → HTML       ✅
Stream 2 → CSS        ❌ packet lost
Stream 3 → JS         ✅
```
The loss affecting Stream 2 doesn't block the other streams in the same way TCP's single ordered byte stream can.

That's a huge architectural improvement.

## 15. HTTP/3 also improves connection establishment

HTTP/3 uses QUIC, which integrates TLS into the protocol.

The result can be fewer round trips when establishing a secure connection.

**Think roughly:**

Older approach
```
TCP handshake
      ↓
TLS handshake
      ↓
```

HTTP
```
HTTP/3
QUIC + TLS
     ↓
HTTP/3
```
This can reduce latency, especially on networks where connection setup time matters.

## 16. HTTP/3 is especially useful for mobile networks

Imagine you're using your phone.

You move:
```
Wi-Fi
  ↓
Mobile network
```
Your network characteristics change.

Traditional TCP connections are tied more closely to the network path/IP connection.

QUIC supports connection migration, allowing a connection to continue across certain network changes.

This is very useful for:
```
Mobile devices
Laptops
Wi-Fi ↔ 4G/5G
Changing networks
```

## 17. Now compare all four

Here's the simplest mental model:
| Version  | Transport     | Major idea                                             |
| -------- | ------------- | ------------------------------------------------------ |
| HTTP/1.0 | TCP           | New connection frequently                              |
| HTTP/1.1 | TCP           | Persistent connections                                 |
| HTTP/2   | TCP           | Multiplexing + binary framing                          |
| HTTP/3   | QUIC over UDP | Multiplexing without TCP's transport-level HOL problem |

## 18. A restaurant analogy 🍔

Let's use one analogy to remember everything.
```
HTTP/1.0
```
You want:
```
Burger
Fries
Coke
```
You go to the restaurant three times.
```
Go → Burger → Leave

Go → Fries → Leave

Go → Coke → Leave
```
Very inefficient.

### HTTP/1.1

You go once and keep the connection open.
```
Go
 ↓
Burger
 ↓
Fries
 ↓
Coke
 ↓
Leave
```
Better.

But if the kitchen takes a long time with the burger:
```
Burger 🐌
   ↓
Fries ⏳
   ↓
Coke ⏳
```
They may have to wait.

### HTTP/2

One connection, multiple orders can be in progress.
```
             Restaurant
                 |
       ┌─────────┼─────────┐
       ↓         ↓         ↓
    Burger     Fries      Coke
```
Much better.

That's multiplexing.

### HTTP/3

Now imagine the restaurant has an advanced delivery system where each order has an independent delivery channel.
```
Burger ────────→
Fries ─────────→
Coke ──────────→
```
If the fries delivery has a problem:
```
Fries ❌
```
the burger and Coke don't necessarily have to wait for that same transport-level problem.

That's the basic idea behind QUIC's independent streams.

## One very important correction

**You may hear people say:**
> "HTTP/2 solved Head-of-Line Blocking."

That's only partially true.

HTTP/2 solved a major HTTP-level/request-level limitation by allowing multiplexing.

But because HTTP/2 runs over TCP, TCP-level head-of-line blocking remains.

**So:**
```
HTTP/1.1
   ↓
HTTP-level HOL problem

HTTP/2
   ↓
HTTP-level multiplexing improves this
   ↓
BUT TCP-level HOL remains

HTTP/3
   ↓
QUIC streams
   ↓
avoids TCP's connection-wide ordered byte-stream limitation
```
This distinction is very useful in interviews.

## What about WebSockets?

This is an important distinction for you as an Angular developer.

**Don't think:**
```
HTTP/3 = WebSocket
```
They are different concepts.

**For example, a chat application might use:**
```
Angular
   |
   | WebSocket
   ↓
Chat Server
```

**HTTP is generally request/response:**
```
Client → Request
Server → Response
```

**WebSocket provides persistent two-way communication:**
```
Client ←────────────→ Server
```

**So:**
```
HTTP/1.1 / HTTP/2 / HTTP/3
        ≠
     WebSocket
```
Though modern protocols also have mechanisms for bidirectional streaming.

## HTTP/3 — "One QUIC connection, independent streams"

Now let's say you're using your mobile phone.

**You open:**
```
https://shop.com
```
You're on Wi-Fi.

**Then you move outside:**
```
Wi-Fi
  ↓
4G/5G

HTTP/3 uses:

HTTP/3
   ↓
QUIC
   ↓
UDP
```
QUIC supports connection migration, so the connection can potentially survive network changes more gracefully.

## Real-world HTTP/3 scenario: Mobile shopping

Imagine you're buying something while traveling.
```
Wi-Fi
  |
  | HTTP/3 + QUIC
  |
Website
```
You walk outside:
```
Wi-Fi ❌
   ↓
5G
```
With QUIC, the connection can migrate to the new network path using the connection identity rather than treating the change simply as a completely new TCP connection.

This can improve the experience on mobile networks.

## HTTP/3 and packet loss

Here's another very important real-world scenario.

You're on a poor mobile network.

Suppose you're downloading:
```
HTML
CSS
JS
Images
```

### With HTTP/2:
```
             TCP connection
                  |
       ┌──────────┼──────────┐
       ↓          ↓          ↓
     HTML        CSS         JS
                  ↓
              Packet lost ❌
                  ↓
             TCP recovery
```
TCP provides one ordered byte stream, so packet loss can cause delivery to stall behind the missing data.

### With HTTP/3:
```
              QUIC connection
                    |
        ┌───────────┼───────────┐
        ↓           ↓           ↓
      HTML         CSS         JS
        ✅          ❌           ✅
```
A loss affecting one QUIC stream doesn't create the same connection-wide head-of-line blocking behavior as TCP.

That's one of HTTP/3's biggest advantages.

## Real-world comparison: Online shopping

Let's make it very practical.

You open:

Amazon-like website

**The browser needs:**
```
HTML
CSS
JS
Logo
20 product images
User profile
Cart information
Recommendations
```

### HTTP/1.0
```
Connect
 ↓
HTML
 ↓
Close

Connect
 ↓
CSS
 ↓
Close

Connect
 ↓
JS
 ↓
Close

...
```
🐌 Very inefficient

## HTTP/1.1
```
Connection
   ↓
HTML
   ↓
CSS
   ↓
JS
   ↓
Images
   ↓
...
```
Better because the connection can be reused.

But parallelism is still limited compared with HTTP/2.

🚗 Better

### HTTP/2
```
               One TCP connection
                      |
     ┌────────────────┼────────────────┐
     ↓                ↓                ↓
    HTML              CSS              JS
     ↓                ↓                ↓
   Image 1          Image 2          Image 3
```
🚀 Much better

Multiple streams can be multiplexed.

### HTTP/3
```
               One QUIC connection
                       |
     ┌─────────────────┼─────────────────┐
     ↓                 ↓                 ↓
   HTML               CSS                JS
     ↓                 ↓                 ↓
  Image 1           Image 2            Image 3
     ✅                ❌                 ✅
```
And if:
```
Wi-Fi → 5G
```
QUIC can support connection migration.

🚀🚀 Better for modern/mobile/unreliable networks

## Another real-world scenario: REST API

**Suppose your Angular application calls:**
```
GET /api/products
GET /api/categories
GET /api/users/me
GET /api/cart
```

### HTTP/1.1

You have HTTP requests over TCP connections.
```
Angular
   |
   ├── GET /products
   ├── GET /categories
   ├── GET /users/me
   └── GET /cart
```
Browsers can use multiple connections, but there's overhead.

### HTTP/2

You can have:
```
              One TCP connection
                     |
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
 /products       /categories    /cart
       ↓             ↓             ↓
                  /users/me
```
Multiple requests can be multiplexed.

### HTTP/3

Same application-level idea:
```
              One QUIC connection
                     |
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
 /products       /categories    /cart
       ↓             ↓             ↓
                  /users/me
```
But the underlying transport is QUIC instead of TCP.

## Real-world scenario: Online gaming

Imagine:
```
Mobile game
```
Network changes frequently:
```
Wi-Fi
 ↓
5G
 ↓
Wi-Fi
```
Low latency matters.

HTTP/3/QUIC's design is particularly useful for modern applications where:
- latency matters
- packet loss occurs
- networks change
- many streams are needed

However, specialized real-time game networking may use other protocols rather than ordinary HTTP requests.

# 🚗 The easiest way to remember
Think about roads.

## HTTP/1.0
```
🚗 → Road → Destination
🚗 → Road → Destination
🚗 → Road → Destination
```
New trip every time.

## HTTP/1.1
```
🚗═══════════════════════🚗
       Same road
```
Keep the connection alive.

## HTTP/2
```
              Highway
══════════════════════════════
  🚗 HTML
  🚗 CSS
  🚗 JS
  🚗 Image
  🚗 API
══════════════════════════════
```
Multiple streams on one connection.

## HTTP/3
```
              QUIC highway
══════════════════════════════
  🚗 HTML       ✅
  🚗 CSS        ❌
  🚗 JS         ✅
  🚗 API        ✅
══════════════════════════════

      ↓
   Network changes
 Wi-Fi → 5G
      ↓
 Connection can migrate
```

```
HTTP/1.0
"Every trip is separate."

        ↓

HTTP/1.1
"Let's keep the road open."

        ↓

HTTP/2
"Let's put many streams on one road."

        ↓

HTTP/3
"Let's build a better transport
(QUIC) so one stream's problems
don't block everything else."
```



