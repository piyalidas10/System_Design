# Availability and Resilience

## Layer Overview

| Layer        | Banking Security Approach                                  |
| ------------ | ---------------------------------------------------------- |
| Availability | Multiple nodes/zones + backups + disaster recovery         |

---

## 1. Why Availability is a Security Property

In banking, unavailability is not just an operational problem — it is a security and regulatory problem. Core banking services and payment systems must meet strict uptime SLAs. Denial of service (DDoS), hardware failure, misconfiguration, and disasters are all threats to availability.

### Availability Targets
| Service                      | Target Uptime | Max Downtime/Year  |
| ---------------------------- | ------------- | ------------------ |
| Core payment processing      | 99.99%        | ~52 minutes        |
| Internet banking / mobile    | 99.9%         | ~8.7 hours         |
| Batch processing / reporting | 99.5%         | ~43 hours          |

---

## 2. Multiple Nodes and Zones

Single-node or single-zone deployments create single points of failure. Banking Kubernetes clusters must be distributed.

### Node-Level Redundancy
- Minimum **3 worker nodes** per workload type.
- Use **Pod Disruption Budgets (PDBs)** to ensure deployments survive node maintenance.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payments-pdb
  namespace: payments
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: payment-service
```

### Zone-Level Redundancy (Multi-AZ)
- Spread nodes across **at least 3 availability zones**.
- Use `topologySpreadConstraints` to ensure pods are distributed across zones.

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: payment-service
```

### Control Plane HA
- Kubernetes control plane should run across multiple AZs (EKS, GKE, AKS all handle this automatically in managed offerings).
- etcd should have **3 or 5 members** (odd number for quorum).

---

## 3. Backups

Backups must be automated, tested, encrypted, and stored off-site.

### What to Back Up
| Resource                     | Backup Tool / Method                        | Frequency       |
| ---------------------------- | ------------------------------------------- | --------------- |
| Database (RDS/Cloud SQL)     | Automated snapshots + PITR                  | Continuous PITR |
| Kubernetes cluster state     | Velero (etcd snapshot + PV backup)          | Daily           |
| Persistent volumes           | Velero with CSI volume snapshots            | Daily           |
| Secrets (Vault)              | Vault DR replication / snapshot             | Hourly          |
| Application configuration   | GitOps repo (source of truth)               | Continuous      |

### Velero — Kubernetes Backup
```bash
# Install Velero with AWS S3 backend
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket banking-k8s-backups \
  --backup-location-config region=ap-south-1 \
  --use-volume-snapshots=true \
  --secret-file ./credentials-velero

# Create a daily scheduled backup
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces payments,accounts,notifications \
  --ttl 720h
```

### Backup Validation
- **Monthly restoration drills**: Restore from backup to a staging cluster and verify application behaviour.
- **Automated integrity checks**: Verify backup checksums after each backup completes.
- Backups are stored in **cross-region / off-site** storage to survive regional disasters.

---

## 4. Disaster Recovery

### DR Strategies
| Strategy           | RTO          | RPO         | Cost   | Use Case                        |
| ------------------ | ------------ | ----------- | ------ | ------------------------------- |
| Backup & Restore   | Hours        | Hours       | Low    | Non-critical batch workloads    |
| Pilot Light        | 10–30 min    | Minutes     | Medium | Secondary banking systems       |
| Warm Standby       | < 5 min      | Seconds     | High   | Internet banking                |
| Active-Active      | Near-zero    | Near-zero   | Highest| Core payment processing         |

**RTO** = Recovery Time Objective (how fast must we recover?)
**RPO** = Recovery Point Objective (how much data can we lose?)

### DR for Core Banking Kubernetes Workloads

```
Primary Region (ap-south-1)          DR Region (ap-south-2)
┌─────────────────────┐              ┌─────────────────────┐
│  EKS Cluster        │              │  EKS Cluster        │
│  (Active)           │◄── Sync ────►│  (Standby / Active) │
│                     │              │                     │
│  RDS Aurora (Write) │──Replication►│  RDS Aurora (Read)  │
│                     │              │                     │
│  Velero backups ────┼──────────────┼──► S3 Cross-Region  │
└─────────────────────┘              └─────────────────────┘
         │                                      │
         └──────────── Route 53 / GLB ──────────┘
                    (failover routing)
```

### Runbook: Failover to DR
1. Detect failure (automated monitoring alert or manual trigger).
2. Promote DR database replica to primary.
3. Update DNS/traffic routing to DR cluster.
4. Verify application health checks pass.
5. Notify regulatory body if downtime exceeds threshold (per RBI guidelines).
6. Document the event, initiate incident review.

---

## 5. DDoS Protection

| Layer              | Protection                                          |
| ------------------ | --------------------------------------------------- |
| Network            | AWS Shield / Google Cloud Armor / Azure DDoS        |
| Application (WAF)  | Rate limiting, geo-blocking, bot detection          |
| DNS                | Anycast DNS, DDoS-resilient DNS provider            |
| Kubernetes ingress | Rate limiting annotations, connection limits        |

---

## Compliance Mapping

| Control                  | Standard                              |
| ------------------------ | ------------------------------------- |
| High availability        | RBI IT Framework, ISO 27001 A.17.1   |
| Backups                  | PCI DSS 12.3.4, ISO 27001 A.12.3    |
| Disaster recovery        | RBI BCMS guidelines, SOC 2 A1.3      |
| DR testing               | PCI DSS 12.3.4, RBI requirements     |

---

## References
- [Velero — Kubernetes Backup](https://velero.io/)
- [AWS Well-Architected — Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
- [RBI Business Continuity Management](https://www.rbi.org.in/)
- [NIST SP 800-34 — Contingency Planning Guide](https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final)
