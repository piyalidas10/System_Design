# Docker ENTRYPOINT
ENTRYPOINT defines the main executable/command that a container is designed to run.

The key idea:
> **ENTRYPOINT = "This container is built to run this program."**

Unlike CMD, the ENTRYPOINT is not normally replaced when you provide a command to docker run.

ENTRYPOINT specifies the primary executable of a Docker container. It makes the container behave like an executable application, while arguments supplied through docker run are normally appended to the entrypoint. CMD is commonly used to provide default arguments or a default command.

| Docker instruction | Purpose                          |
| ------------------ | -------------------------------- |
| `RUN`              | Build-time command               |
| `CMD`              | Default command/arguments        |
| `ENTRYPOINT`       | Fixed main executable            |
| `COPY`             | Copy files into image            |
| `EXPOSE`           | Document container port          |
| `VOLUME`           | Declare persistent data location |

## Easy mental model:
```
ENTRYPOINT = WHO runs?
CMD        = WHAT are the default arguments?
```

**For example:**
```
ENTRYPOINT ["python"]
CMD ["app.py"]
```

**means:**
```
python app.py
   ↑     ↑
   │     └── default argument
   └──────── fixed executable
```

## Simple example

Suppose you have a Node.js utility container.

**Dockerfile:**
```
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENTRYPOINT ["node"]
```

**Build:**
```
docker build -t node-runner .
```
**Now:**
```
docker run --rm node-runner --version
```
**Docker effectively executes:**
```
node --version
```
**And:**
```
docker run --rm node-runner server.js
```
**becomes:**
```
node server.js
```
So the argument after the image name is appended to the ENTRYPOINT.

## ENTRYPOINT vs CMD

This is the most important distinction.

### Using CMD
```
FROM node:20-alpine

CMD ["node", "--version"]
```
Running:
```
docker run --rm my-node
```
executes:
```
node --version
```
But:
```
docker run --rm my-node npm --version
```
executes:
```
npm --version
```
The CMD was completely replaced.

### Using ENTRYPOINT
```
FROM node:20-alpine

ENTRYPOINT ["node"]
```

**Running:**
```
docker run --rm my-node --version
```
executes:
```
node --version
```

**And:**
```
docker run --rm my-node server.js
```
executes:
```
node server.js
```

**Another**
```
docker run --rm my-node npm --version
```
executes:
```
node npm --version
```

The ENTRYPOINT remains fixed; your arguments are appended.

## Real-world example: Docker utility container

This connects directly to the utility-container concept you were learning.

Imagine you create a Python utility container specifically for running Python commands.
```
FROM python:3.12-alpine

WORKDIR /app

ENTRYPOINT ["python"]
```
Build:
```
docker build -t python-util .
```
Now you can do:
```
docker run --rm python-util --version
```
Equivalent to:
```
python --version
```
Or:
```
docker run --rm python-util -c "print('Hello Docker')"
```
Equivalent to:
```
python -c "print('Hello Docker')"
```
The container is effectively a Python command runner.

## ENTRYPOINT + CMD together

This is where Docker becomes particularly useful.

FROM node:20-alpine

ENTRYPOINT ["node"]

CMD ["server.js"]

Docker combines them:

## ENTRYPOINT + CMD

**So:**
```
docker run --rm my-node
```
runs:
```
node server.js
```

**But:**
```
docker run --rm my-node app.js
```
runs:
```
node app.js
```
Because the runtime argument replaces the CMD.

**Think of it as:**
```
ENTRYPOINT = fixed command
CMD        = default arguments
```

## Visual
```
Dockerfile

ENTRYPOINT ["node"]
              │
              │ fixed
              ▼
           ┌──────┐
           │ node │
           └──────┘
              +
CMD ["server.js"]
              │
              ▼
        default argument

Result:
node server.js
```

**If you run:**
```
docker run my-node app.js
```
**then:**
```
ENTRYPOINT → node
CMD        → replaced by app.js

Result:
node app.js
```

## ENTRYPOINT in enterprise applications

**A common pattern is:**
```
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENTRYPOINT ["python", "main.py"]
```

**Now:**
```
docker run my-api
```
always starts:
```
python main.py
```
This makes the image behave like an executable application.


**Another common pattern is an entrypoint script:**
```
COPY docker-entrypoint.sh /usr/local/bin/

ENTRYPOINT ["docker-entrypoint.sh"]
```
The script can perform initialization and then start the application.


**For example:**
```
#!/bin/sh

echo "Initializing application..."

python manage.py migrate

exec python main.py
```
The important exec ensures the application becomes the main process (PID 1) and receives container signals properly.

