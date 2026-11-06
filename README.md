## System Design Tutorials
1. System Design in Hindi : https://www.youtube.com/playlist?list=PLxCzCOWd7aiHanm1nA5_fMwbx5dCNFkDX
2. System Design & API Placement Series (Hindi) : https://www.youtube.com/playlist?list=PL2Jn4_RetiGSCFUPMU3MHOW5WgtXALwKq
3. System Design Complete Course | All Important Concepts Explained (Hindi) : https://www.youtube.com/watch?v=5ozClNjO44A
4. System Design for Beginners (2026) : https://www.youtube.com/watch?v=SE2KF-vxvS0
5. System Design : https://www.youtube.com/playlist?list=PLFdAYMIVJQHOWJgRrjv_RH-ng95B2h3ON
6. System Design was HARD until I Learned these 30 Concepts : https://www.youtube.com/watch?v=s9Qh9fWeOAk
7. System Design for Beginners : https://www.youtube.com/watch?v=lFeYU31TnQ8
8. System Design Explained: APIs, Databases, Caching, CDNs, Load Balancing & Production Infra : https://www.youtube.com/watch?v=oYxTTirKY8M

## System Design Concepts – Summary Table

| Concept                 | Meaning                                                       | Problem it solves                      |
| ----------------------- | ------------------------------------------------------------- | -------------------------------------- |
| Monolithic Architecture | Application deployed as one unit                              | Simple initial deployment              |
| Database Indexing       | Efficient data lookup using indexes                           | Slow database queries                  |
| Environment Separation  | Isolating Dev, Staging, and Production environments           | Configuration and deployment mistakes  |
| Secrets Management      | Secure credential handling                                    | Exposed credentials                    |
| Monitoring              | Observing application health and performance                  | Undetected failures                    |
| Database Separation     | Separating the database from the application server           | Resource contention                    |
| Connection Pooling      | Reusing existing database connections                         | Too many database connections          |
| Vertical Scaling        | Increasing machine resources (CPU, RAM)                       | Capacity limitations                   |
| Horizontal Scaling      | Adding more machines or instances                             | Increased application capacity         |
| Load Balancer           | Distributing incoming traffic across servers                  | Uneven server load                     |
| Stateless Architecture  | No dependence on local server session state                   | Requests going to different servers    |
| JWT                     | Signed token containing claims                                | Distributed authentication             |
| Redis Sessions          | Centralized session storage                                   | Shared session state                   |
| Read Replicas           | Replicating data to handle read queries                       | Primary database read load             |
| Replication Lag         | Delay in replica synchronization                              | Stale reads                            |
| CAP Theorem             | Consistency/Availability trade-off during a network partition | Distributed system design              |
| Redis Caching           | Storing frequently accessed data in memory                    | Repeated database queries              |
| TTL (Time To Live)      | Automatic cache expiry after a defined period                 | Stale cached data                      |
| Write-through Caching   | Updating the database and cache during writes                 | Cache freshness                        |
| Cache-aside             | Loading data into cache on cache misses                       | Efficient lazy caching                 |
| CDN                     | Distributed content delivery network                          | Static content latency and origin load |
| Message Queue           | Storing messages for asynchronous processing                  | Slow background operations             |
| Kafka                   | Distributed event-streaming platform                          | High-throughput event processing       |
| RabbitMQ                | Message broker supporting queues and routing                  | Task routing and processing            |
| Amazon SQS              | Fully managed cloud message queue                             | Asynchronous cloud processing          |
| Idempotency             | Repeated logical requests produce one intended effect         | Duplicate operations                   |

## Important relationships to understand

| Problem                                             | Solution                                      |
| --------------------------------------------------- | --------------------------------------------- |
| Application cannot handle increasing traffic        | Horizontal scaling + Load Balancer            |
| Database receives too many read queries             | Read Replicas + Redis Caching                 |
| Database receives too many connections              | Connection Pooling                            |
| Users lose sessions across multiple servers         | Stateless Architecture + JWT / Redis Sessions |
| Background tasks slow down API responses            | Message Queue                                 |
| Frequently accessed data causes repeated DB queries | Redis Caching                                 |
| Static files load slowly worldwide                  | CDN                                           |
| Duplicate payment or order requests                 | Idempotency                                   |
| Replica returns outdated information                | Replication Lag handling                      |

This table gives you a useful progression from a simple monolithic application toward a scalable, distributed production architecture.

## Main topics covered
1. [Client–Server Architecture](Client%20Server%20Model/README.md)
- Clients (browser/mobile apps) send requests to servers.
- Servers process requests and return responses.
2. [DNS](DNS/README.md), IP Addresses, [Proxies](ForwardProxy_vs_ReverseProxy/README.md)
- DNS maps domain names to IP addresses.
- Proxy and reverse proxy servers act as intermediaries.
3. Latency & Global Deployment
- Physical distance affects response time.
- Multiple data centers reduce latency.
4. [HTTP](HTTP%201%20Vs%20HTTP%2011%20Vs%20HTTP2%20Vs%20HTTP3/README.md), [HTTPS](SSL_Certificate_Works.md) & [APIs](API%20Design/README.md)
- HTTP request/response model.
- HTTPS adds SSL/TLS encryption.
- APIs expose server functionality to clients.
5. [REST vs GraphQL](REST,%20SOAP,%20GraphQL,%20gRPC%20&%20WebSockets/README.md)
- REST uses resources and HTTP verbs.
- GraphQL ([notes](API/GraphQL.md)) allows clients to fetch exactly the data they need.
6. [SQL vs NoSQL Databases](Database/README.md)
- SQL: structured data, ACID properties, strong consistency.
- NoSQL: scalability and schema flexibility.
7. [Scaling](Scaling_Horizontal_Vertical/README.md)
- Vertical Scaling (Scale Up)
- Horizontal Scaling (Scale Out)
- [Load Balancers](Load%20Balancer/Advanced%20Load%20Balancer%20Concepts.md) distribute traffic.
8. Database Optimization
- [Indexing](Indexing/README.md)
  - [DB indexing notes](Database/DB_Indexing.md)
  - B-Tree indexes: nodes, keys, splitting and key promotion ([Order 4 B-Tree](Binary%20Tree/B-Tree-Order-4.md))
  - Building an Order 4 B-Tree step by step for a banking `customer_id` index ([Banking application — Customer ID index](Database/Banking%20application%20—%20Customer%20ID%20index.md))
- [Replication](Replication/README.md) ([Read replicas](Database_Replicas/README.md))
- [Sharding](Database_Sharding/README.md)
- Vertical Partitioning
- [Caching](Caching%20&%20Caching%20Strategies/caching_system_design_study_notes.md) (Cache-Aside Pattern)
9. Data Modeling
- Normalization
- Denormalization for read-heavy systems.
10. [Distributed Systems](Distributed%20System/Readme.md)
- [CAP Theorem](CAP_Theorem/README.md)
- Consistency vs Availability trade-offs.
11. Storage & Content Delivery
- [Blob Storage](Distributed%20Blob%20Store/README.md) (e.g., Amazon S3)
- [CDN](CDN/README.md) (Content Delivery Network) for faster content delivery.
12. Real-Time Communication
- [WebSockets](WebSockets%20vs%20Polling%20vs%20Server%20Sent%20Events/README.md)
- [Webhooks](Webhooks_WebSocket_PubSub_Polling.pdf)
13. Microservices
- [Independent services](Monolith%20vs%20Microservices/README.md) with their own databases ([SOA & Microservices](SOA%20&%20Microservices/README.md)).
- Communication via APIs and [message queues](Message%20Queue/README.md).
14. System Protection & Reliability
- [Message Queues](Message%20Queue/README.md)
- [Rate Limiting](Rate_Limiter/Rate_Limiter_Final_Architecture.md)
- [API Gateway](API%20Gateway/README.md)
- Idempotency

### System Design

<details>
<summary><strong>30 Essential System Design Concepts: </strong></summary>

  -  Networking + Protocols teach you how clients and servers talk.
  -  Databases & Scaling help systems handle big loads and data.
  -  Delivery & Messaging make apps responsive and real-time.
  -  Architectural & Resilience Patterns ensure systems are reliable and maintainable.

**Core Networking & Protocols**
  -  Client-Server Architecture – Clients send requests, servers respond; foundational for web apps.
  -  DNS (Domain Name System) – Converts domain names to IP addresses.
  -  Proxy & Reverse Proxy – Intermediaries for routing, caching, security.
  -  Latency & Data Centers – Physical distance affects response time; use global data centers to reduce delays.
  -  HTTP/HTTPS Protocols – Communication standards between client and server; HTTPS adds security.
  -  APIs (REST & GraphQL) – Interfaces for structured communication; REST is simple and stateless, GraphQL lets clients request exactly the needed data.

**Databases & Storage**
  -  Databases (SQL vs NoSQL) – SQL for structured data and strong consistency, NoSQL for flexibility and high scale.
  -  Vertical Scaling – Improve capacity by enhancing a single server’s resources (CPU, RAM).
  -  Horizontal Scaling – Add more servers to share load; reliable and scalable.
  -  Load Balancers – Distribute incoming traffic across servers using algorithms like round-robin or least connections.
  -  Indexing – Speed up database reads at cost of slower writes.
  -  Replication – Copy data across multiple servers to improve read performance and availability.

**Advanced Data Techniques**
  -  Sharding – Split databases horizontally to handle large data volumes efficiently.
  -  Vertical Partitioning – Split database tables by columns to optimize queries.
  -  Caching – Store frequently accessed data in memory to reduce database load and speed up responses.
  -  Denormalization – Combine related data into fewer tables to speed reads (trade-off with storage/updates).
  -  CAP Theorem – In distributed systems, you can pick only two: Consistency, Availability, Partition tolerance.
  -  Blob Storage (e.g., AWS S3) – Store large unstructured files like images/videos.

**Delivery & Communication**
  -  CDNs (Content Delivery Networks) – Cache static assets globally to reduce latency.
  -  WebSockets – Enable persistent two-way real-time communication.
  -  Webhooks – Allow servers to notify other systems of events without polling.
  -  Microservices Architecture – Break systems into independent services for better scalability and deployment.
  -  Message Queues – Async communication between services to decouple work (producers/consumers).
  -  Rate Limiting – Control request rates per client/IP to prevent abuse.

**API & Reliability Patterns**
  -  API Gateway – Centralized entry for microservices, handles auth, routing, rate limiting, metrics.
  -  Idempotency – Ensure repeated API requests produce the same outcome (critical for safe operations like payments).
  -  Session Management / Cookies – Track user sessions securely across requests (covered within API practices).
  -  Authentication & Authorization – Confirm identity and access rights in systems (often paired with gateways).
  -  Observability (Tracing, Metrics) – Track system health, performance, and bottlenecks (mentioned across summaries).
  -  Resilience Patterns (Retries, Circuit Breakers) – Improve reliability by handling failures gracefully.
</details>

<details>
<summary><strong>System Design Key Concepts: </strong></summary>

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
</details>

<details>
<summary><strong>System Design Architectural Patterns: </strong></summary>

1. Event-Driven Architecture: https://lnkd.in/dp8CPvey 
2. Client-Server Architecture: https://lnkd.in/dAARQYzq
3. Serverless Architecture: https://lnkd.in/gQNAXKkb
4. Microservices Architecture: https://lnkd.in/gFXUrz_T
</details>

<details>
<summary><strong>Machine Coding Round and Low Level Design Problems: </strong></summary>

1. Design a Parking Lot: https://lnkd.in/dQaAuFd2
2. Design Splitwise: https://lnkd.in/dF5fBnex
3. Design Chess Validator: https://lnkd.in/dfAQHvN4
4. Design a Distributed Queue | Kafka: https://lnkd.in/dQ6_B4_M
5. Design Tic-Tac-Toe: https://lnkd.in/dFDApUBt
</details>
  
<details>
<summary><strong>System Design and Architecture (HLD): </strong></summary>

1. Design a Unique ID Generator Service
2. Design bit.ly | Design a URL Shortening Service
3. Design Whatsapp | Design a Chat Service
4. Design Instagram/Twitter News Feed
5. Design Search Autocomplete | Design Typeahead
6. Design Zomato Restaurant Search | Design Proximity Service
</details>

| **Env** | **Full Form**                | **Main Purpose**                                                       | **Who Uses It**       | **Type of Testing**               | **Code Stability**                  | **Typical Tools / Examples**                 |
| ------- | ---------------------------- | ---------------------------------------------------------------------- | --------------------- | --------------------------------- | ----------------------------------- | -------------------------------------------- |
| **DEV** | Development                  | Developers write and test new code; initial verification of features   | Developers            | Unit Testing, Local Integration   | 🔴 Unstable (frequent code changes) | Local builds, Postman, Jest, JUnit           |
| **ST**  | System Testing               | To verify full system behavior before integration with other apps      | QA Team               | Functional, Regression            | 🟡 Moderate                         | Selenium, Cypress                            |
| **SI**  | System Integration           | To ensure data flow and communication between multiple systems/modules | QA / Integration Team | Integration Testing               | 🟡 Moderate                         | Postman, RestAssured, SoapUI                 |
| **AIT** | Automated Integrated Testing | Automated validation of integrated services after each deployment      | CI/CD, QA Automation  | Automated Integration, Smoke      | 🟢 Fairly Stable                    | Jenkins, GitHub Actions, Cypress, Playwright |
| **SIT** | System Integration Testing   | Full end-to-end integration across all components + 3rd party systems  | QA, DevOps            | End-to-End, Interface, Regression | 🟢 Stable                           | Selenium, Postman, Newman                    |
| **UAT** | User Acceptance Testing      | Final validation by business users before go-live                      | Business / Client     | Business Process, Acceptance      | 🟢 Stable / Release-ready           | Manual / Business workflow tools             |



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
| 21   |  What is WWW2 -- https://www2.hm.com/en_in/index.html ? <br/><br/> Turns out, that "2" isn't suspicious at all. It's actually a leftover from the early internet days. Here's what was happening back then: • Too much traffic, not enough servers — In the late 90s/early 2000s, popular sites got more visitors than one server could handle • The solution? Multiple servers — Companies set up www1, www2, www3... each handling a portion of visitors • Like multiple checkout counters — When you visited, a load balancer randomly sent you to an available server • Everyone did this — Yahoo, CNN, Amazon... refresh their page and you'd jump from www3 to www1 without noticing. <br/> Modern sites use CDNs (Content Delivery Networks) that hide all this complexity. They've got hundreds of servers worldwide, but you only see a clean "www" in your address bar.


