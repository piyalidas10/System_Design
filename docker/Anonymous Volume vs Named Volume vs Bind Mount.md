# Anonymous Volume vs Named Volume vs Bind Mount
The easiest way to understand Anonymous Volume vs Named Volume vs Bind Mount is to use one small Node.js project and follow the data from:
```
Host → Image → Container → Storage
```

The most important concept is:
> **A Docker image is not where your changing/persistent data should live. The container gets a writable layer, and volumes/bind mounts provide storage outside that writable layer.**

## 1. Our example project

**Let's create this Node.js application:**
```
feedback-app/
│
├── Dockerfile
├── package.json
├── server.js
│
├── public/
│   └── index.html
│
└── data/
    └── feedback.txt
```

**Suppose server.js writes feedback into:**
```
/app/feedback/feedback.txt
```

**Inside the container, our application looks like:**
```
/app
├── server.js
├── package.json
├── node_modules/
├── public/
│   └── index.html
└── feedback/
    └── feedback.txt
```

## 2. Dockerfile
```
FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80

CMD ["node", "server.js"]
```

**Now build the image:**
```
docker build -t feedback-app .
```

**We now have:**
```
HOST MACHINE
│
├── feedback-app/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── public/
│
└── Docker Image
    └── feedback-app:latest
```

## 3. What is inside the Docker image?

**After:**
```
docker build -t feedback-app .
```

**Docker creates an image containing something conceptually like:**
```
feedback-app:latest
│
├── Base Node.js files
├── /app
│   ├── package.json
│   ├── server.js
│   ├── public/
│   │   └── index.html
│   └── node_modules/
│
└── Image layers
```
> [!NOTE]
> **Important: The image is READ-ONLY.**

**Think:**
```
                Docker Image
        ┌─────────────────────────┐
        │ Node.js                 │
        │ package.json            │
        │ server.js               │
        │ public/                 │
        │ node_modules/           │
        └─────────────────────────┘
                  │
                  │ docker run
                  ▼
```
The image itself does not change when your application writes data.

## 4. When we run the container
```
docker run \
  --name feedback-app \
  -p 3000:80 \
  feedback-app
```

**Docker creates a container writable layer above the image:**
```
Container
┌───────────────────────────────┐
│ Writable Container Layer      │ ← Changes go here
├───────────────────────────────┤
│ Image Layer                   │ ← READ ONLY
│ Node.js                       │
│ /app/server.js               │
│ /app/package.json             │
│ /app/node_modules             │
└───────────────────────────────┘
```

**If the application does means user saved feedback from through browser & server.js writes feedback into:**
```
/app/feedback/feedback.txt
```
and there is no volume mounted there, that data goes into the:
```
Container writable layer
```

**Problem**

If you remove the container:
```
docker rm feedback-app
```
the writable layer is deleted.

Therefore:
```
feedback.txt
     ↓
Container writable layer
     ↓
docker rm
     ↓
❌ DATA LOST
```
That's the problem volumes solve.

## 5. Now let's understand the three storage mechanisms

We will use the same application.

### A. Anonymous Volume

**Syntax:**
```
docker run \
  --name feedback-app \
  -v /app/feedback \
  -p 3000:80 \
  feedback-app
```

**Notice:**
```
-v /app/feedback
```
There is no name before the colon.

So Docker creates an anonymous volume.

#### What happens?

Conceptually:
```
HOST MACHINE

Docker-managed storage
        │
        ▼
┌───────────────────────────────┐
│ Anonymous Volume              │
│ random Docker-generated name  │
│                               │
│ feedback.txt                  │
└───────────────────────────────┘
        │
        │ mounted at
        ▼
CONTAINER

/app
├── server.js
├── package.json
├── node_modules/
└── feedback/  ────────────────┐
                               │
                               ▼
                         Anonymous Volume
```
The important point is:
```
/app/feedback
```
inside the container is not using the container writable layer anymore.

Instead:
```
/app/feedback
       ↓
Anonymous Volume
```

#### Where is the anonymous volume on the host?

Docker manages it.

**On a typical native Linux Docker installation, conceptually:**
```
/var/lib/docker/volumes/
```
**You might see something like:**
```
/var/lib/docker/volumes/
│
└── a8f4c9d2....../
    └── _data/
        └── feedback.txt
```
The name is automatically generated.

On **Windows with Docker Desktop**, the physical storage is managed inside Docker Desktop's Linux environment/VM rather than simply appearing as a normal Windows folder you work with directly.

You normally don't care about that physical location.

#### Anonymous volume lifecycle

**With:**
```
docker run --rm -v /app/feedback feedback-app
```
**the lifecycle is roughly:**
```
docker run
    │
    ▼
Container created
    │
    ├── Anonymous Volume created
    │
    ▼
Application writes feedback.txt
    │
    ▼
Anonymous Volume
    │
    ▼
Container removed
    │
    ▼
Anonymous volume removed with --rm
    │
    ▼
❌ Data gone
```
So anonymous volumes are not normally your choice for important persistent application data.

### B. Named Volume

**Now let's create a named volume:**
```
docker volume create feedback-data
```

**Docker creates:**
```
feedback-data
```

**Now run:**
```
docker run \
  --name feedback-app \
  -v feedback-data:/app/feedback \
  -p 3000:80 \
  feedback-app
```

**Look carefully:**
```
-v feedback-data:/app/feedback
```

**There are two parts:**
```
feedback-data : /app/feedback
      │                │
      │                └── Container path
      └─────────────────── Named volume
```

#### Named Volume architecture
```
HOST MACHINE
│
│ Docker-managed storage
│
▼
Docker Volume
┌───────────────────────────────┐
│ feedback-data                 │
│                               │
│ feedback.txt                  │
└───────────────────────────────┘
              │
              │ mount
              ▼
CONTAINER
┌───────────────────────────────┐
│ Container writable layer      │
│                               │
│ /app                          │
│ ├── server.js                │
│ ├── package.json             │
│ └── node_modules             │
│                               │
│ /app/feedback ────────────────┼──► feedback-data
└───────────────────────────────┘
```

**Now suppose the application writes:**
```
Hello World
```
to:
```
/app/feedback/feedback.txt
```

**The actual data is stored in:**
```
feedback-data
```
not in the container's writable layer.

#### Container gets deleted

**Suppose:**
```
docker rm -f feedback-app
```

**The container disappears:**
```
Container
    ❌ deleted
```

**But:**
```
feedback-data
    ✅ still exists
```

**Then we create another container:**
```
docker run \
  --name feedback-app-2 \
  -v feedback-data:/app/feedback \
  feedback-app
```

**The new container sees:**
```
/app/feedback/feedback.txt
```
with the old data.

That's the big advantage of a named volume.

#### Named Volume can be shared

**You can even do:**
```
docker run \
  --name container1 \
  -v feedback-data:/app/feedback \
  feedback-app
```
**and:**
```
docker run \
  --name container2 \
  -v feedback-data:/app/feedback \
  feedback-app
```

**Conceptually:**
```
                  Named Volume
                feedback-data
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
       Container 1        Container 2
       /app/feedback      /app/feedback
```
Both containers can access the same volume.

### C. Bind Mount

Now let's look at the most important one for development.

**Suppose your Windows project is:**
```
C:\Projects\feedback-app
```
**and contains:**
```
C:\Projects\feedback-app
│
├── Dockerfile
├── package.json
├── server.js
├── public/
│   └── index.html
└── data/
```
**Run:**
```
docker run \
  --name feedback-app \
  -v "C:\Projects\feedback-app:/app" \
  -p 3000:80 \
  feedback-app
```
**The syntax is:**
```
-v HOST_PATH : CONTAINER_PATH
```
**So:**
```
C:\Projects\feedback-app
          │
          │ bind mount
          ▼
        /app
```

#### Bind Mount architecture
```
WINDOWS HOST
┌───────────────────────────────┐
│ C:\Projects\feedback-app     │
│                               │
│ ├── Dockerfile                │
│ ├── package.json              │
│ ├── server.js                 │
│ ├── public/                   │
│ │   └── index.html            │
│ └── data/                     │
└──────────────┬────────────────┘
               │
               │ Bind Mount
               │
               ▼
CONTAINER
┌───────────────────────────────┐
│ /app                          │
│                               │
│ ├── Dockerfile                │
│ ├── package.json              │
│ ├── server.js                 │
│ ├── public/                   │
│ └── data/                     │
└───────────────────────────────┘
```
**Now you edit:**
```
C:\Projects\feedback-app\server.js
```
**The container sees the same change at:**
```
/app/server.js
```
> **No image rebuild is required just to transfer the source change.**


## 6. What happens to the Docker image?

This is extremely important.

**Suppose the image contains:**
```
IMAGE
/app
├── server.js        ← snapshot from build
├── package.json
├── node_modules
└── public/
```
**Then we run:**
```
docker run -v "C:\Projects\feedback-app:/app" feedback-app
```
**The bind mount is placed over:**
```
/app
```
**Conceptually:**
```
Before mount:

Container
/app
├── server.js
├── package.json
└── node_modules
       ↑
       From image
```

**After bind mount:**
```
Host
C:\Projects\feedback-app
       │
       │
       ▼
Container
/app
├── server.js
├── package.json
├── public/
└── data/
       ↑
       From host
```
The image's /app still exists underneath, but the bind mount hides/masks that path while the mount is active.

**This explains the problem you encountered in your lecture:**
```
Image
/app/node_modules
        │
        │
        ▼
Bind mount
C:\Projects\feedback-app → /app
        │
        ▼
/app
```

**If node_modules isn't present in your host project, the container's /app/node_modules from the image is hidden by the bind mount.**

Then:
```
Node.js
   ↓
require("express")
   ↓
Search /app/node_modules
   ↓
❌ Cannot find module 'express'
```
That's exactly why the lecture's container suddenly failed after adding the bind mount.


## 7. The standard development solution

**You commonly see:**
```
docker run \
  --name feedback-app \
  -v "C:\Projects\feedback-app:/app" \
  -v /app/node_modules \
  -p 3000:80 \
  feedback-app
```

**Notice we have two mounts:**
```
-v "C:\Projects\feedback-app:/app"
-v /app/node_modules
```
**The first:**
```
Host project
      ↓
    /app
```
**The second:**
```
Anonymous Volume
      ↓
 /app/node_modules
```

**So conceptually:**
```
HOST
C:\Projects\feedback-app
│
├── server.js
├── package.json
├── public/
└── ...
       │
       │ Bind Mount
       ▼
CONTAINER
/app
│
├── server.js ───────────► Host
├── package.json ────────► Host
├── public/ ─────────────► Host
│
└── node_modules
        │
        │ Anonymous Volume
        ▼
   Docker-managed storage
```
Now the host controls your source code, while Docker keeps node_modules separate.

This is a very common Docker development pattern.

## 8. Compare all three with the same application

**Let's say our application writes:**
```
/app/data/feedback.txt
```

### Anonymous volume
```
docker run -v /app/data feedback-app
```
```
Container
/app/data
    │
    ▼
Anonymous Volume
    │
    ▼
Docker-managed storage
```
Docker gives the volume an automatically generated name.

### Named volume
```
docker run -v feedback-data:/app/data feedback-app
```
```
Container
/app/data
    │
    ▼
Named Volume
feedback-data
    │
    ▼
Docker-managed storage
```
You control the volume's name.

### Bind mount
```
docker run \
  -v "C:\Projects\feedback-app\data:/app/data" \
  feedback-app
```
```
Windows
C:\Projects\feedback-app\data
          │
          │
          ▼
Container
/app/data
```
You control the actual host directory.

## 9. Where is the data actually saved?

This is the most important table.

| Storage                  | Container path | Host storage             | Who controls host location? |
| ------------------------ | -------------- | ------------------------ | --------------------------- |
| Container writable layer | `/app/data`    | Docker container storage | Docker                      |
| Anonymous volume         | `/app/data`    | Docker-managed volume    | Docker                      |
| Named volume             | `/app/data`    | Docker-managed volume    | Docker                      |
| Bind mount               | `/app/data`    | Your specified folder    | **You**                     |

For Docker Desktop on Windows, don't think of Docker-managed volumes as ordinary folders such as:
```
C:\Projects\...
```
Docker Desktop manages those volumes inside its Linux environment.

For bind mounts, however, the host path really is your Windows filesystem:
```
C:\Projects\feedback-app
```

## 10. The complete Docker storage picture

Think of Docker like this:
```
                    DOCKER IMAGE
             ┌─────────────────────┐
             │ Node.js              │
             │ package.json         │
             │ server.js            │
             │ node_modules         │
             └──────────┬──────────┘
                        │
                   docker run
                        │
                        ▼
             ┌─────────────────────┐
             │ CONTAINER           │
             │                     │
             │ Writable Layer      │
             │ ─────────────────── │
             │ Changes not mounted │
             └──────────┬──────────┘
                        │
            ┌───────────┼───────────────┐
            │           │               │
            ▼           ▼               ▼
       Anonymous      Named         Bind Mount
        Volume        Volume
            │           │               │
            ▼           ▼               ▼
        Docker       Docker          Windows
       managed      managed         filesystem
       storage      storage
```

## 11. When should you use which?
### Anonymous Volume

Use when:
> **"I need Docker-managed storage for this container, but I don't need to reuse it explicitly later."**

Typical example:
```
/app/node_modules
```
in some development setups.

### Named Volume

Use when:
> **"I need important persistent application data that should survive container replacement."**

Typical examples:
- PostgreSQL data
- Redis persistence
- uploaded files
- application-generated persistent data

Example:
```
docker run \
  -v postgres-data:/var/lib/postgresql/data \
  postgres
```
The container can be destroyed and recreated while:
```
postgres-data
```
continues to exist.

## 12. One final mental model

**If you remember only this, remember:**
```
                 IMAGE
        ┌─────────────────────┐
        │ Read-only template  │
        └──────────┬──────────┘
                   │
                   ▼
              CONTAINER
        ┌─────────────────────┐
        │ Writable Layer      │
        │                     │
        │ Temporary changes   │
        └─────────────────────┘
                   │
       ┌───────────┼─────────────┐
       │           │             │
       ▼           ▼             ▼

   Anonymous      Named       Bind Mount
     Volume       Volume
       │            │             │
       ▼            ▼             ▼
    Docker       Docker       Your Host
    managed      managed      folder
    storage      storage
```

**The interview version**
```
Image = immutable application template
Container writable layer = temporary container-specific changes
Anonymous volume = Docker-managed storage associated with a container
Named volume = Docker-managed persistent storage with a reusable name
Bind mount = a specific host directory mapped into the container
```

**And the most important distinction:**
```
Named Volume
     ↓
Docker decides WHERE

Bind Mount
     ↓
YOU decide WHERE
```





