# ⚖️ Load Balancing Algorithms
**Imagine we have:**
```
                 ┌──────────────┐
Users ──────────►│ Load Balancer│
                 └──────┬───────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
      Server A       Server B       Server C
```
The load balancer's job is simple:

"Which backend server should handle this request?"

**There are two major approaches:**
```
Load Balancing
      │
      ├── Static
      │     ├── Round Robin
      │     ├── Weighted Round Robin
      │     ├── IP Hash
      │     ├── URL Hash
      │     └── Consistent Hashing
      │
      └── Dynamic
            ├── Least Connections
            ├── Weighted Least Connections
            ├── Least Response Time
            └── Resource-Based
```
-----------------------------------------------
## 1. Static Load Balancing

Static = "I decide the routing rule beforehand."

The load balancer generally doesn't need to ask:
```
"How busy is Server A right now?"
```
Instead, it follows a predefined algorithm.

**For example:**
```
Server A
Server B
Server C

Request 1 → A
Request 2 → B
Request 3 → C
Request 4 → A
Request 5 → B
Request 6 → C
```

**Advantages**
- Simple
- Fast
- Low computational overhead
- Easy to implement

**Disadvantage**
- It doesn't necessarily understand the current workload.

**For example:**
```
Server A → 95% CPU
Server B → 20% CPU
Server C → 30% CPU
```
A static algorithm might still send the next request to A.

------------------------------------------

## 2. 🔄 Round Robin

This is the easiest algorithm to understand.

Suppose we have:
```
A   B   C
```
Requests are distributed sequentially:
```
Request 1 → A
Request 2 → B
Request 3 → C
Request 4 → A
Request 5 → B
Request 6 → C
```
Think of it like taking turns.

### Real-world example

**Suppose an Angular application has three backend instances:**
```
                    Load Balancer
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Node-1       Node-2      Node-3
```

**100 requests approximately become:**
```
Node-1 → ~33 requests
Node-2 → ~33 requests
Node-3 → ~34 requests
When is Round Robin good?
```

**When servers are approximately identical:**
```
Server A: 8 CPU / 16 GB
Server B: 8 CPU / 16 GB
Server C: 8 CPU / 16 GB
```
and requests have relatively similar processing costs.

Problem

Imagine:
```
Request A → takes 10 seconds
Request B → takes 10 ms
```
Round Robin doesn't care.

It only says: "Your turn is next."

-------------------------------------------------

## 3. ⚖️ Weighted Round Robin

Now suppose servers have different capacities.
```
Server A → powerful → weight 3
Server B → medium   → weight 2
Server C → small    → weight 1
```
The load balancer gives more traffic to the powerful server.

Conceptually:
```
A → A → A → B → B → C → A → A → A → B → B → C
```
So over 6 requests:
```
A → 3
B → 2
C → 1
```
Approximately:
```
A = 50%
B = 33%
C = 17%
```

Why?

Because:

Server capacity
```
A ██████████
B ██████
C ███
```
We don't want to send the same amount of traffic to all three.

Interview answer
```
Weighted Round Robin is useful when backend servers have different processing capacities and we want to distribute traffic proportionally to their configured weights.
```

-------------------------------------------------

## 4. 🔐 IP Hash

Now we change the question.

Instead of: "Whose turn is it?"

we ask: "Which server should this particular client always go to?"

**Suppose:**
```
Client IP = 192.168.1.10
```

**The load balancer calculates:**
```
hash(192.168.1.10)
```
and maps the result to a server.

**For example:**
```
hash(IP) % 3
```

**might produce:**
```
0 → Server A
1 → Server B
2 → Server C
```

**So:**
```
Client 192.168.1.10
        │
        ▼
     IP Hash
        │
        ▼
    Server B
```
The same client tends to return to the same server.

### Why is this useful?

Suppose your application stores session information locally:
```
Server A
   └── User session

Server B
   └── User session

Server C
   └── User session
```
If the user keeps going to Server A, the session remains there.

This is called:
> **Session persistence / sticky sessions**

### But there is an important caveat

IP hash does not magically guarantee perfect session persistence.

If the backend server disappears:
```
Client → Server A ❌
```
the mapping may change.

Also, many users can appear behind the same public IP because of NAT/proxies.

So in modern distributed systems, it's often better to keep sessions in a shared store such as Redis rather than depend entirely on IP-based stickiness.

-------------------------------------------

## 5. 🔗 URL Hash

Here the load balancer hashes the requested URL.

**For example:**
```
/products/100
/products/200
/products/300
/images/logo.png
/videos/movie.mp4
```

**Conceptually:**
```
hash(URL) → Server
```

**Example:**
```
/products/100 → Server A
/products/200 → Server C
/products/300 → Server A
/images/logo.png → Server B
```

### Why can this be useful?

**Suppose servers have caches:**
```
Server A
  └── /products/100 cached

Server B
  └── /images/logo.png cached
```
If requests for the same URL consistently reach the same server, that server can benefit from a higher cache hit rate.

------------------------------------------------------

## 6. 🌀 Consistent Hashing

This one is extremely important for system-design interviews.

Normal hashing can create a problem when servers change.

**Suppose:**
```
A
B
C
```
and:
```
hash(key) % 3
```
maps:
```
User1 → A
User2 → B
User3 → C
```

**Now we add:**
```
D
```
The formula becomes:
```
hash(key) % 4
```
Suddenly many keys can map to different servers.

That means a large amount of data/cache ownership may need to move.

Main benefit
> **Adding or removing a server causes relatively small amounts of key redistribution compared with simple modulo hashing.**

**This is why consistent hashing is extremely useful for:**
- Distributed caches
- Distributed databases
- Sharded systems
- CDNs
- Distributed storage

------------------------------------------------------------------------------------

## 🔄 7. Dynamic Load Balancing

Now we become smarter.

Instead of blindly following a predefined pattern, the load balancer asks:

"Which server is currently in the best condition?"

**For example:**
```
Server A → 90% CPU
Server B → 30% CPU
Server C → 50% CPU
```
A dynamic algorithm can prefer:
```
Server B
```

**This is the major difference:**

| Static                        | Dynamic                      |
| ----------------------------- | ---------------------------- |
| Predefined rules              | Current system state         |
| Doesn't need live metrics     | Uses live metrics            |
| Lower overhead                | More overhead                |
| Simpler                       | More complex                 |
| May ignore overloaded servers | Can avoid overloaded servers |

-------------------------------------------------

## 8. 🔢 Least Connections

This algorithm asks:

"Which server currently has the fewest active connections?"

**Suppose:**
```
Server A → 50 connections
Server B → 20 connections
Server C → 35 connections
```

**Next request:**
```
              Load Balancer
                    │
                    ▼
              Fewest connections?
                    │
                    ▼
                 Server B
```

So:
```
Request → Server B
```

### Why is this better than Round Robin?

**Consider:**
```
Server A → 50 long-running requests
Server B → 10 short requests
Server C → 20 requests
```
Round Robin doesn't understand that A is heavily occupied.

**Least Connections does:**
```
A = 50
B = 10 ← choose
C = 20
```

**Great for**

Applications where request duration varies significantly:
```
GET /profile       → 20 ms
GET /report        → 10 seconds
GET /video         → long-lived
```

---------------------------------------------------------

## 9. ⚖️ Weighted Least Connections

**Now combine:**
```
Least Connections
        +
Server Capacity
```

**Suppose:**
```
Server A → powerful → weight 3 → 30 connections
Server B → medium   → weight 1 → 20 connections
```

**Simply comparing:**
```
20 < 30
```
might choose B.

**But relative to capacity:**
```
A: 30 / 3 = 10
B: 20 / 1 = 20
```
A is actually less loaded relative to its capacity.

So A can receive the next request.

Think of it as:
> **"Which server has the lowest load relative to its capacity?"**

This is more intelligent than basic Least Connections when machines have different capabilities.

-----------------------------------------------------------

## 10. ⚡ Least Response Time

Now we care about how quickly servers respond.

Suppose:
```
Server A → 100 ms
Server B → 20 ms
Server C → 80 ms
```
The load balancer prefers:
```
Server B
```
because it is currently responding faster.

In practice, implementations may combine response-time measurements with connection counts or other metrics rather than simply picking the server with the smallest single latency sample.

### Why is this useful?

Imagine:
```
Server A → 50 connections
Server B → 20 connections
Server C → 30 connections
```
But:
```
A → response time = 20 ms
B → response time = 200 ms
C → response time = 40 ms
```
Server B has fewer connections but is responding slowly.

A response-time-aware algorithm can avoid B.

---------------------------------------------------

## 11. 🖥️ Resource-Based / Agent-Based

This is even more sophisticated.

Each backend server runs a monitoring agent.
```
              Load Balancer
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
   Server A     Server B     Server C
      │             │            │
   Agent A       Agent B      Agent C
      │             │            │
 CPU: 80%       CPU: 20%     CPU: 40%
 RAM: 90%       RAM: 40%     RAM: 60%
```
The load balancer receives resource information and makes routing decisions.

**For example:**
```
Server A
CPU = 90%
RAM = 85%

Server B
CPU = 30%
RAM = 40%

Server C
CPU = 50%
RAM = 60%
```

**It might choose:**
```
Request → Server B
```
because B has the most available capacity.

----------------------------------------------------

## 🧠 The easiest way to remember everything

Think of the questions each algorithm asks:
```
ROUND ROBIN
"Whose turn is it?"
        ↓
A → B → C → A


WEIGHTED ROUND ROBIN
"Whose turn is it, considering capacity?"
        ↓
A gets more turns


IP HASH
"Which server belongs to this client?"
        ↓
hash(IP) → Server


URL HASH
"Which server should handle this URL?"
        ↓
hash(URL) → Server


CONSISTENT HASHING
"Which server owns this key with minimum redistribution?"
        ↓
Hash Ring


LEAST CONNECTIONS
"Who has the fewest active connections?"
        ↓
min(connections)


WEIGHTED LEAST CONNECTIONS
"Who has the lowest load relative to capacity?"
        ↓
connections + weight


LEAST RESPONSE TIME
"Who is responding fastest?"
        ↓
latency + connections


RESOURCE BASED
"Who currently has the most resources available?"
        ↓
CPU + RAM + other metrics
```

## 🎯 System Design Interview Comparison
| Algorithm                      | Decision based on      | Main use case                   |
| ------------------------------ | ---------------------- | ------------------------------- |
| **Round Robin**                | Turn                   | Identical servers               |
| **Weighted Round Robin**       | Capacity + turn        | Different server capacities     |
| **IP Hash**                    | Client IP              | Sticky sessions                 |
| **URL Hash**                   | URL                    | Cache locality                  |
| **Consistent Hashing**         | Hash ring              | Distributed cache/sharding      |
| **Least Connections**          | Active connections     | Variable request duration       |
| **Weighted Least Connections** | Connections + capacity | Heterogeneous servers           |
| **Least Response Time**        | Latency                | User-facing low-latency systems |
| **Resource Based**             | CPU/RAM/etc.           | Highly dynamic workloads        |

## 🏆 Which one would I choose?

In a system-design interview, answer based on the problem:
```
Identical servers?
       ↓
   Round Robin


Different server capacities?
       ↓
Weighted Round Robin


Need sticky client → server?
       ↓
IP Hash
(or preferably shared session storage when possible)


Need cache locality?
       ↓
URL Hash / Consistent Hashing


Request duration varies?
       ↓
Least Connections


Different server capacities + varying load?
       ↓
Weighted Least Connections


User latency is critical?
       ↓
Least Response Time


Highly variable CPU/memory workloads?
       ↓
Resource-Based
```

## 🚨 One final practical point

In modern production systems, these algorithms are often not used in isolation.

A real architecture may look more like:
```
                    Internet
                       │
                       ▼
                 CDN / WAF
                       │
                       ▼
                Load Balancer
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
           App-1     App-2    App-3
              │        │        │
              └────────┼────────┘
                       ▼
                    Redis
                       │
                       ▼
                  PostgreSQL
```
The load balancer may combine health checks + connection count + latency + weights, while application sessions are stored in a shared system such as Redis so that you don't have to depend on sticky sessions.

The key mental model is:
> **Static LB asks "What rule should I follow?"**
> **Dynamic LB asks "What is happening right now?"**




