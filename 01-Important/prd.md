# Product Requirements Document (PRD)

**Product:** InterviewHub – Developer Interview Preparation Platform
**Version:** 1.0
**Status:** Active
**Last Updated:** 2025
**Owner:** Platform Engineering Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Non-Goals](#4-non-goals)
5. [User Personas](#5-user-personas)
6. [User Stories & Requirements](#6-user-stories--requirements)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [System Architecture Overview](#9-system-architecture-overview)
10. [Data Requirements](#10-data-requirements)
11. [Security Requirements](#11-security-requirements)
12. [API Contract Summary](#12-api-contract-summary)
13. [Release Phases](#13-release-phases)
14. [Dependencies & Risks](#14-dependencies--risks)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

InterviewHub is a full-stack web platform that helps software developers prepare for technical interviews. It provides a curated library of interview questions, personalised progress tracking, timed mock interviews, and analytics — all behind role-based access control.

The platform is designed to serve as both a **genuine preparation tool** and a **production-grade reference implementation** demonstrating senior engineering skills.

---

## 2. Problem Statement

### Current Pain Points

| Problem | Impact |
|---|---|
| Interview questions are scattered across blog posts, GitHub gists, and YouTube videos | Developers waste time aggregating resources |
| No personalised tracking of what has been studied | Developers repeat questions they already know |
| Generic practice is not tailored to target company or seniority level | Low signal-to-noise preparation |
| No time-pressured practice environment | Poor performance under real interview conditions |
| No admin workflow to curate quality questions | Community platforms are noisy with low-quality content |

### Opportunity

A single, structured platform that combines question browsing, bookmarking, progress tracking, and timed mock interviews — with admin curation — closes all five gaps above.

---

## 3. Goals & Success Metrics

### Goals

1. Allow developers to browse, filter, and bookmark 50+ curated interview questions.
2. Enable progress tracking so users can see what they have studied and scored.
3. Deliver timed mock interview sessions with automatic scoring.
4. Provide preparation analytics (completion rates, strong/weak areas).
5. Give admins tools to manage users and questions.

### Success Metrics

| Metric | Target (3 months post-launch) |
|---|---|
| Registered users | ≥ 500 |
| Questions completed per active user (weekly) | ≥ 10 |
| Mock interviews taken per active user (monthly) | ≥ 2 |
| User retention (Day 7) | ≥ 40% |
| API error rate | < 0.5% |
| API p95 latency | < 300 ms |
| Uptime | ≥ 99.5% |

---

## 4. Non-Goals

The following are explicitly **out of scope** for v1.0:

- Real-time collaboration or peer-to-peer mock interviews
- Video recording or playback of interview sessions
- AI-generated question explanations or hints
- Payments, subscriptions, or monetisation
- Mobile native apps (iOS / Android)
- Integration with LinkedIn, GitHub, or ATS systems
- Certification or badge issuance

---

## 5. User Personas

### Persona 1 — The Job Seeker (Primary)

| Attribute | Detail |
|---|---|
| **Name** | Alex Chen |
| **Role** | Mid-level software developer, 4 years experience |
| **Goal** | Land a senior developer role at a top-tier tech company |
| **Pain point** | Forgets what questions were already studied; no way to track weak areas |
| **Behaviour** | Studies 30–60 min/day, prefers mobile-friendly UI |
| **Key features needed** | Bookmarks, progress tracking, analytics, mock interviews |

### Persona 2 — The Career Switcher

| Attribute | Detail |
|---|---|
| **Name** | Priya Nair |
| **Role** | Front-end developer transitioning to full-stack |
| **Goal** | Learn backend/DevOps interview patterns quickly |
| **Pain point** | Overwhelming volume of topics with no prioritisation |
| **Behaviour** | Uses category/technology filters heavily |
| **Key features needed** | Category filter, difficulty filter, explanations per question |

### Persona 3 — The Platform Administrator

| Attribute | Detail |
|---|---|
| **Name** | Sam Rivera |
| **Role** | Platform admin / content curator |
| **Goal** | Maintain question quality and user trust |
| **Pain point** | No tooling to manage users or review submitted questions |
| **Behaviour** | Reviews new questions weekly, occasionally deactivates problem accounts |
| **Key features needed** | Admin panel, user management, question CRUD |

---

## 6. User Stories & Requirements

### Authentication

| ID | Story | Priority |
|---|---|---|
| US-01 | As a visitor, I can register with name, email, and password | Must Have |
| US-02 | As a user, I can log in and receive a session token | Must Have |
| US-03 | As a user, my session persists across page refreshes (refresh token) | Must Have |
| US-04 | As a user, I can log out and invalidate my session | Must Have |

### Questions

| ID | Story | Priority |
|---|---|---|
| US-05 | As a user, I can browse all questions with pagination | Must Have |
| US-06 | As a user, I can filter questions by technology, category, difficulty | Must Have |
| US-07 | As a user, I can search questions by keyword | Must Have |
| US-08 | As a user, I can sort questions by date or difficulty | Should Have |
| US-09 | As a user, I can view a question's full details including answer and explanation | Must Have |

### Bookmarks

| ID | Story | Priority |
|---|---|---|
| US-10 | As a user, I can bookmark a question | Must Have |
| US-11 | As a user, I can view all my bookmarked questions | Must Have |
| US-12 | As a user, I can remove a bookmark | Must Have |

### Progress & Analytics

| ID | Story | Priority |
|---|---|---|
| US-13 | As a user, I can mark a question as completed with a score | Must Have |
| US-14 | As a user, I can see my progress statistics (completion rate, avg score) | Must Have |
| US-15 | As a user, I can see my strong and weak areas by technology | Should Have |

### Mock Interviews

| ID | Story | Priority |
|---|---|---|
| US-16 | As a user, I can start a timed mock interview with N random questions | Must Have |
| US-17 | As a user, I can answer questions during the mock interview | Must Have |
| US-18 | As a user, I can see my score and review answers after completing an interview | Must Have |
| US-19 | As a user, I can view my interview history | Should Have |

### Admin

| ID | Story | Priority |
|---|---|---|
| US-20 | As an admin, I can create, edit, and delete questions | Must Have |
| US-21 | As an admin, I can view all users and deactivate accounts | Must Have |
| US-22 | As an admin, I can promote a user to admin | Should Have |

---

## 7. Functional Requirements

### FR-1: Authentication & Authorisation

- FR-1.1: Registration requires valid email (unique), password ≥ 8 chars, and name.
- FR-1.2: Passwords stored as bcrypt hash (salt rounds ≥ 10).
- FR-1.3: Login issues a short-lived JWT access token (15 min) and a long-lived refresh token (7 days, httpOnly cookie).
- FR-1.4: Token refresh rotates the refresh token (old token invalidated).
- FR-1.5: Role-based access control: `user` and `admin` roles.
- FR-1.6: All `/admin` routes require `admin` role.

### FR-2: Question Management

- FR-2.1: Questions support categories: frontend, backend, devops, database, security, system-design, algorithms, testing, mobile, cloud, general.
- FR-2.2: Questions support technologies: JavaScript, TypeScript, React, Angular, Vue, Node.js, Python, Java, MongoDB, PostgreSQL, Docker, Kubernetes, AWS, and others.
- FR-2.3: Questions support difficulty: easy, medium, hard.
- FR-2.4: Full-text search across title and description.
- FR-2.5: Pagination: default 20 per page, max 100.
- FR-2.6: All question list responses include total count for pagination UI.

### FR-3: Bookmarks

- FR-3.1: A user cannot bookmark the same question twice (enforced at DB and API layer).
- FR-3.2: Bookmark list supports pagination.

### FR-4: Progress Tracking

- FR-4.1: Progress record is created or updated on each attempt.
- FR-4.2: `attempts` counter increments on every submission.
- FR-4.3: Status transitions: `not_started` → `in_progress` → `completed`.

### FR-5: Mock Interview

- FR-5.1: Interview is configured with number of questions (default: 10) and optional technology filter.
- FR-5.2: Questions are randomly selected from the filtered pool.
- FR-5.3: Interview has a timer; duration is recorded on completion.
- FR-5.4: Score is calculated as `(correct answers / total questions) × 100`.

### FR-6: Admin Panel

- FR-6.1: Admins can view all users with pagination and search.
- FR-6.2: Admins can toggle user `isActive` status.
- FR-6.3: Admins can create, update, and delete any question.
- FR-6.4: Admin actions are logged (who did what, when).

---

## 8. Non-Functional Requirements

### NFR-1: Performance

| Requirement | Target |
|---|---|
| API response time (p95) | < 300 ms |
| API response time (p99) | < 1,000 ms |
| Page load (Largest Contentful Paint) | < 2.5 s on 4G |
| Database query time (p95) | < 50 ms |

### NFR-2: Availability

| Requirement | Target |
|---|---|
| Uptime | ≥ 99.5% |
| Planned maintenance window | < 30 min/month |
| Recovery Time Objective (RTO) | < 4 hours |
| Recovery Point Objective (RPO) | < 15 minutes |

### NFR-3: Security

- All API endpoints protected by HTTPS (TLS 1.2+).
- Rate limiting: 100 req/15 min general; 10 req/15 min on auth endpoints.
- Helmet.js security headers (CSP, HSTS, X-Frame-Options).
- Input validation on all request bodies.
- No PII returned in error messages or logs.

### NFR-4: Scalability

- Application tier: horizontally scalable (stateless Node.js containers).
- Database tier: MongoDB replica set with read scaling on secondaries.
- Must support 1,000 concurrent users without degradation.

### NFR-5: Maintainability

- Code coverage: ≥ 80% for backend services.
- All public API endpoints documented in Swagger/OpenAPI 3.0.
- Structured JSON logging with correlation IDs on all requests.

### NFR-6: Data Retention

- User progress data retained for 2 years after last activity.
- Deleted user data shredded within 30 days (GDPR compliance).
- Access logs retained for 90 days.

---

## 9. System Architecture Overview

```
User's Browser
      │  HTTPS
      ▼
  CloudFront / CDN
      │
      ▼
  Nginx (Angular SPA)         ← static, served from S3 or container
      │
      ▼ HTTP/REST
  Express API (Node.js)       ← stateless, horizontally scalable
      │
      ├── Redis (rate limit, session cache)
      │
      └── MongoDB Replica Set (primary + 2 secondaries)
              │
              └── Off-site Backup (S3 + Glacier)
```

See [`docs/architecture.md`](architecture.md) for full diagrams and [`docs/database.md`](database.md) for schema detail.

---

## 10. Data Requirements

| Collection | Purpose | Estimated Size (year 1) |
|---|---|---|
| `users` | Registered accounts | ~5,000 documents |
| `questions` | Interview question library | ~500 documents |
| `bookmarks` | Per-user question saves | ~50,000 documents |
| `progress` | Per-user per-question tracking | ~200,000 documents |
| `mockinterviews` | Interview session records | ~20,000 documents |

**Total estimated storage:** < 1 GB in year 1 (well within free/low-cost DB tier).

See [`docs/data-design-db.md`](data-design-db.md) for full schema and index design.
See [`docs/db-persistence-backup.md`](db-persistence-backup.md) for backup and persistence strategy.
See [`docs/data-shredding.md`](data-shredding.md) for erasure and GDPR compliance.

---

## 11. Security Requirements

| Requirement | Implementation |
|---|---|
| Password storage | bcrypt, salt rounds ≥ 12 |
| Token security | Short-lived access token in memory; refresh token in httpOnly cookie |
| CSRF protection | SameSite=Strict cookie + custom header check |
| XSS protection | CSP headers via Helmet; no tokens in localStorage |
| SQL/NoSQL injection | Mongoose schema typing; no raw string queries |
| Data encryption in transit | TLS 1.2+ enforced |
| Secrets management | All secrets in environment variables; never committed to source |
| GDPR | Right to erasure (30-day SLA); data shredding pipeline |

See [`docs/security.md`](security.md) for full security design.

---

## 12. API Contract Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, receive tokens |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/api/auth/logout` | Bearer | Invalidate refresh token |
| GET | `/api/questions` | Bearer | List/filter/search questions |
| GET | `/api/questions/:id` | Bearer | Get single question |
| POST | `/api/questions` | Admin | Create question |
| PUT | `/api/questions/:id` | Admin | Update question |
| DELETE | `/api/questions/:id` | Admin | Delete question |
| GET | `/api/bookmarks` | Bearer | List my bookmarks |
| POST | `/api/bookmarks` | Bearer | Add bookmark |
| DELETE | `/api/bookmarks/:id` | Bearer | Remove bookmark |
| GET | `/api/progress` | Bearer | Get my progress stats |
| POST | `/api/progress` | Bearer | Submit question answer |
| GET | `/api/interviews` | Bearer | List my mock interviews |
| POST | `/api/interviews` | Bearer | Start mock interview |
| PUT | `/api/interviews/:id` | Bearer | Submit / complete interview |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users/:id` | Admin | Update user (role, active) |
| GET | `/health` | None | Liveness probe |
| GET | `/ready` | None | Readiness probe |

Full Swagger documentation: **http://localhost:3000/api/docs**

---

## 13. Release Phases

### Phase 1 — MVP (Weeks 1–4)

- [ ] User registration and login (JWT + refresh tokens)
- [ ] Question library with 50 seeded questions
- [ ] Filter by technology, category, difficulty
- [ ] Bookmark questions
- [ ] Basic progress tracking (mark as complete)

### Phase 2 — Core Features (Weeks 5–8)

- [ ] Progress analytics dashboard (completion by technology)
- [ ] Timed mock interview sessions
- [ ] Post-interview score review
- [ ] Admin panel: question CRUD + user management

### Phase 3 — Polish & Production Readiness (Weeks 9–12)

- [ ] Full-text search
- [ ] Pagination UX improvements
- [ ] Swagger / OpenAPI docs
- [ ] Integration test suite (≥ 80% coverage)
- [ ] Docker Compose production configuration
- [ ] Monitoring: health probes, structured logging
- [ ] GDPR: data erasure endpoint

---

## 14. Dependencies & Risks

### External Dependencies

| Dependency | Risk if Unavailable |
|---|---|
| MongoDB (self-hosted or Atlas) | Core data layer — platform non-functional |
| Node.js 20 LTS | Runtime — pin version in Dockerfile |
| Angular 21 | SPA framework — major version breaking changes |
| npm registry | Build pipeline breaks if packages are yanked |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| MongoDB performance degradation under load | Medium | High | Replica set + indexes + query optimisation |
| JWT secret compromise | Low | Critical | Rotate secrets; short access token lifetime |
| Accidental data deletion by admin | Medium | High | Soft delete + admin action audit log |
| NPM dependency vulnerability | High | Medium | `npm audit` in CI; Dependabot |
| Cloud provider outage | Low | High | Multi-AZ deployment; DR runbook |

---

## 15. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | Should mock interviews support custom question sets (not just random)? | Product | Sprint 3 |
| 2 | Is email notification required for account deletion confirmation? | Legal/Product | Sprint 2 |
| 3 | What is the question submission workflow for non-admin users? | Product | Sprint 4 |
| 4 | Do we need an audit log for all admin actions (queryable UI)? | Security | Sprint 3 |
| 5 | Should refresh tokens be stored in Redis for revocation capability? | Engineering | Sprint 2 |
