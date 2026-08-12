# CI/CD
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






