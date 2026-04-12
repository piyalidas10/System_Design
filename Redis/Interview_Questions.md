# 🚀 🔥 Top 20 Redis Interview Questions

## 🧠 1. What is Redis?

👉 Redis is an in-memory key-value data store used as:
- Cache
- Database
- Message broker

## ⚡ 2. Why is Redis so fast?
- In-memory (RAM, not disk)
- Single-threaded (no locks)
- Efficient data structures

## 🔑 3. What data types does Redis support?
- String
- List
- Set
- Hash
- Sorted Set (ZSET)
- Bitmap, HyperLogLog (advanced)

## 🔄 4. What is caching in Redis?

👉 Storing frequently accessed data in Redis to reduce DB calls.

## 🧯 5. What is cache invalidation?

👉 Removing/updating stale data from cache
Types:
- TTL (expiry)
- Write-through
- Write-back
- Cache-aside

## 🔁 6. What is Cache Aside Pattern?

👉 Most common:
```
App → Redis → DB
```
- Check cache
- If miss → fetch DB → update cache

## 💾 7. Does Redis persist data?

👉 Yes (optional):
- RDB (snapshot)
- AOF (append-only log)

## 🆚 8. Difference between RDB vs AOF?
| Feature   | RDB      | AOF             |
| --------- | -------- | --------------- |
| Speed     | Fast     | Slower          |
| Data Loss | Possible | Minimal         |
| Use Case  | Backup   | High durability |

## ⚙️ 9. What is Redis eviction policy?

👉 When memory is full:
- LRU (Least Recently Used)
- LFU (Least Frequently Used)
- TTL-based eviction

## 🚦 10. What is Redis TTL?

👉 Time-to-live → auto delete key after time
```
SET key value EX 60
```

## 🔒 11. How does Redis handle concurrency?

👉 Single-threaded event loop
- → No race conditions
- → High performance

## 📡 12. What is Redis Pub/Sub?

👉 Messaging system:
- Publisher sends message
- Subscribers receive instantly

## 📬 13. What is Redis used for queues?

👉 Using List:
- LPUSH queue job
- RPOP queue

## 📊 14. What is Sorted Set (ZSET)?

👉 Stores data with score → used for:
- Leaderboards
- Ranking systems

## 🌐 15. What is Redis Cluster?

👉 Distributed Redis:
- Data sharding
- Horizontal scaling

## 🔁 16. What is replication in Redis?

👉 Master → Replica
- Read scaling
- High availability

## ⚠️ 17. What happens if Redis crashes?
- Cache lost (if no persistence)
- Fallback to DB (important design)

## 🧠 18. What is rate limiting in Redis?

👉 Control API usage:
```
IP → count requests → block if exceeded
```

## 🔥 19. Redis vs Memcached?
| Feature     | Redis | Memcached   |
| ----------- | ----- | ----------- |
| Data Types  | Rich  | String only |
| Persistence | Yes   | No          |
| Use Cases   | Many  | Cache only  |

## 🏗️ 20. Where do you use Redis in system design?

👉 Typical architecture:
```
Client → API → Redis → Database
```
Use for:
- Caching
- Sessions
- Rate limiting
- Real-time systems