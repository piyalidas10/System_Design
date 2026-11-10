# Cookie Authentication, CORS & 401 Unauthorized Troubleshooting

## Problem Statement

> **Scenario:**
> 1. Angular / React / Vue frontend sends login credentials: `POST /auth/login` &rarr; `200 OK`.
> 2. Backend sets authentication cookie via response header: `Set-Cookie: refresh_token=...`.
> 3. Next API request is made: `GET /users/profile` &rarr; **`401 Unauthorized`**.
> 4. Inspection shows: **The cookie was never sent by the browser.**

When the server successfully sets a cookie upon login, but the browser fails to include that cookie in subsequent requests (resulting in `401 Unauthorized`), the application is encountering a **CORS (Cross-Origin Resource Sharing) credential barrier** or **cookie policy restriction**.

By default, modern browsers block cookies from being stored or sent on cross-origin requests unless both the frontend and backend explicitly agree to share credentials.

---

## Architecture Flow: Where the Request Breaks

```
+---------------------------------------------------------------------------------------------------+
|                                      LOGIN FLOW (Step 1 & 2)                                      |
+---------------------------------------------------------------------------------------------------+
  Angular (http://localhost:4200)                         Backend (http://localhost:8000)
        |                                                              |
        |  1. POST /auth/login (credentials: true)                     |
        |------------------------------------------------------------->|
        |                                                              |
        |  2. 200 OK + Set-Cookie: refresh_token=abc123; HttpOnly;...  |
        |<-------------------------------------------------------------|
        v
[Browser checks CORS & Cookie Attributes -> Cookie Stored in Jar]

+---------------------------------------------------------------------------------------------------+
|                                  SUBSEQUENT REQUEST (Step 3)                                      |
+---------------------------------------------------------------------------------------------------+
  Angular (http://localhost:4200)                         Backend (http://localhost:8000)
        |                                                              |
        |  3. GET /users/profile                                       |
        |     [FAIL POINT]: Cookie header is omitted by browser!       |
        |------------------------------------------------------------->|
        |                                                              |
        |  4. 401 Unauthorized (Refresh token missing)                 |
        |<-------------------------------------------------------------|
```

---

## 1. The 2-Step Credential Handshake

To allow cookies over cross-origin requests, **both** the client and the server must explicitly enable credentialed requests.

```
       Frontend Request                         Backend Response
+-------------------------------+       +------------------------------------+
|  withCredentials: true        | <===> |  Access-Control-Allow-Credentials: |
|  (or credentials: 'include')  |       |    true                            |
|                               |       |  Access-Control-Allow-Origin:      |
|                               |       |    http://localhost:4200 (exact)   |
+-------------------------------+       +------------------------------------+
```

### Step 1: Frontend Enables Credentials

- **Fetch API:**
  ```javascript
  fetch('http://localhost:8000/users/profile', {
    method: 'GET',
    credentials: 'include' // Crucial
  });
  ```

- **Axios:**
  ```javascript
  axios.get('http://localhost:8000/users/profile', {
    withCredentials: true // Crucial
  });
  ```

- **Angular (`HttpClient`):**
  ```typescript
  this.http.get('http://localhost:8000/users/profile', {
    withCredentials: true // Crucial
  });
  ```

### Step 2: Backend Matches Security Headers

If the client sends credentials, the API server must respond with matching CORS headers:

1. **`Access-Control-Allow-Credentials: true`** must be present on the response.
2. **`Access-Control-Allow-Origin` cannot be wildcard `*`**. It must match the exact requesting origin (e.g., `http://localhost:4200` or `https://app.example.com`).

---

## 2. Origin vs Site: Critical Distinction

Understanding the difference between **Origin** and **Site** prevents misconfiguration of cookie attributes:

| Scenario | Frontend | Backend | Different Origin? | Different Site? |
| :--- | :--- | :--- | :---: | :---: |
| **Localhost Ports** | `http://localhost:4200` | `http://localhost:8000` | **Yes** | **No** (Same-Site) |
| **Subdomains** | `https://app.example.com` | `https://api.example.com` | **Yes** | **No** (Same-Site) |
| **Separate Domains** | `https://app.example.com` | `https://api.otherdomain.com` | **Yes** | **Yes** (Cross-Site) |

- **Origin:** Scheme (`http`/`https`) + Hostname (`example.com`) + Port (`4200`/`8000`).
- **Site:** Scheme + Registrable Domain (e.g., `.example.com` / `localhost`).

> **Key Takeaway:** `http://localhost:4200` and `http://localhost:8000` are **cross-origin** (different ports), but **same-site**. Therefore, `SameSite=None` is **not** automatically required for local development. `SameSite=Lax` works on localhost.

---

## 3. Frontend Implementation: Angular 19

### A. Service-Level `withCredentials`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8000';

  login(payload: LoginRequest): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/auth/login`,
      payload,
      { withCredentials: true }
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/users/profile`,
      { withCredentials: true }
    );
  }
}
```

### B. Functional Interceptor (Recommended Approach)

Avoid repeating `{ withCredentials: true }` in every HTTP call by utilizing an Angular Functional Interceptor:

```typescript
// src/app/core/interceptors/credentials.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const apiRequest = req.clone({
    withCredentials: true
  });
  return next(apiRequest);
};
```

### C. Registering Interceptor in Angular 19 (`app.config.ts`)

```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(
      withInterceptors([
        credentialsInterceptor
      ])
    )
  ]
};
```

---

## 4. Backend Implementation: Node.js & Express

### A. Dependencies

```bash
npm install express cors cookie-parser jsonwebtoken
```

### B. Complete Express Server with CORS & Cookie Handling

```javascript
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 8000;

// Body parser & Cookie parser
app.use(express.json());
app.use(cookieParser());

// CORS configuration for credential sharing
const corsOptions = {
  origin: 'http://localhost:4200', // Explicit origin (NO wildcard '*')
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true // Allow Access-Control-Allow-Credentials
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------

// 1. Login Endpoint - Sets HttpOnly Refresh Token Cookie
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  // In production: Verify user credentials from database
  const refreshToken = 'sample-secure-refresh-token-uuid-or-jwt';

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,                                // Prevents XSS access via document.cookie
    secure: isProduction,                          // HTTPS only in prod; false for local HTTP
    sameSite: isProduction ? 'lax' : 'lax',        // 'lax' for same-site localhost/subdomain, 'none' for cross-domain
    path: '/',                                     // Available across all API routes
    maxAge: 7 * 24 * 60 * 60 * 1000                // 7 days in milliseconds
  });

  return res.status(200).json({
    message: 'Login successful',
    user: { id: 101, username: username || 'testuser' }
  });
});

// 2. Protected Route - Reads & Validates Cookie
app.get('/users/profile', (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({
      message: 'Unauthorized: refresh_token cookie missing'
    });
  }

  // In production: Validate token in DB/Redis session store
  if (refreshToken !== 'sample-secure-refresh-token-uuid-or-jwt') {
    return res.status(401).json({
      message: 'Unauthorized: Invalid or expired token'
    });
  }

  return res.status(200).json({
    message: 'Profile fetched successfully',
    user: { id: 101, name: 'Enterprise Banking User', role: 'Admin' }
  });
});

// 3. Logout Endpoint - Clears Cookie
app.post('/auth/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'lax',
    path: '/'
  });

  return res.status(200).json({
    message: 'Logout successful'
  });
});

app.listen(PORT, () => {
  console.log(`Node.js API running on http://localhost:${PORT}`);
});
```

### Preflight & Request/Response Lifecycle

```text
A. Browser Preflight (OPTIONS):
   OPTIONS /auth/login HTTP/1.1
   Host: localhost:8000
   Origin: http://localhost:4200
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: content-type

B. Node.js Preflight Response:
   HTTP/1.1 204 No Content
   Access-Control-Allow-Origin: http://localhost:4200
   Access-Control-Allow-Credentials: true
   Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
   Access-Control-Allow-Headers: Content-Type,Authorization,X-CSRF-Token

C. Browser POST /auth/login:
   POST /auth/login HTTP/1.1
   Origin: http://localhost:4200
   Content-Type: application/json
   {"username":"admin","password":"password123"}

D. Node.js Login Response:
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: http://localhost:4200
   Access-Control-Allow-Credentials: true
   Set-Cookie: refresh_token=abc123; HttpOnly; Path=/; SameSite=Lax

E. Subsequent API Request (Cookie attached automatically):
   GET /users/profile HTTP/1.1
   Host: localhost:8000
   Origin: http://localhost:4200
   Cookie: refresh_token=abc123
```

---

## 5. Backend Implementation: FastAPI (Python)

```python
from fastapi import FastAPI, Response, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 1. CORS Configuration
origins = [
    "http://localhost:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Exact origins only
    allow_credentials=True,      # Access-Control-Allow-Credentials: true
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Login Endpoint
@app.post("/auth/login")
def login(response: Response):
    refresh_token = "sample-refresh-token-xyz"

    # Set Cookie with appropriate attributes
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,           # Set True in Production over HTTPS
        samesite="lax",         # "lax" for localhost / same-site; "none" for cross-site
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    return {"message": "Login successful"}

# 3. Protected Endpoint
@app.get("/users/profile")
def get_profile(request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing"
        )
    return {"message": "Profile fetched successfully", "user": {"id": 101, "name": "Test User"}}
```

---

## 6. Cookie Attributes Deep Dive

| Attribute | Value | Explanation |
| :--- | :--- | :--- |
| `HttpOnly` | `true` | Prevents client-side scripts (`document.cookie`) from accessing the cookie, mitigating XSS token theft. |
| `Secure` | `true` (prod) / `false` (dev) | Ensures cookie is only transmitted over encrypted connections (HTTPS). Localhost is usually exempt in modern browsers. |
| `SameSite` | `Lax` \| `Strict` \| `None` | Controls whether cookies are sent on cross-site requests. |
| `Path` | `/` | Defines the URL path prefix. If set to `/auth`, the cookie will **not** be sent to `/users/profile`. |
| `Domain` | Omitted / `.example.com` | When omitted, cookie is host-only. Set to `.example.com` to share between `app.example.com` and `api.example.com`. |
| `maxAge` | In milliseconds (Node) / seconds (FastAPI) | Determines cookie TTL. |

### SameSite Deployment Matrix

| Deployment Scenario | Frontend | Backend | SameSite Setting | Secure Required? |
| :--- | :--- | :--- | :---: | :---: |
| **Local Development** | `http://localhost:4200` | `http://localhost:8000` | `SameSite=Lax` | `false` |
| **Production (Subdomains)** | `https://app.example.com` | `https://api.example.com` | `SameSite=Lax` | `true` (HTTPS) |
| **Production (Cross-Site)** | `https://app.myfrontend.com` | `https://api.mybackend.com` | `SameSite=None` | `true` (Mandatory) |

> ⚠️ **Notice on `SameSite=None; Secure`:** Third-party cookie deprecation in modern browsers (Safari ITP, Chrome Privacy Sandbox) may block cross-site cookies altogether. For production systems, hosting under a shared registrable domain (e.g., `*.company.com`) or utilizing an API Gateway / Reverse Proxy is strongly advised.

---

## 7. Step-by-Step Chrome DevTools Debugging Guide

Follow this systematic checklist to locate the exact breakdown point:

```
[Open DevTools (F12)]
       |
       +--> 1. Application Tab -> Storage -> Cookies
       |      - Is `refresh_token` stored?
       |      - Check: Value, Domain, Path, Expires, HttpOnly, Secure, SameSite.
       |
       +--> 2. Network Tab -> Login Request (`/auth/login`) -> Response Headers
       |      - Is `Set-Cookie` header present?
       |      - Is there a yellow warning icon next to `Set-Cookie`? (Hover to see browser rejection reason).
       |      - Is `Access-Control-Allow-Credentials: true` present?
       |      - Is `Access-Control-Allow-Origin` set to the exact frontend origin (NOT `*`)?
       |
       +--> 3. Network Tab -> Subsequent Request (`/users/profile`) -> Request Headers
              - Is the `Cookie:` header present in the request?
              - Check the "Cookies" sub-tab in Network request details to see filtered/blocked cookies.
```

### Diagnostic Decision Table

| Observation in DevTools | Root Cause | Actionable Fix |
| :--- | :--- | :--- |
| **Cookie not stored in Application tab** | Browser rejected `Set-Cookie` header. | Check DevTools warning on `Set-Cookie`: `Secure` missing on HTTPS, `SameSite=None` without `Secure`, or domain mismatch. |
| **Cookie stored, but NOT sent on next request** | Missing credentials flag or Path/SameSite mismatch. | 1. Ensure Angular has `withCredentials: true`.<br>2. Ensure `Path=/`.<br>3. Check if cross-site requires `SameSite=None; Secure`. |
| **Browser blocks response with CORS error** | CORS header mismatch. | 1. Set `Access-Control-Allow-Credentials: true` on server.<br>2. Replace `Access-Control-Allow-Origin: *` with exact origin (`http://localhost:4200`). |
| **Cookie sent, but server returns 401** | Backend token verification failure. | 1. Ensure `cookieParser()` is loaded before routes.<br>2. Verify token signature, expiry, or session store lookup. |

---

## 8. Common CORS & Cookie Antipatterns

| Antipattern | Why it Fails | Correct Solution |
| :--- | :--- | :--- |
| `Access-Control-Allow-Origin: *` with credentials | Browsers reject wildcard origin when `credentials: true`. | Specify explicit origin: `origin: "http://localhost:4200"` |
| `credentials: false` in CORS config | Browser will refuse to pass response cookies to application. | Set `credentials: true` in CORS config. |
| Forgetting `withCredentials` in Angular | Browser strips cookie from outgoing request. | Use an HTTP Interceptor with `req.clone({ withCredentials: true })`. |
| Placing CORS middleware *after* route handlers | Routes respond before CORS headers are attached. | Declare `app.use(cors(...))` before all route definitions. |
| Forgetting `cookie-parser` in Express | `req.cookies` remains `undefined`. | Call `app.use(cookieParser())` before routes. |
| `Path=/auth` on login cookie | Browser only sends cookie to `/auth/*` endpoints. | Set `Path=/` so all protected API endpoints receive the cookie. |

---

## 9. Production Architecture: Banking-Grade Security Standard

```
+-------------------------------------------------------------------------------------------------+
|                                ENTERPRISE BANKING AUTH PATTERN                                  |
+-------------------------------------------------------------------------------------------------+

       Angular 19 SPA                                        Backend / API Gateway
+-----------------------------+                           +-------------------------------------+
| In-Memory Access Token      | --- (1) Authorization: ---> | Validate Access Token (JWT)         |
| (Short-Lived: 5-15 mins)    |        Bearer <token>     |                                     |
+-----------------------------+                           +-------------------------------------+
              |                                                              |
              | (Token Expired)                                              |
              v                                                              v
+-----------------------------+ --- (2) POST /auth/refresh -----------> +-------------------------------------+
| HttpOnly Cookie             |     (Cookie: refresh_token=...)   | Validate Refresh Token from Redis   |
| (Long-Lived: 7 days)        | <--- (3) Returns new Access Token ---- | Rotate & Revoke Old Refresh Token   |
+-----------------------------+          + Rotated Cookie         +-------------------------------------+
```

### Architectural Principles:

1. **Access Token in Memory (Short-Lived):**
   - Held only in Angular application memory / state management (never in `localStorage` or `sessionStorage` to mitigate persistent XSS vulnerabilities).
   - Valid for 5 to 15 minutes.

2. **Refresh Token in `HttpOnly` Cookie:**
   - Inaccessible to JavaScript; protected against XSS.
   - Handled via `withCredentials: true`.

3. **Refresh Token Rotation (RTR):**
   - Every time `/auth/refresh` is invoked, the previous refresh token is invalidated and a brand new refresh token cookie is issued.
   - If a compromised token is reused, the backend detects token reuse and immediately invalidates all active sessions for that user.

4. **CSRF Protection:**
   - **CORS is NOT Authentication:** CORS protects browsers from reading cross-origin responses; it does not stop cross-site request triggering.
   - Implement **Double Submit Cookie** or **Synchronizer CSRF Tokens** (`X-CSRF-Token` header) for state-changing endpoints (`POST`, `PUT`, `DELETE`).

5. **Reverse Proxy / BFF (Backend For Frontend) Pattern:**
   - In high-security architectures, deploy NGINX / Cloudflare / AWS CloudFront in front of both frontend and backend under the same domain (`https://bank.com` and `https://bank.com/api`), eliminating cross-origin CORS overhead and browser third-party cookie restrictions entirely.
