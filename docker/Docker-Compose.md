# Docker Compose
Docker Compose is a powerful tool designed to define and run multi-container applications using a single YAML configuration file. Instead of manually running multiple docker run commands for each part of your app (like a web server and a database), Compose orchestrates them as a unified "stack".

Compose simplifies the control of your entire application stack, making it easy to manage services, networks, and volumes in a single YAML configuration file. Then, with a single command, you create and start all the services from your configuration file.

Compose works in all environments - production, staging, development, testing, as well as CI workflows. 

<img src="imgs/Docker_Compose_Default.png" width="100%" />

**It also has commands for managing the whole lifecycle of your application:**
- Start, stop, and rebuild services
- View the status of running services
- Stream the log output of running services
- Run a one-off command on a service

**Key benefits of Docker Compose**
- Single Configuration: All services (containers), networks, and volumes are defined in one file, typically named docker-compose.yml or compose.yaml.
- Service Communication: Compose automatically creates a shared network. Containers can talk to each other using their service names (e.g., a backend can reach a database at db:5432).
- Dependency Management: You can use the depends_on tag to ensure services start in a specific order (e.g., the database starts before the application).
- One-Command Operations: Use docker compose up to build and start everything at once, and docker compose down to stop and remove all related resources

## docker-compose.yml

<img src="imgs/Docker_Compose.png" width="100%" />

```
services:

  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    restart: unless-stopped
    ports:
      - "6333:6333"
    volumes:
      - qdrant_storage:/qdrant/storage

  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_storage:/root/.ollama

  api:
    build: .
    container_name: Rag-Github-Code-Review-Agent
    restart: unless-stopped
    ports:
      - "8000:8000"

    depends_on:
      - qdrant
      - ollama

    environment:
      OLLAMA_BASE_URL: http://ollama:11434
      QDRANT_URL: http://qdrant:6333

    volumes:
      - ./app/uploaded_docs:/app/uploaded_docs
      - ./logs:/app/logs

    command: uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  qdrant_storage:
  ollama_storage:
```

Your Docker Compose infrastructure is a local AI-powered RAG system composed of 3 main services running inside a shared Docker network.

The architecture works like this:
```
User
  │
  ▼
FastAPI API Service (Port 8000)
  │
  ├──► Ollama Service (LLM inference)
  │
  └──► Qdrant Service (Vector DB)
```

**The API acts as the brain/orchestrator.**
- Ollama provides AI model inference
- Qdrant stores embeddings/vectors
- FastAPI connects everything together

**Your docker-compose.yml is doing 5 major things:**

1. Creating containers
2. Creating network
3. Creating storage
4. Exposing ports
5. Connecting services

That is the core purpose of Docker Compose.

**1. External User Layer**

In the image:
```
External User ───► 8000 (HTTP)
```
This means, The user accesses:
```
http://localhost:8000
```
This request enters the:
```
API Service
```
running inside Docker.

**2. Docker Network Layer**

The big dotted box:
```
Docker Network (default)
```
is automatically created by Docker Compose. This is extremely important. It allows all containers to communicate privately.

Inside this network:
| Service | Internal Address      |
| ------- | --------------------- |
| API     | `http://api:8000`     |
| Ollama  | `http://ollama:11434` |
| Qdrant  | `http://qdrant:6333`  |

No manual IP configuration needed. Docker provides:
- internal DNS
- service discovery
- networking

automatically.

**3. API Service (FastAPI)**

This is your main application container.

Inside:
```
FastAPI Application (uvicorn)
```
runs. FastAPI is a web framework for building the logic of your application, while Uvicorn is a web server that runs that application. 

Responsibilities of API Service

Your API:
```
A. Receives user requests
```
Example:
```
"Review this GitHub repository"
```

B. Sends prompts to Ollama

Using:
```
http://ollama:11434
```
This is possible because of:
```
OLLAMA_BASE_URL: http://ollama:11434
```

C. Stores embeddings/search data in Qdrant

Using:
```
http://qdrant:6333
```
Configured by:
```
QDRANT_URL: http://qdrant:6333
```

**4. Ollama Service**

This container runs:
```
LLM Inference API
```
Meaning:
- serves local AI models
- generates responses
- embeddings
- code reviews
- reasoning

Example Flow

API sends:
```
{
  "model": "phi3",
  "prompt": "Review this code"
}
```
Ollama processes locally and returns:
```
Code review response
```

Ollama Volume

In the image:
```
ollama_storage
```
mounted to:
```
/root/.ollama
```
This stores:
- downloaded models
- model cache
- embeddings cache

Without this: models would re-download every restart.

**5. Qdrant Service**

This is your: Vector Database

Qdrant stores:
- embeddings
- semantic vectors
- document chunks
- similarity indexes

Used for:
- RAG
- semantic search
- retrieval

Why Qdrant Exists

LLMs cannot remember large document sets efficiently. So workflow becomes:
```
Document
   ↓
Embedding
   ↓
Store in Qdrant
   ↓
Similarity Search
   ↓
Relevant Context
   ↓
Send to LLM
```
This is RAG architecture.

Qdrant Volume

Mounted:
```
qdrant_storage:/qdrant/storage
```
Stores:
- vector indexes
- collections
- persistent data

Without it: vectors disappear after restart.

**6. Bind Mounts (Host ↔ Container)**

Your API has:
```
- ./app/uploaded_docs:/app/uploaded_docs
- ./logs:/app/logs
```
These are NOT Docker-managed volumes. They directly sync local folders.

Uploaded Docs Folder

Purpose:
- PDFs
- GitHub repos
- uploaded code
- temporary files

Flow:
```
Host Machine Folder
        ⇅
Container Folder
```
Changes sync instantly.

Logs Folder  
Stores:
- API logs
- debugging info
- request traces
Persistent outside container.

**7. Port Exposure**

From image:
| Service | Port  | Purpose       |
| ------- | ----- | ------------- |
| API     | 8000  | User access   |
| Ollama  | 11434 | AI API        |
| Qdrant  | 6333  | Vector DB API |

Even though Ollama and Qdrant ports are exposed:
```
ports:
```
your API communicates internally using:
```
http://ollama:11434
http://qdrant:6333
```
NOT localhost. Why?  
Because inside Docker:
- localhost means same container
- service names mean other containers
This is a very important Docker concept.

**8. depends_on**

In image:
```
API depends on:
- ollama
- qdrant
```
Meaning:

Docker starts:
1. Qdrant
2. Ollama
3. API
in order.

**9. Real Runtime Flow**

Step 1 — User Request  
User calls:
```
POST /review
```
to FastAPI.

Step 2 — API Receives Code    
API:
- loads repo/docs
- chunks files
- creates embeddings

Step 3 — Store/Search in Qdrant  
Embeddings stored or searched. Qdrant returns relevant chunks.

Step 4 — Prompt Creation  
API builds prompt:
```
Repository Context
+ Retrieved Chunks
+ User Query
```

Step 5 — Send to Ollama  
API calls Ollama model.

Step 6 — Ollama Generates Response  
Local LLM generates:
- review
- suggestions
- fixes

Step 7 — API Returns Response  
FastAPI sends response back to user.

**This architecture gives:**
| Feature        | Benefit                        |
| -------------- | ------------------------------ |
| Docker Compose | Easy orchestration             |
| Ollama         | Local LLM inference            |
| Qdrant         | Fast semantic retrieval        |
| FastAPI        | API orchestration              |
| Volumes        | Persistent storage             |
| Docker Network | Internal service communication |
| Bind Mounts    | Local file syncing             |
| RAG Pattern    | Scalable contextual AI         |



## Key commands
1. To start all the services defined in your compose.yaml file:
```
docker compose up
```
The docker compose up command starts the frontend and backend services, creates the necessary networks and volumes, and injects the configuration and secret into the frontend service.

2. To stop and remove the running services:
```
docker compose down
```

3. If you want to monitor the output of your running containers and debug issues, you can view the logs with:
```
docker compose logs
```

4. To list all the services along with their current status:
```
docker compose ps
```



