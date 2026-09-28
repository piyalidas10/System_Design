# DB Persistence & Backup

> How InterviewHub persists MongoDB data reliably and how it is backed up, restored, and protected against loss.

---

## Table of Contents

1. [What Is DB Persistence?](#1-what-is-db-persistence)
2. [Docker Volume Strategy](#2-docker-volume-strategy)
3. [MongoDB Write Durability](#3-mongodb-write-durability)
4. [Backup Types](#4-backup-types)
5. [Backup Tools](#5-backup-tools)
6. [Backup Schedule and Retention Policy](#6-backup-schedule-and-retention-policy)
7. [Automated Backup Script](#7-automated-backup-script)
8. [Restore Procedures](#8-restore-procedures)
9. [Offsite & Cloud Backup Storage](#9-offsite--cloud-backup-storage)
10. [Monitoring Backup Health](#10-monitoring-backup-health)
11. [Backup Security](#11-backup-security)

---

## 1. What Is DB Persistence?

**Persistence** means data survives beyond the lifetime of any individual process or container. Without persistence:

- Stopping or recreating a Docker container would erase all data.
- A crash would lose all writes since the last fsync.

In InterviewHub, persistence is achieved at two levels:

| Level | Mechanism |
|---|---|
| **Container level** | Docker named volume maps `/data/db` to host disk |
| **Process level** | MongoDB journaling ensures writes survive crashes |

---

## 2. Docker Volume Strategy

### 2.1 Named Volume (Production Pattern)

```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongo:7.0
    volumes:
      - mongodb_data:/data/db   # named volume — persists across container recreates
    restart: always

volumes:
  mongodb_data:
    driver: local               # stored at /var/lib/docker/volumes/…_mongodb_data/
```

**Why a named volume over a bind mount?**

| Named Volume | Bind Mount |
|---|---|
| Managed by Docker | Managed by host OS |
| Portable across machines (with export) | Tied to a specific host path |
| Correct permissions set automatically | Permissions may conflict |
| Backed up via `docker volume export` | Backed up via standard file copy |

### 2.2 Volume Inspection

```bash
# Inspect where the volume lives on disk
docker volume inspect interviewhub_mongodb_data

# Output:
# "Mountpoint": "/var/lib/docker/volumes/interviewhub_mongodb_data/_data"
```

### 2.3 ⚠️ `docker compose down -v` Warning

```bash
docker compose down       # ✅ stops containers, KEEPS volumes
docker compose down -v    # ❌ stops containers AND DELETES volumes — data loss!
```

**Never run `docker compose down -v` in production.**

---

## 3. MongoDB Write Durability

### 3.1 Journaling

MongoDB uses a **Write-Ahead Log (WAL)** called the journal:

```
Application write
      │
      ▼
  In-memory WiredTiger cache
      │
      ├──► Journal (disk, synced every 100ms by default)
      │
      └──► Data files (flushed periodically as checkpoints)
```

On crash, MongoDB replays the journal on restart — **no data loss** for committed writes.

### 3.2 Write Concern

Write concern controls when MongoDB acknowledges a write:

| Write Concern | Meaning | Durability |
|---|---|---|
| `w: 0` | Fire and forget | None (may lose data) |
| `w: 1` | Acknowledged by primary | Survives primary crash (journal) |
| `w: 'majority'` | Acknowledged by majority of replica set | Survives primary failure + failover |
| `j: true` | Written to journal before ack | Survives process crash |

**InterviewHub default (Mongoose):**

```js
// config/db.js
mongoose.connect(MONGODB_URI, {
  writeConcern: { w: 'majority', j: true }
});
```

This ensures every write is journaled and replicated before the application receives an acknowledgement.

---

## 4. Backup Types

| Type | Description | Restore Granularity |
|---|---|---|
| **Logical backup** (`mongodump`) | BSON export of collections | Collection or document level |
| **Physical backup** | Raw copy of WiredTiger data files | Entire database instance |
| **Snapshot backup** | Volume/disk snapshot (LVM, EBS, etc.) | Point-in-time, entire disk |
| **Continuous backup** (oplog tailing) | Stream of every write operation | Any point in time |

### When to Use Each

```
Logical (mongodump)
  ✓ Small–medium databases
  ✓ Need selective collection restore
  ✓ Cross-version migration
  ✗ Slow on large datasets

Physical / Snapshot
  ✓ Large databases (fast)
  ✓ Full instance recovery
  ✗ Must stop writes or use replica secondary

Continuous (oplog)
  ✓ Minimal RPO (seconds)
  ✓ Point-in-time recovery
  ✗ Requires replica set
  ✗ Complex operational overhead
```

---

## 5. Backup Tools

| Tool | Type | Notes |
|---|---|---|
| `mongodump` / `mongorestore` | Logical | Built into MongoDB tools; simple CLI |
| `mongodump --oplog` | Logical + oplog | Consistent snapshot + replay capability |
| `docker volume export` | Physical (volume) | Docker-native; exports volume as tar |
| AWS EBS Snapshot | Physical (cloud) | Instant, no downtime when using secondary |
| MongoDB Atlas Backup | Managed | PITR up to 35 days; cloud-only |

### `mongodump` Example

```bash
# Dump entire database
mongodump \
  --uri="mongodb://localhost:27017/interviewhub" \
  --out="/backups/$(date +%Y-%m-%d_%H-%M-%S)"

# Dump with oplog for consistent snapshot
mongodump \
  --uri="mongodb://localhost:27017/interviewhub" \
  --oplog \
  --out="/backups/$(date +%Y-%m-%d_%H-%M-%S)"

# Compress output
mongodump \
  --uri="mongodb://localhost:27017/interviewhub" \
  --gzip \
  --archive="/backups/interviewhub-$(date +%Y-%m-%d).gz"
```

---

## 6. Backup Schedule and Retention Policy

| Backup | Frequency | Retention | Storage Tier |
|---|---|---|---|
| **Daily full** | 02:00 UTC | 30 days | Standard (S3 / local NAS) |
| **Weekly archive** | Sunday 04:00 UTC | 1 year | Cold storage (Glacier / tape) |
| **Pre-deployment** | Before every production deploy | 14 days | Standard |
| **On-demand** | Before schema migrations | 30 days | Standard |

### Retention Calculation Example

```
30 daily backups  × ~500 MB each  = ~15 GB
4 weekly archives × ~500 MB each  = ~2 GB
                                   ─────────
Total rolling storage              ~17 GB
```

---

## 7. Automated Backup Script

```bash
#!/bin/bash
# scripts/backup-mongodb.sh

set -euo pipefail

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"
RETENTION_DAYS=30
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/interviewhub}"

echo "[$(date)] Starting backup to ${BACKUP_PATH}"

# Create backup
mongodump \
  --uri="${MONGODB_URI}" \
  --gzip \
  --archive="${BACKUP_PATH}.gz"

echo "[$(date)] Backup complete: ${BACKUP_PATH}.gz"

# Upload to S3 (optional)
if [ -n "${S3_BUCKET:-}" ]; then
  aws s3 cp "${BACKUP_PATH}.gz" "s3://${S3_BUCKET}/mongodb/${DATE}.gz"
  echo "[$(date)] Uploaded to S3: s3://${S3_BUCKET}/mongodb/${DATE}.gz"
fi

# Prune old backups
find "${BACKUP_DIR}" -name "*.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"
```

**Schedule with cron:**

```cron
# /etc/cron.d/interviewhub-backup
0 2 * * * root /opt/interviewhub/scripts/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## 8. Restore Procedures

### 8.1 Restore from `mongodump` Archive

```bash
# Stop the backend to prevent writes
docker compose stop backend

# Restore from compressed archive
mongorestore \
  --uri="mongodb://localhost:27017/interviewhub" \
  --gzip \
  --archive="/backups/mongodb/2024-01-15_02-00-00.gz" \
  --drop   # drops existing collections before restoring

# Restart backend
docker compose start backend

# Verify
curl http://localhost:3000/health
```

### 8.2 Restore Specific Collection Only

```bash
mongorestore \
  --uri="mongodb://localhost:27017/interviewhub" \
  --gzip \
  --archive="/backups/mongodb/2024-01-15_02-00-00.gz" \
  --nsInclude="interviewhub.users" \
  --drop
```

### 8.3 Point-in-Time Restore (with oplog)

```bash
# Step 1: Restore the base snapshot
mongorestore \
  --uri="mongodb://localhost:27017/interviewhub" \
  --gzip \
  --archive="/backups/mongodb/2024-01-15_02-00-00.gz" \
  --oplogReplay

# Step 2: Replay oplog up to a specific timestamp
# Timestamp format: <seconds>:<ordinal>  e.g. 1705312800:1
mongorestore \
  --uri="mongodb://localhost:27017/interviewhub" \
  --oplogReplay \
  --oplogLimit="1705330000:1" \
  /backups/oplog/
```

---

## 9. Offsite & Cloud Backup Storage

### Why Offsite?

A backup on the **same machine** as the database provides no protection against:
- Disk failure
- Host machine destruction (fire, flood)
- Cloud region outage

### S3-Compatible Storage Configuration

```bash
# AWS CLI configuration for backup uploads
aws configure set aws_access_key_id     "${AWS_ACCESS_KEY_ID}"
aws configure set aws_secret_access_key "${AWS_SECRET_ACCESS_KEY}"
aws configure set default.region        "us-east-1"

# S3 bucket lifecycle policy — auto-transition to Glacier after 30 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket interviewhub-backups \
  --lifecycle-configuration file://s3-lifecycle.json
```

```json
// s3-lifecycle.json
{
  "Rules": [{
    "ID": "archive-to-glacier",
    "Status": "Enabled",
    "Transitions": [{
      "Days": 30,
      "StorageClass": "GLACIER"
    }],
    "Expiration": { "Days": 365 }
  }]
}
```

---

## 10. Monitoring Backup Health

Backups must be **actively monitored**. A silent backup failure is catastrophic.

### Checks to Automate

| Check | Method | Alert If |
|---|---|---|
| Backup completed | Healthcheck endpoint or sentinel file | No completion in 25 hours |
| Backup file size | Compare to previous day ± 20% | Size drops dramatically |
| Restore test | Monthly automated restore to staging | Restore fails or data is inconsistent |
| S3 upload success | AWS CloudWatch metric | PutObject fails |

### Simple Backup Healthcheck

```bash
# Append to backup script — alerts if last backup is > 25 hours old
LAST_BACKUP=$(find /backups/mongodb -name "*.gz" -mmin -1500 | wc -l)
if [ "$LAST_BACKUP" -eq 0 ]; then
  echo "ALERT: No backup found in the last 25 hours!" | \
    mail -s "Backup Failure - InterviewHub" ops@example.com
fi
```

---

## 11. Backup Security

| Concern | Control |
|---|---|
| **Unauthorised access** | S3 bucket private, IAM policy restricts access to backup role only |
| **Data in transit** | TLS enforced for all S3 uploads; `mongodump` over TLS-enabled connection |
| **Data at rest** | S3 server-side encryption (SSE-S3 or SSE-KMS) |
| **Backup of sensitive data** | Backups contain hashed passwords only; PII shredding applies to backups too |
| **Access logging** | S3 access logs enabled; reviewed monthly |
| **Key rotation** | AWS KMS key auto-rotated annually |
