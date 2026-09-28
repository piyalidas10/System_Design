# API Security

## Layer Overview

| Layer | Banking Security Approach                         |
| ----- | ------------------------------------------------- |
| API   | API Gateway + OAuth2/OIDC + mTLS where required   |

---

## 1. API Gateway

The API Gateway is the single entry point for all external and internal API traffic. It enforces authentication, authorisation, rate limiting, and request validation before traffic reaches any service.

### API Gateway Responsibilities in Banking
| Responsibility          | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| Authentication          | Validate OAuth2 bearer tokens / API keys                     |
| Authorisation           | Enforce scopes and claims                                    |
| Rate limiting           | Prevent abuse and DDoS per client/IP                         |
| Request validation      | Schema validation, block malformed payloads                  |
| TLS termination         | Terminate TLS at the gateway, re-encrypt to upstream (TLS 1.2+) |
| Audit logging           | Log all requests with correlation IDs                        |
| WAF integration         | Block OWASP Top 10 attacks                                   |

### Common API Gateway Options
| Gateway         | Typical Use                           |
| --------------- | ------------------------------------- |
| Kong            | On-premises / hybrid Kubernetes       |
| AWS API Gateway | AWS-native REST/HTTP APIs             |
| Apigee          | Enterprise API management (GCP)       |
| Azure APIM      | Azure-native API management           |
| Istio / Envoy   | Service mesh ingress gateway          |

---

## 2. OAuth2 / OIDC

OAuth2 and OIDC are the standard protocols for delegated authorisation and authentication in banking APIs.

### Flows Used in Banking
| Flow                        | Use Case                                   |
| --------------------------- | ------------------------------------------ |
| Authorization Code + PKCE   | Customer-facing mobile/web apps            |
| Client Credentials          | Service-to-service (machine-to-machine)    |
| Device Authorization        | Low-input device access (rare in banking)  |

> **Never use Implicit flow** — it is deprecated and insecure.

### Token Validation at the Gateway
```
Client → API Gateway
            │
            ▼
  Validate JWT signature (JWKS endpoint)
  Check `exp`, `iss`, `aud` claims
  Check required `scope` for the endpoint
            │
        ┌───┴───┐
        ▼       ▼
    Allowed   Denied (401/403)
        │
        ▼
  Forward request + claims header
  to upstream service
```

### Example: Required JWT Claims for Payments API
```json
{
  "iss": "https://auth.bank.example.com",
  "aud": "payments-api",
  "sub": "user-id-or-service-id",
  "scope": "payments:write",
  "exp": 1700000000,
  "jti": "unique-token-id"
}
```

- `jti` (JWT ID) enables token replay prevention — store and check used JTIs.
- Short `exp` (5–15 min for service tokens, 1 hour for user sessions).

---

## 3. Mutual TLS (mTLS)

mTLS requires both the client and the server to present certificates, providing two-way authentication. It is used in banking for high-value, high-risk API paths.

### When to Use mTLS in Banking
| Scenario                          | mTLS Required? |
| --------------------------------- | -------------- |
| Inter-bank payment API            | ✅ Yes          |
| Core banking system integration   | ✅ Yes          |
| Internal service mesh (east-west) | ✅ Yes (via Istio/Linkerd) |
| Public-facing customer API        | ⚠️ TLS only (OAuth2 handles auth) |
| Third-party fintech (Open Banking) | ✅ Yes (eIDAS / FAPI requires it) |

### mTLS with a Service Mesh (Istio)
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: payments
spec:
  mtls:
    mode: STRICT
```

This enforces mTLS for **all** pod-to-pod communication in the `payments` namespace.

### cert-manager for Certificate Automation
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: payments-service-cert
  namespace: payments
spec:
  secretName: payments-service-tls
  issuerRef:
    name: vault-issuer
    kind: ClusterIssuer
  dnsNames:
    - payments-service.payments.svc.cluster.local
  duration: 24h
  renewBefore: 1h
```

---

## 4. API Security Best Practices

- **Always version your APIs** — allows deprecation of insecure versions.
- **Validate all input** — reject unexpected fields, enforce type and length constraints.
- **Return minimal data** — never return more fields than the client needs.
- **Use correlation IDs** — every request gets a unique ID for tracing and audit.
- **Implement idempotency keys** for payment endpoints — prevent duplicate transactions.
- **Rate limit per user and per endpoint** — stricter limits for sensitive endpoints (e.g., fund transfer).

---

## Compliance Mapping

| Control           | Standard                          |
| ----------------- | --------------------------------- |
| OAuth2/OIDC       | PCI DSS 8, FAPI (Open Banking)   |
| mTLS              | PCI DSS 4.2, RBI API guidelines  |
| API Gateway audit | PCI DSS 10, SOC 2 CC7.2          |

---

## References
- [OAuth 2.0 Security Best Practices (RFC 9700)](https://datatracker.ietf.org/doc/html/rfc9700)
- [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-security-profile-2_0.html)
- [Istio PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
