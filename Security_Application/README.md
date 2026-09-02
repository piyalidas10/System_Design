# Application security
Application security (AppSec) protects software and APIs from external threats and vulnerabilities throughout their entire lifecycle, from initial design to active maintenance.

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









