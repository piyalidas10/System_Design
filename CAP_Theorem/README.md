# CAP Theorem
The CAP Theorem in DBMS : https://www.geeksforgeeks.org/dbms/the-cap-theorem-in-dbms/

The CAP Theorem states that a distributed data store can simultaneously provide at most two out of three guarantees: 
Consistency, Availability, and Partition Tolerance. 
Because physical networks inevitably experience disruptions, a distributed system must prioritize Partition Tolerance, 
forcing engineers to choose between Consistency (CP) or Availability (AP) during a network split.

## The Three Core Components
1. **Consistency (C):** Every read request receives the most recent write or an error.
2. **Availability (A):** Every non-failing node returns a non-error response without guaranteeing the latest data.
3. **Partition Tolerance (P):** The system continues operating despite network communication drops or delayed messages.

### Consistency (C)
Consistency means that all the nodes (databases) inside a network will have the same copies of a replicated data item visible for various transactions. 
It guarantees that every node in a distributed cluster returns the same, most recent, and successful write. 
It refers to every client having the same view of the data. There are various types of consistency models.
<img src="https://media.geeksforgeeks.org/wp-content/uploads/20260626172658317060/consistent.webp" width="90%" />

Example: A user checks his account balance and knows that he has 500 rupees. He spends 200 rupees on some products. 
Hence the amount of 200 must be deducted, changing his account balance to 300 rupees.
- Both DB1 and DB2 show the same balance of 500.
- After spending 200, DB1 shows 300 and DB2 still shows 500.
- All replicas should reflect the same updated data.

### Availability (A)
Every request received by a non-failing node must receive a response, even if the response contains outdated data.
The key word here is "every". In simple terms, every node (on either side of a network partition) must be able to respond in a reasonable amount of time.

<img src="https://media.geeksforgeeks.org/wp-content/uploads/20260626173335775306/available.webp" width="90%" />

**Example:** User A is a content creator having 1000 other users subscribed to his channel. 
Another user B who is far away from user A tries to subscribe to user A's channel.
- User B can subscribe to User A's channel even if updates are not immediately synchronized.
- Available: The subscription succeeds, updating the count from 1000 to 1001.
- Not Available: The subscription request fails, so the count remains 1000.
- If the system rejects the write request to preserve consistency, it sacrifices availability.

### Partition Tolerance
Partition tolerance means that the system can continue operating even if the network connecting the nodes has a fault that results in two or more partitions, 
where the nodes in each partition can only communicate among each other. The system continues operating despite network failures. 
Whether it chooses consistency or availability depends on its design (CP or AP). 
Network partitions are a fact of life. Distributed systems guaranteeing partition tolerance can gracefully recover from partitions once the partition heals. 

<img src="https://media.geeksforgeeks.org/wp-content/uploads/20260626173405366095/partition_tolerant.webp" width="100%" />

Example: Take the example of the same social media network where two users are trying to find the subscriber count of a particular channel. Due to some technical fault, a network outage occurs.
- A network partition breaks the communication between the primary database (DB1) and its replica (DB2).
- User 2 accesses the last replicated data (1000 subscribers) stored in DB2.
- Both databases continue operating independently, ensuring Partition Tolerance.

> The CAP theorem states that distributed databases can have at most two of the three properties:
> consistency, availability, and partition tolerance. As a result, database systems prioritize only two properties at a time.

## Understanding CAP Theorem Through an Example
Imagine you're running a website with two servers - one in the USA and one in Europe. When a user updates their public profile (let's say their display name), here's what happens:
1. User A connects to their closest server (USA) and updates their name
2. This update is replicated to the server in Europe
3. When User B in Europe views User A's profile, they see the updated name

<img src="https://www.hellointerview.com/_next/static/media/kDCiksyGIusv.1b9ceu0wl0-ni.svg?dpl=5b25195c9dfe88b0297302a89931206ea083bf65" width="70%" />

Everything works smoothly until we encounter a network partition - the connection between our USA and Europe servers goes down. Now we have a critical decision to make:

When User B tries to view User A's profile, should we:
- Option A: Return an error because we can't guarantee the data is up-to-date (choosing consistency)
- Option B: Show potentially stale data (choosing availability)

<img src="https://www.hellointerview.com/_next/static/media/ui_Mdimd0FfA.29o8_fa8_bcar.svg?dpl=5b25195c9dfe88b0297302a89931206ea083bf65" width="70%" />

This is where CAP theorem becomes practical - we must choose between consistency and availability.

In the case, the answer is rather clear: we would rather show a user in Europe the old name of User A, rather than show an error. Seeing a stale name is better than seeing no name at all.


## is Ticket booking system a example of CA system (Consistency + Availability) ?
A ticket booking system is not a CA (Consistency + Availability) system in a distributed environment. 
It is a classic CP (Consistency + Partition Tolerance) system. 
Because modern ticket apps run on distributed servers, they must handle network breaks (Partition Tolerance). 

For ticket booking, consistency is the highest priority because the same seat must never be sold to multiple customers. 
If the system cannot verify the latest seat status due to a network partition, 
it may temporarily reject or delay booking requests instead of risking double booking. In other words, 
it sacrifices availability to preserve strong consistency.

Therefore, the seat reservation component of a distributed ticket booking system is best classified as a CP system, while other components such as search, recommendations, or analytics may prioritize availability and use eventual consistency.

To prevent double-booking the same seat, they prioritize strict data accuracy over uptime, 
meaning they sacrifice availability during a network split rather than show stale seat data.

> "Ticket booking system is a CA system" is only correct for a centralized system. In modern distributed systems, the seat booking component is generally designed as a CP system rather than a CA system.

- **Traditional centralized ticket booking system (single database):** Yes, it can be considered CA because there is no network partition (P) to worry about under the CAP theorem.
- **Distributed ticket booking system:** No. Under CAP, during a network partition, you cannot guarantee both consistency and availability simultaneously.

**Why consistency is critical**  
Imagine there is only one seat left.  
```
Seat A1 = Available

User 1 --------------------> Book A1
User 2 --------------------> Book A1
```
If the system prioritizes availability, both requests might be accepted temporarily, resulting in:
```
User 1 → Booking Confirmed ✅
User 2 → Booking Confirmed ✅   ❌ Double booking!
```
This is unacceptable.

Instead, a consistent system ensures:
```
Seat A1 = Available

Transaction Lock

User 1 → Success ✅
Seat A1 = Booked

User 2 → Seat Already Booked ❌
```
Only one booking succeeds.

In a distributed environment

Suppose the booking service is running in two data centers.

           Network Partition
      -------------------------
      |                       |
  Data Center A          Data Center B

If communication between them is lost:

**Choose Consistency (CP)**
- **No Double-Booking**: No duplicate seat bookings. Preventing two people from buying the same ticket requires strict consistency across all database nodes.
- **Handling Failures**: Reject bookings that cannot be safely verified. If a network partition occurs between servers, the system will reject booking requests or throw an error rather than risk selling an already-taken seat.
- **Sacrificing Availability**: Users may see "Service temporarily unavailable." Refusing a transaction to protect data accuracy means the system gives up full availability during the fault.

**Choose Availability (AP)**
- Continue accepting bookings independently.
- Later, both centers may have sold the same seat.
- Requires conflict resolution and customer compensation.

For airlines, railways, and movie theaters, double-selling seats is usually worse than temporary unavailability, 
so booking systems generally favor Consistency for seat allocation.

> A ticket booking system prioritizes strong consistency for seat reservation to prevent double booking.
> In a centralized deployment, it can be viewed as a CA system because CAP's partition constraint doesn't apply.
> However, in a distributed system, CAP theorem requires a trade-off during network partitions,
> so ticket booking systems typically behave as CP systems for seat allocation while allowing other components,
> such as search and recommendations, to prioritize availability.

