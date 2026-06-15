# Distributed System Concepts
This infographic summarizes 12 core distributed-system and backend architecture concepts that every software engineer should understand.

## 1. Load Balancing

Distributes incoming requests across multiple servers.

**Why?**

Prevents one server from being overloaded
Improves availability
Enables horizontal scaling

**Examples**
- NGINX
- HAProxy
- AWS Elastic Load Balancer

## 2. Caching

Stores frequently accessed data in memory for faster retrieval.

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

**Benefits**
- Handles massive data volumes
- Improves scalability
- Reduces database bottlenecks

**Example**
```
User ID 1-1000 → DB1
User ID 1001-2000 → DB2
User ID 2001-3000 → DB3
```

## 10. Rate Limiting

Restricts how many requests a client can make.

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

**Metrics**
- CPU usage
- Memory usage
- Request count
- Queue length

**Benefits**
- Cost optimization
- High availability
- Elastic scalability

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
