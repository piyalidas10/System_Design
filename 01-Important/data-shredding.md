# Data Shredding

> Strategies and implementation patterns for securely and irreversibly destroying data in the InterviewHub platform.

---

## Table of Contents

1. [What Is Data Shredding?](#1-what-is-data-shredding)
2. [Why It Matters](#2-why-it-matters)
3. [Regulatory Drivers](#3-regulatory-drivers)
4. [Data Shredding vs Soft Delete vs Hard Delete](#4-data-shredding-vs-soft-delete-vs-hard-delete)
5. [MongoDB Shredding Patterns](#5-mongodb-shredding-patterns)
6. [Cryptographic Shredding](#6-cryptographic-shredding)
7. [Cascade Deletion Strategy](#7-cascade-deletion-strategy)
8. [Audit Trail for Deletions](#8-audit-trail-for-deletions)
9. [Backup Purge Requirement](#9-backup-purge-requirement)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. What Is Data Shredding?

Data shredding is the process of **permanently and irreversibly removing** user data from all storage systems — primary database, backups, caches, search indexes, and logs — such that it cannot be reconstructed.

It differs from a simple `DELETE` SQL/MongoDB statement because:
- A `DELETE` may leave data in WAL logs, oplog entries, storage pages, or backups.
- True shredding must reach **every copy** of the data.

---

## 2. Why It Matters

| Scenario | Impact |
|---|---|
| User requests account deletion ("right to erasure") | Legal obligation under GDPR Art. 17, CCPA |
| Security breach response | Limit exposure of compromised data |
| Data lifecycle policies | Remove stale PII after retention period |
| Compliance audit | Demonstrate data governance maturity |

---

## 3. Regulatory Drivers

| Regulation | Requirement |
|---|---|
| **GDPR (EU)** | Right to erasure (Art. 17); data must be deleted within 30 days of request |
| **CCPA (California)** | Consumers can request deletion of personal data |
| **HIPAA** | Media must be purged/destroyed for PHI |
| **PCI-DSS** | Cardholder data must not be retained beyond need |

---

## 4. Data Shredding vs Soft Delete vs Hard Delete

```
Soft Delete          Hard Delete           Data Shredding
────────────────     ─────────────────     ──────────────────────────────
isDeleted: true      document removed      document + all related data
                     from collection       + backups + logs + caches
                                           + indexes → permanently gone
Recoverable: YES     Recoverable: YES*     Recoverable: NO
                     (*from backup)
```

**InterviewHub uses soft delete for admin workflows and data shredding for GDPR erasure requests.**

---

## 5. MongoDB Shredding Patterns

### 5.1 User Account Deletion

When a user requests erasure, the following must be deleted in order:

```js
// services/user.service.js – deleteAccount(userId)

// 1. Delete all Bookmarks referencing this user
await Bookmark.deleteMany({ user: userId });

// 2. Delete all Progress records
await Progress.deleteMany({ user: userId });

// 3. Delete all MockInterviews
await MockInterview.deleteMany({ user: userId });

// 4. Anonymise or delete Questions created by the user
//    (option A: hard delete if no answers)
await Question.deleteMany({ createdBy: userId, answers: { $size: 0 } });
//    (option B: anonymise — set createdBy to a system user)
await Question.updateMany({ createdBy: userId }, { $unset: { createdBy: '' } });

// 5. Delete the User document itself
await User.deleteOne({ _id: userId });
```

### 5.2 Overwrite Before Delete (extra assurance)

For fields that held PII (name, email, passwordHash), overwrite with dummy data before deletion so even recovery from a partially overwritten page yields nothing useful:

```js
await User.updateOne({ _id: userId }, {
  $set: {
    name:         'DELETED',
    email:        `deleted-${userId}@shredded.invalid`,
    passwordHash: 'SHREDDED',
    avatar:       null,
    skills:       [],
  }
});
await User.deleteOne({ _id: userId });
```

---

## 6. Cryptographic Shredding

An alternative for environments where physical deletion of backups is impractical:

1. Each user's PII fields are **encrypted at rest** using a per-user AES-256 key stored in a key management service (e.g. AWS KMS, HashiCorp Vault).
2. On erasure request, **delete only the encryption key**.
3. Without the key, the ciphertext in backups is permanently unreadable.

```
User PII  →  AES-256 encrypt  →  Store ciphertext in MongoDB
                ↑
         Per-user key in KMS

On erasure:
  KMS.deleteKey(userId)   ← ciphertext in all backups is now shredded
```

**This pattern allows backup retention without retaining recoverable PII.**

---

## 7. Cascade Deletion Strategy

```
User
 ├── Bookmarks      → deleteMany({ user })
 ├── Progress       → deleteMany({ user })
 ├── MockInterviews → deleteMany({ user })
 └── Questions      → anonymise createdBy  (preserve community content)
```

All cascade deletions must run inside a **MongoDB session with transaction** to ensure atomicity:

```js
const session = await mongoose.startSession();
session.startTransaction();
try {
  await Bookmark.deleteMany({ user: userId }, { session });
  await Progress.deleteMany({ user: userId }, { session });
  await MockInterview.deleteMany({ user: userId }, { session });
  await User.deleteOne({ _id: userId }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

---

## 8. Audit Trail for Deletions

Even after data is shredded, a **minimal audit record** (containing no PII) must be kept for compliance:

```js
// DeletionAudit schema
{
  requestId:   ObjectId,   // internal ID, never the user's _id
  requestedAt: Date,
  completedAt: Date,
  status:      'completed' | 'failed',
  triggeredBy: 'user_self' | 'admin' | 'automated_policy',
  dataScope:   ['user', 'bookmarks', 'progress', 'mock_interviews'],
}
```

No email, name, or any PII is stored in the audit record.

---

## 9. Backup Purge Requirement

Shredding the live database is not enough. The erasure pipeline must also:

| Step | Action |
|---|---|
| 1 | Tag user data in backups with a **retention label** at backup time |
| 2 | On erasure, enqueue a **backup purge job** |
| 3 | Purge job rewrites or drops backup segments containing the user's data |
| 4 | For cryptographic shredding, key deletion achieves this automatically |
| 5 | Log purge completion with timestamp in the audit trail |

> **Note:** MongoDB Atlas supports **Point-in-Time Restore** with a maximum retention of 35 days. GDPR erasure must complete within 30 days, giving a 5-day window to confirm all backups are purged or keys are deleted.

---

## 10. Implementation Checklist

- [ ] `DELETE /api/users/me` endpoint triggers full cascade deletion
- [ ] Admin endpoint `DELETE /api/admin/users/:id` also triggers cascade
- [ ] All deletions wrapped in a MongoDB transaction
- [ ] PII fields overwritten before document deletion
- [ ] Deletion audit record created (no PII)
- [ ] Backup purge job enqueued (or cryptographic key deleted)
- [ ] Confirmation email sent to user (if email still accessible)
- [ ] GDPR erasure acknowledged within 72 hours, completed within 30 days
- [ ] Penetration test: verify deleted user data is not accessible via API
