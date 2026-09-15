# Dockerfile
A Dockerfile is a text document that contains all the commands a user could call on the command line to assemble an image in Docker. 
When you run a command to build a Docker image, Docker reads these instructions from the Dockerfile to automatically build a new image according to your specifications.

## 1. Start with a very basic Dockerfile

**Let's create a simple Node.js application.**
```
Project
my-docker-app/
├── Dockerfile
├── package.json
└── server.js
```

**server.js**
```
const http = require("http");

const server = http.createServer((req, res) => {
  res.end("Hello from Docker!");
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

**package.json**
```
{
  "name": "my-docker-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  }
}
```

## 2. Create your first Dockerfile
```
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```
Now let's understand every instruction.

## 3. FROM — Choose the base image
```
FROM node:22-alpine
```
**Think:**
```
Dockerfile
    ↓
FROM node:22-alpine
    ↓
Start with an existing Node.js environment
```
Instead of installing Linux + Node.js manually, Docker starts from an existing image.

**Conceptually:**
```
node:22-alpine
│
├── Linux
├── Node.js
└── npm
```
alpine is a lightweight Linux distribution commonly used for small container images.

## 4. WORKDIR — Choose the working directory
```
WORKDIR /app
```

**Inside the container:**
```
/
├── bin
├── etc
├── usr
└── app
     └── ← application runs here
```

**It is similar to:**
```
cd /app
```
but Docker's WORKDIR is preferable because it establishes the working directory for subsequent instructions.

## 5. COPY — Copy files into the image
```
COPY package*.json ./
```
This means:
```
Your computer                    Docker image
──────────────                   ────────────

package.json       ──────────→   /app/package.json
package-lock.json  ──────────→   /app/package-lock.json
```
Then:
```
COPY . .
```
- 1st dot refers current project directly
- 2nd dot refers the working directory 

means:
```
Current project directory
          │
          ↓
       /app
```
**So eventually:**
```
/app
├── package.json
├── package-lock.json
└── server.js
```

## 6. RUN — Execute something while building
```
RUN npm install
```
This happens during image creation.

**Think:**
```
docker build
     │
     ├── FROM
     ├── WORKDIR
     ├── COPY
     ├── RUN npm install   ← happens now
     ├── COPY
     └── image created
```
The result becomes part of the image.

**For example:**
```
RUN npm install
       ↓
node_modules created
       ↓
stored in image layer
```

**Important distinction**

RUN:
> **Execute while building the image**

CMD:
> **Execute when starting the container**

This distinction is extremely important.

## 7. CMD — Default container startup command
```
CMD ["npm", "start"]
```

**When you execute:**
```
docker run my-app
```

**Docker essentially starts:**
```
npm start
```
inside the container.

So:
```
docker build
      ↓
creates IMAGE
      ↓
docker run
      ↓
creates CONTAINER
      ↓
CMD ["npm", "start"]
      ↓
application starts
```

## 8. EXPOSE — Document the application port
```
EXPOSE 3000
```
This tells Docker:
> **This application is expected to listen on port 3000.**

But EXPOSE does not publish the port to your host.

**You still need:**
```
docker run -p 3000:3000 my-app
```

**The mapping is:**
```
HOST                         CONTAINER
────────────────────────────────────────

localhost:3000  ──────────→  :3000
```

## 9. Now understand docker build

**This is the command you really want to understand deeply:**
```
docker build -t my-app .
```

**Break it apart:**
```
docker
  │
  └── build
       │
       ├── -t my-app
       │      │
       │      └── image name/tag
       │
       └── .
              │
              └── build context
```
The . is important.

It means:
> **Use the current directory as the build context.**

**If you're inside:**
```
C:\projects\my-docker-app
```
**then:**
```
docker build -t my-app .
```
**means:**
```
C:\projects\my-docker-app
        │
        ├── Dockerfile
        ├── package.json
        └── server.js
                │
                ↓
          Docker build context
```

## 10. What actually happens during docker build?

This is the most important mental model.

**Given:**
```
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

**Docker processes it roughly like this:**
```
                 docker build -t my-app .
                           │
                           ↓
                 Read Dockerfile
                           │
                           ↓
              ┌─────────────────────┐
              │ FROM node:22-alpine │
              └──────────┬──────────┘
                         ↓
                    Base image
                         │
                         ↓
                  WORKDIR /app
                         │
                         ↓
              COPY package*.json ./
                         │
                         ↓
                  RUN npm install
                         │
                         ↓
                   COPY . .
                         │
                         ↓
                  EXPOSE 3000
                         │
                         ↓
                  CMD ["npm","start"]
                         │
                         ↓
                  ┌─────────────┐
                  │  my-app     │
                  │   IMAGE     │
                  └─────────────┘
```

## 11. Then run the image

Build:
```
docker build -t my-app .
```

**Check:**
```
docker images
```

**You should see something similar to:**
```
REPOSITORY    TAG       IMAGE ID
my-app        latest    abc123...
```

**Now create a container:**
```
docker run -p 3000:3000 my-app
```

**Then:**
```
Browser
   │
   │ http://localhost:3000
   ↓
Host port 3000
   │
   ↓
Container port 3000
   │
   ↓
Node.js
   │
   ↓
server.js
```

## 12. The most important Dockerfile instructions

Once you understand these four, expand your knowledge:

| Instruction   | Purpose                 | When it happens       |
| ------------- | ----------------------- | --------------------- |
| `FROM`        | Select base image       | Build                 |
| `RUN`         | Execute build command   | Build                 |
| `COPY`        | Copy files              | Build                 |
| `CMD`         | Default startup command | Container startup     |
| `WORKDIR`     | Set working directory   | Build/runtime context |
| `EXPOSE`      | Document port           | Metadata              |
| `ENV`         | Environment variable    | Build/runtime         |
| `ARG`         | Build-time variable     | Build                 |
| `ENTRYPOINT`  | Main executable         | Container startup     |
| `ADD`         | Copy + extra features   | Build                 |
| `USER`        | Set container user      | Build/runtime         |
| `HEALTHCHECK` | Define health check     | Runtime               |

## 13. RUN vs CMD — remember this

This is a very common interview question.
```
RUN
RUN npm install
```

means:
> **Do this when creating the image.**

CMD
```
CMD ["npm", "start"]
```

means:
> **Do this when creating a container from the image.**

Visual:
```
              docker build
                   │
                   ↓
        ┌────────────────────┐
        │ RUN npm install    │
        └────────────────────┘
                   │
                   ↓
                IMAGE
                   │
                   │ docker run
                   ↓
        ┌────────────────────┐
        │ CMD npm start      │
        └────────────────────┘
                   │
                   ↓
              CONTAINER
```

## 14. Why COPY package*.json before COPY . .?

This is where Docker layer caching becomes important.

**Instead of:**
```
COPY . .

RUN npm install
```

**prefer:**
```
COPY package*.json ./

RUN npm install

COPY . .
```

**Why?**

Suppose you change:
```
server.js
```
but don't change:
```
package.json
```
Docker can potentially reuse the cached:
```
RUN npm install
```
layer.

Conceptually:
```
FROM node
      ↓
COPY package.json
      ↓
RUN npm install        ← CACHE
      ↓
COPY server.js         ← changed
      ↓
NEW IMAGE
```
This makes builds faster.

## 15. .dockerignore

**You should also create:**
```
.dockerignore
```

**Example:**
```
node_modules
.git
.gitignore
Dockerfile
README.md
.env
dist
coverage
```
This prevents unnecessary files from entering the build context.

**Without it:**
```
Project
├── node_modules       ❌ huge
├── .git               ❌ unnecessary
├── dist               ❌ unnecessary
├── source
└── Dockerfile
```
**With .dockerignore:**
```
Project
├── source             ✅
├── package.json       ✅
├── Dockerfile         ✅
└── .dockerignore      ✅
```

## 16. The complete learning path I'd recommend

Since you're learning Docker for enterprise application architecture, don't stop at FROM/RUN/CMD/COPY.

**Learn this progression:**
```
LEVEL 1
│
├── Dockerfile
├── FROM
├── RUN
├── COPY
├── CMD
└── docker build
        │
        ↓
LEVEL 2
│
├── docker run
├── EXPOSE
├── -p port mapping
├── ENV
├── .dockerignore
└── Docker layers/cache
        │
        ↓
LEVEL 3
│
├── Volumes
├── Bind mounts
├── Networks
├── Docker Compose
└── Environment configuration
        │
        ↓
LEVEL 4
│
├── Multi-stage builds
├── Non-root containers
├── Health checks
├── Image optimization
└── Security scanning
        │
        ↓
LEVEL 5 — Enterprise
│
├── Docker Compose
├── CI/CD
├── Container registry
├── Kubernetes
├── Horizontal scaling
├── Secrets
├── Observability
└── Production deployment
```

**One mental model to keep**
```
                 DOCKERFILE
                     │
                     │ docker build
                     ↓
                   IMAGE
                     │
                     │ docker run
                     ↓
                 CONTAINER
                     │
                     ↓
                APPLICATION
```
And:
```
Dockerfile = Recipe
Image      = Packaged application
Container  = Running instance of that image
```
That's the foundation you need before moving into Docker Compose → multi-container applications → Kubernetes.



