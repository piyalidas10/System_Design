# CI/CD

**What is a CI/CD Pipeline — Explained in 60 Seconds | System Design Foundation :** https://www.youtube.com/shorts/iWhvj9X2M7k

CI/CD is an automated software delivery pipeline where code changes are continuously integrated, tested, packaged, and safely promoted through environments until production.

"CI/CD stands for Continuous Integration and Continuous Delivery or Continuous Deployment — it is a software delivery practice that automates the process of building, testing and deploying applications so developers can ship code reliably and frequently without manual intervention.

Continuous Integration is the first phase. Every time a developer pushes code to the repository, the pipeline automatically triggers — it builds the code, runs unit and integration tests and performs code quality and security scans. If any step fails, the pipeline stops immediately and the developer is notified. This ensures bugs are caught at the earliest possible stage before they can reach production. If everything passes, the code is safely merged.

Continuous Delivery and Continuous Deployment are where many candidates confuse themselves. Continuous Delivery means the application is always in a deployable state after CI passes — the code is prepared and ready to go to production, but an explicit manual approval step is required before it actually deploys. This gives teams control over release timing and is common in regulated environments like banking or healthcare. Continuous Deployment goes one step further — there is no manual approval at all. Every change that passes the full pipeline automatically goes live to production. This is used by companies like Netflix and Amazon that deploy hundreds of times per day.

A typical production CI/CD pipeline looks like this — developer pushes code to GitHub, CI triggers and runs build and tests, security scanning runs, a Docker image is created, it deploys to a staging environment for final verification and then either automatically or after approval it promotes to production.

Common tools include GitHub Actions, GitLab CI/CD and Jenkins for pipeline orchestration and ArgoCD for Kubernetes-based continuous deployment. CI/CD improves software quality, reduces deployment risk, enables faster release cycles and makes deployments consistent and repeatable."

## Restaurant Analogy
This image explains CI/CD using a restaurant analogy. The key idea is:

A developer writes code; automation takes care of building, testing, and deploying it.

<img src="./Restaurant%20Analogy.png" width="100%" />

**🍽️ Restaurant → CI/CD analogy**
| Restaurant                       | CI/CD                        |
| -------------------------------- | ---------------------------- |
| 👨‍🍳 Developer creates an order | 👨‍💻 Developer pushes code  |
| 📝 Order ticket                  | 📦 Source-code commit        |
| 👨‍🍳 Kitchen prepares food      | ⚙️ Build + automated tests   |
| 🍽️ Finished food                | 🚀 Deployable application    |
| 🧑 Customer receives food        | 🌐 Application reaches users |

## 🔄 Typical CI/CD pipeline
```
Developer
   │
   │ git push
   ▼
┌─────────────┐
│ Source Code │
│ Git / GitHub│
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ CI Pipeline     │
│                 │
│ 1. Install      │
│ 2. Build        │
│ 3. Unit Tests   │
│ 4. Lint         │
│ 5. Security     │
└────────┬────────┘
         │
         ▼
   ┌───────────┐
   │ Artifact  │
   │ Docker    │
   │ Package   │
   └─────┬─────┘
         │
         ▼
┌─────────────────┐
│ CD Pipeline     │
│                 │
│ Dev → Approval  │
│       ↓         │
│      ST/UAT     │
│       ↓         │
│      Prod       │
└─────────────────┘
```

## CI vs CD

**CI — Continuous Integration**

Every code change is automatically:
```
Push → Build → Test → Validate
```

**CD — Continuous Delivery/Deployment**

A validated build is automatically promoted:
```
Dev → ST → UAT → Production
```

For example, the YAML deployment workflow you were working on earlier can implement:
```
Developer
   ↓
Git Push
   ↓
CI
 ┌─────────────┐
 │ Build       │
 │ Unit Test   │
 │ Lint        │
 └──────┬──────┘
        ↓
     Deploy DEV
        ↓
   Manual Approval
        ↓
     Deploy ST
        ↓
   Manual Approval
        ↓
     Deploy PROD
```

## 1️⃣ Why Do We Need CI/CD?
Why Do We Need CI/CD?

The nightmare of manual deployments...
- Small code change
- Huge manual effort
- High risk of human error

CI/CD automates this entire process!

Manual process:
```
[Code] → [ZIP File] → [Copy to Server] → Restart → Test
```

💥 WRONG VERSION DEPLOYED!

CI/CD PIPELINE EXPLAINED IN 60 SECONDS

## 2️⃣ CI/CD Like a Restaurant
**Think of CI/CD Like a Restaurant**
```
You don't cook your own food after ordering.
You give the order once → The kitchen handles the rest.
```

Software should work the same way.
```
Developer pushes code → Automation handles the rest.
```

**Restaurant flow**
```
Order → Order Ticket → Kitchen → Food Served
```

**Software flow**
```
Developer → Code Commit → Build & Test → Live App
```

## 3️⃣ What Does CI/CD Mean?
Automated Software Delivery

Breaking down the acronym:

CI : Continuous Integration

CD : Continuous Delivery / Deployment

Pipeline
```
[Build] → [Test] → [Release] → [Deploy]
```

## 4️⃣ Continuous Integration — Catch Problems Early
**CI — Catch Problems Early**

Continuous Integration acts as a gatekeeper

Multiple developers merging code constantly.

**Rule:**
```
If the code fails, don't let it move forward!
```
**Pipeline:**
```
Code → Build → Tests
```
**Then:**
```
✅ PASS → CD

❌ FAIL → Stop / Go back
```
The failed code goes back for correction instead of moving forward.

## 5️⃣ Continuous Delivery ≠ Continuous Deployment

**Continuous Delivery ≠ Continuous Deployment**
```
This is the ultimate interview question. What is the difference?
```

**Continuous Delivery**

Delivery = Ready to deploy
```
Staging Environment
        ↓
  HUMAN APPROVAL
        ↓
   Production
```
> Production-ready, but human approval required.

**Continuous Deployment**

Deployment = Automatically deployed
```
Staging Environment
        ↓
       AUTO
        ↓
   Production
```
No manual approval.

## 6️⃣ A Real CI/CD Pipeline

**A Real CI/CD Pipeline**
```
Putting it all together.
From git push to live traffic.
```

**One Push → Automated Delivery**
```
[ Code ]
   ↓
 [ Build ]
   ↓
 [ Test ]
   ↓
 [ Scan ]
   ↓
[ Package ]
   ↓
[ Deploy ]
```

**Detailed stages**

| Stage       | Tool/Meaning     |
| ----------- | ---------------- |
| **Code**    | Git              |
| **Build**   | Compile          |
| **Test**    | Unit Tests       |
| **Scan**    | Security         |
| **Package** | Docker           |
| **Deploy**  | Kubernetes (K8s) |

## Ci/CD Flow
```
                 CI/CD
                   │
                   ▼
        Why do we need it?
                   │
          Automate manual work
                   │
                   ▼
          Think Restaurant
                   │
       Developer → Automation
                   │
                   ▼
             CI + CD
          ┌────────┴────────┐
          ▼                 ▼
     Continuous         Continuous
     Integration         Delivery /
                           Deployment
          │                 │
          ▼                 ▼
    Catch problems      Ready to deploy
       early                  OR
                       Automatically deploy
          │
          └──────────┬──────────┘
                     ▼
             Real CI/CD Pipeline
                     │
                     ▼
 Git Push → Build → Test → Security Scan
                     ↓
               Package/Docker
                     ↓
                  Deploy
                     ↓
              Production 🚀
```

---

# Modern CI/CD Pipeline in Production (2026)

## Chapter 1: CI and Build Verification

How do engineering teams at companies like Adobe, Spotify, Uber, GitHub, and Meta safely move a code change into production?

We will start with:
- Local checks
- Pull requests (PRs)
- CI checks
- Code review gates
- Docker builds

Then, we will explore:
- OIDC authentication
- Amazon ECR
- Image digests
- Security scanning
- SBOM (Software Bill of Materials)
- Build provenance

We will then move the same container image through staging using GitHub Actions, Argo CD, and Kubernetes.

After that, we will perform health checks, testing, and production approvals.

Finally, we will understand different deployment strategies:
- Rolling deployments
- Canary deployments
- Blue-green deployments

We will also explore how real user traffic reaches our application, how observability and monitoring work, how alerts are generated, and how automated rollbacks help recover from failures.

In short, we will understand how a modern CI/CD pipeline works in production in 2026.

### 1. Local checks and pre-commit hooks

Suppose you have just finished developing a new feature.

Before pushing your code, you might already have a few checks running on your local machine.

For example, imagine you accidentally added an AWS secret access key directly into your source code.

Obviously, you don't want this secret to reach GitHub.

To prevent this, we can run a small validation check before Git creates a commit. This is called a **pre-commit hook**.

It can perform checks such as:
- Code formatting
- Linting
- Accidental secret detection

For example, we can use a tool called **GitLeaks** to scan the staged changes before committing.

If GitLeaks detects a secret, the pre-commit hook can fail and prevent the commit.

The goal is to catch simple mistakes before the code leaves the developer's laptop.

However, there is one problem: these checks are local.

A developer might misconfigure them, they might not be installed, or Git hooks might be bypassed.

Therefore, local checks are useful, but we should never depend on them alone.

We need a centralized place where every developer's code goes through the same validation process.

That process starts when we open a pull request.

### 2. Pull requests and continuous integration

Now, I push my feature branch to GitHub and open a pull request.

Essentially, I am saying:

> "This is the change I want to merge into the main codebase."

But should GitHub allow me to merge it immediately?

No.

My code might work perfectly on my laptop, but it could break another part of the application.

For example:
- One of the tests might fail.
- I might have introduced a dependency with a known vulnerability.
- My local secret checks might have missed something.

Therefore, we configure a CI workflow to run whenever a pull request is opened or updated.

For example, GitHub Actions can execute this workflow.

Every pull request goes through the same validation process.

We might perform the following checks:
1. Code formatting
2. Unit tests
3. Code security scanning
4. Dependency security scanning
5. Secret detection

This is one of the fundamental parts of Continuous Integration (CI).

Now, validation no longer depends only on an individual developer's laptop. Everyone follows the same centralized CI process.

### 3. Branch protection and required checks

Suppose my pull request has five important checks.

Four checks pass, but one unit test fails.

Should GitHub still allow me to merge the code?

No, provided we have configured the repository correctly.

GitHub allows us to protect the main branch using **branch protection rules** or **rulesets**.

Inside these rules, we can specify that certain checks must pass before anyone can merge code.

These are called **required checks**.

The workflow becomes straightforward:
1. Developer opens a pull request.
2. CI runs the required checks.
3. If any required check fails, merging is blocked.
4. The developer fixes the problem and pushes the changes again.
5. CI runs the checks again.
6. Once all required checks pass, the code can move forward.

We can also configure the repository to require one or more reviewer approvals.

Therefore, we enforce two important conditions:
- Have all automated checks passed?
- Have the required reviewers approved the changes?

Only when both conditions are satisfied can we merge the code into the main branch.

### 4. What is a CI runner?

There is another important question.

We said GitHub runs our tests and security checks.

But if the workflow contains commands such as:
```bash
npm install
npm test
```

Some computer must actually execute these commands, right?

That computer is called a **runner**.

A runner is the machine that performs the actual work in the CI pipeline.

There are two common options:

**GitHub-hosted runner**

GitHub provides a fresh hosted environment for the job.
1. The job starts.
2. The environment executes the commands.
3. The job finishes.
4. GitHub removes the temporary environment.

**Self-hosted runner**

A company manages its own runner.

A normal self-hosted runner can remain available between jobs. Therefore, the company must properly manage cleanup and isolation.

Alternatively, the company can use an **ephemeral self-hosted runner**, which handles one job and is then removed.

Companies might choose self-hosted runners because they need:
- Special hardware
- Access to private networks
- Greater control over the execution environment

Remember:
- GitHub Actions decides what work needs to happen.
- The runner is the machine that actually performs that work.

### 5. What is an environment?

Now, all the checks have passed.

The team has approved the changes, and we have finally merged the code into the main branch.

Until now, our main question was:

> "Is this change safe enough to merge?"

Now the question changes:

> "What exactly are we going to deploy?"

Before answering that, let's understand an important term: **environment**.

An environment is a complete setup where our application runs for a particular purpose.

It can include:
- The application
- Its configuration
- Supporting infrastructure
- Other services on which the application depends

For example, we might have three environments:
1. **Development:** Used by developers to build and test features.
2. **Staging:** A production-like environment where we validate a release before real users receive it.
3. **Production:** The live environment used by actual customers.

The exact environments may differ between companies.

However, the underlying principle is simple:

> We test changes in lower-risk environments before introducing them into the real production system.

## Remaining chapters

The complete lecture covers nine chapters:

| Chapter | Topic |
| ------- | ----- |
| 1 | CI and Build Verification |
| 2 | Artifact Trust and Security |
| 3 | GitOps and Staging |
| 4 | Database Migration Strategies |
| 5 | Deployment and Release Strategies |
| 6 | Observability and Recovery |
| 7 | Infrastructure as Code |
| 8 | Platform Governance and Developer Portals |
| 9 | Pipeline Summary and Conclusion |