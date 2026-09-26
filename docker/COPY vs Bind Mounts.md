# COPY vs Bind Mounts

> **Bind mounts are primarily a development mechanism; COPY in the Dockerfile is what makes the image self-contained and deployable.**

## Development vs Production
|              | Development                          | Production              |
| ------------ | ------------------------------------ | ----------------------- |
| Source code  | Host machine                         | Baked into image        |
| `COPY . .`   | Technically hidden by bind mount     | **Required**            |
| Bind mount   | `-v ./app:/app`                      | Usually **not used**    |
| Code changes | Immediately reflected                | New image must be built |
| Image        | Can be used, but mount supplies code | **Complete snapshot**   |
| Goal         | Fast development                     | Reproducible deployment |

## Your Dockerfile:
```
FROM node:20

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 80

CMD ["node", "server.js"]
```

## During development you might run:
```
docker run -d \
  -p 3000:80 \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  --name feedback-app \
  feedback-node
```
Here:
```
Docker Image
    │
    ├── /app/package.json
    ├── /app/server.js       ← exists in image
    └── /app/node_modules
             │
             ▼
      Bind mount overlays /app
             │
             ▼
      Host project folder
      /app/server.js
      /app/public/...
```

So the bind mount hides/overlays the image's /app contents while the container is running.

**That's why you can think:**
```
COPY . .
     ↓
"Create a snapshot for the image"

-v ./project:/app
     ↓
"During development, replace that snapshot with my live source code"
```

## Why COPY . . matters

**Suppose you build:**
```
docker build -t feedback-node .
```
**The resulting image contains your application:**
```
feedback-node
│
├── Node runtime
├── npm dependencies
├── server.js
├── public/
├── package.json
└── application code
```

**You can then push that image to a registry and deploy it to a server/Kubernetes:**
```
Developer
   │
   │ docker build
   ▼
Docker Image
   │
   │ docker push
   ▼
Container Registry
   │
   │ pull
   ▼
Production Server / Kubernetes
   │
   ▼
Container
```
There is no developer's source-code folder mounted into the production container.

## One very important distinction

Don't think:
> **"The Docker image itself is a container."**

**Instead:**
```
Dockerfile
    │
    │ docker build
    ▼
Docker IMAGE
(snapshot/template)
    │
    │ docker run
    ▼
Docker CONTAINER
(running instance)
```

**And the bind mount is an additional runtime mechanism:**
```
Docker IMAGE
     +
Bind Mount
     ↓
Running CONTAINER
```

## Enterprise rule of thumb
```
A good mental model is:

                 DEVELOPMENT
                 ───────────
Host source code
      │
      │ bind mount
      ▼
Container


                 PRODUCTION
                 ──────────
Source code
      │
      │ COPY during build
      ▼
Immutable Docker Image
      │
      ▼
Container
      │
      └── persistent data → named volume / external storage
```
The same Dockerfile should be capable of producing a self-contained production image. Your development bind mount is simply an override that gives you the live-editing experience.

