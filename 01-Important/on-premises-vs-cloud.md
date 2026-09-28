# On-Premises vs On-Cloud

> A decision framework comparing self-hosted (on-premises) and cloud-hosted deployment models for the InterviewHub platform.

---

## Table of Contents

1. [Deployment Model Definitions](#1-deployment-model-definitions)
2. [Side-by-Side Comparison](#2-side-by-side-comparison)
3. [Cost Model](#3-cost-model)
4. [Security & Compliance](#4-security--compliance)
5. [Scalability & Performance](#5-scalability--performance)
6. [Operational Complexity](#6-operational-complexity)
7. [Disaster Recovery Implications](#7-disaster-recovery-implications)
8. [InterviewHub Deployment Mapping](#8-interviewhub-deployment-mapping)
9. [Hybrid Architecture Pattern](#9-hybrid-architecture-pattern)
10. [Migration Path: On-Premises → Cloud](#10-migration-path-on-premises--cloud)
11. [Decision Checklist](#11-decision-checklist)

---

## 1. Deployment Model Definitions

| Model | Description |
|---|---|
| **On-Premises (On-Prem)** | Infrastructure owned and operated by the organisation in its own data centre or server room |
| **Public Cloud** | Infrastructure rented from a cloud provider (AWS, Azure, GCP) on a pay-as-you-go basis |
| **Private Cloud** | Cloud-like infrastructure (self-service, elastic) but operated exclusively for one organisation — on-prem or co-located |
| **Hybrid Cloud** | Mix of on-premises and public cloud, with data and applications able to move between them |
| **Multi-Cloud** | Usage of two or more public cloud providers |

---

## 2. Side-by-Side Comparison

| Dimension | On-Premises | Cloud |
|---|---|---|
| **Capital expenditure** | High (servers, racks, networking) | Low (pay-as-you-go) |
| **Operational expenditure** | Low ongoing (hardware amortised) | Variable, scales with usage |
| **Time to provision** | Weeks–months | Minutes–hours |
| **Elasticity** | Manual, limited by hardware | Automatic, near-infinite |
| **Control** | Full control of hardware & OS | Shared responsibility model |
| **Physical security** | Your responsibility | Provider responsibility |
| **Network latency** | Very low (internal) | Higher (internet hops), reducible with CDN/edge |
| **Compliance** | Easier for strict data residency | Depends on provider certifications |
| **Vendor lock-in** | None | Risk of provider-specific APIs |
| **Maintenance burden** | Very high (patching, hardware) | Low (managed services) |
| **Global distribution** | Hard/expensive | Easy (multi-region in minutes) |
| **Uptime SLA** | Self-determined | 99.9–99.99% guaranteed by provider |

---

## 3. Cost Model

### 3.1 On-Premises Total Cost of Ownership (TCO)

```
Capital Costs (one-time):
  - Server hardware          $5,000–$20,000 per node
  - Networking equipment     $2,000–$10,000
  - UPS / power redundancy   $1,000–$5,000
  - Rack + cooling           $500–$2,000

Operating Costs (annual):
  - Power + cooling          ~$1,000–$3,000 per server
  - Hardware maintenance     ~10–15% of hardware cost/year
  - IT staff time            40–200 hrs/year per server
  - Software licences        varies

Hidden Costs:
  - Hardware refresh (every 3–5 years)
  - Downtime during maintenance
  - Scaling requires upfront purchase
```

### 3.2 Cloud Cost Model (AWS Example for InterviewHub)

```
Monthly Estimate (small production):
  - EC2 t3.small (backend)        ~$15/month
  - EC2 t3.micro (Nginx)          ~$8/month
  - MongoDB Atlas M10             ~$57/month
  - S3 backups (50 GB)            ~$1.15/month
  - Data transfer (10 GB/month)   ~$0.90/month
                                  ────────────
  Total                           ~$82/month (~$984/year)

No upfront hardware cost.
Scale to 10x: ~$400/month (auto-scaling).
```

### 3.3 Break-Even Analysis

```
Year  │  On-Prem Cumulative Cost  │  Cloud Cumulative Cost
──────┼───────────────────────────┼────────────────────────
  1   │  $30,000 (capex + setup)  │  $984
  2   │  $33,000                  │  $1,968
  3   │  $36,000                  │  $2,952
  5   │  $40,000                  │  $4,920

On-prem is only cost-competitive at very high, stable, sustained workloads.
```

---

## 4. Security & Compliance

### 4.1 On-Premises Security

| Advantage | Consideration |
|---|---|
| Full physical control | You are solely responsible for physical security |
| Data never leaves your network | VPN/firewall configuration is your responsibility |
| No shared hardware | Patching OS, firmware is your responsibility |
| Easier regulatory compliance for strict data residency | Audits are your responsibility |

### 4.2 Cloud Security

| Advantage | Consideration |
|---|---|
| Provider manages physical security, DDoS protection | Shared responsibility model — misconfigurations are common breach vector |
| Compliance certifications (ISO 27001, SOC 2, PCI-DSS) | Data is stored on provider infrastructure |
| Built-in encryption at rest and in transit | IAM policies must be correctly configured |
| WAF, Shield, GuardDuty available out of the box | Vendor access to your data (legal obligation) |

### 4.3 Data Residency

Some regulations (GDPR, financial regulations) require data to remain in a specific geographic region:

| Requirement | On-Prem | Cloud |
|---|---|---|
| EU data residency | Naturally met if servers are in EU | Select EU region (e.g. eu-west-1) |
| Audit logs | Must build yourself | CloudTrail, Azure Monitor available |
| Right to erasure | Simpler — direct DB control | Must trust provider deletion guarantees |

---

## 5. Scalability & Performance

### 5.1 Vertical Scaling

```
On-Premises:              Cloud:
Buy bigger server         Resize instance in minutes
(lead time: weeks)        (downtime: seconds for resize)
```

### 5.2 Horizontal Scaling

```
On-Premises:                       Cloud:
  1. Order servers                   1. Define Auto Scaling Group
  2. Rack and cable                  2. Set min/max/desired count
  3. Configure OS                    3. Attach load balancer
  4. Deploy application              → scales automatically on CPU/memory threshold
  (weeks of lead time)
```

### 5.3 InterviewHub Scaling Path on Cloud

```
Single instance (dev/staging)
        │
        ▼
Auto Scaling Group (production)
  ├── EC2 instances (Node.js backend)  ← horizontal scale-out
  ├── Application Load Balancer        ← distributes HTTP traffic
  ├── ElastiCache (Redis)              ← session / rate-limit store
  └── MongoDB Atlas (M30+ cluster)    ← horizontal sharding if needed
```

---

## 6. Operational Complexity

| Task | On-Premises | Cloud |
|---|---|---|
| OS patching | Manual, scheduled maintenance window | Managed (e.g. AWS SSM Patch Manager) |
| SSL certificate renewal | Manual (Let's Encrypt or manual CA) | Automatic (ACM) |
| Load balancer setup | Physical hardware or HAProxy setup | Configure ALB in 5 minutes |
| Database backups | Script + cron + offsite storage | Automated (Atlas, RDS, etc.) |
| Monitoring | Install Prometheus + Grafana manually | CloudWatch / Datadog out-of-the-box |
| Log aggregation | ELK stack setup | CloudWatch Logs / Papertrail |
| CI/CD pipeline | Jenkins on-prem | GitHub Actions → ECR → ECS |
| Disaster recovery | Build and maintain yourself | Multi-AZ + automated failover |

**Rule of thumb:** Cloud reduces operational toil for small-to-mid teams. On-prem makes sense only when the team has dedicated infrastructure engineers.

---

## 7. Disaster Recovery Implications

| DR Aspect | On-Premises | Cloud |
|---|---|---|
| Backup storage | Must provision off-site storage manually | S3 / Blob Storage (pay-per-GB) |
| Failover region | Second data centre = high cost | Click to enable multi-region replication |
| RTO | Hours (rebuild physical hardware) | Minutes (launch from AMI/snapshot) |
| RPO | Depends on backup frequency | Near-zero with managed DB replication |

See [`docs/disaster-recovery.md`](disaster-recovery.md) for detailed runbooks.

---

## 8. InterviewHub Deployment Mapping

### Development / Local

```
Deployment: On-Premises (developer laptop)
Tools:      Docker Compose
MongoDB:    Local container (single node, no replica set)
Backups:    Not required
```

### Staging

```
Deployment: Cloud (AWS or GCP free tier / low-cost)
Tools:      Docker Compose on single VM, or ECS
MongoDB:    Atlas M0 (free tier) or M10
Backups:    Daily snapshot to S3
```

### Production

```
Deployment: Cloud (AWS)
Tools:      ECS Fargate (backend), S3 + CloudFront (frontend)
MongoDB:    Atlas M30+ (dedicated, 3-node replica set)
Backups:    Atlas PITR (35-day retention) + weekly Glacier archive
Scaling:    ECS auto-scaling, Atlas auto-scaling
DR:         Atlas multi-region cluster or Atlas Global Clusters
```

---

## 9. Hybrid Architecture Pattern

Some organisations keep **sensitive data on-prem** while running stateless compute in the cloud:

```
Cloud (AWS)                          On-Premises
──────────────────────────           ──────────────────────────
  Angular SPA (CloudFront)           MongoDB (primary)
  Node.js API (ECS Fargate)  ←────→  PII data store
  API Gateway                        Compliance-regulated data
  WAF / Shield                       Audit logs
                                     Key Management (HSM)
```

**Trade-offs:**
- Latency between cloud API and on-prem DB (typically 1–5ms on private line)
- Requires AWS Direct Connect or VPN tunnel
- Complex networking but satisfies strict data residency rules

---

## 10. Migration Path: On-Premises → Cloud

### Phase 1 — Lift and Shift (Rehost)

Move existing Docker Compose stack to a cloud VM with minimal changes:
```
On-prem Docker host  →  AWS EC2 instance (same docker-compose.yml)
```
Fastest migration, minimal risk, little optimisation.

### Phase 2 — Replatform

Replace self-managed components with managed cloud services:
```
Self-managed MongoDB   →  MongoDB Atlas (managed)
Self-managed Nginx     →  CloudFront + ALB (managed)
Self-managed backups   →  Atlas automated PITR
```

### Phase 3 — Refactor (Cloud-Native)

Redesign for cloud-native patterns:
```
Monolithic Express     →  Serverless functions (Lambda) or microservices (ECS)
Single MongoDB cluster →  Sharded Atlas Global Cluster
Local sessions         →  ElastiCache (Redis)
File uploads           →  S3 presigned URLs
Cron jobs              →  EventBridge Scheduler
```

---

## 11. Decision Checklist

Use this checklist when evaluating on-prem vs cloud for a project:

**Choose Cloud when:**
- [ ] Team size < 20 engineers (not enough ops capacity for on-prem)
- [ ] Need to scale quickly or unpredictably
- [ ] Time-to-market is a priority
- [ ] No strict data residency constraints (or cloud region satisfies them)
- [ ] Budget prefers OpEx over CapEx
- [ ] Global user base requires CDN / edge delivery

**Choose On-Premises when:**
- [ ] Strict regulatory data residency that cloud regions cannot satisfy
- [ ] Very high, stable, predictable workload (cloud OpEx exceeds hardware TCO)
- [ ] Air-gapped environment required (government, defence)
- [ ] Existing dedicated infrastructure team
- [ ] Sensitive classified data that cannot leave physical control

**Choose Hybrid when:**
- [ ] Sensitive PII / regulated data must stay on-prem
- [ ] Compute workloads can run in cloud for elasticity
- [ ] Need DR across on-prem and cloud regions
