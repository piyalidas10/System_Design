# TOTP — Time-based One-Time Password
This is fundamentally different from the common “generate OTP → save OTP in DB → compare OTP” approach.

The most important correction first:
```
The server does not store the generated 6-digit OTP. It does store the user's long-term secret key.
```
That distinction is the key to understanding TOTP.

## 1. What is TOTP?

TOTP = Time-based One-Time Password

It generates a temporary code such as:
```
637901
```
The code changes automatically, usually every 30 seconds.

For example:
```
10:00:00 → 637901
10:00:30 → 428315
10:01:00 → 912847
```
The interesting part is:
```
The server doesn't need to store 637901.
```
Both the authenticator app and server can independently calculate the same code.

## 2. The basic idea

There are only two important inputs:
```
        SECRET KEY
            +
        CURRENT TIME
            │
            ▼
       HMAC-SHA1
            │
            ▼
    Dynamic Truncation
            │
            ▼
        6 DIGITS
```
So:
```
TOTP = f(Secret Key, Current Time)
```
**For example:**
```
Secret Key = JBSWY3DPEHPK3PXP
Time       = 10:00:15
             │
             ▼
       TOTP Algorithm
             │
             ▼
           637901
```
The server doesn't ask:
```
"What OTP did I generate earlier?"
```
Instead it asks:
```
"Given this user's secret and the current time, what OTP should exist right now?"
```

## 3. Complete architecture

Here is the architecture behind Google Authenticator-style TOTP:
```
                    USER
                     │
                     │ enters 637901
                     ▼
              ┌───────────────┐
              │   Web / App   │
              └───────┬───────┘
                      │
                      │ 637901
                      ▼
              ┌───────────────┐
              │ Authentication│
              │    Server     │
              └───────┬───────┘
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
       User's Secret       Current Time
       Key from DB        Unix Timestamp
             │                 │
             └────────┬────────┘
                      ▼
               TOTP Algorithm
                      │
                      ▼
              Expected OTP
                637901
                      │
                      │ compare
                      ▼
             ┌────────────────┐
             │  637901 ==     │
             │  637901 ?      │
             └───────┬────────┘
                     │
              ┌──────┴──────┐
              │             │
             YES            NO
              │             │
              ▼             ▼
          ACCEPT          REJECT
```
**Notice what is not happening:**  
❌ Generate OTP  
❌ Save OTP = 637901  
❌ Query DB for OTP  
❌ Compare with stored OTP  

Instead:
```
Secret + Time
     ↓
Calculate expected OTP
     ↓
Compare with user's OTP
```

## 4. What does the server actually store?

This is the most important interview point.

**Server stores:**
```
User ID
    ↓
Secret Key
```
**For example:**
```
user123
   │
   └── secret:
       JBSWY3DPEHPK3PXP
Server does NOT store:
637901
```
The OTP is derived dynamically.

**So the database might conceptually look like:**
```
┌──────────┬─────────────────────┐
│ USER     │ TOTP SECRET         │
├──────────┼─────────────────────┤
│ user123  │ JBSWY3DPEHPK3PXP    │
│ user456  │ KRSXG5A...           │
└──────────┴─────────────────────┘
```
The secret should be protected like a credential, ideally encrypted or otherwise strongly protected at rest.

## 5. Why does the OTP change every 30 seconds?

This is where time windows come in.

**Suppose the Unix timestamp is:**
```
1723000815
```
**TOTP typically calculates:**
```
Time Counter = floor(Unix Time / 30)
```
So the time is converted into a 30-second counter.

**Conceptually:**
```
             30-second windows

10:00:00 ───────────────── 10:00:29
             Window #1
               │
               ▼
             637901


10:00:30 ───────────────── 10:00:59
             Window #2
               │
               ▼
             428315


10:01:00 ───────────────── 10:01:29
             Window #3
               │
               ▼
             912847
```
**Therefore:**
```
Secret + Window #1 → 637901

Secret + Window #2 → 428315

Secret + Window #3 → 912847
```
Same secret.

Different time counter.

Therefore different OTP.

## 6. What actually happens inside TOTP?

The simplified algorithm is:
```
                    SECRET
                      │
                      │
                      ▼
             ┌─────────────────┐
             │     HMAC-SHA1   │
             │                 │
TIME COUNTER ─►  Secret + Data │
             └────────┬────────┘
                      │
                      ▼
                 20-byte hash
                      │
                      ▼
             Dynamic Truncation
                      │
                      ▼
                  Integer
                      │
                      ▼
                  mod 10⁶
                      │
                      ▼
                  637901
```
More precisely:
```
T = floor(Current Unix Time / 30)

HMAC-SHA1(
    secret,
    T
)

       ↓

Dynamic Truncation

       ↓

Integer

       ↓

integer % 1,000,000

       ↓

6-digit OTP
```
The actual TOTP standard is defined by RFC 6238.

## 7. Why HMAC-SHA1?

HMAC means:

**Hash-based Message Authentication Code**

Conceptually:
```
HMAC(
    secret,
    time-counter
)
```
The secret makes it extremely difficult for someone who doesn't possess the secret to calculate the correct value.

For example:
```
Secret:
JBSWY3DPEHPK3PXP

Time Counter:
57348923

       ↓

   HMAC-SHA1

       ↓

Hash:
8f31a9c7......
```
Then TOTP extracts part of that hash and converts it into a 6-digit number.

## 8. Why can't we just use SHA-1(secret + time)?

Because TOTP specifically uses HMAC, not simply:
```
SHA1(secret + time)
```
It uses:
```
HMAC-SHA1(secret, time-counter)
```
HMAC is designed for keyed message authentication and avoids several problems associated with naïve constructions of hashing a secret together with data.

Also, despite the name, TOTP is not dependent on SHA-1 only. 
RFC 6238 allows SHA-1, SHA-256, and SHA-512; SHA-1 remains very common for compatibility with authenticator apps.

## 9. How does verification work?

Suppose your authenticator displays:

637901

You type:

637901

The request reaches the authentication server:

POST /verify-otp

{
    "userId": "user123",
    "otp": "637901"
}

The server does:

**Step 1 — Find user**
```
user123
    ↓
Database
    ↓
Secret Key
```

**Step 2 — Get current time**
```
Current Unix Time
      ↓
floor(time / 30)
      ↓
Time Counter
```

**Step 3 — Calculate expected OTP**
```
Secret Key
     +
Time Counter
     ↓
HMAC-SHA1
     ↓
Dynamic Truncation
     ↓
637901
```

**Step 4 — Compare**
```
User entered:     637901
Server calculated:637901
                   ↓
                 MATCH
                   ↓
                SUCCESS
```
No OTP database lookup is required.

## 10. What happens if the user enters the wrong OTP?

**Suppose the user enters:**
```
123456
```
**Server calculates:**
```
Expected OTP = 637901
```
**Then:**
```
123456
   ≠
637901

   ↓

REJECT
```
Again, the server didn't retrieve 637901 from a database.

It calculated it.

## 11. Why does the phone know the same OTP?

This is the really clever part.

During TOTP enrollment, the server gives the authenticator app a secret.

**For example:**
```
Server
  │
  │ Secret Key
  ▼
Google Authenticator
```

**Now both sides have:**
```
                 SAME SECRET
                /            \
               /              \
              ▼                ▼
       Authentication      Authenticator
          Server               App
              │                  │
              │                  │
              ▼                  ▼
         Current Time       Current Time
              │                  │
              ▼                  ▼
          TOTP Algorithm      TOTP Algorithm
              │                  │
              ▼                  ▼
            637901             637901
```
That's the magic.

There is no communication between the phone and server when generating the OTP.

## 12. This is why Google Authenticator can work offline

Open Google Authenticator while your phone has:
```
NO INTERNET
```
and it can still generate:
```
637901
```
Why?

Because it doesn't need to call the server.

It has:
```
Secret Key
+
Phone Clock
```
That's enough.
```
             PHONE
      ┌──────────────────┐
      │ Google Authenticator
      │                  │
      │ Secret Key       │
      │       +          │
      │ Current Time     │
      │       ↓          │
      │   TOTP Algorithm │
      │       ↓          │
      │     637901       │
      └──────────────────┘
```

## 13. Enrollment is different

This is where the statement "server stores nothing" becomes misleading.

During enrollment:
```
                User
                  │
                  │ Enable 2FA
                  ▼
          Authentication Server
                  │
                  │ Generate secret
                  ▼
          SECRET KEY
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
      Database        QR Code / Setup
          │                │
          │                ▼
          │        Authenticator App
          │                │
          └────────────────┘
```
The server must retain the secret, otherwise it cannot verify future codes.

So the accurate statement is:
> The server does not store each generated OTP; it stores the shared secret from which the OTP can be deterministically generated.

## 14. Why is this better than storing OTPs?

Consider a traditional OTP system.

**Traditional OTP**
```
User requests OTP
       │
       ▼
Server generates
     637901
       │
       ├──────────────► SMS
       │
       ▼
Database
637901
       │
       │
User enters 637901
       │
       ▼
Database lookup
       │
       ▼
Compare
```
The database contains a temporary authentication secret.

If the database is compromised, those OTP records could potentially be exposed.

## 15. TOTP approach
```
                 TOTP

       Secret Key + Time
               │
               ▼
          HMAC-SHA1
               │
               ▼
            637901
```
No OTP record required.

The server only needs:
```
Secret Key
```
and:
```
Current Time
```

## 16. But there's an important security catch

TOTP isn't magically secure just because there is no OTP database.

If an attacker steals the user's TOTP secret, they can generate valid OTPs.

For example:

**Attacker obtains:**
```
Secret = JBSWY3DPEHPK3PXP
             │
             ▼
      Current Time
             │
             ▼
        TOTP algorithm
             │
             ▼
          637901
```
So the TOTP secret is extremely sensitive.

Think of it as:
```
TOTP Secret ≈ long-term authentication credential
```
It should therefore be:
- encrypted/protected at rest
- access-controlled
- never logged
- never exposed to frontend JavaScript unnecessarily
- carefully handled during enrollment/recovery

## 17. Why the 30-second window?

The purpose is to limit the lifetime of the code.

Imagine a code stayed valid for 24 hours:
```
637901
   │
   ├───────────────┐
   │               │
   │     24 hours  │
   │               │
   └───────────────┘
```
A stolen code could remain useful for a long time.

With TOTP:
```
637901
   │
   └────── ~30 sec ──────┐
                         │
                         ▼
                       EXPIRE
```
This reduces the useful lifetime of a captured OTP.

## 18. TOTP vs SMS OTP

These are often confused.

**SMS OTP**
```
User
 │
 │ Request OTP
 ▼
Server
 │
 │ Generate random OTP
 ▼
SMS Provider
 │
 ▼
Phone
```
The server needs some way to associate the pending OTP with the authentication attempt—often a server-side store/cache/database with expiry.

**TOTP**
```
                 SECRET
                /      \
               ▼        ▼
           Server      Phone
              │          │
              │          │
          Current Time   Current Time
              │          │
              ▼          ▼
             TOTP       TOTP
              │          │
              └────┬─────┘
                   ▼
               Same code
```
No SMS provider is required.

## 19. TOTP vs random OTP
| Feature                      | Random OTP                   | TOTP                   |
| ---------------------------- | ---------------------------- | ---------------------- |
| Example                      | SMS `637901`                 | Authenticator `637901` |
| Generated by                 | Server                       | Server + authenticator |
| Server stores generated OTP? | Usually some state is needed | **No**                 |
| Shared secret                | Not necessarily              | **Yes**                |
| Time-based                   | Usually no                   | **Yes**                |
| Works offline on phone       | No                           | **Yes**                |
| Typical lifetime             | 5–10 min                     | ~30 sec                |
| SMS required                 | Often                        | No                     |
| Google Authenticator         | No                           | **Yes**                |

## 20. Complete real-world login flow

Imagine you're logging into an e-commerce/admin application.
```
                 USER
                   │
                   │ username + password
                   ▼
           ┌───────────────┐
           │ Auth Server   │
           └───────┬───────┘
                   │
                   │ Password correct
                   ▼
             "Enter OTP"
                   │
                   │
         User opens Authenticator
                   │
                   ▼
             ┌─────────────┐
             │ Secret Key  │
             │     +       │
             │ Current Time│
             └──────┬──────┘
                    │
                    ▼
               HMAC-SHA1
                    │
                    ▼
                  637901
                    │
                    ▼
                  USER
                    │
                    │ enters 637901
                    ▼
             ┌───────────────┐
             │ Auth Server   │
             └───────┬───────┘
                     │
             Secret + Current Time
                     │
                     ▼
               TOTP calculation
                     │
                     ▼
                  637901
                     │
                ┌────┴────┐
                │         │
              MATCH     NO MATCH
                │         │
                ▼         ▼
             LOGIN      REJECT
```

## 21. The most important conceptual difference

Think about these two systems:

**Traditional OTP**
```
Random()
   ↓
637901
   ↓
STORE
   ↓
SEND
   ↓
COMPARE
```

**TOTP**
```
        Secret
          +
        Time
          │
          ▼
     Deterministic
      calculation
          │
          ▼
       637901
```
The second approach is deterministic.

Given the same:
```
Secret + Time
```
you get the same:
```
OTP
```

## 22. Interview answer 🎯

"How does TOTP work without storing the OTP?"

"TOTP doesn't store the generated OTP. During enrollment, the server and authenticator share a secret key. 
Every 30 seconds, both independently combine that secret with the current time using HMAC to derive the same 6-digit code. 
When the user submits the code, the server calculates the expected TOTP again and compares it with the submitted value, so it only needs the secret—not a stored OTP."

## TOTP AUTHENTICATION
```

              ENROLLMENT
                  │
                  ▼
          Generate Secret
                  │
          ┌───────┴────────┐
          ▼                ▼
       Server             Phone
          │                │
       stores            stores
       SECRET             SECRET
          │                │
          └───────┬────────┘
                  │
                  │
            EVERY 30 SECONDS
                  │
          ┌───────┴────────┐
          ▼                ▼
    Secret + Time      Secret + Time
          │                │
          ▼                ▼
       HMAC/TOTP         HMAC/TOTP
          │                │
          ▼                ▼
        637901           637901
          │                │
          └───────┬────────┘
                  ▼
                MATCH
                  │
                  ▼
              AUTHENTICATED
```




