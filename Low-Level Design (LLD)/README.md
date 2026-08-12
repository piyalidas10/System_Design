# Low-Level Design (LLD)
Designed the Low-Level Design (LLD) of a scalable, event-driven real-time stock trading platform using Microservices, Apache Kafka, Redis Pub/Sub, InfluxDB, and WebSockets.

## Why is an SSE connection not recommended for extracting stock exchange data?
Ans. SSE is one-directional (server → client only) and works over plain HTTP, so it can’t handle things like subscribe/unsubscribe requests 
or acks on the same connection, and it doesn’t support binary frames efficiently. Stock exchange feeds are high-frequency and need low-latency, 
two-way communication — so WebSockets are a much better fit than SSE here.
