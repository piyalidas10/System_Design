# Security

## Security Architecture

### Authentication
- JWT access tokens (15 min expiry) — short lifetime limits stolen-token damage
- Refresh tokens (7 days) in httpOnly, Secure, SameSite=Strict cookies
- Refresh token rotation — detects token reuse (stolen tokens)
- bcrypt (rounds=12) — adaptive, one-way, salted password hashing

### Transport
- HTTPS in production (Nginx TLS termination)
- HSTS header (Helmet)
- Secure cookie flag in production

### API Security
- Helmet — sets 15+ security headers (CSP, X-Frame-Options, etc.)
- CORS — explicit allowlist, credentials mode
- express-rate-limit — 100 req/15min general, 10 req/15min on /auth
- Input validation — Mongoose schema typing + request validators
- JSON size limit — `express.json({ limit: '10kb' })` prevents JSON bomb

### Authorization
- Role-based access control (RBAC) — USER and ADMIN roles
- `authorize('ADMIN')` middleware on every admin route
- Role stored in JWT, verified server-side on every request
- `passwordHash` excluded via `select: false` — never in API responses

### MongoDB Safety
- Mongoose schema type casting neutralises NoSQL operator injection
- Explicit field selection in repositories (no unbounded `find({})`)
- No raw user input passed directly as query objects

### Secrets Management
- All secrets in `.env` (excluded from git)
- `.env.example` template in git (no real values)
- Runtime validation (`config/env.js`) — fails fast on missing secrets
- Never log Authorization headers, cookies, or passwords

## Threat Model

| Threat | Mitigation |
|---|---|
| Brute-force login | authLimiter (10 req/15min), bcrypt (slow hash) |
| Password breach | One-way bcrypt hash, cannot reverse |
| XSS token theft | Access token in memory, refresh in httpOnly cookie |
| CSRF | SameSite=Strict cookie, custom header |
| Privilege escalation | Server-side role check on every protected route |
| NoSQL injection | Mongoose type casting, no raw req.body in queries |
| Information disclosure | `select: false` on passwordHash, no stack traces in prod |
| DDoS | Rate limiting, JSON size limits |
| Man-in-the-middle | HTTPS + HSTS in production |
| Container escape | Non-root user in Docker images |
