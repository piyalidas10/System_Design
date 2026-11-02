# How a Modern CI/CD Pipeline Works in Production (2026)

> How do engineering teams at companies like Adobe, Spotify, Uber, GitHub, and Meta move one code change to production safely?
>
> This document traces a single code change from a developer's laptop — through local checks, pull request CI, Docker build, artifact trust, staging, Kubernetes deployment, production rollout, observability, and rollback — explaining every step along the way.

<img src="./How Modern CI_CD Works Securely.png" width="100%" />

---

## Table of Contents

1. [Chapter 1 — CI and Build Verification](#chapter-1--ci-and-build-verification)
   - [Pre-commit hooks and local checks](#11-pre-commit-hooks-and-local-checks)
   - [Pull request and CI checks](#12-pull-request-and-ci-checks)
   - [Branch protection and required checks](#13-branch-protection-and-required-checks)
   - [Runners — who executes the pipeline?](#14-runners--who-executes-the-pipeline)
   - [Merging to main and environments](#15-merging-to-main-and-environments)
2. [Chapter 2 — Artifact Trust and Security](#chapter-2--artifact-trust-and-security)
   - [Build once, deploy many](#21-build-once-deploy-many)
   - [Multi-stage Docker builds](#22-multi-stage-docker-builds)
   - [Build caching](#23-build-caching)
   - [OIDC authentication to Amazon ECR](#24-oidc-authentication-to-amazon-ecr)
   - [Image tags vs. image digests](#25-image-tags-vs-image-digests)
   - [Container security scanning](#26-container-security-scanning)
   - [SBOM — Software Bill of Materials](#27-sbom--software-bill-of-materials)
   - [Build provenance and attestations](#28-build-provenance-and-attestations)
3. [Chapter 3 — GitOps and Staging](#chapter-3--gitops-and-staging)
   - [Promotion — moving the same artifact forward](#31-promotion--moving-the-same-artifact-forward)
   - [Environment configuration and secrets](#32-environment-configuration-and-secrets)
   - [GitOps and Argo CD](#33-gitops-and-argo-cd)
   - [Kubernetes health checks (probes)](#34-kubernetes-health-checks-probes)
   - [Application testing after deployment](#35-application-testing-after-deployment)
   - [Continuous delivery vs. continuous deployment](#36-continuous-delivery-vs-continuous-deployment)
4. [Chapter 4 — Database Migration Strategies](#chapter-4--database-migration-strategies)
   - [Expand and contract pattern](#41-expand-and-contract-pattern)
5. [Chapter 5 — Deployment and Release Strategies](#chapter-5--deployment-and-release-strategies)
   - [Rolling deployment](#51-rolling-deployment)
   - [Blue-green deployment](#52-blue-green-deployment)
   - [Canary deployment](#53-canary-deployment)
   - [Traffic routing with Argo Rollouts and AWS ALB](#54-traffic-routing-with-argo-rollouts-and-aws-alb)
   - [Automated rollout analysis](#55-automated-rollout-analysis)
   - [Feature flags](#56-feature-flags)
6. [Chapter 6 — Observability and Recovery](#chapter-6--observability-and-recovery)
   - [Metrics, logs, and traces](#61-metrics-logs-and-traces)
   - [Alerting](#62-alerting)
   - [Rollback](#63-rollback)
7. [Chapter 7 — Infrastructure as Code](#chapter-7--infrastructure-as-code)
8. [Chapter 8 — Platform Governance and Developer Portals](#chapter-8--platform-governance-and-developer-portals)
9. [Chapter 9 — Full Pipeline Summary](#chapter-9--full-pipeline-summary)
10. [The Seven Questions Every Production Pipeline Must Answer](#the-seven-questions-every-production-pipeline-must-answer)

---

## Chapter 1 — CI and Build Verification

### 1.1 Pre-commit hooks and local checks

Before pushing code, a developer can run checks locally using **pre-commit hooks**. A hook is a script that runs before `git commit` is created.

**Example — Gitleaks pre-commit hook:**

```
Developer stages changes
        │
        ▼
  git commit runs
        │
        ▼
  Pre-commit hook executes
        │
        ├─ Gitleaks scans staged changes for secrets
        ├─ Linter checks formatting
        └─ If a secret is detected → hook FAILS → commit is blocked
```

**Why local checks are not enough:**

| Problem | Explanation |
|---------|-------------|
| Not universally installed | Another developer may not have the hook configured |
| Can be bypassed | `git commit --no-verify` skips all hooks |
| Developer-specific | No common enforcement point across the team |

> Local checks are useful for catching simple mistakes early, but the team cannot depend on them alone.

---

### 1.2 Pull request and CI checks

When a developer pushes a branch and opens a **pull request**, the CI workflow runs automatically.

```
Developer opens pull request
        │
        ▼
  GitHub Actions triggers CI workflow
        │
        ├─ Formatting check
        ├─ Unit tests
        ├─ Code security (SAST)
        ├─ Dependency security (SCA)
        └─ Secret detection
```

**What CI achieves:**

- Every pull request goes through the **same validation**, regardless of who wrote the code.
- Validation is no longer dependent on a developer's local machine.
- This is **Continuous Integration** — integrating and validating every change continuously.

---

### 1.3 Branch protection and required checks

GitHub allows protecting the `main` branch using **branch protection rules** or **rulesets**.

Inside those rules, specific CI checks can be marked as **required checks**.

```
Pull request opens
        │
        ▼
  CI runs all checks
        │
        ├─ Required check passes ──────────────────────────┐
        └─ Required check fails → merge is BLOCKED         │
                                                           ▼
                                               Both conditions must be true
                                               to allow merge:
                                               1. Required checks pass
                                               2. Required reviewer approves
```

**Two enforcement conditions before merge:**

| Condition | What it enforces |
|-----------|-----------------|
| Required checks pass | Automated validation (tests, security, quality) |
| Reviewer approval | Human review and sign-off |

---

### 1.4 Runners — who executes the pipeline?

GitHub Actions decides **what** work should happen. A **runner** is the machine that **does** that work.

| Runner type | Description | Consideration |
|-------------|-------------|---------------|
| **GitHub-hosted runner** | GitHub provides a fresh environment per job. Job finishes → environment is removed. | Managed by GitHub; no cleanup required |
| **Self-hosted runner (persistent)** | Company manages its own machine. Remains between jobs. | Company must handle cleanup and isolation |
| **Ephemeral self-hosted runner** | Company-managed, handles one job and is then removed. | Cleaner isolation; more operational overhead |

Companies choose self-hosted runners for special hardware, private network access, or greater control.

---

### 1.5 Merging to main and environments

Once all required checks pass and reviewers approve, the change merges into `main`.

**The question changes at this point:**  
Before merge: *Is this change safe enough to merge?*  
After merge: *What exactly are we going to deploy?*

**Environments:**

An environment is a complete setup where the application runs for a particular purpose.

| Environment | Purpose |
|-------------|---------|
| **Development / local** | Active development and local testing |
| **Staging** | Production-like environment — validate a release before real users receive it |
| **Production** | Live environment used by real users |

> Test with less risk first before changing the production system.

---

## Chapter 2 — Artifact Trust and Security

### 2.1 Build once, deploy many

**Problem:** If staging builds the application from source and production builds it again separately, both builds are different. What exactly did staging validate?

**Solution — build once, deploy many:**

```
Code merged to main
        │
        ▼
  Release workflow builds the application ONE time
        │
        ▼
  Output = artifact (container image, jar, dist folder, etc.)
        │
        ├─ Staging validates this exact artifact
        └─ Production receives this same artifact (not a rebuild)
```

> The artifact is what we prepare to deploy. Source code is what we write.

---

### 2.2 Multi-stage Docker builds

A TypeScript backend needs a TypeScript compiler, dev dependencies, and test tools to **build**. Production needs none of those.

**Multi-stage build:**

```dockerfile
# Stage 1 — build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # compile TypeScript → JavaScript

# Stage 2 — runtime (only what production needs)
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

| What stays in the build stage | What goes into the final image |
|-------------------------------|-------------------------------|
| TypeScript compiler | Compiled application |
| Dev dependencies | Production dependencies |
| Test tools | Required OS libraries |
| Build utilities | — |

> We use the full toolbox to build the image but we do not ship the whole toolbox to production.

---

### 2.3 Build caching

**Two different caching layers:**

| Type | How it works | Behaviour on cache miss |
|------|-------------|------------------------|
| **Dependency caching** (GitHub Actions) | Caches package manager downloads between jobs using a cache key | Downloads again from the registry |
| **Docker layer caching** | Docker reuses a cached layer if that layer and its inputs have not changed | All subsequent layers may also rebuild |

> **Important:** Once a Docker layer is invalidated, the layers after it may need to rebuild. This is why Dockerfile structure matters — copy dependency manifests first, install, then copy application code.

Caching is an **optimization** — it is never guaranteed. It avoids unnecessary work but does not change the release itself.

---

### 2.4 OIDC authentication to Amazon ECR

**Problem with long-lived keys:** Storing a permanent AWS access key in GitHub Secrets means if the key leaks, it can be used until manually revoked.

**Solution — OIDC (OpenID Connect):**

```
GitHub Actions job starts
        │
        ▼
  Job requests OIDC identity token from GitHub
        │
        ▼
  AWS checks token against IAM role trust policy
  (Is this token from the repository and branch we trust?)
        │
        ▼
  AWS STS issues temporary credentials for the IAM role
        │
        ▼
  IAM permission policy limits what the role can do
  (e.g. push to this ECR repository only — least privilege)
        │
        ▼
  Job uses temporary credentials → job finishes → credentials expire
```

**Key principles:**

- **Least privilege** — grant only the permissions the workflow actually needs.
- **Temporary credentials** — no permanent key stored anywhere.
- **Short-lived** — credentials expire when the job finishes.

---

### 2.5 Image tags vs. image digests

| Reference | What it is | Cryptographic? | Mutable? |
|-----------|-----------|----------------|----------|
| **Tag** (`myapp:a84f92c`) | Naming convention using the git commit SHA | No | Depends on registry configuration |
| **Digest** (`sha256:93ab...`) | Identifies the exact image manifest and content | Yes | No — immutable |

- A **tag** gives traceability (which commit was intended) and is a convenience label.
- A **digest** identifies the **exact** image content with cryptographic certainty.
- For staging → production promotion, always use the **digest** as the deployment reference.

> ECR can be configured to prevent existing tags from being overwritten, but the digest is always the stronger reference.

---

### 2.6 Container security scanning

The application may build and tests may pass, but a library inside the image may have a known critical vulnerability.

**Tools:**

| Tool | What it does |
|------|-------------|
| **Trivy** | Scans packages inside the image for known vulnerabilities |
| **ECR enhanced scanning (Amazon Inspector)** | Continuously monitors stored images; updates findings when new CVEs are discovered |

> Scanning answers one question: **Do we know about a security problem inside this image?**

---

### 2.7 SBOM — Software Bill of Materials

**Problem:** A critical vulnerability is discovered in one npm package. Which of our applications actually use it?

An **SBOM (Software Bill of Materials)** is an inventory — an ingredient list of every software component and version inside the artifact.

```
Container image
        │
        ▼
  Syft or CycloneDX generates SBOM
        │
        ▼
  SBOM records:
  ├─ Component names and versions
  ├─ Package types (npm, pip, deb, rpm, etc.)
  └─ License information
```

> An SBOM is an **inventory**, not a guarantee that every component was perfectly detected. It enables faster vulnerability impact analysis across many applications.

---

### 2.8 Build provenance and attestations

**Problem:** We have the image digest and the SBOM. But how do we know this image really came from our repository and CI workflow? Someone could build a different image and push it to the registry.

**Build provenance** records *how* the artifact was created:
- Which repository?
- Which commit?
- Which CI workflow produced it?

**Attestation flow:**

```
CI workflow builds the image
        │
        ▼
  GitHub Actions generates an attestation
  (connects the artifact digest to the build metadata)
        │
        ▼
  Attestation is cryptographically signed
        │
        ▼
  When consuming the artifact, verify the attestation:
  ├─ Does the signature belong to this digest?
  ├─ Does the source repository match what we trust?
  └─ Does the workflow match what we expect?
```

> An attestation does not mean the application has no vulnerabilities. It answers a **different** question: *Where did this artifact come from?*

**Three pieces of information we now have:**

| Question | Answered by |
|----------|-------------|
| Which exact image is this? | Image digest (`sha256:...`) |
| What is inside it? | SBOM (Syft, CycloneDX) |
| Where did it come from? | Build provenance and attestation |

---

## Chapter 3 — GitOps and Staging

### 3.1 Promotion — moving the same artifact forward

Once the artifact is built, scanned, and trusted, it must not be rebuilt. **Promotion** is moving the same exact image from one environment to the next.

```
Image sha256:93ab built and validated
        │
        ▼
  Staging receives sha256:93ab
        │
  Staging tests pass
        │
        ▼
  Production receives sha256:93ab  ← same image, no rebuild
```

---

### 3.2 Environment configuration and secrets

The same image runs in every environment, but each environment has different configuration.

| Category | Example — staging | Example — production |
|----------|-------------------|----------------------|
| **Application config** | `DATABASE_URL=staging-db` | `DATABASE_URL=production-db` |
| **Deployment settings** | 2 replicas | 20 replicas |
| **Feature flags** | Feature X enabled | Feature X disabled |
| **Secrets** | Managed separately — never baked into the image | Managed separately — never baked into the image |

**Secrets management in Kubernetes:**

```
AWS Secrets Manager (stores the secret)
        │
        ▼
  External Secrets Operator
  (fetches from AWS and syncs into Kubernetes Secrets)
        │
        ▼
  Application consumes the secret
  (via environment variables or mounted files)
```

> Same image. Different environment configuration. Secrets always managed externally — never embedded in the container image.

---

### 3.3 GitOps and Argo CD

**Option A — direct CI deployment:**

```
CI pipeline → kubectl apply → Kubernetes cluster changes
```

Works, but CI is directly modifying the cluster with no audit trail.

**Option B — GitOps:**

```
Git records the desired state (which image should run)
        │
        ▼
  GitOps controller watches Git
        │
        ▼
  Controller reconciles the actual cluster state toward the desired state
```

**Argo CD reconciliation loop:**

```
Git says: run sha256:93ab (version 2)
Kubernetes is running: sha256:aa11 (version 1)
        │
        ▼
  Argo CD detects: application is OUT OF SYNC
        │
        ├─ Manual sync: operator triggers sync
        └─ Automated sync: Argo CD applies the change automatically
                │
                ▼
          Kubernetes now runs sha256:93ab (version 2)
          Application is IN SYNC
```

| Concept | Explanation |
|---------|-------------|
| **Desired state** | What Git says should be running |
| **Actual state** | What is currently running in Kubernetes |
| **Reconciliation** | The process of bringing actual state in line with desired state |
| **Out of sync** | Desired state and actual state differ |

---

### 3.4 Kubernetes health checks (probes)

A container can be running but still not be ready. Kubernetes provides three types of probes:

| Probe | Question it answers |
|-------|---------------------|
| **Startup probe** | Has this application finished starting? |
| **Readiness probe** | Is this application ready to receive traffic? |
| **Liveness probe** | Is this application still healthy, or should Kubernetes restart its containers? |

> A container can be `Running` but still fail readiness. Traffic is only sent to pods that pass their readiness probe.

---

### 3.5 Application testing after deployment

Kubernetes probes check whether the *workload* is running. Application tests check whether the *system* actually works.

| Test type | What it checks | Example |
|-----------|---------------|---------|
| **Smoke tests** | Most critical functionality is reachable | Did the application start? Can the main API respond? |
| **Integration tests** | Services communicate correctly | Can the app reach the staging database? Can it call other services? |
| **End-to-end tests** | Complete user journeys work | Can the user log in, add to cart, and complete checkout? (Playwright) |

---

### 3.6 Continuous delivery vs. continuous deployment

| Approach | Description |
|----------|-------------|
| **Continuous delivery** | Pipeline automatically builds, tests, and prepares the release. A **human still approves** the final production deployment. |
| **Continuous deployment** | All required automated checks pass → the release continues to production **automatically** — no human approval required. |

Neither is universally better:

- A highly regulated system may require human approval.
- A low-risk service may be comfortable with fully automated deployment.

---

## Chapter 4 — Database Migration Strategies

### 4.1 Expand and contract pattern

**Problem:** During rolling and canary deployments, version 1 and version 2 may run simultaneously against the same database.

If version 1 uses column `full_name` and version 2 renames it to `display_name`:
- Removing `full_name` first breaks version 1 immediately.
- Rolling back the application image may still fail — the database is no longer compatible.

**Solution — expand and contract (multi-step migration):**

```
Step 1 · EXPAND
  Add the new column (display_name) while keeping the old column (full_name).
  New application code reads from both columns (fallback to old if new is empty).
  New application code writes to BOTH columns (dual write).

Step 2 · DEPLOY
  Deploy the backward-compatible application version.

Step 3 · BACKFILL
  Populate display_name from existing full_name data for all existing rows.

Step 4 · SWITCH
  Application now relies only on display_name.

Step 5 · CONTRACT
  Remove full_name only after ALL old application instances are gone.
```

> Expand and contract is not "add a column then delete the old one." It is a staged migration that keeps the application and database backward compatible while old and new versions coexist.

---

## Chapter 5 — Deployment and Release Strategies

All three strategies solve the same basic problem — moving from version 1 to version 2 in production — but they manage production risk differently.

### 5.1 Rolling deployment

```
Production running: [v1] [v1] [v1] [v1] [v1] [v1]
        │
Kubernetes starts new v2 pods:
        ├─ [v2] [v2] [v1] [v1] [v1] [v1]   ← new pods ready, old removed
        ├─ [v2] [v2] [v2] [v2] [v1] [v1]
        └─ [v2] [v2] [v2] [v2] [v2] [v2]   ← rollout complete
```

**Kubernetes controls:**

| Setting | Effect |
|---------|--------|
| `maxUnavailable` | How many pods can be unavailable during the update |
| `maxSurge` | How many extra pods can be temporarily created |

**Important limitation:** Rolling deployment does not guarantee precise percentage traffic splits between old and new versions. Traffic distribution depends on how many ready pods exist behind the service. For precise traffic control, a separate traffic management layer is needed.

---

### 5.2 Blue-green deployment

```
Blue (v1) ── serving 100% of production traffic
Green (v2) ── prepared and health-checked (no user traffic yet)
        │
  Switch traffic:
        │
Blue (v1) ── idle (kept available for fast rollback)
Green (v2) ── serving 100% of production traffic
```

**Trade-offs:**

| Advantage | Trade-off |
|-----------|-----------|
| Old version remains available for fast rollback | Both versions need infrastructure to run simultaneously |
| Zero-downtime traffic switch | Rolling back is only safe if database/data changes are still compatible |
| — | External side effects (writes, events) from the new version are not undone by a traffic switch |

---

### 5.3 Canary deployment

```
Stable (v1) ── 95% of production traffic
Canary (v2) ── 5% of production traffic
        │
  Observe behavior: error rate, latency, business metrics
        │
        ├─ Healthy? Increase traffic: 5% → 20% → 50% → 100%
        └─ Unhealthy? Stop rollout before the full production workload is exposed
```

**Key concept — blast radius:**  
Blast radius means how much is affected when something goes wrong. A canary deployment keeps the initial blast radius small.

> The percentages describe *traffic distribution*, not exact user routing. Traffic generally flows through the ready pods behind the service.

---

### 5.4 Traffic routing with Argo Rollouts and AWS ALB

```
Incoming requests
        │
        ▼
  AWS Application Load Balancer (ALB)
        │
        ├─ Weighted target group A: Stable (v1) ── 95%
        └─ Weighted target group B: Canary (v2)  ── 5%
```

**Who does what:**

| Component | Responsibility |
|-----------|---------------|
| **Argo Rollouts** | Controls rollout progression and desired traffic weights |
| **AWS Load Balancer Controller** | Converts Kubernetes ingress configuration into AWS ALB configuration |
| **AWS ALB** | Actually routes requests between weighted target groups |

---

### 5.5 Automated rollout analysis

Instead of watching dashboards manually, define the signals and conditions before the rollout starts.

```
Before rollout:
  Define analysis template:
  ├─ Which metrics to query (Prometheus)
  ├─ Success conditions (e.g. error rate < 1%)
  └─ Failure conditions (e.g. error rate > 5% for 5 minutes)

During rollout:
  Argo Rollouts creates an Analysis Run
  ├─ Measurements satisfy success conditions → rollout continues
  └─ Failure conditions reached → analysis fails → rollout aborts
```

> Monitoring is not something used only *after* deployment. It can become part of the **deployment decision itself**.

---

### 5.6 Feature flags

Feature flags decouple **deployment** from **release**.

```
Request comes in
        │
        ▼
  Application evaluates the feature flag
        │
        ├─ Flag OFF → user sees old behavior
        └─ Flag ON  → user sees new feature
```

**Comparison:**

| Technique | Reduces risk by... |
|-----------|-------------------|
| Canary deployment | Limiting the percentage of users who receive the new version |
| Feature flag | Deploying code without releasing the feature; toggling it separately |
| Shadow traffic | Sending a copy of production traffic to a new version without affecting users |

---

## Chapter 6 — Observability and Recovery

### 6.1 Metrics, logs, and traces

| Signal | What it records | Example |
|--------|----------------|---------|
| **Metrics** | Numbers measured over time | Request rate, error rate, latency, CPU usage |
| **Logs** | Individual events | "Payment request failed for order 12345" |
| **Traces** | One request flowing through multiple services | API → payment service → database — where did it slow down? |

**Tools and standards:**

| Tool / Standard | Role |
|-----------------|------|
| **OpenTelemetry** | Vendor-neutral tools and standards to generate, collect, and export telemetry |
| **Prometheus** | Stores and queries metrics |
| **Grafana** | Visualizes metrics on dashboards |

> `/metrics` is the endpoint the application exposes to Prometheus. **Telemetry** means automating the collection and transmission of operational data (metrics, logs, traces).

---

### 6.2 Alerting

```
Alerting rule configured:
  "If P99 latency > 2s for 5 minutes, fire alert"
        │
        ▼
  Condition met at 2:00 AM
        │
        ▼
  Alerting system notifies the team
  (PagerDuty notifies the on-call engineer)
```

**A useful alert should include:**

- Which service and environment
- Which release is running (image digest, git commit)
- When did the problem begin
- Enough context to start investigating immediately

> We already connected each code change to an exact artifact. A production incident can now be traced back to the exact release that may have introduced it.

---

### 6.3 Rollback

**Rollback does not mean** checking out yesterday's source code and rebuilding. It means **restoring a previously known good application state**.

**GitOps rollback (completed deployment):**

```
Git currently says: run sha256:new (unhealthy)
Last known good: sha256:good
        │
        ▼
  Revert desired image in Git to sha256:good
        │
        ▼
  Argo CD reconciles the cluster back to sha256:good
```

**Argo Rollouts abort (active canary):**

```
Canary rollout is in progress (5% of traffic on v2)
v2 shows degraded error rate
        │
        ▼
  Argo Rollouts aborts the rollout
        │
        ▼
  Traffic returns to stable (v1)
```

**Important limitation:** If the release already made an **incompatible database or data change**, switching the application image back may not be enough. This is exactly why backward-compatible migrations (expand and contract) matter.

| Recovery type | When to use |
|---------------|-------------|
| Argo Rollouts abort | Active canary rollout; problem detected while still in progress |
| GitOps revert | Completed deployment that needs to be rolled back |

---

## Chapter 7 — Infrastructure as Code

**Problem with manual infrastructure changes:** An engineer opens the AWS console and manually changes a production setting. Later the team cannot answer: What exactly changed? Who reviewed it? Can we recreate the same setup?

**Solution — Infrastructure as Code (IaC):**

```
Infrastructure described in code (Terraform / OpenTofu)
        │
        ▼
  Infrastructure code lives in Git
        │
        ▼
  Change follows a familiar pipeline:
  ├─ Pull request
  ├─ Review
  ├─ Validation (terraform plan — preview what will change)
  └─ Apply the approved change
```

> Infrastructure changes become **versioned**, **reviewable**, and **auditable** — the same discipline applied to application code.

---

## Chapter 8 — Platform Governance and Developer Portals

### Policy enforcement — Kyverno

Just because someone wrote valid Kubernetes YAML does not mean it should be allowed into the cluster. A policy engine like **Kyverno** can enforce rules when resources are submitted to Kubernetes:

- Containers must define resource limits.
- Privileged containers are blocked.
- Only approved image sources are allowed.

### Developer portals — Backstage

At scale (hundreds of services), simple questions become difficult:

- Who owns this service?
- Where is its repository?
- Where is the documentation?
- How do I create a new service correctly?

**Backstage** (originally created at Spotify) acts as a front door for developers:

- Software catalog connecting each service to its owner, repository, documentation, and engineering systems.
- Makes a large engineering platform understandable and navigable.
- Does **not** replace GitHub Actions, Argo CD, or Kubernetes. It sits above them.

---

## Chapter 9 — Full Pipeline Summary

```
Developer's laptop
  └─ Local checks (Gitleaks pre-commit hook, linting)

Pull Request
  └─ CI: tests, security checks, dependency checks, secret detection
  └─ Required checks must pass + required reviewer must approve

Merge to main
  └─ Release workflow: build container image ONCE
  └─ Push to Amazon ECR
  └─ Record the exact artifact: tag (git SHA) + digest (sha256:...)

Artifact trust
  └─ Scan with Trivy (known vulnerabilities)
  └─ Generate SBOM with Syft (what is inside)
  └─ Generate attestation (where did it come from)

Staging
  └─ Git records: staging should run sha256:93ab
  └─ Argo CD detects out-of-sync → reconciles → Kubernetes deploys
  └─ Kubernetes probes verify the pod is healthy and ready
  └─ Smoke tests, integration tests, E2E tests (Playwright)

Production gate
  └─ Human approval (continuous delivery) or
  └─ Automated policy check (continuous deployment)

Production deployment
  └─ Same artifact promoted — not rebuilt
  └─ Rolling / blue-green / canary deployment strategy
  └─ Argo Rollouts + AWS ALB for precise traffic control
  └─ Automated analysis (Prometheus metrics, error rate, latency)

Production health
  └─ OpenTelemetry: metrics, logs, traces
  └─ Prometheus + Grafana dashboards
  └─ Alerting rules → PagerDuty on-call notification

Recovery
  └─ Argo Rollouts abort (active canary)
  └─ GitOps revert in Git → Argo CD reconciles back to known-good
```

---

## The Seven Questions Every Production Pipeline Must Answer

> Tools change. The engineering problems do not.

| # | Question |
|---|----------|
| 1 | **Can we trust the change?** — Did it pass required checks and human review? |
| 2 | **Can we build the exact artifact?** — Is the build reproducible and traceable? |
| 3 | **Do we know what is inside it?** — SBOM: every component and version inventoried. |
| 4 | **Do we know where it came from?** — Provenance and attestation verified. |
| 5 | **Can we move this same artifact through environments without rebuilding it?** — Build once, deploy many. |
| 6 | **Can we release it without exposing everyone to unnecessary risk?** — Rolling, blue-green, canary. |
| 7 | **Can we see what is happening in production and recover safely if something goes wrong?** — Observability, alerting, and rollback. |

> A production CI/CD system is not just GitHub Actions + Docker + Kubernetes.  
> It is about **controlling change, building trust, and managing production risk** — from the first code change all the way to real users.
