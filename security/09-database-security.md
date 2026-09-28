# Database Security

## Layer Overview

| Layer    | Banking Security Approach                          |
| -------- | -------------------------------------------------- |
| Database | Private network + encryption + strict access       |

---

## 1. Private Network Access

Databases in banking must never be directly reachable from the internet or from application code outside the designated application subnet.

### Network Placement
- Databases live in an **isolated data-tier private subnet**.
- No public IP or public DNS for database endpoints.
- Access is restricted by security group / firewall rules to the application subnet CIDR only.
- Developers access databases through a **bastion host** or **AWS Systems Manager Session Manager** — never via a direct connection from their laptops.

### Example: Security Group Rule (PostgreSQL)
```
Inbound Rule:
  Protocol: TCP
  Port: 5432
  Source: 10.0.2.0/24  (application subnet CIDR only)

All other inbound: DENY
All outbound: DENY (databases should not initiate outbound connections)
```

### Kubernetes: Database Not in the Cluster
For production banking systems, the primary database should **not** run inside Kubernetes (stateful workloads are risky in K8s without expert management). Use managed services:

| Cloud    | Managed Relational DB                     |
| -------- | ----------------------------------------- |
| AWS      | Amazon RDS / Aurora                       |
| GCP      | Cloud SQL                                 |
| Azure    | Azure Database for PostgreSQL/MySQL       |
| On-prem  | Dedicated DB server in isolated VLAN      |

Connect from Kubernetes pods using private endpoints or VPC peering.

---

## 2. Encryption

### Encryption at Rest
All database storage must be encrypted.

| Encryption Type       | Implementation                                       |
| --------------------- | ---------------------------------------------------- |
| Full disk encryption  | Managed by cloud provider (AES-256, KMS-managed key) |
| Transparent Data Encryption (TDE) | Oracle, SQL Server native feature       |
| Customer-managed keys | Use KMS BYOK (Bring Your Own Key) for compliance     |
| Column-level encryption | Encrypt PAN, account numbers, SSNs at field level  |

#### Column-Level Encryption Example (PostgreSQL with pgcrypto)
```sql
-- Store encrypted
INSERT INTO accounts (id, pan_encrypted)
VALUES (
  gen_random_uuid(),
  pgp_sym_encrypt('4111111111111111', current_setting('app.encryption_key'))
);

-- Retrieve and decrypt
SELECT pgp_sym_decrypt(pan_encrypted::bytea, current_setting('app.encryption_key'))
FROM accounts
WHERE id = $1;
```

> In practice, use application-layer encryption or a dedicated tokenisation service rather than storing encryption keys in DB settings.

### Encryption in Transit
```
Application → Database: TLS 1.2+ required
```

#### PostgreSQL Connection String with TLS
```
postgresql://dbuser:${DB_PASS}@db.internal.bank.example.com:5432/payments?sslmode=verify-full&sslrootcert=/certs/rds-ca.pem
```

- `sslmode=verify-full` — verifies server certificate and hostname. Never use `disable` or `allow`.

---

## 3. Strict Access Control

### Principle of Least Privilege for Database Users
| Role              | Permissions                              | Used By                   |
| ----------------- | ---------------------------------------- | ------------------------- |
| `app_readwrite`   | SELECT, INSERT, UPDATE on specific tables | Application service       |
| `app_readonly`    | SELECT on specific tables                 | Reporting, analytics      |
| `migrations`      | DDL (CREATE, ALTER, DROP) + DML          | CI/CD migration runner    |
| `dba`             | Full access                              | DBA team only, via bastion|
| `backup`          | SELECT + pg_dump privileges              | Backup service account    |

```sql
-- Create a minimal application role
CREATE ROLE payments_app LOGIN PASSWORD 'use-vault-dynamic-creds';
GRANT SELECT, INSERT, UPDATE ON TABLE transactions, accounts TO payments_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
```

### Dynamic Credentials via Vault
Use Vault's database secrets engine to generate short-lived credentials per deployment:
```hcl
# Vault database role
path "database/roles/payments-app" {
  capabilities = ["read"]
}
```
```bash
# Application fetches credentials at startup
vault read database/creds/payments-app
# Returns: username=v-payments-abc123, password=<random>, TTL=1h
```

### Database Activity Monitoring
- Enable **audit logging** for all SELECT, INSERT, UPDATE, DELETE, DDL.
- Ship logs to SIEM for anomaly detection (e.g., bulk SELECT on accounts table at 3AM).
- Alert on: failed login attempts, schema changes, privileged access outside business hours.

---

## 4. Backup and Data Protection

| Practice                  | Requirement                                          |
| ------------------------- | ---------------------------------------------------- |
| Automated backups         | Daily full + point-in-time recovery (PITR)           |
| Backup encryption         | Encrypted with KMS customer-managed key              |
| Backup storage location   | Cross-region or off-site                             |
| Retention period          | Minimum 7 years for transaction data (RBI/PCI)      |
| Backup access control     | Separate IAM role from application access            |
| Restoration testing       | Monthly restoration drill                            |

---

## Compliance Mapping

| Control                  | Standard                           |
| ------------------------ | ---------------------------------- |
| Encryption at rest       | PCI DSS 3.5, ISO 27001 A.10.1     |
| Encryption in transit    | PCI DSS 4.2, RBI guidelines        |
| Access control           | PCI DSS 7, SOC 2 CC6.3            |
| Audit logging            | PCI DSS 10.3, SOC 2 CC7.2         |

---

## References
- [PCI DSS Data Storage Requirements](https://www.pcisecuritystandards.org/)
- [HashiCorp Vault Database Secrets Engine](https://developer.hashicorp.com/vault/docs/secrets/databases)
- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
