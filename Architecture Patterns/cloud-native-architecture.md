# Cloud-Native Architecture

A complete reference for designing, deploying, and operating systems in the cloud — from application design principles to deployment strategies, scaling models, and infrastructure automation.

---

## Table of Contents

1. [Twelve-Factor App](#1-twelve-factor-app)
2. [Containers](#2-containers)
3. [Kubernetes](#3-kubernetes)
4. [Serverless](#4-serverless)
5. [Service Mesh](#5-service-mesh)
6. [Sidecar](#6-sidecar)
7. [Ambassador](#7-ambassador)
8. [API Gateway](#8-api-gateway)
9. [Autoscaling](#9-autoscaling)
10. [Horizontal Scaling](#10-horizontal-scaling)
11. [Vertical Scaling](#11-vertical-scaling)
12. [Blue-Green Deployment](#12-blue-green-deployment)
13. [Canary Deployment](#13-canary-deployment)
14. [Rolling Deployment](#14-rolling-deployment)
15. [Feature Flags](#15-feature-flags)
16. [Infrastructure as Code](#16-infrastructure-as-code)
17. [GitOps](#17-gitops)
18. [Cloud Provider Mapping](#18-cloud-provider-mapping)
19. [Pattern Decision Guide](#19-pattern-decision-guide)

---

## 1. Twelve-Factor App

### What it is
A methodology for building software-as-a-service applications that are **portable, resilient, and cloud-ready**. Defined by Heroku engineers in 2012, it remains the canonical checklist for cloud-native application design.

### The twelve factors

| # | Factor | Principle | Anti-pattern to avoid |
|---|---|---|---|
| **I** | **Codebase** | One codebase tracked in VCS; many deploys | Multiple codebases for one app |
| **II** | **Dependencies** | Explicitly declare and isolate dependencies | Relying on system-installed packages |
| **III** | **Config** | Store config in the environment, not code | Hardcoded DB URLs, API keys in source |
| **IV** | **Backing services** | Treat databases, queues, SMTP as attached resources | Treating local DB differently from remote |
| **V** | **Build, release, run** | Strictly separate build, release, and run stages | Patching code in production |
| **VI** | **Processes** | Execute as stateless, share-nothing processes | Sticky sessions, local file storage |
| **VII** | **Port binding** | Export services via port binding | Requiring an external web server (Apache mod) |
| **VIII** | **Concurrency** | Scale out via the process model | Scaling up by making one process heavier |
| **IX** | **Disposability** | Fast startup and graceful shutdown | Slow boot times, unhandled SIGTERM |
| **X** | **Dev/prod parity** | Keep development, staging, production as similar as possible | "Works on my machine" |
| **XI** | **Logs** | Treat logs as event streams (stdout/stderr) | Writing logs to local files |
| **XII** | **Admin processes** | Run admin/management tasks as one-off processes | Baking migrations into app startup |

### Config in environment — Factor III

```bash
# Bad — config in code
DATABASE_URL = "postgresql://user:pass@prod-db:5432/mydb"

# Good — config in environment
DATABASE_URL = os.environ["DATABASE_URL"]
```

```yaml
# Kubernetes: inject config via environment variables from Secrets/ConfigMaps
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: url
  - name: FEATURE_FLAG_NEW_CHECKOUT
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: feature.new-checkout
```

### Logs as streams — Factor XI

```yaml
# Kubernetes: container writes to stdout → collected by log aggregator
# Never write to /var/log/*.log from within the container
command: ["python", "-u", "app.py"]   # -u: unbuffered stdout
```

### Cloud mapping

| Factor | AWS | Azure | GCP |
|---|---|---|---|
| Config | Parameter Store / Secrets Manager | Key Vault / App Configuration | Secret Manager / Cloud Run env vars |
| Logs | CloudWatch Logs | Azure Monitor Logs | Cloud Logging |
| Processes | ECS Tasks / Lambda | Container Apps / Functions | Cloud Run / GKE Pods |
| Build/release | CodePipeline / CodeBuild | Azure DevOps / ACR | Cloud Build / Artifact Registry |

---

## 2. Containers

### What it is
A container is a **lightweight, isolated runtime environment** that packages an application with all its dependencies (libraries, runtime, config) into a single portable image. Containers share the host OS kernel but are isolated via Linux namespaces and cgroups.

### Container vs VM

```
Virtual Machines                    Containers
┌─────────────────────────┐         ┌─────────────────────────┐
│  App A  │  App B        │         │  App A  │  App B        │
│         │               │         │         │               │
│  Libs   │  Libs         │         │  Libs   │  Libs         │
├─────────┼───────────────┤         ├─────────┴───────────────┤
│  OS A   │  OS B         │         │     Container Runtime    │
│ (Guest) │ (Guest)       │         │  (containerd / Docker)  │
├─────────┴───────────────┤         ├─────────────────────────┤
│      Hypervisor         │         │       Host OS Kernel     │
├─────────────────────────┤         ├─────────────────────────┤
│      Hardware           │         │       Hardware           │
└─────────────────────────┘         └─────────────────────────┘
Startup: minutes                    Startup: milliseconds
Size: GBs                           Size: MBs
Isolation: strong (full OS)         Isolation: process-level
```

### Dockerfile — production best practices

```dockerfile
# Multi-stage build — keep final image small
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

# Signal handling — use exec form, not shell form
EXPOSE 3000
CMD ["node", "server.js"]

# Health check — Kubernetes probes use this
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

### Container registry — cloud mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Managed registry** | ECR (Elastic Container Registry) | Azure Container Registry (ACR) | Artifact Registry |
| **Image scanning** | ECR image scanning (Trivy) | Microsoft Defender for Containers | Container Analysis |
| **Multi-arch** | ECR manifest lists | ACR | Artifact Registry |

### Container runtime — cloud mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Managed containers** | ECS Fargate | Azure Container Apps | Cloud Run |
| **Kubernetes** | EKS | AKS | GKE |
| **Serverless containers** | App Runner | Container Apps | Cloud Run |

---

## 3. Kubernetes

### What it is
Kubernetes (K8s) is an open-source **container orchestration platform** that automates deployment, scaling, networking, and lifecycle management of containerised workloads.

### Architecture

```
Control Plane
┌─────────────────────────────────────────────────────────┐
│  API Server  │  etcd  │  Scheduler  │  Controller Mgr   │
└──────────────────────────────┬──────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
         Worker Node 1   Worker Node 2   Worker Node 3
         ┌───────────┐   ┌───────────┐   ┌───────────┐
         │  kubelet  │   │  kubelet  │   │  kubelet  │
         │  kube-    │   │  kube-    │   │  kube-    │
         │  proxy    │   │  proxy    │   │  proxy    │
         │           │   │           │   │           │
         │  Pod A    │   │  Pod B    │   │  Pod C    │
         │  Pod D    │   │  Pod E    │   │  Pod F    │
         └───────────┘   └───────────┘   └───────────┘
```

### Core resources

```yaml
# Deployment — manages ReplicaSets and rolling updates
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  labels:
    app: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: my-registry/order-service:v1.4.2
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
---
# Service — stable DNS + load balancing for pods
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
---
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Managed Kubernetes — cloud mapping

| | AWS EKS | Azure AKS | GCP GKE |
|---|---|---|---|
| **Control plane** | Managed by AWS | Managed by Azure | Managed by Google |
| **Node management** | Managed Node Groups / Fargate | Node pools / Virtual Nodes | Node pools / Autopilot |
| **Auto-upgrade** | Managed add-ons | Auto-upgrade | Release channels |
| **Load balancer** | AWS Load Balancer Controller | Azure Load Balancer | GKE Ingress / NEGs |
| **Storage** | EBS CSI driver / EFS | Azure Disk / Azure Files | Persistent Disk / Filestore |
| **Service mesh** | AWS App Mesh | Open Service Mesh / Istio | Anthos Service Mesh / Istio |
| **Autopilot** | EKS Fargate | AKS Virtual Nodes | GKE Autopilot |

---

## 4. Serverless

### What it is
Serverless (Functions-as-a-Service) lets you run code **without managing servers**. You deploy a function; the cloud provider handles infrastructure, scaling to zero, and billing per invocation (no idle cost).

### Execution model

```
Event Source ──► Function Runtime (cold or warm)
                      │
              ┌───────┴────────┐
              │  Cold start    │  ← Container initialised (100ms–5s)
              │  OR            │
              │  Warm invoc.   │  ← Reuse existing container (~1ms overhead)
              └───────┬────────┘
                      │
              Function executes (max timeout: 15m AWS, 9m Azure, 60m GCP)
                      │
                      ▼
              Response returned (sync) or
              Output to queue/DB/stream (async)
```

### AWS Lambda example

```python
# handler.py
import json, boto3

dynamodb = boto3.resource('dynamodb')
table    = dynamodb.Table('Orders')

def handler(event, context):
    order_id = event['pathParameters']['orderId']

    response = table.get_item(Key={'orderId': order_id})
    item     = response.get('Item')

    if not item:
        return {'statusCode': 404, 'body': json.dumps({'error': 'Not found'})}

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(item)
    }
```

```yaml
# serverless.yml (Serverless Framework)
service: order-api
provider:
  name: aws
  runtime: python3.12
  memorySize: 256
  timeout: 30
  environment:
    TABLE_NAME: Orders

functions:
  getOrder:
    handler: handler.handler
    events:
      - httpApi:
          path: /orders/{orderId}
          method: get
    reservedConcurrency: 100
```

### Serverless — cloud mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Functions** | Lambda | Azure Functions | Cloud Functions / Cloud Run Functions |
| **Triggers** | API GW, SQS, S3, EventBridge | HTTP, Service Bus, Blob, Timer | HTTP, Pub/Sub, Firestore, Scheduler |
| **Orchestration** | Step Functions | Durable Functions | Workflows |
| **Max timeout** | 15 minutes | 10 minutes (consumption) | 60 minutes |
| **VPC access** | Lambda VPC config | VNet integration | VPC connector |
| **Cold start** | ~100ms–1s (SnapStart for Java) | ~200ms–2s | ~100ms–1s |

### When to choose serverless
- Event-driven, sporadic workloads with unpredictable traffic.
- Microservices where idle cost matters (cost per invocation, not per hour).
- Glue code, data transformations, webhooks, scheduled jobs.
- Rapid prototyping — zero infrastructure setup.

### When NOT to choose serverless
- Long-running processes (> timeout limits).
- Latency-sensitive paths where cold starts are unacceptable.
- Workloads requiring persistent local state or file system access.
- Very high sustained throughput where per-invocation pricing exceeds instance pricing.

---

## 5. Service Mesh

### What it is
A service mesh adds a dedicated infrastructure layer that **handles all service-to-service communication** — traffic management, mutual TLS (mTLS), observability, retries, circuit breaking — without changing application code.

### Architecture

```
Service A                               Service B
┌─────────────────────┐                 ┌─────────────────────┐
│  App Container      │                 │  App Container      │
│  (business logic)   │                 │  (business logic)   │
├─────────────────────┤                 ├─────────────────────┤
│  Sidecar Proxy      │◄── encrypted ──►│  Sidecar Proxy      │
│  (Envoy)            │   mTLS traffic  │  (Envoy)            │
└─────────────────────┘                 └─────────────────────┘
         │                                        │
         └──────────────────┬─────────────────────┘
                            │
                    Control Plane
                ┌───────────────────┐
                │  Istiod (Istio)   │
                │  Config / certs   │
                │  Traffic policy   │
                └───────────────────┘
```

### Istio traffic management

```yaml
# VirtualService — traffic splitting (canary)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
  - order-service
  http:
  - match:
    - headers:
        x-canary-user:
          exact: "true"
    route:
    - destination:
        host: order-service
        subset: v2
  - route:
    - destination:
        host: order-service
        subset: v1
      weight: 90
    - destination:
        host: order-service
        subset: v2
      weight: 10
---
# DestinationRule — circuit breaking + mTLS
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    tls:
      mode: ISTIO_MUTUAL
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### Service mesh — cloud mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Managed mesh** | AWS App Mesh | Open Service Mesh / Istio add-on | Anthos Service Mesh (Istio) |
| **Data plane** | Envoy | Envoy | Envoy |
| **mTLS** | ✅ | ✅ | ✅ |
| **Observability** | X-Ray + CloudWatch | Azure Monitor | Cloud Trace + Cloud Monitoring |
| **Traffic management** | ✅ (weighted routing) | ✅ | ✅ |

### When to choose a service mesh
- Large microservices estate where per-service mTLS, retry, and circuit-breaker configuration is unmanageable.
- Compliance requires encrypted service-to-service traffic (mTLS) without code changes.
- You need fine-grained traffic management: canary, A/B testing, fault injection.

### When NOT to choose
- Small service count (< 10) — the operational overhead of a mesh is not justified.
- Teams unfamiliar with Envoy configuration — Istio has a steep learning curve.

---

## 6. Sidecar

### What it is
The Sidecar pattern deploys a **helper container alongside the main application container** in the same pod. They share the same network namespace and lifecycle. The sidecar handles cross-cutting concerns (logging, proxying, secret rotation) without modifying the app.

### Topology

```
Pod
┌────────────────────────────────────────┐
│                                        │
│  ┌─────────────────┐  ┌─────────────┐  │
│  │  App Container  │  │   Sidecar   │  │
│  │  (business      │◄─►  Container  │  │
│  │   logic)        │  │  (helper)   │  │
│  └─────────────────┘  └─────────────┘  │
│                                        │
│  Shared: network (localhost), volumes  │
└────────────────────────────────────────┘
```

### Common sidecar uses

| Sidecar type | What it does | Examples |
|---|---|---|
| **Proxy** | Intercept all inbound/outbound traffic | Envoy (Istio), Linkerd proxy |
| **Log shipper** | Tail app log files and forward | Fluentd, Filebeat, Fluent Bit |
| **Secret agent** | Rotate and inject secrets | Vault Agent, AWS Secrets Manager CSI |
| **Metrics exporter** | Expose app metrics in Prometheus format | OpenTelemetry Collector, Prometheus exporter |
| **Config reloader** | Watch ConfigMap changes and reload | configmap-reload |
| **Database proxy** | Pool connections, handle TLS | PgBouncer sidecar, Cloud SQL Proxy |

### Kubernetes sidecar example

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      # Main app container
      - name: order-service
        image: order-service:v1
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: logs
          mountPath: /var/log/app

      # Sidecar: log shipper
      - name: fluent-bit
        image: fluent/fluent-bit:2.2
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/

      # Sidecar: Cloud SQL Auth Proxy (GCP)
      - name: cloud-sql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.7
        args:
        - "--structured-logs"
        - "--port=5432"
        - "my-project:us-central1:my-db"
        securityContext:
          runAsNonRoot: true

      volumes:
      - name: logs
        emptyDir: {}
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
```

---

## 7. Ambassador

### What it is
The Ambassador pattern deploys a **sidecar that acts as an outbound proxy** — handling all network calls the app makes to external services. It offloads retry logic, circuit breaking, service discovery, TLS, and observability from the application.

### Topology

```
Pod
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌─────────────────┐        ┌────────────────────┐   │
│  │  App Container  │──────► │  Ambassador        │   │
│  │                 │  calls │  (Envoy sidecar)   │   │
│  │  "call localhost│  via   │                    │   │
│  │   :8001"        │  loopback  - retries        │   │
│  └─────────────────┘        │  - circuit break   │   │
│                             │  - mTLS            │   │
│                             │  - tracing         │   │
│                             └─────────┬──────────┘   │
└───────────────────────────────────────┼──────────────┘
                                        │
                                  External Service
                                  (Payment API,
                                   Database, etc.)
```

### Difference from Sidecar

| | Sidecar | Ambassador |
|---|---|---|
| **Direction** | Any — inbound, outbound, both | Outbound focus |
| **Purpose** | General helper concern | Proxy / network abstraction |
| **App change** | App still uses real addresses | App calls `localhost:port` — ambassador proxies |

### Use case: Envoy Ambassador for retry and circuit breaking

```yaml
# Envoy config injected via Ambassador sidecar
static_resources:
  clusters:
  - name: payment_service
    connect_timeout: 2s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: payment_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: payment-service.payments.svc.cluster.local
                port_value: 80
    circuit_breakers:
      thresholds:
      - priority: DEFAULT
        max_connections: 100
        max_retries: 3
    outlier_detection:
      consecutive_5xx: 5
      interval: 10s
      base_ejection_time: 30s
```

---

## 8. API Gateway

### What it is
An API Gateway is the **single entry point** for all external traffic into your cloud-native system. It handles routing, authentication, rate limiting, SSL termination, and observability before forwarding requests to backend services.

### Architecture

```
Internet
   │
   ▼
[ API Gateway ]
   │  - TLS termination
   │  - Auth (JWT, OAuth2, API key)
   │  - Rate limiting
   │  - Request routing
   │  - Response transformation
   │  - Logging / tracing
   │
   ├──► Order Service (ECS / GKE / AKS pod)
   ├──► Payment Service
   ├──► Product Service
   └──► Auth Service
```

### Cloud API Gateway mapping

| Feature | AWS API Gateway | Azure API Management | GCP API Gateway / Apigee |
|---|---|---|---|
| **REST APIs** | ✅ | ✅ | ✅ |
| **WebSocket** | ✅ | ✅ (via SignalR) | ✅ |
| **gRPC** | ❌ (ALB) | ✅ | ✅ (Apigee) |
| **Auth** | Cognito, Lambda authorizer | Azure AD, custom policy | Google Identity, API keys |
| **Rate limiting** | Usage plans + quotas | Product policies | Quotas + rate limiting |
| **Caching** | Stage-level cache | Policy-based cache | ✅ |
| **Backend protocols** | HTTP, Lambda, AWS services | HTTP, SOAP, Logic Apps | HTTP |
| **Developer portal** | ❌ | ✅ | ✅ (Apigee) |
| **Kong / custom** | Kong on EKS | Kong on AKS | Kong on GKE |

### Kubernetes-native: Ingress + Gateway API

```yaml
# Kubernetes Gateway API (modern standard, replaces Ingress)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: order-route
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1/orders
    backendRefs:
    - name: order-service
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /v1/payments
    backendRefs:
    - name: payment-service
      port: 80
```

---

## 9. Autoscaling

### What it is
Autoscaling automatically **adjusts the number of instances or resource allocation** in response to load, ensuring cost efficiency (scale down when idle) and performance (scale up under load).

### Kubernetes autoscaling layers

```
              Traffic / Load
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  HPA — Horizontal Pod Autoscaler                             │
│  Scale pod count based on CPU, memory, or custom metrics     │
├──────────────────────────────────────────────────────────────┤
│  VPA — Vertical Pod Autoscaler                               │
│  Adjust CPU/memory requests for individual pods              │
├──────────────────────────────────────────────────────────────┤
│  KEDA — Kubernetes Event-Driven Autoscaling                  │
│  Scale based on queue depth, Kafka lag, custom metrics       │
├──────────────────────────────────────────────────────────────┤
│  Cluster Autoscaler / Karpenter                              │
│  Add/remove nodes when pods cannot be scheduled              │
└──────────────────────────────────────────────────────────────┘
```

### HPA with custom metric (KEDA + Kafka)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaler
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 1
  maxReplicaCount: 50
  pollingInterval: 15
  cooldownPeriod: 60
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      consumerGroup: order-processor-group
      topic: orders
      lagThreshold: "100"        # 1 replica per 100 messages lag
      activationLagThreshold: "10"
```

### Cloud autoscaling mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Container scale** | ECS Service Auto Scaling | Container Apps scaling | Cloud Run autoscaling |
| **VM scale** | EC2 Auto Scaling Groups | Virtual Machine Scale Sets | Managed Instance Groups |
| **K8s pods** | EKS + HPA/KEDA | AKS + HPA/KEDA | GKE + HPA/KEDA |
| **K8s nodes** | Karpenter / Cluster Autoscaler | Cluster Autoscaler / NAP | GKE Node Auto Provisioning |
| **Serverless** | Lambda (automatic) | Functions (automatic) | Cloud Run (automatic, to zero) |

---

## 10. Horizontal Scaling

### What it is
Horizontal scaling (**scale out**) increases capacity by **adding more instances** of a service. Load is distributed across all instances. Each instance is identical and stateless.

### Topology

```
Before scaling (1 instance):
  Load Balancer ──► [ Instance 1 ]

After scaling (4 instances):
  Load Balancer ──► [ Instance 1 ]
               ──► [ Instance 2 ]
               ──► [ Instance 3 ]
               ──► [ Instance 4 ]
```

### Requirements for horizontal scaling
- **Stateless services** — no local state; session state in Redis, not in memory.
- **Shared data layer** — all instances read/write the same database and cache.
- **Health checks** — load balancer removes unhealthy instances.
- **Graceful shutdown** — instance finishes in-flight requests before terminating.

### Kubernetes horizontal scaling

```bash
# Manual scale
kubectl scale deployment order-service --replicas=10

# Autoscale
kubectl autoscale deployment order-service --min=3 --max=20 --cpu-percent=70
```

### Cloud horizontal scaling mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| ECS | ECS Service desired count | Container Apps replica count | Cloud Run max instances |
| Compute | ASG min/max/desired | VMSS instance count | MIG target size |
| K8s | HPA + Cluster Autoscaler | HPA + Cluster Autoscaler | HPA + Node Auto Provisioning |

---

## 11. Vertical Scaling

### What it is
Vertical scaling (**scale up**) increases capacity by **allocating more resources** (CPU, RAM) to an existing instance. No new instances are created — the same instance gets bigger.

### Topology

```
Before scaling:
  [ Instance: 2 vCPU, 4 GB RAM ]

After scaling:
  [ Instance: 8 vCPU, 32 GB RAM ]
```

### Kubernetes VPA (Vertical Pod Autoscaler)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: order-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  updatePolicy:
    updateMode: "Auto"     # Auto: evict + reschedule with new resources
                           # Off: recommendation only
  resourcePolicy:
    containerPolicies:
    - containerName: order-service
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4
        memory: 8Gi
```

### Horizontal vs Vertical

| | Horizontal (Scale Out) | Vertical (Scale Up) |
|---|---|---|
| **Method** | Add instances | Increase instance size |
| **Downtime** | None | Brief (restart required) |
| **Limit** | Near-infinite | Hardware ceiling |
| **Cost** | Linear with instances | Non-linear (larger = more per unit) |
| **State** | Requires stateless design | Easier with stateful apps |
| **Best for** | Web services, APIs, workers | Databases, ML training, monoliths |

---

## 12. Blue-Green Deployment

### What it is
Blue-Green deployment maintains **two identical production environments** — Blue (current live) and Green (new version). Traffic is switched atomically from Blue to Green. Rollback is instant — switch traffic back.

### Topology

```
Users
  │
  ▼
[ Load Balancer / DNS ]
  │                          │
  │ (before release)         │ (after release)
  ▼                          ▼
[ Blue — v1 (100%) ]   →   [ Green — v2 (100%) ]
[ Green — v2 (0%)  ]   →   [ Blue — v1 (0%)   ]

Rollback: switch back to Blue instantly
```

### AWS Blue-Green with Route 53

```bash
# Blue is live: CNAME → order-service-blue.elb.amazonaws.com
# Green is staging: deploy v2 to order-service-green ECS service

# Validate green is healthy
curl https://green.internal.example.com/health

# Switch: weighted routing → instant cutover
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "CNAME",
        "SetIdentifier": "blue",
        "Weight": 0,
        "TTL": 60,
        "ResourceRecords": [{"Value": "blue.elb.amazonaws.com"}]
      }
    }, {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "CNAME",
        "SetIdentifier": "green",
        "Weight": 100,
        "TTL": 60,
        "ResourceRecords": [{"Value": "green.elb.amazonaws.com"}]
      }
    }]
  }'
```

### Kubernetes blue-green with Service selector switch

```bash
# Deploy v2 (green) — Service still points to v1 (blue)
kubectl apply -f deployment-v2.yaml

# Validate green pods
kubectl rollout status deployment/order-service-v2

# Switch Service selector from v1 to v2 — atomic cutover
kubectl patch service order-service \
  -p '{"spec":{"selector":{"version":"v2"}}}'

# Rollback: patch selector back to v1
kubectl patch service order-service \
  -p '{"spec":{"selector":{"version":"v1"}}}'
```

### Cloud blue-green mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Native support** | CodeDeploy blue/green, ECS blue/green | Deployment slots (App Service) | Cloud Deploy blue/green |
| **DNS-level** | Route 53 weighted routing | Azure Traffic Manager | Cloud DNS + Load Balancer |
| **Container** | ECS blue/green + ALB target groups | Container Apps blue/green | GKE + weighted NEGs |

---

## 13. Canary Deployment

### What it is
A Canary deployment **routes a small percentage of production traffic** to the new version while the majority continues on the current version. Metrics are monitored; if healthy, traffic is gradually shifted to 100%.

### Topology

```
Users (100%)
   │
   ▼
[ Load Balancer ]
   │
   ├──► v1 (stable) ─── 90% of traffic
   │
   └──► v2 (canary) ─── 10% of traffic
                              │
                         Monitor: error rate, latency, CPU
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             Healthy → increase %    Unhealthy → rollback to 0%
```

### Kubernetes canary with Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10          # 10% canary traffic
      - pause: {duration: 5m}  # observe for 5 minutes
      - setWeight: 30
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 5m}
      - setWeight: 100         # full rollout
      canaryMetadata:
        labels:
          deployment: canary
      stableMetadata:
        labels:
          deployment: stable
      analysis:
        templates:
        - templateName: error-rate-check
        startingStep: 1
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate-check
spec:
  metrics:
  - name: error-rate
    interval: 60s
    failureLimit: 1
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(http_requests_total{status=~"5..",deployment="canary"}[2m]))
          /
          sum(rate(http_requests_total{deployment="canary"}[2m]))
    successCondition: result[0] < 0.01   # < 1% error rate
```

### Cloud canary mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Native** | CodeDeploy canary, Lambda weighted alias | Azure App Service slots (% traffic) | Cloud Deploy canary |
| **Traffic split** | ALB weighted target groups | Azure Front Door | Cloud Load Balancing |
| **K8s** | Argo Rollouts on EKS | Argo Rollouts on AKS | Argo Rollouts / GKE traffic split |

---

## 14. Rolling Deployment

### What it is
A Rolling deployment **gradually replaces old instances with new ones**, one batch at a time. At any point, both old and new versions are running simultaneously. No extra infrastructure required — uses existing capacity.

### Topology

```
Step 0: [ v1 ][ v1 ][ v1 ][ v1 ][ v1 ][ v1 ]   (all v1)

Step 1: [ v2 ][ v2 ][ v1 ][ v1 ][ v1 ][ v1 ]   (2 replaced)

Step 2: [ v2 ][ v2 ][ v2 ][ v2 ][ v1 ][ v1 ]   (4 replaced)

Step 3: [ v2 ][ v2 ][ v2 ][ v2 ][ v2 ][ v2 ]   (all v2)
```

### Kubernetes rolling update config

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2          # at most 2 extra pods beyond desired count
      maxUnavailable: 0    # always maintain desired pod count (zero downtime)
```

```bash
# Update image → triggers rolling update
kubectl set image deployment/order-service order-service=order-service:v2

# Monitor rollout
kubectl rollout status deployment/order-service

# Rollback (to previous revision)
kubectl rollout undo deployment/order-service

# Rollback to specific revision
kubectl rollout undo deployment/order-service --to-revision=3
```

### Deployment strategy comparison

| Strategy | Downtime | Rollback speed | Extra infra | Risk |
|---|---|---|---|---|
| **Recreate** | Yes (all down, then all up) | Fast (redeploy) | None | High |
| **Rolling** | None | Moderate (undo rollout) | None | Medium |
| **Blue-Green** | None | Instant (switch traffic) | 2× | Low |
| **Canary** | None | Instant (set weight to 0) | Small (canary pods) | Very low |

### Cloud rolling deployment mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **ECS** | ECS rolling update (min healthy %) | Container Apps rolling | Cloud Run traffic splitting |
| **VMs** | ASG rolling update | VMSS rolling upgrade | MIG rolling update |
| **K8s** | EKS `maxSurge` / `maxUnavailable` | AKS rolling update | GKE rolling update |

---

## 15. Feature Flags

### What it is
Feature flags (feature toggles) let you **enable or disable features at runtime** without deploying new code. They decouple deployment from release, enabling dark launches, A/B testing, progressive rollouts, and instant kill switches.

### Types

| Type | Purpose | Example |
|---|---|---|
| **Release toggle** | Trunk-based development — merge but hide incomplete features | New checkout flow hidden until ready |
| **Experiment toggle** | A/B test — different behaviour for different user cohorts | 50% see new UI, 50% see old |
| **Ops toggle** | Kill switch — disable a feature instantly if it causes issues | Turn off recommendation engine under load |
| **Permission toggle** | Different features per user tier | Beta features for premium users only |

### Implementation

```python
# LaunchDarkly SDK (cloud-based feature flag service)
import ldclient

ld_client = ldclient.get()

def get_checkout_handler(user_context: dict):
    context = Context.builder(user_context['id']) \
        .kind('user') \
        .set('email', user_context['email']) \
        .set('plan', user_context['plan']) \
        .build()

    if ld_client.variation('new-checkout-flow', context, False):
        return new_checkout_handler
    else:
        return legacy_checkout_handler
```

```python
# Self-hosted: Redis-backed feature flags
def is_feature_enabled(feature: str, user_id: str) -> bool:
    # Check global toggle
    global_state = r.hget('feature-flags', feature)
    if global_state == b'off':
        return False
    if global_state == b'on':
        return True

    # Check percentage rollout
    rollout_pct = r.hget(f'feature-flag:{feature}', 'rollout_percentage')
    if rollout_pct:
        pct = int(rollout_pct)
        # Deterministic assignment per user
        user_bucket = int(hashlib.md5(f"{feature}:{user_id}".encode()).hexdigest(), 16) % 100
        return user_bucket < pct

    # Check user allowlist
    return r.sismember(f'feature-flag:{feature}:allowlist', user_id)
```

### Cloud / SaaS feature flag mapping

| Tool | Type | Cloud integration |
|---|---|---|
| **LaunchDarkly** | SaaS | AWS, Azure, GCP SDKs |
| **AWS AppConfig** | Managed | Native AWS, Lambda, ECS |
| **Azure App Configuration** | Managed | Native Azure, .NET, Spring |
| **GCP Firebase Remote Config** | Managed | Native GCP, mobile |
| **Flagsmith** | OSS / SaaS | Any cloud |
| **Unleash** | OSS / SaaS | Self-hosted or managed |

---

## 16. Infrastructure as Code

### What it is
Infrastructure as Code (IaC) manages cloud infrastructure through **machine-readable configuration files** checked into version control, rather than manual console operations. Infrastructure becomes reproducible, auditable, and automated.

### IaC tools

| Tool | Approach | Language | Best for |
|---|---|---|---|
| **Terraform** | Declarative | HCL | Multi-cloud, most widely adopted |
| **Pulumi** | Imperative + declarative | Python, TypeScript, Go, C# | Code-first, complex logic |
| **AWS CDK** | Imperative | TypeScript, Python, Java | AWS-native, code-first |
| **AWS CloudFormation** | Declarative | JSON / YAML | Native AWS, deep integration |
| **Azure Bicep** | Declarative | Bicep DSL | Native Azure, cleaner than ARM |
| **GCP Deployment Manager** | Declarative | YAML / Jinja | Native GCP |

### Terraform example — EKS cluster

```hcl
# main.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "eks/terraform.tfstate"
    region = "us-east-1"
  }
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "~> 20.0"

  cluster_name    = "production-cluster"
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      instance_types = ["m5.large"]
      min_size       = 3
      max_size       = 20
      desired_size   = 5
      labels = {
        Environment = "production"
        Role        = "general"
      }
      taints = {}
    }
    spot = {
      instance_types = ["m5.large", "m5.xlarge", "m4.large"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 50
      desired_size   = 0
    }
  }
}
```

### IaC cloud mapping

| | AWS | Azure | GCP |
|---|---|---|---|
| **Native IaC** | CloudFormation / CDK | ARM / Bicep | Deployment Manager / Config Connector |
| **Multi-cloud** | Terraform, Pulumi | Terraform, Pulumi | Terraform, Pulumi |
| **K8s resources** | CDK8s / Helm | Flux / Helm | Config Connector / Helm |
| **Secret mgmt** | Secrets Manager + Parameter Store | Key Vault | Secret Manager |
| **State backend** | S3 + DynamoDB (locking) | Azure Blob + Azure Storage | GCS |

---

## 17. GitOps

### What it is
GitOps is an operational model where **Git is the single source of truth** for both application code and infrastructure configuration. Changes to the cluster/infrastructure are made by committing to Git, not by running `kubectl apply` or `terraform apply` manually. A controller continuously reconciles the actual state with the desired state in Git.

### Architecture

```
Developer
   │
   ▼
Git commit (desired state)
   │
   ▼
[ Git Repository ]
  (Kubernetes manifests / Helm charts / Kustomize)
   │
   │  GitOps controller watches Git
   │
   ▼
[ Argo CD / Flux ]
   │  detect drift between Git and cluster
   │  reconcile → apply changes automatically
   ▼
[ Kubernetes Cluster ]
  (actual state matches Git)
```

### Argo CD — application definition

```yaml
# Application.yaml — tells Argo CD what to sync where
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8s-manifests
    targetRevision: HEAD
    path: apps/order-service/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true       # delete resources removed from Git
      selfHeal: true    # revert manual changes to match Git
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### GitOps workflow

```
Feature branch
   │
   ▼
PR → CI pipeline runs:
     - Build & test
     - Build container image
     - Push image to registry
     - Update image tag in manifests repo (Git)
   │
   ▼
PR merged to main
   │
   ▼
Argo CD / Flux detects change
   │
   ▼
Automatic sync to cluster
   │
   ▼
Deployment complete (auditable via Git history)
```

### GitOps tools — cloud mapping

| Tool | Type | Cloud integration |
|---|---|---|
| **Argo CD** | GitOps controller | EKS, AKS, GKE |
| **Flux v2** | GitOps toolkit | EKS, AKS, GKE |
| **AWS CodePipeline + EKS** | Managed CI/CD | AWS native |
| **Azure DevOps + AKS** | Managed CI/CD | Azure native |
| **GCP Cloud Deploy** | Managed delivery | GKE native |
| **GitHub Actions** | CI/CD + GitOps | Any cloud |

---

## 18. Cloud Provider Mapping

### Full pattern-to-cloud reference

| Pattern | AWS | Azure | GCP |
|---|---|---|---|
| **Twelve-Factor Config** | Parameter Store / Secrets Manager | Key Vault / App Config | Secret Manager |
| **Containers** | ECR + ECS / Fargate | ACR + Container Apps | Artifact Registry + Cloud Run |
| **Kubernetes** | EKS | AKS | GKE (Autopilot) |
| **Serverless** | Lambda + API Gateway | Azure Functions + APIM | Cloud Functions + API Gateway |
| **Service Mesh** | App Mesh (Envoy) | OSM / Istio add-on | Anthos Service Mesh |
| **Sidecar** | ECS sidecar container | Container Apps sidecar | GKE sidecar |
| **Ambassador** | App Mesh virtual node | OSM outbound proxy | Cloud Service Mesh egress |
| **API Gateway** | API Gateway v2 / ALB | Azure API Management | Apigee / Cloud Endpoints |
| **Autoscaling** | ASG + HPA + KEDA | VMSS + HPA + KEDA | MIG + HPA + KEDA |
| **Horizontal Scaling** | ASG / ECS desired count | VMSS / Container Apps | MIG / Cloud Run max |
| **Vertical Scaling** | Instance resize / VPA | VM resize / VPA | Machine type upgrade / VPA |
| **Blue-Green** | CodeDeploy / Route 53 | Deployment Slots | Cloud Deploy |
| **Canary** | CodeDeploy canary / ALB | Front Door traffic split | Cloud Deploy canary |
| **Rolling** | CodeDeploy rolling / ECS | App Service rolling | Cloud Deploy rolling |
| **Feature Flags** | AppConfig | App Configuration | Firebase Remote Config |
| **IaC** | CloudFormation / CDK | Bicep / ARM | Deployment Manager |
| **GitOps** | CodePipeline + Argo CD | Azure DevOps + Flux | Cloud Deploy + Argo CD |

---

## 19. Pattern Decision Guide

### By concern

| You need to... | Pattern | Tooling |
|---|---|---|
| Design cloud-ready applications | Twelve-Factor App | Any — it's a methodology |
| Package and ship applications portably | Containers | Docker + ECR / ACR / Artifact Registry |
| Orchestrate containers at scale | Kubernetes | EKS / AKS / GKE |
| Run code without managing servers | Serverless | Lambda / Functions / Cloud Run |
| Handle service-to-service comms uniformly | Service Mesh | Istio / Linkerd / App Mesh |
| Add cross-cutting concerns per pod | Sidecar | Envoy / Fluent Bit / Vault Agent |
| Proxy outbound calls from a service | Ambassador | Envoy sidecar |
| Single entry point for external traffic | API Gateway | AWS APIGW / Azure APIM / Apigee |
| Automatically match capacity to load | Autoscaling | HPA + KEDA + Cluster Autoscaler |
| Scale by adding more instances | Horizontal Scaling | ASG / VMSS / MIG / HPA |
| Scale by making instances bigger | Vertical Scaling | VPA / instance resize |
| Zero-downtime release with instant rollback | Blue-Green | CodeDeploy / Slots / Cloud Deploy |
| Gradually validate new version in prod | Canary | Argo Rollouts / ALB weighted |
| Replace instances one batch at a time | Rolling | K8s rolling update / CodeDeploy |
| Decouple deploy from release | Feature Flags | LaunchDarkly / AppConfig |
| Version-control your infrastructure | IaC | Terraform / CDK / Bicep |
| Git as the single source of truth for infra | GitOps | Argo CD / Flux |

### Deployment strategy selection

```
Is downtime acceptable?
  └── No → Blue-Green, Canary, or Rolling
       │
       ├── Need instant rollback?
       │    └── Yes → Blue-Green
       │
       ├── Need to validate in production before full rollout?
       │    └── Yes → Canary (+ automated analysis)
       │
       └── Want simplest zero-downtime option?
            └── Rolling (K8s default)

Is feature gating needed (decouple deploy from release)?
  └── Yes → Feature Flags (combined with any deployment strategy)
```

### Scaling strategy selection

```
Is the workload stateless?
  └── Yes → Horizontal Scaling (preferred)
       └── Kubernetes? → HPA (CPU/memory) or KEDA (event-driven)

Is the workload stateful (DB, ML model)?
  └── Consider Vertical Scaling or purpose-built managed service

Is traffic unpredictable / can go to zero?
  └── Serverless (Lambda / Cloud Run)

Need to scale on queue depth or Kafka lag?
  └── KEDA
```

---

*Reference: CNCF Cloud Native Landscape (landscape.cncf.io) · 12factor.net · Kubernetes Documentation · AWS Well-Architected Framework · Google Cloud Architecture Framework · Azure Well-Architected Framework*
