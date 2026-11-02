# DevSecOps — Security Checks for Modern CI/CD Pipelines

> **Scope:** Modern Full Stack application — Angular + FastAPI/Node.js + Docker + Kubernetes.
>
> This document covers the complete set of automated quality, security, compliance, and deployment checks used in enterprise DevSecOps pipelines, following the **OWASP DevSecOps Guideline** lifecycle: Design → Develop → Build → Test → Release → Deploy → Operate.

<img src="./Enterprise DevSecOps Security Roadmap.png" width="100%" />

---

## Table of Contents

1. [What is DevSecOps?](#1-what-is-devsecops)
2. [Modern CI/CD Production Checks](#2-modern-cicd-production-checks)
3. [Tool Comparison](#3-tool-comparison)
4. [Recommended Learning Stack](#4-recommended-learning-stack)
5. [Practical Example — Angular + FastAPI + Docker](#5-practical-example--angular--fastapi--docker)
6. [Example GitHub Actions Workflow](#6-example-github-actions-workflow)
7. [What Should Block Production Deployment?](#7-what-should-block-production-deployment)
8. [Hands-on Learning Roadmap](#8-hands-on-learning-roadmap)
9. [Enterprise DevSecOps Architecture — 5 Security Layers](#9-enterprise-devsecops-architecture--5-security-layers)
10. [Detailed Review of 13 Core Pipeline Checks](#10-detailed-review-of-13-core-pipeline-checks)
11. [Additional Capabilities to Add](#11-additional-capabilities-to-add)
12. [Implementation Maturity Roadmap](#12-implementation-maturity-roadmap)
13. [Security Policies for Production](#13-security-policies-for-production)
14. [Reference Standards](#14-reference-standards)
15. [Final Recommendation](#15-final-recommendation)

---

## 1. What is DevSecOps?

**DevSecOps** means integrating security and quality checks throughout the entire software delivery lifecycle, rather than checking security only before production deployment.

Modern production pipelines use many more than just two tools (e.g. Gitleaks + Snyk). They span:

- Source code and dependency security
- Build, artifact and software supply-chain security
- Infrastructure and cloud security
- Application, API and runtime security
- Governance, compliance and AI security

---

## 2. Modern CI/CD Production Checks

```
Developer pushes code
        │
        ▼
   GitHub / GitLab / Bitbucket
        │
        ├─ 1. Secret detection        → Gitleaks · TruffleHog
        ├─ 2. Code quality / SAST     → SonarQube · Semgrep · CodeQL
        ├─ 3. Dependency security     → Snyk · Dependabot · OWASP Dependency-Check
        ├─ 4. License compliance      → FOSSA · Mend · ScanCode
        ├─ 5. Automated testing       → Jest · Vitest · Playwright · pytest
        ├─ 6. Container security      → Trivy · Grype · Docker Scout
        ├─ 7. Infrastructure security → Checkov · KICS · Terrascan
        ├─ 8. Artifact integrity      → Cosign · Syft · SLSA
        ├─ 9. DAST / API security     → OWASP ZAP · Burp Suite
        └─ 10. Deployment verification→ Argo CD · Kubernetes probes · OPA
                │
                ▼
   Production deployment
   (only after mandatory quality and security gates pass)
```

| # | Check | Tools | What it detects |
|---|-------|-------|-----------------|
| 1 | Secret detection | Gitleaks, TruffleHog | Passwords, API keys, tokens |
| 2 | Code quality / SAST | SonarQube, Semgrep, CodeQL | Bugs, vulnerabilities, insecure code |
| 3 | Dependency security (SCA) | Snyk, Dependabot, OWASP Dependency-Check | Vulnerable npm / Python / Java packages |
| 4 | License compliance | FOSSA, Mend, ScanCode | Open-source license policy violations |
| 5 | Automated testing | Jest, Vitest, Playwright, pytest | Unit, integration, E2E test failures |
| 6 | Container security | Trivy, Grype, Docker Scout | Docker image vulnerabilities and misconfigurations |
| 7 | Infrastructure security | Checkov, KICS, Terrascan | Terraform, Kubernetes, IaC misconfigurations |
| 8 | Artifact integrity | Cosign, Syft, SLSA | Image signing, SBOM, build provenance |
| 9 | DAST / API security | OWASP ZAP, Burp Suite | Runtime vulnerabilities and API weaknesses |
| 10 | Deployment verification | Argo CD, Kubernetes probes, OPA | Deployment policy, health, rollout validation |

---

## 3. Tool Comparison

| Category | Recommended tools | What they check |
|----------|-------------------|-----------------|
| Secret scanning | Gitleaks, TruffleHog | API keys, passwords, tokens |
| SAST | SonarQube, Semgrep, CodeQL | Source-code vulnerabilities |
| SCA | Snyk, Dependabot, OWASP Dependency-Check | Vulnerable dependencies |
| License scanning | FOSSA, Mend | Open-source license compliance |
| Unit testing | Jest, Vitest, pytest | Code correctness |
| E2E testing | Playwright, Cypress | User journeys |
| Container scanning | Trivy, Grype, Docker Scout | Docker image vulnerabilities |
| IaC scanning | Checkov, KICS, Terrascan | Terraform, Kubernetes misconfigurations |
| DAST | OWASP ZAP, Burp Suite | Runtime application vulnerabilities |
| API security | OWASP ZAP, 42Crunch | API vulnerabilities |
| SBOM generation | Syft, CycloneDX | Software component inventory |
| Image signing | Cosign | Container image authenticity |
| Kubernetes security | Kubescape, Kyverno, OPA | Kubernetes security and policy |
| Runtime security | Falco | Suspicious runtime activity |
| Quality gates | SonarQube | Code quality and coverage thresholds |

> These categories align with the **OWASP DevSecOps recommendations**.

---

## 4. Recommended Learning Stack

You do not need to learn every tool. Start with this prioritized combination:

| Priority | Tool | Purpose |
|----------|------|---------|
| 1 | GitHub Actions | CI/CD pipeline automation |
| 2 | Gitleaks | Secret detection |
| 3 | SonarQube | Code quality and SAST |
| 4 | Snyk | Dependency vulnerability scanning |
| 5 | Trivy | Docker image scanning |
| 6 | Checkov | Infrastructure security |
| 7 | OWASP ZAP | Dynamic security testing |
| 8 | Playwright | Frontend E2E testing |
| 9 | Cosign + Syft | Image signing and SBOM |
| 10 | Argo CD | Kubernetes continuous delivery |

---

## 5. Practical Example — Angular + FastAPI + Docker

Application stack:

- **Frontend:** Angular 19
- **Backend:** FastAPI
- **Database:** PostgreSQL
- **Containers:** Docker
- **Deployment:** Kubernetes

### Pipeline stage mapping

| Pipeline stage | Check | Example failure |
|----------------|-------|-----------------|
| Pull Request | Gitleaks | API key committed to source |
| Pull Request | SonarQube | Critical code vulnerability |
| Pull Request | Snyk | Vulnerable npm package |
| Build | pytest / Vitest | Unit tests fail |
| Build | Playwright | Login flow fails |
| Docker build | Trivy | Critical OS package vulnerability |
| Infrastructure | Checkov | Publicly exposed database |
| Staging | OWASP ZAP | SQL injection vulnerability |
| Release | Syft + Cosign | Missing SBOM or invalid image signature |
| Production | Argo CD + Kubernetes | Deployment health check fails |

---

## 6. Example GitHub Actions Workflow

This is a simplified starting point showing how the core security tools fit together.

> **Production note:** Pin third-party actions to verified full commit SHAs, use least-privilege permissions, configure scanning separately for Angular and Python dependencies, and protect credentials. Configure Snyk and Gitleaks according to their current action documentation.

```yaml
name: Fullstack DevSecOps Pipeline

on:
  pull_request:
  push:
    branches: [main]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2

  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: |
          echo "Run Angular and FastAPI tests here"

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:latest .

      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:latest
          severity: CRITICAL,HIGH
          exit-code: '1'
```

---

## 7. What Should Block Production Deployment?

Not every warning should fail a pipeline. A practical enterprise policy:

| Finding | Pipeline decision |
|---------|-------------------|
| Exposed production password / credential | **Block immediately; revoke and rotate** |
| Critical exploitable vulnerability | **Block** |
| High-risk dependency vulnerability | **Review / block by policy** |
| Critical Docker image vulnerability | **Block** |
| Unit tests failing | **Block** |
| Code coverage below threshold | Quality gate |
| Minor code-style issue | Warning only |
| Low-risk vulnerability with approved exception | Track |
| Scanner unavailable | Fail closed for critical gates, or use explicitly approved fallback |

> **Key concept:** Quality Gate + Security Gate.
>
> OWASP recommends prioritizing findings by **risk** rather than blindly blocking builds for every scanner finding.

---

## 8. Hands-on Learning Roadmap

Implement one real application and gradually add these capabilities:

```
Phase 1 – CI Fundamentals
  GitHub Actions, pull requests, branch protection,
  build and test automation.

Phase 2 – Application Security
  Gitleaks + SonarQube + Snyk.

Phase 3 – Container Security
  Docker + Trivy + SBOM using Syft.

Phase 4 – Infrastructure Security
  Kubernetes manifests + Helm + Checkov + Kyverno.

Phase 5 – Runtime Security
  OWASP ZAP + Falco + application monitoring.

Phase 6 – Production CD
  Container registry + Cosign + Argo CD + Kubernetes deployment.
```

> **Suggested starting point:** GitHub Actions + Gitleaks + SonarQube + Snyk + Trivy.  
> These five tools provide a strong practical foundation before moving into Kubernetes security and advanced supply-chain security.

---

## 9. Enterprise DevSecOps Architecture — 5 Security Layers

Not everything belongs in the same CI/CD pipeline. The checks are organized into five security layers, each with its own trigger point.

```
DEVELOPER
  │
  ▼ Commit / Pull Request
  │
  ├─ Layer 1 · Source and Code Security
  │   Secret scanning · SCA · SAST
  │   Tools: Gitleaks · Snyk · SonarQube · Semgrep
  │
  ├─ Layer 2 · Build and Supply-Chain Security
  │   Build security · SBOM · Signing · Provenance
  │   Tools: Syft · Cosign · SLSA · GitHub Actions hardening
  │
  ├─ Layer 3 · Infrastructure and Container Security
  │   IaC scanning · Container scanning · Infrastructure scanning
  │   Tools: Checkov · Trivy · Kubescape
  │
  ▼ Deploy to staging
  │
  ├─ Layer 4 · Application and Runtime Security
  │   IAST · API security · DAST
  │   Tools: Contrast Assess · OWASP ZAP · Burp Suite · API security testing
  │
  └─ Layer 5 · Governance and Continuous Security
      CNAPP · Compliance · AI security · Continuous scanning
      Tools: Wiz · Prisma Cloud · OPA · Kyverno · AI security guardrails
  │
  ▼ Production deployment
    Continuous monitoring and vulnerability management
```

> This follows the lifecycle approach in the **OWASP DevSecOps Guideline**:  
> Design → Develop → Build → Test → Release → Deploy → Operate.

### Three views to maintain separately

| View | Question it answers |
|------|---------------------|
| **CI/CD Pipeline Security** | What must be checked before code, artifacts, and releases move forward? |
| **Continuous Security Monitoring** | What must be monitored after deployment? |
| **Security Governance** | How do we manage vulnerabilities, compliance, risk acceptance, and AI governance? |

---

## 10. Detailed Review of 13 Core Pipeline Checks

| # | Check | Where it should run | Example tools |
|---|-------|---------------------|---------------|
| 1 | Git credential / secret leakage | Pre-commit, PR, CI | Gitleaks, TruffleHog |
| 2 | SCA (Software Composition Analysis) | PR, CI, scheduled | Snyk, Dependabot |
| 3 | SAST (Static Application Security Testing) | PR, CI | SonarQube, Semgrep, CodeQL |
| 4 | IaC scanning | PR, CI | Checkov, KICS |
| 5 | Software supply-chain security | Build, release, deploy | Syft, Cosign, SLSA |
| 6 | IAST (Interactive Application Security Testing) | Staging integration tests | Contrast Assess, Seeker |
| 7 | API security | PR, staging, production monitoring | 42Crunch, ZAP, Burp Suite |
| 8 | DAST (Dynamic Application Security Testing) | Staging, pre-release | OWASP ZAP, Burp Suite |
| 9 | CNAPP (Cloud Native Application Protection Platform) | Cloud and runtime, continuous | Wiz, Prisma Cloud |
| 10 | Infrastructure scanning | CI, cloud, continuous | Trivy, Qualys, Tenable |
| 11 | Continuous scanning | Scheduled and continuous | Trivy, Snyk, cloud scanners |
| 12 | Compliance checks | PR, release, continuous | OPA, Kyverno, Checkov |
| 13 | AI/LLM security and governance | Development, testing, runtime | Giskard, Garak, Promptfoo |

### Important clarifications

- **IAST** requires an instrumented application running during tests. It is not simply another source-code scan.
- **API security** is broader than DAST. It includes API inventory, authentication/authorization testing, schema validation, rate limiting, and OWASP API Top 10 checks.
- **CNAPP** is a platform/category, not a single pipeline command. It typically combines CSPM (Cloud Security Posture Management), CWPP (Cloud Workload Protection Platform), CIEM (Cloud Infrastructure Entitlement Management), and Kubernetes security capabilities.
- **Infrastructure scanning** overlaps with IaC and container scanning, but also covers actual provisioned infrastructure, network exposure, operating systems, and cloud assets.
- **Continuous scanning** is an operating capability that coordinates multiple scanners — it is not one additional scanner.
- **Compliance** should be policy-as-code wherever possible, with auditable evidence and exception handling.

---

## 11. Additional Capabilities to Add

Beyond the 13 core categories, these six capabilities are needed for a complete enterprise posture:

| Additional check | Purpose | Suggested tools |
|------------------|---------|-----------------|
| Threat modelling | Identify architectural security risks before coding | OWASP Threat Dragon, Microsoft Threat Modeling Tool |
| Container / image hardening | Check base images, packages, and Docker configuration | Dockle, Trivy |
| Kubernetes admission control | Prevent insecure workloads from running | Kyverno, OPA Gatekeeper |
| DAST security regression | Re-test previously fixed vulnerabilities | OWASP ZAP automation |
| ASPM (Application Security Posture Management) | Centralize findings from multiple tools | DefectDojo, commercial ASPM platforms |
| Vulnerability management | Prioritize findings, assign owners, track remediation SLAs | DefectDojo, Jira, vulnerability management platforms |

### What is ASPM?

ASPM aggregates and correlates findings from different security scanners. It helps answer:

- Which application has the highest security risk?
- Which critical vulnerabilities remain unresolved?
- Which development team owns the vulnerability?
- Are we meeting our remediation deadlines?

---

## 12. Implementation Maturity Roadmap

Do not implement all 13+ categories on day one. Use a phased approach:

### Phase 1 — Foundation (Essential PR checks)

- Secret scanning — **Gitleaks**
- SCA — **Snyk**
- SAST — **SonarQube / Semgrep**
- Unit and integration tests
- IaC scanning — **Checkov**

### Phase 2 — Build Security (Secure artifacts)

- Container scanning — **Trivy**
- SBOM — **Syft**
- Image signing — **Cosign**
- Build provenance — **SLSA**
- CI/CD workflow hardening

### Phase 3 — Application Security (Secure running applications)

- API security testing
- DAST — **OWASP ZAP**
- IAST — **Contrast Assess**
- Penetration testing

### Phase 4 — Cloud Security (Secure infrastructure)

- CNAPP
- Infrastructure vulnerability scanning
- Kubernetes security
- Runtime threat detection
- Compliance automation

### Phase 5 — Advanced Governance (Enterprise security maturity)

- ASPM
- Continuous vulnerability management
- AI/LLM security
- AI governance
- Security metrics and audit reporting

---

## 13. Security Policies for Production

### Scanner finding policy

For every scanner, define a **policy** — not just a scan.

| Security finding | Example policy |
|------------------|----------------|
| Confirmed leaked credential | Block immediately; revoke and rotate the credential |
| Critical exploitable vulnerability | Block production release |
| High vulnerability | Block or require approved exception |
| Medium vulnerability | Track with remediation deadline |
| Low vulnerability | Report and monitor |
| Scanner unavailable | Fail closed for critical release gates, or use explicitly approved fallback |

### CI/CD platform security

A compromised CI/CD pipeline can compromise the application and its entire production environment. Secure the platform itself:

- Use short-lived credentials and **OIDC** instead of long-lived cloud keys.
- Pin third-party GitHub Actions to **immutable commit SHAs**.
- Apply **least-privilege** pipeline permissions.
- **Isolate** build runners.
- Protect deployment environments and require production approvals.
- Secure artifact registries and pipeline secrets.

---

## 14. Reference Standards

| Standard / Framework | What it helps with |
|----------------------|--------------------|
| [OWASP DevSecOps Guideline](https://owasp.org/www-project-devsecops-guideline/) | Practical DevSecOps pipeline design |
| [OWASP SAMM](https://owaspsamm.org/) | Measuring software security maturity |
| [NIST SSDF (SP 800-218)](https://csrc.nist.gov/publications/detail/sp/800-218/final) | Secure software development practices |
| [SLSA](https://slsa.dev/) | Software supply-chain integrity levels |
| [OWASP Top 10](https://owasp.org/www-project-top-ten/) | Web application security risks |
| [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) | API-specific security risks |
| [NIST AI RMF](https://www.nist.gov/system/files/documents/2023/01/26/AI%20RMF%201.0.pdf) | AI risk management framework |
| [MITRE ATLAS](https://atlas.mitre.org/) | AI/ML adversarial threat landscape |

---

## 15. Final Recommendation

### Retain all 13 original categories and add the 6 missing capabilities.

But maintain **three separate views**:

```
┌─────────────────────────────────────────────────────────────┐
│  1. CI/CD Pipeline Security                                  │
│     What must be checked before code, artifacts, and         │
│     releases move forward?                                   │
├─────────────────────────────────────────────────────────────┤
│  2. Continuous Security Monitoring                           │
│     What must be monitored after deployment?                 │
├─────────────────────────────────────────────────────────────┤
│  3. Security Governance                                      │
│     How do we manage vulnerabilities, compliance,            │
│     risk acceptance, and AI governance?                      │
└─────────────────────────────────────────────────────────────┘
```

### Most important next step

**Define the checks, tools, trigger points, severity thresholds, and pass/fail conditions in a security control matrix before starting implementation.** That matrix becomes your implementation blueprint.

### Quick-start recommendation

Start with these five tools to build a strong practical foundation:

```
GitHub Actions + Gitleaks + SonarQube + Snyk + Trivy
```

Then progress to Kubernetes security and advanced software supply-chain security (Cosign, Syft, SLSA, Argo CD).
