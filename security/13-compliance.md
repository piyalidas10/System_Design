# Compliance

## Layer Overview

| Layer      | Banking Security Approach                                    |
| ---------- | ------------------------------------------------------------ |
| Compliance | PCI DSS, SOC 2, ISO 27001, RBI requirements as applicable    |

---

## 1. Overview of Applicable Standards

Banking platforms are subject to multiple overlapping compliance frameworks. Understanding each framework's scope and requirements ensures that security controls are implemented to satisfy all relevant obligations simultaneously.

| Framework    | Scope                                               | Who Governs           |
| ------------ | --------------------------------------------------- | --------------------- |
| PCI DSS      | Any system that stores, processes, or transmits cardholder data | PCI Security Standards Council |
| SOC 2 Type II | Cloud service providers, SaaS banks, fintech platforms | AICPA                |
| ISO 27001    | Information Security Management System (ISMS)       | ISO / IEC             |
| RBI          | Banks and payment systems operating in India        | Reserve Bank of India |

---

## 2. PCI DSS (Payment Card Industry Data Security Standard)

PCI DSS applies to any system that handles cardholder data (CHD) — credit/debit card numbers (PAN), CVV, expiry dates, PIN data.

### PCI DSS v4.0 — Key Requirements
| Requirement | Summary                                              | Related Security Files                  |
| ----------- | ---------------------------------------------------- | --------------------------------------- |
| 1           | Network security controls                            | [04-network-security.md](./04-network-security.md) |
| 2           | Secure configurations                                | [01-kubernetes-security.md](./01-kubernetes-security.md) |
| 3           | Protect stored account data (encryption)             | [09-database-security.md](./09-database-security.md) |
| 4           | Protect cardholder data in transit (TLS)             | [06-traffic-tls-security.md](./06-traffic-tls-security.md) |
| 5           | Protect against malware (container/runtime scanning) | [07-container-security.md](./07-container-security.md) |
| 6           | Develop and maintain secure systems (SDLC, SBOM)     | [08-supply-chain-security.md](./08-supply-chain-security.md) |
| 7           | Restrict access (IAM, RBAC, least privilege)         | [02-identity-security.md](./02-identity-security.md) |
| 8           | Identify users (MFA, short-lived credentials)        | [02-identity-security.md](./02-identity-security.md) |
| 9           | Restrict physical access                             | Cloud provider physical controls        |
| 10          | Log and monitor all access                           | [11-monitoring-security.md](./11-monitoring-security.md) |
| 11          | Test security regularly (pen test, vuln scanning)    | [07-container-security.md](./07-container-security.md) |
| 12          | Support information security with policies           | This document + governance framework    |

### Cardholder Data Environment (CDE) Scoping
The CDE includes all systems that store, process, or transmit CHD **plus** any system connected to them. Reduce scope by:
- **Tokenisation**: Replace PAN with a non-sensitive token at the point of capture. The token has no value outside the tokenisation vault.
- **Network segmentation**: Strict isolation of CDE from non-CDE systems.

---

## 3. SOC 2 Type II

SOC 2 evaluates controls across five Trust Services Criteria (TSC). Type II audits cover a period (typically 6–12 months), not just a point in time.

### Trust Services Criteria Mapping
| Criteria | Description                        | Key Controls                                |
| -------- | ---------------------------------- | ------------------------------------------- |
| CC6      | Logical and physical access        | IAM, MFA, RBAC, network segmentation       |
| CC7      | System operations                  | Monitoring, incident response, SIEM        |
| CC8      | Change management                  | GitOps, peer review, signed deployments    |
| CC9      | Risk mitigation                    | Vulnerability scanning, SBOM, pen testing  |
| A1       | Availability                       | HA clusters, DR, backup testing            |

### Continuous Evidence Collection
SOC 2 Type II requires continuous evidence. Automate evidence collection:
- Export Kubernetes RBAC policies monthly.
- Screenshot/export access review records quarterly.
- Capture vulnerability scan results per release.
- Archive deployment logs with approval records.

---

## 4. ISO 27001

ISO 27001 requires an **Information Security Management System (ISMS)** — a systematic approach to managing sensitive information. Unlike PCI DSS, it is risk-based rather than prescriptive.

### Key Annex A Controls for Banking Platforms
| Control          | Annex A Reference | Implementation                          |
| ---------------- | ----------------- | --------------------------------------- |
| Access control   | A.9               | IAM, RBAC, MFA                          |
| Cryptography     | A.10              | TLS, KMS, key rotation                  |
| Physical security | A.11             | Cloud provider data centre controls     |
| Operations security | A.12           | Vulnerability scanning, change management |
| Network security | A.13              | Firewalls, segmentation, TLS            |
| Software development | A.14          | SDLC security, SBOM, code signing       |
| Supplier relationships | A.15        | Third-party risk, supply chain security |
| Incident management | A.16           | SIEM, runbooks, incident response plan  |
| Business continuity | A.17          | DR, backups, availability               |

### ISMS Governance
- Appoint an **Information Security Officer (ISO)**.
- Conduct annual **risk assessments** and maintain a risk register.
- Perform **internal audits** annually.
- Conduct **management reviews** of the ISMS at least annually.
- Maintain a **Statement of Applicability (SoA)** mapping Annex A controls to your environment.

---

## 5. RBI (Reserve Bank of India) Requirements

For banks and payment system operators in India, RBI guidelines are mandatory and cover both technical and governance requirements.

### Key RBI Frameworks
| Framework                                | Scope                                    |
| ---------------------------------------- | ---------------------------------------- |
| RBI IT Framework for NBFC                | IT governance, cybersecurity for NBFCs   |
| RBI Cybersecurity Framework for Banks    | Mandatory cybersecurity controls         |
| RBI Master Direction on Digital Payments | Security requirements for digital payments |
| RBI Cloud Adoption Framework             | Guidance for cloud migration in banking  |
| DPDP Act (2023)                          | Data protection and privacy              |

### RBI-Specific Technical Requirements
| Requirement                         | Implementation                                       |
| ----------------------------------- | ---------------------------------------------------- |
| Data localisation                   | Customer data stored in India (in-country cloud region) |
| Cyber Security Operations Centre (C-SOC) | 24/7 monitoring with SIEM                       |
| Patch management                    | Critical patches within 30 days                      |
| Penetration testing                 | Annual, by approved vendor                           |
| Incident reporting                  | Report to RBI within 2–6 hours for critical incidents |
| Third-party risk management         | Due diligence and contracts with cloud/SaaS vendors  |
| Board-level accountability          | Board and senior management ownership of cybersecurity |

---

## 6. Compliance Controls Cross-Reference

| Security Layer         | PCI DSS        | SOC 2      | ISO 27001   | RBI              |
| ---------------------- | -------------- | ---------- | ----------- | ---------------- |
| Kubernetes security    | Req 2, 6       | CC6, CC8   | A.12, A.14  | Cybersecurity framework |
| Identity (IAM, MFA)    | Req 7, 8       | CC6.1–6.3  | A.9         | Access control   |
| Secrets management     | Req 3, 8       | CC6.1      | A.10        | Data protection  |
| Network security       | Req 1, 4       | CC6.6      | A.13        | Network controls |
| API security           | Req 4, 6, 8    | CC6.6      | A.14        | API security     |
| TLS                    | Req 4.2        | CC6.7      | A.10.1      | Encryption       |
| Container security     | Req 5, 6       | CC7.1, CC9 | A.12.6      | Patch management |
| Supply chain           | Req 6          | CC8        | A.14, A.15  | Third-party risk |
| Database security      | Req 3, 7, 10   | CC6.3, CC7 | A.9, A.10   | Data protection  |
| Kubernetes API         | Req 7, 10      | CC6.3, CC7 | A.9, A.12   | Access control   |
| Monitoring / SIEM      | Req 10, 11     | CC7.2      | A.12.4, A.16| C-SOC            |
| Availability / DR      | Req 12.3       | A1.1–A1.3  | A.17        | BCMS guidelines  |

---

## 7. Compliance Automation Tools

| Tool                       | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| OpenSCAP / Kyverno         | Policy-as-code for Kubernetes compliance            |
| Falco                      | Runtime compliance monitoring                       |
| Trivy + SBOM               | Software compliance and vulnerability evidence      |
| Drata / Vanta / Secureframe | Continuous SOC 2 / ISO 27001 evidence collection  |
| AWS Security Hub / Macie   | Cloud compliance posture management                 |
| HashiCorp Vault Audit Logs | Evidence of secret access for PCI / ISO audits      |

---

## References
- [PCI DSS v4.0](https://www.pcisecuritystandards.org/document_library/)
- [SOC 2 Trust Services Criteria](https://www.aicpa.org/resources/download/2017-trust-services-criteria)
- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [RBI Cybersecurity Framework](https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx?Id=10435)
- [DPDP Act 2023](https://www.meity.gov.in/content/digital-personal-data-protection-act-2023)
