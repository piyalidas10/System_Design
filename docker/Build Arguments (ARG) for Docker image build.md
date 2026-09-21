# Build Arguments (ARG) for the Docker image build environment


> [!IMPORTANT]
> **ARG  → available during `docker build`**  
> **ENV  → available during `docker build` AND runtime**

The instructor is using ARG to make the default value of an ENV variable configurable at image-build time.

## Dockerfile
```
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

ARG DEFAULT_PORT=80

ENV PORT=$DEFAULT_PORT

EXPOSE $PORT

CMD ["npm", "start"]
```

## What is happening?

Think of it as a two-step process:
```
             docker build
                  │
                  ▼
        ARG DEFAULT_PORT
                  │
          --build-arg
                  │
                  ▼
        ENV PORT=$DEFAULT_PORT
                  │
                  ▼
             Docker Image
                  │
             docker run
                  │
                  ▼
             Container
                  │
                  ▼
        process.env.PORT
```
For example:

## Production image
```
docker build -t feedback-node:web-app .
```
**Because you didn't provide --build-arg:**
```
DEFAULT_PORT = 80
        ↓
PORT = 80
```

## Development image
```
docker build \
  --build-arg DEFAULT_PORT=8000 \
  -t feedback-node:dev .
```

**Now:**
```
DEFAULT_PORT = 8000
        ↓
ENV PORT=8000
        ↓
EXPOSE 8000
```

**So you have:**
```
                     SAME Dockerfile
                           │
             ┌─────────────┴─────────────┐
             ↓                           ↓
      docker build                 docker build
      DEFAULT_PORT=80              DEFAULT_PORT=8000
             ↓                           ↓
   feedback-node:web-app          feedback-node:dev
             ↓                           ↓
          PORT=80                    PORT=8000
```

## Why ARG comes after RUN npm install

This part is particularly important.

**❌ Less efficient**
```
FROM node:14

ARG DEFAULT_PORT=80

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
```

**If you build:**
```
docker build --build-arg DEFAULT_PORT=80 -t app .
```

**and later:**
```
docker build --build-arg DEFAULT_PORT=8000 -t app .
```

**changing the ARG can invalidate the cache for instructions that follow it, potentially causing:**
```
ARG changed
   ↓
WORKDIR
   ↓
COPY package.json
   ↓
RUN npm install  ← unnecessary rebuild
```
You don't want npm install to run again just because the port changed.

**✅ Better placement**
```
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

ARG DEFAULT_PORT=80

ENV PORT=$DEFAULT_PORT

EXPOSE $PORT

CMD ["npm", "start"]
```

**Now the expensive operations happen before the argument:**
```
FROM node:14
      ↓
WORKDIR
      ↓
COPY package.json
      ↓
RUN npm install       ← cached
      ↓
COPY .
      ↓
ARG DEFAULT_PORT
      ↓
ENV PORT
      ↓
EXPOSE
      ↓
CMD
```

**Changing:**
```
--build-arg DEFAULT_PORT=8000
```
doesn't unnecessarily force your dependency installation to rebuild.

## One correction to keep in mind

It's useful to say:
> **ARG = build-time variable**

and
> **ENV = runtime environment variable**

But technically, ENV can also be used during the image build by later Dockerfile instructions.

**The key difference is:**
```
ARG
├── exists during build
├── supplied by --build-arg
└── not automatically available to application at runtime

ENV
├── available during build to subsequent instructions
├── becomes part of image configuration
├── available inside container
└── can be overridden with docker run -e
```

Your example in one sentence
> **ARG DEFAULT_PORT lets you choose a value while building the image, and ENV PORT=$DEFAULT_PORT transfers that build-time value into the image as the default runtime environment variable.**


## But there's an important distinction

ARG itself is not available to your Node.js application.

This:
```
ARG DEFAULT_PORT=80
```
is a Docker build-time variable.

Whereas:
```
ENV PORT=$DEFAULT_PORT
```
creates the runtime environment variable.

Therefore:
```
process.env.PORT
```
can access PORT, but not DEFAULT_PORT merely because ARG DEFAULT_PORT existed.



## Example with App Version

**Dockerfile:**
```
FROM node:20

ARG APP_VERSION=1.0

RUN echo "Building version $APP_VERSION"

COPY . .

CMD ["node", "server.js"]
```

**Build:**
```
docker build --build-arg APP_VERSION=2.0 -t my-app .
```

**During the build:**
```
APP_VERSION = 2.0
       ↓
RUN echo "Building version 2.0"
```

**But when the container starts:**
```
docker run my-app
```

**your application doesn't automatically get:**
```
process.env.APP_VERSION
```
because ARG is not a runtime environment variable.

### If you need it at runtime

**You can transfer the build argument into an environment variable:**
```
FROM node:20

ARG APP_VERSION=1.0

ENV APP_VERSION=$APP_VERSION

COPY . .

CMD ["node", "server.js"]
```

**Build:**
```
docker build --build-arg APP_VERSION=2.0 -t my-app .
```

**Now:**
```
ARG APP_VERSION
       ↓
Docker build
       ↓
ENV APP_VERSION
       ↓
Docker image
       ↓
Container
       ↓
process.env.APP_VERSION
```

**Your Node.js code can then do:**
```
console.log(process.env.APP_VERSION);
```
**and get:**
```
2.0
```

Simple rule
> **ARG = input to build the image.**
> **ENV = configuration for the image/container and application.**

And don't use ARG for secrets either. Build arguments can be exposed through build history/metadata and are not intended as a secret-storage mechanism.




