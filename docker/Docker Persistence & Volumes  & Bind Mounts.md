# Docker Persistence & Volumes & Bind Mounts

**Proejct structure**
```
feedback-node
│
├── feedback/
├── public/
├── pages/
│   ├──example.html
│   ├──feeback.html
├── temp/
└── Temporary files
```
**Dockerfile**
```
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 80

CMD [ "node", "server.js" ]
```

## 1. Build the image
```
docker build -t feedback-node.
```
## 2. Create the container. added --rm to automatically removed the container when it's stopped
```
docker run -p 3000:80 -d --name feedback-app --rm feedback-node
```
#### Understanding COPY . .
Using:
```
COPY . .
```
we copy our local folder into the Docker image, and the container is then based on that image.

This means that the image, and therefore also the container, has its own file system based on our local folder because we copied the files into the image.

However, after the image is built, there is no ongoing connection between our local folder and the image's internal file system.

In other words:
```
Local Folder
     │
     │ COPY . .
     │
     ▼
Docker Image
     │
     ▼
Container
```
The COPY instruction creates a snapshot of our local files at image-build time.

After that:
```
Local Folder  ❌──────❌ Image
                         │
                         ▼
                     Container
```
Changes made to the local folder are not automatically reflected inside the image or the running container.

Similarly, changes made inside the container are not automatically reflected back into the original local folder.

#### Docker Container Isolation

And that's how it's intended to work. The containers should be isolated, after all.

It would be pretty bad if files were created inside of the container and suddenly ended up somewhere on our hard drive, on our host machine.

That's not the idea behind Docker at all.

And that's, by the way, when we changed something in our source code locally on our host machine and the change wasn't reflected in the running Docker container.

Wwe had to rebuild the image to copy in the changed code, create a new image based on it, and then containers running based on that changed image would have our code changes.

For the same reason, we copy code into an image. It then is in a special file system inside of the image. It's locked in; there is no connection to the host folder or to the host machine.

And the container, therefore, also has this isolated file system where only this snapshot was copied in when we built the image — this snapshot of our local folder in this case.

That's all something we covered already, but it is important to always keep this in mind:

> **There is no connection between your container or your image and your local file system.**

You just initialized this image once. You can copy in a snapshot of your local folders and files, but thereafter, that's it.

There is no connection.

And that's why we don't see the text file in the `feedback` folder here on our hosting machine, in this folder.

We only have it available inside of the running Docker container.

There, we can access it. There, it exists.

So, that's how this application works.

Let me go back here.

And if I now submit the same feedback again, so with the same title, I mean, I would actually see this **"Exists already"** page, and the file would not be stored in the `feedback` folder.

If I visit `awesome.txt`, we still see the old text in there, so it was not overwritten.

And it is not overwritten because, in the Node code, I have the logic for creating a temporary file first and only copying it into the final folder, into the `feedback` folder, if the file doesn't exist there yet.

That's the logic I have here in my Node app.

So that's why we're not overwriting existing files.

#### Key Concept

The important Docker concept here is:

```text
Host Machine
┌─────────────────────────────┐
│ Local source code           │
│ feedback/                   │
└──────────────┬──────────────┘
               │
               │ COPY . .
               │
               ▼
       Docker Image
┌─────────────────────────────┐
│ Snapshot of local files     │
│                             │
│ No ongoing connection       │
└──────────────┬──────────────┘
               │
               ▼
          Container
┌─────────────────────────────┐
│ Isolated filesystem         │
│                             │
│ feedback/awesome.txt        │
└─────────────────────────────┘
```

#### Remember

**`COPY` = one-time snapshot**

```text
Local Folder
     │
     │ COPY during build
     ▼
Docker Image
     │
     ▼
Container
```

After the image is built, there is **no live synchronization** between the host folder and the image/container filesystem.

This isolation is intentional and is a fundamental part of Docker's container model.

## 3. Stop the container & run again this container without --rm.
```
docker stop feedback-app
```
```
docker run -p 3000:80 -d --name feedback-app feedback-node
```
Now reload the app and it works. But you'll notice that if I try to view feedbackawesome.txt, this file doesn't exist. It fails to get this file. And of course, this worked a couple of minutes ago.

**Because we deleted the container when we stopped it the first time.**

Now add again feedbackawesome.txt in the newly started container, we can view feedbackawesome.txt.

## 4. Stop the container again
```
docker stop feedback-app
```
And if I now stop this container feedback app again and keep in mind that now feedbackawesome.txt will not be removed because we did not add --rm on the Docker run command.

## 5. Restart the container again
```
docker start feedback-app
```
I restart the container again. You will notice that now if I reload, the feedbackawesome.txt is still there.

> **Now feedbackawesome.txt file is not lost because we didn't write the --rm at container creation 2nd time to remove the conatiner**

## 6. Docker Container Read-Write Layer

And when we then launch a Docker container based on the image, that container is added as an extra thin **read-write layer** on top of this image.

So it basically has access to this image file system, and it's able to read and write there without manipulating the image, though.

But it's able to read and write there.

It has its own copy of that, you could say, managed in a very efficient way, though.

So that makes all sense that we can read and write in there.

But the problem is that the file system is inside of the container.

So if we stop it and restart it, everything is fine because the container never changed.

And just because it was stopped does not mean that its file system is cleared or erased.

If that would be the case, our application code would be gone as well, right?

So that's not happening.

But if we remove a container, then that's different.

Then all the data in the container is cleared because the container overall is cleared and deleted.

And if we then run a new container, even if it's based on the same image, all the data that was created and stored in the previous container is lost because the image is read-only.

So the container, when a file is generated in the container, does not write this file into the image.

It writes it in its own read-write layer, which is added on top.

Therefore, if the container is removed, we're just left with the image, which was never changed.

So when we then start a new container, well, that starts with the same basic file system again, without the changes made by the previous container, which might have been executed on the same image.

And that's a core idea of Docker: **multiple containers based on the same image are totally isolated from each other.**

But here, of course, that's a problem.

It means that we lose this text file if we stop the container and remove it thereafter.

And in many applications, this behavior is a problem because here, for example, we want to keep those feedback text files around even if a container is deleted.

We would have a comparable scenario if we would be dealing with user accounts or with product data submitted by users, or any other kind of data which shouldn't be disappearing suddenly but which instead should survive containers being deleted.

Because in reality, you're going to remove containers quite a bit.

If we change something about our code and we build a new image and start a new container, we will not restart the old container.

We want to use the new container, which uses the latest code snapshot.

So therefore, in that case, we would be losing all the data.

And that's exactly the problem I've been describing over the last minutes.

So now that we know the problem really well, and that we know that containers are able to write data but that this data is lost when the container is removed, now that we know all of that, what is the solution?

```mermaid
graph LR
    %% Styling definitions
    classDef containerBg fill:#FFF4E6,stroke:#FF922B,stroke-width:2px;
    classDef imageBg fill:#F8F0FC,stroke:#D0BFFF,stroke-width:2px;
    classDef rwLayer fill:#FF922B,stroke:#E64980,stroke-width:1px,color:#fff;
    classDef roLayer fill:#D0BFFF,stroke:#9C36B5,stroke-width:1px,color:#495057;

    %% Diagram Structure
    subgraph Container_Context [Container]
        direction LR
        
        %% Inner Image Layers (Stacked Left-to-Right)
        subgraph Image_Context [Image: Read-only]
            direction LR
            L1[Instruction #1: Image Layer 1]:::roLayer
            L2[Instruction #2: Image Layer 2]:::roLayer
            L3[Instruction #3: Image Layer 3]:::roLayer
            
            L1 --> L2 --> L3
        end
        
        %% Top Read-Write Layer
        Image_Context --> RW[Container Layer <br> read-write]:::rwLayer
    end

    %% Apply context styling
    style Container_Context fill:#FFF4E6,stroke:#FF922B,stroke-width:2px;
    style Image_Context fill:#F8F0FC,stroke:#E599F7,stroke-width:2px;
```

### Docker Volumes

Now we know the problem.

What's the solution?

Docker has a built-in feature called **volumes**.

And volumes help us with persisting data and solving the problem I outlined in the last lecture.

Now, how do we utilize volumes in our application?

In this Docker application, for example.

First of all, we have to understand what exactly volumes are and how they work.

**Volumes are folders on your host machine, so not in the container, not in the image, but on your host machine's hard drive, which are mounted, which basically means made available or mapped, into containers.**

So volumes are folders on your host machine, on your computer, which you make Docker aware of and which are then mapped to folders inside of a Docker container.

Now, that might sound a bit like the `COPY` instruction from the Dockerfile.

But keep in mind that this instruction really just takes a snapshot of the path and files you would tell it to copy, and then it copies these files and folders into the image, and that's it.

There's no ongoing relation or connection. It's just a one-time snapshot, which is copied into the image.

With volumes, that's different.

Here, you can really connect a folder inside of the container to a folder outside of the container, on your host machine.

And changes in either folder will be reflected in the other one.

So, if you add a file on your host machine, it is accessible inside of the container, and if the container adds a file in that mapped path, it is available outside of the container, in the host machine as well.

And therefore, because of this mechanism, volumes allow you to persist data.

Volumes persist and continue to exist even if a container is shut down.

That's important.

If you add a volume to a container, the volume will not be removed when a container is removed.

It survives, and therefore, the data in a volume survives.

And containers can both read and write data from and to a volume.

And that's, of course, a powerful feature, which we can use for folders which we want to access from outside our container, and/or simply for data that should survive container shutdown and the removal of a container.

Because if the data is also saved outside of the container, of course, it survives the removal of the container.

### Visualizing How Volumes Bypass the Container Lifecycle
Below is a diagram showing how the Read-Write layer syncs directly out to your host machine's physical hardware:

```mermaid
graph TD
    classDef host fill:#E3F2FD,stroke:#1E88E5,stroke-width:2px;
    classDef container fill:#FFF4E6,stroke:#FF922B,stroke-width:2px;
    classDef vol fill:#E8F5E9,stroke:#43A047,stroke-width:2px;

    subgraph Host_Machine [Your Computer / Host Machine]
        direction TB
        
        subgraph Container_Context [Docker Container Lifecycle]
            RW[Container Layer: Read-Write]:::container
            RO[Image Layers: Read-Only]:::container
            RW --- RO
        end

        HostFolder[(Host Folder / Volume Data)]:::vol
        
        %% Connection bypassing the container
        RW <===> |Live Two-Way Sync| HostFolder
    end

    style Host_Machine fill:#fafafa,stroke:#ccc,stroke-dasharray: 5 5;
```

### Core concept
```
COPY
────
Host Folder
     │
     │  COPY during image build
     ▼
Docker Image
     │
     ▼
Container

One-time snapshot
No ongoing connection
```
```
VOLUME
──────
Host / Docker Volume
         ↕
     Container

Ongoing connection
Read + Write
Persistent data
```

### Most important distinction

| `COPY`                                   | Volume                                                |
| ---------------------------------------- | ----------------------------------------------------- |
| Copies files into the image              | Maps persistent storage to the container              |
| Happens during image build               | Used at container runtime                             |
| One-time snapshot                        | Ongoing connection                                    |
| No synchronization                       | Changes can be reflected between the mapped locations |
| Data becomes part of the image           | Data lives outside the container's writable layer     |
| Doesn't solve container data persistence | Designed for persistent data                          |

> **COPY gives the container a snapshot. A volume gives the container persistent storage that survives container removal.**

## 7. Updated Dockerfile by adding Volume

```dockerfile
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 80

VOLUME [ "/app/feedback" ]

CMD [ "node", "server.js" ]
```

### What Changed?

The important addition is:

```dockerfile
VOLUME [ "/app/feedback" ]
```

This tells Docker that:

> [!WARNING]
> **`/app/feedback` is intended to be used for persistent data and should be treated as a volume mount point.**

The application stores feedback files inside:

```text
/app/feedback
```

Instead of allowing those files to exist only in the container's writable layer, Docker can use a volume for this directory.

### Dockerfile Flow

```text
Dockerfile
    │
    ├── FROM node:14
    │       ↓
    │   Node.js base image
    │
    ├── WORKDIR /app
    │       ↓
    │   Working directory
    │
    ├── COPY package.json .
    │       ↓
    │   Copy dependency definition
    │
    ├── RUN npm install
    │       ↓
    │   Install dependencies
    │
    ├── COPY . .
    │       ↓
    │   Copy application source
    │
    ├── EXPOSE 80
    │       ↓
    │   Document container port
    │
    ├── VOLUME ["/app/feedback"]
    │       ↓
    │   Persistent storage location
    │
    └── CMD ["node", "server.js"]
            ↓
        Start application
```

### Before `VOLUME`

```text
Container
└── /app
    └── feedback
        └── feedbackawesome.txt

Container deleted
        ↓
feedbackawesome.txt ❌
```

### With `VOLUME`

```text
Container
└── /app
    └── feedback
          │
          │ mounted to volume
          ▼
      Docker Volume
          │
          └── feedbackawesome.txt
```

Now:

```text
Container deleted
        ↓
Container writable layer ❌
        ↓
Volume ✅
        ↓
feedbackawesome.txt remains
```

### Important Point

`VOLUME ["/app/feedback"]` **does not mean that `/app/feedback` becomes part of the Docker image's persistent filesystem**.

Instead, it declares that this directory should be treated as a volume mount point.

So the architecture becomes:

```text
             Docker Image
          ┌───────────────┐
          │ Node.js       │
          │ Application   │
          │ Dependencies  │
          └───────┬───────┘
                  │
                  ▼
             Container
          ┌───────────────┐
          │ /app          │
          │               │
          │ /feedback ────┼──────► Volume
          └───────────────┘         │
                                    ▼
                              Persistent Data
```

### Key takeaway

> **`VOLUME ["/app/feedback"]` tells Docker that `/app/feedback` should be backed by a volume so that data stored there can survive the lifecycle of the container.**

### ⚠️ The Catch: This creates an "Anonymous" Volume
Using the VOLUME instruction inside a Dockerfile creates an Anonymous Volume. This has a few major limitations you should be aware of:
- **Docker chooses the host path:** Docker creates a folder with a long, random hash name hidden deep inside its internal storage directory on your computer (e.g., /var/lib/docker/volumes/...). You cannot easily see or access it outside of Docker.
- **It does not survive container removal (docker rm):** If you stop the container, the data stays. However, if you remove the container and start a brand-new one using docker run, a new, empty anonymous volume will be generated. The new container will not automatically hook back up to the old data.

## 8. Docker build again with Anonymous Volume
```dockerfile
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 80

VOLUME [ "/app/feedback" ]

CMD [ "node", "server.js" ]
```
**At first, Stop the container first if it is running & also remove the container**
```
docker stop feedback-app
docker rm feedback-app
```
**Now I give it a special volumes edition, you could say, which is the same image as before, but with this extra volume feature.**
```
docker build -t feedback-node:volumes.
```
This image is created and tagged.

**So, I'll run it in detached mode, I'll publish the internal port 80 to my host port 3000. And we can also add the --rm flect to remove that container if we stop it, because thanks to volumes, this should now not be a problem anymore.**
```
docker run -d -p 3000:80 --rm --name feedback-app feedback-node:volumes
```
**check the container**
```
docker ps
```
Now try to save feedbackawesome.txt file using a feedback form submit. It will work.
<img src="./imgs/docker_volume_run.png" width="80%" />
<img src="./imgs/docker_volume_file_present.png" width="80%" />

**Now stop the container & Rerun the container**
```
docker stop feedback-app
docker run -d -p 3000:80 --rm --name feedback-app feedback-node:volumes
```
no, this feedbackawesome.txt file is still not there.
<img src="./imgs/docker_volume_file_notpresent.png" width="80%" />

## 9. Docker Named Volumes resolve the issue

> **Docker actually has three primary data storage mechanisms. While volumes and bind mounts are the two most common ways to persist data onto your host machine's hard drive, there is a third option called tmpfs mounts.**

With Docker, we actually have multiple external data storage mechanisms, if we want to call them like this, two to be precise. And that would be volumes and bind mounts.

Now, we'll worry about bind mounts later. For the moment, we'll focus on volumes. And it looks like they don't fully work as we want them to. Currently, we're using anonymous volumes.

```
VOLUME ["/app/feedback"]
```
With this instruction in the Dockerfile, we add an anonymous volume to this image and data for the containers running based on that image. 

Now, we can also assign named volumes, and that's not something we're doing up to this point.

Now, in both cases, no matter if it's anonymous or named — however that works, we'll see it soon — in both cases, Docker sets up some folder and path on your host machine.
You don't know where. After all, here we only specified a path inside of the container, no path on our host machine. So we don't know where the folder is in which this is mirrored.

> [!WARNING]
> **It's somewhere managed by Docker, but we don't know where. And the only way for us to get access to these volumes is with the help of the docker volume command. And I can show this to you.**

List volumes:
```
docker volume ls
```
If we go back here to the terminal, we can run:
```
docker volume --help
```
to see our options.

And here it's:
```
docker volume ls
```
to list all volumes Docker is currently managing. And we see one volume here. Let me show it to you again.

We see one volume here with a very strange, cryptic name. This name is cryptic because it's an automatically generated name. Because it's an anonymous volume, we didn't assign any name to it. Hence, Docker automatically assigned one.

> [!WARNING]
> **Now here's the gotcha. If we stop our feedback app container, and therefore for we shut down this application, if we inspect our volumes again this anonymous volume is gone. It doesn't exist anymore.**
> **Now as I said, it's managed by Docker. And because it's anonymous, it actually only exists as long as our container exists. And that doesn't help us at all with the problem I outlined, which was that our data disappears if we shut down a container.**

```
docker-complete $ docker volume ls
DRIVER          VOLUME NAME
local           fe6167c8122faf45dacbeff8aa8888912f3d44bd7ab83cdd2ba21a8f40376fd7
docker-complete $ docker stop feedback-app
feedback-app
docker-complete $ docker volume ls
DRIVER          VOLUME NAME
docker-complete $ 
```

### ⚠️ The Anonymous Volume "Gotcha"
If you define a volume inside a Dockerfile like this:
```
dockerfile

VOLUME ["/app/feedback"]
```
1. At Runtime: Docker spins up the container and assigns a random, cryptic name to this volume. You can see it by running docker volume ls.
2. On Shutdown: The moment you stop or remove the container (especially when using the --rm flag), the anonymous volume is permanently deleted.
3. The Problem: It completely fails to solve data persistence issues across container restarts.

### With named volumes, volumes will survive container's shutdown.
The folders on your hard drive will survive. And therefore, if you start new containers thereafter, the volumes will be back, the folder will be back, and all the data stored in that folder will still be available.

So named volumes are great for data which should be persistent, and that's important, which you don't need to edit or view directly, because you don't really have access
to that folder on your host machine.

And we can't create named volumes inside of a Docker file, hence we can remove this instruction actually.
```
VOLUME ["/app/feedback"]
```
Instead we have to create a named volume when we run a container.

**First remove already created docker volume**
```
# 1. Remove the existing image tag
docker rmi feedback-node:volumes

# 2. Rebuild the image with the correct docker command syntax
docker build -t feedback-node:volumes .
```
**I will now once again restart my container based on that image with the Docker run command. now I add another flag, another option to this command. And that's the -V option, which stands for volume, which allows me to add a volume to this container. But unlike in the Docker file, not just an anonymous volume but actually a named volume.**
We still specify the path inside of the container file system which we wanna save. And in our case, that's `app/feedback`. But in front of this path `/app/feedback`, we now provide any name of our choice. For example, feedback. We then add a colon to separate our name from that path.
```
docker run -d -p 3000:80 --rm --name feedback-app -v feedback:/app/feedback feedback-node:volumes
```
It will now store app feedback in a managed volume. So it will create a folder on our hosting machine and connect it to this folder inside of the container, but it will store this volume under a name chosen by us.

> **The key difference to anonymous volumes is that named volumes will not be deleted by Docker when the container shuts down.**
> **Anonymous volumes are deleted because they are recreated whenever a container is created. And therefore, keeping them around after a container was removed makes no sense. Anonymous volumes are closely attached to one specific container.**
> **Named volumes are not attached to a container.**

I can go back to local host 3000, add another feedback or another message here, save this. And of course, visit feedback/awesome.txt. And see that.
<img src="./imgs/docker_volume_run.png" width="80%" />
<img src="./imgs/docker_volume_file_present.png" width="80%" />

Now Docker stop feedback app & this will remove the container because of the -- rm flag at docker run time.
```
docker stop feedback-app
```
**Our volume will still be there. And hence, if we restart a new container with the same volume, our data will still be there. 
So let's first check for the volume with**
```
docker-complete $ docker volume ls
DRIVER          VOLUME NAME
local           feedback
docker-complete $ docker run -d -p 3000:80 --rm --name feedback-app -v feedback:/app/feedback feedback-node:volumes
96532444cc8ec8697ad01d268c319d79297b5b1b5bae1164295e9567f179d7c
docker-complete $ 
```
**Now check localhost:300/feedback/awesome.txt in the browser. it's still there even though the container was stopped.** 
<img src="./imgs/docker_name_volume.png" width="80%" />

**So finally we managed to persist data with the help of volumes, to be precise, with the help of named volumes.**

> [!NOTE]
> **Anonymous volumes are automatically named by Docker, while named volumes are explicitly named by you. Both are Docker-managed volumes, but named volumes are much easier to identify and reuse.**

> [!NOTE]
> **bunch of unused anonymous volumes - you can clear them via `docker volume rm VOL_NAME` or `docker volume prune`.**

## 10. Docker Bind Mounts can help us with application refresh issue

So now we learn about volumes, and specifically, named volumes are useful.

Anonymous volumes, I would say, their use is not entirely clear yet. I'll come back to those.

But I actually now want to dive into **bind mounts** first, before we have a look at anonymous volumes again.

### The Problem During Development

Here is the kind of problem we might be facing.

Whenever we change anything in our source code, be that in the `server.js` file or in any HTML file here, those changes are **not reflected in the running container unless we rebuild the image**.

We only copy a **snapshot** of this folder into the Docker image when it's created.

Subsequent changes to anything in the application folder will therefore not be reflected in the image and, therefore, also not in the container. But of course, during development, if we're using Docker, it would be pretty important to us that such changes are reflected. Because otherwise, we always have to rebuild the entire image and restart a container whenever we change anything.

So restarting everything all the time is pretty cumbersome. That's where **bind mounts** can help us.

### What Is a Bind Mount?

Bind mounts have some similarities with volumes, but there is one key difference.

> **Where volumes are managed by Docker and we don't really know where on our host machine's file system they are, for bind mounts, `we do know it`.**
> **Because for bind mounts, we, as a developer, set the path to which the container-internal path should be mapped on our host machine. So here, we're fully aware of the path on our local machine.**
> **And since that is the case, and containers cannot just write to volumes but also read from there, of course we could put our source code into such a bind mount.**
> **And if we do that, we could then make sure that the container is aware of that, and that the source code is actually not used from that copied-in snapshot, but instead from that bind mount. So, from that connection to some folder on our host machine.**
> **And therefore, the container would always have access to the **latest code** and not just to the snapshot we put into our image when it was created at the beginning.**

### Why Bind Mounts Are Useful

1. So bind mounts are therefore perfect for **persistent and editable data**. And that's the difference to normal volumes.
2. A named volume can help us with **persistent data, but editing is not really possible** since we don't know where it's stored on our host machine.

```
Named Volume = "Docker, manage my persistent data."
Bind Mount = "Docker, use this exact folder from my machine."
```

#### 1. Bind mounts
> **Bind mounts are perfect for persistent and editable data.**

✅ Correct.

A bind mount connects a specific host directory to a container directory:
```
Host machine                         Container
┌─────────────────────┐             ┌──────────────┐
│ my-project/         │  bind mount │ /app         │
│ ├── server.js       │◄───────────►│ ├── server.js│
│ ├── index.html      │             │ ├── index.html
│ └── package.json    │             │ └── package.json
└─────────────────────┘             └──────────────┘
```
If you edit server.js on your host:
```
Host: server.js changed
          ↓
Container sees the change
          ↓
No image rebuild required
```
That's why bind mounts are especially useful for development.

#### 2. Named volumes
> **A named volume can help with persistent data, but editing is not really possible since we don't know where it's stored on our host machine.**

**⚠️ The first part is correct; the second part is an oversimplification.**

A named volume provides persistent storage:
```
Container
   │
   │ mount
   ▼
Named Volume
   │
   ▼
Docker-managed storage
```
For example:
```
docker volume create feedback-data
```
Docker manages where that volume physically lives.

You can technically access/modify the files in a named volume, but you generally don't use named volumes for directly editing application source code because:
- Docker manages the physical location.
- You normally don't work with that location directly.
- Named volumes are intended more for persistent application data.
- Bind mounts are much more convenient when developers need to edit files directly from the host.

|                         | **Named Volume**      | **Bind Mount**           |
| ----------------------- | --------------------- | ------------------------ |
| Managed by              | Docker                | Developer/host           |
| Host path               | Docker-managed        | Developer specifies      |
| Persistent              | ✅                   | ✅                       |
| Host editing            | Not convenient        | ✅ Excellent             |
| Development source code | Usually not preferred | ✅ Common                |
| Database/app data       | ✅ Excellent         | Possible                  |
| Example                 | PostgreSQL data       | Angular/Node source code |

### Adding a Bind Mount

**So how can we then add such a bind mount?**

```
└── DOCKER-COMPLETE
    ├── feedback/
    ├── pages/
    │   ├── exists.html
    │   └── feedback.html
    ├── public/
    ├── temp/
    ├── .gitignore
    ├── Dockerfile
    ├── package.json
    └── server.js
```

Again, it's not something we can do from inside the Dockerfile. Because it's actually specific to a **container which you run**, not to the image. It doesn't affect the image; it just affects the container. And therefore, we have to set up a bind mount from inside the terminal when we run our container. So for that, first of all, I'll stop my currently running container with:

```bash
docker stop feedback-app
```
And once this is stopped, I will rerun it. 

I will create a new container in the same way by using `docker run`. But now I'll add more than one volume — not just this one named volume, but a second volume — simply by again adding `-v`.

So:
```bash
-v
```

And then again, a volume as we added it before. But now here's the key difference. The folder to which I want to map it inside of the container is just:
```text
/app
```

So just `/app`, because I'm also copying all my source code into just `/app` here. I want to control the entire `app` folder now. But that's the difference. The name which I now assign in front of the colon is not `app` or anything like that. Instead, it is a **path to the folder on my host machine** where I have all the code and all the content that should go into this mapped folder. And this must be an **absolute path**, not a relative one.

You can get such a path here in Visual Studio Code by right-clicking on `server.js`, for example, and choosing **Copy Path**. Choose that and add it in front of the colon. Yes, it's quite long, but that is what we need. Make sure you remove the file at the end, though. It should just be the path to your **project folder**. So your project folder name should be the last thing here.

In this case, at least, you can also bind a single file in case you just want to share a single file with a container. You can bind a file to a file. But here, when I want to bind to a folder, and therefore I want to bind a complete folder on my host machine to this `app` folder in the container, that's why we're removing the file name at the end. Because I don't just want to share the file; I want to share the **complete folder**.

### The basic syntax is:

```text
-v <host-path>:<container-path>
```

**For example:**

```bash
-v "C:\path\to\project:/app"
```

You might also want to consider putting this into quotes — this entire statement here. So your absolute path, the colon, and the map path, to ensure that it doesn't break in case your path includes special characters or whitespace. Mine doesn't, except for the slashes, which are okay. But if your path has some blanks in it or anything like that, simply wrap everything here — the entire volume mapping — with quotes.

### Docker File Sharing Permissions

Now, one important note about bind mounts and mounting folders, which you know, into containers:

> [!NOTE]
> **You should make sure that **Docker has access to the folder** which you're sharing as a bind mount.**

And you can do this by accessing the preferences of Docker, by using that running Docker service — this Docker process you started.

And there, make sure that under:

**Resources → File Sharing**

your folder which you are sharing right now is listed here. It doesn't have to be the full folder, but it should be a **parent folder** of the folder you're sharing. If you don't have this file-sharing area under Resources, you are most likely on Windows and there you don't have this option; you don't have this area in the settings. If you are running Docker with the help of the **WSL integration**.

<img src="./imgs/docker_preference.png" width="90%" />
<img src="./imgs/docker_preference_bind_mount_folder.png" width="90%" />

Well, if that option is missing, that's no problem. It's missing because you won't have any problems with file sharing anyway, with the setup you're using, so you're fine.

Now, if you should be using **Docker Toolbox** to run Docker, then by default your users folder will be shared, and attached you find a link to an article which explains how you can share other folders as well. So that is what you should do then, if you are using Docker Toolbox, to ensure that Docker is able to really write to your local machine for the given folder you want to use as a volume in your container. So the attached link is for you if you are using Docker Toolbox.

<img src="./imgs/docker_toolbox.png" width="70%" />

In my case, for example, the project I'm sharing is in some subfolder of my users directory. And that will be accessible by Docker because it's listed here under File Sharing Resources. 
<img src="./imgs/docker_users_folder.png" width="70%" />

> [!NOTE]
> **Now, if your project is in some folder which is not a subfolder of one of the resources specified here, you should make sure that you add your project folder, or a parent folder of it, even better, as a shareable resource in this list in your Docker preferences.**

```
docker-complete $ docker run -d -p 3000:80 --rm --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" feedback-node:volumes
docker ps
docker ps -a
```

<img src="./imgs/docker_bind_mount_run.png" width="90%" />

And if we now hit Enter, this starts the container again. And now our entire folders here will be mounted as a volume into the `app` folder inside of the container. 
Nonetheless, you'll notice if you reload the browser that it crashes. And if we inspect our running and shutdown containers thereafter, we see this container is nowhere to be found. And we don't find it in the closed containers, in the stopped containers, because we remove all containers which are shut down. But this, of course, also means that it seems to shut down immediately.

So something seems to be very wrong here.

### Investigating the Error

And to find out what's wrong, I'll restart it again.

But now without:
```bash
--rm
```
to not automatically remove it when it shuts down. And thereafter we see it here under stopped containers.
```
docker-complete $ docker run -d -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" feedback-node:volumes
docker ps -a
```
> **When you run that command, -v "/Users/.../docker-complete:/app" tells Docker to mount your local project folder directly into the container's /app folder.Because the /app folder in the container already contains the code copied during the image build (COPY . .), mounting your local folder "overwrites" or hides those original container files in real time.**

<img src="./imgs/docker_bind_mount_run_again.png" width="90%" />
And we can now use:

```bash
docker logs
```
to look into our container, to see the error that was thrown. And we see that the problem is that it fails to find the module:
```text
Express
```
And that simply means that our Node code doesn't even start executing because an important dependency is missing. 

Now, up to this point, it always worked, of course.

And after all, we are installing all dependencies with the `npm install` instruction in the Dockerfile.

> [!NOTE]
> **So why is it missing now?**
> **Well, that has something to do with our newly added **bind mount**.**
> **With this bind mount that binds our entire project folder to the `app` folder.**

<img src="./imgs/docker_bind_mount_error_nodemodules.png" width="90%" />

### Bind Mount problem
Keep in mind that we're binding this DOCKER-COMPLETE folder, everything in that folder to the app folder.
```
└── DOCKER-COMPLETE
    ├── feedback/
    ├── pages/
    │   ├── exists.html
    │   └── feedback.html
    ├── public/
    ├── temp/
    ├── .gitignore
    ├── Dockerfile
    ├── package.json
    └── server.js
```

**When you run that command, -v "/Users/.../docker-complete:/app" tells Docker to mount your local project folder directly into the container's /app folder.Because the /app folder in the container already contains the code copied during the image build (COPY . .), mounting your local folder "overwrites" or hides those original container files in real time.**
```
docker-complete $ docker run -d -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" feedback-node:volumes
```

as per our **Dockerfile**
```
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 80

CMD [ "node", "server.js" ]
```
Now we copy everything into that folder, initially here when the image is created, and we install all dependencies, but in the end we render all these steps
```
COPY package.json .
RUN npm install
COPY . .
```
, which we performed during image creation worthless, if we then blind this mount to the container, if we then blind this mount to the container, because we overwrite everything in the app folder anyways with our local folder. And this local folder doesn't have the node modules folder with all the dependencies this app needs, and that's the reason for this error we're getting. The server JS file needs the express package, the express dependency, and it exists in a container, because of npm install, it does not exist in my local setup, because I never ran npm install there.

<img src="./imgs/docker_bind_mount_error_nodemodules.png" width="90%" />

And since I mount my local folder to the app folder, we overwrite all the works `(Dockerfile commands)` we did here when we set up the image and therefore also the container. We overwrite this with our local folder, and that is the problem here.

### How Containers interact with Volumes and Bind Mounts

If we have a container, and we don't have a volume, and a bind mount, we can mount both into the container with the -V flag, which was explained previously.
That means that some folders inside of the container are mounted, or are connected to folders on the host machine.

Now let's say we already had files inside of the container. In that case, they also now exist in the outside volume, and if you write a new file, it's also added in the folder on the host machine.

If you write a new file, it's also added in the folder on the host machine. If the container then stands up, and it finds files in the volume, and it doesn't have any internal files yet, it loads the files from the volume.

If the container then stands up, and it finds files in the volume, and it doesn't have any internal files yet, it loads the files from the volume. That's actually what we utilize with the bind mount.

Here we don't have any files inside of the container, let's say, but we have files on the local host machine. In that case, these files are basically also usable inside of the container, but now we have kind of both things happening.

<img src="./imgs/docker_container_volume_interaction.png" width="90%" />

Now we have kind of both things happening. We have files inside of the container in the app folder, because of these `Dockerfile` instructions
```
COPY package.json .
RUN npm install
COPY . .
```
and we have files and folders of the application outside of the container in this folder on our local host machine.
```
└── DOCKER-COMPLETE
    ├── feedback/
    ├── pages/
    │   ├── exists.html
    │   └── feedback.html
    ├── public/
    ├── temp/
    ├── .gitignore
    ├── Dockerfile
    ├── package.json
    └── server.js
```
And now the good thing is that **Docker does not start overwriting our local files on our host machine**. This would be pretty bad, if Docker would be doing that, right. We could delete a lot of important things on our computer by accident. So that's not what's happening.
> **Docker will not overwrite our local host folder here.**
> **Docker prioritizes the host machine's files when using a bind mount, meaning your local project folder dictates what the container sees, protecting your local source code from being overwritten or deleted by the container.**

Instead, here, the local host folder, and the content in it overwrites what's in the Docker container, and that's the problem here, with that we got rid of node modules and so on.

**1. The Bind Mount Rule: Host Wins**
   When you map your local directory (DOCKER-COMPLETE) to the container's /app folder using the bind mount (-v "/Users/...:/app"):
   - Docker treats the host folder as the source of truth.
   - It essentially "overlays" your local folder on top of the container's /app folder.
   - Because it does this, any files created inside the container during the docker build phase (via COPY . .) are hidden, not destroyed. The container now reads directly from your laptop. Your local files remain completely safe and untouched.

**2. The Named Volume Rule: Container Wins (Initially)**
   In your previous thought, you mentioned that if a container stands up, finds an empty volume, and has internal files, it copies them out. That is true only for Named Volumes (e.g., -v feedback:/app/feedback).
   - When the container starts, Docker sees that the named volume feedback is empty.
   - It looks inside the container's /app/feedback directory, sees whatever files were put there during COPY . ., and copies them out to your host machine's Docker storage area.
   - From that point forward, they stay synchronized.

## Solution of Bind Mounts issue
Now to solve this problem, we kind of need to tell Docker, that there are certain parts in its internal file system, which should not be overwritten from outside in case we have such a clash as we have it here. And that can be achieved with another volume, which we add to this Docker container with an anonymous volume actually.

If we add one more volume with `-V`, we can find the app/node modules folder. And it's an anonymous volume, which we also can add like this, and not just in the Docker file.
```
docker-complete $ docker run -d -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" -v /app/node_modules feedback-node:volumes
```
`-v /app/node_modules` before `feedback-node:volumes` is an anonymous volume.

it would have a name if we add a colon in front of it, and assign some name here
```
docker-complete $ docker run -d -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" -v somename:/app/node_modules feedback-node:volumes
```
`-v somename:/app/node_modules` before `feedback-node:volumes` is a named volume.

but if we don't do that, it's an anonymous volume. So this is an anonymous volume, and adding it like this is equivalent to adding it like this here.

Adding it like this `-v somename:/app/node_modules` is equivalent to adding it like this `VOLUME ["/app/node_modules"]` inside Dockerfile.
```
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 80

VOLUME ["/app/node_modules"]

CMD [ "node", "server.js" ]
```
You could do both, but I'll comment this out with a hash in front of it and go with this `docker run` approach, because I then don't have to rebuild the image.

> [!NOTE]
> **this will now also show us a use case, where anonymous volumes can be helpful.**

### Now why does this help here?
Well, Docker always evaluates all volumes you are setting on a container, and if there are clashes, the longer internal path wins.

```
docker-complete $ docker run -d -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" -v /app/node_modules feedback-node:volumes
```
**So for example here we have a clash, we have `/app` volume which is bound to something `/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete`, and we have an `/app/node_modules` volume, which is also bound to something.**     
**We didn't assign a name, but keep in mind, even for anonymous volumes, they are managed by Docker, and there is some mapped folder somewhere on the local machine. It's just cleared when a container is removed, but there is a folder on the host machine, even for anonymous modules.**     

So here, Docker sees that we have some volume mapped to the `/app` folder, and some volume to the `/app/node_modules` folder. And in that case, the simple rule Docker has 
is that the longer the more specific path wins.

So that means we can still bind to the `/app` folder, but the node modules folder inside of the `/app` folder.      
The `/app/node_modules` is the folder created by the `RUN npm install` command by the way.  

**1. "The folder created by the npm install command" : When your Dockerfile runs during the build phase, it executes `RUN npm install`. This command downloads all your dependencies and creates a folder at `/app/node_modules` inside the container image.**

The `/app/node_modules` folder will survive, `/app/node_modules` will overwrite the folder that's coming in from outside because of this module, and here, we actually pass in no node modules folder, and therefore this `/app/node_modules` folder overwrites the non existent node modules folder,

**2. "We pass in no node modules folder from outside" : On your local host machine (your laptop), you generally do not run npm install locally, so your local DOCKER-COMPLETE folder does not have a node_modules directory.**

**3. "It will overwrite the folder coming from outside" (The Docker Rule)**
When you use the bind mount -v "/Users/...:/app", Docker overlays your local folder onto /app. Because your local folder doesn't have node_modules, the bind mount would normally wipe out the container's internal /app/node_modules folder.

**However, because you added -v /app/node_modules (the anonymous volume), Docker follows its "longest path wins" rule:**
- /app (Bind Mount) maps to your local folder.
- /app/node_modules (Anonymous Volume) is a longer, deeper path.

Docker grabs the node_modules folder generated during npm install and locks it safely inside that anonymous volume. It effectively overwrites the empty space coming from your laptop, ensuring your app has its dependencies and can actually run!

### Final Story of Bind Mount
The node modules folder, which was created during the image creation with `RUN npm install` will survive, and will actually co exist together with the bind mount `/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app`, which still also works.

And therefore now after this long explanation, if we stop the currently running container, and we remove this container, we can run this container now with this extra anonymous volume added. If we want to also again with --RM added, and now this starts, and now this app also works again, test this works. Again, we'll see under feedback, awesome.txt that file from earlier is also still there.
```
docker stop feedback-app
docker rm feedback-app
docker run -d --rm -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" -v /app/node_modules feedback-node:volumes
```

Now we actually have one additional benefit. Now if we change something in our HTML file, for example, I removed that please text again, and I save that file, if I now reload we see that change instantly without rebuilding the image in between, and the reason for that is that now we added this bind mount `-v /app/node_modules`, which in this case also only works, if we add this anonymous module `/app/node_modules` to make sure that node_modules folder doesn't get overwritten by our bind mount folder content.

> **Now with the bind mount added, if we changed the HTML files, those changes are instantly reflected, when we reload the app here.**

## 11. A NodeJS-specific Adjustment: Using Nodemon in a Container
Suppose, you change something (add console.log inside save api code) in server.js. Now my container is still up and running. You can always check this with `docker ps`, of course. if you run the browser & save the feedback form.     
Now run `docker logs feedback-app` in terminal. you will see nothing.

<img src="./imgs/docker_node_server_log_error.png" width="90%" />

that's a node specific problem, but you might face similar issues in other applications as well. This code in server JS is executed by node, by the node runtime. Which is responsible for us seeing this page and having a working web server. Now we need to restart the web server, to pick up changes in the JavaScript code that is used by that server. We don't need to restart the entire container, but just the web server. Now, if the container is already running, restarting just the server in that container, is not really trivial though. 

> **So actually, the best thing we can do here, is to simply stop that container and then restart it thereafter.**

At least we don't need to rebuild the image. But by stopping and restarting, we start a new node server, which will pick up this server JS file.

```
docker stop feedback-app

docker start feedback-app
Error response from daemon: No such container: feedback-app
Error: failed to start containers: feedback-app
```

`docker start feedback-app` is giving error because since I added `--rm` when I created the container, actually we can't start it again, because it was deleted once I stopped it. So here I would have to run Docker, run again.
```
docker run -d --rm -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" -v /app/node_modules feedback-node:volumes
```
Now run the browser & save the feedback form. Check the `docker logs`, will display the logs.
```
docker logs feedback-app
TEST
```
So it's better than having to rebuild the entire image, but still not great. There is a useful extra package, which we can use in node JS development, which we can use in node JS development, which will watch the file system, and which will restart the node server, whenever a file changed.

It's a package which be used during development, therefore, to ensure that changes are reflected instantly. And for that here in packaged.json, you should add a devDependencies node, next to dependencies. And in their, add nodemon. And then the version 2.0.4, for example. For that We should add a script section, a scripts section to package.json as well. And in there add a script named start, and type nodemon server.js in here.
```
package.json
.
.
"scripts": {
     "start": "nodemon server.js"
}
```

We now also need to tweak our Docker file, to utilize this new script and use this script to start our process, our server. Change the docker script `CMD [ "npm", "srart" ]` which uses nodemon.
```
FROM node:14

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 80

# VOLUME ["/app/node_modules"]

CMD [ "npm", "srart" ]
```

we need to remove our feedback-node:volumes image. Stop the container Otherwise the image is still in use. and then build the image again to pick up this new command `CMD [ "npm", "srart" ]` at the end inside package.json.
```
docoker rmi feedback-node:volumes
docker stop feedback-node
docker build -t feedback-node:volumes .
```

And once that is all done, we can of course use our Docker run command again, to bring this server back up, now using this latest image.
```
docker run -d --rm -p 3000:80 --name feedback-app -v feedback:/app/feedback -v "/Users/maximilianschwarzmuller/development/teaching/udemy/docker-complete:/app" -v /app/node_modules feedback-node:volumes
```
Now the key difference is that this server should now automatically restart, whenever we change anything in server.js.

Now add exclamation marks with `console.log('TEST!!!!')` inside server.js. Now save the feedback form in the browser. now if I run Docker logs feedback-app, we see these exclamation marks here.
```
docker logs feedback-app
```
<img src="./imgs/docker_node_server_log_nodemon.png" width="90%" />

> [!NOTE]
> Now I got an important note for windows users, especially when you're using WSL2 for running Docker on windows. If you're doing that, you might notice that, when for me, file changes do reload D development server, and everything does work as shown in the lecture, it doesn't work for you. The reason for that is that, when using WSL2, you should store your project and your project files, directly in the Linux file system  in the end. So somewhere in the Linux file system, not your regular windows file system. Now you might wonder how you get to this Linux file system, attached you'll find a link. You find a link to this article, which explains how you can mount and work with this Linux file system. Where if you then have your project in there, your changes will propagate to the Docker container. And therefore they should update as shown. If you use the regular windows file system, file changes are not propagated to the Docker container, and therefore not picked up by tools like nodemon.

## Anonymous Volume vs Named Volume vs Bind Mount

### 1. Anonymous Volume
```
docker run -v /app/data ...
```
There is no name and no host path before /app/data.
```
-v /app/data
   └──────┘
   container path only
```
Docker creates an anonymous volume and mounts it at:
```
/app/data
```
Docker generates the volume name automatically.

### 2. Named Volume
```
docker run -v data:/app/data ...
```
Here:
```
data:/app/data
│    │
│    └── Container path
└─────── Volume name
```
data is the named volume.

You can reuse it:
```
docker run -v data:/app/data ...
```
with another container, and both can access the same persistent volume.

You can also see it with:
```
docker volume ls
```

### 3. Bind Mount
```
docker run -v /path/to/code:/app/code ...
```
Here:
```
/path/to/code:/app/code
│             │
│             └── Container path
└──────────────── Host path
```
The first part is an actual path on your host machine.

For example:
```
docker run -v "C:\Projects\feedback-app:/app" ...
```
So:
```
Host
C:\Projects\feedback-app
          │
          │ bind mount
          ▼
Container
/app
```
Changes made to the host folder are immediately visible inside the container.

