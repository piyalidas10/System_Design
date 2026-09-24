# 🐳 Docker Utility Container
A Utility Container is not an official Docker term. It is a useful name for a container that provides a ready-to-use development environment/tooling, rather than running a continuously running application.

The key idea is that Docker containers don't always have to run your application—they can provide a temporary development environment or tool.

| Command       | What happens                                        |
| ------------- | --------------------------------------------------- |
| `docker run`  | Creates and starts a new container                  |
| `docker exec` | Executes a command in an existing running container |
| `docker stop` | Stops container                                     |
| `docker rm`   | Removes container                                   |
| `docker compose up`       | Start long-running application services           |
| `docker compose exec`     | Run a command inside an already-running container |
| `docker compose run --rm` | Run a one-off command using a service             |

**For Utility Containers, this pattern is especially useful:**
```
docker compose run --rm <service> <command>
```
**Example:**
```
docker compose run --rm npm init
```

## Why use Utility Containers?

**Suppose your machine doesn't have:**
```
Node.js
npm
PHP
Composer
Laravel CLI
```

**Instead of installing everything locally:**
```
Your Windows machine
       │
       ├── Node
       ├── npm
       ├── PHP
       ├── Composer
       └── Laravel
```

**you can keep the tooling inside Docker:**
```
Your Windows machine
       │
       ▼
     Docker
       │
       ▼
 Utility Container
       │
       ├── Node/npm
       ├── PHP
       └── Composer
```

**Your project can still be mounted into the container:**
```
volumes:
  - ./:/app
```
Therefore:
```
Host project
     │
     │ Bind Mount
     ▼
Container /app
```
The container provides the tools, while your project files remain on your host.

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
There are 3 important ways to run commands with Docker containers. The main difference is when the command is specified and whether the container already exists/runs.

### 1. Run the image with its default command
```
docker run -it node
```
Docker:
```
Node Image
    ↓
docker run
    ↓
New Container
    ↓
Default command → node
    ↓
Node REPL
```
The command comes from the image's CMD/entrypoint configuration.

For the Node image, this starts the Node REPL.

### 2. Override the default command with docker run

You can provide a command after the image name:
```
docker run -it node npm init
```
Here:
```
node
 ↑
IMAGE

npm init
 ↑
OVERRIDE COMMAND
```
Instead of:
```
node → Node REPL
```
Docker runs:
```
npm init
```
So:
```
docker run
    ↓
New container
    ↓
npm init
    ↓
Command finishes
    ↓
Container stops
```
This is the foundation of a utility container.

### 3. Execute a command inside an existing running container

Use:
```
docker exec -it <container-name> npm init
```
For example:
```
docker exec -it node-container npm init
```
Here, the container is already running.
```
Existing container
       │
       ├── Main process continues
       │
       └── docker exec
               ↓
            npm init
```
The important point:
> **docker exec does not replace or stop the main process.**

It starts an additional process inside the existing container.

### docker run vs docker exec
|                             | `docker run`                   | `docker exec`                               |
| --------------------------- | ------------------------------ | ------------------------------------------- |
| Container                   | Creates a new one              | Uses existing one                           |
| Container must already run? | ❌ No                           | ✅ Yes                                       |
| Command                     | Default or overridden          | Additional command                          |
| Example                     | `docker run node npm init`     | `docker exec my-node npm init`              |
| Main process                | Starts with container          | Continues running                           |
| Typical use                 | Start container / utility task | Debugging, administration, one-off commands |

### Why -it?

When the command needs interaction:
```
docker run -it node npm init
```
or:
```
docker exec -it node-container npm init
```
Use:
```
-i → interactive
-t → terminal
```
For example, npm init asks:
```
package name:
version:
description:
entry point:
```
Without -it, you won't get the normal interactive experience.

### Detached mode changes the behavior

You can start a container in the background:
```
docker run -d node
```
Or, for a process that needs its stdin kept open:
```
docker run -dit node
```
Then:
```
docker ps
```
shows the running container.

You can subsequently enter it with:
```
docker exec -it <container-name> sh
```
This is a very common pattern.

---

## Why bind mount is used with utility container ?
Because a utility container is usually used to run a tool against files that you actually want to keep on your host/project directory.

The bind mount connects those two worlds:
```
Host machine                         Utility container
────────────────                    ──────────────────
my-project/                         /app/
  package.json    ◄────────────►      package.json
  src/                                  src/
  index.js                             index.js
```

### Without a bind mount

**Suppose you run:**
```
docker run -it node npm init
```

**npm init creates:**
```
Container
└── package.json
```
The problem is that package.json is inside the container.

**If you remove the container:**
```
docker rm <container>
```
that file goes with it.

So the utility container did its job, but the result isn't conveniently available in your actual project.

### With a bind mount

**You can do:**
```
docker run -it --rm \
  -v ${PWD}:/app \
  -w /app \
  node npm init
```

**Now:**
```
Windows project
C:\my-project
│
│  bind mount
▼
Container
/app
│
└── npm init
```

**When npm init creates:**
```
/app/package.json
```

**it actually appears in:**
```
C:\my-project\package.json
```
because /app is mapped to your host directory.

### Why this is especially useful for utility containers

The utility container is temporary.

**Its job might be:**
```
Create → run tool → produce/modify files → exit
```
**For example:**
```
Node utility container
        │
        ├── npm init
        ├── npm install
        ├── npm run build
        └── npm test
```
You generally don't want the important project files trapped inside that temporary container.

**So:**
```
                 Utility Container
                       │
                Node / npm / tools
                       │
                       │
                  Bind Mount
                       │
                       ▼
                Host Project Folder
                       │
                 Persistent files
```

## Why utility containers are useful

This is where the concept becomes much more interesting.

Imagine your laptop has:
```
Windows
├── Node.js
├── npm
├── PHP
├── Composer
├── Python
├── Java
├── Maven
├── PostgreSQL client
└── ...
```

This can become messy.

With utility containers, you can instead have:
```
Windows
   │
   └── Docker
        │
        ├── Node container
        │     └── npm
        │
        ├── Python container
        │     └── pip
        │
        ├── PHP container
        │     └── composer
        │
        └── PostgreSQL tools container
```
Your host machine doesn't necessarily need all those development tools installed globally.

---

## `docker exec` is especially useful for debugging

Suppose your application is running:
```
┌───────────────────────────────┐
│ Container                     │
│                               │
│  Node API                     │
│  PID 1                        │
│  │                            │
│  └── Running                  │
│                               │
└───────────────────────────────┘
````
You don't want to stop the API just to inspect something.

You can do:
```
docker exec -it my-api sh
```
Now:
```
Container
│
├── Node API          ← continues running
│
└── sh                ← your additional process
```
You can inspect:
```
ls
cat some-file.log
env
ps
```
and then exit:
```
exit
```
The Node API continues running.

---

## The most important mental model

**Think of these commands like this:**
```
                 IMAGE
                   │
          ┌────────┴────────┐
          │                 │
     docker run        docker run
          │                 │
          ▼                 ▼
 default command      override command
     node                npm init
          │                 │
          ▼                 ▼
   New container      New container
                            │
                         finishes
                            │
                         stops
```
**Whereas:**
```
              EXISTING RUNNING CONTAINER
                         │
                         │
                    docker exec
                         │
                         ▼
                    npm init
                         │
                         ▼
                  Additional process

              Main application
                    ↓
              STILL RUNNING
```

**One-line rule to remember**
> **docker run starts a new container; docker run IMAGE COMMAND overrides what that new container runs; docker exec runs an additional command inside an already-running container.**

---

## Utility container vs application container

This distinction is worth remembering for interviews.

| Application Container        | Utility Container                   |
| ---------------------------- | ----------------------------------- |
| Runs an application          | Runs a development/tool command     |
| Usually long-running         | Often short-lived                   |
| Has application code         | May not contain application code    |
| `CMD` starts the application | Command can be supplied dynamically |
| Example: Node API            | Example: `npm init`                 |
| Example: Nginx               | Example: `composer create-project`  |
| Example: PostgreSQL          | Example: database migration CLI     |

### Simple mental model
```
Application container

Docker → "Run my application."
```
Whereas:
```
Utility container

Docker → "Give me Node/Python/PHP/etc.
          and I'll tell you what command to run."
```

### The key Docker commands from this lesson
```
# Start container with default command
docker run -it node

# Start container and override default command
docker run -it node npm init

# Run command inside existing container
docker exec -it <container> npm init

# Run utility container and share current directory
docker run -it --rm -v ${PWD}:/app -w /app node npm init
```
The last command is the important destination of this whole concept.

It gives you a Node/npm environment without requiring Node.js/npm to be installed on Windows, while the generated project files remain on your host machine through the bind mount.

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

