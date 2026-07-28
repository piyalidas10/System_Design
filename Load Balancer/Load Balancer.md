# Load Balancer

## What is a Load Balancer?

Today we're going to understand the term Load Balancer.

Many of you have probably heard about load balancers and may even know some of the common algorithms they use.

But the important question is:
```
Does a load balancer in 2026 still work the same way as the one we learned years ago?
```
The answer is No. Modern load balancers have become much smarter.

We'll also answer another important question:
```
What happens if the load balancer itself crashes? How do modern systems handle that?
```

## Client and Server

Imagine you are shopping on Amazon.

You click "Place Order."
```
Client  ----------------->  Amazon Server
 Request                    Processes Request
                             Returns Response
```
**Your request could be:**
- Place an order
- Search a product
- View your cart

The server processes your request and sends back a response.

**For example:**
```
Request:
Place Order

↓

Response:
Your order has been placed successfully.
```
### Initially There Is Only One Server

**Suppose Amazon has only one server.**
```
         User 1
            |
         User 2
            |
         User 3
            |
         User 4
            |
       Amazon Server
```
Every user sends requests to the same machine.

Initially, everything works perfectly.

### What Happens as Users Increase?

Now imagine Amazon becomes popular.

Thousands...

Millions...

Eventually billions of users start using it.

Every single user is still sending requests to the same server.

Eventually the server becomes overloaded.

It may:
- become slow
- stop responding
- crash completely

### Real-Life Example

Think about your mobile phone.

Suppose one friend asks you to send a video.
```
Phone
 ↓
Friend
```
The video transfers quickly.

Now imagine 10 friends ask for the same video simultaneously.

Your phone now has to divide its bandwidth among everyone.

Instead of sending one fast transfer, it sends small portions to each person.

Everything becomes slower.

Exactly the same thing happens with servers.

A server has limited resources.

For example:
- 4 GB RAM
- 1 TB Storage

It can only process a certain number of requests at once.

## First Solution: Vertical Scaling

Suppose traffic increases.

The first thing we usually do is upgrade the server.

Instead of:
```
4 GB RAM
1 TB Disk
```
We upgrade it to:
```
16 GB RAM
5 TB Disk
More CPU
```
This is called
```
Vertical Scaling
```
You're making the same machine more powerful.
```
Before

Client
   |
Server
4 GB RAM


↓

After

Client
   |
Server
16 GB RAM
More CPU
More Storage
```
The server now handles more users.

**But Vertical Scaling Has a Limit**

Eventually, you'll reach a point where you can't upgrade the machine anymore.

You can't keep adding:
- RAM
- CPU
- Storage

forever.

Every physical machine has a maximum capacity.

So what do we do then?

## Horizontal Scaling

Instead of making one server bigger,

we create multiple identical servers.

Example:
```
Server 1

Server 2

Server 3
```
All three perform exactly the same work.

Now Amazon doesn't have one server anymore.

It has three.

**New Problem**

Now the client has a question.
```
Which server should I send my request to?
```
```
          ?
Client -------->

Server 1 ?

Server 2 ?

Server 3 ?
```
How does the client know?

It doesn't.

This is where the Load Balancer comes in.

## What is a Load Balancer?

A Load Balancer sits between clients and servers.
```
          Client
             |
             |
      Load Balancer
        /    |    \
       /     |     \
 Server1 Server2 Server3
```
The client sends every request to the load balancer.

The load balancer decides:
- Should this request go to Server 1?
- Server 2?
- Server 3?

The client never needs to know.

## What Exactly Is a Load Balancer?

Many people think it's some magical hardware.

Actually...

A load balancer is simply:
```
A piece of software (code) running on a server.
```
Its job is to intelligently distribute requests.

## How Does It Decide?

It uses algorithms.

One of the simplest algorithms is:
```
Round Robin
```
Suppose there are three servers.
```
Server A
Server B
Server C
```
Requests arrive like this:
```
Request 1 → Server A

Request 2 → Server B

Request 3 → Server C

Request 4 → Server A

Request 5 → Server B

Request 6 → Server C
```
It simply rotates through the servers.

Like this:
```
A
↓

B
↓

C
↓

A
↓

B
↓

C
```

### How is Round Robin Implemented?

Suppose we number the servers.
```
Server 0

Server 1

Server 2
```
Now use this formula:

Request Number % 3

Example:
```
0 % 3 = 0 → Server 0

1 % 3 = 1 → Server 1

2 % 3 = 2 → Server 2

3 % 3 = 0 → Server 0

4 % 3 = 1 → Server 1

5 % 3 = 2 → Server 2
```
This cycles forever.

Simple.

Fast.

Easy.

### What's Wrong with Round Robin?

At first glance, it seems perfect.

But there's a serious problem.

Not every request is equal.

Some requests are very light:
- Fetch user profile
- Read product details
- Read from database

These finish quickly.

Other requests are extremely heavy:
- Generate AI images
- Encode videos
- Train ML models
- Process large files

These consume much more:
- CPU
- Memory
- GPU
- Time

Suppose:
```
Server 1
10 heavy requests

Server 2
7 light requests

Server 3
8 medium requests
```
Round Robin doesn't care.

If the next request mathematically belongs to Server 1...

it sends it there anyway.

It never checks whether that server is already overloaded.

It blindly follows the rotation.

And that's where smarter algorithms come in.

## Algorithm 2: Least Connections

We saw that Round Robin has a major limitation—it distributes requests equally without considering how busy each server already is.

To solve this, we use the Least Connections algorithm.

Instead of blindly rotating requests, the load balancer first checks:
```
"Which server currently has the fewest active connections?"
```
It forwards the new request to that server.

**Example**

Suppose we have three servers.
```
Server A → 10 active requests

Server B → 7 active requests

Server C → 5 active requests
```
A new client request arrives.

The load balancer compares all three servers.

It notices:
- Server A → 10 requests
- Server B → 7 requests
- Server C → 5 requests ✅

Since Server C has the fewest active connections, the request is sent there.

Now Server C has:
```
Server A → 10

Server B → 7

Server C → 6
```
Another request arrives.

Server C still has the fewest connections, so it receives that request too.

Now:
```
Server A → 10

Server B → 7

Server C → 7
```
The next request arrives.

Now both Server B and Server C have 7 active connections.

The load balancer can choose either one.

As requests finish processing, the active connection count decreases, and the algorithm continuously adjusts.

**Limitation of Least Connections**

Although this is much better than Round Robin, it still has a weakness.

It assumes:

Every request costs the same amount of work.

But in real-world systems, that's not true.

Imagine:
```
Server A → 18 simple database queries

Server B → 7 AI image generation requests
```
At first glance:
```
18 > 7
```
So Least Connections will send the next request to Server B, because it has fewer active connections.

However, that's actually a poor decision.

**Why?**

Those 18 requests on Server A might be simple database reads.

Each one takes only a few milliseconds.

Meanwhile, the 7 requests on Server B could be AI image generation tasks.

Each image generation request may take 2 minutes.

So although Server B has fewer requests, it's actually doing much more work.

This shows that:

Connection count ≠ Server workload

## Algorithm 3: Least Response Time

To solve this problem, another strategy is used:

**Least Response Time**

Instead of counting connections, the load balancer measures:
```
Which server responds the fastest?
```

**Example**

Suppose we periodically send health checks to all servers.

The average response times are:
```
Server A → 3 seconds

Server B → 4 seconds

Server C → 5 seconds
```
A new request arrives.

The load balancer sees:
- Server A responds in 3 seconds ✅
- Server B responds in 4 seconds
- Server C responds in 5 seconds

Therefore, it sends the request to Server A.

**Dynamic Updates**

After some time, Server A becomes busy.

Now response times change.
```
Server A → 7 seconds

Server B → 4 seconds

Server C → 5 seconds
```
The next incoming request is now sent to Server B, because it has become the fastest server.

The load balancer continuously monitors server response times and updates its routing decisions.

**Advantage**
- Unlike Least Connections, this strategy focuses on actual performance rather than simply counting requests.
- A server with many lightweight requests may still respond quickly.
- A server with only a few expensive AI tasks may respond slowly.
- Response time captures this difference.

## Going One Step Further: Weighted Algorithms

So far, we've assumed all servers have identical hardware.

But in reality, servers often have different capacities.

For example:
```
Server A → 4 GB RAM

Server B → 4 GB RAM

Server C → 8 GB RAM
```
Clearly, Server C is more powerful.

It should naturally receive more traffic.

This is where weighted algorithms come into play.

## Weighted Round Robin

Suppose Server C is twice as powerful as the other two servers.

Instead of distributing requests equally:
```
A

B

C

A

B

C
```
The load balancer assigns more requests to Server C.

Example:
```
Request 1 → Server C

Request 2 → Server C

Request 3 → Server A

Request 4 → Server B
```
If Server C has three times the capacity, the distribution could be:
```
Server C

Server C

Server C

Server A

Server B
```
This ensures the stronger server carries a larger share of the workload.

## Weighted Least Connections

The same concept applies to Least Connections.

Imagine:
```
Server A → 4 GB RAM

Server B → 4 GB RAM

Server C → 8 GB RAM
```
Even if Server C already has more active connections, that's acceptable because it has more processing power.

Instead of treating every server equally, the load balancer considers each server's capacity before making a routing decision.

As a result, the stronger server is allowed to handle more concurrent requests.

## Weighted Least Response Time

The same idea also extends to response-time-based routing.

The load balancer evaluates:
- Response time
- CPU capacity
- Memory
- Server weight

A more powerful server is expected to handle a higher workload while still maintaining acceptable response times.

## Summary of Algorithms
| Algorithm                    | Decision Based On               | Main Advantage                                   | Limitation                                 |
| ---------------------------- | ------------------------------- | ------------------------------------------------ | ------------------------------------------ |
| Round Robin                  | Fixed rotation                  | Very simple                                      | Ignores server load                        |
| Least Connections            | Number of active requests       | Balances active traffic                          | Assumes all requests are equally expensive |
| Least Response Time          | Fastest responding server       | Better reflects actual performance               | Based on historical response time          |
| Weighted Round Robin         | Server capacity + rotation      | Utilizes powerful servers better                 | Doesn't account for current workload       |
| Weighted Least Connections   | Connections + server capacity   | Better resource utilization                      | Doesn't consider request complexity        |
| Weighted Least Response Time | Response time + server capacity | One of the most effective traditional strategies | Still doesn't predict future workload      |

## Algorithm 4: IP Hash

So far, we've looked at algorithms that distribute requests based on:
- Round Robin
- Least Connections
- Least Response Time

Now let's discuss another important strategy called IP Hash, also known as Sticky Sessions or Session Affinity.

### Why Do We Need Sticky Sessions?

Imagine there are three application servers.
```
               Load Balancer
                     |
        -----------------------------
        |            |             |
    Server A     Server B      Server C
```
A user opens Amazon and logs in using their username and password.

The login request is routed to Server A.

Server A authenticates the user.

After successful authentication, it generates a session token (or session object).

Suppose this token is stored only in Server A's memory (RAM).
```
User Login
      |
      v
 Server A
      |
Creates Session Token
Stores in RAM
Returns Token to User
```
The user is now logged in.

### The Problem

A few seconds later, the same user clicks "Place Order."

This request again reaches the load balancer.

But this time, the load balancer sends the request to Server B.

First Request
```
User
  |
  v
Server A
(Session Created)

↓
```
Second Request
```
User
  |
  v
Server B
```
Server B receives the session token.

But it has never seen this token before.

Why?

Because the session exists only inside Server A's memory.

Server B has no knowledge of it.

It therefore assumes:
```
"This is an invalid session."
```
The user is treated as unauthenticated and may be forced to log in again.

That creates a poor user experience.

### Solution: Always Send the Same User to the Same Server

This is exactly what IP Hash does.

The load balancer calculates a hash value from the user's IP address.

For example:
```
User IP

192.168.10.25

↓

Hash Function

↓

348275
```
Then it maps that hash to a server.

Example:
```
Hash % 3

↓

Server 0
```
Now every request from that same IP address always goes to the same server.
```
User
   |
   |
Load Balancer
   |
Server A

Every future request
↓

Server A
↓

Server A
↓

Server A
```
This keeps the user's session on the same machine.

This technique is known as:
- Sticky Sessions
- Session Affinity
- IP Hash Routing

### But There's Still a Problem

Suppose Server A crashes.
```
User
   |
Load Balancer
   |
Server A ❌
```
Now the load balancer can't send requests there anymore.

It forwards the user to Server B.
```
User
   |
Load Balancer
   |
Server B
```
Server B again has no session.

The user is logged out.

This is still a bad experience.

### Modern Solution: Redis

Instead of storing session data inside each server's RAM, modern distributed systems store it in a centralized in-memory datastore like Redis.
```
                Redis
           (Shared Sessions)
                 ^
                 |
-----------------------------------------
|               |               |
Server A     Server B      Server C
```
Now the login flow becomes:
```
User Login
      |
      v
Server A
      |
Stores Session
      |
    Redis
```
The session is no longer tied to Server A.

It's stored centrally.

### What Happens If Server A Crashes?

Suppose Server A goes down.
```
Server A ❌
```
The next request is sent to Server B.

Server B receives the user's session token.

Instead of checking its own memory, it queries Redis.
```
Server B
    |
Check Redis
    |
Session Found ✅
```
Redis confirms that the session is valid.

Server B continues processing the request.

The user never notices that Server A crashed.

This is one of the biggest advantages of using Redis for centralized session storage.

### Why Is Redis Used?

Redis is:
- Extremely fast (memory-based)
- Shared across all application servers
- Designed for distributed systems
- Perfect for storing:
  - Sessions
  - Authentication tokens
  - Caches
  - Temporary data

Instead of every server maintaining its own session state, all servers share the same session store.

### Another Problem: What If the Load Balancer Itself Crashes?

We've been assuming the load balancer is always available.

But remember:
```
A load balancer is just another server.
```
It can also fail.
```
Users

↓

Load Balancer ❌

↓

Servers
```
If there's only one load balancer and it crashes, users can't reach any application server.

This creates a Single Point of Failure (SPOF).

### First Idea: Add Multiple Load Balancers

So we deploy several load balancers.
```
           ?
Users
    |
-----------------------
|         |          |
LB1      LB2       LB3
```
But now another question arises:

Which load balancer should the client connect to?

One naive idea is to place another load balancer in front of these load balancers.
```
Users

↓

Master Load Balancer

↓

LB1
LB2
LB3
```
Unfortunately, this creates another single point of failure.

If the master load balancer crashes, the entire system becomes unavailable again.

We've simply moved the problem instead of solving it.

### Regional Load Balancers

A more practical solution is to deploy different load balancers for different geographic regions.

For example:
```
India   → Load Balancer India

USA     → Load Balancer USA

Europe  → Load Balancer Europe
```
Each region has its own entry point.

When a user accesses the service, DNS returns the IP address of the nearest regional load balancer.
```
User (India)

↓

DNS

↓

India Load Balancer
```
Similarly:
```
User (USA)

↓

DNS

↓

USA Load Balancer
```
This distributes traffic geographically and reduces latency.

### What If the India Load Balancer Fails?

Health checks continuously monitor each load balancer.

If the India load balancer becomes unavailable:
```
India LB ❌
```
DNS (or the cloud provider's traffic management service) can redirect users to another healthy regional load balancer, 
such as the USA or Europe, until the India endpoint is restored.

This provides high availability and improves fault tolerance.

## Anycast Load Balancing

Previously, we discussed one approach:
- Different regions
- Different load balancers
- DNS decides where the user should go

Example:
```
                 DNS
                  |
        ----------------------
        |          |          |
     India        USA      Europe
      LB           LB         LB
```
A user from India goes to the India load balancer.

A user from America goes to the US load balancer.

A user from Europe goes to the Europe load balancer.

This approach works well.

But there is another advanced technique used by companies like:
- Google
- Cloudflare
- Large CDN providers

This technique is called: Anycast

### What is Anycast?

In Anycast, we deploy many load balancers across the world.

But all of them have the same IP address.

Example:
```
             Same IP Address
                1.1.1.1


        -------------------------
        |           |           |
     India LB    USA LB    Europe LB


        1.1.1.1   1.1.1.1   1.1.1.1
```
Normally, we think:
```
"Two machines cannot have the same IP address."
```
But Anycast works differently.

The same IP address is advertised from multiple locations.

### How Does the User Reach the Correct Server?

Suppose Cloudflare has load balancers:
```
India

Europe

USA

Singapore
```
All announce:
```
1.1.1.1
```
Now a user in India sends a request.

The request does not randomly choose a server.

The internet routing system automatically selects the nearest available location.

Example:
```
User in India

        |
        |
        v
```
India Load Balancer

A user in America:
```
User in USA

        |
        |
        v

USA Load Balancer
```
A user in Europe:
```
User in Europe

        |
        |
        v

Europe Load Balancer
```

### Who Makes This Decision?

The decision is made by:
- Internet routers
- BGP (Border Gateway Protocol)

Routers know:
- Which path is shorter
- Which network is available
- Which location is closest

So traffic automatically reaches the nearest healthy Anycast location.

### What Happens If One Anycast Location Goes Down?

Example:
```
India Load Balancer ❌
```
The network routing system detects that this location is unavailable.

Traffic automatically moves to another available location.

Example:
```
User India

        |
        |
        v
```
Singapore Load Balancer

The user does not need to change anything.

## DNS Load Balancing vs Anycast
**DNS Based Routing**

Architecture:
```
User

 |

DNS

 |

Regional Load Balancer
```
Advantages:  
✅ Simple  
✅ Cheaper  
✅ Easy to configure  

Disadvantages:  
❌ DNS caching delays changes  
❌ Less control at network level  

**Anycast**

Architecture:
```
             Same IP

        -----------------
        |       |       |
       LB      LB      LB

     India   USA    Europe
```
Advantages:  
✅ Extremely fast routing  
✅ Automatic failover  
✅ Used by global-scale companies  

Disadvantages:  
❌ Expensive  
❌ Requires advanced networking infrastructure  

--------------------------------------
## Modern Load Balancing Problem (2026)

Now let's discuss how modern systems are becoming smarter.

Earlier, we used:
- Round Robin
- Least Connections
- Least Response Time

But modern applications have complex workloads.

### Problem with Least Response Time

Suppose we have three servers.

Current response times:
```
Server A → 3 seconds

Server B → 5 seconds

Server C → 8 seconds
```
A simple load balancer thinks:
```
"Server A is fastest. Send everything there."
```
So every new request goes to Server A.

Initially:
```
Request → Server A
Request → Server A
Request → Server A
```
Looks good.

But there is a hidden problem.

The load balancer is only looking at:

Past performance

It is not predicting future workload.

### YouTube Example

Imagine YouTube video processing.

Users upload videos:

30 seconds short video
10 minutes video
1 hour video
5 hour video

Each request has a different processing cost.

Suppose we have:
```
Server A

Current requests:
5 videos

Total processing time:
50 hours
```
```
Server B

Current requests:
8 videos

Total processing time:
7 hours
```
```
Server C

Current requests:
7 videos

Total processing time:
3 hours
```
A traditional Least Connection algorithm sees:
```
Server A → 5 requests
Server C → 7 requests
Server B → 8 requests
```
It thinks:
```
"Server A has fewer requests. Send more work there."
```
But Server A is actually overloaded.

Why?

Because those 5 videos are huge.

### Smarter Load Balancer

Modern systems inspect the request itself.

The load balancer asks:
- What type of request is this?
- How much computation will it require?
- How much time will it take?
- Which server currently has capacity?

Example:

A request:
```
Upload 1 hour video
```
The load balancer estimates:
```
Expected processing time:
1.5 hours
```
Then it chooses the server that can finish fastest.

Instead of:
```
Choose server with lowest response time
```
It does:
```
Choose server with lowest predicted completion time
```

### Traditional Approach
```
Past Data

↓

"This server was fast before"

↓

Send request
```

### Modern Approach
```
Request Analysis

+

Current Server Load

+

Historical Performance

+

Prediction Model

↓

Best Server Selection
```

### AI/ML Based Load Balancing

Modern systems can use machine learning models.

The load balancer can learn:
- Request patterns
- Traffic spikes
- Server behaviour
- Processing times

Example:

It learns:
```
Image generation requests
=
High CPU/GPU usage
```
So it routes them to GPU-enabled servers.

Another example:
```
Video encoding
=
Long-running task
```
It sends them to servers optimized for background processing.

### Packet-Level Routing Problem

Now consider large uploads.

A user uploads a 1-hour video.

Does the entire video arrive at once?

No.

Data is divided into packets.

Example:

Video Upload
```
Packet 1
Packet 2
Packet 3
Packet 4
...
```
The load balancer receives these packets separately.

**First Packet**

The first packet arrives.

The load balancer decides:

This upload should go to Server A

So:

Packet 1 → Server A

**The Problem**

Later:
```
Packet 2 arrives
```
The load balancer must remember:
```
This belongs to the same upload.

Send it to Server A.
```
Otherwise:
```
Packet 1 → Server A

Packet 2 → Server B ❌

Packet 3 → Server C ❌
```

The servers cannot combine the video correctly.

### Solution: Connection Persistence

Modern load balancers maintain state information.

They remember:
```
Upload ID
       |
       |
       v
Server A
```
All related packets continue going to the same server.

This is another form of:
- Sticky sessions
- Connection affinity

### Final Architecture (Modern 2026 Load Balancing)

A large-scale system looks like this:
```
                 Users Worldwide

                       |
                       |
                    Anycast IP

                       |
              Global Load Balancer

                       |
        --------------------------------
        |              |               |
     India DC       USA DC        Europe DC

        |
        |
 Regional Load Balancer

        |
 ---------------------------------
 |               |               |
App Server 1  App Server 2   App Server 3

        |
      Redis
   Shared Session

        |
     Database
```

---------------------------------------------------

## Key Takeaways
**1. Load Balancer is not just traffic distribution**

Modern load balancers consider:
- Request complexity
- Server health
- Latency
- Capacity
- Prediction models

**2. Simple algorithms are not enough**

Old:
- Round Robin
- Least Connection

Modern:
- AI-based routing
- Predictive scheduling
- Workload-aware balancing

**3. High availability requires removing single points of failure**

Solutions:
 - Multiple load balancers
 - DNS routing
 - Anycast
 - Health checks
 - Regional failover

**4. Distributed systems need shared state**

Solutions:
- Redis
- Distributed caches
- External session stores

**5. Future load balancers are becoming intelligent**

The next generation of load balancers will not only ask:
```
"Which server is free?"
```
They will ask:
```
"Which server can complete this request fastest with the least impact on the entire system?"
```

