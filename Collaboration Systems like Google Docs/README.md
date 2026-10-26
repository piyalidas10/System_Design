# Real-Time Collaborative Document Editing System (e.g., Google Docs, Figma, Notion)

## 1. Overview
A **Real-Time Collaborative Editing System** allows multiple geographically dispersed users to simultaneously view, edit, comment, and format rich-text documents with sub-100ms real-time synchronization, conflict resolution, live cursor positions, and offline edit merging.

---

## 2. Requirements

### Functional Requirements
- **Simultaneous Real-Time Editing**: Multiple users editing the exact same paragraph/character concurrently without overwriting or corrupting each other's work.
- **Conflict Resolution**: Guaranteed eventual consistency across all user views using CRDT (Conflict-free Replicated Data Types) or OT (Operational Transformation).
- **Presence & Live Cursors**: Display remote users' active cursors, text selections, and user avatars in real time.
- **Version History & Undo/Redo**: Full audit timeline with point-in-time document revision restoration.
- **Offline Editing & Reconnection**: Allow disconnected clients to continue typing and seamlessly merge changes once back online.

### Non-Functional Requirements
- **Ultra-Low Latency**: Keystroke sync latency < 50ms across active collaborators.
- **High Availability**: 99.99% uptime.
- **Strong Convergence**: All clients must converge to the exact same identical document state when edits stop.
- **Scalability**: Support hundreds of concurrent editors on a single viral document.

---

## 3. Capacity Estimation

### Assumptions
- **Daily Active Users**: 50 Million DAU.
- **Concurrent Active Document Sessions**: 2 Million.
- **Keystrokes per Active Editor**: 20 operations per minute per user $\implies \approx 650,000 \text{ edits/sec}$.
- **Average Edit Operation Payload**: 60 bytes (character, position, user_id, timestamp/clock).
- **Document Snapshot Size**: 500 KB average.
- **Daily Operations Log**: $650,000 \times 60 \text{ B} \times 86400 \approx 3.3 \text{ TB/day}$.

---

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    ClientA[Client A: Web / Desktop] -->|WebSocket / WebRTC| LB[Network Load Balancer]
    ClientB[Client B: Web / Desktop] -->|WebSocket / WebRTC| LB

    LB --> DocGateway[Doc Session Gateway / Affinity Router]

    subgraph Document Collaboration Cluster
        DocGateway --> DocSession1[Doc Session Server (Document #42 Master)]
        DocGateway --> DocSession2[Doc Session Server (Document #99 Master)]
    end

    subgraph State & Persistence
        DocSession1 <--> RedisSession[(In-Memory Buffer & Lock: Redis)]
        DocSession1 --> DocDB[(Document DB: PostgreSQL / MongoDB)]
        DocSession1 --> SnapshotStore[(Object Store: S3 - Document Snapshots)]
    end

    subgraph Operation Streaming
        DocSession1 --> OpQueue[Kafka / Event Stream]
        OpQueue --> AuditWorker[Revision History & Analytics Worker]
    end
```

---

## 5. Architectural Deep Dives

### 5.1 Conflict Resolution: OT vs. CRDT

| Feature | Operational Transformation (OT) (Google Docs) | CRDT (Conflict-free Replicated Data Types) (Figma, Apple Notes) |
| :--- | :--- | :--- |
| **Core Concept** | Operations are transformed against concurrent operations via a centralized server. | Data structure with mathematically provable commutative & associative merge properties. |
| **Architecture** | Requires a **Centralized Server** to order operations sequentially. | **Decentralized / Peer-to-Peer friendly**; merges in any order without central coordinator. |
| **Data Overhead** | Low (sends basic character insert/delete operations). | Higher (each character carries a globally unique fractional ID / vector clock). |
| **Offline Merging** | Complex for long offline periods with massive divergent operation logs. | Effortless mathematical merge of state vectors. |

### 5.2 Operational Transformation (OT) Mechanics
When Client A and Client B edit concurrently at the same index:

```
Initial Document: "CAT"

Client A inserts 'O' at index 1 -> Intended result: "COAT"  (Op_A: Insert('O', 1))
Client B inserts 'H' at index 1 -> Intended result: "CHAT"  (Op_B: Insert('H', 1))

Central Server receives Op_A first: Document becomes "COAT"
Server receives Op_B (which was created against state "CAT"):
OT transforms Op_B against Op_A:
-> Op_B' = Insert('H', 2) (shifted by length of inserted char)
Server applies Op_B' -> Final State: "COHAT" (or "CHOAT")
Both clients receive transformed operations and converge to identical text!
```

### 5.3 LSEQ & Fractional Indexing in CRDTs
In a Sequence CRDT (like Logoot or LSEQ), characters are assigned fractional position identifiers between 0 and 1:
- `'C'` has position `[0.2]`
- `'A'` has position `[0.5]`
- `'T'` has position `[0.8]`
- If User A inserts `'O'` between `'C'` and `'A'`, its position becomes `[0.35]`.
- If User B inserts `'H'` concurrently, its position might be `[0.37]`.
- Sorting characters by identifier naturally resolves conflicts without index shifting.

### 5.4 Document Session Affinity & WebSockets
- Because a document's active state must be strictly coordinated, all clients editing **Document ID `D123`** are routed to the **same active Session Server** using consistent hashing (`hash(doc_id) % num_session_servers`).
- Session servers hold the document AST/CRDT in memory, applying incoming operations sequentially and broadcasting transformed diffs to connected WebSocket peers in $< 20\text{ms}$.

### 5.5 Periodic Snapshots & Compaction
- Instead of replaying 100,000 granular operations when opening a document:
  - Session servers flush full document snapshots to S3 / PostgreSQL every 500 operations or every 60 seconds.
  - New clients load the latest snapshot + replay only trailing operations from Redis buffer.

---

## 6. Database Schema Design

```sql
CREATE TABLE documents (
    document_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    latest_version INT DEFAULT 1,
    content_snapshot TEXT, -- Latest HTML/JSON document state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE document_operations (
    operation_id BIGINT PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(document_id),
    user_id UUID NOT NULL,
    version INT NOT NULL, -- Target document version
    operation_type VARCHAR(16) NOT NULL, -- 'INSERT', 'DELETE', 'FORMAT'
    payload JSONB NOT NULL, -- { index: 5, char: 'a', attributes: { bold: true } }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_doc_ops ON document_operations(document_id, version);
```

---

## 7. Key Takeaways
- Use **Operational Transformation (OT)** with centralized document session routing or **CRDTs (Fractional Indexing)** for decentralized conflict resolution.
- Maintain persistent **WebSocket connections** pinned via document ID hashing to a single coordinator pod.
- Periodically checkpoint full document snapshots to prevent costly replay of extensive operation histories.
