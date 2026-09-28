
# Authentication Flow
```
                    AUTHENTICATION
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
   ACCESS TOKEN                       REFRESH TOKEN
        │                                  │
     JWT                              Opaque random
        │                                  │
   15 minutes                         7 days
        │                                  │
   Client memory                     HttpOnly Cookie
        │                                  │
   HS256 + iss/aud                    Secure
        │                             SameSite=Strict
        │                             Path=/api/auth
        │                                  │
        │                             SHA-256 hash
        │                                  │
        │                              MongoDB
        │                                  │
        │                      ┌───────────┼───────────┐
        │                      │           │           │
        │                  Rotation     Reuse       Revocation
        │                      │           │           │
        │                  sessionId   familyId    revokeAll
        │
        └─────────────── Authorization
                              │
                         authenticate
                              │
                         authorize(role)
```

The data flow is now exactly the shape described:
```
env.js (startup)
  │
  ├── parseDuration('15m') → ACCESS_TOKEN_EXPIRES_MS  = 900_000
  └── parseDuration('7d')  → REFRESH_TOKEN_EXPIRES_MS = 604_800_000
                                    │
                    ┌───────────────┼────────────────────┐
                    ▼               ▼                    ▼
             cookies.js       auth.service.js       (future callers)
             maxAge           new Date(now + ms)
```