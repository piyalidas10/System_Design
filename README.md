### System Design

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


