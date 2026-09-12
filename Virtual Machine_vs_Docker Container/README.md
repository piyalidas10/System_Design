# How Resources Are Divided: VMs vs Containers

## Overview

Virtual Machines (VMs) and Containers are both virtualization technologies, but they divide and isolate hardware resources in fundamentally different ways. Understanding the distinction is critical for making architectural decisions in cloud-native, AI, and enterprise application development.
```
VM = Hardware virtualization → Full Guest OS + Guest Kernel
Container = OS-level virtualization → Shared Host Kernel
```
A VM virtualizes hardware and runs a complete guest OS with its own kernel, while a container provides OS-level process isolation and shares the underlying kernel, making containers lighter and faster to start.

| Concept            | VM                       | Docker Container                       |
| ------------------ | ------------------------ | -------------------------------------- |
| **Virtualization** | Hardware                 | OS/process                             |
| **Kernel**         | Own guest kernel         | Shared kernel                          |
| **Image**          | Guest OS + disk contents | App + dependencies + filesystem layers |
| **Runtime**        | Hypervisor               | Container runtime                      |
| **Overhead**       | Higher                   | Lower                                  |

|             | **VM**                 | **Docker Container**       |
| ----------- | ---------------------- | -------------------------- |
| 🟦 Top      | Guest OS + Application | Application + Dependencies |
| 🟨 Middle   | Hypervisor             | Docker Engine              |
| 🟩 Bottom   | Host OS                | Host OS + Kernel           |
| ⚙️ Hardware | Host hardware          | Host hardware              |

1. Docker Container uses host operating system's kernel. Unlike traditional virtual machines (VMs), which boot a completely independent guest operating system with its own kernel .
2. Docker containers do not use hardware-based virtualization software like virtual machines do. Instead, they use a different technology called OS-level virtualization (or containerization).
3. A Docker image is a blueprint for a container and typically contains the application, libraries, and filesystem layers, while a VM image is a disk/template containing a complete guest operating system and its applications. A hypervisor then provides the VM's virtual hardware.

**In a traditional local VM setup, the Host OS is the operating system installed directly on your laptop - for example, Windows 11 on your HP laptop.**
```
Your Laptop
│
├── Physical Hardware
│     CPU / RAM / SSD
│
├── Host OS  ← Your laptop's OS (e.g., Windows 11)
│
├── Hypervisor
│     VMware / VirtualBox / Hyper-V
│
└── Guest OS  ← VM's OS (e.g., Ubuntu)
      │
      └── Applications
```
```
Host OS = your laptop's main OS
Guest OS = OS running inside the VM
Hypervisor = software that manages the VM and virtualizes hardware
```

> **Example: Windows 11 laptop → VirtualBox → Ubuntu VM.**

---

## Traditional Local VM Structure
When you run a standard VM (like VirtualBox, VMware, or Hyper-V) directly on your machine, your laptop does all the work.

```
┌────────────────────────────────────────────────────────┐
│  GUEST OS (Virtual Machine: e.g., Ubuntu, Windows)     │  ◄── Isolated OS
├────────────────────────────────────────────────────────┤
│  HYPERVISOR (Software: e.g., VirtualBox, Hyper-V)      │  ◄── Allocates resources
├────────────────────────────────────────────────────────┤
│  HOST OS (Your Laptop: e.g., Windows 11, macOS)        │  ◄── Manages local machine
├────────────────────────────────────────────────────────┤
│  PHYSICAL HARDWARE (Your Laptop's CPU, RAM, SSD)       │  ◄── Supplies the actual power
└────────────────────────────────────────────────────────┘
```

- Guest OS - Full operating system, typically GBs in size; must boot completely
- Hypervisor - Virtualizes/simulates hardware resources such as CPU, memory, disk, and network for the Guest OS
- Host OS - Provides the underlying hardware resources to the hypervisor

**A Virtual Machine (VM) image is a large, portable file that contains a complete operating system, all application files, and virtual hardware settings.**

```
VM
           VM Image
               │
               ▼
      ┌─────────────────┐
      │       VM        │
      │                 │
      │ Application     │
      │ Libraries       │
      │ Guest OS        │
      │ Guest Kernel    │
      └────────┬────────┘
               │
               ▼
           Hypervisor
               │
               ▼
          Host Hardware
```

**VM Image**

A VM image generally represents the virtual disk/state of a VM and can contain:
```
VM Image
│
├── Guest OS
├── Guest Kernel
├── System libraries
├── Applications
├── Configuration
└── User files
```

✅ A VM image contains the guest OS and disk contents. The hypervisor separately defines/provides the VM's virtual hardware.

**Common VM Image Formats**

Depending on the software you use to run your VMs (the hypervisor), VM images come in different file formats:
- .OVA / .OVF: Universal formats used to share VMs across different platforms.
- .ISO: A raw disc image used to install an OS onto a blank VM.
- .VMDK: The image format used by VMware.
- .VHD / .VHDX: The image format used by Microsoft Hyper-V.
- .QCOW2: The image format used by Linux KVM.

## Docker Container Structure
```
┌────────────────────────────────────────────────────────┐
│  APP A  │  APP B  │  APP C  │  (Isolated Application Layers)
├─────────────────────────────┤
│  Bins / │  Bins / │  Bins / │  (Specific files/libraries needed)
│  Libs   │  Libs   │  Libs   │
├─────────────────────────────┤
│  DOCKER ENGINE / RUNTIME    │  ◄── Manages containers (No Guest OS!)
├────────────────────────────────────────────────────────┤
│  HOST OS (Your Laptop: e.g., Linux, Windows, macOS)    │  ◄── Shares its Kernel
├────────────────────────────────────────────────────────┤
│  PHYSICAL HARDWARE (Your Laptop's CPU, RAM, SSD)       │  ◄── Supplies the actual power
└────────────────────────────────────────────────────────┘
```

- Container - Contains the application and its required libraries/dependencies; typically much smaller and starts quickly
- Docker Engine / Container Runtime - Provides process isolation and manages containers without requiring a separate full guest OS
- Host OS + Kernel - Containers share the host OS kernel rather than running their own kernel

**A Docker Image is a read-only template that contains everything your application needs to run - and absolutely nothing it doesn't.**

Unlike a VM, it does not contain a full Operating System. Instead, it is built out of distinct, stacked layers.
```
             DOCKER
       Docker Image
             │
             ▼
      ┌───────────────┐
      │   Container   │
      │               │
      │ App            │
      │ Libraries      │
      │ Filesystem     │
      └───────┬───────┘
              │
              ▼
       Host OS Kernel
```

**Inside a Docker Image**
- Base/Parent Image: The starting layer, usually a stripped-down version of an OS (like Alpine Linux or Ubuntu Base) that provides basic system utilities.
- Runtime Environment: The software needed to execute your code (such as Node.js, Python, or the Java JDK).
Application Code: The actual compiled code, scripts, and binaries of your program.
- Dependencies & Libraries: The specific packages, modules, and config files (package.json, requirements.txt, etc.) your app depends on.
- Environment Variables & Metadata: Instructions that tell Docker which port to expose, what environment variables to set, and which exact command to run when the container starts.
```
Docker Image
│
├── Base filesystem
├── Runtime
├── Libraries
├── Application
├── Dependencies
└── Metadata / startup configuration
```

It does not contain a separate Linux kernel.

**For example:**
```
FROM node:22

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "server.js"]
```
The resulting image contains the filesystem layers needed by the application, but not a separate kernel.

✅ Docker Image: Contains only your application and its basic dependencies. It is small (megabytes) because it leaves out the Operating System (OS) and shares the host's kernel.   
✅ A Docker image does not contain its own OS kernel. It can contain a minimal user-space filesystem based on a Linux distribution.   

**The Layered Architecture**    
Docker images use a Union File System. Every instruction in a Dockerfile (like COPY or RUN) creates a new, read-only layer.   
- Reusability: If two different images use the same Node.js base layer, Docker only downloads and stores that layer once, saving massive amounts of disk space. 
- Immutability: Once an image is built, its layers cannot be changed. When you run a container, Docker simply adds a thin, temporary Writable Layer on the very top for active application data.

## VM Image vs Docker Image
VMs absolutely have images, just like Docker containers. The important difference is what the image contains.

**A Docker image is a blueprint for a container and typically contains the application, libraries, and filesystem layers, while a VM image is a disk/template containing a complete guest operating system and its applications. A hypervisor then provides the VM's virtual hardware.**

| Feature          | **Docker Image**                                    | **VM Image**                                                  |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| Purpose          | Blueprint for creating containers                   | Blueprint/template for creating VMs                           |
| Contains         | Application + dependencies + filesystem             | Full OS + applications + dependencies                         |
| OS Kernel        | ❌ Usually not included separately; uses host kernel | ✅ Includes guest OS and its kernel                            |
| Virtual Hardware | ❌ No                                                | ✅ VM configuration/virtual hardware is associated with the VM |
| Typical Size     | MBs to hundreds of MBs, sometimes GBs               | Usually several GBs                                           |
| Startup          | Seconds or less                                     | Usually seconds to minutes                                    |
| Runtime          | Docker/container runtime                            | Hypervisor                                                    |
| Examples         | `nginx:latest`, `ubuntu:24.04` container image      | VMware VMDK, Hyper-V VHDX, KVM QCOW2                          |
| Creates          | Container                                           | Virtual Machine                                               |

**Think of it this way**
```
             DOCKER
       Docker Image
             │
             ▼
      ┌───────────────┐
      │   Container   │
      │               │
      │ App            │
      │ Libraries      │
      │ Filesystem     │
      └───────┬───────┘
              │
              ▼
       Host OS Kernel
```
**Versus:**
```
               VM
           VM Image
               │
               ▼
      ┌─────────────────┐
      │       VM        │
      │                 │
      │ Application     │
      │ Libraries       │
      │ Guest OS        │
      │ Guest Kernel    │
      └────────┬────────┘
               │
               ▼
           Hypervisor
               │
               ▼
          Host Hardware
```

## Resource Division: Virtual Machines

VMs are managed by a **Hypervisor** (Type 1 or Type 2), which sits between the physical hardware and the guest operating systems. Each VM gets a **hard, dedicated slice** of resources.

### CPU
- Each VM is assigned a fixed number of **virtual CPUs (vCPUs)**.
- The hypervisor maps vCPUs to physical CPU cores.
- Resources are **pre-allocated** — even if idle, those vCPUs are reserved.
- Supports **CPU pinning** to lock a vCPU to a specific physical core.

### Memory (RAM)
- Each VM is allocated a **fixed block of RAM** at creation time (e.g., 4 GB, 8 GB).
- Memory is **hard-partitioned** — a VM cannot use another VM's memory.
- Some hypervisors (VMware) support **memory ballooning** and **transparent page sharing** to reclaim idle memory.

### Storage
- VMs use **virtual disk files** (`.vmdk`, `.vhd`, `.qcow2`) mapped to physical storage.
- Disk space is provisioned as either **thick** (pre-allocated) or **thin** (grows on demand).
- I/O is routed through the hypervisor's virtual storage controller.

### Network
- Each VM has one or more **virtual NICs (vNICs)** connected to a virtual switch.
- Network traffic is fully isolated between VMs at the hypervisor level.
- Bandwidth can be controlled via QoS policies on the virtual switch.

### Isolation Level
> **Full hardware-level isolation.** Each VM runs its own OS kernel. A crash in one VM does not affect others.

---

## Resource Division: Containers

Containers are managed by a **Container Runtime** (Docker, containerd, CRI-O). They share the **host OS kernel** and use Linux kernel features — **namespaces** and **cgroups** — to divide resources.

### CPU
- Resources are divided using **Linux cgroups (control groups)**.
- CPU shares can be set as **soft limits** (relative weight) or **hard limits** (CPU quota).
- Containers can **burst beyond their allocation** if the host has spare capacity.
- Example: `--cpus="1.5"` limits a container to 1.5 CPU cores.

### Memory (RAM)
- Memory limits are enforced via **cgroups**.
- A container can be given a **hard limit** (e.g., `--memory="512m"`).
- If a container exceeds its limit, the Linux OOM Killer terminates the process.
- No pre-allocation — memory is only consumed when actually used.

### Storage
- Containers use a **layered filesystem** (OverlayFS, AUFS).
- The image layers are **read-only**; a writable layer is added per container instance.
- Persistent data is stored in **volumes** mounted from the host or a volume driver.
- Multiple containers can share the same read-only image layers, saving disk space.

### Network
- Containers share the host network stack by default, isolated via **network namespaces**.
- Each container can have its own virtual ethernet interface (`veth pair`) connected to a bridge.
- Docker creates virtual networks (`bridge`, `host`, `overlay`) for container communication.

### Isolation Level
> **OS-level process isolation.** Containers share the host kernel. A kernel vulnerability can affect all containers on the same host.

---

## Side-by-Side Comparison

| Resource | Virtual Machines | Containers |
|---|---|---|
| **CPU** | Fixed vCPUs assigned by hypervisor | cgroups CPU quota/shares, can burst |
| **Memory** | Hard-partitioned fixed RAM blocks | cgroups soft/hard limits, no pre-allocation |
| **Storage** | Virtual disk files (.vmdk, .vhd) | Layered OverlayFS + shared read-only image layers |
| **Network** | Virtual NICs via hypervisor switch | Network namespaces + veth pairs |
| **OS** | Each VM has its own full OS kernel | All containers share the host OS kernel |
| **Isolation** | Hardware-level (strongest) | Process-level (lighter) |
| **Startup Time** | Minutes (full OS boot) | Milliseconds to seconds |
| **Resource Overhead** | High (each OS consumes RAM/CPU) | Very low (no duplicate OS per unit) |
| **Density** | Lower (fewer per host) | Higher (hundreds per host possible) |
| **Security Boundary** | Strong — VM escape is rare | Weaker — kernel shared across containers |
| **Portability** | Moderate (large image sizes) | High (lightweight, fast to distribute) |

---

## Linux Kernel Mechanisms Behind Container Isolation

Containers rely on two core Linux kernel features:

### 1. Namespaces (Isolation)
Namespaces restrict what a process **can see**:

| Namespace | Isolates |
|---|---|
| `pid` | Process IDs — container has its own PID 1 |
| `net` | Network interfaces, routes, firewall rules |
| `mnt` | Filesystem mount points |
| `uts` | Hostname and domain name |
| `ipc` | Inter-process communication (shared memory, semaphores) |
| `user` | User and group IDs |
| `cgroup` | cgroup root directory |

### 2. cgroups (Resource Limits)
cgroups restrict what a process **can use**:

| cgroup Subsystem | Controls |
|---|---|
| `cpu` | CPU time allocation and scheduling |
| `memory` | RAM limit and OOM kill behavior |
| `blkio` | Block device I/O rates |
| `net_cls` | Network packet tagging for QoS |
| `devices` | Access to specific hardware devices |
| `pids` | Maximum number of processes |

---

## Hypervisor Types (for VMs)

| Type | Description | Examples |
|---|---|---|
| **Type 1 (Bare Metal)** | Runs directly on hardware, no host OS | VMware ESXi, Microsoft Hyper-V, KVM |
| **Type 2 (Hosted)** | Runs on top of a host OS | VMware Workstation, VirtualBox, Parallels |

---

## When to Use Which

### Use VMs when:
- You need **strong security isolation** (multi-tenant, regulated environments)
- Running **different OS types** on the same host (Windows + Linux)
- **Legacy applications** that require specific OS configurations
- Compliance mandates require full OS-level separation
- Working with **stateful workloads** needing predictable, dedicated resources

### Use Containers when:
- Building **microservices** or cloud-native applications
- You need **fast startup times** and **high density**
- Deploying **stateless, horizontally scalable** workloads
- Running **CI/CD pipelines** and ephemeral build environments
- Working with **Docker / Kubernetes** orchestration
- Building **AI/GenAI pipelines** (e.g., Ollama, RAG, LangChain in Docker)

---

## Real-World Example: Docker Resource Limits

```bash
# Limit a container to 1 CPU and 512 MB RAM
docker run \
  --cpus="1.0" \
  --memory="512m" \
  --memory-swap="512m" \
  nginx

# Inspect actual resource usage
docker stats
```

In Kubernetes, this maps to **resource requests and limits** in a Pod spec:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "1000m"
```

---

## Summary

| Aspect | VMs | Containers |
|---|---|---|
| **Isolation mechanism** | Hypervisor (hardware virtualization) | Namespaces + cgroups (OS virtualization) |
| **Resource allocation** | Static, pre-allocated | Dynamic, enforced at runtime |
| **Efficiency** | Lower (OS overhead per VM) | Higher (shared kernel, layered FS) |
| **Best for** | Security isolation, multi-OS, legacy | Microservices, cloud-native, AI workloads |

> Both technologies are **complementary**, not competing. In modern infrastructure, containers often run *inside* VMs to get the benefits of both — strong isolation from the VM layer and lightweight density from containers.

---

## Is allocation static or dynamic?

This is the most important interview distinction.

| Resource                              | VM                                                 | Container                                        |
| ------------------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| CPU                                   | Configured vCPU + scheduled dynamically            | Shared/scheduled dynamically, optionally limited |
| RAM                                   | Configured virtual RAM; hypervisor manages mapping | Shared host RAM, optionally limited with cgroups |
| Storage                               | Virtual disk capacity assigned to VM               | Shared host filesystem/volumes                   |
| OS                                    | Own guest OS                                       | Shares host kernel                               |
| Main isolation layer                  | Hypervisor                                         | OS kernel + namespaces/cgroups                   |
| Who configures limits?                | Admin / VM platform                                | Admin / Docker / Kubernetes                      |
| Can workloads share unused resources? | Depends on configuration/overcommitment            | Yes, when limits allow                           |

The document correctly emphasizes that CPU is not simply physically carved into permanent pieces. Even with VMs, the hypervisor scheduler determines when a VM gets physical CPU time.

