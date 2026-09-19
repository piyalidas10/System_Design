# Docker Storage — Volumes and Bind Mounts

| Feature                      | Anonymous Volume                        | Named Volume                | Bind Mount                |
| ---------------------------- | --------------------------------------- | --------------------------- | ------------------------- |
| Docker syntax                | `-v /app/data`                          | `-v data:/app/data`         | `-v /host/path:/app/data` |
| Name assigned by you?        | ❌                                       | ✅                           | N/A                       |
| Host path controlled by you? | ❌                                       | ❌                           | ✅                         |
| Tied to container?           | Effectively associated with a container | ❌                           | ❌                         |
| Survives container restart?  | ✅                                       | ✅                           | ✅                         |
| Survives container removal?  | ❌ with `--rm`                           | ✅                           | ✅                         |
| Share between containers?    | ❌ Generally not intended                | ✅                           | ✅                         |
| Best use                     | Isolating/protecting container data     | Persistent application data | Development/source code   |
| Easy to edit from host?      | ❌                                       | ❌                           | ✅                         |

## The simplest mental model
```
Anonymous Volume
-v /app/data
        ↓
"Give this container some Docker-managed storage."

Named Volume
-v mydata:/app/data
        ↓
"Give me reusable Docker-managed persistent storage."

Bind Mount
-v C:\project:/app
        ↓
"Mount THIS exact folder from my computer."
```

**Interview shortcut:**
```
Anonymous = container-associated storage
Named = reusable persistent Docker-managed storage
Bind mount = host-controlled folder mapped into the container
```

So that were volumes and bind mounts.

Here's a quick overview, since I know it's a lot to digest and easy to mix up these concepts.

You basically have these three ways of using the `-v` option when you use `docker run`.

### 1. Anonymous Volume

```bash
docker run -v /app/data ...
```

This first example would create an **anonymous volume** since you don't assign any name.

### 2. Named Volume

```bash
docker run -v data:/app/data ...
```

The second example would create a **named volume** since you do assign a name.

### 3. Bind Mount

```bash
docker run -v /path/to/code:/app/code ...
```

In the third example, the name is actually an **absolute path to a folder on your host machine**, and therefore this is a **bind mount**.

It's actually as easy as that.

---

# Anonymous Volumes

Now, when it comes to the different features these different concepts have, I've got another comparison for you.

With anonymous volumes, you create a volume which is kind of attached to a container.

It's removed if the container is removed.

It survives container shutdown and restart, but if it is removed, it's gone.

And therefore, if you use the `--rm` option when you run the container, of course the volume is all gone when you stop the container because stopping then basically also means removing the container.

Therefore, since it is removed when the container is removed, you can't use anonymous volumes to share data across containers.

And you also can't use them to save data across container destruction and recreation as you saw.

Anonymous volumes are not useful for that.

But anonymous volumes, either created with the `VOLUME` instruction in the Dockerfile or created with `-v`, like this, can be useful for **locking in certain data which already exists in the container**.

They can be useful for avoiding that this data then gets overwritten by another mount.

And that's something where anonymous volumes can save the day.

---

## Anonymous Volumes and the Host File System

In addition, anonymous volumes also still create a counterpart — a folder — on your host machine.

Of course, that's removed when the container is removed, but that exists as long as the container is running.

And that, of course, means that Docker doesn't have to store all the data inside of the container and doesn't have to manage all the data inside of this container's read-write layer.

But instead, it can outsource certain data to your host machine's file system.

And this can also help with performance and efficiency.

So that's why anonymous volumes can be worth a closer look.

In this example, we could consider creating another anonymous volume, maybe inside of the Dockerfile, to mix things up for the `temp` folder.

It's okay if we lose that folder when the container is removed, but for the reasons I just mentioned — for example, for tiny performance improvements — it can be worth mapping this `temp` folder to an anonymous volume.

That way, the data managed in there is not managed in the Docker container anymore, but is actually outsourced to the host file system, you could say.

That could be useful, and therefore it is something we can do here for sure.

---

# Named Volumes

Obviously, very useful are **named volumes**.

Named volumes cannot be created in the Dockerfile, but instead you create them with the `-v` instruction when you run a container.

They are named because you assign a name in front of the colon:

```bash
docker run -v data:/app/data ...
```

Now, the great thing about named volumes is that they're created in general.

They're **not tied to any specific container**.

They do survive container shutdown and also the removal of containers.

If you want to remove a named volume, you can still do that, but you have to do it with a separate command built into the Docker CLI.

We'll have a look at that later.

Now, since they survive container removal, you can use named volumes to **share data across multiple containers**.

Something we didn't do in this module, but of course, you could do that.

You could mount one and the same named volume to multiple different containers, and hence the data in there could be shared between containers.

And you can also use them to **store data across container shutdowns and removals**.

That is what we did in this module.

---

# Bind Mounts

And then we had **bind mounts**.

Bind mounts serve a different purpose.

Here, we know where data is stored on the host machine.

Bind mounts are also **not tied to one specific container**.

You can attach them to multiple containers, and they do survive container shutdown and removal.

If you want to clear the data of a bind mount, you actually have to delete it on your host machine.

So here, I would have to delete all the content here in my project to also remove it in the container.

You can't delete it with a Docker command.

And that makes a lot of sense because it is a folder on your system, after all, and you don't want to accidentally delete this somehow.

Now, of course, you can share them across containers, and you can also reuse them on one and the same container across restarts.

This also works.

---

# Final Comparison

And these are the three main ways we have for managing data inside of a container.

I hope I could make it clear what the differences are and when you use which.

And, of course, it should be needless to say that throughout this course, we'll also have plenty of other examples where it shows this.
