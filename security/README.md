# Banking Security Architecture — Index

This directory contains the security approach for each architectural layer of a banking platform.
Each file covers the threat model, implementation patterns, configuration examples, and compliance mapping for its layer.

---

## Security Layers

| #  | Layer              | Banking Security Approach                                    | File |
| -- | ------------------ | ------------------------------------------------------------ | ---- |
| 01 | **Kubernetes**     | RBAC, Pod Security, NetworkPolicies                          | [01-kubernetes-security.md](./01-kubernetes-security.md) |
| 02 | **Identity**       | IAM, MFA, short-lived credentials                            | [02-identity-security.md](./02-identity-security.md) |
| 03 | **Secrets**        | Vault / cloud secret manager / KMS                           | [03-secrets-management.md](./03-secrets-management.md) |
| 04 | **Network**        | Private subnets, firewalls, segmentation                     | [04-network-security.md](./04-network-security.md) |
| 05 | **API**            | API Gateway + OAuth2/OIDC + mTLS where required              | [05-api-security.md](./05-api-security.md) |
| 06 | **Traffic**        | TLS 1.2/1.3                                                  | [06-traffic-tls-security.md](./06-traffic-tls-security.md) |
| 07 | **Containers**     | Minimal images + vulnerability scanning                      | [07-container-security.md](./07-container-security.md) |
| 08 | **Supply chain**   | Signed images + trusted registry + SBOM                      | [08-supply-chain-security.md](./08-supply-chain-security.md) |
| 09 | **Database**       | Private network + encryption + strict access                 | [09-database-security.md](./09-database-security.md) |
| 10 | **Kubernetes API** | Private/control-plane access + RBAC + audit logs             | [10-kubernetes-api-security.md](./10-kubernetes-api-security.md) |
| 11 | **Monitoring**     | SIEM + audit logs + runtime monitoring                       | [11-monitoring-security.md](./11-monitoring-security.md) |
| 12 | **Availability**   | Multiple nodes/zones + backups + disaster recovery           | [12-availability-resilience.md](./12-availability-resilience.md) |
| 13 | **Compliance**     | PCI DSS, SOC 2, ISO 27001, RBI requirements as applicable    | [13-compliance.md](./13-compliance.md) |

---

## Defence-in-Depth Overview

Security is applied at every layer. Compromise of any single layer does not mean full system compromise.

```
┌─────────────────────────────────────────────────────────────┐
│  Compliance & Governance (PCI DSS / SOC 2 / ISO 27001 / RBI)│
├─────────────────────────────────────────────────────────────┤
│  Monitoring & SIEM  │  Audit Logs  │  Runtime Detection     │
├─────────────────────────────────────────────────────────────┤
│  Identity (IAM + MFA)  │  Secrets (Vault + KMS)             │
├──────────────┬──────────────────────────┬───────────────────┤
│  Network     │  API Gateway + TLS       │  Kubernetes API   │
│  (subnets,   │  (OAuth2/OIDC + mTLS)    │  (private + RBAC) │
│  firewalls,  │                          │                   │
│  segments)   │                          │                   │
├──────────────┴──────────────────────────┴───────────────────┤
│  Kubernetes (RBAC + Pod Security + NetworkPolicies)         │
├─────────────────────────────────────────────────────────────┤
│  Containers (minimal images + vuln scanning)                │
├─────────────────────────────────────────────────────────────┤
│  Supply Chain (signed images + trusted registry + SBOM)     │
├─────────────────────────────────────────────────────────────┤
│  Database (private network + encryption + strict access)    │
├─────────────────────────────────────────────────────────────┤
│  Availability (multi-zone + backups + DR)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Compliance Quick Reference

| Control Area             | PCI DSS    | SOC 2      | ISO 27001    | RBI              |
| ------------------------ | ---------- | ---------- | ------------ | ---------------- |
| Access control & identity| Req 7, 8   | CC6        | A.9          | Access controls  |
| Encryption (at rest/transit) | Req 3, 4 | CC6.7    | A.10         | Encryption       |
| Network controls         | Req 1      | CC6.6      | A.13         | Network security |
| Vulnerability management | Req 5, 6   | CC7, CC9   | A.12.6       | Patch management |
| Logging & monitoring     | Req 10     | CC7.2      | A.12.4       | C-SOC            |
| Incident response        | Req 12.10  | CC7.4      | A.16         | RBI reporting    |
| Business continuity      | Req 12.3   | A1         | A.17         | BCMS             |
| Third-party / supply chain | Req 12.8 | CC9        | A.15         | Vendor risk      |

For full compliance cross-reference, see [13-compliance.md](./13-compliance.md).

---

## Key Tools Referenced

| Category              | Tools                                                   |
| --------------------- | ------------------------------------------------------- |
| Secrets management    | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault   |
| Container scanning    | Trivy, Grype, Snyk                                      |
| Runtime security      | Falco                                                   |
| Policy enforcement    | Kyverno, OPA Gatekeeper                                 |
| Image signing         | Cosign (Sigstore)                                       |
| SBOM                  | Syft, Trivy                                             |
| Certificate management | cert-manager                                           |
| Backup & DR           | Velero                                                  |
| SIEM                  | Splunk, IBM QRadar, Elastic Security, Google Chronicle  |
| Service mesh          | Istio, Linkerd                                          |
