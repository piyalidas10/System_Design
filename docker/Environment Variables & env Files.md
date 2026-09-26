# Environment Variables & ".env" Files

> [!IMPORTANT]
> **ARG  → available during `docker build`**        
> **ENV  → available during `docker build` AND runtime**

Stop if any container is already runnuning.
```
# Stop docker conatiner feedback-app
docker stop feedback-app

# build new docker image
docker build -t feedback-node:env .

# run container using env file configuration
docker run -d --rm -p 3000:8000 --env-file ./.env --na me feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmu ller/development/teaching/udemy/docker-complete:/app:ro" -v /app/node_mo dules -v /app/temp feedback-node:env
```

<img src="./imgs/Environment Variables & env Files.png" width="100%" />

| Feature                             | `ARG`               | `ENV`                         |
| ----------------------------------- | ------------------- | ----------------------------- |
| Purpose                             | Build-time variable | Runtime variable              |
| Defined in Dockerfile               | `ARG`               | `ENV`                         |
| Set during build                    | `--build-arg`       | Usually default in Dockerfile |
| Set during `docker run`             | ❌                   | `-e` / `--env`                |
| Available while building image      | ✅                   | ✅                             |
| Available to application at runtime | ❌                   | ✅                             |
| Can change without rebuilding image | ❌                   | ✅                             |
| Typical use                         | Build configuration | App configuration             |

> **ARG affects the image build. ENV affects the running container.**

## ENV — runtime configuration

**Suppose your server.js has:**
```
const port = process.env.PORT || 80;

app.listen(port);
```
**Instead of hard-coding:**
```
app.listen(80);
```
you make the application configurable.

**In your Dockerfile:**
```
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=80

EXPOSE $PORT

CMD ["node", "server.js"]
```
**Now the image has a default:**
```
PORT=80
```
**So:**
```
docker run -p 3000:80 my-app
```
runs the application on container port 80.

## Override ENV at runtime

This is where Docker becomes flexible.

You don't need to rebuild the image.

**You can do:**
```
docker run -p 3000:8000 -e PORT=8000 my-app
```
**Now:**
```
Dockerfile:
PORT=80

        ↓ overridden by

docker run:
PORT=8000
```
**Inside the container:**
```
process.env.PORT
```
**returns:**
```
8000
```

**So the same image can run with different configurations.**
```
                 SAME IMAGE
                     │
          ┌──────────┼──────────┐
          ↓          ↓          ↓
      Container   Container   Container
       PORT=80     PORT=8000   PORT=9000
```
No rebuild required.

## Why EXPOSE $PORT works

**This:**
```
ENV PORT=80

EXPOSE $PORT
```
means Docker substitutes the value of PORT.

**Conceptually:**
```
PORT=80
   ↓
EXPOSE $PORT
   ↓
EXPOSE 80
```
If you build an image where PORT is different, the Dockerfile can use that value.

But remember an important distinction:
> **EXPOSE does NOT publish the port.**

It documents the intended container port.

This:
```
EXPOSE 80
```
does not make port 80 accessible from your host.

**You still need:**
```
docker run -p 3000:80 my-app
```

## -e and --env

**These are equivalent:**
```
docker run -e PORT=8000 my-app
```
**and:**
```
docker run --env PORT=8000 my-app
```

**You can provide multiple variables:**
```
docker run \
  -e PORT=8000 \
  -e NODE_ENV=production \
  -e API_URL=http://api:8080 \
  my-app
```

**Your Node application can access them:**
```
process.env.PORT
process.env.NODE_ENV
process.env.API_URL
```

## .env file

**Instead of writing:**
```
docker run \
  -e PORT=8000 \
  -e NODE_ENV=production \
  -e API_URL=http://api:8080 \
  my-app
```
**you can create:**
```
.env
```
**with:**
```
PORT=8000
NODE_ENV=production
API_URL=http://api:8080
```
**Then:**
```
docker run --env-file ./.env my-app
```
Docker loads those variables into the container.

This is much cleaner when you have many variables.

## Now ARG is different

Suppose you want to control something while building the image.

**Dockerfile:**
```
FROM node:20

ARG NODE_VERSION_LABEL=development

RUN echo "Building image for $NODE_VERSION_LABEL"

WORKDIR /app

COPY . .

CMD ["node", "server.js"]
```
**Then:**
```
docker build \
  --build-arg NODE_VERSION_LABEL=production \
  -t my-app .
```

**During the build:**
```
NODE_VERSION_LABEL
        ↓
production
```
Docker can use it while executing Dockerfile instructions.

But after the image is built, ARG isn't automatically available to your Node application.

**For example:**
```
console.log(process.env.NODE_VERSION_LABEL);
```

**doesn't get its value simply because you used:**
```
ARG NODE_VERSION_LABEL
```
That's the fundamental difference.

## You can connect ARG → ENV

Sometimes you want a build argument to become a runtime environment variable.

**For example:**
```
FROM node:20

ARG APP_MODE=development

ENV APP_MODE=$APP_MODE

WORKDIR /app

COPY . .

CMD ["node", "server.js"]
```

**Build:**
```
docker build \
  --build-arg APP_MODE=production \
  -t my-app .
```

**Now the image contains:**
```
APP_MODE=production
```
**and your application can access:**
```
process.env.APP_MODE
```

## The enterprise way to think about it

**Think about configuration in three levels:**
```
                 Dockerfile
                     │
             ┌───────┴───────┐
             │               │
            ARG             ENV
             │               │
        Build-time       Runtime default
             │               │
             ↓               ↓
    docker build       docker run
    --build-arg        -e / --env
                             │
                             ↓
                       Application
                             │
                             ↓
                    process.env.X
```
**Example**
```
Build configuration
       │
       │ ARG
       ↓
Docker image
       │
       │ ENV
       ↓
Container configuration
       │
       ↓
Node application
```

## Very important: don't put secrets in ARG

This is a common interview/real-world point.

**Don't do:**
```
ARG DB_PASSWORD
```
and pass sensitive credentials through the build process.

**Similarly, don't bake secrets into the image:**
```
ENV DB_PASSWORD=mySecret123
```
Instead, runtime secrets should be supplied through an appropriate secret-management mechanism.

**For example, conceptually:**
```
Application
     │
     ├── PORT        → ENV
     ├── NODE_ENV    → ENV
     ├── API_URL     → ENV
     │
     └── DB_PASSWORD → Secret management
```
For Docker Compose/Kubernetes environments, secrets are typically handled separately from ordinary configuration.

## Your Docker course example in one picture
```
                     Dockerfile
                         │
             ┌───────────┴───────────┐
             │                       │
          ARG PORT              ENV PORT=80
             │                       │
      docker build             default runtime
      --build-arg                    │
             │                       │
             ↓                       ↓
          IMAGE  ───────────────→ CONTAINER
                                      │
                              docker run -e PORT=8000
                                      │
                                      ↓
                              PORT = 8000
                                      │
                                      ↓
                         process.env.PORT
                                      │
                                      ↓
                             Node.js server
                                      │
                                      ↓
                                  port 8000
```

**The three commands to remember**

1. Build-time:
```
docker build --build-arg NAME=value -t myapp .
```
2. Runtime:
```
docker run -e NAME=value myapp
```
3. Runtime from file:
```
docker run --env-file .env myapp
```

> **ARG is for values needed during image construction, while ENV provides configuration available to the application at container runtime and can be overridden when the container starts.**

## Environment Variables & Security
One important note about environment variables and security: Depending on which kind of data you're storing in your environment variables, you might not want to include the secure data directly in your `Dockerfile`.

Instead, go for a separate environment variables file which is then only used at runtime (i.e. when you run your container with `docker run`).

Otherwise, the values are "baked into the image" and everyone can read these values via `docker history <image>`.

For some values, this might not matter but for credentials, private keys etc. you definitely want to avoid that!

If you use a separate file, the values are not part of the image since you point at that file when you run `docker run`. But make sure you don't commit that separate file as part of your source control repository, if you're using source control.

### ❌ Bad approach

**Don't put credentials directly in the Dockerfile:**
```
ENV DB_USER=admin
ENV DB_PASSWORD=SuperSecret123
ENV API_KEY=abc123
```
**Then build:**
```
docker build -t my-app .
```
Those values become part of the image's configuration/history and can potentially be inspected.

**For example:**
```
docker history my-app
```
So anyone who gets access to the image may be able to discover sensitive information.

### ✅ Better approach: runtime .env

**Dockerfile:**
```
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=80

CMD ["node", "server.js"]
```

**Then create a local .env:**
```
DB_USER=admin
DB_PASSWORD=SuperSecret123
API_KEY=abc123
```

**Run:**
```
docker run --env-file .env my-app
```

**Now:**
```
Dockerfile
    │
    │ build
    ↓
Docker Image
    │
    │ docker run --env-file .env
    ↓
Container
    │
    ↓
process.env.DB_PASSWORD
```

**The important part is that:**
```
.env
  ↓
runtime
  ↓
container

rather than:

secret
  ↓
Dockerfile
  ↓
image
```

### 🔐 But there's another important security point

**.env is not itself a secret-management system.**

It prevents the secret from being baked into the image, but the secret still exists as a file on your machine.

**Therefore, don't commit it:**
```
.env
```

**Instead, commit something like:**
```
.env.example
```
**containing only placeholders:**
```
DB_USER=
DB_PASSWORD=
API_KEY=
```

**So your repository can contain:**
```
.env.example       ← commit
.env               ← DON'T commit
Dockerfile
server.js
.gitignore 
```

### ⚠️ Runtime environment variables aren't completely secret either

There's another nuance worth knowing for interviews and production architecture.

**Even when you use:**
```
docker run --env-file .env my-app
```
the secrets are now available inside the running container as environment variables.

So runtime injection is better than baking secrets into the image, but for production systems you may want a proper secret-management mechanism rather than ordinary environment variables.

**For example:**
```
Development
    ↓
.env file

Production
    ↓
Secret manager
    ↓
Container / Kubernetes Pod
    ↓
Application
```
With Kubernetes, this is commonly handled through Kubernetes Secrets or an external secret-management system.

### Remember this rule
| Where secret is stored      | Recommendation |
| --------------------------- | -------------- |
| Dockerfile `ENV`            | ❌ Don't        |
| Dockerfile `ARG`            | ❌ Don't        |
| Source-code constant        | ❌ Don't        |
| `.env` committed to Git     | ❌ Never        |
| Local `.env` + `.gitignore` | ✅ Development  |
| Runtime secret injection    | ✅ Better       |
| Dedicated secret manager    | ✅ Production   |

> **ARG and Dockerfile ENV should not be used for sensitive credentials because secrets can become part of the image metadata or layers. For development, keep secrets in an uncommitted .env file and inject them at runtime with --env-file. In production, prefer a dedicated secret-management solution**
