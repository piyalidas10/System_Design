# Container Security

## Layer Overview

| Layer      | Banking Security Approach                       |
| ---------- | ----------------------------------------------- |
| Containers | Minimal images + vulnerability scanning         |

---

## 1. Minimal Container Images

The attack surface of a container is directly proportional to what is inside it. Banking containers must be stripped to only what the application needs to run.

### Image Strategy
| Image Type        | Description                                              | Examples                      |
| ----------------- | -------------------------------------------------------- | ----------------------------- |
| Distroless        | No shell, no package manager, application + runtime only | `gcr.io/distroless/java21`   |
| Alpine-based      | Minimal Linux (~5 MB), small attack surface              | `alpine:3.19`                |
| Scratch           | Empty base, for statically compiled binaries             | `FROM scratch` (Go binaries) |
| Chainguard Images | Hardened, minimal, SBOM-included                         | `cgr.dev/chainguard/jre`     |

> **Avoid**: `ubuntu:latest`, `debian:latest`, `python:3` — these include hundreds of packages that are never used and may contain vulnerabilities.

### Example: Distroless Java Dockerfile
```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

# Runtime stage — distroless
FROM gcr.io/distroless/java21-debian12:nonroot
COPY --from=builder /app/target/payments-service.jar /app/payments-service.jar
USER nonroot
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/payments-service.jar"]
```

Key properties:
- **Multi-stage build** — build tools not present in the runtime image.
- **`nonroot` user** — container does not run as root.
- **No shell** — limits attacker capability if the container is compromised.

---

## 2. Vulnerability Scanning

### Scanning Stages
Vulnerability scanning must happen at multiple stages, not just once.

```
Developer workstation
        │  Pre-commit scan (Trivy / Grype)
        ▼
CI/CD Pipeline
        │  Image scan on build (Trivy / Snyk)
        │  Fail build if CRITICAL CVEs found
        ▼
Container Registry
        │  Continuous scan of stored images (ECR, Artifact Registry)
        ▼
Runtime (Kubernetes)
        │  Admission controller scan (Trivy Operator / Kyverno)
        │  Block deployment if policy violated
        ▼
Production
        │  Runtime scanning (Falco / Aqua / Prisma Cloud)
```

### Trivy — Recommended Scanner
```bash
# Scan a local image before pushing
trivy image --severity HIGH,CRITICAL payments-service:latest

# Scan in CI/CD — fail on CRITICAL
trivy image \
  --exit-code 1 \
  --severity CRITICAL \
  --ignore-unfixed \
  payments-service:1.2.3
```

### CI/CD Integration Example (GitHub Actions)
```yaml
- name: Scan container image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH
    exit-code: "1"
    ignore-unfixed: true

- name: Upload SARIF to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

---

## 3. Runtime Container Security

Even with a minimal image, runtime protection is needed.

### Security Context (Hardened Pod)
```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10000
    fsGroup: 10000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: payments-service
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}
```

### Resource Limits
Always set CPU and memory limits to prevent noisy-neighbour attacks and resource exhaustion:
```yaml
resources:
  requests:
    cpu: "100m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

---

## 4. Image Freshness Policy

| Policy                         | Rule                                              |
| ------------------------------ | ------------------------------------------------- |
| Base image updates             | Rebuild images when base image has new CVE patches|
| Weekly rebuild                 | Rebuild all images weekly even without code changes |
| No `latest` tags in production | Always use immutable digest or semver tags        |
| Image expiry in registry       | Delete untagged/old images after 90 days          |

---

## Compliance Mapping

| Control                | Standard                        |
| ---------------------- | ------------------------------- |
| Vulnerability scanning | PCI DSS 6.3.3, SOC 2 CC7.1    |
| Minimal images         | CIS Docker Benchmark, ISO 27001 A.12.6 |
| Runtime protection     | PCI DSS 5.3, NIST SP 800-190  |

---

## References
- [Google Distroless Images](https://github.com/GoogleContainerTools/distroless)
- [Trivy — Container Vulnerability Scanner](https://trivy.dev/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST SP 800-190 — Application Container Security](https://csrc.nist.gov/publications/detail/sp/800-190/final)
