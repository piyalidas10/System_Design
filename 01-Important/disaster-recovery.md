# Disaster Recovery (DR)

> Strategies, objectives, and runbooks for recovering the InterviewHub platform from failures, data loss, or catastrophic events.

---

## Table of Contents

1. [What Is Disaster Recovery?](#1-what-is-disaster-recovery)
2. [Key Metrics — RTO and RPO](#2-key-metrics--rto-and-rpo)
3. [Failure Taxonomy](#3-failure-taxonomy)
4. [DR Tiers](#4-dr-tiers)
5. [Architecture Resilience Points](#5-architecture-resilience-points)
6. [MongoDB DR Strategy](#6-mongodb-dr-strategy)
7. [Application-Layer DR](#7-application-layer-dr)
8. [Runbook — MongoDB Restore](#8-runbook--mongodb-restore)
9. [Runbook — Full Environment Rebuild](#9-runbook--full-environment-rebuild)
10. [DR Testing Schedule](#10-dr-testing-schedule)
11. [Incident Response Flow](#11-incident-response-flow)

---

## 1. What Is Disaster Recovery?

Disaster Recovery (DR) is the **set of policies, tools, and procedures** to enable the recovery of critical systems after a disruptive event. It answers two questions:

- **How quickly can we be back online?** → Recovery Time Objective (RTO)
- **How much data can we afford to lose?** → Recovery Point Objective (RPO)

---

## 2. Key Metrics — RTO and RPO

| Metric | Definition | InterviewHub Target |
|---|---|---|
| **RTO** (Recovery Time Objective) | Maximum tolerable downtime | < 1 hour (dev/staging), < 4 hours (production) |
| **RPO** (Recovery Point Objective) | Maximum tolerable data loss | < 15 minutes |
| **MTTR** (Mean Time to Recover) | Average time to restore service | < 30 minutes for known failure modes |
| **MTBF** (Mean Time Between Failures) | Average uptime between incidents | Target: > 720 hours (30 days) |

```
Timeline of a failure event:

  [Failure occurs]
        │
        ├──── Detection time  (monitoring alert fires)
        │
        ├──── Decision time   (triage, escalation)
        │
        ├──── Recovery time   (runbook execution)
        │
  [Service restored]
        ◄────────────────────────────────────────►
                         RTO window
```

---

## 3. Failure Taxonomy

| Category | Example | Severity |
|---|---|---|
| **Infrastructure** | Docker host crash, disk full | High |
| **Application** | Bad deploy, memory leak, crash loop | Medium–High |
| **Database** | Corruption, accidental collection drop | Critical |
| **Network** | DNS failure, firewall misconfiguration | High |
| **Security** | Ransomware, data breach, credential theft | Critical |
| **Human error** | Dropped table, wrong env deployment | Medium–Critical |
| **Dependency** | npm package yanked, registry outage | Low–Medium |

---

## 4. DR Tiers

| Tier | Strategy | RTO | RPO | Cost |
|---|---|---|---|---|
| **Hot Standby** | Live replica, instant failover | Seconds | ~0 | High |
| **Warm Standby** | Replica in standby, promoted on failure | Minutes | < 5 min | Medium |
| **Cold Standby** | Restore from latest backup | Hours | Backup interval | Low |
| **Pilot Light** | Minimal running replica, scale on failure | 15–30 min | < backup interval | Low–Medium |

**InterviewHub (production) targets Warm Standby for MongoDB using a replica set.**

---

## 5. Architecture Resilience Points

```
Browser
    │
    ▼
[ Load Balancer / CDN ]  ← point of redundancy
    │
    ▼
[ Nginx / Frontend ]     ← stateless; re-deploy in < 5 min from image
    │
    ▼
[ Express API ]          ← stateless; horizontal scaling, restart policy
    │
    ▼
[ MongoDB Replica Set ]  ← PRIMARY + 2 SECONDARIES  (hot standby)
    │
    ├── Primary:   accepts reads + writes
    ├── Secondary: replicates ops from oplog
    └── Secondary: also used for analytics reads (readPreference: secondary)
```

**Stateless services** (Nginx, Express) can be destroyed and re-created from Docker images without data loss. **MongoDB** is the sole stateful component and is the primary DR target.

---

## 6. MongoDB DR Strategy

### 6.1 Replica Set Configuration

```yaml
# docker-compose.yml (production-grade)
services:
  mongo-primary:
    image: mongo:7.0
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo_primary_data:/data/db

  mongo-secondary-1:
    image: mongo:7.0
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo_secondary1_data:/data/db

  mongo-secondary-2:
    image: mongo:7.0
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo_secondary2_data:/data/db
```

**Automatic failover:** If the primary goes down, the secondaries hold an election and promote a new primary within ~10 seconds.

### 6.2 Oplog-Based Point-in-Time Recovery

MongoDB's **oplog** (operations log) records every write operation. Combined with a base snapshot, it enables restore to any point in time:

```
Base snapshot (e.g. 02:00 daily)
      +
Oplog replay from 02:00 → 14:37
      =
Database state at 14:37  (RPO: ~seconds)
```

### 6.3 Backup Schedule

| Backup Type | Frequency | Retention | Storage |
|---|---|---|---|
| Full snapshot | Daily 02:00 UTC | 30 days | Off-site (S3 / Backblaze) |
| Oplog continuous | Real-time | 7 days | Same region |
| Weekly archive | Sunday 04:00 UTC | 1 year | Cold storage (Glacier) |

---

## 7. Application-Layer DR

### 7.1 Graceful Shutdown

[`server.js`](../backend/src/server.js) already implements graceful shutdown:

```js
process.on('SIGTERM', async () => {
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
});
```

This ensures in-flight requests complete before the container stops, preventing data corruption during rolling restarts.

### 7.2 Docker Restart Policies

```yaml
services:
  backend:
    restart: unless-stopped   # auto-restart on crash
  mongodb:
    restart: always           # always restart, even after host reboot
```

### 7.3 Health Probe Integration

The platform exposes `/health`, `/ready`, and `/live` endpoints. Orchestrators (Docker Swarm, Kubernetes) use these to:
- Restart unhealthy containers automatically
- Gate traffic until the service is ready

---

## 8. Runbook — MongoDB Restore

**Trigger:** Primary and all secondaries unavailable, or accidental data destruction.

```bash
# Step 1: Identify the latest clean snapshot
ls -lth /backups/mongodb/ | head -5

# Step 2: Stop the backend to prevent writes during restore
docker compose stop backend

# Step 3: Drop the corrupted data volume
docker compose down
docker volume rm interviewhub_mongodb_data

# Step 4: Re-create the volume and restore snapshot
docker volume create interviewhub_mongodb_data
docker run --rm \
  -v interviewhub_mongodb_data:/data/db \
  -v /backups/mongodb:/backup \
  mongo:7.0 \
  mongorestore --drop /backup/latest/

# Step 5: If point-in-time recovery needed, replay oplog
mongorestore --oplogReplay --oplogLimit <timestamp> /backup/latest/

# Step 6: Restart services
docker compose up -d

# Step 7: Verify data integrity
docker compose exec backend node scripts/healthcheck.js

# Step 8: Re-enable traffic / remove maintenance page
```

**Estimated time:** 15–45 minutes depending on database size.

---

## 9. Runbook — Full Environment Rebuild

**Trigger:** Host machine destroyed, cloud region outage, catastrophic failure.

```bash
# Step 1: Provision new host (VM, EC2, etc.)
# Step 2: Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh

# Step 3: Clone the repository
git clone https://github.com/your-org/interviewhub.git
cd interviewhub

# Step 4: Restore .env from secrets manager (e.g. AWS Secrets Manager)
aws secretsmanager get-secret-value --secret-id interviewhub/prod > .env

# Step 5: Pull images (or build if no registry)
docker compose pull
# or
docker compose build

# Step 6: Start services (without MongoDB data)
docker compose up -d mongodb

# Step 7: Restore database from latest backup (see Runbook 8)

# Step 8: Start remaining services
docker compose up -d

# Step 9: Smoke test
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

**Estimated time:** 30–60 minutes.

---

## 10. DR Testing Schedule

| Test Type | Frequency | What Is Tested |
|---|---|---|
| **Backup restore drill** | Monthly | Restore snapshot to staging, verify data integrity |
| **Failover test** | Quarterly | Kill primary MongoDB node, verify secondary election |
| **Full rebuild test** | Bi-annually | Rebuild entire environment from scratch on new host |
| **Runbook walk-through** | After every incident | Update runbooks with lessons learned |

> **Rule:** A backup that has never been tested is not a backup — it is an assumption.

---

## 11. Incident Response Flow

```
Alert fires (monitoring / user report)
          │
          ▼
     Triage
     ├── Is the service partially or fully down?
     ├── Is data corrupted or lost?
     └── Is it a security incident?
          │
          ▼
     Declare Incident (severity P1–P4)
          │
          ▼
     Execute Runbook
     ├── P1/P2 → page on-call engineer immediately
     ├── P3    → resolve within business hours
     └── P4    → schedule fix in next sprint
          │
          ▼
     Restore Service
          │
          ▼
     Post-Mortem (within 48 h for P1/P2)
     ├── Timeline of events
     ├── Root cause analysis
     ├── Action items (with owners + deadlines)
     └── Runbook updates
```

### Severity Levels

| Level | Description | Response Time |
|---|---|---|
| **P1** | Full outage, data loss, security breach | Immediate (< 15 min) |
| **P2** | Major feature unavailable, degraded performance | < 1 hour |
| **P3** | Minor feature broken, workaround exists | < 8 hours |
| **P4** | Cosmetic issue, low impact | Next sprint |
