# 🐳 Docker Compose vs Container

**🏠 Container = One house**

**🏘 Docker Compose = Society manager controlling many houses**

## 1️⃣ What is a Container?

A container is a running instance of a Docker image.

Think like this:
```
Docker Image  →  docker run  →  Container
```

Example:
```
docker run nginx
```

Now you have:
    -   1 container
    -   Running nginx
    -   Isolated environment

So:

👉 Container = Running application

### 🔹 Visual
```
Host Machine
 ├── Container 1 (FastAPI)
 ├── Container 2 (Redis)
 └── Container 3 (Qdrant)
```
Each container:
    -   Has its own filesystem
    -   Has its own network
    -   Is isolated

## 2️⃣ What is Docker Compose?

Docker Compose is a tool to manage multiple containers together.

Instead of running:
```
docker run fastapi
docker run redis
docker run qdrant
```
You define everything inside a file:
```
docker-compose.yml
```
Then run:
```
docker compose up
```
Now all containers start together.

```
docker-compose.yml
        │
        ▼
 ┌────────────────────┐
 │  FastAPI Container │
 │  Redis Container   │
 │  Qdrant Container  │
 └────────────────────┘
```
👉 Compose is just a manager.

## 🔥 Simple Real Example

If your project is:

FastAPI + Redis

Without Compose:
```
docker run fastapi
docker run redis
```

With Compose:
```
services:
  app:
    build: .
  redis:
    image: redis
```

Then:
```
docker compose up
```
That’s it.

| Feature            | Container      | Docker Compose          |
| ------------------ | -------------- | ----------------------- |
| What is it?        | Running app    | Management tool         |
| Creates container? | Yes            | Yes (multiple)          |
| Used for?          | Run single app | Run multi-service app   |
| File needed?       | No             | docker-compose.yml      |
| Production use?    | Yes            | Yes (small-medium apps) |

## 🚀 In Case (FastAPI + LangChain + Qdrant)

You should use:
    -   Containers → For each service
    -   Docker Compose → To run them together

Example:
```
docker compose up
```

Starts:
    -   FastAPI container
    -   Qdrant container
    -   Ollama container

All connected automatically.