# CI/CD
CI/CD is an automated software delivery pipeline where code changes are continuously integrated, tested, packaged, and safely promoted through environments until production.

This image explains CI/CD using a restaurant analogy. The key idea is:

A developer writes code; automation takes care of building, testing, and deploying it.

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






