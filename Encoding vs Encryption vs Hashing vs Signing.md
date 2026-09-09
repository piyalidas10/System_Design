# Encoding vs Encryption vs Hashing vs Signing

- Encoding is used to represent data in another format and is reversible, but it provides no security.
- Encryption is used to protect confidentiality by converting plaintext into ciphertext using a key.
- Hashing creates a one-way fingerprint of data and is mainly used to verify integrity and securely store passwords using password-specific hashing algorithms.
- Signing proves authenticity and integrity by creating a signature using a private key, which others can verify using the corresponding public key.

```
Encoding → Change format
Encryption → Hide data
Hashing → Create fingerprint
Signing → Prove authenticity
```

## 🧠 Super-simple memory trick
| Term           | Think                   |
| -------------- | ----------------------- |
| **Encoding**   | 📦 Change the format    |
| **Encryption** | 🔒 Lock it              |
| **Hashing**    | 🧩 One-way fingerprint  |
| **Signing**    | ✍️ Prove who created it |

## 🔵 1. Encoded = easy to reverse
**Suppose I have:**
```
Hello
```
**I encode it using Base64:**
```
SGVsbG8=
```
It looks strange, but there is no secret key.

**Anyone can decode it:**
```
SGVsbG8=  →  Hello
```

**"Encoding changes the representation of data. It is reversible and does not provide security or confidentiality."**

**Important characteristics**  
❌ No secret key  
❌ Does not provide confidentiality  
✅ Reversible  
✅ Useful for data transport/representation  

**Common examples**
- Base64
- URL encoding
- HTML encoding
- UTF-8

## 🔴 2. Encrypted = locked with a key or "Hide the data"
**Suppose I have:**
```
Hello
```

**I encrypt it with a secret key:**
```
Hello
  ↓
Encryption + Key
  ↓
X7@91kP#...
```

Someone who doesn't have the required key shouldn't be able to recover the original data.
```
X7@91kP#...
      ↓
Decryption + Key
      ↓
Hello
```

**"Encryption transforms plaintext into ciphertext using a key so that only an authorized party with the appropriate key can recover the original data. Its primary goal is confidentiality."**

**Important characteristics**  
🔐 Uses a key  
✅ Reversible  
✅ Provides confidentiality  
❌ Not designed primarily for password storage  

### Types
**Symmetric encryption**

Same key:
```
Encrypt ──→ 🔑 ──→ Decrypt
```

Examples:
```
AES
ChaCha20
```

**Asymmetric encryption**

Uses a key pair:
```
Public Key
    ↓
 Encrypt
    ↓
Ciphertext
    ↓
Private Key
    ↓
Decrypt
```

Example:
- RSA
- ECC-based schemes

## 🟢 3. Hashing - "Create a fingerprint"
This is where people often get confused.

**Hashing is generally one-way.**
```
Hello
  ↓
SHA-256
  ↓
185f8db32271fe25...
```

**You don't normally do:**
```
185f8db...
    ↓
Hello
```
There is no decryption key.

**Think of it as a fingerprint**
```
Document
    ↓
   HASH
    ↓
Fingerprint
```

**If the document changes:**
```
Hello
  ↓
Hash A
versus:
Hello!
  ↓
Hash B
```
The hashes will be different.

**Important characteristics**  
❌ Not encryption  
❌ Not reversible  
❌ No decryption  
✅ Useful for integrity/fingerprinting  
✅ Same input → same hash  
⚠️ For passwords, use password hashing algorithms such as Argon2id, bcrypt, or scrypt, not plain SHA-256.  

### Password example
Never:
```
password123
```
directly in database.

Instead:
```
password123
     ↓
bcrypt/Argon2id
     ↓
$2b$12$........
```

During login:
```
Entered password
       ↓
Password verification
       ↓
Compare with stored hash
       ↓
MATCH ✅
```

**"Hashing is a one-way transformation that produces a fixed-size digest used primarily for integrity, fingerprinting, and password verification. Unlike encryption, hashing is not intended to be decrypted."**

## 🟠 4. Signing - "Prove who created it"
Signing is about authenticity + integrity.

Imagine your server sends:
```
Transfer ₹10,000
```

You want the receiver to know:
1. Who created this message?
2. Has anyone modified it?

The server signs the message using its private key:
```
Message
   +
Private Key
   ↓
Digital Signature
```

Receiver:
```
Message + Signature
        ↓
 Public Key
        ↓
Valid? ✅
```

If someone changes:
```
Transfer ₹10,000
to:
Transfer ₹90,000
```
the signature verification fails.

**Important characteristics**  
✅ Proves authenticity  
✅ Detects tampering  
✅ Provides integrity  
❌ Does not necessarily hide the message  

**A signed message can still be completely readable.**

