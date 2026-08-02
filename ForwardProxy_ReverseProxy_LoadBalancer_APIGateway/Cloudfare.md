# Cloudflare

## Is Cloudflare a Reverse Proxy or a Load Balancer?

> Cloudflare is primarily a Reverse Proxy platform, but it also provides Load Balancing as one of its services.

Think of Cloudflare as a platform with multiple capabilities rather than a single component.

"Cloudflare is primarily a reverse proxy and edge network. It sits in front of origin servers to provide CDN, TLS termination, WAF, DDoS protection, caching, and request routing. It also offers a Load Balancing service that distributes traffic across multiple origin servers using health checks and geographic routing. So, load balancing is one capability of the broader reverse proxy platform."

**A simple analogy**
- Cloudflare = A smart receptionist for your building (reverse proxy) who also knows how to direct visitors to the right office when there are multiple offices available (load balancing).

### Cloudflare Architecture
```
                Internet Users
                      │
                      ▼
              Cloudflare Edge
          (Reverse Proxy Platform)
                      │
      ┌───────────────┼────────────────┐
      │               │                │
      ▼               ▼                ▼
    WAF          DDoS Protection     CDN Cache
      │
      ▼
 SSL Termination
      │
      ▼
 Load Balancer (Optional)
      │
 ┌────┴─────────┐
 ▼              ▼
Origin DC-1   Origin DC-2
      │              │
      ▼              ▼
 App Servers     App Servers
```

### Why is Cloudflare a Reverse Proxy?

When a user visits:
```
https://example.com
```
The request flow is:
```
Browser
    │
    ▼
Cloudflare
    │
    ▼
Your Server
```
The browser never talks directly to your server.

Cloudflare:
- Receives the request
- Inspects it
- Terminates TLS/SSL
- Applies firewall rules
- Serves cached content if available
- Forwards the request to your origin if needed

Since it sits in front of your servers and forwards requests, it acts as a reverse proxy.

### When does Cloudflare become a Load Balancer?

Suppose your application is deployed in multiple regions:
```
               Cloudflare
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   US Server   Europe Server  India Server
```

Cloudflare Load Balancing can:
- Route users to the nearest region
- Perform health checks
- Fail over if a server is down
- Balance traffic across origins

In this scenario, Cloudflare is providing a load balancing service on top of its reverse proxy capabilities.

### Cloudflare Services
| Service             | Role                                              |
| ------------------- | ------------------------------------------------- |
| CDN                 | ✅ Reverse Proxy                                   |
| WAF                 | ✅ Reverse Proxy                                   |
| DDoS Protection     | ✅ Reverse Proxy                                   |
| SSL/TLS Termination | ✅ Reverse Proxy                                   |
| Caching             | ✅ Reverse Proxy                                   |
| Load Balancing      | ✅ Optional add-on/service                         |
| DNS                 | ❌ Not a proxy by itself (unless using proxy mode) |
| Zero Trust          | Separate security services                        |

### Real Production Example

Imagine an e-commerce site:
```
User
  │
  ▼
Cloudflare
  │
  ├── WAF
  ├── CDN Cache
  ├── SSL
  ├── Bot Protection
  ├── DDoS Protection
  └── Load Balancer
          │
    ┌─────┴─────┐
    ▼           ▼
 AWS        Azure
 Origin      Origin
```
Cloudflare first acts as a reverse proxy, applying security and performance features. If multiple origins are configured, its Load Balancer then decides which healthy origin should receive the request.

# If Cloudflare first acts as a reverse proxy, then why need NGINX Reverse Proxy seperately ?
This is an excellent system design question, and it's something that comes up frequently in real-world architectures.

The key point is:
```
Cloudflare and NGINX are both reverse proxies, but they operate at different layers and serve different purposes.
```
Think of them as Edge Reverse Proxy vs Internal Reverse Proxy.

**Production Architecture**
```
                    Internet
                        │
                        ▼
             Cloudflare (Edge Reverse Proxy)
        ┌─────────────────────────────────────┐
        │ • DNS                              │
        │ • CDN                              │
        │ • DDoS Protection                  │
        │ • WAF                              │
        │ • SSL Termination                  │
        │ • Bot Protection                   │
        └─────────────────────────────────────┘
                        │
                 Secure Connection
                        │
                        ▼
          NGINX (Internal Reverse Proxy)
        ┌─────────────────────────────────────┐
        │ • URL Routing                       │
        │ • Authentication                    │
        │ • Header Manipulation               │
        │ • Rate Limiting                     │
        │ • Internal Caching                  │
        │ • Static File Serving               │
        └─────────────────────────────────────┘
                        │
                        ▼
                Internal Load Balancer
                        │
            ┌───────────┼────────────┐
            ▼           ▼            ▼
          App1        App2         App3
```

## What Cloudflare Does

Cloudflare sits at the edge of the Internet.

Its job is to protect your infrastructure before traffic reaches your network.

For example:
```
User
   │
   ▼
Cloudflare
```

Cloudflare handles:
- DDoS attacks
- Web Application Firewall (WAF)
- CDN caching
- SSL/TLS termination
- Bot detection
- Global Anycast routing
- Geographic routing

Cloudflare does not know your application's business logic.

For example, it doesn't know:
- /api/orders should go to the Order Service.
- /api/payments should require additional authentication.
- /admin should only be accessible from the corporate network.

These are application-specific concerns.

## What NGINX Does

NGINX sits inside your infrastructure, close to your application.

It understands your application's routing and policies.

For example:
```
/api/users  ─────► User Service

/api/orders ─────► Order Service

/api/payment ────► Payment Service

/admin ──────────► Admin Service
```

NGINX can also:
- Add or remove HTTP headers
- Rewrite URLs
- Validate JWTs (with appropriate configuration/modules)
- Enforce internal rate limits
- Route traffic based on cookies, headers, or paths
- Serve static files from local storage

## Example: E-commerce Site

Suppose a user requests:
```
https://shop.example.com/api/orders
```
The flow is:
```
Browser
   │
   ▼
Cloudflare
   │
   ├── Is this a DDoS attack?
   ├── Is the IP blocked?
   ├── Is the response cached?
   └── Forward if allowed
   │
   ▼
NGINX
   │
   ├── Route /api/orders
   ├── Add security headers
   ├── Check internal policies
   └── Forward
   │
   ▼
Order Service
```
Notice how Cloudflare protects the edge, while NGINX manages application traffic.

# Why Not Let Cloudflare Do Everything?

Because Cloudflare cannot replace all internal infrastructure.

Imagine your application has these routes:
```
/api/users

/api/orders

/api/payments

/api/inventory

/admin

/internal

/metrics
```
Internally, you might want:
```
/api/users
      │
      ▼
User Service

/api/orders
      │
      ▼
Order Service

/admin
      │
      ▼
Admin Cluster

/internal
      │
      ▼
Private Network Only
```
NGINX (or another internal reverse proxy/API gateway) is typically where these routing decisions and internal policies are enforced.

# When Can You Skip NGINX?

For small applications, you often can.
```
Internet
    │
    ▼
Cloudflare
    │
    ▼
Application
```

This is common for:
- Personal websites
- Small SaaS products
- Blogs
- Startup MVPs