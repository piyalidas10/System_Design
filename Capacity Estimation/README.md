# Capacity Estimation (Back-of-the-Envelope Estimation)

Before diving into design and code, every application needs a high-level estimate of:

- **Compute** — How will the data be processed? What does the processing power requirement look like?
- **Storage** — Where will the data be stored? How much? For how long?
- **Network** — How much bandwidth is needed to move data between services?

These three dimensions represent real costs — either provisioned on-premises or through cloud providers such as AWS, Google Cloud, or Azure. Estimating them early lets teams plan infrastructure before writing code, understand the economics of the system, and demonstrate production awareness in system design interviews.

> Doing these quick mental calculations is called **back-of-the-envelope estimation**. The goal is a *right guess*, not a precise figure.

---

## 1. Powers of Two — Data Size Units

Computers work in binary (0s and 1s), so powers of 2 are fundamental in computing.

### Bits and Bytes

| Unit | Value |
|---|---|
| 1 byte | 8 bits (2³ bits) |
| 1 ASCII character | 1 byte |
| 1 UTF-8 character | 1–4 bytes |

### Storage Units

| Power of 2 | Approximate Value | Unit |
|---|---|---|
| 2^10 | ~1,000 bytes | 1 KB (Kilobyte) |
| 2^20 | ~1,000,000 bytes | 1 MB (Megabyte) |
| 2^30 | ~1,000,000,000 bytes | 1 GB (Gigabyte) |
| 2^40 | ~1,000,000,000,000 bytes | 1 TB (Terabyte) |
| 2^50 | ~1,000,000,000,000,000 bytes | 1 PB (Petabyte) |

### Unit Relationships

```
1 PB = 10³ TB = 10⁶ GB = 10⁹ MB = 10¹² KB = 10¹⁵ bytes
```

---

## 2. Time Units in Computing

Computers operate far below the human scale of seconds. The three common sub-second units are:

| Unit | Symbol | Value |
|---|---|---|
| Nanosecond | ns | 10⁻⁹ seconds |
| Microsecond | µs | 10⁻⁶ seconds = 1,000 ns |
| Millisecond | ms | 10⁻³ seconds = 1,000 µs = 1,000,000 ns |

---

## 3. Latency Numbers Every Developer Should Know

| Operation | Latency |
|---|---|
| L1 cache read | ~0.5 ns |
| L2 cache read | ~7 ns (≈14× slower than L1) |
| Main memory (RAM) read | ~100 ns (≈15× slower than L2) |
| Read 1 MB from main memory | ~250 µs |
| Read 1 MB from network | ~100 ms |
| Read 1 MB from disk | ~300 ms (≈3× slower than network) |
| Send 2 KB over 1 Gbps network | ~2 µs |

> **Access speed hierarchy (fastest to slowest):**
> L1 Cache → L2 Cache → Main Memory (RAM) → Network → Disk

---

## 4. Sample Calculation — Network Transfer Time

**Problem:** How long does it take to send 2,000 bytes over a 1 Gbps network?

```
1 Gbps = 1 GB/second = 10⁹ bytes/second

Time per byte = 1 / 10⁹ = 10⁻⁹ seconds = 1 ns

Time for 2,000 bytes = 2,000 × 10⁻⁹ seconds
                     = 2 × 10⁻⁶ seconds
                     = 2 microseconds (µs)
```

---

## 5. General Design Recommendations

1. **Memory is faster than disk.** Always prefer keeping hot data in memory (cache) over reading from disk.
2. **Network I/O and disk I/O add latency.** Design systems to minimize these operations on the critical path.
3. **Compress data before sending over the network.** Network bandwidth is finite — compression reduces transfer time and cost.

---

## 6. Availability Numbers

Availability is expressed as a percentage — specifically as *nines*. The more nines, the higher the availability.

| Availability | Downtime per Year | Downtime per Month | Downtime per Week | Downtime per Day |
|---|---|---|---|---|
| 99% (2 nines) | 3.65 days | 7.31 hours | 1.68 hours | 14.40 minutes |
| 99.9% (3 nines) | 8.77 hours | 43.83 minutes | 10.08 minutes | 1.44 minutes |
| 99.99% (4 nines) | 52.60 minutes | 4.38 minutes | 1.01 minutes | 0.14 minutes |
| 99.999% (5 nines) | 5.26 minutes | 26.30 seconds | 6.05 seconds | 0.86 seconds |

### How to Calculate Downtime

```
Downtime % = 100% - Availability %
Downtime per year = (Downtime %) / 100 × 365 days
```

**Example — 99% availability:**
```
Unavailability = 1%
Annual downtime = 1/100 × 365 = 3.65 days
Monthly downtime = 3.65 / 12 × 24 hours ≈ 7.31 hours
Weekly downtime = 7.31 / 4 ≈ 1.68 hours
Daily downtime = 1.68 / 7 × 60 minutes ≈ 14.40 minutes
```

> Production systems at major companies typically target **99.9% to 99.999%** availability. The goal is always to *increase the number of nines*.

---

## 7. Worked Example — URL Shortener Capacity Estimation

### Assumptions

| Parameter | Value |
|---|---|
| URL shortening requests | 100 million per month |
| Long URL size | 500 bytes |
| Short URL size | 8 bytes |
| Metadata per URL (click count, timestamps, etc.) | 100 bytes |
| **Total storage per URL** | **~608 bytes ≈ 600 bytes** |

### Monthly Storage

```
100,000,000 URLs × 600 bytes = 60,000,000,000 bytes
                              = 60,000 MB
                              = 60 GB per month
```

### 5-Year Storage

```
60 GB/month × 12 months × 5 years = 3,600 GB = 3.6 TB
```

### Cache Size (20% of hot URLs served from memory)

```
20% of 3.6 TB = 1/5 × 3.6 TB ≈ 0.72 TB of memory needed
```

### Summary

| Resource | Estimate |
|---|---|
| Storage (5 years) | ~3.6 TB |
| Cache memory (top 20%) | ~0.72 TB |
| Requests per month | 100 million |

---

## 8. The 40-Minute Interview Cheat Sheet

Before designing any system, estimate these three dimensions:

```
┌──────────────────────────────────────────────────────┐
│              Back-of-the-Envelope Checklist           │
├──────────────────────────────────────────────────────┤
│  Compute   → Requests/second, processing complexity  │
│  Storage   → Data size × retention period            │
│  Network   → Read/write ratio, bandwidth required    │
└──────────────────────────────────────────────────────┘
```

> You don't need exact numbers. A well-reasoned approximation that uses the right units and order of magnitude is what separates strong engineers from average ones.
