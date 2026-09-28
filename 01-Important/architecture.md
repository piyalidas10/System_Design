# Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose Network                        │
│                                                                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   Frontend      │    │    Backend      │    │    MongoDB      │  │
│  │  (Nginx :80)    │───▶│  (Node.js :3000)│───▶│  (Mongo :27017) │  │
│  │                 │    │                 │    │                 │  │
│  │  Angular SPA    │    │  Express REST   │    │  Collections:   │  │
│  │  - Signals      │    │  - Routes       │    │  - users        │  │
│  │  - Interceptors │    │  - Controllers  │    │  - questions    │  │
│  │  - Guards       │    │  - Services     │    │  - bookmarks    │  │
│  │                 │    │  - Repos        │    │  - progress     │  │
│  └─────────────────┘    └─────────────────┘    │  - mockinterviews│  │
│                                                 └─────────────────┘  │
│  Host port 4200         Host port 3000          Host port 27017       │
└─────────────────────────────────────────────────────────────────────┘
```

## Request Lifecycle

```
Browser
  │
  │ HTTP Request (with Authorization: Bearer <token>)
  ▼
Nginx (frontend container)
  │
  │ Proxy to backend (for /api/* paths)
  │ Serve static Angular for all other paths
  ▼
Express App
  │
  ├── helmet()             – Security headers
  ├── cors()               – CORS policy
  ├── requestLogger()      – Correlation ID, timing
  ├── express.json()       – Body parsing (max 10kb)
  ├── cookieParser()       – Parse refresh token cookie
  ├── apiLimiter()         – Rate limiting (100 req/15min)
  │
  ├── /api/auth/*          – Auth routes (no authenticate)
  │
  └── /api/questions/*
        │
        ├── authenticate   – Verify JWT, attach req.user
        ├── authorize      – Check role (optional)
        ├── validate       – Validate request body
        │
        └── Controller
              │
              └── Service
                    │
                    └── Repository
                          │
                          └── Mongoose → MongoDB
```

## Layer Responsibilities

| Layer | File Location | Responsibility |
|---|---|---|
| Route | `src/routes/` | Define endpoints, apply middleware |
| Controller | `src/controllers/` | Parse req, call service, format response |
| Service | `src/services/` | Business logic, orchestration |
| Repository | `src/repositories/` | Database queries only |
| Model | `src/models/` | Schema definition, indexes |

**Rule:** No layer reaches into a layer below its direct dependency.
Controllers never import Repositories. Services never import Controllers.
