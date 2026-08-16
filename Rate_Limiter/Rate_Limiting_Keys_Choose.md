# How will choose Rate Limiting Keys ?
Choose the rate-limiting key based on who or what you want to protect, not simply based on what identifier is available.

"I wouldn't use a single key globally. I choose the key based on the resource being protected and the identity available at the gateway.
For authenticated APIs, I generally use user ID, API key, or client ID; for multi-tenant systems I add tenant ID; for anonymous traffic I use IP as one dimension. 
For sensitive endpoints such as login, OTP, and payments, I use multiple dimensions such as IP + user/API key + endpoint. 
I also apply global limits to protect the overall infrastructure. 
The Gateway evaluates all applicable policies and performs atomic Redis operations before forwarding the request."

Ask:
> **"Who or what should be prevented from consuming too much of this resource?"**

## 1. Start with the threat / business requirement

| Requirement                | Rate-limit key      | Example            |
| -------------------------- | ------------------- | ------------------ |
| Stop one user abusing API  | `userId`            | `user:123`         |
| Stop anonymous abuse       | `IP`                | `ip:203.0.113.10`  |
| Control API consumers      | `apiKey`            | `apikey:abc123`    |
| Protect expensive endpoint | `userId + endpoint` | `user:123:/search` |
| Protect login              | `IP + endpoint`     | `ip:...:/login`    |
| Control a tenant           | `tenantId`          | `tenant:acme`      |
| Protect an organization    | `organizationId`    | `org:456`          |
| Protect globally           | `endpoint`          | `/payments`        |

## 2. Why not just use IP?

Suppose your application has:
```
100 requests/minute/IP
```
This looks reasonable, but imagine:
```
                    Internet
                       │
              ┌────────┴────────┐
              │ Corporate NAT   │
              └────────┬────────┘
                       │
             500 employees
                       │
                 Same public IP
```
Now 500 legitimate users share one IP.

If you rate-limit only by IP:
```
User A ─┐
User B ─┤
User C ─┼──► 203.0.113.10 ──► 100 requests/min
...     │
User N ─┘
```
You could accidentally throttle legitimate users.

So IP is useful, but shouldn't automatically be your primary identity key for authenticated APIs.

## 3. Don't use only one key

A production system usually has multiple rate-limit dimensions.

For example:
```
Request
   │
   ▼
┌───────────────────────┐
│ Identify request      │
└───────────┬───────────┘
            │
     ┌──────┼──────────┐
     ▼      ▼          ▼
   User     IP       API Key
     │      │          │
     └──────┼──────────┘
            ▼
       Endpoint
            │
            ▼
      Rate-limit rules
```
A payment request might therefore be checked against:
```
user:123
user:123:/payments
ip:192.168.x.x:/payments
apikey:abc123
global:/payments
```
The request must pass all applicable limits.

## 4. Authenticated API → prefer user/tenant/API key

**For an authenticated application:**
```
Request
   │
   ▼
JWT / Session
   │
   ├── userId = 123
   ├── tenantId = ACME
   └── plan = PREMIUM
```

**You can construct:**
```
user:123
```
or:
```
tenant:ACME
```
depending on what you want to control.

**For example:**
```
FREE PLAN
user:{id} → 100 requests/min


PREMIUM
user:{id} → 5,000 requests/min


ENTERPRISE
tenant:{id} → 100,000 requests/min
```

## 5. The most useful production pattern

I recommend thinking in terms of:
```
Rate Limit Key =
    Identity
    +
    Resource
    +
    Scope
```
For example:
```
user:123:POST:/payments
```
or:
```
apikey:abc123:GET:/search
```
or:
```
ip:203.x.x.x:POST:/login
```
This makes the rate limiter much more precise.

## 6. Expensive endpoint → combine identity + endpoint

This is where production systems become more interesting.

**Imagine:**
```
GET /products
GET /search
POST /payment
POST /export
```
You probably don't want the same limit for everything.

**For example:**
```
user:123:/products
user:123:/search
user:123:/payment
user:123:/export
```

**Policies:**
```
/products → 1,000/min
/search   → 100/min
/payment  → 20/min
/export   → 5/min
```

**So the actual key becomes:**
```
{identity}:{endpoint}
```
Example:
```
rl:user:123:/search
```

## 7. Login is a special case

For login, you should not rely only on userId, because an attacker may not have a valid user identity yet.

Instead:
```
POST /login
```
Use something like:
```
IP + endpoint
```
and potentially:
```
IP + username/email
```

**Conceptually:**
```
                         POST /login
                              │
                ┌─────────────┴──────────────┐
                │                            │
             IP limit                   Account limit
                │                            │
       ip:{address}                 account:{username}
                │                            │
          10 attempts/min             5 attempts/min
```

**This protects against both:**
- credential stuffing from one IP
- attacking one account from many IPs

## 8. Multi-dimensional rate limiting

A production-grade limiter often checks several buckets.

**For example, a payment request:**
```
POST /payment
userId = 123
tenantId = ACME
IP = 203.0.113.10
```

**Gateway could check:**
```
                    /payment
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
      User limit    Tenant limit    IP limit
      20/min        10,000/min      100/min
          │             │              │
          └─────────────┼──────────────┘
                        ▼
                    ALL PASS?
                    /       \
                  YES        NO
                   │          │
                   ▼          ▼
                Service      429
```
Any bucket exceeding its limit can reject the request.

## 9. Tenant-based SaaS application

Suppose you're building a SaaS platform.

You might have:

Tenant A
 ├── User 1
 ├── User 2
 └── User 3


Tenant B
 ├── User 4
 └── User 5

If the infrastructure has a tenant-level quota:
```
tenant:A → 10,000 requests/min
tenant:B → 10,000 requests/min
```
You may additionally have:
```
tenant:A:user:1 → 1,000/min
tenant:A:user:2 → 1,000/min
```

**So the hierarchy becomes:**
```
                 Request
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        Global    Tenant     User
          │         │         │
          └─────────┼─────────┘
                    ▼
                 Endpoint
```
This prevents one user from consuming the entire tenant's quota.

```
┌──────────────────────────────────────────┐
│            RATE LIMIT DIMENSIONS         │
├──────────────────────────────────────────┤
│                                          │
│  1. Global/API endpoint                  │
│     /payment → global protection         │
│                                          │
│  2. Tenant                                 │
│     tenant:ACME → fairness across org    │
│                                          │
│  3. User / API Key                       │
│     user:123 → individual quota          │
│                                          │
│  4. IP                                    │
│     ip:x.x.x.x → abuse protection         │
│                                          │
│  5. Endpoint                              │
│     /export → expensive-operation limit   │
│                                          │
└──────────────────────────────────────────┘
```
Rate-limit keys should correspond to the resource you are protecting and the actor you want to control. 
Use user/API-key for authenticated consumers, IP for anonymous/abuse protection, tenant for SaaS fairness, endpoint for expensive operations, and combine dimensions when you need defense in depth.

**And Redis keys could look like:**
```
rl:global:/payment
rl:tenant:acme:/payment
rl:user:123:/payment
rl:ip:203.0.113.10:/payment
```

**I'd typically design it like this:**
```
                    Incoming Request
                           │
                           ▼
                    ┌──────────────┐
                    │ API Gateway  │
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Global         Tenant        Identity
          Limit          Limit          Limit
             │             │             │
       endpoint        tenantId        userId/API Key
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                       IP Limit
                           │
                           ▼
                     Rate Decision
```

**For example:**
```
rl:global:/payment
rl:tenant:acme:/payment
rl:user:123:/payment
rl:ip:203.0.113.10:/payment
```

## 10. How do you actually decide?

**Use this decision tree:**
```
                    Is user authenticated?
                           │
                  ┌────────┴────────┐
                 NO                 YES
                 │                   │
                 ▼                   ▼
              Use IP          Is API consumer
              primarily?      identified by API key?
                                 │
                           ┌─────┴─────┐
                          YES          NO
                           │            │
                           ▼            ▼
                        API Key      User ID
                           │            │
                           └─────┬──────┘
                                 ▼
                       Is there a tenant?
                                 │
                          ┌──────┴──────┐
                         YES            NO
                          │              │
                          ▼              │
                      Tenant limit      │
                          │              │
                          └──────┬───────┘
                                 ▼
                       Is endpoint expensive?
                                 │
                          ┌──────┴──────┐
                         YES            NO
                          │              │
                          ▼              ▼
                    Identity +       Identity
                     endpoint
```
But remember: this is not necessarily an either/or decision.

In production, you often combine dimensions.

## 11. Example: payment API

**Suppose:**
```
POST /payments
Authorization: Bearer ...
X-API-Key: ...
```

**Your policy might be:**
```
Global:
    /payments → 50,000/min


Tenant:
    tenant:ACME → 5,000/min


API Key:
    key:xyz → 1,000/min


User:
    user:123 → 20/min


IP:
    ip:10.x.x.x → 100/min
```

**Gateway evaluates:**
```
                    POST /payments
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
   Global limit       Tenant limit       User limit
   50,000/min         5,000/min          20/min
        │                 │                  │
        └─────────────────┼──────────────────┘
                          ▼
                      IP limit
                      100/min
                          │
                          ▼
                    All passed?
                     /       \
                   YES        NO
                    │          │
                    ▼          ▼
                 Service      429
```

**This is much more robust than:**
```
if requests > 100:
    return 429
```

## 12. How does the Gateway actually select the key?

**You can have a Rate Limit Policy Store:**
```
{
  "endpoint": "POST /payments",
  "rules": [
    {
      "dimension": "user",
      "limit": 20,
      "window": "1m"
    },
    {
      "dimension": "tenant",
      "limit": 5000,
      "window": "1m"
    },
    {
      "dimension": "ip",
      "limit": 100,
      "window": "1m"
    }
  ]
}
```
**The Gateway extracts:**
```
userId  = 123
tenant  = ACME
ip      = 10.x.x.x
endpoint = POST /payments
```
**Then generates keys:**
```
rl:user:123:POST:/payments
rl:tenant:ACME:POST:/payments
rl:ip:10.x.x.x:POST:/payments
```
Redis then performs the required atomic checks.

## 13. Don't forget the business plan

One of the best production approaches is to make rate limits policy-driven.

**Instead of hardcoding:**
```
if requests > 100
```

**have configuration:**
```
{
  "plan": "PREMIUM",
  "rules": [
    {
      "scope": "USER",
      "endpoint": "/search",
      "limit": 500,
      "window": "1m"
    },
    {
      "scope": "USER",
      "endpoint": "/payment",
      "limit": 50,
      "window": "1m"
    }
  ]
}
```

**Then your architecture becomes:**
```
                 JWT
                  │
                  ▼
             userId / tenant
                  │
                  ▼
             Policy Service
                  │
                  ▼
             Rate Limiter
                  │
          ┌───────┴────────┐
          ▼                ▼
       Redis            Decision
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                  ALLOW           429

```

## 14. The key decision framework

When designing a new endpoint, ask these 5 questions:

**Q1 — Is the caller authenticated?**

Yes → user/API key/client ID
No → IP/device/session signals

**Q2 — Is this a multi-tenant system?**

Yes → add tenantId.

**Q3 — Is the endpoint expensive or sensitive?**

Yes → create a specific endpoint limit.

**Q4 — Can one identity abuse the entire infrastructure?**

Yes → add a global/system-level limit.

**Q5 — Is there a security attack vector?**

For:
```
/login
/otp
/password-reset
/payment
```
add specialized limits, often combining dimensions.


