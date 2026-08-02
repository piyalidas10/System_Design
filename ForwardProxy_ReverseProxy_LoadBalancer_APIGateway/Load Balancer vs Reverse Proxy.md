# Load Balancer vs Reverse Proxy

Load Balancer vs Reverse Proxy: System Design Explained : https://www.youtube.com/watch?v=h7_b2VPrPus

A Load Balancer is responsible for distributing incoming traffic across multiple backend servers to improve scalability, fault tolerance, and high availability. A Reverse Proxy sits in front of servers to hide the backend infrastructure, terminate SSL, cache static content, compress responses, enforce security, and route requests. In modern architectures, a reverse proxy often acts as the edge gateway, while a load balancer distributes traffic among application servers behind it.

### Why do people get confused?

Both sit between the client and your servers.
```
Client  --->  [Something]  --->  Server
```
But their main responsibilities are different.

| Load Balancer          | Reverse Proxy                        |
| ---------------------- | ------------------------------------ |
| Distributes traffic    | Protects and manages traffic         |
| Focuses on scalability | Focuses on security and optimization |

## 1. What is a Load Balancer?

A Load Balancer distributes incoming requests across multiple servers so that no single server becomes overloaded.

**Think of it like**

Imagine three billing counters at a supermarket.
```
Customer Queue
      |
      v
+----------------+
| Load Balancer  |
+----------------+
   /    |     \
  /     |      \
 S1     S2      S3
```
Instead of sending everyone to Counter 1, customers are distributed.

**Example**

1000 users visit Amazon.

Without Load Balancer
```
1000 Users
     |
     v
 Application Server
     |
 Server crashes
```
With Load Balancer
```
                 +------------+
1000 Users ----> | LoadBalancer|
                 +------------+
                  /     |      \
                 /      |       \
             App1    App2    App3
```
Each server receives around 333 requests.

**Responsibilities**
- Traffic distribution
- Health checks
- Failover
- High availability
- Scalability

### Load Balancing Algorithms

**Round Robin**
```
Req1 -> Server1
Req2 -> Server2
Req3 -> Server3
Req4 -> Server1
```

**Least Connections**
```
Server1 (40 users)

Server2 (10 users)

Server3 (15 users)

New request
      |
      v
 Server2
```

**IP Hash**
```
User A --> Server1

User A --> Server1

User A --> Server1
```
Useful for sticky sessions.

**Health Check Example**

Suppose
```
Server1 ✅

Server2 ❌

Server3 ✅
```
Load Balancer detects
```
Server2 unhealthy

↓

Stops routing traffic
```
Users never notice.

### Why use Load Balancer?

1. Scalability

Need more capacity?

Before
```
LB
 |
 +--> Server1
 |
 +--> Server2
```

After
```
LB
 |
 +--> Server1
 |
 +--> Server2
 |
 +--> Server3
 |
 +--> Server4
```

2. High Availability

If a server dies...
```
Server1 ❌

Server2 ✅

Server3 ✅
```
Traffic automatically shifts.

3. Better Performance

No server becomes overloaded.

## What is a Reverse Proxy?

A Reverse Proxy sits in front of your servers.

Clients never directly access the servers.
```
Users

   |

Reverse Proxy

   |

Application Server
```
The server is hidden.

**Think of it like a Receptionist**

Imagine visiting a company.

You don't directly enter the CEO's room.

Instead
```
Visitor

↓

Receptionist

↓

Correct Department
```
The receptionist is the Reverse Proxy.

### Reverse Proxy Architecture
```
             Internet

                 |

         Reverse Proxy

      /        |         \

 App1      App2      App3
```
The client never knows which server handled the request.

Responsibilities
- Hide backend servers
- SSL termination
- Caching
- Compression
- Authentication
- Routing
- Security
- WAF integration

### SSL Termination

**Without Reverse Proxy**
```
Client

 |

HTTPS

 |

App Server
```
Decrypt HTTPS

Every server performs encryption.

**With Reverse Proxy**
```
Client

 |

HTTPS

 |

Reverse Proxy

Decrypt

 |

HTTP

 |

Application Server
```
The application server performs less work.

### Static File Caching

Suppose users request
```
logo.png
```
Without cache
```
Client

↓

Server

↓

Disk

↓

Return image
```
Every request reaches the application.

With Reverse Proxy
```
Client

↓

Reverse Proxy Cache

↓

Image found

↓

Return immediately
```
Much faster.

### Security

Instead of exposing
```
192.168.1.20

192.168.1.21

192.168.1.22
```
Users only see
```
mywebsite.com
```
Internal infrastructure remains hidden.

## Comparism

| Feature           | Load Balancer             | Reverse Proxy                       |
| ----------------- | ------------------------- | ----------------------------------- |
| Main Goal         | Distribute traffic        | Protect and optimize servers        |
| Server Awareness  | Knows all backend servers | Usually fronts one or many services |
| Health Checks     | Yes                       | Sometimes                           |
| SSL Termination   | Can                       | Commonly                            |
| Caching           | Rare                      | Yes                                 |
| Compression       | Rare                      | Yes                                 |
| Static Files      | No                        | Yes                                 |
| Routing           | Basic                     | Advanced                            |
| Authentication    | No                        | Yes                                 |
| Hides Backend     | Partial                   | Yes                                 |
| High Availability | Primary purpose           | Secondary                           |

## Can one tool do both?

Yes.

Many modern tools support both roles.

Examples include:
- NGINX
- HAProxy
- Envoy Proxy
- Traefik

For example, NGINX can:
- Reverse Proxy
- Load Balancer
- SSL Termination
- Static File Server
- Caching
- Compression

## Modern Production Architecture
```
                    Internet
                        |
                        |
              +--------------------+
              |  Reverse Proxy     |
              |  SSL Termination   |
              |  Cache             |
              |  WAF               |
              +--------------------+
                        |
                        |
              +--------------------+
              |   Load Balancer    |
              +--------------------+
               /        |         \
              /         |          \
      +---------+ +---------+ +---------+
      | App 1   | | App 2   | | App 3   |
      +---------+ +---------+ +---------+
             \         |         /
              \        |        /
               +----------------+
               |   Database     |
               +----------------+
```

**Request Flow**

1. User sends an HTTPS request.
2. Reverse Proxy:
    - Terminates SSL
    - Applies security rules
    - Serves cached/static content if available
    - Routes the request onward
3. Load Balancer:
    - Checks server health
    - Selects the best application server
4. Application server processes the request.
5. Database returns data.
6. Response travels back through the Load Balancer and Reverse Proxy to the user.