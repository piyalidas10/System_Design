# Geo Sharding
Geo sharding distributes data based on geographic location, such as country or region, so that users access data from a nearby database. It primarily helps reduce network latency, isolate regional traffic, and support data-residency requirements.

> Important: Geo sharding is still database sharding. The difference is simply that the shard key is geographic rather than something like user_id or a hash value.

<img src="./Geo_Sharding.png"  width="75%" />

Geo sharding is a database sharding strategy where data is distributed based on the geographical location of the user or business.

Instead of deciding the shard using something like user_id, we use a geographic attribute such as:
- Country
- Region
- State
- City
- Continent
- Example

Suppose we have a global application with users from India, Europe, and the USA.

Instead of one huge database:
```
                  Application
                       |
                       v
                Single Database
        +---------------------------+
        | India                     |
        | Europe                    |
        | USA                       |
        | Australia                 |
        | ...                       |
        +---------------------------+
```

We can use Geo Sharding:
```
                       Application
                            |
                       Geo Router
                            |
          +-----------------+-----------------+
          |                 |                 |
          v                 v                 v
     India Shard       Europe Shard        USA Shard
     PostgreSQL        PostgreSQL          PostgreSQL
How does it decide the shard?
```

For example:
```
user.country = "IN"
        |
        v
   India Shard

user.country = "US"
        |
        v
   USA Shard

user.country = "DE"
        |
        v
   Europe Shard
```
So a user from India primarily interacts with the India shard.

## Geo Sharding in one picture
```
                         GLOBAL APPLICATION
                                |
                           Geo Router
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
   🇮🇳 INDIA                🇪🇺 EUROPE               🇺🇸 USA
        |                       |                       |
        v                       v                       v
   India DB                Europe DB                USA DB
        |                       |                       |
   Indian Users            EU Users              US Users
```

## Why is Geo Sharding useful?
### 1. Lower latency

This is one of the biggest advantages.

Suppose your user is in India.

**Without geo sharding:**
```
India User
    |
    |  Internet
    v
USA Database
    |
    v
Response
```
There is significant network distance.

**With geo sharding:**
```
India User
    |
    v
India Application
    |
    v
India Database
```
The database is geographically closer, reducing network latency.

### 2. Data residency

Some applications need to keep user data within a particular geographic region because of data residency or regulatory requirements.

**For example:**
```
India users
     |
     v
India Database

EU users
     |
     v
EU Database
```
This can help organizations design systems where regional data remains within the appropriate jurisdiction.

### 3. Regional traffic isolation

**Imagine a global e-commerce application:**
```
                    Global Application
                           |
              +------------+------------+
              |            |            |
              v            v            v
           India        Europe         USA
           40%          30%             30%
              |            |             |
              v            v             v
         DB India      DB Europe     DB USA
```
A traffic spike in India doesn't necessarily overload the European or US databases.

**For example, during an Indian festival sale:**
```
India traffic
     |
     v
India Shard
     |
  HIGH LOAD

Europe Shard  <-- unaffected
USA Shard     <-- unaffected
```

## Geo Sharding vs Normal Sharding

This distinction is important for interviews.

**Normal sharding**

Data is distributed using a shard key.

Example:
```
user_id
   |
   v
Hash(user_id)
   |
   +----> Shard 1
   +----> Shard 2
   +----> Shard 3
```
Users can be distributed across shards regardless of geography.
```
Shard 1
---------
India user
USA user
Germany user
India user
```

**Geo sharding**

The shard key is based on location.
```
country
   |
   +----> IN --> India Shard
   +----> US --> USA Shard
   +----> DE --> Europe Shard
```

So:

| Normal Sharding                           | Geo Sharding                        |
| ----------------------------------------- | ----------------------------------- |
| Usually `user_id`, hash, range, etc.      | Geographic location                 |
| Focuses on distributing load/data         | Focuses on locality                 |
| Users may be distributed globally         | Users stay near their region        |
| Can reduce database load                  | Can reduce network latency          |
| Doesn't inherently provide data residency | Can support regional data residency |

## Example: Netflix-like application

**Imagine users are distributed globally:**
```
                         Global Users
                              |
                         Geo Router
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
           Asia            Europe           America
             |                |                |
             v                v                v
        Asia DB          Europe DB        America DB
```

**A user from Kolkata:**
```
Kolkata User
     |
     v
Asia Region
     |
     v
Asia Database

A user from Germany:

Germany User
     |
     v
Europe Region
     |
     v
Europe Database
```
This is the basic idea behind geo-distributed data architecture.

## ⚠️ The major challenge: users can move

**Suppose a user originally lives in India:**
```
user_id = 101
country = IN

        ↓

India Shard
```
Then the user moves to the USA.

**Should we move all of their data?**
```
India Shard
     |
     | migrate user data
     v
USA Shard
```

This introduces complexity around:
- Data migration
- Consistency
- Cross-region replication
- User profile changes
- Transactions
- Failover
- Backups

Therefore, you need to carefully define what determines a user's home region.

## ⚠️ Cross-region queries can be expensive

Suppose an Indian user wants to see an order that was created while they lived in the USA.

Now the application may need:
```
India Application
       |
       +------> India DB
       |
       +------> USA DB
                    |
                 Order

This creates a cross-shard/cross-region query.
```
That's why a good geo-sharded system tries to keep most operations within one region.