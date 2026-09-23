# Docker Utility Container
The key idea is that Docker containers don't always have to run your application—they can provide a temporary development environment or tool.

| Command       | What happens                                        |
| ------------- | --------------------------------------------------- |
| `docker run`  | Creates and starts a new container                  |
| `docker exec` | Executes a command in an existing running container |
| `docker stop` | Stops container                                     |
| `docker rm`   | Removes container                                   |

## 1. Normal application container

The pattern you've used so far is:
```
Dockerfile
   ↓
Docker Image
   ↓
Docker Container
   ↓
Run application
```
For example:
```
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "server.js"]
```
Then:
```
docker build -t my-node-app .
docker run my-node-app
```
```
docker run my-node-app
       ↓
Start API
       ↓
API keeps running
       ↓
Container stays running
```

Here, the container's purpose is:
> **Run my application.**

## 2. Utility container

A utility container is different.

Instead of:
> **"Start my application."**

the idea is:
 > **"Give me an environment containing the tools I need, and I'll tell the container what command to execute."**

**For example:**
```
docker run -it node npm init
```

**Conceptually:**
```
docker run node npm init
       ↓
Run npm init
       ↓
Task completes
       ↓
Container stops
```
```
Host machine
   │
   │ docker run -it node npm init
   ▼
┌─────────────────────────┐
│     Node container      │
│                         │
│  Node.js                │
│  npm                    │
│                         │
│  npm init               │
│       ↓                 │
│  package.json created   │
└─────────────────────────┘
```
Your Windows machine doesn't need Node.js or npm installed. Docker provides Node.js inside the container.

> **The purpose is: Give me the Node environment so I can perform a task.**

That's why the course calls it a utility container.

## 3. The important syntax

**This is probably the biggest new concept from this section:**
```
docker run [OPTIONS] IMAGE [COMMAND]
```

**For example:**
```
docker run -it node
```
means:

Start the node image and use its default command.

**But:**
```
docker run -it node npm init
```
means:
 > **Start a container from node, but override the image's default command and execute npm init.**

That [COMMAND] part is what the course is emphasizing.

Tthe `-it` flag is a combination of two separate options (-i and -t) that tell Docker to run the container in an interactive mode with a terminal interface.
- **docker run node (No flags):** The container starts, immediately hits the end of its default execution block because it has no input, and exits. You won't see or interact with anything.
- **docker run -i node (Missing -t):** You can type commands and Node will process them, but you won't see a prompt (>), color formatting, or standard terminal behaviors.
- **docker run -t node (Missing -i):** You will see the Node startup prompt (>), but you won't be able to type any text or interact with it.

## Different Ways of Running Commands in Containers


---

## Why does docker exec npm init fail to interact properly?

Because npm init asks questions.

**For example:**
```
package name:
version:
description:
entry point:
```

**If you execute:**
```
docker exec node-container npm init
```
you haven't attached an interactive terminal to that process.

**Therefore use:**
```
docker exec -it node-container npm init
```
**Now:**
```
docker exec
     │
     ├── -i → interactive input
     ├── -t → terminal
     │
     └── npm init
```
You can answer the questions normally.

---

## Explain `docker run -it -d node`

**This command:**
```
docker run -it -d node
```
means:

Create and start a Node.js container, keep it running in the background, while allocating an interactive terminal.
```
Break it down
docker run   -it   -d   node
   │           │    │    │
   │           │    │    └── Docker image
   │           │    └─────── Detached mode
   │           └──────────── Interactive + TTY
   └──────────────────────── Create + start container
```

**The interesting part: -it + -d**

Normally:
```
docker run -it node
```

**The Node image starts its default command (node), and you get:**
```
Welcome to Node.js
>
```
Your terminal is attached to the container.

But:
```
docker run -it -d node
```
starts it detached, so your terminal is returned immediately:
```
a8f3...   ← container ID
```
The container can remain running because the Node process is still running and waiting for input.

You can check:
```
docker ps
```
Then connect to the running container with:

docker attach <container-name-or-id>

or execute another command inside it:
```
docker exec -it <container-name-or-id> npm --version
```

**Important distinction**
```
docker run -it -d node
```
does NOT mean "run Node in detached mode and execute npm."

It means:
```
Create Node container
       ↓
Start default Node command
       ↓
Node waits for input
       ↓
-d → keep it running in background
```
Then:
```
docker exec -it <container> npm init
```
means:
```
Existing Node container
        ↓
docker exec
        ↓
npm init
```
That's exactly the transition your Docker course is making from normal application containers → utility containers.

