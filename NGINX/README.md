# NGINX

# 🔥 Nginx itself is a self-contained software that can fully fit into a local development environment (e.g. a Mac or a Linux computer) for testing, no Internet is needed and no cloud dependency, which is very different from other cloud based solutions that has feature parity - because those cloud based solutions requires $$$ to run and an Internet connection to work.

NGINX is a fundamental component in system design, acting as an intermediary between clients and backend services. 
It is primarily used for reverse proxying, load balancing, SSL/TLS termination, and caching to ensure high performance, stability, and security.  
NGINX excels in handling high-traffic scenarios using an event-driven, non-blocking architecture.  

Nginx also supports features like HTTP/2, WebSockets, URL rewriting, and rate limiting, which enhance its versatility and performance. 
These capabilities, along with its core strengths, make Nginx a powerful tool for modern web applications

## Tutorials
1. **Nginx in Hindi** : https://www.youtube.com/playlist?list=PLinedj3B30sCbKdDspcuD3T6zFWPXzsNt

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
