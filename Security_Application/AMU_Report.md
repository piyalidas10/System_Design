# AMU Reports Creation

I suspect AMU may be an internal/company-specific term, because "AMU report" is not a universal AppSec standard.

If by AMU reports you mean your organization's Application/Maturity/Management/Assessment vulnerability reports, the general reporting pipeline would look like this:
```
                 CI/CD Pipeline
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
   SonarQube          Snyk             Mend
     SAST         SAST / SCA       SCA / SAST
       │               │                │
       └───────────────┼────────────────┘
                       ↓
                Security Findings
                       ↓
                 Deduplication
                       ↓
                 Risk Assessment
                       ↓
               AMU Security Report
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
     Critical         High         Medium/Low
        ↓              ↓              ↓
      Fix ASAP       Fix soon       Backlog
```

## A useful AMU/security report normally contains:
| Field         | Example               |
| ------------- | --------------------- |
| Application   | Customer Portal       |
| Repository    | customer-portal       |
| Scanner       | SonarQube             |
| Scan Type     | SAST                  |
| Vulnerability | SQL Injection         |
| Severity      | Critical              |
| CVE           | CVE-XXXX-XXXXX        |
| File          | `UserService.java`    |
| Line          | 142                   |
| Dependency    | `library-x@1.2.3`     |
| Status        | Open                  |
| Owner         | Team A                |
| SLA           | 7 days                |
| Remediation   | Upgrade/fix code      |
| Due Date      | 2026-09-09            |
| Evidence      | Scanner finding       |
| Exception     | Approved/Not approved |



