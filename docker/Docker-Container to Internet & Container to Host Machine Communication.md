# Docker Networking-Cross Container Communication

## Container to WWW Communication (Container → Internet)
### 1. The architecture

Think of the flow like this:
```
┌───────────────────────────────┐
│       Docker Container        │
│                               │
│  ┌─────────────────────────┐  │
│  │ Node / Python / PHP App  │  │
│  └────────────┬────────────┘  │
└───────────────┼───────────────┘
                │
                │ HTTP GET
                ▼
        ┌──────────────────┐
        │   Internet       │
        │                  │
        │  swapi.dev       │
        │  Star Wars API   │
        └──────────────────┘
```
The important point is:
> **The application is running inside the container, but it needs to communicate with something outside the container.**

### Source Code Example
```
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios').default;
const mongoose = require('mongoose');

const app = express();

app.use(bodyParser.json());

app.get('/movies', async (req, res) => {
  try {
    const response = await axios.get('https://swapi.dev/api/films');
    res.status(200).json({ movies: response.data });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

app.listen(3000);

```
```
FROM node

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
```
<img src="./imgs/docker_container_internet_connect.png" width="90%" />

### 2. What happens in your example?

**Your Node.js application uses Axios:**
```
axios.get('https://swapi.dev/api/films')
```

**The flow is:**
```
Node.js Application
       ↓
     Axios
       ↓
 HTTP GET Request
       ↓
Docker Container
       ↓
Docker Networking
       ↓
Internet
       ↓
swapi.dev
       ↓
HTTP Response
       ↓
Node.js Application
```
**The response could contain:**
```
{
  "title": "A New Hope",
  "episode_id": 4,
  "director": "George Lucas"
}
```
So Docker doesn't prevent your application from accessing the Internet.

### 3. Very important distinction

There are actually three different networking scenarios you'll encounter in Docker:

| Scenario                  | Example                  | Direction |
| ------------------------- | ------------------------ | --------- |
| **Container → Internet**  | Node → `swapi.dev`       | Outbound  |
| **Container → Container** | Angular → Node API       | Internal  |
| **Host → Container**      | Browser → Node container | Inbound   |

Your current lesson is focusing on the first one.
```
             INTERNET
                ▲
                │
                │ HTTP
                │
        ┌───────┴───────┐
        │   Container   │
        │               │
        │ Node.js App   │
        └───────────────┘
```

### 4. Why this matters in real applications

Imagine an enterprise application:
```
                    Internet
                       │
          ┌────────────┴────────────┐
          │                         │
     Payment API               Google API
          │                         │
          └────────────┬────────────┘
                       │
                Docker Container
                       │
                 Backend API
```
Your backend might need to communicate with:
- Payment providers
- OAuth/OIDC providers
- External REST APIs
- Email providers
- Maps APIs
- GitHub APIs
- Cloud services
- Third-party databases/services

All of these are examples of outbound container networking.

### 5. One important Docker concept

**A container has its own network namespace.**

That means the application inside the container does not simply behave as though it is running directly on your Windows host.

**Docker provides networking infrastructure that allows:**
```
Container
   ↓
Docker network
   ↓
Host/network gateway
   ↓
Internet
```
Docker handles the necessary networking/NAT so that an ordinary application can generally make outbound requests.

Therefore, your Node code usually doesn't need special Docker-specific code.

**You still write:**
```
axios.get('https://swapi.dev/api/films');
```
**not something like:**
```
axios.get('docker://internet/swapi.dev');
```
Docker handles the networking underneath.

### 6. The key takeaway

**A container is isolated, but it is not disconnected. It can communicate outside itself.**

**The important networking questions we'll eventually answer are:**
```
1. Container → Internet
   How does my container access external APIs?

2. Container → Container
   How does my backend talk to PostgreSQL/Redis/Qdrant/another API container?

3. Host → Container
   How does my browser/Postman access an application running inside Docker?

4. Container → Host
   How does a container communicate with something running directly on my machine?
```
For your current example, the answer is simply:

> **Node application inside Docker → Docker networking → Internet → Star Wars API → response back to container.**

---

## Container to Local Host Machine Communication (Container → Host Machine)
### 1. The architecture
**Previously, our container communicated with an external API:**
```
Docker Container
   │
   │ HTTP request
   ▼
Internet
   │
   ▼
Star Wars API
```

**Now we have a different scenario:**
```
┌───────────────────────────────┐
│       Docker Container        │
│                               │
│   Node.js Application         │
│          │                    │
│          │ MongoDB request    │
└──────────┼────────────────────┘
           │
           │ Docker networking
           ▼
┌───────────────────────────────┐
│         Host Machine          │
│                               │
│       MongoDB Server          │
│       :27017                  │
│       (NOT in Docker)         │
└───────────────────────────────┘
```
The important difference is:
> **MongoDB is installed and running directly on the host machine, while the Node.js application is running inside a Docker container.**

### 2. The application has two communication paths

Our Node.js application communicates with two different destinations:
```
                    Node.js
                  Application
                 /           \
                /             \
               ▼               ▼
        Star Wars API       MongoDB
        Internet            Host Machine
```

**Path 1 — Container → Internet**
```
Node.js
   ↓
Docker Container
   ↓
Internet
   ↓
swapi.dev
```

**For example:**
```
const response = await axios.get(
  'https://swapi.dev/api/films'
);
```
This works because Docker allows the container to make outbound network requests.

**Path 2 — Container → Host Machine**
```
Node.js
   ↓
Docker Container
   ↓
Host Machine
   ↓
MongoDB :27017
```
This is where we have a problem.

### 3. The original MongoDB connection does NOT work

**Our original code is:**
```
mongoose.connect(
  'mongodb://localhost:27017/swfavorites',
  { useNewUrlParser: true },
  (err) => {
    if (err) {
      console.log(err);
    } else {
      app.listen(3000);
    }
  }
);
```

**At first glance, this looks correct because MongoDB is running on our local machine:**
```
Windows Host
└── MongoDB :27017
```
However, the Node.js application is not running directly on the Windows host.

**It is running inside a Docker container:**
```
Windows Host
│
├── MongoDB :27017
│
└── Docker
    └── Node.js Container
```
Therefore, the meaning of localhost changes.

### 4. The important localhost rule

Inside the Docker container:
```
localhost
    ↓
The Docker container itself
```
**It does not mean:**
```
localhost
    ↓
Windows Host Machine
```
**So when the Node.js application executes:**
```
mongoose.connect(
  'mongodb://localhost:27017/swfavorites'
);
```

**it effectively tries to find MongoDB here:**
```
┌──────────────────────────┐
│    Docker Container      │
│                          │
│  Node.js                 │
│     │                    │
│     └── localhost:27017 ─┼──► MongoDB?
│                          │
└──────────────────────────┘
```
But MongoDB isn't running inside that container.

**MongoDB is here:**
```
┌──────────────────────────┐
│      Host Machine        │
│                          │
│  MongoDB :27017         │
└──────────────────────────┘
```
Therefore:

localhost from inside a container does not refer to the host machine.

### 5. How do we connect to the host?

**Docker provides a special hostname:**
```
host.docker.internal
```
This hostname is specifically designed to allow a container to communicate with services running on the host.

**Therefore, instead of:**
```
mongodb://localhost:27017/swfavorites
```
**we use:**
```
mongodb://host.docker.internal:27017/swfavorites
```
**So the updated code becomes:**
```
mongoose.connect(
  'mongodb://host.docker.internal:27017/swfavorites',
  { useNewUrlParser: true },
  (err) => {
    if (err) {
      console.log(err);
    } else {
      app.listen(3000);
    }
  }
);
```

### 6. What is host.docker.internal?

Think of it as a special Docker-provided hostname.
```
Docker Container
       │
       │
       │ host.docker.internal
       ▼
Docker Host Machine
       │
       ▼
MongoDB :27017
```
**Docker resolves:**
```
host.docker.internal
```
to an address that allows the container to reach the host machine.

You don't need to manually find the host's IP address.

### 7. The complete architecture now works
```
                         INTERNET
                            │
                            ▼
                    ┌──────────────┐
                    │  Star Wars   │
                    │     API      │
                    └──────▲───────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────────┼─────────────────────────┐
│                    Docker Container                │
│                                                    │
│                 Node.js Application               │
│                                                    │
│        ┌─────────────────┴────────────────┐       │
│        │                                  │       │
│        │ HTTPS                            │ MongoDB│
│        ▼                                  ▼       │
└────────┼──────────────────────────────────┼───────┘
         │                                  │
         │                                  │
         │                         host.docker.internal
         │                                  │
         │                                  ▼
         │                         ┌──────────────────┐
         │                         │   Host Machine   │
         │                         │                  │
         │                         │ MongoDB :27017   │
         │                         └──────────────────┘
         │
         ▼
      Internet
```

### 8. We don't need to start the container differently

This is an important point from the lecture.

We do not need a special docker run option just for this scenario.

The important change is in the application configuration:

**Before**
```
mongodb://localhost:27017/swfavorites
```
**After**
```
mongodb://host.docker.internal:27017/swfavorites
```
So:
```
localhost
   ❌
   ↓
Container itself
```
whereas:
```
host.docker.internal
   ✅
   ↓
Host machine
```

### 9. Why do we need to rebuild the image?

**If the Node.js source code is copied into the image:**
```
COPY . .
```
then changing:
```
localhost
```
to:
```
host.docker.internal
```
changes the application source code.

**Therefore, you need to rebuild the image:**
```
docker build -t node-app .
```

**Then create a new container from the updated image:**
```
docker run -p 3000:3000 --name node-app node-app
```
The exact image/container names and port mapping depend on your project.

### 10. How do we prove the connection works?

**Suppose MongoDB already contains:**

Star Wars Favorite

**and your Node application exposes:**
```
GET /favorites
```
**You send:**
```
GET http://localhost:3000/favorites
```
**The flow becomes:**
```
Postman
   │
   │ HTTP
   ▼
localhost:3000
   │
   ▼
Node.js Container
   │
   │ mongodb://host.docker.internal:27017
   ▼
Host Machine
   │
   ▼
MongoDB
   │
   ▼
Stored data
   │
   ▼
Node.js
   │
   ▼
Postman
```
If Postman receives the previously stored favorite, it proves that:

The Node.js application inside the Docker container successfully communicated with MongoDB running directly on the host machine.

### 11. Why does the existing MongoDB data still exist?

This is another important observation from the lecture.

**MongoDB is not running inside Docker:**
```
Host Machine
└── MongoDB
    └── Database
        └── swfavorites
```
Therefore, restarting/rebuilding your Node.js container doesn't affect the MongoDB database.
```
Rebuild Node Image
       ↓
Restart Node Container
       ↓
MongoDB on Host
       ↓
Data still exists
```
Later, when MongoDB itself is moved into a Docker container, persistence becomes a separate Docker storage/volume concern.

### 12. Final Docker networking notes

You now have these two scenarios:

| Scenario                  | Address                      | Destination              |
| ------------------------- | ---------------------------- | ------------------------ |
| **Container → Internet**  | `https://swapi.dev/...`      | External website/API     |
| **Container → Host**      | `host.docker.internal:27017` | Service running on host  |
| **Container → Container** | `mongodb:27017`              | Another Docker container |

**The critical distinction is:**
```
┌─────────────────────────────────────────────┐
│                  localhost                  │
│                                             │
│  From container → the container itself     │
│  From host      → the host itself          │
└─────────────────────────────────────────────┘
```

**And for Container → Host:**
```
Container
    │
    │ host.docker.internal
    ▼
Host Machine
    │
    ▼
MongoDB :27017
```

> **When an application runs inside a Docker container and needs to communicate with a service running directly on the host machine, localhost normally points to the container itself. For Docker Desktop environments such as Windows/macOS, host.docker.internal provides the special hostname for reaching the host.**
