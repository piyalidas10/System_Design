# Complete Analysis: CI/CD Pipeline in Production

The notes cover the complete journey from a developer writing code to safely running that code in production.

<img src="./CI_CD_Pipeline_Production_Analysis.md" />

**Overall assessment:** This is a strong, production-oriented CI/CD learning document. It goes beyond basic automation (build, test, deploy) and explains the bigger engineering problems: artifact integrity, security, environment consistency, deployment risk, observability, and recovery.

The most important idea connecting all nine chapters is:

> Build an artifact once, establish trust in it, promote that exact artifact through environments, monitor it in production, and recover safely if something goes wrong.

This analysis covers the material in five ways:
1. Explain the overall architecture and how the chapters connect.
2. Explain the purpose of every chapter and its components.
3. Identify technically important details and areas that need clarification.
4. Show how the concepts fit into a practical production application.
5. Give a learning priority and interview preparation guide.

---

## 1. Understand the complete architecture first

Before learning individual tools, understand how the entire system works.

### Production CI/CD lifecycle

```
1. Developer workstation
   Git commit · Pre-commit hooks · Linting · Local tests
        │
        ▼
2. Pull request — Continuous Integration
   GitHub Actions · Unit tests · SAST · SCA · Secret scanning
   Required checks + reviewer approval
        │
        ▼
3. Build and secure the artifact
   Docker build · Amazon ECR · Image digest · Vulnerability scan
   SBOM · Provenance · Attestation
        │
        ▼
4. Staging — Continuous Delivery
   GitOps · Argo CD · Kubernetes · Probes
   Smoke tests · Integration tests · E2E tests
        │
        ▼
5. Production release
   Approval or automated release gate
   Rolling · Blue-green · Canary · Feature flags
        │
        ▼
6. Production operations
   OpenTelemetry · Prometheus · Grafana · Alerts
   Argo Rollouts abort · GitOps rollback
```

There are three important control points throughout this lifecycle:

| Control point | Main question |
| ------------- | ------------- |
| Before merging | Is the code safe and acceptable? |
| Before production | Is this the exact artifact we tested and approved? |
| After deployment | Is the application healthy, and can we recover? |

The chapters map to these control points:

| Chapter | Main responsibility |
| ------- | ------------------- |
| 1 | Validate code before merging |
| 2 | Build and establish artifact trust |
| 3 | Promote and deploy through environments |
| 4 | Keep application and database versions compatible |
| 5 | Control production release risk |
| 6 | Detect problems and recover |
| 7 | Manage infrastructure changes |
| 8 | Enforce platform standards and improve developer experience |
| 9 | Connect everything into one pipeline |

---

## 2. Chapter-by-chapter analysis

### Chapter 1 — CI and Build Verification

**Purpose:** Prevent bad code from entering the main branch.

The notes correctly distinguish three levels of validation.

**Level 1 — Local checks** (developer's computer)
- Gitleaks
- Formatting
- Linting
- Local unit tests

**Level 2 — Central CI checks** (GitHub Actions runner)
- Automated tests
- Static Application Security Testing (SAST)
- Software Composition Analysis (SCA)
- Secret detection

**Level 3 — Branch protection** (GitHub repository rules)
- Require selected checks to pass
- Require reviewer approval, if configured
- Prevent unauthorized direct changes

**Important distinction:**
- Pre-commit hooks are an early warning mechanism.
- CI is the centralized validation mechanism.
- Branch protection is the enforcement mechanism.

A developer can bypass a local hook, but cannot normally bypass a correctly configured branch protection rule without sufficient repository permissions or an administrative exception.

**Runner concept:** Think of a runner as the computer executing your pipeline.

```
GitHub Actions
     │
     │ Defines the workflow
     ▼
GitHub-hosted runner
     │
     │ Executes commands
     ▼
npm ci
npm test
npm run build
```

Self-hosted runners are useful when your pipeline needs private network access, special hardware, or company-controlled infrastructure. Persistent self-hosted runners need careful isolation because jobs may leave files, credentials, or processes behind.

**Assessment:** This chapter is technically sound. One qualification: reviewer approval is not universally required; it depends on the repository's configured protection rules.

---

### Chapter 2 — Artifact Trust and Security

**One of the most important chapters.**

**Purpose:** Prove that the artifact going into production is the artifact you intended to release.

This chapter introduces four separate concepts that are easy to confuse.

| Concept | What it tells you |
| ------- | ----------------- |
| Image digest | Which exact image is being deployed? |
| SBOM | What software components are inside it? |
| Vulnerability scan | Are known vulnerabilities present? |
| Provenance / attestation | Where and how was the artifact built? |

These concepts complement each other; none replaces the others.

#### A. Build once, deploy many

Imagine your application is built from commit `a84f92c`.

```
Source code
    │
    ▼
Docker build
    │
    ▼
Image: myapp:a84f92c
Digest: sha256:93ab...
    │
    ├──────► Staging
    │
    └──────► Production
```

Staging and production should receive the **same image digest**.

Why? Suppose staging builds image A, and production independently builds image B from the same source. Differences in dependencies, base images, build tools, or build-time inputs can make the resulting artifacts different.

The principle is not merely "same source code." It is **same artifact**.

#### B. Multi-stage Docker builds

The notes correctly explain the separation between build-time tools and runtime requirements.

However, there is a technical issue in the Dockerfile example.

It uses:
```dockerfile
RUN npm ci
```

Then copies all of `node_modules` into the production image:
```dockerfile
COPY --from=builder /app/node_modules ./node_modules
```

By default, `npm ci` installs development dependencies too. Therefore, the final image may contain TypeScript compilers, testing libraries, and other development packages.

A better approach is to install production dependencies separately in the runtime stage, or prune development dependencies before copying.

```dockerfile
# Build stage
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production dependencies
FROM node:20-slim AS production-deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Runtime stage
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

CMD ["node", "dist/main.js"]
```

For production, also consider running as a non-root user, pinning base images, and including only required runtime files.

#### C. Build caching

There are two distinct caching mechanisms:

| Cache | Example |
| ----- | ------- |
| Dependency cache | Reuse downloaded npm packages across CI jobs |
| Docker layer cache | Reuse previous Docker build layers |

A common Dockerfile optimization is:
```dockerfile
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
```

Why does this help?
- If application source code changes but `package.json` and `package-lock.json` do not, Docker may reuse the dependency installation layer.
- If the dependency manifests change, the installation layer must be rebuilt, and subsequent dependent layers may also be rebuilt.

Caching improves build speed. It is **not** an artifact trust or security mechanism.

#### D. OIDC authentication to Amazon ECR

This is an important security concept.

**Traditional approach:**
```
GitHub Actions
     │
     ▼
Permanent AWS access key
     │
     ▼
Amazon ECR
```

**Improved approach:**
```
GitHub Actions
     │
     ▼
GitHub OIDC identity token
     │
     ▼
AWS IAM trust policy verifies identity
     │
     ▼
AWS STS issues temporary credentials
     │
     ▼
IAM permissions restrict ECR access
     │
     ▼
Amazon ECR
```

The IAM trust policy should restrict which GitHub repository, branch, tag, or environment can assume the role, as appropriate.

**Important correction:** Temporary AWS credentials do not necessarily expire exactly when the GitHub job finishes. They expire according to the session duration configured when issued. They should still be short-lived and narrowly scoped.

#### E. Image tags versus digests

This is an essential production distinction.

```
myapp:a84f92c
```
is a **tag**. It is a human-friendly reference, often based on a Git commit SHA.

```
myapp@sha256:93ab...
```
is a **digest-based reference**.

| Property | Tag | Digest |
| -------- | --- | ------ |
| Human-friendly | Yes | Less so |
| Can be reassigned | Yes, unless registry policy prevents it | Content-addressed |
| Identifies exact manifest | Not by itself | Yes |
| Best for promotion | Not as the sole identity | Yes |

The conclusion is correct: use the digest as the deployment identity when promoting the artifact from staging to production.

#### F. Security scanning, SBOM, provenance

Think of these as three different questions:

1. **Vulnerability scanning — Is anything known to be vulnerable?**
   Tool: Trivy. Scans image packages and dependencies against vulnerability databases.

2. **SBOM — What is inside the image?**
   Tools: Syft / CycloneDX. Creates an inventory of software components and versions.

3. **Provenance — Where did this image come from?**
   Build provenance / attestations. Connects the artifact to its source repository, commit, and build process.

A subtle but important point: a signed attestation is not automatically trustworthy just because it has a signature. The consumer must verify that the signing identity, source repository, workflow, and artifact digest meet its trust requirements.

**Assessment:** The chapter is strong. The Docker production dependency example and OIDC credential-expiry wording are the two corrections to prioritize.

---

### Chapter 3 — GitOps and Staging

**Purpose:** Deploy the approved artifact consistently and keep the cluster aligned with the desired configuration.

The most important concept here is the difference between CI and GitOps.

```
CI pipeline:        Build + test + package
GitOps controller:  Observe Git + reconcile Kubernetes
```

#### Direct deployment versus GitOps

| Direct CI deployment | GitOps |
| -------------------- | ------ |
| CI executes deployment commands | CI updates the desired state in Git |
| CI may run `kubectl apply` | Argo CD observes Git |
| Deployment permissions are held by CI | Cluster changes are reconciled by the controller |
| Audit trail depends on CI and cluster logging | Git provides a reviewable desired-state history |

Direct deployment can also be audited. GitOps is not the only way to create an audit trail; its advantage is that desired state is explicitly version-controlled and continuously reconciled.

#### Argo CD: desired state versus actual state

This is one of the most important Kubernetes concepts in the notes.

```
Git repository
Desired state:  image = sha256:new
       │
       ▼
    Argo CD
       │
       ▼
Kubernetes cluster
Actual state:   image = sha256:old
```

Argo CD detects the difference.
- **Desired state:** what Git says should be running.
- **Actual state:** what is currently running.
- **Reconciliation:** bringing actual state toward desired state.

One qualification: automatic sync and automatic correction of manual cluster drift are related but distinct settings. Argo CD's `selfHeal` option controls whether it automatically corrects certain live-state changes when automated sync is enabled. Pruning unwanted resources is also configured separately.

#### Kubernetes probes

| Probe | Purpose | Question |
| ----- | ------- | -------- |
| Startup probe | Startup | Has the application finished starting? |
| Readiness probe | Traffic eligibility | Can this application accept requests? |
| Liveness probe | Restart decision | Is the application stuck or unable to make progress, requiring a restart? |

A simple example: your FastAPI application starts, but it still needs to connect to PostgreSQL and load its configuration.
- The container may be running.
- The application may not be ready.
- Kubernetes should not send normal service traffic to it until readiness succeeds.

This distinction is correctly explained in the notes. Kubernetes documents that failing readiness removes a Pod from matching Service endpoints, while repeated liveness failures cause the container to restart.

#### Application testing after deployment

| Mechanism | What it verifies |
| --------- | ---------------- |
| Kubernetes probe | Workload health and traffic readiness |
| Smoke test | Critical application functionality |
| Integration test | Interaction between services and dependencies |
| E2E test | Complete user journey |

A successful readiness probe does not prove that login, payment, or checkout works correctly.

#### Continuous delivery versus continuous deployment

The notes explain this correctly:
- **Continuous delivery:** the release is ready, but production may require human approval.
- **Continuous deployment:** successful automated checks can take the release all the way to production without a manual approval gate.

**Assessment:** This chapter is technically sound, with the `selfHeal` and pruning distinction worth adding.

---

### Chapter 4 — Database Migration Strategies

**Critical for real production systems.**

**Purpose:** Ensure old and new application versions can safely coexist with the database during deployment.

This becomes particularly important with rolling and canary deployments.

Consider this database:
```
users
-------------------------
id
full_name
```

Version 1 reads `full_name`. Version 2 wants to use `display_name`.

A dangerous approach is:
```
Rename full_name
       │
       ▼
Deploy version 2
```

Version 1 instances still running during the deployment will fail.

The **expand-and-contract** approach solves this through multiple stages:

1. **Expand** — Add `display_name`. Keep `full_name`.
2. **Deploy compatible code** — New code supports the old and new schema. It can read old data and write both columns.
3. **Backfill** — Copy existing `full_name` values into `display_name`.
4. **Switch** — New application code reads from `display_name`.
5. **Contract** — Remove `full_name` after all old application versions and dependencies are gone.

One extra condition: do not stop dual-writing or remove the old column until you have verified that old application instances, background workers, scheduled jobs, and other consumers no longer depend on it.

**Why this chapter matters:** Rolling back an application image does not reverse database changes. Database compatibility must be designed separately.

---

### Chapter 5 — Deployment and Release Strategies

**Purpose:** Release new software while minimizing the impact of failures.

These three strategies solve related problems but are not interchangeable.

**1. Rolling deployment** — Replace old instances gradually with new instances.
- Resource-efficient.
- No requirement to run a complete duplicate environment.
- Old and new versions may coexist temporarily.
- No precise percentage traffic split by default.

**2. Blue-green deployment** — Prepare the new environment and switch traffic when ready.
- Fast traffic switch.
- Old version can remain available for rollback.
- Requires additional infrastructure capacity.
- Database compatibility and side effects still matter.

**3. Canary deployment** — Release to a small share of production traffic first.
- Limits initial blast radius.
- Allows real production observation.
- Requires reliable traffic management and monitoring.
- Needs enough traffic and meaningful metrics to make decisions.

#### Important: Kubernetes Service versus traffic router

A Kubernetes Service normally distributes requests across its ready endpoints. It does not provide a guaranteed 95%/5% traffic split between two versions.

For precise traffic routing, you need an appropriate traffic-management layer.

The notes correctly describe the roles:

| Component | Responsibility |
| --------- | -------------- |
| Argo Rollouts | Controls rollout steps and requested traffic weights |
| AWS Load Balancer Controller | Configures AWS ALB resources based on Kubernetes configuration |
| AWS ALB | Routes incoming requests to the configured target groups |

Argo Rollouts' ALB integration uses weighted target groups to split traffic between stable and canary services.

#### Automated rollout analysis

This is an advanced and valuable concept.

```
Deploy v2 to 5% traffic
        │
        ▼
Query Prometheus
        │
        ├──► Error rate acceptable?
        ├──► Latency acceptable?
        ├──► Business metrics acceptable?
        │
        ▼
Continue rollout or abort
```

Argo Rollouts supports `AnalysisTemplate` and `AnalysisRun` resources for metric-based decisions during progressive delivery.

One important practical qualification: a threshold such as "error rate below 1%" is only an example. A production rollout should also consider traffic volume, baseline performance, measurement windows, and the reliability of the metrics themselves.

#### Feature flags

The distinction is correct:
- **Canary** controls which percentage of traffic receives a version.
- **Feature flags** control whether a feature is enabled.

A feature can be deployed but remain disabled.

One additional engineering concern: feature flags need ownership, access control, and cleanup. Temporary flags that remain forever create technical debt.

**Assessment:** This chapter is strong and production-oriented.

---

### Chapter 6 — Observability and Recovery

**Purpose:** Know what is happening in production and recover when something fails.

The three signals are:

| Signal | Main purpose | Example |
| ------ | ------------ | ------- |
| Metrics | Measure system behavior over time | P95 latency, error rate |
| Logs | Explain individual events | Payment failed |
| Traces | Follow a request across services | Frontend → API → payment service → DB |

For example, a customer reports that payment is slow.
1. Metrics show that API latency increased.
2. Traces identify the payment service as the slow component.
3. Logs explain that a database query timed out.

This is why the three signals work together.

The tool mapping is sensible:
- **OpenTelemetry:** telemetry instrumentation and collection standards.
- **Prometheus:** metrics storage and querying.
- **Grafana:** dashboards and visualization.
- **PagerDuty:** on-call notification.

#### Rollback analysis

Two situations are correctly distinguished:

| Situation | Recovery mechanism |
| --------- | ------------------ |
| Canary is still progressing and failing | Abort the active Argo Rollouts deployment |
| Deployment is complete and needs reversal | Revert the desired image in Git; let Argo CD reconcile |

The most important limitation is database compatibility. Returning to an old image cannot necessarily reverse an incompatible schema change or undo external side effects.

One improvement: rollback should not be treated as the only recovery strategy. Incident response may also require disabling a feature flag, scaling capacity, routing traffic away from a failing dependency, or applying a forward fix.

**Assessment:** Good coverage. You should eventually add SLOs, error budgets, and distributed trace correlation.

---

### Chapter 7 — Infrastructure as Code

**Purpose:** Manage infrastructure changes using the same review and version-control discipline as application changes.

```
Terraform / OpenTofu
        │
        ▼
Git repository
        │
        ▼
Pull request
        │
        ▼
terraform plan
        │
        ▼
Review
        │
        ▼
terraform apply
        │
        ▼
AWS infrastructure
```

This makes infrastructure changes reviewable and repeatable.

A production implementation should also consider:
- Remote state storage.
- State locking and concurrent execution.
- Secure state access.
- Drift detection.
- Separate environments and permissions.

These additional implementation details are not covered in the original notes, but they are important when moving from learning to production.

---

### Chapter 8 — Platform Governance and Developer Portals

This chapter introduces two different responsibilities.

**Kyverno — policy enforcement**
- Block privileged containers.
- Require resource limits.
- Allow only approved container registries.

**Backstage — developer experience**
- Service ownership.
- Repository discovery.
- Documentation.
- Service templates.
- Links to engineering tools.

| Tool | Main question |
| ---- | ------------- |
| Kyverno | Is this Kubernetes resource allowed? |
| Backstage | How can developers discover and use our platform? |

Backstage does not replace Kubernetes, GitHub Actions, or Argo CD. It provides a developer-facing portal over the engineering ecosystem.

---

### Chapter 9 — Full Pipeline Summary

This chapter brings the preceding concepts together.

The central production release chain is:

```
Developer
   │
   ▼
Pull Request
   │
   ▼
CI validation
   │
   ▼
Build one Docker image
   │
   ▼
Push to Amazon ECR
   │
   ▼
Scan + SBOM + Attestation
   │
   ▼
Deploy exact digest to Staging
   │
   ▼
Test application
   │
   ▼
Approve production release
   │
   ▼
Deploy same digest to Production
   │
   ▼
Observe metrics, logs, traces
   │
   ▼
Recover if required
```

This is the strongest summary of the entire document.

---

## 3. Technical accuracy review — what to correct or clarify

Most of the notes should be retained. However, the following changes are recommended before treating them as final study material.

### Important corrections

| Section | Existing explanation | Recommended improvement |
| ------- | -------------------- | ----------------------- |
| 1.3 Branch protection | Both checks and reviewer approval must pass | True when both rules are configured as required; approval requirements are configurable. |
| 1.4 Runners | Credentials expire when the job finishes | AWS STS credentials expire according to their configured session duration, not necessarily at job completion. |
| 2.2 Docker | Copies `node_modules` from the build stage | This may include development dependencies. Install or prune production dependencies separately. |
| 2.5 Image digest | Digest is immutable | A digest is content-addressed and identifies a specific manifest. It is the stronger deployment reference than a mutable tag. |
| 2.8 Attestation | A signed attestation proves the artifact's origin | It provides verifiable claims, but consumers must validate the signing identity and trusted build source. |
| 3.3 Argo CD | Automated sync reconciles cluster changes | Automatic sync, self-healing and pruning are distinct configuration capabilities. |
| 3.4 Readiness | Traffic goes only to ready Pods | Correct in principle; external load balancers may have additional health-check and propagation delays. |
| 4.1 Database migration | Dual-write and backfill | Also verify old application instances, background workers and other consumers before removing the old column. |
| 5.3 Canary | 5% of traffic reaches the new version | This requires an appropriate traffic router; ordinary Kubernetes Service load balancing does not guarantee this percentage. |
| 5.5 Analysis | Error rate below a threshold means success | Include traffic volume, baseline comparison, measurement duration and sufficient samples. |
| 6.3 Rollback | Reverting the image restores the old application | It does not automatically reverse database changes, messages, transactions or external side effects. |

### Additional concepts missing from the notes

These are not necessarily mistakes. They are topics worth adding as you progress toward production-level understanding.

| Area | Additional concept | Why it matters |
| ---- | ------------------ | -------------- |
| CI | Integration test environments | Test interactions with real dependencies. |
| Docker | Non-root container execution | Reduces the impact of container compromise. |
| Docker | Image signing and signature verification | Adds another layer of artifact trust. |
| Security | Container runtime security | Image scanning does not detect every runtime threat. |
| Kubernetes | Resource requests and limits | Prevents uncontrolled resource consumption. |
| Kubernetes | Network policies and RBAC | Controls communication and access. |
| GitOps | `selfHeal` and pruning | Clarifies how Argo CD handles drift and removed resources. |
| Database | Migration rollback and recovery | Database changes need a recovery plan of their own. |
| Deployment | SLOs and error budgets | Provides meaningful production health criteria. |
| Observability | Distributed trace correlation | Connects logs, metrics and traces across services. |
| IaC | Terraform state and drift | Essential for safe infrastructure management. |

---

## 4. How everything works in a real full-stack application

Imagine an online banking-style application:
- Angular frontend
- FastAPI backend
- PostgreSQL database
- Docker containers
- Kubernetes
- GitHub Actions
- Amazon ECR
- Argo CD

### Example production architecture

```
Angular frontend (Login · Accounts · Payments)
        │
        ▼
API Gateway / Load Balancer
        │
        ├──► FastAPI v1 (Stable)
        └──► FastAPI v2 (Canary)
                 │
                 ▼
        PostgreSQL (Accounts · Transactions · Users)

Deployment and infrastructure:
GitHub Actions → Amazon ECR → Argo CD → Kubernetes → Argo Rollouts

Monitoring:
OpenTelemetry → Prometheus → Grafana → Alerting
```

### Example: you change the payment API

Suppose you modify:

```python
@app.post("/payments")
def create_payment():
    # New payment validation logic
    return {"status": "success"}
```

What happens?

| Step | What happens | Related chapter |
| ---- | ------------ | --------------- |
| 1 | Developer commits code; Gitleaks and linting run | 1 |
| 2 | Pull request triggers unit tests and security checks | 1 |
| 3 | Reviewer approves and code merges | 1 |
| 4 | Docker image is built once | 2 |
| 5 | Image is pushed to ECR using temporary AWS credentials | 2 |
| 6 | Image is scanned and SBOM is generated | 2 |
| 7 | Image digest is recorded and attested | 2 |
| 8 | Staging configuration is updated in Git | 3 |
| 9 | Argo CD deploys the image to Kubernetes | 3 |
| 10 | Probes and API tests verify the deployment | 3 |
| 11 | Database migration runs using a backward-compatible strategy | 4 |
| 12 | Argo Rollouts sends 5% of traffic to the new version | 5 |
| 13 | Prometheus metrics are evaluated | 5, 6 |
| 14 | If healthy, traffic increases to 20%, 50%, then 100% | 5 |
| 15 | If unhealthy, rollout aborts and traffic returns to stable | 5, 6 |

The important thing to understand is that CI/CD is not one tool or one YAML file. It is a coordinated system of engineering controls.

---

## 5. Which concepts should you learn first?

The document contains many tools. Don't try to learn all of them simultaneously.

### Recommended learning priority

**Priority 1 — Foundation (Essential)**
- Git and GitHub
- GitHub Actions
- CI workflow YAML
- Dockerfile and multi-stage builds
- Docker images and containers
- Unit and integration tests

**Priority 2 — Artifact and deployment (Essential)**
- Container registries
- Tags and digests
- Environment variables and secrets
- Kubernetes Deployments and Services
- Readiness, liveness and startup probes
- Staging and production

**Priority 3 — Production engineering (Advanced)**
- Argo CD and GitOps
- Expand-and-contract database migration
- Rolling, blue-green and canary deployment
- Prometheus and Grafana
- Rollback and recovery

**Priority 4 — Enterprise platform (Specialized)**
- OIDC and cloud IAM
- SBOM and provenance
- Container signing and verification
- Argo Rollouts
- Kyverno
- Terraform / OpenTofu
- Backstage

### Practical implementation project

Build one application and progressively add the concepts rather than building nine separate demonstrations.

| Phase | Practical implementation | What you will learn |
| ----- | ------------------------ | ------------------- |
| 1 | Angular + FastAPI + PostgreSQL | Full-stack application |
| 2 | Docker Compose | Containerization |
| 3 | GitHub Actions CI | Automated validation |
| 4 | Docker multi-stage build | Production image |
| 5 | Container registry | Artifact storage |
| 6 | Kubernetes | Application deployment |
| 7 | Argo CD | GitOps |
| 8 | Database migration | Expand and contract |
| 9 | Argo Rollouts | Canary deployment |
| 10 | Prometheus + Grafana | Monitoring and recovery |
| 11 | Trivy + SBOM | Supply-chain security |
| 12 | Terraform | Infrastructure as Code |

You can begin this project locally using Docker Desktop and Kubernetes. Cloud services such as Amazon ECR and AWS IAM can be introduced later when you are ready to learn cloud-specific authentication and registry workflows.

---

## 6. Interview preparation — the seven most important questions

The document ends with seven questions. These are excellent interview topics.

| # | Interview question | Key concepts to explain |
| - | ------------------ | ----------------------- |
| 1 | How do you ensure code quality before merging? | PR checks, unit tests, SAST, branch protection |
| 2 | How do you ensure the production artifact is the one tested in staging? | Build once, digest, artifact promotion |
| 3 | How do you know what dependencies are inside a container? | SBOM, Syft, CycloneDX |
| 4 | How do you verify an image came from a trusted build? | Provenance, attestation, signature verification |
| 5 | How do you deploy the same application across environments? | Registry, image digest, GitOps, configuration separation |
| 6 | How do you minimize deployment risk? | Rolling, blue-green, canary, feature flags |
| 7 | How do you detect and recover from production failures? | Metrics, logs, traces, alerts, rollback |

---

## Test your understanding — CI/CD knowledge check

**1. A staging deployment passes, but production independently builds the Docker image again from the same commit. What is the main problem?**
- **Production may receive a different artifact** ✅
- Kubernetes cannot run the image
- GitHub Actions cannot deploy to production

> The source commit is the same, but the independently built image may differ. Promote the exact image digest tested in staging.

**2. Your container is Running, but your FastAPI application is still connecting to PostgreSQL. Which probe should prevent normal traffic?**
- Liveness probe
- **Readiness probe** ✅
- Startup probe only

> Readiness controls whether the Pod receives Service traffic. Startup probes help with slow startup, while liveness determines when a container should be restarted.

**3. During a canary deployment, the new version has a high error rate. Which component can evaluate metrics and abort the rollout?**
- Backstage
- **Argo Rollouts** ✅
- Syft

> Argo Rollouts can evaluate metrics through AnalysisTemplates and AnalysisRuns, and abort an unhealthy rollout.

**4. Your old application version uses `full_name`, while the new version uses `display_name`. What should you do?**
- Immediately delete `full_name`
- **Use an expand-and-contract migration** ✅
- Rebuild the Docker image

> Keep the old schema compatible while deploying new code, backfilling data and transitioning reads. Remove the old column only when it is safe.

**5. What is the purpose of an SBOM?**
- To route 5% traffic to a canary
- **To list software components and versions** ✅
- To roll back a Kubernetes Deployment

> An SBOM is an inventory of software components and versions inside an artifact.

---

## 7. Final verdict

**Strong learning material.** The notes cover the important areas of a modern production CI/CD system:

- **Software engineering:** CI, testing and code quality.
- **DevOps:** Docker, runners, build pipelines and deployment.
- **Cloud and security:** OIDC, IAM, ECR, scanning and supply-chain trust.
- **Kubernetes:** deployments, probes and services.
- **GitOps:** Argo CD and reconciliation.
- **Progressive delivery:** canary, blue-green and Argo Rollouts.
- **SRE / operations:** observability, alerting and recovery.
- **Platform engineering:** IaC, Kyverno and Backstage.

The most important distinction to remember is:

> CI validates your change. Artifact security establishes trust. CD delivers it. Progressive delivery controls exposure. Observability tells you whether it works. Recovery limits the damage when it doesn't.

Use this as the main CI/CD study syllabus, with the technical corrections above incorporated before turning it into a final reference document.

For current implementation details, the relevant primary documentation includes Kubernetes probes, Argo Rollouts traffic management and Argo Rollouts analysis.
