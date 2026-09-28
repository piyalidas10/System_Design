# Network Security

## Layer Overview

| Layer   | Banking Security Approach                              |
| ------- | ------------------------------------------------------ |
| Network | Private subnets, firewalls, segmentation               |

---

## 1. Private Subnets

In banking, no workload that handles sensitive data should be directly reachable from the public internet. Everything runs inside private subnets.

### Subnet Architecture
```
Internet
    │
    ▼
Public Subnet (DMZ)
  ├── Load Balancer / API Gateway
  └── NAT Gateway (outbound only)
    │
    ▼
Private Subnet (Application Tier)
  ├── Kubernetes Worker Nodes
  ├── Application Services
  └── Internal Load Balancers
    │
    ▼
Private Subnet (Data Tier)
  ├── Databases (RDS, Cloud SQL)
  ├── Cache (Redis)
  └── Message Queues
```

### Rules
- Kubernetes nodes are in **private subnets** — no public IPs assigned.
- Databases are in **isolated data-tier subnets** — accessible only from the application subnet.
- Bastion/jump hosts (or Session Manager) are the only way to access private resources.
- Egress traffic goes through a **NAT Gateway** or proxy for auditing and filtering.

---

## 2. Firewalls

Firewalls enforce what traffic is allowed to enter and exit each network boundary.

### Cloud Firewall (Security Groups / Firewall Rules)

| Rule                        | Direction | Source/Destination           | Port      |
| --------------------------- | --------- | ----------------------------- | --------- |
| Allow HTTPS from internet   | Inbound   | 0.0.0.0/0                    | 443       |
| Allow app → DB              | Inbound   | App subnet CIDR              | 5432      |
| Allow K8s nodes → API server| Inbound   | Node subnet CIDR             | 6443      |
| Deny all other inbound      | Inbound   | 0.0.0.0/0                    | All       |
| Allow egress to KMS/Vault   | Outbound  | Vault/KMS endpoint           | 443/8200  |
| Deny all other outbound     | Outbound  | 0.0.0.0/0                    | All       |

### WAF (Web Application Firewall)
- Deploy a WAF in front of all public-facing APIs and web applications.
- Enable OWASP Top 10 rule sets.
- Block SQL injection, XSS, and path traversal patterns.
- Rate-limit by IP and API key to prevent DDoS and credential stuffing.

---

## 3. Network Segmentation

Segmentation limits the blast radius of a breach — if an attacker compromises one zone, they cannot freely move to others.

### Segmentation Zones for Banking
| Zone                  | Contents                              | Access Rules                           |
| --------------------- | ------------------------------------- | -------------------------------------- |
| Internet-facing (DMZ) | API Gateway, WAF, Load Balancer       | Internet inbound on 443 only           |
| Application zone      | Payment services, account services    | From DMZ only, not from each other     |
| Data zone             | Databases, message queues, caches     | From application zone only             |
| Management zone       | Bastion, monitoring, CI/CD            | From corp network via VPN + MFA        |
| Compliance zone       | Audit logs, SIEM, archival storage    | Write-only from all zones, no inbound  |

### Kubernetes-level Segmentation
Reinforce network segmentation inside the cluster with NetworkPolicies (see [01-kubernetes-security.md](./01-kubernetes-security.md)).

- Each microservice namespace has a **default-deny** NetworkPolicy.
- Only explicitly needed pod-to-pod paths are opened.
- Namespace labels enforce which namespaces can communicate.

---

## 4. VPN and Private Connectivity

| Connectivity Pattern        | Use Case                                    |
| --------------------------- | ------------------------------------------- |
| Site-to-site VPN            | On-premises DC to cloud                     |
| AWS PrivateLink / GCP PSC   | Private access to cloud services (no internet) |
| Direct Connect / ExpressRoute | Dedicated private link to cloud           |
| Client VPN + MFA            | Developer access to private resources       |

---

## Compliance Mapping

| Control              | Standard                         |
| -------------------- | -------------------------------- |
| Private subnets      | PCI DSS 1.3, ISO 27001 A.13.1   |
| Firewall rules       | PCI DSS 1.2, SOC 2 CC6.6        |
| Network segmentation | PCI DSS 1.3.4, RBI guidelines   |

---

## References
- [AWS VPC Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html)
- [PCI DSS Network Segmentation](https://www.pcisecuritystandards.org/documents/Guidance-PCI-DSS-Scoping-and-Segmentation_v1.pdf)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
