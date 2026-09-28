# Identity Security

## Layer Overview

| Layer    | Banking Security Approach                 |
| -------- | ----------------------------------------- |
| Identity | IAM, MFA, short-lived credentials         |

---

## 1. Identity and Access Management (IAM)

IAM provides centralised control over who can access banking systems and what they can do. Every human and machine identity must be managed through IAM.

### Core Principles
- **Least privilege**: Grant only the permissions required for the task.
- **Separation of duties**: No single identity should have end-to-end access to critical workflows (e.g., initiate and approve a payment).
- **Identity federation**: Use a central IdP (e.g., Azure AD, Okta, AWS IAM Identity Center) to manage all identities.

### IAM Architecture for Banking
```
Developers / Operators
        │
        ▼
  Central IdP (Azure AD / Okta)
        │
   ┌────┴────┐
   ▼         ▼
Cloud IAM   Kubernetes RBAC
(AWS/GCP/Azure)  (ServiceAccounts)
```

### Service-to-Service Identity
- Use **workload identity** (AWS IRSA, GCP Workload Identity, Azure Workload Identity) to bind Kubernetes service accounts to cloud IAM roles.
- Eliminates the need for long-lived credentials stored as secrets.

#### Example: AWS IRSA Annotation
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments-service
  namespace: payments
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/payments-service-role
```

---

## 2. Multi-Factor Authentication (MFA)

MFA is mandatory for all human access to banking systems. It adds a second layer of verification beyond passwords.

### MFA Requirements by Access Type
| Access Type              | MFA Method                              |
| ------------------------ | --------------------------------------- |
| Developer console access | TOTP app (Authenticator) or hardware key |
| Production deployments   | Hardware security key (FIDO2/WebAuthn)  |
| Cloud console            | MFA enforced via IdP policy             |
| VPN / bastion access     | Certificate + OTP                       |

### Enforcement
- Enforce MFA at the IdP level — no bypass for service accounts.
- Use **Conditional Access policies** to require MFA for sensitive operations (e.g., access to production, secret management).
- Integrate MFA with your SIEM for failed authentication alerting.

---

## 3. Short-Lived Credentials

Long-lived credentials (static API keys, passwords) are a primary attack vector in banking breaches. Replace them with short-lived, automatically rotated credentials wherever possible.

### Credential Lifespan Targets
| Credential Type          | Maximum Lifetime    |
| ------------------------ | ------------------- |
| User session tokens      | 1 hour              |
| CI/CD pipeline tokens    | Duration of job     |
| Service-to-service JWTs  | 5–15 minutes        |
| Cloud IAM role sessions  | 1 hour              |
| Kubernetes service tokens | 24 hours (projected) |

### Implementation Patterns
- **OIDC for CI/CD**: GitHub Actions / GitLab CI can obtain short-lived cloud credentials via OIDC federation — no secrets stored in the pipeline.
- **Vault dynamic secrets**: HashiCorp Vault generates database credentials on-demand and auto-revokes them after the TTL.
- **Kubernetes projected tokens**: Use `serviceAccountToken` volume projections with explicit expiry.

#### Example: Projected Service Account Token (1 hour TTL)
```yaml
volumes:
  - name: token
    projected:
      sources:
        - serviceAccountToken:
            audience: payments-api
            expirationSeconds: 3600
            path: token
```

---

## Compliance Mapping

| Control              | Standard                      |
| -------------------- | ----------------------------- |
| IAM / Least Privilege | PCI DSS 7, SOC 2 CC6.3        |
| MFA                  | PCI DSS 8.4, ISO 27001 A.9.4  |
| Short-lived creds    | PCI DSS 8.2, RBI guidelines   |

---

## References
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [NIST Digital Identity Guidelines (SP 800-63)](https://pages.nist.gov/800-63-3/)
- [Kubernetes Service Account Tokens](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
