# Real-Time Autocomplete / Search Typeahead System (e.g., Google Search Typeahead)

## 1. Overview
An **Autocomplete (Typeahead) System** predicts and suggests the top $K$ most relevant and trending search queries in real time as a user types characters into a search box, completing queries in under 30 milliseconds.

---

## 2. Requirements

### Functional Requirements
- **Top-K Prefix Suggestions**: Given a prefix string (e.g., `"sys"`), return the top 5–10 most popular completed search queries (e.g., `["system design", "system design interview", "system requirements"]`).
- **Real-Time Dynamic Weighting**: Suggestion ranking reflects recent query search volume and trending topics.
- **Filtering & Personalization**: Filter profanity/hate speech; personalize suggestions based on user search history and geolocation.

### Non-Functional Requirements
- **Ultra-Low Latency**: End-to-end response time < 30ms (ideally < 15ms p99) per keystroke.
- **High Scalability**: Handle 100,000+ keystroke queries per second.
- **High Availability**: 99.999% uptime.
- **Fault Tolerance**: If prefix service fails, gracefully fallback to cached top queries without breaking search UI.

---

## 3. Capacity Estimation

### Assumptions
- **Daily Active Users**: 200 Million.
- **Searches per User**: 10 searches/day $\implies 2 \text{ Billion searches/day}$.
- **Keystrokes per Search**: Average 4 characters typed $\implies 8 \text{ Billion typeahead queries/day}$.
- **Average QPS**: $8 \times 10^9 / 86400 \approx 92,500 \text{ QPS}$ (Peak: 250,000 QPS).
- **Unique Search Terms**: 50 Million unique query terms.
- **Average Term Length**: 20 characters (20 bytes).

---

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    Client[Web Browser / Mobile App] -->|HTTP / WebSocket / HTTPS| CDN[Edge CDN / DNS]
    CDN --> LB[Load Balancer]

    subgraph Fast Read Path: Typeahead Suggestion Service
        LB --> TypeaheadService[Typeahead Query Service]
        TypeaheadService --> TrieCache[(In-Memory Sharded Trie Cache)]
        TypeaheadService --> RedisCache[(Redis Prefix Cache)]
    end

    subgraph Asynchronous Write & Aggregation Path
        Client -->|Final Search Submitted| SearchIngestion[Search Log Ingestion]
        SearchIngestion --> Kafka[Search Event Stream: Kafka]
        Kafka --> Flink[Stream Aggregator: Apache Flink]
        Flink --> AggDB[(Aggregated Frequency DB: Cassandra / HBase)]
        
        TrieBuilder[Offline Trie Builder Job (Daily / Hourly)] <--> AggDB
        TrieBuilder -->|Deploy Immutable Snapshot| TrieCache
    end
```

---

## 5. Architectural Deep Dives

### 5.1 Data Structure: Trie with Top-K Node Caching
- **Standard Trie**:
  - Finding prefix takes $O(P)$ where $P$ is prefix length.
  - Traversing all descendants to find top $K$ takes $O(\text{total nodes in subtree})$, which is too slow ($> 100\text{ms}$) under high load.
- **Optimized Trie (Top-K Cached at Each Node)**:
  - Every trie node stores a pre-computed list of the **Top 5 winning query suggestions** and their historical frequency scores.
  - Query lookup time becomes strictly **$O(P)$**, independent of tree depth or vocabulary size!

```
                    Root
                 /        \
              [s]          [a]
             /   \
           [y]   [e]
          /
        [s] (top_5: ["system design": 90k, "system 32": 45k, "system of a down": 30k])
        /
      [t]
      /
    [e]
    /
  [m] (top_5: ["system design": 90k, "system 32": 45k, "system admin": 12k])
```

### 5.2 Trie Memory Consumption & Sharding
- **Memory Footprint**:
  - 50 Million unique queries $\times$ 30 bytes per node $\approx$ 15–30 GB RAM.
  - An entire global vocabulary easily fits inside RAM on a single modern server!
- **Sharding & Partitioning**:
  - To handle 250,000+ QPS, we shard across multiple nodes using:
    1. **First-Character Partitioning**: Server 1 handles `a-m`, Server 2 handles `n-z` (risk of imbalanced load).
    2. **Consistent Hashing by Prefix (Recommended)**: `hash(prefix) % num_trie_servers`.
    3. **Primary-Replica Clustering**: Replicate entire trie across 20+ read-only replicas behind load balancers.

### 5.3 Trie Update Pipeline (Offline vs. Real-Time)
1. **Offline Daily/Hourly Rebuild**:
   - Aggregated search logs compute query frequencies over rolling 7-day windows.
   - MapReduce / Spark job constructs a new binary Trie snapshot.
   - Master node deploys the snapshot to read-only Trie service pods via atomic pointer swap (zero downtime).
2. **Real-Time Trending Ingestion**:
   - For viral breaking events (e.g., "earthquake in city X"), Apache Flink detects sudden frequency spikes within 1 minute and injects them into an in-memory Redis delta cache overlaid on top of the base Trie.

### 5.4 Client-Side Optimizations
- **Debouncing**: Delay HTTP call until user pauses typing for 100–150ms.
- **Browser In-Memory Cache**: Cache recent prefix responses locally (`prefix: "sys" -> [...]`) in JavaScript memory.
- **Edge CDN Caching**: Cache common short prefixes (`"a"`, `"wh"`, `"how"`) at Cloudflare/Fastly edge nodes with 1-hour TTL.

---

## 6. Python Implementation (Top-K Trie with Frequency)

```python
from typing import Dict, List, Tuple

class TrieNode:
    def __init__(self):
        self.children: Dict[str, 'TrieNode'] = {}
        self.top_k: List[Tuple[str, int]] = []  # [(query, frequency), ...]

class AutocompleteTrie:
    def __init__(self, k: int = 5):
        self.root = TrieNode()
        self.k = k

    def insert(self, query: str, frequency: int):
        node = self.root
        self._update_top_k(node, query, frequency)
        for char in query:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            self._update_top_k(node, query, frequency)

    def _update_top_k(self, node: TrieNode, query: str, frequency: int):
        # Update or insert query in top_k list
        node.top_k = [item for item in node.top_k if item[0] != query]
        node.top_k.append((query, frequency))
        node.top_k.sort(key=lambda x: x[1], reverse=True)
        if len(node.top_k) > self.k:
            node.top_k.pop()

    def get_suggestions(self, prefix: str) -> List[str]:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]
        return [q for q, _ in node.top_k]

# Example Usage
trie = AutocompleteTrie(k=3)
trie.insert("system design", 1000)
trie.insert("system design interview", 800)
trie.insert("system requirements", 500)
trie.insert("syntax error", 300)

print(trie.get_suggestions("sys"))
# Output: ['system design', 'system design interview', 'system requirements']
```

---

## 7. Key Takeaways
- Store pre-computed **Top-K completed suggestions inside each Trie node** to achieve $O(\text{prefix length})$ time complexity.
- Combine **Offline Batch Trie Generation** (for stability) with **Real-Time Streaming Overlays** (for viral trends).
- Apply **Client-Side Debouncing** and **Edge CDN Caching** to eliminate over 70% of backend network requests.
