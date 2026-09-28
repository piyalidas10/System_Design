# InterviewHub – Interview Guide

> This document explains exactly **how each part of the codebase demonstrates key concepts** that interviewers ask about.
> Each section contains the concept, the code location, and the interview-ready explanation.

---

## TABLE OF CONTENTS

- [Node.js](#nodejs)
- [Express.js](#expressjs)
- [MongoDB](#mongodb)
- [Mongoose](#mongoose)
- [Authentication & Security](#authentication--security)
- [Docker](#docker)
- [Angular 21](#angular-21)
- [50 Interview Questions with Answers](#50-interview-questions-with-answers)

---

## Node.js

### Event Loop & Non-blocking I/O

**Code location:** Every `async/await` call in `services/` and `repositories/`

**Explanation:**
Node.js is single-threaded but non-blocking. It uses the event loop to handle concurrent I/O without creating a thread per request.

```
┌─────────────────────────────┐
│         Call Stack          │
│  (synchronous JS execution) │
└──────────────┬──────────────┘
               │  I/O call (e.g. mongoose.find())
               ▼
┌─────────────────────────────┐
│     Node.js API / libuv     │  ← delegates to OS async I/O
│  (non-blocking I/O threads) │
└──────────────┬──────────────┘
               │  I/O complete → callback queued
               ▼
┌─────────────────────────────┐
│       Event Loop            │
│  - timers                   │
│  - pending callbacks        │
│  - idle/prepare             │
│  - poll ← network I/O here  │
│  - check (setImmediate)     │
│  - close callbacks          │
└─────────────────────────────┘
```

When `await mongoose.find()` runs:
1. The call goes to libuv (OS async socket)
2. The call stack is freed (Node can handle other requests)
3. When MongoDB responds, the Promise resolves
4. The continuation (`const users = …`) runs in the next event loop tick

**Interview answer:** "Node.js doesn't wait for I/O. It registers a callback and moves on. This is why a single Node.js process can handle thousands of concurrent requests — it's not blocking on DB queries."

### Modules

**Code location:** Every `require()` / `module.exports` in `src/`

CommonJS (`require`) is used in this project for compatibility with Jest without ESM transform configuration. In a modern project you'd use ESM (`import/export`) with `"type": "module"` in `package.json`.

### process & Environment Variables

**Code location:** [`src/config/env.js`](../backend/src/config/env.js)

`process.env` is the Node.js global that holds environment variables. We validate all required vars at startup (fail-fast) rather than discovering a missing secret at runtime.

### Error Handling & process events

**Code location:** [`src/server.js`](../backend/src/server.js)

```js
process.on('unhandledRejection', (reason) => { process.exit(1); });
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
```

`SIGTERM` = Docker/Kubernetes termination signal.
`SIGINT` = Ctrl+C in terminal.

---

## Express.js

### Middleware Architecture

**Code location:** [`src/app.js`](../backend/src/app.js), [`src/middleware/`](../backend/src/middleware/)

Middleware is a function with signature `(req, res, next)`. Express chains them in registration order.

```
Request → Helmet → CORS → Logger → Body Parser → Rate Limiter
       → Route Match → authenticate → authorize → validate
       → Controller → Response
       OR
       → Error thrown → errorHandler → Response
```

**Key:** Every middleware MUST either call `next()`, call `next(err)`, or send a response. If it does none, the request hangs forever.

### Error Middleware (4-argument signature)

**Code location:** [`src/middleware/errorHandler.js`](../backend/src/middleware/errorHandler.js)

Express identifies error middleware by arity (`fn.length === 4`):
```js
function errorHandler(err, req, res, next) { ... }
```
It MUST be registered last. If registered before routes, it won't catch their errors.

### asyncHandler Pattern

**Code location:** [`src/utils/asyncHandler.js`](../backend/src/utils/asyncHandler.js)

Without asyncHandler:
```js
router.get('/users', async (req, res, next) => {
  try {
    const users = await UserService.getAll();
    res.json(users);
  } catch (err) {
    next(err);  // Must call next manually
  }
});
```

With asyncHandler:
```js
router.get('/users', asyncHandler(async (req, res) => {
  const users = await UserService.getAll();
  res.json(users);
  // Errors automatically forwarded to errorHandler
}));
```

### Router

**Code location:** [`src/routes/`](../backend/src/routes/)

`express.Router()` creates a mini-app with its own middleware stack. This allows modular routing — each domain (auth, questions, users) has its own file. `app.use('/api/questions', questionRoutes)` mounts the router.

---

## MongoDB

### Document Model

MongoDB stores data as BSON documents (binary JSON). Unlike relational tables, documents can embed arrays and nested objects. This allows fetching an entire entity in one query without joins.

**When to embed vs reference:**
- **Embed** when data is always read together, rarely changes independently, small size (e.g. a question's `answers[]` array)
- **Reference** when data is large, shared across documents, or changes independently (e.g. `createdBy` → User)

### Indexes

**Code location:** [`src/models/Question.js`](../backend/src/models/Question.js)

Without an index, MongoDB scans every document (O(n) collection scan).
With an index, MongoDB uses a B-tree to find documents in O(log n).

```js
QuestionSchema.index({ technology: 1 });
QuestionSchema.index({ category: 1, difficulty: 1 });  // compound
QuestionSchema.index({ tags: 1 });
```

**Compound index:** `{ category: 1, difficulty: 1 }` supports queries on:
- `category` alone (leftmost prefix rule)
- `category + difficulty` together
- But NOT `difficulty` alone

### Aggregation Pipeline

**Code location:** [`src/services/progress.service.js`](../backend/src/services/progress.service.js)

Used for `GET /api/progress/statistics`. Returns:
```json
{
  "totalQuestions": 50,
  "completedQuestions": 12,
  "averageScore": 73,
  "questionsByDifficulty": { "EASY": 5, "MEDIUM": 5, "HARD": 2 },
  "questionsByTechnology": { "Node.js": 4, "Angular": 3 }
}
```

Pipeline stages used: `$match`, `$group`, `$lookup`, `$project`, `$sort`, `$limit`

### Pagination (skip/limit vs cursor)

For this platform, `skip/limit` is acceptable (questions dataset < 10k).
For social feeds with millions of documents, use cursor-based pagination:
```js
// Instead of .skip(page * limit)
.find({ _id: { $gt: lastSeenId } }).limit(20)
```
Reason: MongoDB internally scans and discards skipped documents. `skip(10000)` scans 10,000 docs and throws them away.

---

## Mongoose

### Schema & Model

**Code location:** [`src/models/`](../backend/src/models/)

Schema = shape definition with validation rules.
Model = compiled constructor that maps to a MongoDB collection.

```js
const UserSchema = new Schema({ email: { type: String, required: true, unique: true } });
const User = mongoose.model('User', UserSchema);  // → 'users' collection
```

### select: false (password exclusion)

```js
passwordHash: { type: String, select: false }
```

`select: false` means the field is NEVER included in query results unless explicitly requested with `.select('+passwordHash')`. This prevents accidentally leaking password hashes in API responses.

### populate() vs aggregation

**populate():**
- Mongoose feature, not native MongoDB
- Issues a SECOND query to fetch the referenced documents
- Good for: simple references, small datasets, dev convenience
- Bad for: filtered/aggregated reference data

**aggregation ($lookup):**
- Native MongoDB, single pipeline
- Can filter, group, project on the joined data in one round-trip
- Required for: statistics, complex joins, large datasets

**Rule of thumb:** Use `populate()` for "get me this document with its related user". Use `$lookup` when you need to filter, group, or aggregate across the joined collection.

### lean()

`.lean()` returns plain JS objects instead of Mongoose Documents. This:
- Removes Mongoose overhead (~2-3x faster for reads)
- Cannot call `.save()`, virtuals don't attach
- Use it for read-only API responses where you don't need Mongoose features

---

## Authentication & Security

### bcrypt

**Code location:** [`src/utils/password.js`](../backend/src/utils/password.js)

bcrypt is a one-way adaptive hash function.
- **One-way:** Cannot reverse the hash to get the password
- **Adaptive:** Cost factor (salt rounds) can be increased as hardware improves
- **Built-in salt:** Each hash includes a random salt, preventing rainbow table attacks

```
bcrypt("password123", 12) = "$2b$12$..." (different every call due to salt)
```

Never encrypt passwords (two-way). If your encryption key is stolen, all passwords are compromised.

### JWT Authentication vs Authorization

**Code location:** [`src/middleware/authenticate.js`](../backend/src/middleware/authenticate.js), [`src/middleware/authorize.js`](../backend/src/middleware/authorize.js)

**Authentication** = "Who are you?" → validates the JWT signature and expiry
**Authorization** = "What can you do?" → checks if the authenticated user has the required role

```js
// Authentication: verifies token, attaches user to req
router.get('/profile', authenticate, getProfile);

// Authorization: checks role AFTER authentication
router.delete('/users/:id', authenticate, authorize('ADMIN'), deleteUser);
```

### JWT Token Strategy

```
Access Token:
  - Signed with JWT_ACCESS_SECRET
  - Expires in 15 minutes
  - Stored in memory (Angular signal) — NOT localStorage
  - Sent as Authorization: Bearer <token>

Refresh Token:
  - Signed with JWT_REFRESH_SECRET
  - Expires in 7 days
  - Stored in httpOnly, Secure, SameSite=Strict cookie
  - Never accessible to JavaScript (XSS-proof)
  - Rotated on every use
```

### Refresh Token Rotation

On `POST /api/auth/refresh`:
1. Extract refresh token from httpOnly cookie
2. Verify JWT signature and expiry
3. Look up token in DB (detect reuse)
4. Issue NEW access token + NEW refresh token
5. Invalidate old refresh token
6. If old token is replayed: revoke ALL tokens for that user (breach detected)

---

## Docker

### Why containers?

"Works on my machine" → runs the same in dev, staging, and production.
Docker packages the app + runtime + dependencies into a portable image.

### Image vs Container

- **Image:** Read-only blueprint (like a class)
- **Container:** Running instance of an image (like an object)

### Multi-stage Build (Frontend)

**Code location:** [`frontend/Dockerfile`](../frontend/Dockerfile)

```dockerfile
# Stage 1: build (Node.js, ~1 GB)
FROM node:20-alpine AS builder
RUN npm ci && npm run build

# Stage 2: runtime (Nginx, ~25 MB)
FROM nginx:1.27-alpine
COPY --from=builder /app/dist ...
```

Final image contains only the Nginx + compiled JS. No source code, no compiler, no npm.

### Service Discovery (why not localhost)

Inside Docker Compose, each service runs in its own container. `localhost` inside the backend container refers to that container, not MongoDB.

Docker Compose creates a bridge network. Services find each other by **service name**:
```
MONGODB_URI=mongodb://mongodb:27017/interviewhub
                       ^^^^^^^^
                  service name in docker-compose.yml
```

### Volumes

```yaml
volumes:
  mongodb_data:
```

Named volumes persist data on the Docker host across container restarts. Without a volume, `docker compose down` destroys all MongoDB data.

### Graceful Shutdown with Docker

`docker compose down` sends `SIGTERM` to containers.
Our server.js handler:
1. Calls `server.close()` — stops accepting new connections
2. Awaits in-flight requests
3. Calls `mongoose.connection.close()`
4. `process.exit(0)`

Without this, Docker kills the process after 10s with SIGKILL (possible mid-write data corruption).

---

## Angular 21

### Standalone Components

No NgModule required. Each component declares its own imports:
```ts
@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule],
})
```

### Signals

**Code location:** [`src/app/core/auth/auth.store.ts`](../frontend/src/app/core/auth/auth.store.ts)

Signals replace manual BehaviorSubject boilerplate:
```ts
// Old way (RxJS)
private _user = new BehaviorSubject<User | null>(null);
user$ = this._user.asObservable();

// New way (Signals)
user = signal<User | null>(null);
isAuthenticated = computed(() => this.user() !== null);
```

Signals are synchronous, fine-grained, and tracked automatically by the template. No subscription management, no `async` pipe needed.

`computed()` = derived read-only signal, recalculates only when dependencies change.
`effect()` = runs side effects when signals change (use sparingly — prefer computed).

### Functional Guards

```ts
export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  return authStore.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
```

No class, no `@Injectable`. Pure function using `inject()`.

### Functional Interceptors

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).accessToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401) { /* attempt refresh */ }
      return throwError(() => err);
    })
  );
};
```

### Lazy Loading

```ts
export const routes: Routes = [
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component') },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin.component') },
];
```

Angular bundles each lazy route into a separate JS chunk. The admin chunk is only downloaded if the user visits `/admin`. Reduces initial bundle size.

---

## 50 Interview Questions with Answers

### Node.js

**1. What is the Node.js event loop?**
The event loop is a loop that picks up callbacks from the queue and executes them on the single thread. It processes phases in order: timers → I/O callbacks → idle → poll → check → close. Non-blocking I/O (like MongoDB queries) is delegated to libuv's thread pool. When complete, the callback is placed in the event queue. The main thread never blocks.

**2. Why is Node.js good for I/O-heavy applications?**
Because it doesn't block waiting for I/O. A Node.js server handling 10,000 requests that each wait for a DB query doesn't need 10,000 threads. Libuv manages those waits asynchronously. CPU-heavy tasks (image processing, crypto) should be offloaded to worker threads.

**3. What is the difference between process.exit() and throwing an error?**
`process.exit()` immediately terminates without giving event loop handlers a chance to run. Uncaught errors trigger `unhandledRejection` / `uncaughtException` events. In our server.js, we call `process.exit(1)` inside the graceful shutdown timeout to force exit if connections don't close within 10 seconds.

**4. What are streams?**
Streams are EventEmitter-based interfaces for reading/writing data in chunks. Types: Readable, Writable, Duplex, Transform. They avoid loading entire payloads into memory. HTTP req/res are streams. Useful for file uploads, large data exports.

**5. What is CommonJS vs ESM?**
CommonJS: `require()` / `module.exports` — synchronous, dynamic, Node.js default. ESM: `import/export` — static analysis, tree-shakeable, browser-compatible. In 2024, prefer ESM. Jest has historically had better CJS support, hence CJS in this project.

---

### Express.js

**6. What is Express middleware?**
A function `(req, res, next)` that has access to the request, response, and the next middleware in the chain. It can modify req/res, end the request, or call `next()` to pass control forward. Middleware executes in registration order.

**7. What happens when a request reaches Express?**
1. Express matches the HTTP method + path against registered routes
2. Middleware functions execute in order (global → route-specific)
3. The route handler sends a response
4. If any middleware calls `next(err)`, Express skips to the first 4-argument error middleware

**8. Why must errorHandler be registered last?**
Express executes middleware in registration order. If errorHandler is before routes, errors from those routes never reach it. The 4-argument signature signals to Express "this handles errors", but only if it's downstream from the error source.

**9. What does asyncHandler do and why is it needed?**
Express doesn't natively handle Promise rejections from async route handlers. Without asyncHandler, an `await` failure crashes silently (unhandledRejection). asyncHandler wraps the async fn: `Promise.resolve(fn()).catch(next)`, forwarding any rejection to Express's error chain.

**10. How does rate limiting work?**
express-rate-limit counts requests per IP in a sliding window. When the count exceeds the limit, it responds with 429 Too Many Requests. The default in-memory store works for single instances. For distributed systems, use Redis to share counts across instances.

**11. How does CORS work?**
Browsers enforce Same-Origin Policy: JS can only fetch from the same origin. CORS allows servers to opt-in to cross-origin requests by sending `Access-Control-Allow-Origin` headers. Preflight OPTIONS requests check permissions before the actual request. `credentials: true` is required for cookies (refresh tokens).

**12. What is Helmet?**
Helmet sets security-related HTTP headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, etc. It doesn't prevent all attacks but removes several low-hanging-fruit vulnerabilities.

---

### MongoDB

**13. How does MongoDB indexing improve performance?**
Without an index, MongoDB does a collection scan (reads every document). An index is a B-tree sorted on a field. MongoDB can binary-search the index to find matching documents in O(log n) instead of O(n).

**14. What is a compound index?**
An index on multiple fields: `{ category: 1, difficulty: 1 }`. Supports queries on `category` alone or `category + difficulty`. Due to the "leftmost prefix rule", it does NOT support queries on `difficulty` alone. The order matters.

**15. What is a unique index?**
Tells MongoDB to reject duplicate values. `email: { unique: true }` prevents two users with the same email. The compound unique index on `{ user, question }` in Bookmark prevents double-bookmarking.

**16. When would you use aggregation instead of populate()?**
When you need to filter, count, group, or transform the referenced data. `populate()` fetches all referenced documents and does the filtering in Node.js memory. An aggregation `$lookup` + `$match` filters in MongoDB before sending data over the wire — far more efficient at scale.

**17. What is an aggregation pipeline?**
A series of transformation stages applied to documents in sequence: `$match` (filter) → `$group` (aggregate) → `$project` (reshape) → `$sort` → `$limit`. Each stage's output is the next stage's input. Used in our statistics endpoint.

**18. How would you prevent NoSQL injection?**
Mongoose schemas type-cast inputs. If a field expects a `String`, `{ "$gt": "" }` is cast to the literal string `"$gt"` — the operator is neutralised. Additionally, avoid passing raw `req.body` directly as a query filter without explicit field extraction.

**19. What are MongoDB transactions?**
Transactions provide ACID guarantees across multiple documents/collections. MongoDB added multi-document transactions in 4.0 (replica set required). Use when you need atomicity: e.g., creating a MockInterview and updating Progress in one atomic operation. In single-document operations (updating one document), MongoDB is already atomic.

**20. How does MongoDB handle large datasets (10M+ documents)?**
- Shard the collection (horizontal partitioning by shard key)
- Use appropriate indexes (covered queries)
- Use projections to return only needed fields
- Use aggregation pipelines server-side instead of fetching to Node
- Use cursor streaming instead of loading all results into memory

---

### Mongoose

**21. Why use Mongoose instead of the raw MongoDB driver?**
Mongoose adds: schema validation, type casting, middleware hooks (pre/post save), virtuals, instance methods, static methods, and a higher-level query API. The raw driver is more flexible but requires manual validation everywhere.

**22. What does populate() do?**
Mongoose's populate() issues a second query to replace a reference ObjectId with the actual document. `Question.findById(id).populate('createdBy', 'name email')` fetches the Question, then separately fetches the User whose `_id` matches `createdBy`, replacing the ObjectId with the User document.

**23. What is lean() and when should you use it?**
`.lean()` returns plain JS objects instead of Mongoose Document instances. ~2-3x faster. No Mongoose overhead, no `.save()`, no virtuals. Use it for read-only API responses. Don't use it when you need to call `.save()` or use Mongoose middleware.

**24. What are Mongoose virtuals?**
Fields computed from other fields that don't get stored in MongoDB. Example: `fullName` computed from `firstName + lastName`. Also used for virtual populate (reverse population). Added with `schema.virtual('fullName').get(fn)`.

**25. What are Mongoose middleware/hooks?**
Pre/post hooks on schema operations. Example: `UserSchema.pre('save', async function() { this.passwordHash = await bcrypt.hash(this.passwordHash, 12); })`. Our project uses a pre-save hook to hash passwords. `pre('find')` could automatically add `isActive: true` filters.

**26. What is select: false?**
Excludes a field from all query results by default. `passwordHash: { type: String, select: false }` means no query returns `passwordHash` unless you explicitly add `.select('+passwordHash')`. Prevents accidental password hash exposure.

**27. What is the difference between save() and updateOne()?**
`save()` fetches the document, applies changes in Node.js, validates, then writes the full document. `updateOne()` sends a targeted update directly to MongoDB. For performance-critical updates (incrementing counters), prefer `updateOne()` to avoid the fetch round-trip and the full document write.

---

### Authentication & Security

**28. Why hash passwords instead of encrypting them?**
Hashing is one-way. Even if the database is breached, hashes cannot be reversed to reveal passwords. Encryption is two-way — if the key is stolen, all passwords are decrypted instantly. For passwords, you only need to verify "does this input match?" — you never need to recover the original value.

**29. Why use bcrypt specifically?**
bcrypt is intentionally slow (adaptive cost factor). This makes brute-force attacks computationally expensive: with rounds=12, testing one password takes ~250ms. An attacker testing 1 billion passwords would take 8 years. Unlike MD5/SHA-256 (fast, designed for checksums), bcrypt is designed for passwords.

**30. What is the difference between authentication and authorization?**
Authentication: "Who are you?" — verifying identity via credentials/token.
Authorization: "What can you do?" — checking if the authenticated identity has permission.
In this project: `authenticate` middleware verifies the JWT. `authorize('ADMIN')` checks the role in the decoded token.

**31. Where should JWT tokens be stored?**
Access token: in memory (Angular signal/variable). NOT in localStorage (vulnerable to XSS).
Refresh token: in an httpOnly, Secure, SameSite=Strict cookie. JavaScript cannot read httpOnly cookies, making them XSS-proof. SameSite=Strict prevents CSRF.

**32. Why use refresh tokens?**
Short-lived access tokens (15 min) limit the damage if stolen. But asking users to log in every 15 minutes is bad UX. Refresh tokens allow silent re-authentication. The access token lives in memory and is lost on page refresh/close — the refresh token in the cookie re-issues it silently.

**33. What is refresh token rotation?**
Every time a refresh token is used, it's replaced with a new one and the old is invalidated. If an attacker steals a refresh token and uses it, the legitimate user's next use of their (now-invalid) refresh token is detected as reuse → all tokens for that user are revoked.

**34. How would you implement logout?**
1. Clear the httpOnly cookie server-side (Set-Cookie with empty value/expired date)
2. Invalidate the refresh token in the database (mark as used/revoked)
3. On the client, clear the access token from memory (the signal)
The access token is short-lived so it expires naturally in 15 min even if the client doesn't clear it.

**35. How would you prevent privilege escalation?**
The `authorize()` middleware checks the role from the JWT payload on EVERY protected endpoint. The role is embedded in the token at login time. Even if a user modifies their client-side state to show "ADMIN", the token's role is verified server-side on every request.

**36. How does the authenticate middleware work?**
1. Extracts the Bearer token from `Authorization` header
2. Calls `jwt.verify(token, JWT_ACCESS_SECRET)` — verifies signature + expiry
3. If valid: attaches `{ userId, role }` to `req.user` and calls `next()`
4. If invalid/expired: throws `ApiError.unauthorized()` → errorHandler → 401

---

### Docker

**37. Why use Docker Compose?**
Orchestrates multiple containers (MongoDB, backend, frontend) as a single application. Defines the network topology, environment variables, volume mounts, health checks, and startup order. One command (`docker compose up --build`) starts the entire stack.

**38. Why can't the backend use localhost to connect to MongoDB in Docker?**
Each Docker container has its own network namespace. `localhost` inside the backend container refers to that container's loopback interface — MongoDB is not there. Docker Compose creates a bridge network where services are reachable by their service name. `mongodb://mongodb:27017` uses the "mongodb" service name, which Docker DNS resolves to the MongoDB container's IP.

**39. What is a multi-stage Docker build?**
Multiple `FROM` stages in one Dockerfile. Each stage can copy artefacts from previous stages. For Angular: Stage 1 (Node.js builder) compiles the app. Stage 2 (Nginx runtime) copies only the compiled `/dist`. The final image has no Node.js, npm, or source code — just Nginx + static files. Reduces attack surface and image size from ~1 GB to ~25 MB.

**40. What is a Docker volume?**
A persistent storage mechanism that survives container restarts. `mongodb_data:/data/db` mounts a named volume at MongoDB's data directory. Without it, `docker compose down` destroys all data. Volumes are managed by Docker and stored on the host filesystem.

**41. How does Docker service discovery work?**
Docker Compose creates a DNS server on the bridge network. Container names and service names are registered as DNS entries. When the backend runs `mongodb://mongodb:27017`, Docker resolves "mongodb" to the MongoDB container's IP address within the network.

**42. What is a healthcheck in Docker Compose?**
A command that Docker runs periodically to test if a service is ready. `condition: service_healthy` in `depends_on` waits for MongoDB's healthcheck to pass before starting the backend. Without it, the backend starts immediately and may fail to connect if MongoDB isn't ready yet.

---

### Angular 21

**43. What are Angular Signals?**
Signals are reactive primitives: wrappers around values that notify consumers when they change. `signal(0)` creates a writable signal. `computed()` creates a derived signal. `effect()` runs side-effects. Unlike RxJS, signals are synchronous, need no subscription management, and are automatically tracked by templates.

**44. Signals vs RxJS – when to use each?**
Signals: component state, UI reactivity, derived values, synchronous transformations.
RxJS: async streams (HTTP, WebSocket), complex time-based operations (debounce, merge, switchMap), multi-subscriber event buses.
In Angular 21, Signals are preferred for state. RxJS is still preferred for HTTP (HttpClient returns Observables).

**45. Why use standalone components?**
No NgModule needed. Each component declares its own imports. This enables:
- Better tree-shaking (unused imports aren't bundled)
- Simpler mental model (no "which module provides this?")
- Lazy loading at the component level (not just module level)
- Better compatibility with Signals-based architecture

**46. How does Angular lazy loading improve performance?**
The router splits routes into separate JS chunks at build time. The chunk for `/admin` is only downloaded when a user navigates to `/admin`. For users who never visit admin, that code is never downloaded. Reduces Time To Interactive for initial page load.

**47. How does an Angular HTTP interceptor work?**
Interceptors sit in the HTTP pipeline between the component making the request and the server. A functional interceptor `(req, next) => Observable<HttpEvent>` can:
- Clone and modify the request (add auth headers)
- Handle the response (catch 401, attempt token refresh)
- Retry requests
`next(req)` passes the modified request down the chain.

**48. What are functional guards in Angular?**
Route guards implemented as plain functions instead of classes. They use `inject()` to access services. `CanActivateFn = (route, state) => boolean | UrlTree | Observable | Promise`. Simpler than class-based guards — no `@Injectable`, no interface to implement.

**49. How does token refresh work in the Angular interceptor?**
When the API returns 401:
1. The interceptor catches the error
2. Calls `AuthService.refresh()` → `POST /api/auth/refresh` (cookie sent automatically)
3. If refresh succeeds: update the access token signal, retry the original request with the new token
4. If refresh fails: call `AuthService.logout()`, navigate to `/login`
Use `switchMap` to chain the refresh and retry. Add a `filter` to prevent refresh loops on the `/auth/refresh` call itself.

**50. How would you scale this application to handle 10,000 concurrent users?**

**Horizontal scaling (Node.js):**
- Run multiple backend containers behind a load balancer (Nginx/AWS ALB)
- Node.js is stateless (JWT auth, not session-based) → no sticky sessions needed
- Use Redis for rate-limit counters shared across instances

**Database scaling:**
- MongoDB replica set for read scaling and high availability
- Add read replicas; route read queries to replicas
- Shard for write scaling at very high volumes
- Add compound indexes based on query patterns

**Caching:**
- Redis cache for frequently read data (question list, user profiles)
- Cache-aside pattern: check Redis first, fall back to MongoDB, populate cache
- Set TTL based on how fresh the data needs to be

**Frontend:**
- CDN for static assets (Angular bundle, images)
- Angular Service Worker for offline caching

**Observability:**
- Distributed tracing (correlation IDs already implemented)
- Centralized logging (ELK/Datadog)
- APM for identifying bottlenecks
