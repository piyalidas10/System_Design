# Traffic Security (TLS)

## Layer Overview

| Layer   | Banking Security Approach |
| ------- | ------------------------- |
| Traffic | TLS 1.2/1.3               |

---

## 1. Why TLS Matters in Banking

All data in transit must be encrypted. Unencrypted traffic exposes customer financial data, authentication tokens, and inter-service messages to interception. TLS (Transport Layer Security) is the baseline for all network communication in a banking environment.

### TLS Version Policy
| TLS Version | Status in Banking         |
| ----------- | ------------------------- |
| TLS 1.0     | ❌ Prohibited (PCI DSS)    |
| TLS 1.1     | ❌ Prohibited (PCI DSS)    |
| TLS 1.2     | ✅ Minimum allowed         |
| TLS 1.3     | ✅ Preferred (default)     |

---

## 2. TLS 1.3 vs TLS 1.2

| Feature               | TLS 1.2                        | TLS 1.3                              |
| --------------------- | ------------------------------ | ------------------------------------ |
| Handshake round trips | 2 RTT                          | 1 RTT (0-RTT for resumption)         |
| Cipher suites         | Many (some weak)               | Only strong AEAD ciphers             |
| Forward secrecy       | Optional (ECDHE required)      | Mandatory                            |
| RSA key exchange      | Allowed (weak)                 | Removed                              |
| Performance           | Slower handshake               | Faster                               |

**Use TLS 1.3 wherever possible. Fall back to TLS 1.2 only for legacy system compatibility.**

---

## 3. Approved Cipher Suites

### TLS 1.3 (use these)
```
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
TLS_AES_128_GCM_SHA256
```

### TLS 1.2 (if required for legacy compatibility)
```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
```

### Explicitly Disabled
```
# Weak — must be disabled
RC4, DES, 3DES, NULL, EXPORT, MD5, SHA-1 (in signatures), CBC suites
```

---

## 4. Certificate Management

### Certificate Requirements
| Parameter           | Minimum Requirement                     |
| ------------------- | --------------------------------------- |
| Key algorithm       | RSA 2048-bit or ECDSA P-256             |
| Signature algorithm | SHA-256 or stronger                     |
| Certificate validity | Max 398 days (public), 1 year (internal)|
| CN/SAN              | SAN required (CN deprecated)           |

### Automating Certificate Lifecycle with cert-manager
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: security@bank.example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

For internal services, use **Vault PKI** as the issuer instead of ACME/Let's Encrypt.

---

## 5. TLS Termination Architecture

```
External Client
      │  TLS 1.3 (public cert)
      ▼
Load Balancer / Ingress
      │  TLS 1.3 (internal cert — re-encrypt, not passthrough)
      ▼
API Gateway
      │  mTLS (service mesh)
      ▼
Microservice
```

> **Re-encryption over passthrough**: Always re-encrypt traffic between tiers. Do not use SSL passthrough, as it bypasses the ability to inspect traffic at the gateway layer.

---

## 6. HTTPS Enforcement

### Ingress — Force HTTPS
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payments-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/hsts: "true"
    nginx.ingress.kubernetes.io/hsts-max-age: "31536000"
    nginx.ingress.kubernetes.io/hsts-include-subdomains: "true"
spec:
  tls:
    - hosts:
        - api.bank.example.com
      secretName: api-tls-cert
  rules:
    - host: api.bank.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 443
```

### HTTP Strict Transport Security (HSTS)
- `max-age`: at least 1 year (`31536000` seconds).
- Include `includeSubDomains` and `preload` for all banking domains.

---

## 7. TLS in Internal Service Communication

Internal service-to-service traffic must also be encrypted. Handled via:
- **Service mesh** (Istio/Linkerd) — automatic mTLS for all pod communication.
- **Database TLS** — enforce `sslmode=require` or `verify-full` for all database connections.
- **Message queue TLS** — Kafka, RabbitMQ, and Redis must have TLS enabled.

---

## Compliance Mapping

| Control               | Standard                              |
| --------------------- | ------------------------------------- |
| TLS 1.2 minimum       | PCI DSS 4.2.1, NIST SP 800-52 Rev 2  |
| Strong cipher suites  | PCI DSS 4.2.1, SOC 2 CC6.7           |
| Certificate management | ISO 27001 A.10.1, PCI DSS 4.2       |

---

## References
- [PCI DSS TLS Requirements](https://www.pcisecuritystandards.org/documents/Migrating-from-SSL-Early-TLS-Info-Supp-v1_1.pdf)
- [NIST SP 800-52 Rev 2 — TLS Guidelines](https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final)
- [cert-manager Documentation](https://cert-manager.io/docs/)
