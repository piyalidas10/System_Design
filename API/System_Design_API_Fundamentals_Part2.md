# System Design: REST API Architecture, CRUD Operations & Idempotency (Part 2)

> *A comprehensive guide to REST APIs (Representational State Transfer), HTTP Verbs, RESTful URI Design, Path vs. Query Parameters, Idempotency, and the Limitations driving modern API evolution.*

---

## 1. Why REST? (The Transition from SOAP)

In technology, **necessity is the mother of all invention**. Before REST became the de-facto standard, the enterprise world was heavily reliant on **SOAP (Simple Object Access Protocol)**.

### The Problem with Evolving Expectations
* When technology starts, initial benchmarks feel adequate (e.g., 256 MB RAM in older PCs felt blazing fast, whereas modern smartphone apps crawl without multi-gigabyte memory).
* As distributed internet traffic and mobile usage exploded, developers quickly discovered SOAP's core bottlenecks:
  1. **Slow Execution**: Heavy serialization/deserialization overhead.
  2. **Expensive Bandwidth**: Massive XML envelope sizes increased network payload costs.
  3. **High Complexity**: Rigid contracts (WSDL) and complicated tooling.
  4. **Inflexible Coupling**: Rigidly tied to XML.

```
+-----------------------------------------------------------------------------------+
|                              SOAP vs. REST EVOLUTION                              |
+-----------------------------------------------------------------------------------+
|  SOAP (Rigid & Heavy):                                                            |
|  - Inflexible: Exclusively tied to XML.                                           |
|  - Result: High bandwidth consumption, slow mobile performance.                   |
|                                                                                   |
|  REST (Flexible & Lightweight):                                                   |
|  - Format Agnostic: Supports JSON (default), XML, Plain Text, YAML, HTML.         |
|  - Lightweight JSON: Compact key-value pairs with minimal syntactic overhead.     |
|  - Result: Fast data transmission, developer-friendly, powers ~90% of web APIs.   |
+-----------------------------------------------------------------------------------+
```

---

## 2. What is REST? (Representational State Transfer)

**REST** stands for **Representational State Transfer**. 

At its core, REST models an application as a collection of **Resources** whose **state representations** are transferred across different tiers of a system.

### The Lifecycle of State Representation

Consider a multi-tier web application requesting a report/chart:

```
+-----------------------------------------------------------------------------------+
|                 REPRESENTATIONAL STATE TRANSFER: TIER BY TIER                     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   1. Storage Tier (Disk):                                                         |
|      [ 010101010101 ]  -> Raw Binary Bits on Physical Disk                        |
|             |                                                                     |
|             v                                                                     |
|   2. Database Tier (RDBMS / MySQL / Oracle):                                      |
|      [ Tabular Rows & Columns ]  -> Relational Table Representation               |
|             |                                                                     |
|             v                                                                     |
|   3. Backend Application Tier (Java / Python / Go):                               |
|      [ In-Memory Domain Objects ] -> Java Class / Object Graph Representation     |
|             |                                                                     |
|             v                                                                     |
|   4. Network / Transport Tier:                                                    |
|      [ Serialized JSON Payload ]  -> Lightweight Text Representation              |
|             |                                                                     |
|             v                                                                     |
|   5. Frontend Client Tier (Browser / Mobile UI):                                  |
|      [ Rendered Visual Charts & Tables ] -> Visual UI Representation              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

> **Definition**: The underlying business data (State) remains constant, but as it traverses from the storage disk to the user's browser, its **Representation** is continually **Transferred** and transformed.

---

## 3. Core Architectural Pillars of REST

```
                      +-----------------------------+
                      |     Core Pillars of REST    |
                      +-----------------------------+
                                     |
    +--------------------------------+--------------------------------+
    |                                |                                |
    v                                v                                v
1. Resource-Centric            2. Built on HTTP              3. Native Statelessness
  (Entities as Nouns)       (Leverages Standard Verbs)        (Horizontal Scalability)
```

1. **Resource-Centric**:
   * Everything in REST is modeled as a **Resource** (e.g., Users, Movies, Bookings, Orders).
   * Resources are treated as **Nouns**, not verbs.
2. **Built on Top of HTTP**:
   * REST leverages the existing infrastructure and specifications of HTTP/HTTPS for transport, caching, headers, and status codes.
3. **Stateless by Design**:
   * Because HTTP is stateless, REST APIs inherit native **statelessness**.
   * No session state is pinned to server memory; any server behind a load balancer can handle any request, enabling **effortless horizontal scaling**.

---

## 4. RESTful URIs (Addressing Resources)

A **URI (Uniform Resource Identifier)** provides the absolute, unambiguous address of a resource in a distributed system.

### Analogy: Physical Human Address vs. Digital Resource Address

```
+-----------------------------------------------------------------------------------+
|                              ABSOLUTE ADDRESSING                                  |
+-----------------------------------------------------------------------------------+
|  Physical World:                                                                  |
|  Earth -> Asia -> India -> Karnataka -> Bangalore -> Sun City -> House #10       |
|                                                                                   |
|  Digital API World:                                                               |
|  Host IP (121.0.4.9) -> Port (8080) -> App Context (/mba) -> Resource (/movies)   |
+-----------------------------------------------------------------------------------+
```

### URI vs. URL
* **URL (Uniform Resource Locator)**: Common colloquial term used when navigating web pages inside a browser.
* **URI (Uniform Resource Identifier)**: Formal technical term used in API contracts to pinpoint unique digital data entities.

---

## 5. CRUD Operations & HTTP Verbs

In software applications, data operations primarily fall under **CRUD (Create, Read, Update, Delete)**. REST maps these cleanly to **HTTP Verbs**:

```
+-----------------------------------------------------------------------------+
|                          CRUD TO HTTP VERB MAPPING                          |
+-------------------+---------------------+-----------------------------------+
| CRUD Operation    | HTTP Verb           | Primary Purpose                   |
+-------------------+---------------------+-----------------------------------+
| **Create**        | `POST`              | Create a new resource             |
| **Read**          | `GET`               | Fetch existing resource(s)        |
| **Update**        | `PUT` / `PATCH`     | Replace / Modify a resource       |
| **Delete**        | `DELETE`            | Remove a resource                 |
+-------------------+---------------------+-----------------------------------+
```

---

## 6. Anatomy of RESTful Endpoint Design

A complete RESTful API call combines the **HTTP Verb (The Action)** and the **URI (The Address)**:

$$\text{RESTful API} = \text{HTTP Verb (Action)} + \text{URI (Resource Address)}$$

### Real-World Example: Movie Booking Application (`MBA`)
* **Host IP**: `121.1.1.9`
* **Port**: `8080`
* **Application Context**: `mba`
* **Resource**: `movies`

```
  POST   http://121.1.1.9:8080/mba/movies
  ^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 [Verb]             [URI]
```

---

### 6.1 Creating a Resource (`POST`)
* **Operation**: Add a new movie record to the catalog.
* **Method**: `POST`
* **URI**: `http://121.1.1.9:8080/mba/movies`
* **Payload**: JSON body containing movie attributes (Title, Genre, Runtime).

---

### 6.2 Reading Resources (`GET`)

There are three common variations of read requests:

```
+-------------------------------------------------------------------------------------------+
|                                    GET REQUEST VARIATIONS                                 |
+-------------------------------------------------------------------------------------------+
| 1. Fetch All (Collection):                                                                |
|    GET /mba/movies                                                                        |
|    -> Returns list of all movies in the system.                                           |
|                                                                                           |
| 2. Fetch Specific by ID (Path Parameter):                                                 |
|    GET /mba/movies/{id}  ===>  GET /mba/movies/5                                          |
|    -> Uses a parameterized variable inside the URL path to identify an exact item.       |
|                                                                                           |
| 3. Filtered Search (Query Parameter):                                                     |
|    GET /mba/movies?actor=ShahRukh&language=Hindi                                          |
|    -> Appends key-value criteria after '?' to filter, sort, or paginate results.          |
+-------------------------------------------------------------------------------------------+
```

---

### 6.3 Updating a Resource (`PUT`)
* **Operation**: Update movie details for Movie ID = 5.
* **Method**: `PUT`
* **URI**: `http://121.1.1.9:8080/mba/movies/5`
* **Payload**: JSON body with updated attributes.

---

### 6.4 Deleting a Resource (`DELETE`)
* **Operation**: Delete movie record with Movie ID = 5.
* **Method**: `DELETE`
* **URI**: `http://121.1.1.9:8080/mba/movies/5`

---

## 7. Two Golden Rules of RESTful URI Design

When designing industry-standard REST APIs, strict conventions apply:

```
+-----------------------------------------------------------------------------+
|                     GOLDEN RULES OF RESTFUL URI DESIGN                      |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Rule 1: Resources MUST be Nouns & Plural                                  |
|  [CORRECT]    /movies, /users, /orders, /products                           |
|  [INCORRECT]  /movie, /user, /order, /product                               |
|                                                                             |
|  Rule 2: NO Verbs in the URI Path                                           |
|  [CORRECT]    POST   /movies          (Action defined by HTTP Verb)        |
|  [INCORRECT]  GET    /createMovie     (Mixing verb into URI)               |
|  [INCORRECT]  POST   /deleteMovie/5   (Redundant verb in path)             |
|                                                                             |
|  Formatting Standard:                                                       |
|  - URIs are technically case-insensitive, but lowercase is universal rule.  |
|  - Use hyphens for multi-word resources (e.g., /movie-tickets).             |
+-----------------------------------------------------------------------------+
```

---

## 8. Practical Exercise: Vehicle Management System (`VMS`)

### Problem Specification:
* **Host IP**: `121.9.8.7`
* **Port**: `7070`
* **Application**: `vms`
* **Version**: `v1`
* **Resource**: `vehicles`

### Solution API Contract:

| Operation | HTTP Verb | RESTful URI | Description |
| :--- | :--- | :--- | :--- |
| **Create** | `POST` | `http://121.9.8.7:7070/vms/v1/vehicles` | Adds a new vehicle record |
| **Read All** | `GET` | `http://121.9.8.7:7070/vms/v1/vehicles` | Retrieves all registered vehicles |
| **Read by ID** | `GET` | `http://121.9.8.7:7070/vms/v1/vehicles/{id}` | Retrieves vehicle with specific `{id}` |
| **Search/Filter** | `GET` | `http://121.9.8.7:7070/vms/v1/vehicles?type=sedan` | Filters vehicles by query parameter |
| **Update** | `PUT` | `http://121.9.8.7:7070/vms/v1/vehicles/{id}` | Updates details for vehicle `{id}` |
| **Delete** | `DELETE` | `http://121.9.8.7:7070/vms/v1/vehicles/{id}` | Removes vehicle `{id}` from database |

---

## 9. Idempotency in REST APIs

A critical architectural concept tested in senior engineering and system design interviews is **API Idempotency**.

### Definition
> An API operation is **Idempotent** if making the same request **once ($1$)** or **multiple times ($N$ times)** produces the **exact same server state** and **no unintended side effects**.

$$f(f(x)) = f(x)$$

```
+---------------------------------------------------------------------------------------+
|                             IDEMPOTENCY OF HTTP VERBS                                 |
+-----------+----------------+----------------------------------------------------------+
| HTTP Verb | Idempotent?    | Architectural Reasoning                                  |
+-----------+----------------+----------------------------------------------------------+
| `GET`     | **YES**        | Read-only operation. Calling it 1,000 times changes zero |
|           |                | server state.                                            |
+-----------+----------------+----------------------------------------------------------+
| `PUT`     | **YES**        | Overwrites the target state with the supplied payload.   |
|           |                | Re-updating `name = "John"` 100 times leaves `name` as   |
|           |                | `"John"`. Final state is identical.                      |
+-----------+----------------+----------------------------------------------------------+
| `DELETE`  | **YES**        | The 1st call deletes the resource. Subsequent calls find |
|           |                | it already gone (404), but no new deletion or side-effect|
|           |                | occurs. Final state is identical.                        |
+-----------+----------------+----------------------------------------------------------+
| `POST`    | **NO**         | Creates a new resource on every invocation. Calling it   |
|           |                | 5 times creates 5 separate database records.             |
+-----------+----------------+----------------------------------------------------------+
```

---

### The Real-World Double-Click Payment Problem

```
+-----------------------------------------------------------------------------------+
|                       NON-IDEMPOTENT POST PAYMENT FLOW                            |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   User Clicks "Pay Now" ($100)                                                    |
|                                                                                   |
|   [ Client App ] --- POST /api/v1/payments (Click 1) ---> [ Payment Gateway ]     |
|   [ Client App ] --- POST /api/v1/payments (Click 2) ---> [ Payment Gateway ]     |
|   [ Client App ] --- POST /api/v1/payments (Click 3) ---> [ Payment Gateway ]     |
|                                                                                   |
|   Result without Idempotency handling:                                            |
|   -> 3 distinct charges of $100 ($300 deducted for a single transaction!)         |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

#### How Systems Handle Payment Idempotency:
* Payment systems solve this using an **Idempotency Key / Request Token**:
  1. The client generates a unique UUID (e.g., `Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`) before sending the request.
  2. The server stores this key in an in-memory cache (like Redis) during processing.
  3. If duplicate `POST` requests arrive with the same Idempotency Key, the server rejects duplicates or returns the cached response of the first transaction rather than processing another deduction.

---

## 10. Modern Limitations of REST (The Next Frontier)

While REST powers ~90% of current software architectures, massive scale and high-frequency microservice topologies have revealed new constraints:

```
+-----------------------------------------------------------------------------------+
|                            MODERN CHALLENGES WITH REST                            |
+-----------------------------------------------------------------------------------+
| 1. High Latency & Overhead   | JSON over HTTP/1.1 requires repetitive text         |
|                              | parsing, bulky headers, and uncompressed payloads. |
|                                                                                   |
| 2. Over-Fetching &           | REST returns fixed schema payloads. Mobile clients |
|    Under-Fetching            | often receive unnecessary fields or must make      |
|                              | multiple round-trip calls for related entities.    |
|                                                                                   |
| 3. Rigidity of CRUD          | Pure resource modeling does not cleanly map to     |
|    Resource Model            | remote procedure calls, event streams, or complex  |
|                              | transactional workflows.                           |
+-----------------------------------------------------------------------------------+
```

### The Industry Shift:
* **GraphQL** emerged to solve over-fetching and under-fetching on client-to-server networks.
* **gRPC** (HTTP/2 + Protocol Buffers) emerged across Big Tech (Google, Netflix, Microsoft, LinkedIn) for high-performance internal microservice communication.

---

## 11. Quick Summary Cheat Sheet

| Feature | Key Rule / Principle |
| :--- | :--- |
| **REST Paradigm** | Resource-centric, representation of state transferred across architectural tiers |
| **Data Format** | Predominantly JSON (compact, lightweight, flexible) |
| **Transport** | Built natively on HTTP/HTTPS; inherently stateless |
| **URI Naming** | Nouns only, pluralized (`/vehicles`, `/movies`), no verbs in path |
| **Read Operations** | `GET` with Path Params (`/movies/{id}`) or Query Params (`/movies?actor=SRK`) |
| **Write Operations** | `POST` (Create), `PUT` (Update), `DELETE` (Remove) |
| **Idempotent Verbs** | `GET`, `PUT`, `DELETE` |
| **Non-Idempotent Verbs** | `POST` (Requires Idempotency Keys for critical operations like billing) |
