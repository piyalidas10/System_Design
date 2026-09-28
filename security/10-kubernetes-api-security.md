# Kubernetes API Security

## Layer Overview

| Layer          | Banking Security Approach                                  |
| -------------- | ---------------------------------------------------------- |
| Kubernetes API | Private/control-plane access + RBAC + audit logs           |

---

## 1. Private / Control-Plane Access

The Kubernetes API server is the single most critical component of the cluster. If an attacker gains access to the API server, they own the cluster. In banking, the API server must never be exposed to the public internet.

### Private Cluster Configuration
- **Private endpoint only**: API server has no public IP address.
- **Authorised networks**: Even private access is restricted to specific CIDRs (VPN, bastion, CI/CD runners).
- **No direct developer access**: Developers use a jump host or VPN to reach the private endpoint.

#### AWS EKS: Private Cluster + Authorised CIDRs
```hcl
resource "aws_eks_cluster" "banking" {
  name = "banking-prod"

  vpc_config {
    endpoint_private_access = true
    endpoint_public_access  = false
    public_access_cidrs     = []          # No public access
    subnet_ids              = var.private_subnet_ids
    security_group_ids      = [aws_security_group.eks_control_plane.id]
  }
}
```

#### GKE: Private Cluster
```hcl
resource "google_container_cluster" "banking" {
  name    = "banking-prod"

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.0.0.0/8"   # Internal VPN range only
      display_name = "internal-vpn"
    }
  }
}
```

---

## 2. RBAC for the API Server

Kubernetes RBAC controls who and what can interact with the API server. For banking clusters, the principle of least privilege must be applied rigorously.

### Anti-patterns
- ❌ Granting `cluster-admin` to CI/CD service accounts
- ❌ Using `system:masters` group for anything other than break-glass emergency access
- ❌ Wildcards (`*`) in ClusterRoles for production workloads
- ❌ Service accounts with cross-namespace privileges

### Recommended Role Structure
| Principal                  | Role/ClusterRole              | Scope              |
| -------------------------- | ----------------------------- | ------------------ |
| Application pods           | Custom role — namespace-only  | Namespace          |
| CI/CD pipeline (deploy)    | `deploy-role` — limited verbs | Namespace          |
| Platform team              | `cluster-admin` equivalent    | Cluster (audited)  |
| Read-only SRE access       | `view` ClusterRole            | Cluster            |
| Monitoring (Prometheus)    | Custom metrics reader         | Cluster            |

### Example: Minimal CI/CD Deploy Role
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: payments
  name: cicd-deploy
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch", "update"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
```

### Admission Controllers
Enable these admission controllers to harden the API server:
| Controller              | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `NodeRestriction`       | Limits what kubelet can modify                   |
| `PodSecurity`           | Enforces Pod Security Standards                  |
| `ValidatingAdmission`   | Custom policy enforcement (via Kyverno/OPA Gatekeeper) |

---

## 3. Audit Logs

Kubernetes API audit logs record every request to the API server — who made it, what was requested, and what happened. For banking, these logs are essential for compliance and incident response.

### Audit Policy

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all requests to secrets at RequestResponse level
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["secrets"]

  # Log pod exec/attach (high risk)
  - level: RequestResponse
    verbs: ["create"]
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach", "pods/portforward"]

  # Log RBAC changes
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]

  # Minimal logging for read-only operations on common resources
  - level: Metadata
    verbs: ["get", "list", "watch"]

  # Skip health checks and system noise
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
    resources:
      - group: ""
        resources: ["endpoints", "services"]
```

### Audit Log Retention and Shipping
- Ship audit logs to **immutable storage** (S3 with object lock, GCS with retention policy).
- Feed into **SIEM** (Splunk, Elastic Security, IBM QRadar) for alerting.
- Retention: minimum **1 year online**, **7 years archived** for banking.

### High-Priority Alerts from Audit Logs
| Event                              | Alert Severity |
| ---------------------------------- | -------------- |
| `exec` into a production pod       | 🔴 Critical     |
| Secret accessed outside business hours | 🟠 High    |
| New ClusterRoleBinding created     | 🟠 High        |
| `cluster-admin` role assigned      | 🔴 Critical     |
| API server authentication failure spike | 🟠 High  |

---

## 4. Additional Hardening

- **Disable anonymous authentication**: `--anonymous-auth=false` on the API server.
- **Enable node authorizer**: Ensures nodes can only access their own secrets.
- **Use etcd encryption**: Encrypt all secrets stored in etcd (see [03-secrets-management.md](./03-secrets-management.md)).
- **Restrict etcd access**: etcd should only be reachable from the API server, never from worker nodes or pods.

---

## Compliance Mapping

| Control                  | Standard                          |
| ------------------------ | --------------------------------- |
| Private API server       | CIS Kubernetes Benchmark 1.2     |
| RBAC                     | PCI DSS 7, SOC 2 CC6.3           |
| Audit logs               | PCI DSS 10, ISO 27001 A.12.4     |

---

## References
- [Kubernetes API Server Security](https://kubernetes.io/docs/concepts/security/controlling-access/)
- [Kubernetes Audit Logging](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
