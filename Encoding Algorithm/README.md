# Most Commonly Used Encoding Algorithms in System Design

Encoding converts data from one representation to another so it can be **transmitted, stored, or processed safely and efficiently**. It is **not encryption** (no secrecy) and **not hashing** (it is reversible with no key).

| Concept | Purpose | Reversible? | Needs key? |
|---|---|---|---|
| Encoding | Representation / compatibility / compactness | Yes | No |
| Encryption | Confidentiality | Yes | Yes |
| Hashing | Integrity / fingerprint / lookup | No | No (or salt/HMAC key) |
| Compression | Reduce size | Yes (lossless) / No (lossy) | No |

---

## 1. Quick Summary

| Category | Algorithm | Typical System Design Use |
|---|---|---|
| Text / Character | ASCII, UTF-8, UTF-16 | Storing and transmitting text, DB collations, HTTP bodies |
| Binary-to-text | Base64, Base64URL | JWTs, email (MIME), embedding images/binary in JSON, data URIs |
| Binary-to-text | Base62 | URL shorteners (TinyURL, bit.ly) |
| Binary-to-text | Base32 / Base58 | TOTP secrets, Bitcoin addresses, human-friendly IDs |
| Binary-to-text | Hex (Base16) | Hash digests, UUIDs, debugging, color codes |
| URL | Percent-encoding (URL encoding) | Query strings, path segments |
| Serialization | JSON, XML | Public REST APIs, config |
| Serialization | Protocol Buffers, Thrift, Avro, MessagePack | Internal RPC (gRPC), Kafka, high-throughput services |
| Compression | Gzip, Brotli, Snappy, LZ4, Zstandard | HTTP responses, log/Kafka storage, columnar files |
| Integer / Sequence | Varint, ZigZag, Delta, Run-Length (RLE), Dictionary | Protobuf, columnar DBs, time-series |
| Bit-level | Huffman, Arithmetic | Inside DEFLATE/gzip, JPEG, etc. |
| Error detection / correction | CRC, Checksums, Hamming, Reed-Solomon | Networking, storage, RAID, erasure coding (S3, HDFS) |
| Media | H.264/H.265/AV1, AAC, JPEG/WebP | Video streaming, image CDN |
| Unique IDs | UUID, ULID, Snowflake (bit-packed) | Distributed ID generation |
| Geospatial | Geohash, S2, H3 | Proximity search (Uber, Yelp) |

### 1.1 Common Encoding Algorithms and Schemes

| Category | Encoding Scheme | Purpose |
|---|---|---|
| Text encoding | ASCII | Represents characters using numeric codes |
| Text encoding | UTF-8, UTF-16 | Represents Unicode characters |
| Binary-to-text | Base64 | Represents binary data as text |
| Binary-to-text | Base32 | Represents data using 32 symbols |
| Number encoding | Base36 | Uses 0–9 and a–z |
| Number encoding | Base62 | Uses 0–9, a–z, and A–Z |
| Number encoding | Base58 | Uses an alphabet designed to avoid ambiguous characters |
| URL encoding | Percent encoding | Represents reserved URL characters, e.g. `%20` |
| Data representation | Hexadecimal (Base16) | Represents bytes using 0–9 and A–F |
| Compression | Huffman coding | Uses variable-length codes to compress data |

> These are common examples, not an exhaustive list.

### 1.2 Base Encoding: How Many Characters?

| Base | Name | Alphabet |
|---|---|---|
| 16 | Base16 (Hexadecimal) | Digits 0–9, letters A–F |
| 36 | Base36 | Digits 0–9 and letters a–z |
| 58 | Base58 | 58 symbols; excludes easily confused characters (`0 O I l`) |
| 62 | Base62 | Digits 0–9, lowercase a–z, uppercase A–Z |
| 64 | Base64 | 64 primary symbols (`A-Z a-z 0-9 + /`), commonly used for binary-to-text conversion |

Rule of thumb: a larger base means shorter output for the same number (e.g. 7 chars of Base62 ≈ 3.5 trillion values vs. 7 chars of Base16 ≈ 268 million), but a larger alphabet is harder to read aloud and more prone to ambiguity or URL-unsafe characters.

---

## 2. Character Encodings

### ASCII
- 7-bit, 128 characters. English only.

### UTF-8 (de facto standard)
- Variable length: 1–4 bytes per code point.
- Backward compatible with ASCII.
- Self-synchronizing, no byte-order problems.
- **Use**: HTTP, JSON, HTML, databases (`utf8mb4` in MySQL, not `utf8`).

### UTF-16 / UTF-32
- UTF-16: 2 or 4 bytes (used internally by Java, JavaScript, Windows).
- UTF-32: fixed 4 bytes, simple but wasteful.

**Design tip**: Always declare encoding explicitly (`Content-Type: application/json; charset=utf-8`). Mismatched encodings cause mojibake and subtle bugs.

---

## 3. Binary-to-Text Encodings

### Base64
- Maps every 3 bytes (24 bits) to 4 ASCII characters (6 bits each) from `A-Z a-z 0-9 + /`, padded with `=`.
- **Overhead: ~33%**.
- **Use**: email attachments (MIME), embedding binary in JSON/XML, HTTP Basic Auth, data URIs.
- **Base64URL**: replaces `+` → `-` and `/` → `_`, usually drops padding. Used in **JWT** and URLs.

```
"Man" -> 01001101 01100001 01101110 -> 010011 010110 000101 101110 -> "TWFu"
```

### Base62 (URL Shortener)
- Alphabet: `0-9 a-z A-Z` (62 chars), no special characters, URL-safe.
- Encode an auto-increment ID / counter to a short string.
- 7 chars → 62^7 ≈ **3.5 trillion** unique URLs.

```python
ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def base62_encode(n: int) -> str:
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, r = divmod(n, 62)
        out.append(ALPHABET[r])
    return "".join(reversed(out))

def base62_decode(s: str) -> int:
    n = 0
    for ch in s:
        n = n * 62 + ALPHABET.index(ch)
    return n
```

### Base32 / Base58
- **Base32**: case-insensitive, used for TOTP/2FA secrets.
- **Base58**: Base62 minus ambiguous chars (`0 O I l`), used by Bitcoin addresses.

### Hex (Base16)
- 1 byte → 2 chars. 100% overhead, but human-readable.
- **Use**: SHA-256 digests, UUIDs, MAC addresses.

---

## 4. URL (Percent) Encoding
- Unsafe/reserved characters become `%XX` (e.g., space → `%20`, `&` → `%26`).
- **Use**: query parameters, form submissions (`application/x-www-form-urlencoded`).
- **Design tip**: encode each component separately, never the whole URL.

---

## 5. Serialization Formats

Serialization encodes in-memory objects into bytes for network/storage.

| Format | Type | Schema | Size | Speed | Human-readable | Typical Use |
|---|---|---|---|---|---|---|
| JSON | Text | Optional | Large | Slow | Yes | Public REST APIs |
| XML | Text | XSD | Largest | Slowest | Yes | SOAP, legacy, config |
| YAML | Text | Optional | Large | Slow | Yes | Config |
| MessagePack | Binary | No | Medium | Fast | No | Drop-in for JSON, caches |
| **Protocol Buffers** | Binary | Required (`.proto`) | Small | Very fast | No | gRPC, internal microservices |
| Thrift | Binary | Required | Small | Very fast | No | Facebook-style RPC |
| **Avro** | Binary | Required (embedded/registry) | Small | Fast | No | Kafka, Hadoop, data pipelines |
| FlatBuffers / Cap'n Proto | Binary | Required | Small | Zero-copy | No | Games, ultra-low latency |
| Parquet / ORC | Columnar binary | Required | Very small | Fast for analytics | No | Data lakes, OLAP |

**Design tips**
- Public APIs → JSON (interoperability, debuggability).
- Internal service-to-service → Protobuf/gRPC (smaller, faster, typed, schema evolution).
- Event streaming → Avro + Schema Registry (compatibility checks).
- Analytics → Parquet/ORC (columnar, compressible).
- Plan for **schema evolution**: use optional fields, never reuse field numbers (Protobuf), and keep backward/forward compatibility.

---

## 6. Integer & Sequence Encodings (Space Optimization)

| Technique | Idea | Used In |
|---|---|---|
| **Varint** | Small integers use fewer bytes (7 data bits + 1 continuation bit per byte) | Protobuf, Kafka, SQLite |
| **ZigZag** | Maps signed → unsigned so negatives stay small (`0,-1,1,-2` → `0,1,2,3`) | Protobuf `sint32/64` |
| **Delta encoding** | Store differences between consecutive values | Time-series DBs, sorted ID lists, inverted indexes |
| **Run-Length Encoding (RLE)** | `AAAABBB` → `4A3B` | Columnar stores, bitmaps, fax |
| **Dictionary encoding** | Replace repeated values with small integer IDs | Parquet, ClickHouse, Redis |
| **Bit-packing** | Use only needed bits per value | Parquet, Lucene |
| **Bitmap / Roaring Bitmap** | Compressed sets of integers | Elasticsearch, Druid, Spark |
| **Front coding** | Share common prefixes in sorted strings | Search index term dictionaries |
| **Gorilla (XOR) encoding** | XOR with the previous float, store only changed bits | Time-series (Prometheus, Facebook Gorilla) |

---

## 7. Compression Encodings

| Algorithm | Ratio | Speed | Typical Use |
|---|---|---|---|
| **Gzip (DEFLATE)** | Good | Medium | HTTP responses, log files |
| **Brotli** | Better (esp. text) | Slower compress, fast decompress | Static web assets over HTTPS |
| **Snappy** | Low | Very fast | Kafka, Cassandra, HBase, Parquet defaults |
| **LZ4** | Low | Extremely fast | Real-time systems, databases |
| **Zstandard (zstd)** | High, tunable | Fast | Modern default (Facebook, Kafka, Linux kernel) |
| **Huffman coding** | Entropy coding | – | Building block in DEFLATE, JPEG |

**Rule of thumb**: latency-sensitive path → LZ4/Snappy; storage/bandwidth-sensitive → zstd/Brotli.

---

## 8. Error Detection & Correction Codes

| Technique | Purpose | Used In |
|---|---|---|
| Parity bit | Detect single-bit error | Memory, serial links |
| **Checksum** (Internet checksum) | Detect corruption | TCP/UDP/IP headers |
| **CRC (CRC32/CRC32C)** | Detect burst errors | Ethernet, storage blocks, Kafka, HDFS |
| **Hamming code** | Correct single-bit error | ECC RAM |
| **Reed-Solomon / Erasure coding** | Recover lost chunks with less overhead than replication | S3, HDFS 3, Ceph, RAID 6, CDs |

**Replication vs erasure coding**: 3x replication = 200% overhead; Reed-Solomon (10,4) = 40% overhead and tolerates 4 failures, at the cost of higher CPU and repair bandwidth.

---

## 9. Media Encodings
- **Video**: H.264 (AVC), H.265 (HEVC), VP9, AV1. Streaming uses **adaptive bitrate** (HLS/DASH) with multiple renditions.
- **Audio**: AAC, MP3, Opus (low latency, WebRTC).
- **Image**: JPEG, PNG, WebP, AVIF.
- **Design tip**: transcode on upload into multiple resolutions/bitrates, store in object storage, serve through CDN.

---

## 10. ID and Location Encodings

### Unique IDs
- **UUID v4**: 128 bits random, hex with dashes. No coordination, but not sortable.
- **UUID v7 / ULID**: time-ordered, better DB index locality.
- **Snowflake ID (64-bit)**: `1 bit sign | 41 bits timestamp | 10 bits machine ID | 12 bits sequence` — sortable, ~4096 IDs/ms/machine.

### Geospatial
- **Geohash**: interleaves lat/lon bits, encodes as Base32. Shared prefix ≈ nearby (with edge-case boundaries).
- **Google S2** (sphere cells, Hilbert curve) and **Uber H3** (hexagonal grid): ride-hailing, delivery, proximity search.
- **Quadtree**: recursive spatial partitioning.

---

## 11. Where Encoding Shows Up in Classic System Designs

| System | Encoding Choices |
|---|---|
| **URL Shortener** | Base62 of a counter / distributed ID; or Base64URL of a hash prefix (collision handling needed) |
| **Auth (JWT)** | Base64URL for header/payload/signature; JSON claims |
| **Chat / Messaging** | Protobuf over WebSocket/gRPC; UTF-8 text; Opus/AAC for voice |
| **Video Streaming (YouTube/Netflix)** | H.264/AV1 + AAC, HLS/DASH segments, CDN |
| **Web Crawler / Search** | UTF-8 normalization, gzip, delta + varint posting lists, Roaring Bitmaps |
| **Distributed Storage (S3/HDFS)** | CRC32C checksums, Reed-Solomon erasure coding, zstd/Snappy |
| **Kafka / Event Streaming** | Avro/Protobuf + Schema Registry, varint, Snappy/LZ4/zstd, CRC32C |
| **Time-Series DB** | Delta-of-delta timestamps, Gorilla XOR floats, RLE |
| **Ride-hailing / Maps** | Geohash / S2 / H3, Protobuf |
| **Email** | MIME with Base64 / Quoted-Printable |
| **CDN / Web** | Gzip/Brotli, WebP/AVIF, percent-encoding |

---

## 12. How to Choose (Interview Cheat Sheet)

1. **Need human-readable & interoperable?** → JSON + UTF-8 (+ gzip/Brotli).
2. **Need compact & fast between internal services?** → Protobuf / gRPC (or Avro for streaming).
3. **Binary data inside text channel (JSON, URL, header)?** → Base64 / Base64URL (Base62 for short IDs).
4. **Short, URL-safe, readable IDs?** → Base62 (or Base58 to avoid look-alike chars).
5. **Reduce storage/network cost?** → compression (zstd/Snappy/LZ4) + columnar and integer encodings (delta, dictionary, RLE).
6. **Durability at lower cost than replication?** → erasure coding + checksums (CRC32C).
7. **Need secrecy?** → encoding is **not** enough; use encryption (TLS, AES). **Need integrity/auth?** → HMAC / digital signatures.

### Common Pitfalls
- Treating Base64 as security — it is trivially reversible.
- Forgetting the ~33% Base64 size overhead for large payloads (prefer multipart/binary upload or pre-signed object-store URLs).
- Double-encoding (e.g., percent-encoding twice) or mixing charsets.
- Breaking schema compatibility in Protobuf/Avro by renumbering or removing required fields.
- Using Base64 (with `+`, `/`, `=`) directly in URLs instead of Base64URL.
- Using MySQL `utf8` (3-byte) instead of `utf8mb4`, which drops emoji and some characters.
- Compressing already-compressed data (JPEG, MP4, encrypted data) — wasted CPU. Also, **compress before encrypting**, not after, and beware of CRIME/BREACH attacks on secret-bearing responses.

---

## 13. Summary

> Use **UTF-8** for text, **JSON** at the edges, **Protobuf/Avro** inside, **Base64/Base62** to fit binary or IDs into text, **zstd/Snappy/Brotli** to save bytes, **delta/dictionary/RLE** for analytical and time-series storage, **CRC + erasure coding** for reliability, and **Geohash/S2/H3** for location. Encoding is about representation and efficiency — pair it with encryption and hashing when security is required.
