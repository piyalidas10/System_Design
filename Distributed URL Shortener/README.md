# Distributed URL Shortener System Design (e.g., TinyURL, Bitly)

## 1. Overview
A **Distributed URL Shortener** maps long URLs (e.g., `https://example.com/very/long/path?id=12345`) to compact aliases (e.g., `https://tiny.cc/aB92xK`) and redirects incoming HTTP requests to original destination URLs with low latency while collecting click analytics.

---

## 2. Requirements

### Functional Requirements
- **URL Shortening**: Given a long URL, generate a unique, short alias (6–8 characters).
- **Redirection**: Given a short alias, redirect the user's browser via HTTP 301 (Permanent) or HTTP 302 (Temporary) to the original long URL.
- **Custom Alias & Expiration**: Allow users to specify custom aliases and optional expiry dates.
- **Click Analytics**: Track click metrics (timestamps, geographical location, referrer, user agent).

### Non-Functional Requirements
- **Ultra-Low Latency**: Redirect latency < 10ms (p99).
- **High Availability**: 99.999% uptime (redirects must never fail).
- **Read-Heavy System**: 100:1 read-to-write ratio.
- **Scale**: Billions of short URLs created; hundreds of millions of redirects per day.

---

## 3. Capacity Estimation

### Assumptions
- **Write QPS (New URLs)**: 100 Million new URLs created per month $\implies \approx 40 \text{ writes/sec}$ (Peak: 500 writes/sec).
- **Read QPS (Redirects)**: 10 Billion redirects per month $\implies \approx 4,000 \text{ reads/sec}$ (Peak: 50,000 reads/sec).
- **Storage per Entry**:
  - `short_id`: 7 bytes.
  - `long_url`: 500 bytes.
  - Metadata + timestamps: 50 bytes.
  - Total per record $\approx 600$ bytes.
- **5-Year Storage**: $100 \times 10^6 \times 12 \times 5 \times 600 \text{ B} \approx 3.6 \text{ TB}$.
- **Cache Size (80/20 Rule)**: Cache 20% of hot daily redirect traffic in memory $\implies 20\% \times (10^{10}/30) \times 600 \text{ B} \approx 40 \text{ GB}$ RAM in Redis.

---

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    Client[Browser / User Device] --> EdgeCDN[Edge CDN / DNS Cloudflare]
    EdgeCDN --> API_GW[Load Balancer / API Gateway]
    
    subgraph Read Path (Redirects)
        API_GW --> RedirectService[URL Redirect Service]
        RedirectService --> Cache[(Distributed Cache: Redis Cluster)]
        RedirectService --> DB[(Distributed KV / NoSQL: DynamoDB / Cassandra)]
        RedirectService -->|Async Click Event| Kafka[Analytics Stream: Kafka]
    end

    subgraph Write Path (Shortening)
        API_GW --> ShortenService[URL Shortener Service]
        ShortenService --> KGS[Key Generation Service / Snowflake ID]
        ShortenService --> DB
        ShortenService --> Cache
    end

    subgraph Analytics Pipeline
        Kafka --> Flink[Stream Analytics: Apache Flink]
        Flink --> AnalyticsDB[(OLAP DB: ClickHouse / PostgreSQL)]
    end
```

---

## 5. Architectural Deep Dives

### 5.1 Short Key Generation Strategies

| Strategy | Mechanism | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **MD5/SHA-256 Hashing** | Hash long URL $\to$ take first 7 chars. | Deterministic. | Hash collisions require duplicate detection loops. |
| **Base62 Encoding on Auto-Increment ID** | Convert 64-bit numeric ID to Base62 `[0-9a-zA-Z]`. | Zero collisions; compact; fast $O(1)$. | Sequential IDs are guessable/scrapeable (fix: token mixing/Feistel cipher). |
| **Pre-Generated Key Service (KGS)** | Standby service generates unique Base62 tokens in advance. | Instant $O(1)$ writes; no runtime collision checks. | Single point of failure if KGS not clustered. |

### 5.2 Base62 Character Space Math
- Alphabet: `[0-9, a-z, A-Z]` = $10 + 26 + 26 = 62$ characters.
- Number of unique combinations for 7 characters:
  $$62^7 = 3,521,614,606,208 \approx 3.5 \text{ Trillion URLs}$$
- 3.5 Trillion combinations is vastly sufficient for decades of growth.

```python
# Base62 Encoding Algorithm
CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode_base62(num: int) -> str:
    if num == 0:
        return CHARS[0]
    result = []
    while num > 0:
        result.append(CHARS[num % 62])
        num //= 62
    return "".join(reversed(result))
```

### 5.3 HTTP 301 vs. HTTP 302 Redirection
- **HTTP 301 (Moved Permanently)**:
  - Browser caches redirect locally. Subsequent clicks never hit our server.
  - **Pro**: Minimizes server load.
  - **Con**: We cannot track click analytics after the first visit.
- **HTTP 302 (Found / Temporary Redirect)**:
  - Browser queries our server on every redirect click.
  - **Pro**: Exact real-time click tracking, geolocation, and referrer logs.
  - **Con**: Higher server request volume (mitigated with Redis caching).

### 5.4 Partitioning & Sharding
- Shard database and cache by `hash(short_key) % num_shards`.
- Consistent hashing distributes traffic evenly and avoids hotspots.

---

## 6. Database Schema Design

```sql
CREATE TABLE urls (
    short_key VARCHAR(8) PRIMARY KEY,
    long_url VARCHAR(2048) NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE url_clicks (
    click_id UUID PRIMARY KEY,
    short_key VARCHAR(8) NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    country_code VARCHAR(2),
    referrer VARCHAR(512),
    user_agent TEXT
);
```

---

## 7. Key Takeaways
- Use **Base62 encoding** over a distributed unique 64-bit ID generator (Snowflake) for collision-free key generation.
- Use **HTTP 302 redirects** with a **Redis cache** to track click analytics while maintaining single-digit millisecond latency.
- Offload click analytics ingestion to **Apache Kafka** so write logging never blocks user redirects.
