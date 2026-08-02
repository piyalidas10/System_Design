# Is a Load Balancer a Reverse Proxy?
Yes, in most cases.

A load balancer sits in front of backend servers, receives client requests, and forwards them to one of several servers. Since clients never connect directly to the backend servers, it behaves as a reverse proxy.

> A load balancer can act as a reverse proxy, but a reverse proxy is not always a load balancer because reverse proxies can route traffic to a single server, handle security, or operate at network layers that do not split workloads

```
          Client
             │
             ▼
     Load Balancer
   (Reverse Proxy)
      │    │    │
      ▼    ▼    ▼
    App1 App2 App3
```

Examples:
- NGINX ✔️ Reverse Proxy + Load Balancer
- HAProxy ✔️ Reverse Proxy + Load Balancer
- AWS Application Load Balancer ✔️ Reverse Proxy + Load Balancing
- F5 BIG-IP ✔️ Reverse Proxy + Load Balancer

However...

A reverse proxy doesn't have to balance traffic.

Example:
```
Client
   │
   ▼
NGINX Reverse Proxy
   │
   ▼
Single Web Server
```
Here, NGINX is acting as a reverse proxy for SSL termination, caching, compression, or security—but there is only one backend server, so no load balancing is occurring.

# Enterprise Architecture with forward proxies and reverse proxies
```
                      Employees
                          │
                    (Corporate LAN)
                          │
                          ▼
                ┌──────────────────┐
                │  Forward Proxy   │
                │ Zscaler/Squid    │
                └──────────────────┘
                          │
                     Internet
                          │
     ───────────────────────────────────────────
                          │
                    Company Website
                          │
                          ▼
                ┌──────────────────┐
                │ Reverse Proxy    │
                │ NGINX/Cloudflare │
                └──────────────────┘
                          │
                          ▼
                  Load Balancer
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
        API Gateway 1            API Gateway 2
             │                         │
      ┌──────┴────────┬────────────────┘
      ▼               ▼
 User Service     Order Service
```

## TCS - Forward Proxy (Employee Internet Access)
Imagine you work at TCS.

When you open:
```
https://youtube.com
```
The request does not go directly to YouTube.
```
Employee Laptop
       │
       ▼
Corporate Forward Proxy
       │
       ├── Scan for malware
       ├── Check company policy
       ├── Log browsing
       ├── Cache content
       └── Allow/Block
       │
       ▼
YouTube
```

**Enterprise Uses**
- Block gambling websites
- Block adult content
- Prevent malware downloads
- Monitor employee internet usage
- Cache software updates
- Data Loss Prevention (DLP)
- Enforce compliance

**Typical products:**
- Zscaler Internet Access (ZIA)
- Broadcom (Symantec) ProxySG
- Cisco Secure Web Appliance
- Squid Proxy

## Bank Website
Suppose customers visit:
```
https://bank.com
```
They never connect directly to the banking servers.
```
Customer
     │
     ▼
Cloudflare
     │
     ▼
NGINX Reverse Proxy
     │
     ▼
Load Balancer
     │
 ┌───┴─────┐
 ▼         ▼
App1     App2
```

The reverse proxy:
- Terminates HTTPS
- Filters malicious traffic
- Blocks SQL injection attempts
- Applies Web Application Firewall (WAF) rules
- Compresses responses
- Caches static assets
- Hides internal IP addresses

## Netflix
When you visit:
```
https://netflix.com
```
```
User
   │
   ▼
Netflix Edge
(Reverse Proxy)
   │
   ▼
Load Balancer
   │
   ▼
Movie Metadata Services
Recommendation Services
Billing Services
```

The reverse proxy handles:
- SSL termination
- Routing
- Compression
- Security
- Static asset caching

## Amazon
```
amazon.com
```
```
Customer
    │
    ▼
CloudFront
(Reverse Proxy + CDN)
    │
    ▼
Application Load Balancer
    │
    ▼
API Gateway
    │
    ▼
Microservices
```

## Internal APIs

Many companies expose APIs like:
```
api.company.com
```
```
Client
   │
   ▼
Reverse Proxy
(NGINX)
   │
   ▼
API Gateway
   │
   ├── User API
   ├── Payment API
   ├── Inventory API
   └── Notification API
```

Benefits:
- One public endpoint
- TLS termination
- Security headers
- Request filtering
- URL rewriting
- Centralized logging

## Software Update Cache (Forward Proxy)

Large organizations with thousands of PCs don't want every machine downloading the same updates independently.
```
1000 Laptops
      │
      ▼
Forward Proxy Cache
      │
      ▼
Microsoft Update
```
Without caching:
```
1000 × 2 GB = 2 TB downloaded
```
With caching:
- Download once (2 GB)
- Serve locally 999 times

This saves significant internet bandwidth.

## Corporate Security

An employee attempts to visit a phishing site.
```
Employee
    │
    ▼
Forward Proxy
    │
    ├── Reputation Check
    ├── Malware Scan
    ├── URL Filtering
    └── Block
```
The malicious request never reaches the destination.

## E-commerce Website
```
Millions of Users
        │
        ▼
Cloudflare
        │
        ▼
NGINX Reverse Proxy
        │
        ▼
Load Balancer
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
App1   App2    App3
        │
        ▼
Redis Cache
        │
        ▼
Database
```

Responsibilities of the reverse proxy:
- SSL termination
- WAF
- DDoS protection
- Response compression
- Static content caching
- Hiding backend infrastructure