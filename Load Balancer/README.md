# Load Balancer

<img src="./Load_Balancer.png" width="100%" />

# Why Load Balancers Are Dead (And What Comes Next)

## Introduction

Hello everyone, welcome back!

In this guide, we'll discuss why people say **"Load Balancers are
dead."** We'll first understand:

-   What a Load Balancer is
-   Why we need it
-   Its limitations
-   What modern alternative is replacing it

------------------------------------------------------------------------

# 1. Basic Client-Server Architecture

Every backend system has two primary components:

-   **Client** (the user making the request)
-   **Server** (the machine processing the request)

The flow is simple:

``` text
Client
   │
Request
   ▼
Server
   │
Response
   ▼
Client
```

This request-response model has powered web applications for decades.

------------------------------------------------------------------------

# 2. How Does the Client Reach the Server?

A server can be located anywhere on the Internet.

To reach it, every machine has a unique **IP address**.

Example:

``` text
10.3.4.5
```

If the client wants to communicate with the server, it must know this IP
address.

------------------------------------------------------------------------

# 3. Why DNS Exists

Remembering IP addresses like:
```
10.3.4.5
```
is difficult for humans.

That's why we use DNS (Domain Name System).

DNS works like a phonebook.

It maps a domain name to an IP address.

Example:
```
piyush.dev
        ↓
     10.3.4.5
```
When a user types:

piyush.dev

the browser asks the DNS server:

"What is the IP address for this domain?"

DNS returns:
```
10.3.4.5
```
Now the browser knows where to send the request.

Everything works perfectly.

------------------------------------------------------------------------

# 4. Traffic Problem
Eventually, traffic increases.

One server cannot handle millions of requests.

We need scaling.

There are two options.

## Vertical Scaling (Scale Up)

Before:

``` text
2 CPU
4 GB RAM
```

After:

``` text
16 CPU
64 GB RAM
```

Problems:

-   Single Point of Failure
-   Downtime during upgrades
-   Hardware limitations

## Horizontal Scaling (Scale Out)

``` text
Server 1
Server 2
Server 3
...
```

Advantages:

-   High availability
-   Easy scaling
-   No downtime

------------------------------------------------------------------------

# 5. Multiple Servers Problem
Now we have multiple servers.

Each one has a different IP.

Example:
```
Server 1 → 10.x.x.1
Server 2 → 10.x.x.2
Server 3 → 10.x.x.3
```

Now the question becomes:

**Which server should the client connect to?**

DNS can normally map one domain to one IP address.

For example:
```
piyush.dev
```
can point to only one IP.

Buying multiple domains like:
```
p1.com
p2.com
p3.com
```
is not practical.

Users shouldn't decide which server to use.

This creates uneven traffic distribution.

Questions:

-   Which server should receive the request?
-   DNS maps one domain to one IP.
-   Buying multiple domains isn't practical.

DNS typically returns a single IP address, so managing multiple backend servers becomes difficult.

------------------------------------------------------------------------

# 6. Load Balancer Solution

```
Users
     │
     ▼
Load Balancer
     │
 ┌───┼────┐
 ▼   ▼    ▼
S1   S2   S3
```

DNS points to the Load Balancer instead of individual servers.
```
example.com
      │
      ▼
Load Balancer IP
```
The Load Balancer decides which backend server should receive each request.

## Example: Round Robin Algorithm

Requests are distributed sequentially:

``` text
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A
Request 5 → Server B
Request 6 → Server C
```

This helps distribute traffic evenly.

## What Does a Load Balancer Do?

**Traffic Distribution**

Spreads requests across multiple servers.

**High Availability**

If one server fails, traffic is redirected to healthy servers.

**Health Checks**

Continuously monitors backend servers.

**SSL Termination**

Handles HTTPS encryption/decryption.

**Reverse Proxy**

Clients communicate only with the Load Balancer, not directly with backend servers.

**Security**

Backend servers remain hidden from the public internet.

------------------------------------------------------------------------

# 7. Load Balancers in Microservices

Suppose we have an API Service running multiple containers.
```
API Service

Container 1
Container 2
Container 3
Container 4
Container 5
```

A Load Balancer sits in front of these containers.
```
Clients
    │
    ▼
Load Balancer
    │
 ┌──┼──┐
 ▼  ▼  ▼
C1 C2 C3
```
The Load Balancer forwards requests to healthy containers.

Similarly, another microservice (e.g., Notification Service) may also have multiple containers behind its own Load Balancer.

When the API Service wants to send a notification, it calls the Notification Service's Load Balancer, which forwards the request to one of its containers.

------------------------------------------------------------------------

# 8. Challenges

-   Service-to-service authorization
-   Difficult container failure tracking
-   Configuration management
-   Retry complexity

------------------------------------------------------------------------

# 9. Service Mesh

Modern architectures often use a **Service Mesh** for internal service
communication.

Features:

-   Service discovery
-   mTLS
-   Traffic routing
-   Retries
-   Circuit breaking
-   Observability
-   Access control

Popular options:

-   Istio
-   Linkerd
-   Consul Connect
-   Kuma

------------------------------------------------------------------------

# Conclusion

Load Balancers are **not dead**.

They remain essential for **North-South (external)** traffic.

For **East-West (internal)** traffic in modern Kubernetes and
microservice architectures, **Service Mesh** provides advanced
networking, security, and observability.

------------------------------------------------------------------------

# Real-World Example (Angular + Node.js)
```
Users
   ↓
DNS (app.company.com)
   ↓
Load Balancer (NGINX / AWS ALB)
   ↓
 ┌─────────────────────┐
 │ Angular App Server 1│
 │ Angular App Server 2│
 │ Angular App Server 3│
 └─────────────────────┘
   ↓
API Servers
   ↓
Database
```

**Popular Load Balancers:**
- NGINX
- HAProxy
- AWS Application Load Balancer
- Azure Load Balancer
- Google Cloud Load Balancing

Horizontal scaling creates multiple servers, and a Load Balancer acts as a single entry point that intelligently distributes traffic among them while providing availability, scalability, and fault tolerance.

------------------------------------------------------------------------



