# Redis is extremely useful for a URL shortener
edis is extremely useful for a URL shortener, because the redirect path is usually read-heavy.

The key idea is:

Database = source of truth
Redis = ultra-fast cache for redirects

## Why Redis helps

**Without Redis:**
```
User
  │
  │ GET /aB91xK
  ▼
Load Balancer
  │
  ▼
Application
  │
  ▼
Database ❌
  │
  ▼
https://example.com/products/iphone
```
If you have millions of redirects, the database becomes the bottleneck.

**With Redis:**
```
                         ┌──────────────┐
                         │    Redis     │
                         │              │
GET /aB91xK              │ aB91xK → URL │
      │                  └──────┬───────┘
      ▼                         │
Load Balancer                   │ HIT
      │                         ▼
      ▼                    Return URL
Application
      │
      │ MISS
      ▼
   Database
      │
      ▼
   Store in Redis
```

## Typical request flow

Suppose the user requests:
```
GET https://short.ly/aB91xK
```
Application first checks Redis:
```
GET aB91xK
```
If Redis returns:
```
https://example.com/products/iphone
```
the application immediately redirects:
```
HTTP/1.1 301/302
Location: https://example.com/products/iphone
```
No database query is required.

## What happens on a cache miss?

Suppose aB91xK isn't in Redis:
```
Application
    │
    │ GET aB91xK
    ▼
 Redis
    │
    │ MISS
    ▼
 Database
    │
    │ aB91xK → long URL
    ▼
Application
    │
    ├──── SET aB91xK → long URL ──► Redis
    │
    ▼
302 Redirect
```
The next request becomes a Redis hit.

This is called cache-aside / lazy loading.

## Why Redis is particularly good here

URL-shortener traffic has a very favorable access pattern:
```
READS  ████████████████████████████████████
WRITES █
```
For example:
```
100 million redirects/day
        ↓
Most are GET operations
        ↓
Most popular short URLs are repeatedly requested
        ↓
Keep mappings in Redis
        ↓
Database receives far fewer reads
```

## Redis provides:

⚡ Very low-latency key/value lookup  
📈 High read throughput  
🔥 Excellent handling of hot URLs  
🧠 TTL support  
🔄 Replication  
🧩 Redis Cluster for horizontal scaling  

But don't put everything only in Redis

## A common production architecture is:
```
                 ┌───────────────┐
                 │ Load Balancer │
                 └───────┬───────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         App Server 1          App Server N
              │                     │
              └──────────┬──────────┘
                         ▼
                 ┌──────────────┐
                 │    Redis     │
                 │   Cluster    │
                 └──────┬───────┘
                        │ MISS
                        ▼
                 ┌──────────────┐
                 │   Database   │
                 │ Source Truth │
                 └──────────────┘
```

**The database remains the permanent storage:**
```
short_id       long_url
────────       ─────────────────────────────
aB91xK         https://example.com/products/iphone
X7kP2m         https://amazon.com/...
9Qa31Z         https://youtube.com/watch?v=...
```

**Redis contains the frequently accessed mappings:**
```
aB91xK → https://example.com/products/iphone
X7kP2m → https://amazon.com/...
```
So the database doesn't need to handle every redirect.

## One important optimization

For a very large system, you can also put a CDN/edge cache in front of the application:
```
User
 │
 ▼
CDN / Edge
 │
 │ cache HIT
 ├──────────────────────► Redirect
 │
 │ cache MISS
 ▼
Load Balancer
 │
 ▼
Application
 │
 ▼
Redis
 │
 │ MISS
 ▼
Database
```

**Then the hierarchy becomes:**
```
CDN → Redis → Database
```
This is how you can make a URL shortener capable of handling millions or even billions of redirect requests without making the database the bottleneck.

