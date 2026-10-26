# Distributed Object / Blob Store (e.g., AWS S3, GCS, Ceph, MinIO)

## 1. Overview
A **Distributed Blob (Binary Large Object) Store** is a flat-namespace, horizontally scalable storage service designed to store and retrieve unstructured binary data (images, videos, backups, disk images, large datasets) of arbitrary size using HTTP RESTful APIs.

---

## 2. Requirements

### Functional Requirements
- **PutObject(bucket, key, data, metadata)**: Upload a blob with associated key and metadata.
- **GetObject(bucket, key, range_bytes)**: Retrieve a blob or a specific byte range.
- **DeleteObject(bucket, key)**: Mark or delete an object.
- **ListObjects(bucket, prefix, delimiter)**: List keys within a bucket under a prefix hierarchy.
- **Multipart Upload**: Support chunked, resumable parallel uploads for large files (> 100 MB).

### Non-Functional Requirements
- **Massive Scalability**: Exabytes of data and billions of objects.
- **High Durability**: $99.999999999\%$ (11 9s) durability.
- **High Availability**: 99.99% availability.
- **Strong / Read-After-Write Consistency**: Immediate consistency for PUT and DELETE operations.
- **Cost Efficiency**: High storage density with Erasure Coding.

---

## 3. Capacity Estimation

### Assumptions
- **Total Storage**: 100 Petabytes (PB) = $100 \times 10^{15}$ bytes.
- **Total Objects**: 10 Billion objects.
- **Average Object Size**: 10 MB.
- **Write QPS**: 10,000 PUTs/sec.
- **Read QPS**: 100,000 GETs/sec.
- **Network Ingress Bandwidth**: $10,000 \times 10\text{ MB} = 100\text{ GB/sec}$.
- **Network Egress Bandwidth**: $100,000 \times 10\text{ MB} = 1\text{ TB/sec}$.

---

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    Client[Client App / Browser] --> API_GW[API Gateway / Load Balancer]
    API_GW --> MetaService[Metadata Service Cluster]
    API_GW --> StorageService[Data / Chunk Storage Service]

    subgraph Control & Metadata Plane
        MetaService --> MetaDB[(Distributed KV / Metadata DB: Spanner / Cassandra / CockroachDB)]
        MetaService --> Auth[IAM & Auth Service]
    end

    subgraph Data Plane
        StorageService --> StorageNode1[Storage Node 1 (Disk Chunk)]
        StorageService --> StorageNode2[Storage Node 2 (Disk Chunk)]
        StorageService --> StorageNode3[Storage Node 3 (Disk Chunk)]
        StorageService --> StorageNodeN[Storage Node N (Disk Chunk)]
    end

    StorageService --> GC[Garbage Collector / Compaction Worker]
```

---

## 5. Architectural Deep Dives

### 5.1 Decoupling Metadata from Data
- **Metadata Plane**:
  - Key name, bucket, object size, owner, creation timestamp, ACL permissions, chunk IDs list.
  - Stored in a highly consistent distributed key-value / NoSQL database (e.g., TiKV, CockroachDB, Google Spanner).
  - High QPS, tiny data size (~500 bytes per object).
- **Data Plane (Chunk Store)**:
  - Raw binary byte stream split into fixed-size chunks (e.g., 64 MB chunks).
  - Stored across commodity disk storage nodes (JBOD / NVMe).
  - High bandwidth, append-only sequential writes.

### 5.2 Storage Efficiency: Replication vs. Erasure Coding (Reed-Solomon)

| Metric | 3x Replication | Erasure Coding ($8+4$ RS Code) |
| :--- | :--- | :--- |
| **Storage Overhead** | $200\%$ overhead ($300\%$ total disk) | $50\%$ overhead ($150\%$ total disk) |
| **Fault Tolerance** | Can lose any 2 drives/nodes | Can lose any 4 drives/nodes out of 12 |
| **CPU Overhead** | Low (direct bitwise copy) | Higher (Galois field arithmetic encoding/decoding) |
| **Ideal For** | Hot small objects / low latency | Cold, warm & large objects (> 1MB) |

```
Erasure Coding (8 Data Chunks + 4 Parity Chunks):
Original Blob (64MB) ─► Split into 8 Chunks (8MB each: D1..D8)
                      ─► Compute 4 Parity Chunks (P1..P4)
                      ─► Distribute all 12 chunks to 12 distinct failure racks
Any 8 chunks out of 12 are sufficient to reconstruct the entire file!
```

### 5.3 Multipart / Resumable Upload Flow
1. **InitiateMultipartUpload**: Client initiates upload $\to$ Server returns `UploadId`.
2. **UploadPart**: Client splits 5 GB file into 100 parts of 50 MB; uploads parts in parallel with `(UploadId, PartNumber)`.
3. **CompleteMultipartUpload**: Client sends array of `[(PartNumber, ETag)]`. Server validates all chunks, merges metadata, and marks blob active.

### 5.4 Garbage Collection & Compaction
- Deleted objects are marked as soft-deleted in metadata.
- Background asynchronous garbage collection workers scan chunk files, reclaim unreferenced chunks, and compact fragmented disk blocks (similar to LSM tree compaction).

---

## 6. Data Model

### Metadata Database Schema
```sql
CREATE TABLE buckets (
    bucket_id UUID PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    owner_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE objects (
    bucket_id UUID NOT NULL,
    object_key VARCHAR(1024) NOT NULL,
    version_id INT DEFAULT 1,
    size_bytes BIGINT NOT NULL,
    content_type VARCHAR(128),
    etag VARCHAR(64) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (bucket_id, object_key, version_id)
);

CREATE TABLE object_chunks (
    bucket_id UUID NOT NULL,
    object_key VARCHAR(1024) NOT NULL,
    chunk_index INT NOT NULL,
    chunk_id UUID NOT NULL,
    storage_node_id VARCHAR(64) NOT NULL,
    size_bytes INT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    PRIMARY KEY (bucket_id, object_key, chunk_index)
);
```

---

## 7. Key Takeaways & Trade-offs
- **Decoupled Architecture**: Separation of metadata (fast random queries) from data chunks (high throughput sequential streaming).
- **Erasure Coding**: Drastically lowers infrastructure storage costs while maintaining 11 9s durability.
- **Range Queries / Multipart**: Byte-range headers (`Range: bytes=0-1048575`) enable instant video scrubbing without downloading full files.
