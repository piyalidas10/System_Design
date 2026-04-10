# Kafka
Apache Kafka was originally developed at LinkedIn around 2010 to handle high-volume data ingestion, activity tracking, and system monitoring.
Apache Kafka is not just a message broker. It was initially designed and implemented by LinkedIn in order to serve as a message queue. Since 2011, Kafka has been open sourced and quickly evolved into a distributed streaming platform, which is used for the implementation of real-time data pipelines and streaming applications.

Apache Kafka is an open-source software platform written in Scala and Java, mainly used for stream processing.

> Queue : 1 Producer 1 Consumer (First in first out)
> PubSub : 1 Producer Multiple Consumers

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

## Core Components of Apache Kafka
- ✅ Inside Kafka topic can have multiple partitions
- ✅ Consumer will be placed inside a group only. One group can have multiple consumers. So, there can have multiple groups with multiple consumers.
- ✅ **1 Partition = 1 Active Consumer (per group)** : Within a single Kafka consumer group, a partition can only be consumed by one consumer at a time.
- ✅ **Idle Consumers**: If consumers > partitions, those extra consumers sit idle. If you have more consumers in a group than partitions (e.g., 2 consumers for 1 partition), the extra consumers will remain idle.
  - ✅ Within a consumer group, at any time a partition can only be consumed by a single consumer. No you can't have 2 consumers within the same group consuming from the same partition at the same time.
  - ✅ if we have a Kafka topic with 4 partitions & one group with one consumer, then 4 partitions will be assigned to that one consumer only of that group
  - ✅ if we have a Kafka topic with 4 partitions & one group with four consumer, then each partition will be assigned to each one consumer only of that group
  - ✅ if we have a Kafka topic with 4 partitions & one group with five consumer, then 4 partitions will be assigned to four consumers of that group and one consumer will be seated ideal.
  - ✅ if we have a Kafka topic with 4 partitions and two groups (1st group with 4 consumers, 2nd group with 1 consumer), then then 4 partitions will be assigned to four consumers of 1st group and also 4 partitions will be assigned to 1 consumer of 2nd group)
- ✅ How to Parallelize: To increase parallelism, you must increase the partition count of the topic, allowing more consumers in the group to receive assignments.
- ✅ **Alternative for Multiple Processing**: If you need multiple applications to read the same partition simultaneously, use different consumer group IDs for each application.
  - ✅ Kafka Consumer groups allow to have multiple consumer "sort of" behave like a single entity. The group as a whole should only consume messages once. If multiple consumer in a group were to consume the same partitions, these records would be processed multiple times. **If you need to consume a partition multiple times, be sure these consumers are in different groups.**


## Create Queue model using Kafka
**👉 Queue : 1 Producer 1 Consumer (First in first out)**

We have a Kafka topic with 4 partitions. If in my application, i need Queue model. Then i will create 1 group with 4 consumers. Then each consumer will consume one partition i.e One-To-One mapping means Queue.

✅ No of Cosumers = No. of Partitions

## Create PubSub model using Kafka
> PubSub : 1 Producer Multiple Consumers

We have a Kafka topic with 4 partitions. If in my application, i need PubSub model. Then i will create multiple groups with 4 or less than 4 consumers. Suppose we have 2 groups (1st group with 4 consumers, 2nd group with 1 consumer), then then 4 partitions will be assigned to four consumers of 1st group and also 4 partitions will be assigned to 1 consumer of 2nd group).



## Tutorials
1. Apache Kafka : https://kafka.apache.org/
2. Apache Kafka Crash Course | What is Kafka? : https://www.youtube.com/watch?v=ZJJHm_bd9Zo
3. Kafka geeksforgeeks : https://www.geeksforgeeks.org/apache-kafka/apache-kafka/
