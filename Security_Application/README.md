# Application security
Application security (AppSec) protects software and APIs from external threats and vulnerabilities throughout their entire lifecycle, from initial design to active maintenance.

**Your Guide to AppSec Tools: SAST vs SCA vs DAST** ---- https://www.sonatype.com/blog/your-guide-to-appsec-tools-sast-or-sca

**✅ SAST: Is there a security problem in my code? or Is there something wrong in the code I wrote?**  
**✅ DAST: Can I actually attack the running application? or Can an attacker exploit my running application?**  
**✅ SCA: Are my third-party libraries vulnerable? or Is there something vulnerable in the library I imported?**  
**✅ OSSC: Are we using open-source software safely and compliantly? or Are we legally/compliantly using this open-source software?**  
**✅ Secrets scanning: "Did a developer accidentally commit a password/API key?"**  
**✅ Container security: "Does my Docker image contain vulnerable packages/configuration?"**  
**✅ IaC security: "Did I configure AWS/Azure/Kubernetes/Terraform insecurely?"**  
**✅ Mend: A platform/toolset that can cover SCA, SAST and related AppSec activities.**  
**✅ OWASP (Open Worldwide Application Security Project): Describes SAST as analysis of source/compiled code and DAST as testing a running application from the outside. SCA focuses on third-party/open-source components.**  

## How many major types of Application Security (AppSec) practices/tools are there?
| #  | Application Security Area   | What it checks                       | Example Tools                           |
| -- | --------------------------- | ------------------------------------ | --------------------------------------- |
| 1  | **SAST**                    | Source code vulnerabilities          | SonarQube, Snyk Code, Checkmarx         |
| 2  | **DAST**                    | Running application vulnerabilities  | OWASP ZAP, Burp Suite                   |
| 3  | **SCA**                     | Vulnerable dependencies              | Mend, Snyk, Dependabot                  |
| 4  | **OSSC / OSS Compliance**   | Open-source licenses & governance    | Mend, Black Duck                        |
| 5  | **Secrets Scanning**        | API keys, passwords, tokens          | GitHub Secret Scanning, Gitleaks        |
| 6  | **IaC Security**            | Terraform/K8s/cloud configuration    | Checkov, Snyk IaC                       |
| 7  | **Container Security**      | Docker/container vulnerabilities     | Trivy, Snyk, Mend                       |
| 8  | **API Security**            | API-specific vulnerabilities         | Burp, OWASP ZAP, API security platforms |
| 9  | **Cloud Security**          | Cloud configuration/security risks   | Defender for Cloud, Wiz, Prisma Cloud   |
| 10 | **RASP / Runtime Security** | Attacks while application is running | Runtime security platforms              |

### The most important 5 for your current topic

**You can simplify it to:**
```
                 APPLICATION SECURITY
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
       ↓                 ↓                  ↓
     SAST              DAST                SCA
   My Code          Running App       Dependencies
       │                 │                  │
 SonarQube          ZAP/Burp         Mend / Snyk
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ↓
                  OSS Compliance
                         │
                    Licenses /
                    Governance
```
Then add:
```
        Modern Application Security
                  │
    ┌─────────────┼─────────────┐
    ↓             ↓             ↓
 Secrets        IaC         Containers
 Scanning      Security      Security
```

## For a real CI/CD pipeline

A mature pipeline might look like:
```
Developer
   │
   ↓
Git Commit
   │
   ├── Secret Scan
   │
   ├── SAST ────────────→ SonarQube / Snyk Code
   │
   ├── SCA ─────────────→ Mend / Snyk
   │
   ├── OSS Compliance ─→ Mend
   │
   ├── IaC Scan ────────→ Checkov
   │
   └── Container Scan ──→ Trivy
             │
             ↓
          Build
             │
             ↓
          Deploy
             │
             ↓
          DAST
             │
             ↓
       Security Report
             │
             ↓
       Vulnerability
        Management
```
For a Senior/Lead developer interview, I would focus deeply on these 7:
> **SAST → SCA → DAST → OSS Compliance → Secrets → Container Security → IaC Security.**

These cover most of the AppSec terminology you're likely to encounter in modern CI/CD discussions.

## What is SCA vs SAST vs DAST?
SCA, SAST, and DAST are three different testing methods used in application security to find vulnerabilities at different stages of development. 

- **SAST (Static Application Security Testing):** Scans your custom source code, internal logic, and structure for security flaws before the application runs (white-box testing). 
- **SCA (Software Composition Analysis):** Scans open-source libraries and third-party dependencies used in your project for known vulnerabilities and license issues. 
- **DAST (Dynamic Application Security Testing):** Tests the compiled, running application from the outside by simulating real-world attacks during runtime (black-box testing). 

| Feature                   | **SAST**                                                                       | **SCA**                                                                | **DAST**                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Full form**             | Static Application Security Testing                                            | Software Composition Analysis                                          | Dynamic Application Security Testing                                                      |
| **What it analyzes**      | Your **source/custom code**                                                    | **Third-party libraries & dependencies**                               | **Running application / APIs**                                                            |
| **Testing approach**      | **White-box** — sees the source code                                           | Dependency/package analysis                                            | **Black-box** — behaves like an external attacker                                         |
| **Requires source code?** | ✅ Yes                                                                          | Usually package/dependency manifests                                   | ❌ No                                                                                      |
| **When it runs**          | Development / PR / CI/CD                                                       | Build / CI/CD / continuously                                           | Testing / staging / sometimes production                                                  |
| **Finds**                 | SQL Injection, XSS in code, hardcoded secrets, insecure APIs, buffer overflows | Known CVEs, vulnerable packages, outdated dependencies, license issues | Authentication problems, exposed endpoints, XSS, SQL Injection, security misconfiguration |
| **Example**               | `query = "SELECT * FROM users WHERE id=" + id`                                 | `log4j 2.x` with a known CVE                                           | Attacker sends malicious input to `/api/users?id=...`                                     |
| **Main question**         | **"Is my code insecure?"**                                                     | **"Are my dependencies insecure?"**                                    | **"Can my running application be attacked?"**                                             |

### Easy way to remember

Think about an application like a car:
```
                 APPLICATION SECURITY
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        SAST             SCA            DAST
          │              │              │
     Your code       Dependencies    Running app
          │              │              │
     "Is my code      "Are my        "Can an
       safe?"        packages safe?" attacker
                                      break in?"
```

### Example
Suppose you have an Angular + FastAPI application:
```
Angular / FastAPI Application
│
├── Your code
│     └── authentication.py
│           └── insecure SQL query
│
├── Third-party dependencies
│     ├── fastapi
│     ├── sqlalchemy
│     └── some-package
│
└── Running APIs
      ├── /login
      ├── /users
      └── /orders
```

**SAST → scans authentication.py and detects insecure coding patterns.**

**SCA → scans requirements.txt, package.json, package-lock.json, etc., and detects vulnerable third-party packages.**

**DAST → attacks the running /login, /users, /orders endpoints and discovers vulnerabilities from the application's external behavior.**

### Where do SonarQube, Snyk and Mend fit?

A useful mental model is:
```
Developer writes code
        │
        ▼
     ┌───────┐
     │ SAST  │ ──► SonarQube
     └───────┘
        │
        ▼
     ┌───────┐
     │  SCA  │ ──► Snyk / Mend
     └───────┘
        │
        ▼
    Build & Deploy
        │
        ▼
     ┌───────┐
     │ DAST  │ ──► Scan running application/API
     └───────┘
```

**One correction to your earlier understanding:** Snyk is not best described simply as **"SAST + DAST."** Snyk has multiple security products/capabilities, including **Snyk Code (SAST)** and **Snyk Open Source (SCA)**, while its broader platform also covers other security areas.

If you're building an **Application Security / DevSecOps** interview roadmap, I'd organize it as **SAST → SCA → Secrets → Container/IaC scanning → DAST → API Security → SBOM → Runtime Security**.

## What Are Application Security (AppSec) Tools?
Application security (AppSec) tools are designed to identify, analyze, and remediate vulnerabilities in software applications. These tools help security and development teams reduce risk, maintain compliance, and protect against increasingly sophisticated attacks.

There are several types of application security testing tools, but the most common AppSec tools include:
1. **SAST (Static Application Security Testing):** Analyzes proprietary source code, bytecode, or binaries to identify vulnerabilities early in the software development lifecycle (SDLC). SAST tools help developers detect coding flaws before applications are deployed.
2. **SCA (Software Composition Analysis):** Identifies vulnerabilities, licensing risks, malicious packages, and compliance issues in open source dependencies and third-party components. Software composition analysis tools provide visibility into software supply chain risk and help organizations manage open source governance across the SDLC.
3. **DAST (Dynamic Application Security Testing):** Tests running applications for runtime vulnerabilities by simulating real-world attacks against live environments. DAST testing helps uncover exploitable issues such as authentication weaknesses, misconfigurations, API vulnerabilities, and injection flaws.
4. **IAST (Interactive Application Security Testing):** Combines elements of both SAST and DAST by analyzing applications during runtime while leveraging instrumentation inside the application. IAST tools provide real-time vulnerability detection with greater contextual accuracy and reduced false positives.
5. **API Security Testing:** Evaluates APIs for vulnerabilities, authentication weaknesses, exposed endpoints, and insecure data handling. As APIs become foundational to modern applications and microservices architectures, API security testing has become an increasingly important part of modern AppSec strategies.
6. **Secrets Detection:** Identifies exposed credentials, API keys, tokens, certificates, and other hardcoded secrets within source code, repositories, CI/CD pipelines, and development environments. Secrets detection tools help prevent unauthorized access and reduce the risk of credential-based attacks.
7. **ASPM (Application Security Posture Management):** Aggregates and correlates findings from multiple AppSec tools, including SAST, SCA, DAST, secrets detection, and cloud security platforms, to provide centralized visibility into application risk. ASPM solutions help security teams prioritize remediation efforts, reduce alert fatigue, and improve risk management across complex software ecosystems.

Together, these tools provide coverage across different stages of the software development lifecycle (SDLC), helping teams shift security left while maintaining continuous protection.

## SAST — Static Application Security Testing

SAST scans your source code without running the application.

**For example, suppose you write:**
```
String query =
    "SELECT * FROM users WHERE username='" + username + "'";

statement.executeQuery(query);
```
**A SAST tool can identify:**
```
⚠️ Potential SQL Injection
```
because it sees that untrusted input is being concatenated into a SQL query.

**Typical SAST vulnerabilities**

| Vulnerability            | Example                               |
| ------------------------ | ------------------------------------- |
| SQL Injection            | User input concatenated into SQL      |
| XSS                      | User input rendered without encoding  |
| Command Injection        | User input passed to OS command       |
| Hardcoded Secret         | API key/password inside source        |
| Path Traversal           | `"/files/" + userInput`               |
| Weak Cryptography        | MD5/SHA-1 used for passwords          |
| Insecure Deserialization | Unsafe object deserialization         |
| SSRF                     | User-controlled URL fetched by server |
| Weak Authentication      | Security-sensitive code patterns      |
| Insecure randomness      | `Math.random()` for security token    |

**Tools**

Common SAST tools include:
- SonarQube
- Snyk Code
- Mend SAST
- Checkmarx
- Fortify
- Veracode
- Semgrep

OWASP specifically describes source-code analysis tools as SAST tools and notes that they can be integrated into development/IDE workflows.

### SAST — Benefits vs Limitations
| **SAST Benefits**                                                              | **SAST Limitations**                                                                                 |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| ✅ Identifies security vulnerabilities **early in the SDLC**, before deployment | ⚠️ Can produce **false positives** and requires proper rule/configuration tuning                     |
| ✅ Integrates into **IDE, pull requests, CI/CD pipelines**                      | ⚠️ Has **limited visibility into runtime behavior**                                                  |
| ✅ Helps reduce the **cost of fixing vulnerabilities early**                    | ⚠️ Does **not primarily assess third-party dependency vulnerabilities** — that's the role of **SCA** |
| ✅ Provides developers with **source-code-level evidence** for remediation      | ⚠️ May miss vulnerabilities that only appear because of **runtime configuration/environment**        |
| ✅ Supports **automated security gates** in CI/CD                               | ⚠️ Can struggle with some **complex data flows, dynamic code, and framework-specific behavior**      |

### False positive
**🔴 A security tool reports a vulnerability, but the code is actually safe.**

**Suppose you have:**
```
const message = "Hello " + user.name;
```

**A SAST scanner might see:**
```
user.name → string concatenation
       ↓
Potential XSS
       ↓
⚠️ Security Warning
```
But suppose user.name is already properly encoded/sanitized before reaching this code.

**Then:**
```
Scanner says:     ❌ Vulnerable
Reality:          ✅ Safe
```
That's a false positive.

### Why do false positives happen?

SAST analyzes code statically. It doesn't always know the complete runtime context.

**For example:**
```
Source Code
    ↓
Static Analysis
    ↓
Limited knowledge of:
  • Runtime configuration
  • Actual user input
  • Authentication rules
  • Data validation elsewhere
  • Framework behavior
    ↓
May report something that isn't exploitable
```

**False Positive vs True Positive**

|                       | Meaning                                           | Example                               |
| --------------------- | ------------------------------------------------- | ------------------------------------- |
| 🔴 **True Positive**  | Tool reports a vulnerability and it really exists | SQL Injection actually possible       |
| 🟡 **False Positive** | Tool reports a vulnerability but code is safe     | Parameterized SQL incorrectly flagged |

### if i want to skip any sast issue then i can make that issue as false positive

Yes, technically you can mark/suppress a SAST finding, but you should not mark a real vulnerability as “False Positive” just because you want to skip it.

The important distinction is:
```
SAST Finding
     │
     ├── Actually vulnerable?
     │       │
     │       ├── YES → Fix it
     │       │
     │       └── NO → Mark as FALSE POSITIVE
     │
     └── Vulnerable but accepted temporarily?
             ↓
        Risk Accepted / Won't Fix
        (depending on tool/process)
```

**Example**

SonarQube reports:
```
❌ SQL Injection
Severity: High
File: UserService.java
Line: 42
```

**You investigate and discover:**
```
PreparedStatement stmt =
    connection.prepareStatement(
        "SELECT * FROM users WHERE id = ?");
```
The scanner misunderstood the code.

**➡️ False Positive is appropriate.**

But suppose the code really is vulnerable:
```
String sql =
    "SELECT * FROM users WHERE id=" + userId;
```
You say:
> **"I don't want to fix it."**

That doesn't make it a false positive.

It is still a real vulnerability.

**Depending on your organization's security process, you might instead record:**
```
Status: Risk Accepted / Won't Fix
Reason: Business justification
Owner: Security Team
Expiry: 30 days
```

**Very important interview distinction**

| Status                  | Meaning                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| **False Positive**      | Tool is wrong; vulnerability doesn't actually exist               |
| **Won't Fix**           | Vulnerability exists, but organization decides not to fix it      |
| **Risk Accepted**       | Organization knowingly accepts the security risk                  |
| **Fixed/Resolved**      | Vulnerability has been remediated                                 |
| **Suppressed/Excluded** | Finding is intentionally hidden/ignored according to tool/process |

> [!NOTE]
> **So, don't use False Positive as a way to bypass SAST. In a professional AppSec process, false-positive marking should have a legitimate technical reason and often requires review/auditability.**

### Easy way to remember
```
SAST
 │
 ├── Looks at → MY SOURCE CODE
 ├── Runs → BEFORE / DURING BUILD
 ├── Finds → Coding security weaknesses
 └── Tools → SonarQube, Snyk Code, Checkmarx
```

> **SAST is valuable because it finds security vulnerabilities early by analyzing source code and can be integrated directly into developer workflows and CI/CD. Its limitations are false positives, limited runtime visibility, and inability to replace SCA for third-party dependency vulnerabilities.**

### SonarQube for SAST

SonarQube is commonly used in CI/CD to analyze source code for bugs, code smells and security vulnerabilities.

For example:
```
app.get('/user', (req, res) => {
    const sql = "SELECT * FROM users WHERE id=" + req.query.id;
    db.query(sql);
});
```
SonarQube could flag the unsafe SQL construction.

You might get a finding such as:
```
Security Issue
--------------
Type: SQL Injection
Severity: High
File: user.service.ts
Line: 42

Problem:
User-controlled data is directly used in SQL query.

Recommendation:
Use parameterized queries.
```

**Secure version**
```
const sql = "SELECT * FROM users WHERE id = ?";
db.query(sql, [req.query.id]);
```

**Important distinction**

SonarQube isn't simply a "security scanner."

**It can provide:**
```
                SonarQube
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
     Bugs      Code Smells    Security
                              Vulnerabilities
                              Hotspots
```
So in an enterprise pipeline, SonarQube is often used as the SAST/code-quality gate.

## DAST — Dynamic Application Security Testing

DAST is completely different.

**Instead of looking at your source code:**
```
Source Code
    ↓
    X
```

**DAST looks at the running application:**
```
Browser / Scanner
       ↓
   HTTP/HTTPS
       ↓
Running Application
       ↓
Database
```
The scanner behaves somewhat like an attacker.

OWASP describes DAST as testing a web application through its web interface and performing attacks without access to the source code.

#### DAST example — XSS

Suppose your application has:
```
GET /search?q=hello
```
and the application reflects the value directly into HTML.

A DAST scanner can send a test payload and observe the response.

It might report:
```
Vulnerability: Reflected XSS
Severity: High

URL:
https://example.com/search?q=...

Parameter:
q

Evidence:
User-controlled input reflected without proper encoding.
```

**DAST can find things like:**
- XSS
- SQL injection
- Command injection
- Authentication problems
- Authorization issues
- Security misconfiguration
- Missing security headers
- TLS/HTTPS problems
- Path traversal
- Exposed endpoints
- Some API vulnerabilities

OWASP lists XSS, SQL injection, command injection, path traversal and insecure configuration among typical DAST targets.

## SAST vs DAST — very important interview concept

Imagine this code:
```
String query =
    "SELECT * FROM users WHERE id=" + request.getParameter("id");
```

### SAST

SAST sees:
```
Source Code
    ↓
Unsafe SQL construction
    ↓
Potential SQL Injection
```
It can find the coding weakness before deployment.

### DAST

DAST sees:
```
Running Application
       ↓
GET /users?id=123
       ↓
Scanner manipulates id
       ↓
Application behaves unsafely
       ↓
SQL Injection detected
```

So:

|                        | SAST              | DAST                         |
| ---------------------- | ----------------- | ---------------------------- |
| Testing                | Source code       | Running application          |
| Approach               | White-box         | Black-box                    |
| When                   | Development/build | Test/staging/deployment      |
| Source required?       | Yes               | No                           |
| Finds coding flaws     | Excellent         | Limited                      |
| Finds runtime behavior | Limited           | Excellent                    |
| Typical example        | SonarQube         | OWASP ZAP/Burp-type scanners |

## SCA — Software Composition Analysis

This one is not primarily about your code.

It asks:
> **"Which third-party libraries are we using, and do any of them have known vulnerabilities?"**

**Suppose your Node.js application has:**
```
{
  "dependencies": {
    "express": "4.x",
    "lodash": "4.x",
    "axios": "1.x"
  }
}
```
Your own code might be perfectly secure.

But:
```
Your Application
       │
       ├── express
       ├── lodash
       ├── axios
       └── jsonwebtoken
```
One dependency may contain a known CVE.

**SCA identifies that dependency and tells you:**
```
Dependency: example-library
Installed: 1.2.3
Fixed version: 1.2.8

Vulnerability:
CVE-XXXX-XXXXX

Severity:
High

Recommended action:
Upgrade to 1.2.8
```
OWASP describes SCA/component analysis as inventorying third-party/open-source components and identifying supply-chain risks.

### Realistic SCA example

**Imagine:**
```
{
  "dependencies": {
    "some-library": "1.4.0"
  }
}
```

**Your application code:**
```
import { something } from "some-library";
```
Your code might contain zero security vulnerabilities.

**But SCA discovers:**
```
some-library@1.4.0
       ↓
Known CVE
       ↓
Severity: Critical
       ↓
Fixed in: 1.4.5
```

**So the developer needs to upgrade:**
```
1.4.0 → 1.4.5
```
This is why SAST and SCA are not the same thing.

## OSSC — Open Source Software Compliance

If by OSSC you mean Open Source Software Compliance, this is slightly different from SCA.

Think:

**SCA : "Is this open-source dependency vulnerable?"**

**OSS Compliance : "Are we legally and organizationally allowed to use this open-source component, and are we complying with its license obligations?"**

For example:
```
My Application
      │
      ├── React
      ├── Angular
      ├── lodash
      ├── library-X
      └── library-Y
```

**An OSS compliance process may identify:**
```
library-X
License: GPL
Risk: Requires legal review

library-Y
License: MIT
Risk: Low

library-Z
License: Apache-2.0
Risk: Acceptable
```

**So OSS compliance can involve:**
- License detection
- License policy
- Copyright obligations
- Attribution requirements
- Forbidden licenses
- Open-source inventory
- SBOM
- Dependency governance

SCA and OSS compliance often overlap, and modern tools may provide both.

## Mend
**Mend is an AppSec platform rather than just a single-purpose scanner.**

Current Mend documentation describes the Mend platform as providing SAST, SCA and container scanning, with centralized security findings, policies and reports.

For SCA, Mend can analyze open-source components and identify CVEs, outdated dependencies, licensing information and other risks.

Conceptually:
```
                     Mend
                      │
        ┌─────────────┼──────────────┐
        ↓             ↓              ↓
      SAST            SCA        Container
        │             │            Scan
        ↓             ↓              ↓
   Source Code    Dependencies   Docker Image
        │             │              │
        └─────────────┼──────────────┘
                      ↓
               Security Findings
                      ↓
                 Reports / Risk
```
Mend also provides reachability/exploitability information for SCA findings, which can help prioritize a vulnerable dependency that is actually relevant to your application.

## Snyk — important correction

**Snyk Code is SAST. Snyk officially describes Snyk Code as its SAST solution.**

Snyk also has other AppSec capabilities, including SCA/dependency scanning. 

For a resume/interview, I would phrase your stack more carefully:
```
SonarQube → SAST / Code Quality

Snyk Code → SAST

Snyk Open Source → SCA

DAST → Dedicated DAST solution
         e.g. OWASP ZAP / Burp Suite
```
If your organization specifically uses a Snyk product/capability for runtime/API security, name the exact Snyk product rather than saying generically "Snyk = DAST."

## One vulnerability through all scanners

This is the best way to understand the whole ecosystem.

**Suppose your application has:**
```
Angular Frontend
       ↓
Node.js API
       ↓
PostgreSQL
```

**Developer writes:**
```
app.get("/users", (req, res) => {
    const query =
      "SELECT * FROM users WHERE id=" + req.query.id;

    db.query(query);
});
```

### SonarQube / SAST
```
❌ SQL Injection

Source:
user.controller.js

Line:
42

Reason:
User input is concatenated into SQL.
```

### DAST

**Application is deployed:**
```
https://test.myapp.com
```
**DAST scanner sends malicious input:**
```
/users?id=<test payload>
```
and observes the application behavior.

**Result:**
```
❌ SQL Injection

Endpoint:
GET /users

Parameter:
id

Severity:
High/Critical
```

### SCA

Meanwhile:
```
package.json

lodash = vulnerable version
```

**SCA reports:**
```
❌ Dependency Vulnerability

Package:
lodash

Installed:
4.x vulnerable version

Fixed:
4.x patched version

CVE:
CVE-XXXX-XXXXX
```

### OSS Compliance

**The same application may have:**
```
library-A
License: MIT       ✅

library-B
License: Apache-2  ✅

library-C
License: GPL       ⚠️ Legal review
```

### Final security report

**Your organization can consolidate:**
```
APPLICATION: Customer Portal
────────────────────────────────────

SAST
  Critical: 2
  High:     5
  Medium:   11

SCA
  Critical: 1
  High:     7
  Medium:   14

DAST
  Critical: 0
  High:     3
  Medium:   8

OSS Compliance
  Policy violations: 2

Total Open Findings: 53
```

## The easiest mental model

**Remember this diagram for interviews:**
```
                    APPLICATION
                         │
          ┌──────────────┼───────────────┐
          │              │               │
          ↓              ↓               ↓
      MY CODE       THIRD-PARTY       RUNNING APP
          │          LIBRARIES             │
          ↓              ↓                 ↓
        SAST            SCA              DAST
          │              │                 │
          ↓              ↓                 ↓
     SonarQube          Mend          DAST Scanner
     Snyk Code          Snyk          OWASP ZAP
          │              │                 │
          └──────────────┼─────────────────┘
                         ↓
                  SECURITY REPORT
                         ↓
                 Vulnerability Mgmt
                         ↓
                   Fix / Accept Risk
```

**And then OSSC sits around the open-source side:**
```
                  Open Source
                      │
             ┌────────┴────────┐
             ↓                 ↓
            SCA             OSSC
             │                 │
       Security risk       License /
       CVE / exploit       compliance
             │                 │
             └────────┬────────┘
                      ↓
                    Mend
```
