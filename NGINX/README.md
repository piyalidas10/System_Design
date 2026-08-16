# 🔥 NGINX

**Nginx itself is a self-contained software that can fully fit into a local development environment (e.g. a Mac or a Linux computer) for testing, no Internet is needed and no cloud dependency, which is very different from other cloud based solutions that has feature parity - because those cloud based solutions requires $$$ to run and an Internet connection to work.**

NGINX is a fundamental component in system design, acting as an intermediary between clients and backend services. 
It is primarily used for reverse proxying, load balancing, SSL/TLS termination, and caching to ensure high performance, stability, and security.  
NGINX excels in handling high-traffic scenarios using an event-driven, non-blocking architecture.  

Nginx also supports features like HTTP/2, WebSockets, URL rewriting, and rate limiting, which enhance its versatility and performance. 
These capabilities, along with its core strengths, make Nginx a powerful tool for modern web applications

## Tutorials
1. **Nginx in Hindi** : https://www.youtube.com/playlist?list=PLinedj3B30sCbKdDspcuD3T6zFWPXzsNt

## what is NGINX?

NGINX is a software application.

It can do many things.

For example:
```
NGINX
 ├── Web Server
 ├── Reverse Proxy
 ├── Load Balancer
 ├── SSL/TLS Termination
 ├── Caching
 └── Request Routing
```
**So NGINX is not the same thing as "Load Balancer."**

Instead:
```
NGINX can be used as a Load Balancer.
```

## NGINX as a Reverse Proxy

This is probably the most important concept for a fresher.

**Without NGINX:**
```
User
  |
  v
Application Server
```

**With NGINX:**
```
User
  |
  v
NGINX
  |
  v
Application Server
```
NGINX sits in front of your application.

That's why we call it a Reverse Proxy.

## Why is it called Reverse Proxy?

Let's first understand a normal proxy.
```
Client → Proxy → Internet
```
The proxy acts on behalf of the client.

That's a forward proxy.


**A reverse proxy is different:**
```
Client → Reverse Proxy → Server
```
The reverse proxy acts on behalf of the server/backend.


**NGINX commonly works this way:**
```
                    Backend
                      ↑
                      |
User → NGINX → Application Server
```
The user doesn't directly communicate with the application server.

## NGINX can also Load Balance

This is where the two concepts meet.

**You can configure NGINX like this:**
```
                  ┌──> Server A
                  |
User → NGINX ─────┼──> Server B
                  |
                  └──> Server C
```
**Now NGINX is performing two jobs:**
```
NGINX
  │
  ├── Reverse Proxy
  │
  └── Load Balancer
```

##  Load Balancer vs NGINX
| Load Balancer                                 | NGINX                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| A **role/function**                           | A **software/tool**                                                       |
| Distributes traffic                           | Can distribute traffic                                                    |
| Main purpose is traffic distribution          | Can do many jobs                                                          |
| Can perform health checks                     | Can perform/provide health checking depending on setup/version            |
| Can work at L4/L7 depending on implementation | Primarily HTTP/L7; also supports TCP/UDP through its stream functionality |
| Examples: AWS ALB, NLB, F5, HAProxy, NGINX    | NGINX Open Source / NGINX Plus                                            |
| Doesn't necessarily mean a specific product   | Is a specific product                                                     |

## Load Balancer vs NGINX with analogy
**Think about a restaurant 🍽️.**

You have:
```
Customers
   |
   v
Receptionist
   |
 ┌─┼─┐
 ↓ ↓ ↓
T1 T2 T3
```
The receptionist decides which table should receive the customer.

That's like a Load Balancer.

**Now imagine the receptionist also:**
- checks reservations
- validates tickets
- redirects customers
- handles special requests
- manages queues

That's closer to what NGINX can do.

So:

> Load balancing = a job

> NGINX = a tool that can perform that job plus many others

## Key Roles of NGINX in System Design:
- **Load Balancer**: Distributes incoming traffic across multiple backend servers to prevent overload.
  - If multiple servers exist, Nginx distributes requests among them. Example: Round Robin algorithm. This prevents one server from getting overloaded.
- **Reverse Proxy**: Sits in front of backend servers, directing client requests to the appropriate service, hiding the backend architecture for security.
  - One client → proxy → multiple servers
  - Client doesn’t know which server handled the request
- **SSL/TLS Termination**: Handles encrypted connections, offloading this resource-intensive task from backend application servers.
- **Caching/Static Content Server**: Serves static files (CSS, images) directly, reducing load on backend application servers.
  - Example:
    - A user requests an image
    - Nginx stores it in cache
    - Next user gets it faster from cache
    This improves performance.
- **API Gateway/Ingress Controller**: Manages external traffic, particularly in containerized Kubernetes environments.

## If we have Redis for cache then why need NGINX ?
Even if you use Redis for caching, NGINX remains necessary because they serve different fundamental roles in a web architecture. While Redis is an in-memory data store for application-level data, NGINX is an entry-point web server and reverse proxy that manages traffic before it ever reaches your application. 

**Key reasons to use both include:**
- **Traffic Management**: NGINX acts as a Load Balancer, distributing incoming user requests across multiple application servers to prevent any single one from being overwhelmed.
- **Static Content Delivery**: NGINX is highly optimized to serve static files (images, CSS, JavaScript) directly from the disk. This is much more efficient than using your application code and Redis to serve these assets.
- **Security & SSL**: NGINX handles SSL/TLS termination, decrypting incoming traffic so your backend doesn't have to perform this CPU-heavy task. It also provides a security layer for rate limiting and IP blocking.
- **Reverse Proxying**: NGINX serves as a Reverse Proxy, hiding your application's internal structure and port numbers from the public internet for better security and flexibility.
- **Caching Levels**:
  - **Redis (Application Cache)**: Caches specific data like database query results, user sessions, or complex calculations.
  - **NGINX (Full-Page Cache)**: Can cache entire HTML pages. This is significantly faster for repeating requests because NGINX can serve the page immediately without starting your application or querying Redis at all.
- **Direct Redis Integration**: You can use the NGINX Redis2 Module to let NGINX talk directly to Redis. This allows NGINX to fetch cached content from Redis without involving your application backend, reducing latency significantly. 

## ⭐"Is NGINX a Load Balancer?"
NGINX is primarily a web server and reverse proxy, but it can also act as a Layer-7 load balancer.
> Load Balancer is a concept/role. NGINX is a software/tool that can perform that role.

## Why NGINX is Included in System Design:
- **High Concurrency**: Manages thousands of simultaneous connections with a small memory footprint.
- **Reliability**: Uses a master-worker architecture where workers handle requests and the master manages processes.
- **Flexibility**: Easily configured via nginx.conf to serve static content or proxy requests to varied backend technologies (e.g., Python, Go, Node.js).

## Why Nginx is So Popular:
Apache dominated web servers for 20 years, then Nginx showed up and changed everything. 
Now Nginx powers some of the largest sites on the internet, including Netflix, Airbnb, Dropbox, and WordPress. com. 
Not because it's newer or trendier, but because it solves problems that Apache couldn't handle efficiently. 

**Here’s what makes Nginx so popular:**
- Handles 10,000+ concurrent requests
- Can act as an API Gateway
- **High-Performance Architecture**: Unlike traditional servers, Nginx uses an event-driven, non-blocking I/O model. This architecture enables it to handle thousands of concurrent connections simultaneously with very low memory usage.
- **Reverse Proxy & Load Balancing**: It efficiently distributes incoming traffic across multiple backend servers, improving site reliability, speed, and uptime.
- **Caching Layer** : It is heavily used as a content cache to speed up dynamic sites and as an ingress controller for Kubernetes in cloud-native environments.
- **SSL Termination (Offloading)** : the process of decrypting HTTPS traffic at an intermediary device—like a load balancer, reverse proxy (e.g., NGINX), or CDN—before it reaches backend servers.
  - The client sends an encrypted request to the load balancer (e.g., F5, NGINX). The load balancer terminates the SSL session (decrypts it) and passes the traffic over HTTP (plain text) to the internal servers.
- **Stability and Flexibility**: It supports SSL/TLS termination, providing secure connections, and is known for its ability to update configurations without interrupting service.

## What is a Proxy? (VPN Example)

You’ve probably used a VPN.

A VPN acts as a proxy server:
- You send your request to the VPN
- The VPN forwards it to the actual server

So: Multiple clients → VPN → Server

This is called a Forward Proxy.

**🔹 Forward Proxy vs Reverse Proxy**

✅ Forward Proxy
- Many clients → one proxy → one server
- Server doesn’t know the real clients

✅ Reverse Proxy
- One client → proxy → multiple servers
- Client doesn’t know which server handled the request

**🔹 Nginx as Reverse Proxy**

Nginx is a very popular reverse proxy server. When a user makes a request:
- The request goes to Nginx (not directly to the server)
- Nginx decides which backend server should handle it
- The response is sent back to the user

We control this behavior using configuration files.

## When Can You Skip NGINX?

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

## When Is NGINX Still Valuable?

As systems grow, NGINX (or alternatives like Envoy or Traefik) becomes useful for:
- Complex application routing
- Canary and blue-green deployments
- Internal TLS termination
- Fine-grained request transformations
- Internal caching
- Multi-service routing
- Decoupling your application from edge-provider-specific features

## One more important distinction: NGINX doesn't have to load balance

This is a common beginner misconception.

You can have:
```
User
 |
 v
NGINX
 |
 v
One Backend Server
```
Here NGINX is simply a Reverse Proxy.

No load balancing is happening.

But:
```
User
 |
 v
NGINX
 |
 ├── Backend 1
 ├── Backend 2
 └── Backend 3
```
Now NGINX can act as a Load Balancer.

## Where does NGINX fit in a real system?

A production architecture might look like:
```
                    INTERNET
                       |
                       ↓
             ┌─────────────────┐
             │ Cloud Load      │
             │ Balancer        │
             └────────┬────────┘
                      |
                      ↓
              ┌──────────────┐
              │    NGINX     │
              │ Reverse Proxy│
              └──────┬───────┘
                     |
          ┌──────────┼──────────┐
          ↓          ↓          ↓
       Node #1    Node #2    Node #3
          |          |          |
          └──────────┼──────────┘
                     ↓
                  Database
```
Here you can have both:
```
Cloud Load Balancer
        +
       NGINX
```
They aren't necessarily competitors.

They can perform different layers of traffic management.

## How to remember it for interviews 🧠

Just remember this:
```
             LOAD BALANCER
                  ↓
        "Distribute traffic"
                  ↓
        ┌─────────────────┐
        │                 │
        ↓                 ↓
      NGINX             AWS ALB
        │
        ├── Reverse Proxy
        ├── Web Server
        ├── Load Balancer
        ├── SSL Termination
        └── Caching
```

**One-line answer**
```
A Load Balancer is a role/function that distributes traffic across servers, while NGINX is a software tool that can act as a reverse proxy, web server, and Layer-7 load balancer.
```

**Fresher-friendly memory trick**
```
LB = "What is the job?"

NGINX = "Which tool can do the job?"
```
That's the key difference.



