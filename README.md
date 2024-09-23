### System Design

| No. | Questions                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   |  What is System Design? <br><br> - A systematic approach to building and scaling software systems that meet specific requirements and constraints.
<br><br>- Involves making high-level architectural choices about components, interactions, data storage, and technologies. <br><br> - Aims to create systems that are scalable, reliable, maintainable, and performant.
| 2   |  The System Design Process : <br><br> 1. Requirement Gathering <br> 2. High-Level Design <br> 3. Low-Level Design <br> 4. Implementation <br> 5. Testing and Deployment <br> 6. Maintenance
| 3   |  Tools and Technologies : <br><br> 1. Databases - Relational (MySQL, PostgreSQL), NoSQL (MongoDB, Cassandra), graph (Neo4j), etc. <br> 2. Caching - Redis, Memcached, Varnish. <br> 3. Message Queues - RabbitMQ, Kafka, Amazon SQS. <br> 4. Load Balancers - HAProxy, NGINX, AWS ELB. <br> 5. Container Orchestration - Kubernetes, Docker Swarm. <br> 6. Monitoring - Prometheus, Grafana, Datadog. <br> 7. Infrastructure as Code (IaC) - Terraform, CloudFormation.
| 4   |  Scalability : <br><br> The ability to handle increasing traffic and data volumes. <br> a. Horizontal Scaling - Adding more machines. <br> b. Vertical Scaling - Increasing resources on existing machines. <br> c. Stateless Design - Making components stateless for easier scaling. <br> d. Caching - Storing frequently accessed data in memory. <br> e. Load Balancing - Distributing traffic across multiple servers.
| 5   |  Reliability : <br><br> The ability to function correctly in the face of failures. <br> a. Redundancy <br> b. Fault Tolerance <br> c. Monitoring
| 6   |  Performance : <br><br> Minimizing latency, maximizing throughput, and optimizing resource utilization. <br> a. Efficient Algorithms <br> b. Caching <br> c. Asynchronous Processing
| 7   |  Security : <br><br> Protecting the system and data from unauthorized access and threats. <br> a. Authentication <br> b. Authorization <br> c. Encryption <br> d. Input Validation
