# Database Schema

## Collections Overview

| Collection | Purpose |
|---|---|
| `users` | Registered developers and admins |
| `questions` | Interview questions |
| `bookmarks` | User ↔ Question bookmarks |
| `progress` | User ↔ Question practice attempts |
| `mockinterviews` | Timed mock interview sessions |

---

## User Schema

```js
{
  _id:          ObjectId (auto),
  name:         String, required, trim, maxLength: 100,
  email:        String, required, unique, lowercase, trim,
  passwordHash: String, required, select: false,  // NEVER returned in API
  role:         String, enum: ['USER', 'ADMIN'], default: 'USER',
  skills:       [String],
  experience:   Number, min: 0, max: 50,          // years
  avatar:       String,                            // URL
  isActive:     Boolean, default: true,
  createdAt:    Date (timestamps),
  updatedAt:    Date (timestamps),
}

Indexes:
  { email: 1, unique: true }
```

---

## Question Schema

```js
{
  _id:             ObjectId,
  title:           String, required, trim, maxLength: 500,
  description:     String, required,
  category:        String, required, enum: [...],
  technology:      String, required, enum: [...],
  difficulty:      String, required, enum: ['EASY', 'MEDIUM', 'HARD'],
  tags:            [String],
  answers:         [String],                   // multiple choice options
  correctAnswer:   Number,                     // index into answers[]
  explanation:     String,
  company:         String,                     // "Google", "Amazon", etc.
  experienceLevel: String, enum: ['JUNIOR', 'MID', 'SENIOR'],
  createdBy:       ObjectId, ref: 'User',
  createdAt:       Date,
  updatedAt:       Date,
}

Indexes:
  { technology: 1 }
  { category: 1 }
  { difficulty: 1 }
  { tags: 1 }
  { company: 1 }
  { technology: 1, difficulty: 1, category: 1 }  // compound for filtered list
  { title: 'text', description: 'text' }          // text search
```

---

## Bookmark Schema

```js
{
  _id:       ObjectId,
  user:      ObjectId, ref: 'User', required,
  question:  ObjectId, ref: 'Question', required,
  createdAt: Date,
}

Indexes:
  { user: 1, question: 1, unique: true }  // prevents double-bookmark
  { user: 1 }                             // list user's bookmarks
```

---

## Progress Schema

```js
{
  _id:           ObjectId,
  user:          ObjectId, ref: 'User', required,
  question:      ObjectId, ref: 'Question', required,
  status:        String, enum: ['NOT_STARTED','IN_PROGRESS','COMPLETED'],
  score:         Number, min: 0, max: 100,
  attempts:      Number, default: 0,
  lastAttemptAt: Date,
  completedAt:   Date,
  createdAt:     Date,
  updatedAt:     Date,
}

Indexes:
  { user: 1, question: 1, unique: true }
  { user: 1 }
  { user: 1, status: 1 }
```

---

## MockInterview Schema

```js
{
  _id:         ObjectId,
  user:        ObjectId, ref: 'User', required,
  questions:   [{
    question:  ObjectId, ref: 'Question',
    answer:    Number,    // selected answer index
    isCorrect: Boolean,
  }],
  startedAt:   Date, default: Date.now,
  completedAt: Date,
  score:       Number, min: 0, max: 100,
  duration:    Number,   // seconds
  status:      String, enum: ['IN_PROGRESS','COMPLETED','ABANDONED'],
  createdAt:   Date,
  updatedAt:   Date,
}

Indexes:
  { user: 1 }
  { user: 1, status: 1 }
```

---

## Relationships

```
User ──── creates ───▶ Question (createdBy field)
User ──── has ────────▶ Bookmark[] (user field)
User ──── has ────────▶ Progress[] (user field)
User ──── takes ──────▶ MockInterview[] (user field)
MockInterview ────────▶ Question[] (questions[].question)
Bookmark ─────────────▶ Question (question field)
Progress ─────────────▶ Question (question field)
```

## Embedding vs Referencing Decisions

| Data | Decision | Reason |
|---|---|---|
| `answers[]` in Question | Embedded | Always read together, small, rarely updated independently |
| `createdBy` in Question | Reference | User data is large, shared, independently updated |
| `questions[]` in MockInterview | Reference array | Questions are shared entities; populate on demand |
| User `skills[]` | Embedded | Small, always read with user, not shared |
