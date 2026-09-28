# Kubernetes Security

## Layer Overview

| Layer      | Banking Security Approach               |
| ---------- | --------------------------------------- |
| Kubernetes | RBAC, Pod Security, NetworkPolicies     |

---

## 1. Role-Based Access Control (RBAC)

RBAC restricts who can perform what actions on Kubernetes resources. In banking environments, this is critical to enforce least-privilege access.

### Key Principles
- Every service account and user should have the **minimum permissions** required.
- Avoid using `cluster-admin` for application workloads.
- Separate roles for developers, CI/CD pipelines, and operators.

### Example: Read-only Role for a Namespace
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: payments
  name: payments-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-reader-binding
  namespace: payments
subjects:
  - kind: ServiceAccount
    name: audit-bot
    namespace: payments
roleRef:
  kind: Role
  name: payments-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## 2. Pod Security

Pod Security controls what a container is allowed to do at the OS level. Banking workloads must enforce strict policies to prevent privilege escalation.

### Kubernetes Pod Security Standards (PSS)
| Profile     | Description                                         |
| ----------- | --------------------------------------------------- |
| Privileged  | No restrictions (avoid for banking workloads)       |
| Baseline    | Minimal restrictions, blocks known privilege abuse  |
| Restricted  | Hardened policy, follows security best practices    |

Use `Restricted` for all banking application namespaces.

### Example: Enforce Restricted Profile on a Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Hardened Pod Spec
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

---

## 3. NetworkPolicies

NetworkPolicies enforce microsegmentation — by default, deny all traffic and only allow what is explicitly needed.

### Default Deny All (Namespace-level)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Allow Only Specific Communication
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-payments
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payment-service
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: api-gateway
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8080
```

---

## Compliance Mapping

| Control          | Standard           |
| ---------------- | ------------------ |
| RBAC             | PCI DSS 7, SOC 2   |
| Pod Security     | CIS Kubernetes     |
| NetworkPolicies  | PCI DSS 1, ISO 27001 |

---

## References
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
