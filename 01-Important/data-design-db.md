# Data Design for the Database

> Schema design decisions, modelling patterns, indexing strategies, and query optimisation for InterviewHub's MongoDB layer.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Relational vs Document Model](#2-relational-vs-document-model)
3. [Embed vs Reference Decision Framework](#3-embed-vs-reference-decision-framework)
4. [Collection Schemas](#4-collection-schemas)
5. [Indexes](#5-indexes)
6. [Aggregation Pipeline Design](#6-aggregation-pipeline-design)
7. [Schema Versioning](#7-schema-versioning)
8. [Data Validation at the DB Layer](#8-data-validation-at-the-db-layer)
9. [Naming Conventions](#9-naming-conventions)
10. [Anti-Patterns to Avoid](#10-anti-patterns-to-avoid)

---

## 1. Design Philosophy

MongoDB is a **document-oriented** database. Good document design requires thinking in terms of:

> **"How will my application query this data?"** rather than "How do I normalise this into 3NF?"

Key principles applied in InterviewHub:

| Principle | Applied As |
|---|---|
| **Model for your access patterns** | Bookmark stores both `user` and `question` refs — no JOIN needed |
| **Embed when data is owned and always read together** | `answers[]` inside Question |
| **Reference when data is shared or grows unboundedly** | `createdBy` in Question → User ref |
| **Avoid unbounded arrays in documents** | Progress is a separate collection, not an array inside User |
| **Use indexes on every query filter field** | `technology`, `difficulty`, `tags`, compound `{user, question}` |

---

## 2. Relational vs Document Model

```
RELATIONAL (SQL)               DOCUMENT (MongoDB)
─────────────────────          ─────────────────────────────
Tables + Rows                  Collections + Documents
Foreign keys (enforced)        References (application-enforced)
JOIN to combine data           $lookup or application-level join
Schema enforced by DB          Schema enforced by Mongoose
Transactions always ACID       ACID transactions (v4.0+ replica set)
Normalise to reduce redundancy Denormalise to avoid joins
```

InterviewHub chooses MongoDB because:
- Questions have variable-length `answers[]` arrays — natural document fit
- Profile data (skills, experience) is polymorphic per user
- Aggregation pipelines provide analytics without a separate OLAP store

---

## 3. Embed vs Reference Decision Framework

```
Should I EMBED or REFERENCE?

Ask:
  1. Is the child data ONLY meaningful in context of the parent?
     → Embed  (e.g. answers[] inside Question)

  2. Does the child data grow UNBOUNDEDLY?
     → Reference  (e.g. a user's progress entries — can be thousands)

  3. Is the child data SHARED by multiple parents?
     → Reference  (e.g. a Question referenced by many Bookmarks)

  4. Is the child data READ TOGETHER with the parent 95%+ of the time?
     → Embed  (e.g. question tags, explanation text)

  5. Does the child data need INDEPENDENT CRUD?
     → Reference  (e.g. MockInterview has its own lifecycle)
```

### Decision Table for InterviewHub

| Relationship | Strategy | Reason |
|---|---|---|
| Question → answers[] | **Embed** | Answers belong to one question, always read together |
| Question → tags[] | **Embed** | Simple string array, bounded, always returned |
| Question → createdBy | **Reference** (User) | User data is independent, shared |
| Bookmark → user, question | **Reference** (both) | Both entities exist independently |
| Progress → user, question | **Reference** (both) | Both entities exist independently |
| MockInterview → questions[] | **Reference array** (Question) | Questions are reused across interviews |

---

## 4. Collection Schemas

### 4.1 User

```js
// models/User.js
{
  _id:          ObjectId,
  name:         String,    // required, trim, 2–100 chars
  email:        String,    // required, unique, lowercase, indexed
  passwordHash: String,    // select: false  ← never returned in queries
  role:         String,    // enum: ['user', 'admin'], default: 'user'
  skills:       [String],  // e.g. ['JavaScript', 'React', 'MongoDB']
  experience:   Number,    // years of experience
  avatar:       String,    // URL
  isActive:     Boolean,   // default: true; soft-disable without deletion
  createdAt:    Date,      // timestamps: true
  updatedAt:    Date,
}

Indexes:
  { email: 1 }  unique: true
```

### 4.2 Question

```js
// models/Question.js
{
  _id:             ObjectId,
  title:           String,    // required, trim, 10–500 chars
  description:     String,    // required, full question body (markdown)
  category:        String,    // enum: ['frontend', 'backend', 'devops', ...]
  technology:      String,    // enum: ['JavaScript', 'React', 'Node.js', ...]
  difficulty:      String,    // enum: ['easy', 'medium', 'hard']
  tags:            [String],  // free-form, indexed
  answers:         [String],  // MCQ options (embedded — always read together)
  correctAnswer:   Number,    // index into answers[]
  explanation:     String,    // shown after answering
  company:         String,    // e.g. 'Google', 'Amazon'
  experienceLevel: String,    // enum: ['junior', 'mid', 'senior']
  createdBy:       ObjectId,  // ref: 'User'
  createdAt:       Date,
  updatedAt:       Date,
}

Indexes:
  { technology: 1 }
  { category: 1 }
  { difficulty: 1 }
  { tags: 1 }
  { company: 1 }
  { technology: 1, difficulty: 1 }  // compound — most common filter combo
  { title: 'text', description: 'text' }  // full-text search
```

### 4.3 Bookmark

```js
// models/Bookmark.js
{
  _id:       ObjectId,
  user:      ObjectId,  // ref: 'User'
  question:  ObjectId,  // ref: 'Question'
  createdAt: Date,
}

Indexes:
  { user: 1, question: 1 }  unique: true  // prevents duplicate bookmarks
  { user: 1 }               // list all bookmarks for a user
```

### 4.4 Progress

```js
// models/Progress.js
{
  _id:           ObjectId,
  user:          ObjectId,  // ref: 'User'
  question:      ObjectId,  // ref: 'Question'
  status:        String,    // enum: ['not_started', 'in_progress', 'completed']
  score:         Number,    // 0–100
  attempts:      Number,    // default: 0
  lastAttemptAt: Date,
  completedAt:   Date,
  createdAt:     Date,
  updatedAt:     Date,
}

Indexes:
  { user: 1, question: 1 }  unique: true
  { user: 1, status: 1 }    // filter by status for a user
```

### 4.5 MockInterview

```js
// models/MockInterview.js
{
  _id:       ObjectId,
  user:      ObjectId,  // ref: 'User'
  questions: [
    {
      question:  ObjectId,  // ref: 'Question'
      answer:    Number,    // index chosen by user
      isCorrect: Boolean,
    }
  ],
  startedAt:   Date,
  completedAt: Date,
  score:       Number,   // 0–100
  duration:    Number,   // seconds
  status:      String,   // enum: ['in_progress', 'completed', 'abandoned']
  createdAt:   Date,
  updatedAt:   Date,
}

Indexes:
  { user: 1 }
  { user: 1, status: 1 }
  { user: 1, createdAt: -1 }  // list recent interviews for a user
```

---

## 5. Indexes

### 5.1 Index Types Used

| Type | Example | Use Case |
|---|---|---|
| **Single field** | `{ email: 1 }` | Exact lookup |
| **Compound** | `{ technology: 1, difficulty: 1 }` | Multi-filter queries |
| **Unique** | `{ user: 1, question: 1 } unique` | Prevent duplicate bookmarks |
| **Text** | `{ title: 'text', description: 'text' }` | Full-text search |
| **TTL** | `{ expiredAt: 1 } expireAfterSeconds: 0` | Auto-expire sessions/tokens |

### 5.2 Index Design Rules

1. **Index every field used in a `find()` filter or `sort()`**.
2. **Put equality fields before range fields in compound indexes**: `{ technology: 1, difficulty: 1, createdAt: -1 }`.
3. **Avoid over-indexing** — each index costs write performance and storage.
4. Use **`.explain('executionStats')`** to verify `IXSCAN` (not `COLLSCAN`).

```js
// Verify an index is being used
await Question.find({ technology: 'React', difficulty: 'hard' })
  .explain('executionStats');
// Look for: winningPlan.stage === 'IXSCAN'
```

---

## 6. Aggregation Pipeline Design

### 6.1 User Statistics Pipeline

```js
// Calculates completion stats per technology for a user
db.progress.aggregate([
  { $match: { user: ObjectId(userId) } },                 // stage 1: filter
  { $lookup: {                                             // stage 2: join
      from: 'questions',
      localField: 'question',
      foreignField: '_id',
      as: 'questionData'
  }},
  { $unwind: '$questionData' },                           // stage 3: flatten
  { $group: {                                             // stage 4: aggregate
      _id: '$questionData.technology',
      total:     { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      avgScore:  { $avg: '$score' }
  }},
  { $sort: { total: -1 } },                               // stage 5: sort
  { $project: {                                           // stage 6: shape
      technology: '$_id',
      total:      1,
      completed:  1,
      avgScore:   { $round: ['$avgScore', 1] },
      _id:        0
  }}
]);
```

### 6.2 Pipeline Design Guidelines

| Guideline | Why |
|---|---|
| `$match` as early as possible | Reduces documents in subsequent stages |
| `$project` to drop unused fields before `$lookup` | Reduces memory footprint |
| Use `$lookup` with a pipeline (correlated subquery) for complex joins | More flexible than simple equality join |
| Limit result sets with `$limit` before expensive `$sort` when possible | Avoids sorting the entire collection |
| Add indexes on `$match` and `$lookup` join fields | Prevents COLLSCAN inside aggregation |

---

## 7. Schema Versioning

As the application evolves, documents may need new fields. Mongoose handles this gracefully:

```js
// Adding a new field — safe, backward compatible
const userSchema = new Schema({
  // ... existing fields ...
  lastLoginAt: { type: Date, default: null },  // new field; old docs get null
});
```

For **breaking schema changes** (renaming fields, restructuring arrays):

```js
// Migration script: scripts/migrations/001-rename-field.js
const User = require('../src/models/User');

async function up() {
  await User.updateMany(
    { oldField: { $exists: true } },
    [{ $set: { newField: '$oldField' } }, { $unset: 'oldField' }]
  );
}
```

Migrations are **numbered, sequential, and idempotent** — safe to run multiple times.

---

## 8. Data Validation at the DB Layer

Mongoose provides schema-level validation as a second line of defence (first line: Express validators):

```js
email: {
  type:      String,
  required:  [true, 'Email is required'],
  unique:    true,
  lowercase: true,
  match:     [/^\S+@\S+\.\S+$/, 'Invalid email format'],
},
difficulty: {
  type: String,
  enum: {
    values:  ['easy', 'medium', 'hard'],
    message: '{VALUE} is not a valid difficulty',
  },
},
score: {
  type: Number,
  min:  [0, 'Score cannot be negative'],
  max:  [100, 'Score cannot exceed 100'],
},
```

**Rule:** Never rely solely on application-level validation. Schema-level validation catches bugs in seeds, migration scripts, and direct DB writes.

---

## 9. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Collection names | plural, camelCase (Mongoose default) | `users`, `questions`, `mockinterviews` |
| Field names | camelCase | `createdAt`, `passwordHash`, `isActive` |
| Reference fields | singular entity name | `user` (not `userId`), `question` |
| Enum values | lowercase with underscores | `'not_started'`, `'in_progress'` |
| Index names | auto-generated by MongoDB | (rely on defaults) |

---

## 10. Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|---|---|---|
| **Unbounded arrays** | `user.progress[]` growing forever bloats the document | Separate `Progress` collection |
| **Storing passwords in plain text** | Critical security vulnerability | bcrypt hash via `utils/password.js` |
| **Using `_id` as a surrogate foreign key string** | Loses ObjectId type, breaks `$lookup` | Always use `ObjectId` for refs |
| **No index on filter fields** | Full collection scan (COLLSCAN) on every query | Add index for every `find()` filter |
| **Returning `passwordHash` in queries** | Exposes secret data | `select: false` on schema field |
| **`findOne()` without a unique index field** | Non-deterministic result | Query by indexed unique field only |
| **Deeply nested documents (> 3 levels)** | Hard to query, update, and index | Flatten or reference |
| **Storing computed values without invalidation** | Stale cached data | Recompute via aggregation, or invalidate on write |
