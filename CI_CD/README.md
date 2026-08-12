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







