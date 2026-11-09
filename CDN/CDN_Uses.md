# How Does a CDN Provide Services Other Than Caching?

A CDN has Edge Servers (PoPs) distributed across geographical locations. So how can those servers perform security checks, terminate TLS connections, compress files, and filter malicious traffic?

A modern CDN is not just a collection of caching servers. It also runs specialized networking software and security services at its edge locations.

> Think of a CDN as a **Reverse Proxy + Cache + Security Layer + Content Optimization Layer + Edge Computing Platform**.

<img src="./img/CDN Capabilities Beyond Caching.png" width="100%" />

---

## 1. Architecture

When a user accesses an application, the request generally passes through the CDN before reaching the origin.

```
User / Browser
      |
      | HTTPS request
      v
+---------------------------------+
|        CDN EDGE SERVER          |
|  - Traffic Filtering            |
|  - TLS Termination              |
|  - Caching                      |
|  - Compression & Minification   |
|  - DDoS Mitigation              |
|  - Edge Computing               |
+---------------------------------+
      |
      | Allowed requests / cache misses
      v
Origin Server / Backend
(Application APIs and business logic)
```

The CDN can inspect and process requests **before** forwarding them to your backend.

---

## 2. Traffic Filtering — How Does a CDN Detect Malicious Requests?

Imagine a banking application with this API:

```http
POST /api/login
```

A legitimate user sends:

```http
POST /api/login
Content-Type: application/json

{
  "username": "user123",
  "password": "********"
}
```

An attacker sends thousands of suspicious login requests. The CDN can inspect incoming requests using security rules.

**How it works**
1. Request arrives at the CDN edge.
2. The CDN inspects request information: IP address, HTTP method, URL, headers, and request patterns.
3. Security rules evaluate the request.
4. The CDN decides whether to **allow, block, challenge, or rate-limit** it.
5. Only permitted requests continue towards the origin.

**Examples of traffic filtering**

| Detection | CDN action |
| :--- | :--- |
| Suspicious IP address | Block request |
| Repeated login attempts | Rate-limit requests |
| Known malicious request patterns | Block request |
| Automated bot traffic | Challenge or block |
| Suspicious URL parameters | Inspect and potentially block |

### What is a WAF?

**WAF** stands for **Web Application Firewall**. It is a security component that inspects HTTP/HTTPS traffic and applies rules to identify and block common web application attacks, such as:
- SQL Injection
- Cross-Site Scripting (XSS)
- Malicious HTTP requests

> A CDN may include an integrated WAF or offer it as a separate service. Not every CDN provides all these capabilities by default.

### WAF & CDN Deployment Patterns in Enterprise Production

In enterprise production, both patterns are used: WAF can be integrated with the CDN, or deployed as a separate security layer. It is not mandatory for a WAF to be a separate service.

**The important distinction is:**
- **CDN:** Primarily improves content delivery, caching, and global traffic handling.
- **WAF (Web Application Firewall):** Inspects HTTP requests and applies application-layer security rules.
- **Rate Limiter:** Controls how frequently a client can make requests.

These are separate capabilities, but they can be provided by one platform or by different products.

#### 1. Two Common Enterprise Deployment Patterns

##### Pattern A — WAF Integrated with CDN (Very Common)
**Common edge-security pattern**

The WAF is configured as part of the CDN request-processing path. It may be a separately managed product, but it does not necessarily require another server or network hop.

```
Browser / Mobile App
        |
        | HTTPS
        v
   CDN Edge
        |
        v
   WAF Inspection
        |
        +---- Malicious request --> Block
        |
        v
   Rate Limiting
        |
        +---- Limit exceeded ----> HTTP 429
        |
        v
   Cache Lookup
        |
        +---- Cache Hit ----------> Return response
        |
        +---- Cache Miss
                 |
                 v
           Load Balancer
                 |
                 v
             API Gateway
                 |
                 v
           Backend Services
                 |
                 v
              Database
```

- **Amazon Web Services (AWS):** AWS supports attaching AWS WAF directly to Amazon CloudFront. WAF rules run at AWS edge locations, so malicious requests can be blocked before reaching your application.
- **Cloudflare:** Cloudflare's CDN, WAF, and DDoS protection share the same global edge network.

##### Pattern B — WAF Deployed Separately
**Separate security infrastructure**

Here, the WAF is deployed as a distinct component in the network path.

```
Browser / Mobile App
        |
        v
       CDN
        |
        v
   Separate WAF
        |
        v
   Load Balancer
        |
        v
   API Gateway
        |
        v
   Backend Services
        |
        v
     Database
```

This approach can be useful when an organization:
- Already has an enterprise WAF product.
- Needs centralized security policies across multiple CDNs or applications.
- Has specific security, compliance, or network requirements.
- Wants to keep security infrastructure independently managed.

*Example:* Fastly documents multiple WAF deployment patterns, including edge and on-premises deployments.

---

#### 2. Why Do Architecture Diagrams Show WAF Separately from CDN?

Because **CDN and WAF are logically different components**, even when they are integrated into one platform.

| Component | Primary Responsibility |
| :--- | :--- |
| **CDN** | Content delivery, caching, edge routing |
| **WAF** | Detect and block malicious HTTP requests |
| **Rate Limiter** | Control request frequency |
| **DDoS Protection** | Mitigate large-scale traffic attacks |
| **API Gateway** | API routing, authentication, quotas and policies |

> **Key Takeaway:** A separate box in an architecture diagram does not always mean a separate physical server or network hop. It may simply represent a separate capability or policy configuration.

---

## 3. Rate Limiting — How Does a CDN Control Abusive Traffic?

Suppose an attacker sends 10,000 requests per minute to your login API. Your backend may become overloaded. The CDN can apply rate-limiting rules at the edge.

Example configuration:

```
API:              POST /api/login
Maximum requests: 10
Time window:      1 minute
Key:              Client IP address
```

If a client exceeds the limit, the CDN can reject or delay additional requests.

<img src="./img/Rate Limiting — How does CDN control abusive traffic.jpg" width="90%" />


| Request count | CDN action |
| :--- | :--- |
| 1–10 | Allow |
| 11–15 | Block or throttle, depending on policy |
| 16 onwards | Continue enforcing the limit |

The client may receive:

```http
HTTP/1.1 429 Too Many Requests
```

**Why is this useful?** Excessive requests are prevented from unnecessarily reaching your backend.

> Rate limits can be based on IP, client identity, API key, or other configured characteristics. Distributed attackers may use many IP addresses, so rate limiting alone is not sufficient protection.

---

## 4. DDoS Mitigation — How Does a CDN Absorb Attacks?

**DDoS** = Distributed Denial of Service.

Imagine your application normally receives 10,000 requests per minute. Suddenly, millions of requests arrive from different sources. The origin server cannot handle that traffic.

A CDN helps in two ways:

1. **Distributed network infrastructure** – instead of all traffic reaching your origin, it first reaches the CDN's globally distributed network.
2. **Attack detection and mitigation** – CDN infrastructure can identify abnormal traffic patterns and apply filtering, rate limiting, and other mitigation techniques.

<img src="./img/DDoS Mitigation — How does CDN absorb attacks.jpg" width="90%" />

```
        Millions of attack requests
                   |
                   v
            CDN Global Network
                   |
          +--------+--------+
          |                 |
          v                 v
     Traffic Filter    DDoS Protection
          |                 |
          +--------+--------+
                   |
                   v
           Legitimate Requests
                   |
                   v
             Origin Server
```

> A CDN does not magically eliminate every DDoS attack. Protection depends on its network capacity, detection systems, configured policies, and the type of attack.

---

## 5. TLS Termination at the Edge — How Does a CDN Handle HTTPS?

**TLS (Transport Layer Security)** is a protocol that encrypts communication between a client and a server. When you access `https://www.example.com`, your browser establishes an encrypted connection using TLS.

### Without a CDN

```
Browser
   |
   | HTTPS (encrypted)
   v
Origin Server
```

The browser establishes the TLS connection directly with the origin server.

### With a CDN

```
Browser
   |
   | HTTPS (encrypted connection 1)
   v
CDN Edge Server
   |
   | HTTPS (encrypted connection 2)
   v
Origin Server
```

**Step 1 — Browser connects to the CDN.** The browser sends an HTTPS request to the CDN. The CDN presents its TLS certificate for the requested domain and establishes an encrypted connection with the browser.

**Step 2 — CDN terminates TLS.** The CDN decrypts the incoming traffic at its edge. It needs to inspect the HTTP request to perform tasks such as:
- WAF inspection
- Traffic filtering
- Rate limiting
- Cache lookup
- Request routing
- Content optimization

Without access to the decrypted HTTP request, these application-layer operations cannot generally inspect its contents.

**Step 3 — CDN forwards the request to the origin.** If the request needs to reach the origin, the CDN establishes or reuses a separate connection to the origin. Ideally, this connection also uses HTTPS/TLS.

**Step 4 — Origin processes the request.** The backend executes business logic and returns a response.

**Step 5 — CDN returns the response** to the browser through the existing encrypted client-to-CDN connection.

### Are there two TLS connections?

Yes.

| Connection | TLS encryption |
| :--- | :--- |
| Browser → CDN | TLS connection 1 |
| CDN → Origin | TLS connection 2 |

These are separate TLS sessions, not one continuous end-to-end TLS session. The CDN is a trusted intermediary that can inspect the HTTP traffic between the two connections.

> **Banking security consideration:** configure HTTPS between CDN and origin, validate the origin certificate, restrict direct origin access, and apply appropriate controls for sensitive information.

---

## 6. Content Optimization — How Does a CDN Compress and Minimize Files?

Suppose an Angular production build generates:

```
main.js       2 MB
styles.css    500 KB
runtime.js    100 KB
```

The CDN can optimize the content before delivering it to the browser.

### A. Compression

Compression reduces the size of data transferred over the network.

| | Size |
| :--- | :--- |
| Original JavaScript file | 2 MB |
| Compressed transfer (illustrative 75% reduction) | 500 KB |

Actual compression depends on the file contents and the compression algorithm. Common algorithms:
- Gzip
- Brotli

**How it works**
1. The browser sends an `Accept-Encoding` header indicating supported compression algorithms.
2. The CDN checks the browser's supported encoding.
3. The CDN compresses the response if needed and configured.
4. The CDN sends the compressed data.
5. The browser decompresses it and uses the original content.

Request:

```http
GET /main.js HTTP/1.1
Host: example.com
Accept-Encoding: gzip, br
```

CDN response:

```http
HTTP/1.1 200 OK
Content-Encoding: br
Content-Type: application/javascript
```

The browser automatically decompresses the response.

### B. Asset Minification

Minification removes unnecessary characters from files without changing their intended functionality.

Original JavaScript:

```js
function calculateTotal(price, quantity) {
    return price * quantity;
}
```

Minified JavaScript:

```js
function calculateTotal(a,b){return a*b}
```

CDN providers may offer automatic minification, although in many modern applications minification is already performed during the frontend production build.

**Important distinction**
- **Compression** reduces the size of data transferred.
- **Minification** removes unnecessary characters from the source asset.
- Both can improve content delivery efficiency.

---

## 7. How All These Services Work Together

Imagine a user opens your banking application.

```
User / Browser
      |
      | HTTPS request
      v
CDN Edge
  1. TLS Termination
     Establishes and decrypts the client-side TLS connection.
  2. Traffic Filtering / WAF
     Inspects requests and blocks malicious traffic.
  3. Rate Limiting / DDoS Protection
     Controls excessive and abnormal traffic.
  4. Cache Lookup
     Returns cached content if available.
  5. Content Optimization
     Applies compression or other configured optimizations.
      |
      | Allowed requests requiring origin access
      v
Origin Protection
(HTTPS connection, origin access restrictions)
      |
      v
Backend Application
(Business logic and database operations)
```

Not every request goes through every operation in exactly the same way:
- A **cache hit** may be served without contacting the origin.
- A **malicious request** may be blocked before reaching the cache or backend.
- A **dynamic API request** may pass through to the backend.
- A **static asset** may be compressed and served directly from the edge.

---

## 8. Who Provides These Services?

| Provider | Capabilities |
| :--- | :--- |
| **Cloudflare** | CDN, WAF, DDoS protection, TLS, caching, edge computing |
| **Amazon CloudFront** | CDN, caching, TLS, AWS WAF integration, AWS Shield protection, and edge functions |
| **Akamai** | Content delivery, application security, DDoS protection, and edge services |

> Not every provider offers every feature in the same package. Some require separate configuration, subscriptions, or integrations.

---

## 9. Important Interview Question

**Q: A CDN is primarily used for caching. How does it provide security and optimization services as well?**

**Interview-ready answer:**

> "A modern CDN works as a reverse proxy deployed across globally distributed edge locations. It runs networking, security and optimization services at those locations.
>
> It can inspect incoming HTTP requests using WAF rules, block malicious traffic, enforce rate limits, and mitigate DDoS attacks.
>
> It can also terminate TLS connections at the edge, allowing it to inspect requests before forwarding them through a separate encrypted connection to the origin.
>
> For content optimization, it supports compression algorithms such as Gzip and Brotli, and may provide asset minification and image optimization.
>
> Therefore, a modern CDN is not just a caching layer. It is a distributed performance, security, availability and application-delivery platform."

### The most important concept to remember

A CDN has two broad responsibilities:

1. **Content Delivery** – caching, routing, compression, minification, and edge computing.
2. **Traffic Protection** – WAF, traffic filtering, rate limiting, DDoS mitigation, and TLS termination.

Understanding these two responsibilities explains why a CDN is often placed at the front of an enterprise application architecture.
