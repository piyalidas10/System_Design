# Supply Chain Security

## Layer Overview

| Layer        | Banking Security Approach                          |
| ------------ | -------------------------------------------------- |
| Supply chain | Signed images + trusted registry + SBOM            |

---

## 1. Why Supply Chain Security Matters in Banking

Software supply chain attacks (e.g., SolarWinds, XZ Utils, Log4Shell) demonstrate that attackers target the build and delivery pipeline rather than the application itself. In banking, a compromised image or dependency can lead to data theft, fraud, or regulatory violations.

### Threat Vectors
| Threat                       | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| Compromised base image       | Malicious code injected into an upstream image       |
| Dependency confusion         | Attacker publishes a malicious package with same name|
| Tampered build artefacts     | Image modified after build, before deployment        |
| Malicious registry           | Pulling from an untrusted or unverified registry     |
| Build system compromise      | CI/CD pipeline itself is attacked                    |

---

## 2. Signed Images

Image signing provides cryptographic proof that an image was built by a trusted party and has not been tampered with since signing.

### Sigstore / Cosign (Recommended)
[Cosign](https://docs.sigstore.dev/cosign/overview/) is the standard tool for signing and verifying OCI container images.

#### Signing an Image (in CI/CD)
```bash
# Sign with a keyless OIDC-based signature (GitHub Actions / GCP Workload Identity)
cosign sign --yes payments-service:1.2.3@sha256:<digest>

# Or sign with an explicit key
cosign sign --key cosign.key payments-service:1.2.3@sha256:<digest>
```

#### Verifying an Image Before Deployment
```bash
cosign verify \
  --certificate-identity-regexp "https://github.com/bank-org/payments-service" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  payments-service:1.2.3@sha256:<digest>
```

### Enforcing Signature Verification at Admission (Kyverno)
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-image-signature
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - imageReferences:
            - "registry.bank.example.com/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/bank-org/*"
                    issuer: "https://token.actions.githubusercontent.com"
```

---

## 3. Trusted Registry

All images used in production must be sourced from or mirrored to a trusted, controlled internal registry. No images should be pulled directly from public registries at runtime.

### Registry Architecture
```
Public Registries          Internal Trusted Registry
(Docker Hub, GHCR)  ──────► registry.bank.example.com
                               │  (ECR / Artifact Registry / Harbor)
                               │  ├── Scan on push (Trivy / Clair)
                               │  ├── Only signed images admitted
                               │  └── RBAC — who can push/pull per repo
                               │
                               ▼
                         Kubernetes (pull from internal registry only)
```

### Admission Control: Block External Registries
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: Enforce
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds: ["Pod"]
      validate:
        message: "Only images from registry.bank.example.com are allowed."
        pattern:
          spec:
            containers:
              - image: "registry.bank.example.com/*"
```

---

## 4. Software Bill of Materials (SBOM)

An SBOM is a machine-readable inventory of all components inside a software artefact — dependencies, libraries, OS packages, and their versions. It is essential for rapid CVE response.

### Generating an SBOM
```bash
# Generate SBOM in SPDX format using Syft
syft payments-service:1.2.3 -o spdx-json > payments-service-1.2.3.spdx.json

# Or CycloneDX format
syft payments-service:1.2.3 -o cyclonedx-json > payments-service-1.2.3.cdx.json
```

### Attaching SBOM to the Image (Cosign)
```bash
cosign attach sbom --sbom payments-service-1.2.3.spdx.json payments-service:1.2.3
```

### SBOM Use Cases in Banking
| Use Case                     | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| CVE impact analysis          | Instantly identify which services use a vulnerable lib |
| License compliance           | Ensure no GPL/AGPL libraries in commercial products |
| Regulatory reporting         | Evidence of known software components              |
| Incident response            | Rapid scoping of breach impact                     |

---

## 5. Supply Chain Framework: SLSA

[SLSA (Supply-chain Levels for Software Artifacts)](https://slsa.dev/) is a framework for supply chain integrity. Target **SLSA Level 3** for banking production systems.

| SLSA Level | Requirements                                             |
| ---------- | -------------------------------------------------------- |
| 1          | Build process documented                                 |
| 2          | Build service used, provenance generated                 |
| 3          | Hardened build platform, signed provenance, non-forgeable |
| 4          | Two-party review, hermetic builds                        |

---

## Compliance Mapping

| Control                | Standard                          |
| ---------------------- | --------------------------------- |
| Signed images          | PCI DSS 6.4, NIST SSDF           |
| Trusted registry       | PCI DSS 6.3, ISO 27001 A.12.5   |
| SBOM                   | US Executive Order 14028, NIST   |

---

## References
- [Sigstore / Cosign](https://docs.sigstore.dev/)
- [SLSA Framework](https://slsa.dev/)
- [Syft SBOM Generator](https://github.com/anchore/syft)
- [Kyverno Policy Engine](https://kyverno.io/)
