# Secrets Management

## Layer Overview

| Layer   | Banking Security Approach                          |
| ------- | -------------------------------------------------- |
| Secrets | Vault / cloud secret manager / KMS                 |

---

## 1. Why Secrets Management Matters

In banking, secrets include database passwords, API keys, TLS certificates, signing keys, and encryption keys. Mishandling any of these can lead to data breaches, regulatory violations, and financial fraud.

### Anti-patterns to Avoid
- ❌ Secrets hardcoded in source code or Dockerfiles
- ❌ Secrets stored in `ConfigMaps` or unencrypted environment variables
- ❌ Long-lived static credentials without rotation
- ❌ Secrets in CI/CD logs

---

## 2. HashiCorp Vault

Vault is the industry standard for centralised secrets management in banking and financial services.

### Core Features Used in Banking
| Feature              | Use Case                                          |
| -------------------- | ------------------------------------------------- |
| Dynamic secrets      | On-demand, short-lived DB credentials             |
| PKI secrets engine   | Issue and rotate TLS certificates                 |
| Transit secrets engine | Encryption-as-a-Service (no key exposure)       |
| Kubernetes auth      | Pods authenticate using their service account     |
| Audit logging        | Full audit trail of every secret access           |

### Vault + Kubernetes Integration
```
Pod (ServiceAccount token)
        │
        ▼
  Vault Kubernetes Auth
        │
        ▼
  Vault Policy → Secrets Path
        │
        ▼
  Secret injected via:
    - Vault Agent Sidecar
    - CSI Secrets Store Driver
```

#### Example: Vault Agent Sidecar Annotation
```yaml
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/role: "payments-db"
  vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/payments-role"
  vault.hashicorp.com/agent-inject-template-db-creds: |
    {{- with secret "database/creds/payments-role" -}}
    export DB_USER="{{ .Data.username }}"
    export DB_PASS="{{ .Data.password }}"
    {{- end }}
```

---

## 3. Cloud Secret Managers

When running in a cloud-native environment, use the native secret manager tied to your cloud provider alongside or instead of Vault.

| Provider | Service                     | Key Feature                         |
| -------- | --------------------------- | ----------------------------------- |
| AWS      | AWS Secrets Manager         | Automatic rotation, cross-account   |
| GCP      | Secret Manager              | IAM-bound, versioned secrets        |
| Azure    | Azure Key Vault             | RBAC + Managed Identity integration |

### Kubernetes CSI Integration (Cloud Secrets → Pod)
```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: payments-db-secret
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "payments/db/password"
        objectType: "secretsmanager"
```

---

## 4. Key Management Service (KMS)

KMS provides envelope encryption — data encryption keys (DEKs) are encrypted with a master key (KEK) that never leaves the KMS boundary.

### Banking Use Cases for KMS
| Use Case                        | Description                                   |
| ------------------------------- | --------------------------------------------- |
| Kubernetes etcd encryption      | Encrypt all secrets at rest using KMS provider |
| Database column encryption      | Encrypt PAN, account numbers at field level   |
| Envelope encryption for storage | Encrypt S3/GCS objects with customer-managed keys |
| Code signing                    | Sign deployment artefacts                     |

#### Kubernetes KMS Provider Configuration (AWS KMS)
```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          name: payments-kms
          endpoint: unix:///tmp/socketfile.sock
          cachesize: 100
          timeout: 3s
      - identity: {}
```

---

## 5. Secret Rotation

All secrets must have defined rotation policies. Vault and cloud secret managers support automatic rotation.

| Secret Type            | Rotation Frequency | Method              |
| ---------------------- | ------------------ | ------------------- |
| Database passwords     | Every 24 hours     | Vault dynamic creds |
| TLS certificates       | 30–90 days         | cert-manager / Vault PKI |
| API keys               | 90 days            | Secrets Manager rotation |
| KMS keys               | Annually           | KMS automatic rotation |

---

## Compliance Mapping

| Control               | Standard                       |
| --------------------- | ------------------------------ |
| Encrypted secrets     | PCI DSS 3.5, ISO 27001 A.10.1 |
| Secret rotation       | PCI DSS 8.6, SOC 2 CC6.1      |
| Audit logging         | PCI DSS 10, RBI guidelines     |

---

## References
- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)
- [Kubernetes Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
