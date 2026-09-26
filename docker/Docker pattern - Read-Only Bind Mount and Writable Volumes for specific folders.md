# Docker pattern: Read-Only Bind Mount + Writable Volumes for specific folders

This is an important enterprise Docker pattern: Read-Only Bind Mount + Writable Volumes for specific folders. This is an important enterprise Docker development pattern. Let me simplify it.

## Project Structure
```
Host Machine
docker-complete/
├── feedback/
├── pages/
├── public/
├── temp/
├── package.json
├── server.js
└── Dockerfile
```

## Command
```
docker run -d --rm -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" -v /app/node_modules -v feedback-node:volumes
```
(Windows example path)

**Named Volume**
```
-v feedback:/app/feedback
```
- Purpose: Persist user feedback
- Even if container is removed using `docker rm feedback-app`
- Data remains: feedback volume

**Anonymous Volume for node_modules**
```
-v /app/node_modules
```
Without this:
```
Host bind mount
↓
Container node_modules overwritten
```
Problem:
```
Host:
(no node_modules)

Container:
(node_modules disappear)
```
Anonymous volume protects container dependencies.

## Problem

You want:

✅ Edit source code from host machine  
✅ Container automatically sees changes  
❌ Container should NOT modify source code  
✅ Some folders (feedback, temp) must remain writable  
✅ node_modules should stay inside container  

**You mount your entire project into the container:**
```
-v "C:/project/docker-complete:/app"
```

**This means:**

Host                     Container
-------------------------------
project/      --->       /app
server.js     --->       /app/server.js
feedback/     --->       /app/feedback
temp/         --->       /app/temp
node_modules/ --->       /app/node_modules

**By default:**
> **Container can: ✓ Read files ✓ Write files**

That means the container could accidentally modify:
```
server.js
package.json
Dockerfile
source code
```
This is usually not desired.

## Solution: Read-Only Bind Mount
```
-v "C:/project/docker-complete:/app:ro"
```
> **ro = Read Only**

**Now:**
```
Container:
✓ Read files
✗ Cannot modify files
```

**Example:**
Container cannot: ❌ Modify source code
```
fs.writeFileSync('/app/server.js', 'Hello');
```
Result:
```
Error: Read-only file system
```
This protects source code.

## But There Is a Problem
**Your app still needs to write to:**
```
/app/feedback
/app/temp
```
Because:
```
fs.writeFileSync('/app/feedback/data.txt');
fs.writeFileSync('/app/temp/tempfile.txt');
```

**Read-only mount blocks this:**
```
/app (RO)
   ├── feedback ❌
   ├── temp ❌
```

## Override With More Specific Volumes

**Docker rule:**
```
More specific path wins
```
**Git Command**
```
docker run -d --rm -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app:ro" -v /app/node_modules -v /app/temp feedback-node:volumes
```
**Example:**
```
-v project:/app:ro
-v feedback:/app/feedback
-v /app/temp
```
**Docker sees:**
```
/app                 → Read Only
/app/feedback        → Writable Named Volume
/app/temp            → Writable Anonymous Volume
```

**Anonymous Volume for temp**
```
-v /app/temp
```
Because:
```
fs.writeFile("/app/temp/file.txt")
```
would fail if /app is read-only.

This creates:
```
/app (Read Only)
    |
    └── /temp (Writable Override)
```

## Final Architecture
```
Host Machine
│
├── Source Code
│      ↓
│   Bind Mount (RO)
│      ↓
│   /app
│
├── Named Volume
│      ↓
│   /app/feedback
│
├── Anonymous Volume
│      ↓
│   /app/temp
│
└── Anonymous Volume
       ↓
   /app/node_modules
```

## Volume Override Rule

Docker always uses:
> **Most Specific Path Wins**

**Example:**
```
-v host:/app:ro
-v feedback:/app/feedback
-v /app/temp
-v /app/node_modules
```
**Result:**
```
/app                  → Read Only
/app/feedback         → Writable
/app/temp             → Writable
/app/node_modules     → Writable
```
**Visualization:**
```
/app (RO)
│
├── server.js (RO)
├── package.json (RO)
├── pages/ (RO)
├── public/ (RO)
│
├── feedback/ (RW)
├── temp/ (RW)
└── node_modules/ (RW)
```

## Why Enterprises Use This

### Security

**Prevent application from changing source code:**
```
✓ server.js protected
✓ package.json protected
✓ config protected
```

### Stability

**Avoid accidental writes:**
```
Bad code:
fs.writeFile('/app/package.json')

Result:
Read-only error
```

**Clear Separation**
```
Code → Read Only
Data → Read Write
Logs → Read Write
Cache → Read Write
Temp Files → Read Write
```

## Similar Concept in Kubernetes

**Docker:**
```
-v app:/app:ro
-v data:/app/data
```

**Kubernetes:**
```
volumeMounts:
  - name: source
    mountPath: /app
    readOnly: true

  - name: data
    mountPath: /app/data
```

**This is very common in:**
- Banking applications
- Healthcare systems
- Microservices
- Kubernetes deployments
- Production containers

## Enterprise Standard Architecture
```
Developer
    ↓
Host Source Code
    ↓ (Bind Mount RO)
/app (Container)

            ↓
      Writable Overrides
      ├── /temp
      ├── /logs
      ├── /uploads
      └── /node_modules

            ↓
      Persistent Data
      └── Named Volumes
```
```
Application Code:
    Read Only

Logs:
    Writable

Uploads:
    Writable

Temp:
    Writable

Database Data:
    Persistent Named Volume
```

**This is a very common development setup:**
```
Bind Mount (RO)
+ Named Volume
+ Anonymous Volume
+ Volume Override
```

## This follows an important container principle:

1. Containers should be immutable.
2. Code does not change inside the container.
3. Only data changes.

This is one of the core ideas behind Docker, Kubernetes, and cloud-native architecture.


