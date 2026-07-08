# Load Balancer

## Why Load Balancers Are Dead (And What Comes Next)

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

Remembering IP addresses is difficult for humans.

DNS (Domain Name System) maps a domain name to an IP address.

``` text
piyush.dev
    ↓
10.3.4.5
```

Browser Flow:

``` text
Browser
   ↓
DNS Query
   ↓
IP Returned
   ↓
Server
   ↓
Response
```

------------------------------------------------------------------------

# 4. Scaling

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

``` text
Server1 → 10.x.x.1
Server2 → 10.x.x.2
Server3 → 10.x.x.3
```

Questions:

-   Which server should receive the request?
-   DNS maps one domain to one IP.
-   Buying multiple domains isn't practical.

------------------------------------------------------------------------

# 6. Load Balancer

``` text
Users
   │
   ▼
Load Balancer
   │
 ┌──┼──┐
 ▼  ▼  ▼
S1 S2 S3
```

DNS points to the Load Balancer.

The Load Balancer distributes requests across backend servers.

## Round Robin

``` text
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A
```

------------------------------------------------------------------------

# 7. Load Balancers in Microservices

Each microservice may run multiple containers behind its own Load
Balancer.

Benefits:

-   Traffic distribution
-   Health checks
-   Reverse proxy
-   SSL termination
-   High availability

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
