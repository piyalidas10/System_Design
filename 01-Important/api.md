# API Reference

## Base URL
- Local: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`

## Authentication
All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

---

## Response Format

### Success
```json
{ "success": true, "data": {}, "message": "Operation successful" }
```

### Error
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable" } }
```

### Paginated
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

---

## Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | ✗ | Register new user |
| POST | /auth/login | ✗ | Login, returns access token |
| POST | /auth/logout | ✓ | Clear refresh token |
| POST | /auth/refresh | cookie | Issue new access token |
| GET | /auth/me | ✓ | Get current user |

---

## User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /users/me | ✓ | Get own profile |
| PATCH | /users/me | ✓ | Update own profile |
| GET | /users/:id | ✓ | Get user by ID |

---

## Question Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /questions | ✓ | List questions (filter/search/paginate) |
| GET | /questions/:id | ✓ | Get question by ID |
| POST | /questions | ✓ | Create question |
| PATCH | /questions/:id | ✓ | Update question |
| DELETE | /questions/:id | ADMIN | Delete question |

### Query Parameters
```
?search=node.js          – full text search
?technology=Node.js      – filter by technology
?difficulty=HARD         – filter by difficulty
?category=Authentication – filter by category
?company=Google          – filter by company
?page=1&limit=20         – pagination
?sort=createdAt&order=desc – sorting
```

---

## Bookmark Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /bookmarks/:questionId | ✓ | Bookmark a question |
| DELETE | /bookmarks/:questionId | ✓ | Remove bookmark |
| GET | /bookmarks | ✓ | List user's bookmarks |

---

## Progress Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /progress/:questionId | ✓ | Submit answer / update progress |
| GET | /progress | ✓ | List user's progress |
| GET | /progress/statistics | ✓ | Aggregated stats |

---

## Mock Interview Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /mock-interviews | ✓ | Start new mock interview |
| GET | /mock-interviews | ✓ | List user's mock interviews |
| GET | /mock-interviews/:id | ✓ | Get mock interview details |
| POST | /mock-interviews/:id/submit | ✓ | Submit completed interview |

---

## Admin Endpoints

| Method | Path | Auth | Role |
|---|---|---|---|
| GET | /admin/users | ✓ | ADMIN |
| PATCH | /admin/users/:id/status | ✓ | ADMIN |
| DELETE | /admin/users/:id | ✓ | ADMIN |
| GET | /admin/questions | ✓ | ADMIN |
| POST | /admin/questions | ✓ | ADMIN |
| PATCH | /admin/questions/:id | ✓ | ADMIN |
| DELETE | /admin/questions/:id | ✓ | ADMIN |

---

## Health Endpoints (no auth)

| Method | Path | Description |
|---|---|---|
| GET | /health | Service health (DB status) |
| GET | /ready | Readiness probe |
| GET | /live | Liveness probe |
