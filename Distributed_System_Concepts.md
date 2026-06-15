# Distributed System Concepts
This infographic summarizes 12 core distributed-system and backend architecture concepts that every software engineer should understand.

## 1. Load Balancing

Distributes incoming requests across multiple servers.
```
1 Million Users
       │
       ▼
Load Balancer
   ┌───┼───┐
   ▼   ▼   ▼
App1 App2 App3
```

**Why?**
- Prevents one server from being overloaded
- Improves availability
- Enables horizontal scaling

**Examples**
- NGINX
- HAProxy
- AWS Elastic Load Balancer
- Azure Load Balancer

## 2. Caching

Stores frequently accessed data in memory for faster retrieval.   
**Real-time Example: Product Details Page**   

**Used By**
- Amazon
- Netflix
- Facebook
- Instagram

**Cached Data**
- Product details
- User profile
- Dashboard data
- Session information

**Benefits**
- Reduces database load
- Improves response time
- Lowers infrastructure costs

**Examples**
- Redis
- Memcached

**Typical Flow**
```
Request
   ↓
Cache Hit? ── Yes → Return Data
   ↓ No
Database → Store in Cache → Return Data
```

## 3. Content Delivery Network (CDN)

Distributes static content across geographically distributed edge servers.   
**Real-time Example: Netflix**   

A movie poster is requested from India.

Without CDN:
```
India User
     ↓
US Server
```
High latency

With CDN:
```
India User
     ↓
Mumbai Edge Server
```
**Used For**
- Images
- Videos
- CSS
- JS bundles

**Benefits**
- Lower latency
- Faster page loads
- Reduced load on origin servers

**Examples**
- Cloudflare
- Akamai
- AWS CloudFront

## 4. Message Queue

Allows asynchronous communication between services.   
**Real-time Example: Order Processing**

**When user places an order:**
```
Order Service
      ↓
 RabbitMQ
      ↓
 Email Service
 Inventory Service
 Billing Service
```
Order API returns immediately. Background jobs process later.

**Used By**
- Uber
- Swiggy
- Zomato
- Amazon

**Benefits**
- Decouples systems
- Handles traffic spikes
- Improves reliability

**Examples**
- RabbitMQ
- Amazon SQS
- Apache ActiveMQ

**Flow**
```
Producer → Queue → Consumer
```

## 5. Publish-Subscribe (Pub/Sub)

One producer publishes messages; multiple subscribers receive them.   
**Real-time Example: Food Delivery Tracking**

**Order Status Changed:**
```
Order Service
      ↓
 Kafka Topic
      ↓
 Driver App
 Customer App
 Analytics
 Notification Service
```
One event triggers multiple consumers.

**Used By**
- Uber
- Swiggy
- Netflix
- LinkedIn

**Benefits**
- Event-driven architecture
- Multiple consumers
- Loose coupling

**Examples**
- Redis Pub/Sub
- Apache Kafka
- Google Pub/Sub

**Flow**
```
Publisher
    ↓
   Topic
 ↙  ↓  ↘
S1  S2  S3
```

## 6. API Gateway

Single entry point for all client requests.   
**Real-time Example: Banking App**

**User Login Request**
```
Mobile App
     ↓
API Gateway
     ↓
Auth Service
Account Service
Payment Service
```

**Gateway handles:**
- Authentication
- Routing
- Logging
- Rate limiting

**Used By**
- PayPal
- Razorpay
- Stripe

**Responsibilities**
- Authentication
- Routing
- Rate limiting
- Logging
- Request transformation

**Examples**
- Kong
- Apigee
- AWS API Gateway

## 7. Circuit Breaker

Stops calling a failing service temporarily.   
**Real-time Example: Payment Failure**
```
Order Service
      ↓
Payment Service
```
Payment Service becomes slow.

**Without Circuit Breaker:**
```
Threads keep waiting
Entire system hangs
```
**With Circuit Breaker:**
```
Failure threshold reached
Circuit Open
Stop sending requests
Return fallback response
```

**Used By**
- Netflix
- Banking Systems
- Microservices
- Technologies

**States**
- Closed → Normal operation
- Open → Requests blocked
- Half-Open → Test recovery

**Benefits**
- Prevents cascading failures
- Improves resilience

**Popular Libraries**
- Resilience4j
- Hystrix (legacy)

## 8. Service Discovery

Helps services locate each other dynamically.   
**Real-time Example: Kubernetes**

**Pods continuously start and stop.**
```
Payment Pod
10.0.1.1

Restart

Payment Pod
10.0.2.5
```
Hardcoding IPs impossible.

**Service Registry:**
```
Payment Service
       ↓
Kubernetes DNS
       ↓
Current Pod IP
```
**Used By**
- Kubernetes
- Netflix
- Uber

**Why Needed?**  
In cloud environments, service IPs change frequently.

**Examples**
- Consul
- Eureka
- Kubernetes Service Discovery

**Flow**
```
Provider registers
      ↓
 Registry
      ↓
Consumer discovers service
```

## 9. Sharding

Splits large datasets across multiple databases.   
**Real-time Example: Facebook Users**

**Benefits**
- Handles massive data volumes
- Improves scalability
- Reduces database bottlenecks

**Example**
Single DB:
```
1 Billion Users
      ↓
One Database
```
Performance issues.   
Sharded:
```
User ID 1-1000 → DB1
User ID 1001-2000 → DB2
User ID 2001-3000 → DB3
```

**Used By**
- Facebook
- Instagram
- Twitter

**Types**
- Range-based
- Hash-based
- Geographic

## 10. Rate Limiting

Restricts how many requests a client can make.   
**Real-time Example: Login API**

**Attacker sends:**
```
10000 requests/sec
```
**Rate Limiter:**
```
Allowed: 5 req/sec
Blocked: Remaining requests
```

**Used By**
- Banking APIs
- Public APIs
- Payment Gateways

**Benefits**
- Prevents abuse
- Protects APIs
- Controls traffic spikes

**Algorithms**
- Token Bucket
- Leaky Bucket
- Fixed Window
- Sliding Window

## 11. Consistent Hashing

Distributes data across nodes while minimizing data movement when nodes are added or removed.   
**Real-time Example: Redis Cluster**

Without Consistent Hashing:
```
4 Cache Nodes
```
Add 5th node:
```
All keys move
Cache invalidated
```
With Consistent Hashing:
```
Only small subset moves
```

**Used In**
- Distributed caches
- Load balancing
- Distributed databases

**Examples**
- Cassandra
- DynamoDB
- Redis Cluster

## 12. Auto Scaling

Automatically increases or decreases resources based on demand.   
**Real-time Example: IPL Ticket Booking**

Normal:
```
2 Servers
```
Traffic Spike:
```
100,000 Users
```
Auto Scaling:
```
2 Servers
 ↓
10 Servers
 ↓
25 Servers
```
Traffic decreases:
```
25 Servers
 ↓
2 Servers
```

**Used By**
- Netflix
- Amazon
- Hotstar

**Metrics**
- CPU usage
- Memory usage
- Request count
- Queue length

**Benefits**
- Cost optimization
- High availability
- Elastic scalability

## Complete E-Commerce Architecture
```
                    CDN
                     │
                     ▼
Users
 │
 ▼
Load Balancer
 │
 ▼
API Gateway
 │
 ├───────────── Rate Limiter
 │
 ▼
Microservices
 │
 ├── Product Service
 │      │
 │      ▼
 │    Redis Cache
 │
 ├── Order Service
 │      │
 │      ▼
 │   RabbitMQ
 │      │
 │      ▼
 │ Email Service
 │ Inventory Service
 │
 ├── Kafka Events
 │      │
 │      ├─ Analytics
 │      ├─ Notifications
 │      └─ Recommendation Engine
 │
 ├── Circuit Breaker
 │
 ├── Service Discovery
 │
 ▼
Sharded Databases
 │
 ▼
Consistent Hashing
 │
 ▼
Redis Cluster

Infrastructure
      │
      ▼
Auto Scaling Group
```

## How These Concepts Work Together in a Modern Banking/E-commerce Application
```
Users
  ↓
Load Balancer
  ↓
API Gateway
  ↓
Microservices
  ├── Cache (Redis)
  ├── Message Queue (RabbitMQ)
  ├── Pub/Sub (Kafka)
  ├── Service Discovery
  └── Circuit Breaker
          ↓
      Databases
          ↓
       Sharding

CDN → Static Assets
Rate Limiting → API Protection
Auto Scaling → Infrastructure Growth
Consistent Hashing → Cache/Data Distribution
```
