# YAML Cheatbook — Complete Configuration Reference

A comprehensive reference for every YAML syntax, data type, and configuration key with clear explanations, real-world examples, and common use cases. From beginner basics to advanced anchors, multi-document streams, and schema patterns.

---

## Table of Contents

1. [What is YAML?](#1-what-is-yaml)
2. [Basic Syntax Rules](#2-basic-syntax-rules)
3. [Scalars — Strings](#3-scalars--strings)
4. [Scalars — Numbers & Booleans](#4-scalars--numbers--booleans)
5. [Scalars — Null & Special Values](#5-scalars--null--special-values)
6. [Collections — Mappings (Objects)](#6-collections--mappings-objects)
7. [Collections — Sequences (Arrays)](#7-collections--sequences-arrays)
8. [Nested Structures](#8-nested-structures)
9. [Multi-line Strings](#9-multi-line-strings)
10. [Anchors & Aliases](#10-anchors--aliases)
11. [Merge Keys](#11-merge-keys)
12. [Tags & Explicit Types](#12-tags--explicit-types)
13. [Multi-Document Streams](#13-multi-document-streams)
14. [Comments](#14-comments)
15. [Docker Compose YAML Reference](#15-docker-compose-yaml-reference)
16. [GitHub Actions YAML Reference](#16-github-actions-yaml-reference)
17. [Kubernetes YAML Reference](#17-kubernetes-yaml-reference)
18. [Ansible YAML Reference](#18-ansible-yaml-reference)
19. [OpenAPI / Swagger YAML Reference](#19-openapi--swagger-yaml-reference)
20. [Common Mistakes & Gotchas](#20-common-mistakes--gotchas)
21. [Quick Reference Card](#21-quick-reference-card)

---

## 1. What is YAML?

**YAML** (YAML Ain't Markup Language) is a human-readable data serialisation format commonly used for configuration files.

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

---

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

## 3. Scalars — Strings

```yaml
# ── Plain (unquoted) strings ──────────────────────────────────────────────
name: John Doe
city: New York
path: /usr/local/bin

# ── Single-quoted strings ──────────────────────────────────────────────────
# No escape sequences are processed. What you see is what you get.
message: 'Hello World'
regex: '\d+\.\d+'              # backslash is literal, not an escape
special: 'It''s a nice day'    # escape a single quote by doubling it

# ── Double-quoted strings ─────────────────────────────────────────────────
# Escape sequences ARE processed.
greeting: "Hello\nWorld"       # \n becomes a newline
tab: "col1\tcol2"              # \t becomes a tab
unicode: "\u0041"              # becomes "A"
path: "C:\\Program Files"      # \\ becomes \
quote: "She said \"hi\""       # \" becomes "

# ── Escape sequences in double-quoted strings ─────────────────────────────
# \n   = newline
# \r   = carriage return
# \t   = tab
# \\   = backslash
# \"   = double quote
# \0   = null character
# \a   = bell
# \b   = backspace
# \uXXXX    = Unicode code point (4 hex digits)
# \UXXXXXXXX = Unicode code point (8 hex digits)

# ── Strings that look like other types — always quote these ───────────────
version: "1.0"          # without quotes → parsed as float 1.0
flag: "true"            # without quotes → parsed as boolean true
empty: ""               # explicit empty string
null_str: "null"        # without quotes → parsed as null
date_str: "2025-01-15"  # without quotes → may be parsed as a date
octal: "0777"           # without quotes → may be parsed as octal number
yes_str: "yes"          # without quotes → may be parsed as boolean true
```

---

## 4. Scalars — Numbers & Booleans

```yaml
# ── Integers ──────────────────────────────────────────────────────────────
age: 30
port: 8080
negative: -42
large: 1_000_000        # underscores as visual separators (YAML 1.2)

# ── Octal (base 8) ────────────────────────────────────────────────────────
file_permissions: 0o755   # YAML 1.2 syntax
# file_permissions: 0755  # YAML 1.1 (deprecated — many parsers still accept)

# ── Hexadecimal ───────────────────────────────────────────────────────────
color: 0xFF5733
memory_address: 0x1A2B3C

# ── Binary ────────────────────────────────────────────────────────────────
flags: 0b1101

# ── Floats ────────────────────────────────────────────────────────────────
price: 9.99
ratio: 0.75
scientific: 1.5e10        # 15,000,000,000
negative_float: -3.14

# ── Special float values ──────────────────────────────────────────────────
infinity_pos: .inf
infinity_neg: -.inf
not_a_number: .nan

# ── Booleans ──────────────────────────────────────────────────────────────
# YAML 1.2 (strict): only true/false
enabled: true
disabled: false

# YAML 1.1 (legacy — some parsers still accept these):
# true, True, TRUE, yes, Yes, YES, on, On, ON  → all boolean true
# false, False, FALSE, no, No, NO, off, Off, OFF → all boolean false

# Best practice: always use lowercase true / false
active: true
debug: false

# If you need the word "yes" or "no" as a string, quote it:
answer: "yes"
response: "no"
```

---

## 5. Scalars — Null & Special Values

```yaml
# ── Null values ───────────────────────────────────────────────────────────
# All of these represent null/nil/None:
key1: null
key2: ~
key3:           # empty value = null

# If you want the string "null", quote it:
status: "null"

# ── Timestamps / Dates ────────────────────────────────────────────────────
# ISO 8601 format — parsed as datetime by many parsers
created_at: 2025-01-15
updated_at: 2025-01-15T10:30:00
with_timezone: 2025-01-15T10:30:00+05:30
utc: 2025-01-15T10:30:00Z

# Quoted to keep as string
date_string: "2025-01-15"
```

---

## 6. Collections — Mappings (Objects)

A **mapping** is a set of key-value pairs — equivalent to a JSON object or a dictionary.

```yaml
# ── Block mapping (multi-line, most readable) ─────────────────────────────
person:
  name: Piyali Das
  age: 34
  city: Kolkata

# ── Flow mapping (inline, JSON-style) ─────────────────────────────────────
person: {name: Piyali Das, age: 34, city: Kolkata}

# ── Nested mappings ───────────────────────────────────────────────────────
server:
  database:
    host: localhost
    port: 5432
    credentials:
      username: admin
      password: secret

# ── Keys with special characters (must be quoted) ─────────────────────────
"content-type": application/json
"x-api-key": abc123
"127.0.0.1": localhost

# ── Complex / multi-word keys (using ? notation) ──────────────────────────
? "this is a long key"
: "this is its value"

# ── Mapping with mixed value types ────────────────────────────────────────
config:
  name: myapp           # string
  port: 3000            # integer
  debug: true           # boolean
  timeout: 30.5         # float
  description: null     # null
  tags:                 # sequence
    - web
    - api

# ── Empty mapping ─────────────────────────────────────────────────────────
metadata: {}

# ── Ordered keys (YAML mappings are technically unordered) ────────────────
# Most parsers preserve insertion order, but rely on this with caution.
step_1: install
step_2: configure
step_3: start
```

---

## 7. Collections — Sequences (Arrays)

A **sequence** is an ordered list — equivalent to a JSON array.

```yaml
# ── Block sequence (multi-line, most readable) ────────────────────────────
fruits:
  - apple
  - banana
  - cherry

# ── Flow sequence (inline, JSON-style) ────────────────────────────────────
fruits: [apple, banana, cherry]

# ── Sequence of mappings (list of objects) ────────────────────────────────
users:
  - name: Alice
    role: admin
  - name: Bob
    role: viewer
  - name: Carol
    role: editor

# ── Mixed-type sequence ───────────────────────────────────────────────────
mixed:
  - 42
  - "hello"
  - true
  - null
  - 3.14

# ── Nested sequences ──────────────────────────────────────────────────────
matrix:
  - [1, 2, 3]
  - [4, 5, 6]
  - [7, 8, 9]

# ── Sequence at root level ────────────────────────────────────────────────
- item1
- item2
- item3

# ── Compact notation for sequence of mappings ─────────────────────────────
# The dash IS the first key's bullet:
- name: Alice
  age: 30
- name: Bob
  age: 25

# ── Empty sequence ────────────────────────────────────────────────────────
tags: []
```

---

## 8. Nested Structures

```yaml
# ── Deep nesting ──────────────────────────────────────────────────────────
application:
  name: MyApp
  version: "2.1.0"
  server:
    host: 0.0.0.0
    port: 8080
    ssl:
      enabled: true
      cert: /etc/ssl/cert.pem
      key: /etc/ssl/key.pem
  database:
    primary:
      host: db-primary.internal
      port: 5432
      name: myapp_prod
    replicas:
      - host: db-replica-1.internal
        port: 5432
      - host: db-replica-2.internal
        port: 5432
  cache:
    type: redis
    host: redis.internal
    port: 6379
    ttl: 3600
  logging:
    level: info
    format: json
    outputs:
      - type: stdout
      - type: file
        path: /var/log/myapp.log
        max_size: 100MB
        max_backups: 5

# ── Sequence of objects with nested sequences ────────────────────────────
teams:
  - name: Frontend
    lead: Piyali
    members:
      - Alice
      - Bob
      - Carol
    stack:
      languages: [TypeScript, SCSS]
      frameworks: [Angular, RxJS]
  - name: Backend
    lead: Dave
    members:
      - Eve
      - Frank
    stack:
      languages: [Java, Python]
      frameworks: [Spring Boot, FastAPI]
```

---

## 9. Multi-line Strings

YAML has two block scalar styles: **literal** (`|`) and **folded** (`>`).

```yaml
# ── Literal Block Scalar  |  ───────────────────────────────────────────────
# Newlines are preserved exactly as written. Good for scripts, code, poetry.
script: |
  #!/bin/bash
  echo "Starting deployment..."
  npm run build
  npm run test
  echo "Done!"

# Result: the string contains literal newlines between each line.

# ── Folded Block Scalar  >  ────────────────────────────────────────────────
# Newlines are folded (converted to spaces). Good for long descriptions.
description: >
  This is a very long description that spans
  multiple lines for readability, but will
  be joined into a single line when parsed.

# Result: "This is a very long description that spans multiple lines for
#          readability, but will be joined into a single line when parsed.\n"

# ── Block Chomping Indicators ─────────────────────────────────────────────
# Controls trailing newlines at the end of the block.

# Default (clip): keeps exactly ONE trailing newline
message: |
  Hello World

# Strip  |-  : removes ALL trailing newlines
message_stripped: |-
  Hello World

# Keep   |+  : keeps ALL trailing newlines (including blank lines at end)
message_keep: |+
  Hello World


# ── Indentation Indicator ─────────────────────────────────────────────────
# Explicitly set indentation level when content starts with spaces
code: |2
  function hello() {
    console.log("Hello");
  }

# ── Literal block preserving internal newlines ────────────────────────────
sql_query: |
  SELECT u.id, u.name, o.total
  FROM users u
  JOIN orders o ON u.id = o.user_id
  WHERE o.created_at > '2025-01-01'
  ORDER BY o.total DESC;

# ── Folded — blank lines become actual newlines ───────────────────────────
paragraphs: >
  First paragraph content here
  continues on this line.

  Second paragraph starts after blank line.
  It continues here.

# Result: "First paragraph content here continues on this line.\n
#          Second paragraph starts after blank line. It continues here.\n"

# ── Single-line multi-line alternatives ───────────────────────────────────
# Use \n in double-quoted string for simple cases
message: "Line one\nLine two\nLine three"
```

---

## 10. Anchors & Aliases

Anchors (`&`) define a reusable node. Aliases (`*`) reference it. Avoids duplication (DRY).

```yaml
# ── Define an anchor ──────────────────────────────────────────────────────
defaults: &defaults
  retries: 3
  timeout: 30
  log_level: info

# ── Reference the anchor (alias) ─────────────────────────────────────────
development:
  <<: *defaults           # merges all keys from defaults
  environment: dev
  debug: true

production:
  <<: *defaults           # same defaults
  environment: prod
  debug: false

# ── Result after YAML processing ──────────────────────────────────────────
# development:
#   retries: 3
#   timeout: 30
#   log_level: info
#   environment: dev
#   debug: true

# ── Override merged values ────────────────────────────────────────────────
staging:
  <<: *defaults
  timeout: 60             # overrides the anchored value of 30
  environment: staging

# ── Anchor on a scalar ────────────────────────────────────────────────────
base_image: &base_image node:20-alpine

services:
  api:
    image: *base_image    # uses "node:20-alpine"
  worker:
    image: *base_image

# ── Anchor on a sequence ──────────────────────────────────────────────────
common_env: &common_env
  - NODE_ENV=production
  - TZ=Asia/Kolkata

api:
  environment: *common_env

worker:
  environment: *common_env

# ── Multiple anchors ──────────────────────────────────────────────────────
db_config: &db
  host: db.internal
  port: 5432

cache_config: &cache
  host: redis.internal
  port: 6379

services:
  api:
    database: *db
    cache: *cache
```

---

## 11. Merge Keys

The merge key `<<` is a YAML extension that merges mappings together.

```yaml
# ── Basic merge ───────────────────────────────────────────────────────────
base: &base
  color: blue
  size: medium
  weight: 10

item:
  <<: *base
  name: Widget       # adds a new key
  color: red         # overrides color from base

# Result:
# item:
#   color: red       ← overridden
#   size: medium     ← from base
#   weight: 10       ← from base
#   name: Widget     ← new

# ── Merge multiple anchors ────────────────────────────────────────────────
defaults: &defaults
  timeout: 30
  retries: 3

logging: &logging
  log_level: info
  log_format: json

service:
  <<: [*defaults, *logging]   # merge both anchors
  name: my-service

# Result:
# service:
#   timeout: 30
#   retries: 3
#   log_level: info
#   log_format: json
#   name: my-service

# ── Merge priority (first listed wins on conflict) ────────────────────────
a: &a
  x: 1
  y: 2

b: &b
  y: 99    # conflicts with a.y
  z: 3

merged:
  <<: [*a, *b]    # a.y=2 wins over b.y=99 (first listed takes priority)
  # Result: x:1, y:2, z:3
```

---

## 12. Tags & Explicit Types

Tags force a specific type interpretation.

```yaml
# ── Explicit string tag ───────────────────────────────────────────────────
port: !!str 8080          # force 8080 to be a string, not integer
version: !!str 1.0        # force to string

# ── Explicit int tag ──────────────────────────────────────────────────────
count: !!int "42"         # parse "42" string as integer

# ── Explicit float tag ────────────────────────────────────────────────────
ratio: !!float "0.5"

# ── Explicit boolean tag ──────────────────────────────────────────────────
flag: !!bool "true"

# ── Explicit null tag ─────────────────────────────────────────────────────
value: !!null ""

# ── Explicit binary tag (base64 encoded) ──────────────────────────────────
image_data: !!binary |
  R0lGODlhDAAMAIQAAP//9tX197gAAANJSUoEBATt7e3p6enq6uqprIDS
  FA7LS7u7u7pWFhYSEhIZ2Z2pgAAAYAAAAICDAAAACAAAAAAAAA==

# ── Explicit sequence and mapping tags ────────────────────────────────────
items: !!seq
  - one
  - two

config: !!map
  key: value

# ── Custom application tags ───────────────────────────────────────────────
# Used by specific applications (e.g., AWS CloudFormation intrinsic functions)
resource: !Ref MyBucket
command: !Sub "Hello ${Name}"
```

---

## 13. Multi-Document Streams

A single YAML file can contain multiple documents separated by `---`.

```yaml
# Document 1
---
name: Alice
role: admin

# Document 2
---
name: Bob
role: viewer

# Document 3
---
name: Carol
role: editor
...         # optional end-of-document marker
```

```yaml
# Real-world use: Kubernetes multiple resources in one file
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  PORT: "8080"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  ...

---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: ClusterIP
  ...
```

---

## 14. Comments

```yaml
# This is a full-line comment

name: Piyali Das   # This is an inline comment

# Comments can appear before any key
# They document the purpose of the following config
database:
  # Primary database connection
  host: localhost       # change in production
  port: 5432            # default PostgreSQL port
  name: myapp           # database name
  # Connection pool settings
  pool:
    min: 2              # minimum connections
    max: 10             # maximum connections — set based on DB max_connections

# Multi-line comments just use multiple # lines
# This section configures the cache layer.
# Redis is used for session storage and rate limiting.
# Change TTL values based on your use case.
cache:
  host: redis.internal
  ttl: 3600
```

> **Note:** Comments cannot appear inside flow sequences `[]` or flow mappings `{}`.

---

## 15. Docker Compose YAML Reference

```yaml
# docker-compose.yml — Complete annotated reference
version: "3.9"      # Compose file format version

services:

  # ── Service Definition ─────────────────────────────────────────────────
  api:
    # Build from a Dockerfile
    build:
      context: .                   # path to build context
      dockerfile: Dockerfile.prod  # custom Dockerfile name
      args:                        # build arguments (ARG in Dockerfile)
        NODE_ENV: production
        APP_VERSION: "1.0.0"
      target: production           # multi-stage build target
      cache_from:
        - myapp:cache

    # OR use a pre-built image
    image: myapp:latest

    container_name: myapp-api      # custom name (avoid in scaled services)

    # Restart policy
    restart: unless-stopped        # no | always | on-failure | unless-stopped

    # Port mappings: "host:container"
    ports:
      - "8080:80"
      - "8443:443"
      - "127.0.0.1:9000:9000"     # bind to specific host interface

    # Environment variables
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:pass@db:5432/mydb
      - REDIS_URL=redis://cache:6379    # alternate syntax

    # Load from env file
    env_file:
      - .env
      - .env.production

    # Service dependencies
    depends_on:
      db:
        condition: service_healthy     # wait for health check to pass
      cache:
        condition: service_started     # just wait for container to start

    # Volume mounts
    volumes:
      - ./src:/app/src                 # bind mount (host:container)
      - media_files:/app/media         # named volume
      - /tmp/logs:/app/logs            # absolute host path
      - type: bind                     # explicit mount syntax
        source: ./config
        target: /app/config
        read_only: true

    # Networks to connect to
    networks:
      - backend
      - frontend

    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s      # time between checks
      timeout: 10s       # time to wait for response
      retries: 3         # consecutive failures before unhealthy
      start_period: 40s  # grace period during startup

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
      replicas: 3                      # number of instances
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        parallelism: 1                 # update 1 container at a time
        delay: 10s
        failure_action: rollback

    # Override CMD
    command: ["node", "dist/server.js"]

    # Override ENTRYPOINT
    entrypoint: ["/docker-entrypoint.sh"]

    # Set working directory
    working_dir: /app

    # Run as specific user
    user: "1001:1001"

    # Hostname inside container
    hostname: api-server

    # Extra /etc/hosts entries
    extra_hosts:
      - "internal-db:192.168.1.10"

    # Labels
    labels:
      app: myapp
      tier: backend
      version: "1.0.0"

    # Logging configuration
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

    # Security options
    security_opt:
      - no-new-privileges:true

    # Linux capabilities
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

    # Read-only filesystem
    read_only: true
    tmpfs:
      - /tmp
      - /run

    # Exposed ports (metadata only, not published)
    expose:
      - "8080"

    # Stdin / TTY
    stdin_open: true   # -i
    tty: true          # -t

    # Sysctls
    sysctls:
      net.core.somaxconn: 1024

    # ulimits
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # ── Database Service ────────────────────────────────────────────────────
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Cache Service ────────────────────────────────────────────────────────
  cache:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - backend

# ── Named Volumes ────────────────────────────────────────────────────────
volumes:
  pgdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/postgres
  redis_data:
  media_files:
    external: true            # volume created outside compose

# ── Networks ─────────────────────────────────────────────────────────────
networks:
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  frontend:
    driver: bridge
  external_network:
    external: true            # use a pre-existing network

# ── Secrets ──────────────────────────────────────────────────────────────
secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    external: true
```

---

## 16. GitHub Actions YAML Reference

```yaml
# .github/workflows/ci.yml — Complete annotated reference

# Workflow name (shown in GitHub UI)
name: CI/CD Pipeline

# ── Triggers ──────────────────────────────────────────────────────────────
on:
  # Trigger on push to specific branches
  push:
    branches:
      - main
      - develop
      - "release/**"
    paths:                        # only trigger if these paths change
      - "src/**"
      - "package.json"
    tags:
      - "v*"                      # trigger on version tags

  # Trigger on pull request events
  pull_request:
    branches:
      - main
    types:                        # PR event types
      - opened
      - synchronize
      - reopened

  # Manual trigger with optional inputs
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment environment"
        required: true
        default: staging
        type: choice
        options: [staging, production]
      debug:
        description: "Enable debug mode"
        type: boolean
        default: false

  # Scheduled trigger (cron)
  schedule:
    - cron: "0 2 * * 1"          # Every Monday at 2 AM UTC

  # Trigger another workflow
  workflow_call:
    inputs:
      tag:
        required: true
        type: string

# ── Environment Variables ──────────────────────────────────────────────────
env:
  NODE_VERSION: "20"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

# ── Jobs ──────────────────────────────────────────────────────────────────
jobs:

  # ── Job 1: Lint & Test ───────────────────────────────────────────────────
  test:
    name: Lint and Test
    runs-on: ubuntu-latest         # runner OS

    # Run on multiple OS / Node versions
    strategy:
      fail-fast: false             # continue other matrix jobs on failure
      matrix:
        node: [18, 20]
        os: [ubuntu-latest, windows-latest]

    # Override runs-on when using matrix
    # runs-on: ${{ matrix.os }}

    # Job-level environment
    env:
      CI: true

    # Concurrency: cancel in-progress runs on same branch
    concurrency:
      group: test-${{ github.ref }}
      cancel-in-progress: true

    # Timeout (minutes)
    timeout-minutes: 30

    # Permissions for this job
    permissions:
      contents: read
      pull-requests: write

    # Service containers (run alongside the job)
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: secret
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      # ── Step: Checkout ──────────────────────────────────────────────────
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0           # full history (needed for some tools)

      # ── Step: Setup Node ────────────────────────────────────────────────
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm               # cache node_modules

      # ── Step: Cache ─────────────────────────────────────────────────────
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      # ── Step: Install ───────────────────────────────────────────────────
      - name: Install dependencies
        run: npm ci

      # ── Step: Lint ──────────────────────────────────────────────────────
      - name: Run ESLint
        run: npm run lint

      # ── Step: Test ──────────────────────────────────────────────────────
      - name: Run tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:secret@localhost:5432/testdb

      # ── Step: Upload coverage artifact ─────────────────────────────────
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

      # ── Step: Conditional step ──────────────────────────────────────────
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Tests passed!'
            })

  # ── Job 2: Build & Push Docker Image ────────────────────────────────────
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test                    # run after test job succeeds
    if: github.ref == 'refs/heads/main'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=semver,pattern={{version}}
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Job 3: Deploy ─────────────────────────────────────────────────────
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test, build]
    environment:
      name: production
      url: https://myapp.com

    steps:
      - name: Deploy
        run: echo "Deploying ${{ needs.build.outputs.image }}"
        env:
          SSH_KEY: ${{ secrets.DEPLOY_KEY }}

# ── Reusable workflow inputs / outputs / secrets ──────────────────────────
# on:
#   workflow_call:
#     inputs:
#       environment: { required: true, type: string }
#     outputs:
#       image_tag: { value: ${{ jobs.build.outputs.tag }} }
#     secrets:
#       DEPLOY_KEY: { required: true }
```

---

## 17. Kubernetes YAML Reference

```yaml
# ── Namespace ────────────────────────────────────────────────────────────
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    environment: production

---
# ── ConfigMap ────────────────────────────────────────────────────────────
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: myapp
data:
  PORT: "8080"                    # string values only
  LOG_LEVEL: info
  config.json: |                  # multi-line file as config value
    {
      "retries": 3,
      "timeout": 30
    }

---
# ── Secret ───────────────────────────────────────────────────────────────
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: myapp
type: Opaque
data:
  # Values must be base64 encoded: echo -n "value" | base64
  DB_PASSWORD: c2VjcmV0          # "secret" in base64
  API_KEY: YWJjMTIz              # "abc123" in base64
stringData:                       # plaintext (auto-encoded by Kubernetes)
  STRIPE_KEY: sk_live_abc123

---
# ── Deployment ───────────────────────────────────────────────────────────
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  labels:
    app: myapp
    version: "1.0.0"
spec:
  replicas: 3                     # number of pod copies
  selector:
    matchLabels:
      app: myapp                  # must match pod template labels

  # Rolling update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                 # max extra pods during update
      maxUnavailable: 0           # max pods that can be unavailable

  template:
    metadata:
      labels:
        app: myapp
    spec:
      # Security context for the pod
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 2000

      # Init containers (run before main containers)
      initContainers:
        - name: wait-for-db
          image: busybox
          command: ['sh', '-c', 'until nc -z db 5432; do sleep 1; done']

      containers:
        - name: api
          image: myregistry.io/myapp:1.0.0
          imagePullPolicy: Always  # Always | IfNotPresent | Never

          ports:
            - name: http
              containerPort: 8080
              protocol: TCP

          # Environment from ConfigMap
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets

          # Individual env vars
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NODE_ENV
              value: production

          # Resource requests and limits
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"         # 100 millicores = 0.1 CPU
            limits:
              memory: "512Mi"
              cpu: "500m"

          # Liveness probe (restart container if fails)
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3

          # Readiness probe (remove from load balancer if fails)
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5

          # Startup probe (for slow-starting containers)
          startupProbe:
            httpGet:
              path: /health/live
              port: 8080
            failureThreshold: 30
            periodSeconds: 10

          # Volume mounts
          volumeMounts:
            - name: config
              mountPath: /app/config
              readOnly: true
            - name: tmp
              mountPath: /tmp

          # Container security context
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]

      # Volumes
      volumes:
        - name: config
          configMap:
            name: app-config
        - name: secrets
          secret:
            secretName: app-secrets
        - name: tmp
          emptyDir: {}
        - name: persistent-storage
          persistentVolumeClaim:
            claimName: myapp-pvc

      # Node selector
      nodeSelector:
        disktype: ssd

      # Tolerations (schedule on tainted nodes)
      tolerations:
        - key: dedicated
          operator: Equal
          value: myapp
          effect: NoSchedule

      # Affinity rules
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    app: myapp

      # Image pull secrets (for private registries)
      imagePullSecrets:
        - name: registry-credentials

      # Graceful shutdown time
      terminationGracePeriodSeconds: 60

---
# ── Service ───────────────────────────────────────────────────────────────
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: myapp
spec:
  selector:
    app: myapp                    # routes to pods with this label
  type: ClusterIP                 # ClusterIP | NodePort | LoadBalancer
  ports:
    - name: http
      port: 80                    # service port
      targetPort: 8080            # container port
      protocol: TCP

---
# ── HorizontalPodAutoscaler ───────────────────────────────────────────────
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 18. Ansible YAML Reference

```yaml
# playbook.yml — Annotated Ansible playbook reference

---
- name: Configure web servers                # play name
  hosts: webservers                          # inventory group
  become: true                               # sudo / privilege escalation
  become_user: root
  gather_facts: true                         # collect system info

  # Variables for this play
  vars:
    app_port: 8080
    app_user: deploy
    app_dir: /opt/myapp

  # Load variables from file
  vars_files:
    - vars/secrets.yml
    - vars/common.yml

  # Handlers (run when notified, only once at end of play)
  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted

    - name: reload systemd
      systemd:
        daemon_reload: true

  tasks:
    # ── Basic command execution ─────────────────────────────────────────
    - name: Update apt package cache
      apt:
        update_cache: true
        cache_valid_time: 3600    # skip if cache < 1 hour old

    # ── Install packages ────────────────────────────────────────────────
    - name: Install required packages
      apt:
        name:
          - nginx
          - curl
          - git
        state: present             # present | absent | latest

    # ── Manage files ────────────────────────────────────────────────────
    - name: Create app directory
      file:
        path: "{{ app_dir }}"
        state: directory           # directory | file | absent | touch | link
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: "0755"

    # ── Template a config file ──────────────────────────────────────────
    - name: Deploy nginx config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/sites-available/myapp
        owner: root
        group: root
        mode: "0644"
      notify: restart nginx        # trigger handler

    # ── Conditional execution ───────────────────────────────────────────
    - name: Start service on Debian
      service:
        name: nginx
        state: started
        enabled: true
      when: ansible_os_family == "Debian"

    # ── Loop over items ─────────────────────────────────────────────────
    - name: Create system users
      user:
        name: "{{ item.name }}"
        groups: "{{ item.groups }}"
        shell: /bin/bash
      loop:
        - { name: deploy, groups: www-data }
        - { name: monitor, groups: adm }

    # ── Register output and use in next task ────────────────────────────
    - name: Check if app is running
      command: systemctl is-active myapp
      register: app_status
      ignore_errors: true

    - name: Start app if not running
      command: systemctl start myapp
      when: app_status.rc != 0

    # ── Block with error handling ────────────────────────────────────────
    - name: Deploy application
      block:
        - name: Pull latest code
          git:
            repo: https://github.com/user/repo.git
            dest: "{{ app_dir }}"
            version: main
        - name: Install dependencies
          command: npm ci
          args:
            chdir: "{{ app_dir }}"
      rescue:
        - name: Rollback on failure
          command: git checkout HEAD~1
          args:
            chdir: "{{ app_dir }}"
      always:
        - name: Log deployment attempt
          lineinfile:
            path: /var/log/deploy.log
            line: "Deployment attempted at {{ ansible_date_time.iso8601 }}"

    # ── Tags for selective execution ─────────────────────────────────────
    - name: Restart nginx
      service:
        name: nginx
        state: restarted
      tags:
        - nginx
        - restart
```

---

## 19. OpenAPI / Swagger YAML Reference

```yaml
# openapi.yml — Complete annotated OpenAPI 3.0 reference

openapi: "3.0.3"

info:
  title: Booking API
  description: |
    REST API for the IRCTC Tatkal booking system.
    Supports seat search, booking, payment, and PNR lookup.
  version: "1.0.0"
  contact:
    name: Piyali Das
    email: piyalidas.it@gmail.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.irctc.com/v1
    description: Production
  - url: https://staging-api.irctc.com/v1
    description: Staging
  - url: http://localhost:8080/v1
    description: Local development

# ── Authentication ─────────────────────────────────────────────────────────
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  # ── Reusable Schemas ───────────────────────────────────────────────────
  schemas:
    Booking:
      type: object
      required:
        - train_id
        - journey_date
        - passengers
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
          example: "550e8400-e29b-41d4-a716-446655440000"
        train_id:
          type: string
          example: "12345"
        journey_date:
          type: string
          format: date
          example: "2025-06-15"
        class:
          type: string
          enum: [SL, 3A, 2A, 1A, CC, EC]
          example: SL
        status:
          type: string
          enum: [PENDING, CONFIRMED, CANCELLED, WAITLISTED]
          readOnly: true
        passengers:
          type: array
          minItems: 1
          maxItems: 6
          items:
            $ref: "#/components/schemas/Passenger"
        fare:
          type: number
          format: float
          example: 2450.50

    Passenger:
      type: object
      required: [name, age, gender]
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 100
          example: Piyali Das
        age:
          type: integer
          minimum: 1
          maximum: 120
          example: 34
        gender:
          type: string
          enum: [M, F, O]

    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object

  # ── Reusable Parameters ────────────────────────────────────────────────
  parameters:
    BookingId:
      name: booking_id
      in: path
      required: true
      schema:
        type: string
        format: uuid

  # ── Reusable Responses ─────────────────────────────────────────────────
  responses:
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    Unauthorized:
      description: Authentication required

# ── Global Security ────────────────────────────────────────────────────────
security:
  - BearerAuth: []

# ── Paths (Endpoints) ──────────────────────────────────────────────────────
paths:
  /bookings:
    get:
      summary: List user bookings
      operationId: listBookings
      tags: [Bookings]
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [PENDING, CONFIRMED, CANCELLED]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        "200":
          description: List of bookings
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Booking"
                  total:
                    type: integer
        "401":
          $ref: "#/components/responses/Unauthorized"

    post:
      summary: Create a new booking
      operationId: createBooking
      tags: [Bookings]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Booking"
            example:
              train_id: "12345"
              journey_date: "2025-06-15"
              class: SL
              passengers:
                - name: Piyali Das
                  age: 34
                  gender: F
      responses:
        "201":
          description: Booking created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Booking"
        "400":
          description: Validation error
        "409":
          description: Seat no longer available

  /bookings/{booking_id}:
    parameters:
      - $ref: "#/components/parameters/BookingId"
    get:
      summary: Get booking by ID
      operationId: getBooking
      tags: [Bookings]
      responses:
        "200":
          description: Booking details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Booking"
        "404":
          $ref: "#/components/responses/NotFound"
    delete:
      summary: Cancel a booking
      operationId: cancelBooking
      tags: [Bookings]
      responses:
        "204":
          description: Booking cancelled
        "404":
          $ref: "#/components/responses/NotFound"
```

---

## 20. Common Mistakes & Gotchas

```yaml
# ── Mistake 1: Tabs instead of spaces ─────────────────────────────────────
# ❌ Wrong — tab characters cause parse errors
name:	John    # ← that's a tab

# ✅ Correct — use spaces
name: John

# ── Mistake 2: Missing space after colon ──────────────────────────────────
# ❌ Wrong
host:localhost

# ✅ Correct
host: localhost

# ── Mistake 3: Inconsistent indentation ───────────────────────────────────
# ❌ Wrong — child uses 3 spaces, parent uses 2
parent:
  child1: value     # 2 spaces
   child2: value    # 3 spaces ← parse error

# ✅ Correct — consistent 2 spaces
parent:
  child1: value
  child2: value

# ── Mistake 4: Unquoted strings that look like other types ────────────────
# ❌ These will NOT be strings:
version: 1.0          # → parsed as float: 1.0
enabled: yes          # → parsed as boolean: true
empty: null           # → parsed as null
port: 0777            # → parsed as octal: 511

# ✅ Quote them:
version: "1.0"
enabled: "yes"
empty: "null"
port: "0777"

# ── Mistake 5: Forgetting quotes on colons in values ──────────────────────
# ❌ Wrong — colon in value confuses the parser
url: http://localhost:8080

# ✅ Correct — quote it
url: "http://localhost:8080"

# ── Mistake 6: Bare percent sign ──────────────────────────────────────────
# ❌ Wrong — % at start of line is a YAML directive
message: %discount applied

# ✅ Correct — quote it
message: "%discount applied"

# ── Mistake 7: Trailing spaces ────────────────────────────────────────────
# Trailing spaces after values may cause unexpected behaviour in some parsers
name: John     # trailing spaces here can be trimmed or cause issues

# ── Mistake 8: Anchor before definition ───────────────────────────────────
# ❌ Wrong — alias used before anchor is defined
item: *myanchor
base: &myanchor
  value: 42

# ✅ Correct — anchor defined first
base: &myanchor
  value: 42
item: *myanchor

# ── Mistake 9: Flow style in block context ────────────────────────────────
# ❌ Wrong — mixing block key with flow mapping continuation
parent:
  key: {value: 1,
        other: 2}    # flow collections must be on one line or properly nested

# ✅ Correct
parent:
  key: {value: 1, other: 2}

# ── Mistake 10: Duplicate keys ────────────────────────────────────────────
# ❌ Ambiguous — most parsers use last value silently
config:
  timeout: 30
  timeout: 60    # silently overrides 30

# ── Mistake 11: Boolean-like strings in keys ─────────────────────────────
# ❌ These keys are parsed as booleans in YAML 1.1
true: value       # key is boolean true
yes: another      # key is boolean true
on: third         # key is boolean true

# ✅ Quote boolean-like keys
"true": value
"yes": another
"on": third

# ── Mistake 12: Multiline gotcha — trailing newline ───────────────────────
# | (literal) always adds a trailing newline by default
message: |
  Hello

# Parsed as: "Hello\n"  (not "Hello")
# Use |- to strip trailing newline:
message: |-
  Hello
# Parsed as: "Hello"
```

---

## 21. Quick Reference Card

```
Scalar Types                    Collections
─────────────────────────────   ──────────────────────────────────
string:   Hello World           mapping (object):
int:      42                      key: value
float:    3.14                    nested:
bool:     true / false              child: value
null:     null / ~ / (empty)
date:     2025-01-15            sequence (array):
                                  - item1
Quoted Strings                    - item2
─────────────────────────────     - item3
single: 'no escapes: literal'
double: "escape \n \t \u0041"   flow styles (inline):
                                  map: {a: 1, b: 2}
Multi-line Strings                seq: [one, two, three]
─────────────────────────────
literal |  newlines preserved   Anchors & Aliases
folded  >  newlines → spaces    ─────────────────────────────────
clip       one trailing \n      define:  &name value
strip  |-  no trailing \n       use:     *name
keep   |+  all trailing \n      merge:   <<: *name

Tags (explicit types)           Special Characters to Escape
─────────────────────────────   ─────────────────────────────────
!!str    force string           : after key needs space
!!int    force integer          # starts a comment
!!float  force float            & * ! | > ' " % @ `
!!bool   force boolean          { } [ ] , ?
!!null   force null             Use quotes when value contains these

Multi-document
─────────────────────────────
---   start of document
...   end of document (optional)
```

---

## YAML vs JSON Comparison

```yaml
# YAML
person:
  name: Piyali Das
  age: 34
  skills:
    - Angular
    - TypeScript
  address:
    city: Kolkata
    country: India
```

```json
// Equivalent JSON
{
  "person": {
    "name": "Piyali Das",
    "age": 34,
    "skills": ["Angular", "TypeScript"],
    "address": {
      "city": "Kolkata",
      "country": "India"
    }
  }
}
```

| Feature | YAML | JSON |
|---|---|---|
| Comments | ✅ `#` | ❌ not supported |
| Trailing commas | ✅ not applicable | ❌ not allowed |
| Anchors & aliases | ✅ yes | ❌ no |
| Multi-line strings | ✅ `|` and `>` | ❌ must use `\n` |
| Quotes on keys | Optional | Mandatory |
| Data types | Rich (dates, binary) | Limited (string, number, bool, null) |
| Readability | High | Moderate |
| Strictness | Loose (many gotchas) | Strict |
| Use case | Config files | APIs, data exchange |

---

*Related: Docker Compose, GitHub Actions, Kubernetes, Ansible, OpenAPI, Helm Charts, CircleCI, Travis CI*
