## 🐳 What is Docker (in simple words)?
Ans. Docker lets you run applications inside containers.

Think of a container as:
```
📦 A lightweight box that has everything an app needs
(OS libs + runtime + config + app)
```
So instead of:
  -  “It works on my machine 🤷‍♂️”
  -  Installing PostgreSQL manually
  -  Fighting with versions, ports, configs

You just say:
```
docker run postgres
```
…and PostgreSQL runs exactly the same everywhere.

**Key benefits**  
✅ No local installation mess  
✅ Same setup for DEV / QA / PROD  
✅ Easy to start / stop / delete  
✅ Multiple DB versions side-by-side  

**🧠 Docker vs VM**  
| Docker            | Virtual Machine  |
| ----------------- | ---------------- |
| Lightweight       | Heavy            |
| Starts in seconds | Takes minutes    |
| Shares host OS    | Own full OS      |
| Perfect for dev   | Mostly for infra |

**The interview version**
1. Image = immutable application template
2. Container writable layer = temporary container-specific changes
3. Anonymous volume = Docker-managed storage associated with a container
4. Named volume = Docker-managed persistent storage with a reusable name
5. Bind mount = a specific host directory mapped into the container

## 🐳 Docker — Big Picture
```
                         DOCKER
                           │
          ┌────────────────┴────────────────┐
          │                                 │
       IMAGE                            CONTAINER
   (Blueprint)                       (Running App)
          │                                 │
          │                                 ├── ENV
          │                                 │   Runtime config
          │                                 │
          │                                 └── Storage
          │                                      │
          │                         ┌────────────┼────────────┐
          │                         │            │            │
          │                       Volume     Bind Mount    tmpfs
          │
          └── ARG
              Build-time values
```

### 1. 🖼️ Docker Image

A Docker image is an immutable blueprint/template used to create containers.

**Example:**
```
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

**Build:**
```
docker build -t my-node-app .
```

**Result:**
```
Dockerfile
    ↓
docker build
    ↓
Docker IMAGE
    ↓
docker run
    ↓
CONTAINER
```

Think:
> **Image = packaged application + runtime + dependencies**

### 📦 Docker Container

**A container is a running instance of an image. Containers can read + write data, but written data is lost if the container is removed.**
```
docker run -d \
  --name my-app \
  -p 3000:3000 \
  my-node-app
```

**Conceptually:**
```
              IMAGE
        ┌─────────────────┐
        │ Node.js         │
        │ Dependencies    │
        │ Application     │
        │ Files           │
        └────────┬────────┘
                 │
          docker run
                 ↓
        ┌─────────────────┐
        │   CONTAINER     │
        │                 │
        │ Running process │
        │ Writable layer  │
        └─────────────────┘
```

**You can create multiple containers from one image:**
```
            my-node-app IMAGE
                    │
          ┌─────────┼─────────┐
          ↓         ↓         ↓
      container1 container2 container3
```

### 3. 🏗️ ARG — Build-Time Variable

ARG is available **while building the image**.
```
ARG NODE_VERSION=20

FROM node:${NODE_VERSION}

WORKDIR /app
COPY . .
```

**Build:**
```
docker build \
  --build-arg NODE_VERSION=22 \
  -t my-app .
```

**Flow:**
```
docker build
     │
     │ --build-arg
     ↓
    ARG
     │
     ↓
Dockerfile
     │
     ↓
  IMAGE
```

**Important**

ARG is primarily for build-time configuration.
```
ARG
 │
 └── BUILD
       ↓
     IMAGE
```

**Examples:**
```
ARG NODE_VERSION=20
ARG APP_VERSION=1.0
ARG BUILD_ENV=production
```

**Use it for things such as:**
- Node/Python version
- package version
- build configuration
- selecting build stages
- compiler/build flags

⚠️ Don't use ARG for secrets. Build arguments can become visible through image build history/metadata depending on how they're used.

### 4. 🌎 ENV — Environment Variable

ENV provides environment variables to the image/container.
```
ENV NODE_ENV=production
ENV PORT=3000
```
**Inside the container:**
```
echo $NODE_ENV
```
**Output:**
```
production
```
**You can also override it at runtime:**
```
docker run \
  -e NODE_ENV=development \
  -e PORT=4000 \
  my-app
```
**Flow:**
```
Dockerfile
    │
    │ ENV
    ↓
  IMAGE
    │
    │ docker run -e
    ↓
CONTAINER
    │
    ↓
Environment variables
```

**ARG vs ENV**

|                          | ARG                 | ENV                   |
| ------------------------ | ------------------- | --------------------- |
| Available during build   | ✅                   | ✅                     |
| Available at runtime     | ❌ normally          | ✅                     |
| Set with `docker build`  | ✅                   | ❌                     |
| Set with `docker run -e` | ❌                   | ✅                     |
| Typical use              | Build configuration | Runtime configuration |

**Example:**
```
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}

ENV NODE_ENV=production
ENV PORT=3000
```
Then:
```
docker build --build-arg NODE_VERSION=22 -t my-app .
```
and:
```
docker run -e NODE_ENV=development my-app
```

### 5. 💾 Container Storage

Every container gets a writable container layer.
```
             Docker Image
        ┌──────────────────┐
        │ Read-only layers │
        └────────┬─────────┘
                 │
                 ↓
        ┌──────────────────┐
        │ Container layer  │
        │ Read + Write     │
        └──────────────────┘
```
Suppose your application writes:
```
/app/data.txt
```
That file is written into the container's writable layer unless /app or /app/data is mounted somewhere else.

**Problem**

If the container is removed:
```
docker rm my-app
```
data stored only in that writable layer is removed with the container.

Therefore:
> **Container writable storage should generally not be used for important persistent application data.**

### 6. 📦 Volume

**A Docker volume is persistent storage managed by Docker. Volumes can help us with storing data especially with data that should survive container removal.**

**Volumes** are specialized folders on your **host machine hard drive** that are **mounted** ("made available" or mapped) directly into running **Docker containers**.
The workflow establishes a strict bridge between the isolated container environment and your persistent local filesystem:

```
+-------------------------------------------------------------+
|                     Host (Your Computer)                    |
|                                                             |
|   [ /some-path ]  ===============>  [ /app/user-data ]      |
|    (Host Pathway)       (Mount)      (Internal Container)   |
|                                                             |
+-------------------------------------------------------------+
                              ||
                              \/
+-------------------------------------------------------------+
|                      Docker Container                       |
+-------------------------------------------------------------+
```

* **Host Directory Target:** `/some-path`  
* **Container Mount Destination:** `/app/user-data`  

#### 1. Persistent Storage Lifecycle
* Volumes **persist completely** even if a container shuts down, crashes, or is removed.
* When a container (re-)starts and mounts the identical volume, any preexisting data inside that volume immediately becomes available within the container.

#### 2. Bidirectional Data Flow
* A container can **write new data** directly into the mounted volume.
* A container can **read existing data** out from the volume in real time.

#### Option A: Using the `-v` / `--volume` flag
```bash
docker run -d \
  --name my-container \
  -v /some-path:/app/user-data \
  my-image:latest
```

#### Option B: Using the clearer `--mount` flag
```bash
docker run -d \
  --name my-container \
  --mount type=bind,source=/some-path,target=/app/user-data \
  my-image:latest
```

#### Example
```
docker volume create app-data
```

**Run:**
```
docker run \
  -v app-data:/app/data \
  my-app
```

**Architecture:**
```
             CONTAINER
        ┌─────────────────┐
        │                 │
        │ /app            │
        │                 │
        │ /app/data ──────┼────────┐
        └─────────────────┘        │
                                   ↓
                            Docker Volume
                            ┌─────────────┐
                            │ app-data    │
                            │ Persistent  │
                            └─────────────┘
```

**Remove container:**
```
docker rm my-app
```

**Volume remains:**
```
app-data
   │
   └── DATA STILL EXISTS
```

**Create another container:**
```
docker run \
  -v app-data:/app/data \
  my-app
```
It can access the same data.

**Best suited for**
- PostgreSQL
- MySQL
- Redis persistent data
- uploaded files
- application-generated persistent data

### 7. 🔗 Bind Mount

**A bind mount connects a specific directory on your host machine directly to a directory inside the container.**

**A bind mounts can help us with direct container interaction. For example, with our source code, that should be updatable by us and where the latest source code should then always be available inside of the container.**

**When you use a bind mount, a file or directory on the host machine is mounted from the host into a container. are strongly tied to the host.**

**Example:**
```
docker run \
  -v ${PWD}:/app \
  my-app
```
**Architecture:**
```
      WINDOWS HOST
┌───────────────────────┐
│                       │
│  C:\projects\my-app   │
│          │            │
└──────────┼────────────┘
           │
       Bind Mount
           │
           ↓
┌───────────────────────┐
│      CONTAINER        │
│                       │
│      /app             │
│                       │
└───────────────────────┘
```
**Now:**
```
Host server.js
      ↕
Container /app/server.js
```
**If you edit:**
```
server.js
```
on your host, the container sees the change immediately.

That's why bind mounts are extremely useful for development.

### 8. Volume vs Bind Mount

This is one of the most important Docker concepts.

| Feature                     | Volume    | Bind Mount                             |
| --------------------------- | --------- | -------------------------------------- |
| Managed by Docker           | ✅         | ❌                                      |
| Host path explicitly chosen | ❌         | ✅                                      |
| Persistent                  | ✅         | ✅                                      |
| Easy to edit from host      | Usually ❌ | ✅                                      |
| Development source code     | Usually ❌ | ✅                                      |
| Database data               | ✅         | Possible, but volume usually preferred |
| Docker-managed storage      | ✅         | ❌                                      |

**Development**
```
docker run \
  -v ${PWD}:/app \
  my-app
```
Use bind mount.

**Database**
```
docker run \
  -v postgres-data:/var/lib/postgresql/data \
  postgres
```
Use a named volume.

## 9. 🔥 Complete Example

Imagine you're building a Node.js application.

**Dockerfile**
```
ARG NODE_VERSION=20

FROM node:${NODE_VERSION}

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
```

**Build:**
```
docker build \
  --build-arg NODE_VERSION=22 \
  -t my-node-app .
```

**Here:**
```
ARG NODE_VERSION
        ↓
      BUILD
        ↓
      IMAGE
```

**Then run:**
```
docker run -d \
  --name my-node-container \
  -p 3000:3000 \
  -e NODE_ENV=development \
  -v ${PWD}:/app \
  my-node-app
```

**Now:**
```
                 DOCKER
                   │
             ┌─────┴─────┐
             │            │
           IMAGE       CONTAINER
             │            │
             │            ├── ENV
             │            │   NODE_ENV
             │            │
             │            ├── Writable Layer
             │            │
             │            └── /app
             │                 │
             │                 └── Bind Mount
             │                       │
             │                       ↓
             │                    HOST CODE
             │
             └── created using
                    ARG
```

## 🧠 The Most Important Mental Model

**Remember this:**
```
                 Dockerfile
                     │
              ┌──────┴──────┐
              │             │
             ARG           ENV
              │             │
        Build-time       Runtime
              │             │
              ↓             ↓
          docker build   docker run
              │             │
              └──────┬──────┘
                     ↓
                  IMAGE
                     │
                 docker run
                     ↓
                CONTAINER
                     │
             ┌───────┴────────┐
             │                │
        Writable Layer    Mounted Storage
                              │
                    ┌─────────┴─────────┐
                    │                   │
                  Volume            Bind Mount
                    │                   │
              Docker-managed       Host directory
              persistent data      live development
```

**One-line interview definitions**
1. Image → Immutable blueprint used to create containers.
2. Container → Running instance of an image.
3. ARG → Build-time variable.
4. ENV → Environment variable available to the container at runtime.
5. Container writable layer → Temporary storage tied to the container lifecycle.
6. Volume → Docker-managed persistent storage.
7. Bind mount → Host directory mounted directly into a container.
8. Storage → Mechanism for keeping data beyond the lifetime of a container.

**Enterprise rule of thumb**
```
Application source code
        ↓
   Bind Mount
   (Development)

Database / persistent application data
        ↓
      Volume
   (Production)

Runtime configuration
        ↓
       ENV

Build configuration
        ↓
       ARG

Secrets
        ↓
Secret management
(not ARG / hard-coded ENV)
```

## Docker Storage
✅ Volume: A folder / file inside of a Docker container which is connected to some folder outside of the container.  
✅ Bind Mount: A Bind Mount connects a specific folder/file on your host machine directly to a folder/file inside the Docker container. **The idea is that we can edit our source code in the project folder, and changes are automatically available inside of the container.**

```
-v host-path:container-path → Bind Mount
-v volume-name:container-path → Named Volume
-v container-path → Anonymous Volume
```

## Docker File
A Dockerfile is a text document that contains all the commands a user could call on the command line to assemble an image in Docker. When you run a command to build a Docker image, Docker reads these instructions from the Dockerfile to automatically build a new image according to your specifications.

## Docker containers

Docker containers need a Docker Engine (container runtime environment) to run. Docker Engine itself runs on a host OS; that host can be your laptop, a VM, or a physical/cloud server.
```
Docker ≠ server.
```
Docker Engine runs on a host. 
Containers run through the Docker Engine. 

**Docker needs a Docker Engine, not necessarily a separate physical server**

On your Windows laptop:
```
┌───────────────────────────────────────┐
│           Your Laptop                 │
│                                       │
│  Windows Host OS                      │
│       │                               │
│       ↓                               │
│  Docker Desktop                       │
│       │                               │
│       ↓                               │
│  Docker Engine / Linux VM             │
│       │                               │
│       ├── Container: nginx            │
│       ├── Container: alpine           │
│       └── Container: your-app         │
│                                       │
└───────────────────────────────────────┘
```
So when you execute:
```
docker run nginx
```
Docker isn't magically running the container directly from the docker CLI.

The architecture is roughly:
```
docker CLI
    │
    │ API request
    ↓
Docker Engine (daemon)
    │
    ↓
Container
```

## Is your laptop a server?

It can act as the Docker host, but it doesn't have to be a traditional server machine.

For example, your Windows laptop can be:
```
Windows Laptop
      ↓
Docker Desktop
      ↓
Docker Engine
      ↓
Linux Containers
```
You don't need to rent an AWS/Azure server just to run Docker locally.

## In production

You commonly have an actual server/VM:
```
Cloud VM / Physical Server
          ↓
    Linux OS
          ↓
    Docker Engine
          ↓
   ┌──────┼──────┐
   ↓      ↓      ↓
 App    Redis   Nginx
```

## Docker Container Storage

> **Stopping a container does NOT delete its writable data. Removing/deleting the container does.**

Ephemeral storage loses all its data when a container is deleted, whereas persistent storage ensures data survives container deletion by saving it directly to the host filesystem.Here is a direct comparison of the two storage types shown in the diagram:

| **Storage Type**       | **Data after Container Stop** | **Data after Container Deletion** | **Implementation**            |
| ---------------------- | ----------------------------- | --------------------------------- | ----------------------------- |
| **Ephemeral Storage**  | ✅ Retained                    | ❌ **Lost**                        | Container writable layer      |
| **Persistent Storage** | ✅ Retained                    | ✅ **Saved**                       | Bind mounts or Docker volumes |

| Feature                | **Ephemeral Storage**                                                                                                                                              | **Persistent Storage**                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Data Lifespan**      | Tied to the container lifecycle; data in the writable layer is lost when the container is deleted.                                                                 | Independent of the container lifecycle; data remains until the volume/mount is explicitly removed or deleted.                         |
| **Default Location**   | Container's writable layer, typically implemented using a storage driver such as `overlay2`; can also use **`tmpfs`** for explicitly configured in-memory storage. | Docker-managed **Volumes** or user-specified host paths via **Bind Mounts**.                                                          |
| **Performance**        | Writable layer can have copy-on-write/storage-driver overhead. **`tmpfs`** is very fast because it uses memory, but data is lost when the container stops.         | Depends on the underlying host storage. Volumes generally provide good performance and are preferred for persistent application data. |
| **Best Used For**      | Temporary files, caches, intermediate build artifacts, scratch data, and other disposable application data.                                                        | Databases such as PostgreSQL/MySQL, user uploads, application state, and important persistent data.                                   |
| **Container Deletion** | ❌ Data in the container writable layer is deleted with the container.                                                                                              | ✅ Data in a volume/bind mount normally survives container deletion.                                                                   |
| **Container Stop**     | ✅ Writable-layer data remains because the container still exists.                                                                                                  | ✅ Persistent data remains.                                                                                                            |
| **Backup / Migration** | More difficult and generally not intended for long-term storage.                                                                                                   | Easier to back up, migrate, and manage independently of containers.                                                                   |

**Think of Docker storage as:**
```
                    Docker Container
              ┌─────────────────────────┐
              │ Application             │
              │                         │
              │ Writable Layer          │
              │ ─────────────────────── │
              │ Ephemeral Data          │
              └───────────┬─────────────┘
                          │
                   container deleted
                          │
                          ▼
                       ❌ LOST


              ┌─────────────────────────┐
              │ Application             │
              └───────────┬─────────────┘
                          │
                    /var/lib/postgresql
                          │
                          ▼
              ┌─────────────────────────┐
              │ Docker Volume           │
              │                         │
              │ Persistent Data         │
              └─────────────────────────┘
                          │
                   container deleted
                          │
                          ▼
                       ✅ SAFE
```
```
Container writable layer
        │
        ├── docker stop  → ✅ remains
        └── docker rm    → ❌ lost


tmpfs
        │
        ├── docker stop  → ❌ lost
        └── docker rm    → ❌ lost
```
So tmpfs is actually more ephemeral than the normal writable layer.

**Enterprise rule of thumb**
```
Stateless application
        │
        ├── Temporary files ──► Writable layer / tmpfs
        │
        ├── Cache ────────────► Redis / cache / ephemeral storage
        │
        └── Logs ─────────────► Logging system


Stateful application
        │
        ├── PostgreSQL ───────► Docker Volume
        ├── MySQL ─────────────► Docker Volume
        ├── User uploads ──────► Volume / external storage
        └── Important files ───► Persistent storage
```

### Core Docker storage lifecycle
```
docker stop
     │
     ▼
Container still exists
     │
     ├── Writable layer ──► ✅ Data remains
     │
     └── Volume / Bind Mount ──► ✅ Data remains
     
     
docker rm
     │
     ▼
Container deleted
     │
     ├── Writable layer ──► ❌ Data lost
     │
     └── Volume / Bind Mount ──► ✅ Data remains
```

**Why?**

The important concept is ownership:
```
Container writable layer
        │
        └── Owned by container
                 │
            docker rm
                 ▼
              ❌ Gone
```
```
Docker Volume / Bind Mount
        │
        └── Independent of container
                 │
            docker rm
                 ▼
              ✅ Remains
```

**Example**

If you run:
```
docker run --name myapp alpine sh -c "echo hello > /data.txt"
```
The /data.txt file is inside the container's writable layer.
```
docker stop myapp
docker start myapp
```
➡️ data.txt is still there.

But:
```
docker rm myapp
```
➡️ data.txt is gone permanently.

**With a Docker volume**
```
docker volume create mydata

docker run --name myapp \
  -v mydata:/data \
  alpine sh -c "echo hello > /data/data.txt"
```
Now:
```
Container
┌─────────────────────────┐
│ Writable Layer          │ ← Ephemeral
│                         │
│ /data ──────────────────┼──────► Docker Volume
└─────────────────────────┘             │
                                        │
                                  Persistent Data
```
After:
```
docker rm myapp
```
the container disappears, but:
```
Docker Volume
    │
    └── data.txt ✅ remains
```
You can attach the same volume to a new container.

**"Persistent storage" doesn't mean the container itself persists.**

It means the data is stored outside the container's writable layer, so deleting the container doesn't delete that data.

**So the easiest rule to remember is:**
```
Container writable layer = tied to container → delete container → data lost
Volume / bind mount = outside container → delete container → data remains
```
Also, docker stop does not delete a container. It only stops it, which is why even ephemeral data remains until the container itself is removed.

### 1. Ephemeral storage

**When you create a container:**
```
Docker Image
    ↓
Container
    ↓
Writable container layer
```

**For example:**
```
docker run --name alpine alpine
```

If the application writes:
```
/app/data.txt
```
that data exists in the container's writable layer.

If you:
```
docker stop alpine
```
the container still exists, so the data is still there.

But if you:
```
docker rm alpine
```
the container and its writable layer are removed:
```
Container removed
      ↓
Writable layer removed
      ↓
Data LOST
```
So:
```
STOP container  → data remains
START container → data available
REMOVE container → data lost
```

### 2. Persistent storage

Persistent storage means the important data is stored outside the container's writable layer.

Docker commonly provides two approaches:
```
                 Persistent Storage
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
         Bind Mount            Volume
              │                   │
        Host directory       Docker-managed
                              storage
```

**Bind mount**

Example:
```
docker run \
  -v $HOME/webdata:/usr/share/nginx/html \
  nginx
```
Conceptually:
```
Your Host
┌──────────────────────┐
│ ~/webdata            │
│                      │
│ index.html            │
└──────────┬───────────┘
           │
       bind mount
           │
           ↓
┌─────────────────────────┐
│ nginx container         │
│                         │
│ /usr/share/nginx/html   │
└─────────────────────────┘
```
Delete the container:
```
docker rm nginx
```
The host directory:
```
~/webdata
```
still exists.

### The key difference

A container's writable layer is ephemeral: its data survives a stop/restart but is lost when the container is removed. For data that must survive container replacement, use a Docker volume or bind mount.

Container storage is not the same thing as image storage. The image is the immutable template; the container gets its own writable layer on top of that image.

Think of a container like a temporary workspace:
```
              Container
          ┌───────────────┐
          │ Application   │
          │               │
          │ Temporary     │
          │ data          │
          └───────────────┘
                  │
             remove container
                  ↓
              DATA LOST
```
Persistent storage is like keeping your important files outside that workspace:
```
              Container
          ┌───────────────┐
          │ Application   │
          └───────┬───────┘
                  │
             mount/volume
                  │
                  ↓
        ┌───────────────────┐
        │ Persistent Data   │
        │                   │
        │ DB files          │
        │ uploads           │
        │ documents         │
        └───────────────────┘

        Container removed
               ↓
        Persistent data
          still exists
```

## 🚀 Understanding How Docker Works — Simplified!!!

<img src="imgs/docker_works.gif" width="90%" />

The image above perfectly illustrates the core workflow of Docker and how different components interact to build, pull, and run containers.

🔹 **Docker Client** : This is where everything begins. When you run commands like docker build, docker pull, or docker run, the client sends these instructions to the Docker Daemon.

🔹 **Docker Daemon (Engine)**
 - The heart of Docker!
  - It handles all the heavy lifting—building images, pulling them from registries, and creating/running containers.

🔹 **Images & Containers**
  - 🔸 Images are like blueprints (e.g., Ubuntu, Nginx).
  - 🔸Containers are running instances created from these images.

**The image also highlights how:**
  - 🔸 Build commands create images.
  - 🔸 Pull commands fetch images from the Docker Registry.
  - 🔸 Run commands start containers using these images.

🔹 **Docker Registry (Docker Hub)**
  - This is where all base and custom images are stored. Your daemon pulls images from here, and you can also push your own.

💡 **In short:**
  - Docker makes application deployment easy by packaging apps into lightweight, portable containers. This visual shows exactly how each part works together to streamline development and operations.


## Install Docker Desktop (Windows)

Prerequisites
  -  Windows 10/11 (64-bit)
  -  Enable WSL 2

Steps
  -  Download Docker Desktop 👉 https://www.docker.com/products/docker-desktop/
  -  Install → keep defaults
  -  Restart system
  -  Open Docker Desktop ✔️ Status should be Running

Verify:
```
docker --version
docker compose version
```


