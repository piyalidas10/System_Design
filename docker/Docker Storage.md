# Docker Storage Types

Docker provides different ways to handle data outside the container's writable layer.

| Storage Type     | Managed By  | Stored In                                                 | Best Used For                                                                      |
| ---------------- | ----------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Volumes**      | Docker      | Host file system (`/var/lib/docker/volumes/`)             | Persistent application data, databases, and sharing data between containers        |
| **Bind Mounts**  | The user    | Anywhere on the host machine (e.g., `/home/user/project`) | Live coding/development, where changes on the host instantly sync to the container |
| **tmpfs Mounts** | The host OS | Host system **memory (RAM)**                              | Temporary, high-speed data or sensitive data that you don't want written to disk   |

---

## 1. Volumes

```text
Container
    │
    │ mount
    ▼
Docker Volume
    │
    ▼
Docker-managed storage
```

**Managed by:** Docker

**Stored in:** Docker-managed storage, commonly under:

```text
/var/lib/docker/volumes/
```

**Best used for:**

* Persistent application data
* Databases
* Uploaded files
* Application state
* Sharing persistent data between containers

### Key idea

> **Volumes are Docker-managed persistent storage.**

---

## 2. Bind Mounts

```text
Host Machine
┌─────────────────────────────┐
│ /home/user/project          │
│                             │
│ source files                │
└──────────────┬──────────────┘
               │
               │ bind mount
               ↕
┌───────────────┴─────────────┐
│ Container                   │
│ /app                        │
└─────────────────────────────┘
```

**Managed by:** The user

**Stored in:** Any location on the host machine.

Example:

```text
/home/user/project
```

**Best used for:**

* Local development
* Live coding
* Source-code sharing
* Configuration sharing

For example:

```text
Host file changes
       │
       ▼
Bind Mount
       │
       ▼
Container sees the change
```

This makes bind mounts particularly useful when developing an application locally.

### Key idea

> **Bind mounts connect a specific host folder to a specific location inside the container.**

---

## 3. tmpfs Mounts

```text
Container
    │
    │ tmpfs mount
    ▼
Host OS
    │
    ▼
RAM
```

**Managed by:** Host OS

**Stored in:** Host system **memory (RAM)**

**Best used for:**

* Temporary data
* High-speed temporary storage
* Data that should not be written to disk
* Certain sensitive temporary data, such as passwords or API keys

Because the data is stored in memory rather than persistent disk storage, it is temporary.

### Key idea

> **tmpfs is fast, temporary memory-based storage.**

---

# Quick Comparison

```text
                    Docker Storage
                          │
          ┌───────────────┼───────────────┐
          │               │               │
       Volume        Bind Mount         tmpfs
          │               │               │
       Docker            User           Host OS
          │               │               │
   Docker-managed     Host folder        RAM
      storage             │               │
          │               │               │
     Persistent       Development      Temporary
        data           / live code       data
```

## Easy Way to Remember

**Volume → Persistent Data**

**Bind Mount → Development / Host ↔ Container**

**tmpfs → Temporary Data in RAM**

### One-line interview answer

> **Volumes are Docker-managed persistent storage, bind mounts map a user-selected host path into a container, and tmpfs mounts store temporary data in the host's memory rather than on disk.**
