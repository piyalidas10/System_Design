# Docker Persistence & Volumes
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

## Stop the container & run again this container without --rm.
```
docker stop feedback-app
```
```
docker run -p 3000:80 -d --name feedback-app feedback-node
```
Now reload the app and it works. But you'll notice that if I try to view feedbackawesome.txt, this file doesn't exist. It fails to get this file. And of course, this worked a couple of minutes ago.

**Because we deleted the container when we stopped it the first time.**

Now add again feedbackawesome.txt in the newly started container, we can view feedbackawesome.txt.

## Stop the container again
```
docker stop feedback-app
```
And if I now stop this container feedback app again and keep in mind that now feedbackawesome.txt will not be removed because we did not add --rm on the Docker run command.

## Restart the container again
```
docker start feedback-app
```
I restart the container again. You will notice that now if I reload, the feedbackawesome.txt is still there.

> **Now feedbackawesome.txt file is not lost because we didn't write the --rm at container creation 2nd time to remove the conatiner**

## Docker Container Read-Write Layer

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

## Docker Volumes

Now we know the problem.

What's the solution?

Docker has a built-in feature called **volumes**.

And volumes help us with persisting data and solving the problem I outlined in the last lecture.

Now, how do we utilize volumes in our application?

In this Docker application, for example.

First of all, we have to understand what exactly volumes are and how they work.

Volumes are folders on your host machine, so not in the container, not in the image, but on your host machine's hard drive, which are mounted, which basically means made available or mapped, into containers.

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

## Updated Dockerfile

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

## ⚠️ The Catch: This creates an "Anonymous" Volume
Using the VOLUME instruction inside a Dockerfile creates an Anonymous Volume. This has a few major limitations you should be aware of:
- **Docker chooses the host path:** Docker creates a folder with a long, random hash name hidden deep inside its internal storage directory on your computer (e.g., /var/lib/docker/volumes/...). You cannot easily see or access it outside of Docker.
- **It does not survive container removal (docker rm):** If you stop the container, the data stays. However, if you remove the container and start a brand-new one using docker run, a new, empty anonymous volume will be generated. The new container will not automatically hook back up to the old data.

## Docker build again with Volume
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
check the container
```
docker ps
```
Now try to save feedbackawesome.txt file using a feedback form submit. It will work.
<img src="./imgs/docker_volume_run.png" width="80%" />
<img src="./imgs/docker_volume_file_present.png" width="80%" />

Now stop the container & Rerun the container
```
docker stop feedback-app
docker run -d -p 3000:80 --rm --name feedback-app feedback-node:volumes
```
no, this feedbackawesome.txt file is still not there.
<img src="./imgs/docker_volume_file_notpresent.png" width="80%" />




