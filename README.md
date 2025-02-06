### System Design

➤ System Design Key Concepts: 

1. Scalability: https://lnkd.in/gpge_z76
2. Latency vs Throughput: https://lnkd.in/g_amhAtN
3. CAP Theorem: https://lnkd.in/g3hmVamx
4. ACID Transactions: https://lnkd.in/gMe2JqaF
5. Rate Limiting: https://lnkd.in/gWsTDR3m
6. API Design: https://lnkd.in/ghYzrr8q
7. Strong vs Eventual Consistency: https://lnkd.in/gJ-uXQXZ
8. Distributed Tracing: https://lnkd.in/d6r5RdXG
9. Synchronous vs. asynchronous communications: https://lnkd.in/gC3F2nvr
10. Batch Processing vs Stream Processing: https://lnkd.in/g4_MzM4s
11. Fault Tolerance: https://lnkd.in/dVJ6n3wA

➤ System Design Building Blocks:

1. Databases: https://lnkd.in/gti8gjpz
2. Horizontal vs Vertical Scaling: https://lnkd.in/gAH2e9du
3. Caching: https://lnkd.in/gC9piQbJ
4. Distributed Caching: https://lnkd.in/g7WKydNg
5. Load Balancing: https://lnkd.in/gQaa8sXK
6. SQL vs NoSQL: https://lnkd.in/g3WC_yxn
7. Database Scaling: https://lnkd.in/gAXpSyWQ
8. Data Replication: https://lnkd.in/gVAJxTpS
9. Data Redundancy: https://lnkd.in/gNN7TF7n
10. Database Sharding: https://lnkd.in/gMqqc6x9
11. Database Index's: https://lnkd.in/gCeshYVt
12. Proxy Server: https://lnkd.in/gi8KnKS6
13. WebSocket: https://lnkd.in/g76Gv2KQ
14. API Gateway: https://lnkd.in/gnsJGJaM
15. Message Queues: https://lnkd.in/gTzY6uk8

➤ System Design Architectural Patterns:

1. Event-Driven Architecture: https://lnkd.in/dp8CPvey 
2. Client-Server Architecture: https://lnkd.in/dAARQYzq
3. Serverless Architecture: https://lnkd.in/gQNAXKkb
4. Microservices Architecture: https://lnkd.in/gFXUrz_T

➤ Machine Coding Round and Low Level Design Problems:

1. Design a Parking Lot: https://lnkd.in/dQaAuFd2
2. Design Splitwise: https://lnkd.in/dF5fBnex
3. Design Chess Validator: https://lnkd.in/dfAQHvN4
4. Design a Distributed Queue | Kafka: https://lnkd.in/dQ6_B4_M
5. Design Tic-Tac-Toe: https://lnkd.in/dFDApUBt

➤ System Design and Architecture (HLD):

1. Design a Unique ID Generator Service
2. Design bit.ly | Design a URL Shortening Service
3. Design Whatsapp | Design a Chat Service
4. Design Instagram/Twitter News Feed
5. Design Search Autocomplete | Design Typeahead
6. Design Zomato Restaurant Search | Design Proximity Service

| No. | Questions & Answers                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   |  What is System Design? <br><br> - A systematic approach to building and scaling software systems that meet specific requirements and constraints. <br><br>- Involves making high-level architectural choices about components, interactions, data storage, and technologies. <br><br> - Aims to create systems that are scalable, reliable, maintainable, and performant.
| 2   |  The System Design Process : <br><br> 1. Requirement Gathering <br> 2. High-Level Design <br> 3. Low-Level Design <br> 4. Implementation <br> 5. Testing and Deployment <br> 6. Maintenance
| 3   |  Tools and Technologies : <br><br> 1. Databases - Relational (MySQL, PostgreSQL), NoSQL (MongoDB, Cassandra), graph (Neo4j), etc. <br> 2. Caching - Redis, Memcached, Varnish. <br> 3. Message Queues - RabbitMQ, Kafka, Amazon SQS. <br> 4. Load Balancers - HAProxy, NGINX, AWS ELB. <br> 5. Container Orchestration - Kubernetes, Docker Swarm. <br> 6. Monitoring - Prometheus, Grafana, Datadog. <br> 7. Infrastructure as Code (IaC) - Terraform, CloudFormation.
| 4   |  Scalability : <br><br> The ability to handle increasing traffic and data volumes. <br> a. Horizontal Scaling - Adding more machines. <br> b. Vertical Scaling - Increasing resources on existing machines. <br> c. Stateless Design - Making components stateless for easier scaling. <br> d. Caching - Storing frequently accessed data in memory. <br> e. Load Balancing - Distributing traffic across multiple servers.
| 5   |  Reliability : <br><br> The ability to function correctly in the face of failures. <br> a. Redundancy <br> b. Fault Tolerance <br> c. Monitoring
| 6   |  Performance : <br><br> Minimizing latency, maximizing throughput, and optimizing resource utilization. <br> a. Efficient Algorithms <br> b. Caching <br> c. Asynchronous Processing
| 7   |  Security : <br><br> Protecting the system and data from unauthorized access and threats. <br> a. Authentication <br> b. Authorization <br> c. Encryption <br> d. Input Validation
| 8   |  Horizontal vs Vertical Partitioning : <br><br> Vertical partitioning splits tables by columns, often separating different features. Horizontal partitioning splits tables by rows, distributing data across multiple servers. Vertical organizes data logically, while horizontal improves scalability + performance.
| 9   |  Apache Kafka : <br><br> Kafka is a distributed streaming platform using a publish-subscribe model. It's fast due to sequential disk I/O, zero-copy principle, and efficient batching of messages.
| 10   |  Rate Limiter : <br><br> JWT is a compact, self-contained token for secure information transmission. OAuth is an authorization framework for delegated access. SAML is an XML-based standard for exchanging authentication and authorization data.
| 11   |  Single Sign-On (SSO) : <br><br> SSO allows users to access multiple applications with one set of credentials. It typically uses a central authentication server and protocols like SAML/OAuth.
| 12   |  Microservices vs Monolithic Architecture : <br><br> Microservices architecture breaks an application into small, independent services. Monolithic architecture is a single, tightly-coupled unit. Microservices offer scalability while monoliths are simpler to develop + deploy.
| 13   |  Reverse Proxy vs Forward Proxy : <br><br> A reverse proxy sits in front of web servers, forwarding client requests to backend servers. A forward proxy sits in front of clients, forwarding their requests to the internet. Reverse proxies are used for load balancing and security, while forward proxies are used for anonymity and filtering.
| 14   |  CAP Theorem : <br><br> The CAP theorem states that a distributed system can only provide two of three guarantees: Consistency, Availability, and Partition tolerance. In practice, partition tolerance is necessary, so systems must choose between consistency and availability during network partitions.
| 15   |  Global Scale System Design : <br><br> Key considerations include data replication, CDN usage, distributed caching, efficient load balancing, and handling data consistency across regions. Latency management, regulatory compliance, and disaster recovery are also crucial for global systems.
| 16   |  Efficient Caching Strategy : <br><br> Implement multi-level caching (browser, CDN, application server, database). Use appropriate cache invalidation strategies (TTL, event-based). Consider cache coherence for distributed systems.
| 17   |  Optimizing performance and scalability in web applications : <br><br> 
| 18   |  Securing frontend implementations (e.g., XSS and CSRF protection) : <br><br> 
| 19   |  What is the idempotency key? <br/><br/> This is used to Avoid Double Payments. Occasionally, we need to retry a payment transaction due to network errors or timeout. For example, as shown in Figure 10, the client tries to make a $10 payment, but the payment keeps failing due to a poor network connection. Considering the network condition might get better, the client retries the request and this payment finally succeeds at the fourth attempt. From an API standpoint, idempotency means clients can make the same call repeatedly and produce the same result. For communication between clients (web and mobile applications) and servers, an idempotency key is usually a unique value that is generated by clients and expires after a certain period of time. A UUID is commonly used as an idempotency key and it is recommended by many tech companies such as Stripe and PayPal. To perform an idempotent payment request, an idempotency key is added to the HTTP header: <idempotency-key: key_value>.  <br/> https://www.youtube.com/watch?v=XAccGbtl3Z8
| 20   |  Service-oriented (SOA) vs Micro service Architecture (MSA)? <br/><br/> https://www.geeksforgeeks.org/difference-between-service-oriented-soa-and-micro-service-architecture-msa/


