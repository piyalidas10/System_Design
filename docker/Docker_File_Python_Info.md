# Building & Running a Python file using Docker

<img src="./imgs/Dockerfile Python Guide.png" width="100%" />

**Simple application structure:**
```
my-python-app/
├── Dockerfile
├── demo.py
```

**Dockerfile**
```
FROM python

WORKDIR /app

COPY . /app

CMD ["python", "demo.py"]
```

Let's understand exactly what happens.

## 1. FROM python
```
FROM python
```
Docker starts with the official Python image.

Conceptually:
```
Python Docker Image
├── Linux
├── Python
├── pip
└── Python runtime
```
You don't need to install Python yourself.

## 2. WORKDIR /app
```
WORKDIR /app
```
Docker creates /app if necessary and makes it the current working directory.

So:
```
Container
└── /app   ← current directory
```

## 3. COPY . /app
```
COPY . /app
```
This means:

Copy everything from my current project directory into /app inside the image.

Suppose your local project is:
```
my-python-app/
├── Dockerfile
└── demo.py
```

After COPY:
```
Container Image
└── /app
    ├── Dockerfile
    └── demo.py
```

## 4. CMD
```
CMD ["python", "demo.py"]
```
This is the command Docker executes when the container starts.

So:
```
docker run my-python-app
```
causes:
```
Container starts
      ↓
Working directory = /app
      ↓
python demo.py
      ↓
demo.py executes
```

## Complete flow
```
             Dockerfile
                 │
                 │ docker build
                 ↓
        ┌───────────────────┐
        │    Docker Image   │
        │                   │
        │ /app              │
        │   └── demo.py     │
        └─────────┬─────────┘
                  │
                  │ docker run
                  ↓
        ┌───────────────────┐
        │    Container      │
        │                   │
        │ /app              │
        │   └── demo.py     │
        │                   │
        │ python demo.py    │
        └───────────────────┘
```

## Build and run it

**From the directory containing your Dockerfile:**
```
docker build -t python-demo .
```
**Then:**
```
docker run --rm python-demo
```

**python-demo is simply the name you are giving to the Docker image.**
```
docker build -t python-demo .
```
Break it down:
```
docker build -t python-demo .
             │     │          │
             │     │          └── Build context = current directory
             │     │
             │     └── Image name
             │
             └── Tag/name option
```
```
Dockerfile
    │
    │ docker build -t python-demo .
    ↓
IMAGE
python-demo:latest
    │
    │ docker run python-demo
    ↓
CONTAINER
```
**If demo.py contains:**
```
print("Hello from Docker!")
```
**you'll get:**
```
Hello from Docker!
```
### One improvement I'd recommend

Instead of:
```
FROM python
```
use a specific version:
```
FROM python:3.13-slim
```
This is better for reproducibility because your application won't unexpectedly switch Python versions when the python image tag changes.

**And add a .dockerignore:**
```
__pycache__
*.pyc
.venv
.git
.env
```

**So a more practical version becomes:**
```
FROM python:3.13-slim

WORKDIR /app

COPY . /app

CMD ["python", "demo.py"]
```
