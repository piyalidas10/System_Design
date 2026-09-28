# Monitoring and Security Operations

## Layer Overview

| Layer      | Banking Security Approach                        |
| ---------- | ------------------------------------------------ |
| Monitoring | SIEM + audit logs + runtime monitoring           |

---

## 1. SIEM (Security Information and Event Management)

A SIEM aggregates logs and events from across the banking infrastructure, correlates them for threat patterns, and triggers alerts. It is the central nervous system of the security operations centre (SOC).

### SIEM Data Sources in Banking
| Source                        | Log Types                                      |
| ----------------------------- | ---------------------------------------------- |
| Kubernetes API audit logs     | API access, RBAC changes, pod exec             |
| Application logs              | Auth events, transaction errors, access denied |
| Cloud provider logs           | CloudTrail, Cloud Audit Logs, Activity Log     |
| Network flow logs             | VPC flow logs, firewall allow/deny             |
| Database audit logs           | Query logs, auth failures, schema changes      |
| Container runtime (Falco)     | Syscall anomalies, file access violations      |
| Authentication provider       | Login events, MFA failures, token issuance     |

### Common SIEM Platforms
| Platform             | Deployment Model          |
| -------------------- | ------------------------- |
| IBM QRadar           | On-premises / SaaS        |
| Splunk               | On-premises / Cloud       |
| Elastic Security     | Self-managed / Elastic Cloud |
| Google Chronicle     | Cloud-native (GCP)        |
| Microsoft Sentinel   | Cloud-native (Azure)      |
| AWS Security Hub     | AWS-native aggregator     |

### Kubernetes Log Shipping to SIEM
```yaml
# Fluent Bit DaemonSet — ship container logs to SIEM
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        multiline.parser  docker, cri
        Tag               kube.*
        Refresh_Interval  5

    [FILTER]
        Name    kubernetes
        Match   kube.*
        Merge_Log On

    [OUTPUT]
        Name  splunk
        Match *
        Host  splunk.bank.example.com
        Port  8088
        TLS   On
        Splunk_Token ${SPLUNK_HEC_TOKEN}
```

---

## 2. Audit Logs

Audit logs provide an immutable record of who did what, when, and from where. In banking, audit logs are both a security control and a regulatory requirement.

### What Must Be Audited
| Category                  | Events                                                     |
| ------------------------- | ---------------------------------------------------------- |
| Authentication            | Login success/failure, MFA events, session creation        |
| Authorisation             | Access denied, privilege escalation attempts               |
| Data access               | SELECT on sensitive tables (PAN, accounts), bulk exports   |
| Configuration changes     | RBAC changes, firewall rule changes, secret updates        |
| Deployment events         | Image deployments, config changes in Kubernetes            |
| Financial transactions    | All payment initiations, approvals, rejections             |

### Audit Log Requirements
| Property           | Requirement                                              |
| ------------------ | -------------------------------------------------------- |
| Immutability       | Write-once storage (S3 Object Lock, Worm storage)        |
| Integrity          | Hash-chained logs or digital signatures                  |
| Timestamps         | UTC with millisecond precision, NTP-synchronised         |
| Retention          | 1 year online, 7 years archived                         |
| Access control     | Audit logs readable by security/compliance team only     |
| Alerting           | Real-time alerts for critical events (see below)         |

### Critical Audit Alerts
```yaml
# Example: Falco rule — detect shell in container
- rule: Terminal Shell in Container
  desc: A shell was used in a container
  condition: >
    spawned_process and container
    and shell_procs and proc.tty != 0
    and not user_expected_terminal_shell_in_container_conditions
  output: >
    A shell was spawned in a container
    (user=%user.name container=%container.name image=%container.image.repository)
  priority: WARNING
  tags: [container, shell, T1059]
```

---

## 3. Runtime Monitoring

Runtime monitoring detects threats that bypass static controls — zero-days, insider threats, and living-off-the-land attacks.

### Falco — Kubernetes Runtime Security

[Falco](https://falco.org/) monitors kernel syscalls and Kubernetes events to detect anomalous behaviour at runtime.

#### Key Falco Rules for Banking
| Rule                              | What It Detects                               |
| --------------------------------- | --------------------------------------------- |
| Terminal shell in container       | Developer exec'd into a production pod        |
| Write to sensitive file           | Config or cert file modified at runtime       |
| Outbound connection to new host   | Unexpected egress (data exfiltration)         |
| Privileged pod started            | Pod running with elevated privileges          |
| Crypto mining detected            | Unusual CPU + network pattern                 |
| Database dump command             | `pg_dump`, `mysqldump` run in a pod           |

```bash
# Install Falco via Helm
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --set driver.kind=ebpf \
  --set falcosidekick.enabled=true \
  --set falcosidekick.config.slack.webhookurl=<SLACK_URL> \
  --namespace falco --create-namespace
```

### Alerting Pipeline
```
Falco (runtime detection)
        │
        ▼
  Falcosidekick
   ├── Slack / PagerDuty (immediate alert)
   ├── SIEM (Splunk / QRadar) (correlation)
   └── Kubernetes Events (for audit trail)
```

---

## 4. Vulnerability and Threat Intelligence

- Subscribe to **CVE feeds** and **threat intelligence** (NVD, CISA KEV, vendor advisories).
- Integrate **container scanning** results into the SIEM to track known-vulnerable images in production.
- Run **periodic penetration tests** (minimum annually, after major changes) as required by PCI DSS.
- Conduct **red team exercises** for high-risk banking platforms.

---

## 5. Incident Response Integration

| Phase            | Tool / Action                                            |
| ---------------- | -------------------------------------------------------- |
| Detection        | Falco, SIEM alerts, CloudWatch/Stackdriver anomalies    |
| Triage           | SIEM correlation, audit log review                      |
| Containment      | Isolate namespace (NetworkPolicy), revoke credentials   |
| Eradication      | Redeploy from trusted image, rotate all secrets         |
| Recovery         | Restore from backup, validate integrity                 |
| Post-incident    | RCA, update rules, regulatory notification if required  |

---

## Compliance Mapping

| Control               | Standard                          |
| --------------------- | --------------------------------- |
| SIEM / log management | PCI DSS 10, ISO 27001 A.12.4     |
| Real-time monitoring  | PCI DSS 10.7, SOC 2 CC7.2        |
| Incident response     | PCI DSS 12.10, RBI guidelines    |

---

## References
- [Falco — Cloud-Native Runtime Security](https://falco.org/)
- [PCI DSS Requirement 10 — Logging and Monitoring](https://www.pcisecuritystandards.org/)
- [CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
