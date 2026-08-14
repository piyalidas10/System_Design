# URL Shortener

**System Design - Part 13 | Design a URL Shortener | 2 Methods** : https://www.youtube.com/watch?v=vKAZ16P4kdg

## For example:
```
https://www.example.com/products/electronics/mobile-phones/samsung/galaxy-s25?campaign=summer-sale&user=12345
```
can become:
```
https://short.ly/aB92xK
```
When someone opens the short URL, the system finds the original URL and redirects the user.

## Why do we need URL shortening?

There are several practical reasons:

1. Easy sharing
- Short URLs are much easier to copy, paste, send in messages, emails, etc.
2. Better readability
- Instead of exposing a huge URL with many parameters, users see something compact.
3. Storage optimization
- If an application generates billions of URLs, storing the full URLs can consume significant database/storage capacity.
- The system can store a short identifier such as aB92xK along with the original URL.
4. Faster lookup
- The short key can act as an efficient lookup key:
aB92xK → original_long_url
5. Analytics
- A URL shortener can track:
- Number of clicks
- Geographic location
- Device/browser
- Referrer
- Timestamp
6. Centralized redirect management
- The original URL can change while the short URL remains the same.

## 🏗️ Basic System Design
```
                CREATE SHORT URL
                       │
                       ▼
              ┌─────────────────┐
              │   URL Shortener │
              │     Service     │
              └────────┬────────┘
                       │
             Generate Short ID
                       │
                       ▼
              ┌─────────────────┐
              │    Database     │
              │                 │
              │ aB92xK → Long URL
              └─────────────────┘


                USER CLICKS
              https://s.io/aB92xK
                       │
                       ▼
              ┌─────────────────┐
              │   URL Shortener │
              │     Service     │
              └────────┬────────┘
                       │
                  Lookup aB92xK
                       │
                       ▼
              ┌─────────────────┐
              │    Database     │
              └────────┬────────┘
                       │
                  Original URL
                       │
                       ▼
                 HTTP 301/302
                  Redirect
                       │
                       ▼
                Original Website
```

## Exactly — this is the real system-design problem behind a URL shortener.

A production-grade design can be thought of as:
```
                    ┌─────────────────────┐
                    │       Clients       │
                    │ Browser / Mobile    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    CDN / Edge       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Load Balancer    │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
          ┌──────────┐   ┌──────────┐   ┌──────────┐
          │ URL API  │   │ URL API  │   │ URL API  │
          │ Server 1 │   │ Server 2 │   │ Server N │
          └────┬─────┘   └────┬─────┘   └────┬─────┘
               │              │              │
               └──────────────┼──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │      Redis        │
                    │  Short → Long URL │
                    └─────────┬─────────┘
                              │ Cache Miss
                              ▼
                    ┌────────────────────┐
                    │ Distributed DB     │
                    │                    │
                    │ short_id → URL     │
                    └────────────────────┘
```

## 1. How do we generate unique Short IDs?

**Suppose the original URL is:**
```
https://example.com/products/iphone/iphone-17?campaign=summer
```
**We need something like:**
```
https://sho.rt/aB91xK
```
**The important part is:**
```
aB91xK
Option A — Base62 ID
```

**A very common approach is to use:**
```
0-9
a-z
A-Z
```
That's 62 characters.

**If we generate a numeric ID:**
```
125789432
```
**we convert it to Base62:**
```
125789432
      ↓
aB91xK
```
This gives us a compact identifier.

**How many URLs can 6 characters represent?**
```
62⁶ = 56,800,235,584
```
That's approximately 56.8 billion unique IDs.

For 7 characters:
```
62⁷ = 3.52 trillion
```
So Base62 is extremely useful for URL shorteners.

## 2. But where does the number come from?

This is the important part.

You don't want every server independently doing:
```
1
2
3
4
5
```
because multiple servers could generate the same ID.

Instead, use a distributed ID generator.

One popular design is similar to Snowflake IDs.
```
64-bit ID


┌────────────┬──────────────┬──────────────┬────────────┐
│ Timestamp  │ Machine ID   │ Sequence     │            │
└────────────┴──────────────┴──────────────┴────────────┘
```
For example:
```
Timestamp      = 41 bits
Machine ID     = 10 bits
Sequence       = 12 bits
```
This allows multiple application servers to generate unique IDs without asking a central database every time.

Then:
```
Distributed ID
      ↓
Base62 Encoding
      ↓
Short Code
```
Example:
```
123456789012345
       ↓
     Base62
       ↓
    x7Kp92
```

## 3. Alternative: Hash the URL

Another approach is:
```
Long URL
   ↓
SHA-256 / MD5
   ↓
Hash
   ↓
Take first N characters
```
For example:
```
https://example.com/product/123
             ↓
       SHA-256
             ↓
9f86d081884c...
             ↓
      9f86d0
```
But there is a problem.


**Collision**

Two URLs could potentially produce the same shortened value if you simply truncate the hash.

Therefore you need collision detection:
```
Generate hash
     │
     ▼
Does ID exist?
   /      \
 YES       NO
 │          │
Generate     Save
another      URL
ID
```
For a large-scale URL shortener, distributed unique IDs + Base62 is generally easier to reason about.

## 4. How do we store the URL?

The basic database record could be:
| short_id | original_url                                    | created_at | expires_at |
| -------- | ----------------------------------------------- | ---------- | ---------- |
| aB91xK   | [https://example.com/](https://example.com/)... | ...        | ...        |
| x7Kp92   | [https://google.com/](https://google.com/)...   | ...        | ...        |

The most important lookup is:
```
short_id → original_url
```
So we want an efficient index on:
```
short_id
```
For example:
```
PK: short_id
```

## 5. SQL or NoSQL?

For a massive URL-shortening service, a distributed NoSQL database can be attractive.

For example:
```
DynamoDB
Cassandra
Bigtable
```
because the access pattern is extremely simple:
```
GET short_id
      ↓
return original_url
```
You don't need complicated joins.

**A conceptual Cassandra-style model:**
```
URL_MAPPING


Partition Key
     │
     ▼
 short_id
     │
     ├── original_url
     ├── created_at
     ├── expires_at
     └── user_id
```
The key is that the database should be optimized around the primary access pattern.

## 6. But millions of redirects will hit the database!

This is where Redis becomes extremely important.

Suppose:
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
Redis
```
Redis:
```
aB91xK
   ↓
https://example.com/products/iphone...
```

**Cache HIT**
```
Request
  ↓
Redis
  ↓
Original URL
  ↓
302 Redirect
```
Very fast.

**Cache MISS**
```
Request
  ↓
Redis
  ↓
MISS
  ↓
Database
  ↓
Original URL
  ↓
Redis SET
  ↓
302 Redirect
```
So frequently accessed URLs remain in memory.

## 7. Cache-aside pattern

This is a classic architecture:
```
             GET /aB91xK
                   │
                   ▼
                Redis
             ┌─────┴─────┐
             │           │
           HIT          MISS
             │           │
             │           ▼
             │        Database
             │           │
             │           ▼
             │        Redis SET
             │           │
             └─────┬─────┘
                   ▼
             Original URL
                   │
                   ▼
              HTTP 302
```
For a URL shortener, this can dramatically reduce database traffic.

## 8. How do we handle billions of URLs?

Now we have a scaling problem.

**Suppose we have:**
```
10 billion URLs
```
We don't want one database server.

We partition the data.

**For example:**
```
                 URL Service
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Shard 1    Shard 2    Shard 3
       a-h        i-p        q-z
```
Or use consistent hashing / database-native partitioning.

**Conceptually:**
```
hash(short_id)
      ↓
partition
      ↓
database node
```
This allows the data to scale horizontally.

## 9. How do we handle billions of requests?

This is different from storing billions of URLs.

You can have:
```
10 billion stored URLs
```
but perhaps only:
```
100 million requests/day
```
The architecture needs to handle request throughput independently from storage.

Use:
```
                 Internet
                    │
                    ▼
                CDN / Edge
                    │
                    ▼
              Load Balancer
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        API-1     API-2     API-N
          │         │         │
          └─────────┼─────────┘
                    ▼
              Redis Cluster
                    │
                 MISS
                    │
                    ▼
             Distributed DB
```
Everything scales horizontally.

## 10. What happens when one application server dies?

Nothing significant.

Because application servers should be stateless.
```
Request
   │
   ▼
Load Balancer
   │
   ├──── API-1 ❌
   │
   ├──── API-2 ✅
   │
   └──── API-3 ✅
```
The next request goes to another server.

State lives in:
- Redis
- Database

not inside:

API Server

## 11. What happens when Redis goes down?

Redis should be deployed as a cluster with replicas.
```
             Redis Cluster
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
    Primary     Primary     Primary
       │           │           │
       ▼           ▼           ▼
    Replica      Replica      Replica
```
If Redis temporarily fails:
```
Application
     ↓
Database
```
The system becomes slower but can continue operating, assuming the database remains healthy.

This is an important interview concept:
```
Cache failure should degrade performance, not destroy correctness.
```

## 12. What happens if two users create the same URL?

Suppose:
```
User A
https://example.com/products/123
```
```
User B
https://example.com/products/123
```
There are two possible business decisions.

**Option 1 — Different short URLs**
```
aB91xK → URL
x7Kp92 → URL
```
Simple.

**Option 2 — Same URL gets same short ID**
```
hash(URL)
    ↓
short_id
```
Then both users get:
```
aB91xK
```
This saves storage but introduces additional complexity around canonicalization and collision handling.

## 13. Redirect: 301 vs 302

When the user requests:
```
https://sho.rt/aB91xK
```
the server returns:
```
HTTP/1.1 302 Found
Location: https://example.com/products/iphone
301
Permanent Redirect
```
Good when the mapping is truly permanent and caching by browsers/CDNs is desirable.
```
302
Temporary Redirect
```
Often preferable when you want more control over redirects and analytics.

For an interview system design, mention that the choice depends on product requirements.

## 14. Analytics should NOT slow down redirects

This is a very important production-design decision.

Don't do:
```
Redirect request
      ↓
Save analytics synchronously
      ↓
Redirect user
```
That increases latency.

Instead:
```
                Request
                   │
                   ▼
             Redis Lookup
                   │
                   ▼
              Original URL
                   │
             ┌─────┴─────┐
             │           │
             ▼           ▼
          Redirect    Kafka Event
                       │
                       ▼
                  Analytics
```
For example:
```
{
  "shortId": "aB91xK",
  "timestamp": "...",
  "country": "IN",
  "device": "mobile",
  "referrer": "..."
}
```
Kafka can absorb the event stream.

Then analytics workers process it asynchronously.

## 15. Complete production architecture

Putting everything together:
```
                         USERS
                           │
                           ▼
                    ┌─────────────┐
                    │ CDN / Edge  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │Load Balancer│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          ┌────────┐   ┌────────┐   ┌────────┐
          │ API-1  │   │ API-2  │   │ API-N  │
          └───┬────┘   └───┬────┘   └───┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
                     ┌─────▼─────┐
                     │   Redis   │
                     │   Cluster │
                     └─────┬─────┘
                           │
                         MISS
                           │
                           ▼
                 ┌──────────────────┐
                 │ Distributed DB   │
                 │                  │
                 │ Shard 1          │
                 │ Shard 2          │
                 │ Shard N          │
                 └──────────────────┘


        CLICK EVENT
             │
             ▼
          Kafka
             │
      ┌──────┴───────┐
      ▼              ▼
 Analytics       Data Lake
 Service
 ```

**The complete request flow**

Create short URL
```
POST /urls
      │
      ▼
API Server
      │
      ▼
Generate Distributed ID
      │
      ▼
Base62 Encode
      │
      ▼
aB91xK
      │
      ▼
Database
      │
      ▼
Redis SET
      │
      ▼
Return

https://sho.rt/aB91xK
```

Redirect
```
GET /aB91xK
      │
      ▼
Load Balancer
      │
      ▼
API Server
      │
      ▼
Redis GET
      │
      ├──────── HIT ──────────┐
      │                       │
      │                       ▼
      │                 Original URL
      │                       │
      │                       ▼
      │                  HTTP 302
      │
      └────── MISS
               │
               ▼
          Distributed DB
               │
               ▼
          Redis SET
               │
               ▼
          HTTP 302
```

