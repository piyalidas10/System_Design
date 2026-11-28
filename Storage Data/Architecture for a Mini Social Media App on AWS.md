# Architecture for a Mini Social Media App on AWS

![AWS production architecture](imgs/AWS%20production%20architecture.png)

This document explains, step by step, how a mini social media application can be built on AWS, starting from the network and growing into storage, media processing, analytics, delivery and security.

---

## 1. Networking Foundation

**VPC with Public and Private Subnets**

- Start by deploying your own **Virtual Private Cloud (VPC)** on AWS.
- Create a **public subnet** (internet-facing resources such as the load balancer and web tier) and a **private subnet** (application servers and databases).

---

## 2. Web Tier

| Component | Purpose |
|---|---|
| **EC2 (2 VMs)** | Web servers serving the application front end |
| **Auto Scaling** | Adds or removes web servers depending on traffic |
| **Elastic Load Balancer (ELB)** | Distributes incoming requests across the web servers |
| **Route 53 (DNS)** | Connects the load balancer to a domain name so users can reach the app by name instead of IP |

Flow: `User -> Route 53 -> ELB -> EC2 web servers (Auto Scaling)`

---

## 3. Application Tier

- Spin up another **2 EC2 VMs** for the application tier.
- Add **Auto Scaling** so the tier can grow when you add more pages or functionality to the web tier.
- Keeping the app tier separate from the web tier lets each scale independently.

---

## 4. Databases and Caching

| Service | Type | Role in the app |
|---|---|---|
| **Amazon RDS (e.g. MySQL)** | Relational DB | Stores structured user data (accounts, profiles, relationships) |
| **Amazon DynamoDB** | NoSQL DB | Handles fast-growing content metadata (videos, pictures, posts) |
| **Amazon ElastiCache** | In-memory cache | Keeps frequently accessed data in front of RDS to reduce load and latency |

Both databases are connected to the application servers.

---

## 5. Media Storage and Processing

### 5.1 Object storage (S3)

- Add **Amazon S3** as external file storage so users can view and access their uploaded videos and pictures.

### 5.2 Content filter (Rekognition)

- Place **Amazon Rekognition** between the web server and S3 to filter disallowed content such as nudity before it is stored or shown.

### 5.3 Video conversion (Lambda)

- Duplicate the storage into two buckets: one for **web browsers** and one for **mobile devices**.
- Put a **Lambda** function running video converter code between them so uploaded videos are converted into formats suited to each device type.

```
Upload -> Web server -> Rekognition (filter) -> S3 (original)
                                                   |
                                          Lambda (video converter)
                                                   |
                                      S3 (web)  /  S3 (mobile)
```

---

## 6. Clickstream Analytics and Data Platform

### 6.1 Clickstream capture

- Deploy **Amazon Kinesis** to capture user click actions.
- Use this data to monitor behaviour and generate suggestions based on trends, content users like to view, comment on and post. The insights are used to improve the app.

### 6.2 Storage for clickstream data

- Store the raw clickstream data in **S3**.

### 6.3 Big data processing

- Connect **EMR** (Spark / Hadoop) for data operations such as sorting and large-scale transformation.
- Connect **AWS Glue** (ETL: extract, transform, load) to push data from DynamoDB to EMR and to maintain a **data catalog**.

### 6.4 Data warehouse and BI

- Deploy **Amazon Redshift** as a data warehouse to analyze the results coming from EMR.
- Connect **Amazon Athena** for interactive SQL queries.
- Connect **Amazon QuickSight** as the Business Intelligence tool to visualize the data.

```
Kinesis -> S3 -> EMR (Spark/Hadoop) -> Redshift -> Athena / QuickSight
                   ^
        DynamoDB -> Glue (ETL + catalog)
```

---

## 7. Content Delivery

- Connect **Amazon CloudFront** (CDN) with **Edge Locations** to the storage.
- Content is cached close to users, which:
  - reduces latency,
  - reduces load on the main storage,
  - reduces **egress charges**.

---

## 8. Messaging and Notifications

| Service | Use |
|---|---|
| **Amazon SNS** | SMS and mobile push notifications |
| **Amazon SES** | Email notifications |
| **Amazon SQS** | Message queue for exchanging messages between components asynchronously |

---

## 9. Monitoring and Health

- **Amazon CloudWatch**: dashboards and metrics for resource health (storage, EC2 CPU utilization, etc.).
- **Amazon Inspector**: feedback on the health and security posture of the VMs.

---

## 10. Security

| Service | Purpose |
|---|---|
| **IAM** | Authentication and authorization for users and services |
| **KMS** | Encryption of data at rest |
| **ACM** | Manages SSL/TLS certificates for HTTPS |
| **WAF** | Web application firewall protecting against threats from the internet |

---

## 11. Summary of Services

| Layer | AWS services |
|---|---|
| Network | VPC, public/private subnets |
| DNS and load balancing | Route 53, ELB |
| Compute | EC2, Auto Scaling, Lambda |
| Databases | RDS (MySQL), DynamoDB, ElastiCache |
| Storage | S3 |
| Content moderation | Rekognition |
| Analytics | Kinesis, EMR, Glue, Redshift, Athena, QuickSight |
| Delivery | CloudFront |
| Messaging | SNS, SES, SQS |
| Monitoring | CloudWatch, Inspector |
| Security | IAM, KMS, ACM, WAF |
