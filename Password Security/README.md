# Password Security

## 🔐How Companies store your Password securely ?
Companies should never store your password in plain text. Instead, 
they store a password hash generated using a password-specific hashing algorithm such as Argon2id, bcrypt, scrypt, or PBKDF2.

```
⭐ "Companies should never store passwords in plain text.
During registration, the server uses a password-specific hashing algorithm such as Argon2id with a unique random salt for each password
and stores the resulting password hash. During login, the server uses the password-hashing library to verify the supplied password against the stored hash.
Hashing is intentionally one-way, so there is no normal decryption process.
Even if the database is compromised, the attacker still has to perform password guesses, and algorithms like Argon2id are intentionally expensive to make those attacks harder."
```

## Registration

```
                 USER CREATES PASSWORD
                         │
                         ▼
                  "MyPassword123"
                         │
                    Generate Salt
                         │
                         ▼
              "MyPassword123" + "x7K9..."
                         │
                         ▼
                  Password Hashing
                         │
                         ▼
             $argon2id$...hashed-value...
                         │
                         ▼
                    DATABASE
             ┌──────────────────────┐
             │ salt                 │
             │ password_hash       │
             └──────────────────────┘
```
The company should not be able to see your original password from the database.

## What happens during login?

```
User enters:
"MyPassword123"
       │
       ▼
Fetch user's stored salt
       │
       ▼
"MyPassword123" + stored salt
       │
       ▼
Same password-hashing algorithm
       │
       ▼
Computed hash
       │
       ▼
Compare with stored password hash
       │
       ├── MATCH    → ✅ Login successful
       │
       └── NO MATCH → ❌ Invalid password
```

## Why the Salt matters
A salt is a random value generated for each password.

**Example:**
```
User A

Password = MyPassword123
Salt     = X7K92P
Hash     = H1
```

**Another user:**
```
User B

Password = MyPassword123
Salt     = Q8M31Z
Hash     = H2
```

**Suppose two users both choose:**
```
MyPassword123
```

**Without salts:**
```
User A → hash("MyPassword123") → ABC123
User B → hash("MyPassword123") → ABC123
```
An attacker can recognize that both users have the same password.

**With unique salts:**
```
User A → hash("MyPassword123" + "X7K92P") → XYZ789
User B → hash("MyPassword123" + "Q8M31Z") → QWE456
```
So even though the passwords are identical, their stored hashes are different.

> **Important: A salt does not need to be secret. It is normally stored alongside the password hash.**
> **Also, modern applications should use a password-specific hashing/KDF such as Argon2id, bcrypt, or scrypt, rather than a fast general-purpose hash like SHA-256 alone.**

## What happens if the database is compromised?

This is where interviewers often take the discussion deeper.

**Imagine hackers steal:**
```
users
password_hashes
salts
emails
```
They don't immediately get the passwords.

But this does NOT mean the passwords are magically safe.

**The attacker can perform:**
```
Candidate password
       │
       ▼
Hash using stolen salt + parameters
       │
       ▼
Compare with stolen hash
```

**For example:**
```
Guess #1 → password123 → ❌
Guess #2 → qwerty123   → ❌
Guess #3 → MyPassword123 → ✅
```
Therefore, the real security goal is:
> **Make each password guess computationally expensive.**

That's why we use password-specific hashing algorithms.

## Why NOT SHA-256 for passwords?

This is a very good senior interview question.

SHA-256 is an excellent cryptographic hash, but it's designed to be fast.

That's bad for password storage.

**Imagine:**
```
SHA-256

1 password guess
      ↓
very fast
      ↓
millions/billions of guesses possible
```

**For passwords we want:**
```
Argon2id / bcrypt / scrypt

1 password guess
      ↓
intentionally expensive
      ↓
attacker's guessing becomes much slower
```

**Recommended choices**

| Algorithm    | Password Storage                                 |
| ------------ | ------------------------------------------------ |
| **Argon2id** | ⭐ Excellent modern choice                        |
| **scrypt**   | ⭐ Excellent                                      |
| **bcrypt**   | ✅ Widely used                                    |
| PBKDF2       | ✅ Common, especially where standards/FIPS matter |
| SHA-256      | ❌ Don't use alone                                |
| MD5          | ❌ Never                                          |
| SHA-1        | ❌ Never                                          |


## What is a Pepper?

This is a great topic to mention if you're interviewing for a senior role.

You already have:
```
Password + Salt
       │
       ▼
      Hash
```
A pepper is an additional secret value maintained separately from the database.

Conceptually:
```
Password
    +
Salt
    +
Pepper
    │
    ▼
 Argon2id
    │
    ▼
Password Hash
```

## Password hashing is NOT enough

A production authentication system needs multiple layers:
```
                    Authentication Security
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
 Password Hashing        Transport           Login Protection
       │                    │                    │
   Argon2id               HTTPS/TLS          Rate limiting
   Unique salt                                Lockout controls
   Optional pepper                            CAPTCHA/risk checks
       │
       ▼
      MFA
       │
   TOTP / Passkeys /
   Security keys
```

**You should also consider:**
- HTTPS/TLS
- MFA
- rate limiting
- credential stuffing protection
- breached-password detection
- secure session/token management
- account recovery security
- audit logging
- secure password reset tokens
