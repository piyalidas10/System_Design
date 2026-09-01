# YAML

## 1. What is YAML?
**YAML** (YAML Ain't Markup Language) is a human-readable data serialisation format commonly used for configuration files.

YML/YAML is mainly a configuration language, not a programming language. CI/CD platforms use it because pipeline definitions are mostly structured configuration: stages, jobs, dependencies, environment variables, triggers, commands, artifacts, etc.

> **YAML is commonly used because CI/CD pipelines are primarily declarative configuration. YAML provides a human-readable, hierarchical structure for defining stages, jobs, dependencies, triggers, environment variables, and execution steps. It is also easy to version-control alongside application code. However, YAML is not mandatory. Jenkins uses Groovy-based Jenkinsfiles, and other tools support JSON, HCL, DSLs, UI-based configuration, or general-purpose languages. YAML became popular because it provides a good balance between readability, structure, portability, and simplicity.**

**YML = YAML, usually written as .yml or .yaml.**

**YAML originally stood for “YAML Ain’t Markup Language.”**

It is designed to represent structured data in a way that is easy for humans to read.

**Key characteristics:**
- Indentation-based structure (uses **spaces**, never tabs)
- Superset of JSON (any valid JSON is valid YAML)
- Supports comments (`#`)
- Three core data structures: **scalars**, **mappings**, **sequences**
- File extensions: `.yml` or `.yaml`

```yaml
# This is YAML
name: Piyali Das
role: Senior Frontend Engineer
skills:
  - Angular
  - TypeScript
  - Docker
```

**For example:**
```
name: Angular CI

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
```
Notice that YAML itself isn't executing npm ci or npm run build.

It is describing what the CI/CD system should do.

**Think:**
```
YAML
  ↓
Configuration
  ↓
CI/CD Engine
  ↓
Executes commands
  ↓
Build / Test / Package / Deploy
```

## 2. Basic Syntax Rules

```yaml
# ── Rule 1: Indentation uses SPACES only — never tabs ─────────────────────
parent:
  child: value        # 2 spaces (most common)
    grandchild: deep  # 4 spaces

# ── Rule 2: Key-value pairs use a colon followed by a space ───────────────
name: Piyali          # ✅ correct
name:Piyali           # ❌ missing space after colon

# ── Rule 3: Case-sensitive keys ────────────────────────────────────────────
Name: Alice
name: Bob             # These are TWO different keys

# ── Rule 4: Strings don't need quotes (usually) ────────────────────────────
city: Kolkata
greeting: Hello World

# ── Rule 5: Strings MUST be quoted if they contain special characters ──────
message: "Hello: World"    # colon in value → quote it
path: "C:\\Users\\Piyali"  # backslashes → quote it
version: "1.0"             # looks like a float → quote to keep as string
enabled: "true"            # looks like boolean → quote to keep as string

# ── Rule 6: Consistent indentation within a block ─────────────────────────
server:
  host: localhost    # 2 spaces ✅
  port: 8080         # 2 spaces ✅
  # port:  8080      # 3 spaces ❌ inconsistent (would error in strict parsers)

# ── Rule 7: No duplicate keys (last one wins in most parsers) ─────────────
config:
  timeout: 30
  timeout: 60        # ⚠ duplicate key — most parsers silently use 60
```

---

## The important architecture

Think of CI/CD as three layers:
```
┌───────────────────────────────────────┐
│         Pipeline Definition           │
│                                       │
│ YAML / Groovy / DSL / UI / etc.       │
└──────────────────────┬────────────────┘
                       │
                       ▼
┌───────────────────────────────────────┐
│          CI/CD Engine                 │
│                                       │
│ GitHub Actions / Jenkins / GitLab /   │
│ Azure DevOps                          │
└──────────────────────┬────────────────┘
                       │
                       ▼
┌───────────────────────────────────────┐
│            Runner                     │
│                                       │
│ Linux / Windows / Docker / VM         │
└──────────────────────┬────────────────┘
                       │
                       ▼
             npm / Maven / Gradle /
             Docker / Terraform /
             kubectl / Python / etc.
```
YAML is only the first layer.

## Why do we use YAML for CI/CD?

A CI/CD pipeline is naturally hierarchical.

**For example:**
```
Pipeline
 ├── Trigger
 ├── Jobs
 │    ├── Build
 │    │    ├── Checkout
 │    │    ├── Install
 │    │    └── Compile
 │    │
 │    ├── Test
 │    │    └── Unit Tests
 │    │
 │    └── Deploy
 │         └── Production
 └── Environment Variables
```

**YAML represents this hierarchy very naturally.**
```
pipeline:
  trigger:
    branch: main

  jobs:
    build:
      steps:
        - checkout
        - install
        - build

    test:
      steps:
        - unit-test

    deploy:
      steps:
        - deploy
```
The indentation expresses relationships.

## Why not JavaScript / Python / Java?

You absolutely can use programming languages for CI/CD.

But there is an important distinction.

**YAML**
```
build:
  runs-on: ubuntu-latest

  steps:
    - run: npm ci
    - run: npm test
    - run: npm run build
```
This says:

What should happen?

**Whereas Python might look like:**
```
pipeline = Pipeline()

pipeline.add_job(
    Job(
        name="build",
        runner="ubuntu-latest",
        steps=[
            "npm ci",
            "npm test",
            "npm run build"
        ]
    )
)
```
Python gives you much more power.

But that's also the problem.

You now have programming logic defining configuration.

**CI/CD configuration usually doesn't need:**
```
for ...
if ...
class ...
function ...
try ...
except ...
```
So YAML keeps the pipeline definition relatively declarative.

## Declarative vs Imperative

This is one of the most important concepts for understanding CI/CD.

**YAML → primarily declarative**

**You describe:**
> **"I want these jobs and these steps."**
```
jobs:
  build:
    steps:
      - run: npm ci
      - run: npm run build
Python → imperative
```

**You describe:**
> **"Create this object, execute this function, check this condition, then execute another function."**

```
pipeline = Pipeline()

if branch == "main":
    pipeline.run("build")

pipeline.run("test")
```

**So conceptually:**
```
YAML
 ↓
WHAT should happen?

Programming language
 ↓
HOW should it happen?
```

## YAML is not actually executing the pipeline

This is a common misconception.

**Suppose you have GitHub Actions:**
```
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - run: npm ci
      - run: npm run build
```

**The architecture is roughly:**
```
              .github/workflows/ci.yml
                         │
                         ▼
                 GitHub Actions
                  YAML Parser
                         │
                         ▼
                  Workflow Engine
                         │
                         ▼
                 Runner / VM
                         │
                         ▼
                    npm ci
                         │
                         ▼
                  npm run build
```
YAML is essentially the instruction/configuration format consumed by the CI/CD engine.

## Why YAML became popular

There are several reasons.

### ① Human-readable

**Compare JSON:**
```
{
  "jobs": {
    "build": {
      "runs-on": "ubuntu-latest",
      "steps": [
        {
          "run": "npm ci"
        },
        {
          "run": "npm run build"
        }
      ]
    }
  }
}
```

**With YAML:**
```
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: npm run build
```
YAML is considerably easier to read.

### ② Hierarchical structure

**CI/CD has lots of nested configuration:**
```
pipeline
 └── stages
      └── jobs
           └── steps
                └── commands
```
YAML handles this naturally.

### ③ Easy to version-control

**Your pipeline becomes code stored alongside your application:**
```
my-angular-app/
│
├── src/
├── package.json
├── Dockerfile
└── .github/
    └── workflows/
        └── ci.yml
```
**So you get:**
```
Git
 │
 ├── Application code
 ├── Infrastructure configuration
 └── CI/CD configuration
```
You can review pipeline changes through pull requests.

### ④ Platform-independent data format

**YAML isn't tied specifically to CI/CD.**

**It's used for:**
- Kubernetes
- Docker Compose
- GitHub Actions
- GitLab CI
- Azure DevOps
- Ansible
- Helm
- Argo CD
- many configuration systems

So developers became familiar with it.

## Is YAML mandatory for CI/CD?

No. Absolutely not.

This is very important.

YAML is just one way of defining a pipeline.

Different CI/CD systems support different approaches.

## Alternatives to YAML

There are several.

### A. JSON

Technically you can represent pipeline configuration using JSON.

Example:
```
{
  "job": {
    "name": "build",
    "steps": [
      "npm ci",
      "npm run build"
    ]
  }
}
```
But JSON is generally more verbose and less pleasant for humans.

Therefore YAML is usually preferred when the platform supports it.

### Groovy — Jenkins

Jenkins is a great example.

**Jenkins traditionally uses a Groovy-based Jenkinsfile.**
```
pipeline {
    agent any

    stages {

        stage('Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Deploy') {
            steps {
                sh './deploy.sh'
            }
        }
    }
}
```
**So:**
```
Jenkins
   ↓
Jenkinsfile
   ↓
Groovy DSL
```
This is a very important alternative to YAML.

### HCL — HashiCorp ecosystem

HashiCorp uses HCL (HashiCorp Configuration Language) extensively.

**For example, Terraform:**
```
resource "aws_instance" "app" {
  ami           = "ami-123"
  instance_type = "t3.medium"
}
```
HCL is another configuration language.

**Conceptually:**
```
YAML
HCL
JSON
TOML
XML
```
are all possible configuration formats.

### Starlark

Some systems use Starlark, which is Python-like but intentionally restricted.

**For example, Bazel uses Starlark extensively.**
```
cc_binary(
    name = "app",
    srcs = ["main.cc"],
)
```
It looks like Python but isn't general-purpose Python.

### TypeScript / JavaScript-based CI/CD

Modern CI/CD tooling can also use programming languages.

For example, AWS CDK allows infrastructure to be defined using:
```
const bucket = new s3.Bucket(this, "MyBucket");
```
And there are frameworks/tools where pipelines can be defined programmatically.

This approach is often called:
```
Pipeline as Code
```
although YAML-based pipelines are also Pipeline as Code.

## GitHub Actions

**GitHub Actions uses YAML workflow files:**
```
.github/
└── workflows/
    └── ci.yml
```

**Example:**
```
name: CI

on:
  push:
    branches: [main]

jobs:

  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - run: npm ci

      - run: npm test

      - run: npm run build
```

## GitLab CI

**GitLab also uses YAML:**
```
stages:
  - build
  - test
  - deploy

build:
  stage: build
  script:
    - npm ci
    - npm run build

test:
  stage: test
  script:
    - npm test

deploy:
  stage: deploy
  script:
    - ./deploy.sh
```

## Jenkins vs GitHub Actions vs Azure DevOps
| Platform            | Typical Pipeline Definition     |
| ------------------- | ------------------------------- |
| GitHub Actions      | YAML                            |
| GitLab CI/CD        | YAML                            |
| Azure DevOps        | YAML / Classic UI               |
| Jenkins             | Jenkinsfile / Groovy            |
| CircleCI            | YAML                            |
| Bitbucket Pipelines | YAML                            |
| AWS CodePipeline    | AWS configuration / IaC options |
| Tekton              | Kubernetes YAML                 |
| Argo Workflows      | Kubernetes YAML                 |

## Why doesn't everyone just use Python?

This is where the design philosophy becomes important.

**Imagine this:**
```
if environment == "production":
    deploy()

for server in servers:
    connect(server)

try:
    deploy_application()
except Exception:
    rollback()
```
Now the CI/CD system has to execute arbitrary Python.

**That creates additional concerns:**
```
Security
   ↓
Execution model
   ↓
Sandboxing
   ↓
Dependencies
   ↓
Python versions
   ↓
Libraries
   ↓
Runtime behavior
```

**With declarative YAML:**
```
deploy:
  environment: production
  steps:
    - run: ./deploy.sh
```
the CI/CD engine controls the execution model.

The YAML describes the desired pipeline; the platform determines how it gets executed.

## But YAML has problems too

YAML is not perfect.

It has some notorious issues:

**Indentation sensitivity**
```
jobs:
  build:
    steps:
      - run: npm test
```
Accidental indentation can break things.

**Complex expressions become ugly**
```
if: ${{ github.ref == 'refs/heads/main' && github.event_name == 'push' }}
```
Large pipelines can become difficult to maintain.

YAML syntax quirks

YAML has implicit typing and various syntax edge cases that can surprise developers.

**Large pipelines become complicated**

A 1,000-line YAML file can become difficult to understand.

**That's why organizations often use:**
```
YAML
 +
Reusable workflows
 +
Templates
 +
Scripts
 +
Custom actions
```
rather than putting everything into one YAML file.





