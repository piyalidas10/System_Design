# Kafka
Apache Kafka was originally developed at LinkedIn around 2010 to handle high-volume data ingestion, activity tracking, and system monitoring.
Apache Kafka is not just a message broker. It was initially designed and implemented by LinkedIn in order to serve as a message queue. Since 2011, Kafka has been open sourced and quickly evolved into a distributed streaming platform, which is used for the implementation of real-time data pipelines and streaming applications.

Apache Kafka is an open-source software platform written in Scala and Java, mainly used for stream processing.

**The use cases of Apache Kafka are:**
- Messaging
- Website Activity Tracking
- Metrics
- Log Aggregation
- Stream Processing
- Event Sourcing
- Commit Log

**Key Reasons for Using Kafka:**
- Real-time Data Processing: Kafka allows systems to publish, subscribe, and process data streams instantly, crucial for analytics, monitoring, and fraud detection.
- High Throughput & Scalability: Designed to handle trillions of events daily, it scales out by adding more machines to process massive data streams in parallel.
- Reliability & Fault Tolerance: Kafka replicates data across multiple servers, ensuring data safety and system availability even if nodes fail.
- Decoupling Systems (Integration): It serves as a central broker, allowing disparate producers (data creators) and consumers (data users) to interact independently, simplifying complex architectures.
- Data Replayability: Because Kafka stores data in a distributed log, it allows multiple, independent applications to read the same data at their own pace or replay past data.

**Key Concepts and Capabilities:**
- Publish & Subscribe: Acts as a messaging system, allowing applications to send and receive streams of records.
- Storage: Persists data in a distributed, durable, and fault-tolerant manner.
- Stream Processing: Enables real-time processing of data streams via the Kafka Streams API.
- Connectors: Connects to external systems (e.g., databases, search indexes) using pre-built connectors.
- Architecture: Organizes data into topics, which are partitioned across multiple nodes (brokers) to provide scalability and high performance. 

**Common Use Cases:**
- Real-time Data Pipelines: Moving data between systems reliably.
- Event-Driven Applications: Triggering actions based on events.
- Log Aggregation: Collecting and processing log files from multiple servers.
- Real-time Analytics: Analyzing data as it is generated. 

Kafka was originally developed at LinkedIn to handle high-volume data feeds and has become a standard tool in manufacturing, banking, and telecommunications for handling real-time data streaming.

## Tutorials
1. Apache Kafka : https://kafka.apache.org/
2. Apache Kafka Crash Course | What is Kafka? : https://www.youtube.com/watch?v=ZJJHm_bd9Zo
