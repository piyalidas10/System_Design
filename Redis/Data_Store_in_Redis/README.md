# What data we can store inside Redis ?
Redis is an in-memory key-value data store, so you should store data that is:

Frequently accessed
Temporary or can be regenerated
Needed for very fast reads/writes (microseconds to milliseconds)

Think of Redis as your application's high-speed memory, while your database is the permanent storage.

## 1. Cache Data (Most Common)

Instead of repeatedly querying the database, cache the result.

**Database**
```
SELECT * FROM products WHERE id = 101;
```

**Redis**
```
Key:
product:101

Value:
{
  "id":101,
  "name":"iPhone 16",
  "price":79999,
  "stock":10
}
```

**Workflow:**
```
Client
   |
Application
   |
Redis
   |
Found?
  |
Yes -> Return immediately

No
 |
Database
 |
Save in Redis
 |
Return to client
```

## 2. User Sessions

Instead of storing sessions in memory of your application server.
```
Key:
session:abc123

Value:
{
   "userId":55,
   "name":"John",
   "role":"Admin",
   "loginTime":"10:30"
}
```
Every application server can access the same session.
```
App Server 1
      \
       \
        Redis
       /
App Server 2
```

## 3. Authentication Tokens

JWT Blacklist
```
Key:
blacklist:jwt_token

Value:
true
```
Refresh Tokens
```
Key:
refresh:123

Value:
{
   userId:45,
   expires:2 days
}
```

## 4. Shopping Cart

Instead of writing every cart update to the database.
```
cart:1001

{
   Laptop : 1,
   Mouse : 2,
   Keyboard : 1
}
```
Every click updates Redis instantly.

Checkout:
```
Redis Cart
      |
Checkout
      |
Database Order
```

## 5. API Rate Limiting

Redis is perfect because counters are extremely fast.
```
Key:
user:45:api

Value:
135 requests
```
After one minute:

Automatically expires.

## 6. OTP / Verification Codes
```
Key:
otp:9876543210

Value:
462981
```
TTL = 5 minutes.

After 5 minutes:

Automatically deleted.

## 7. Password Reset Tokens
```
reset:token123

UserID = 45

TTL = 10 minutes
```

## 8. Frequently Viewed Products
```
popular-products

[
101,
202,
505,
110
]
```

## 9. Leaderboards (Gaming)

Redis Sorted Sets are made for this.
```
Player      Score

Alice       9800
Bob         8500
John        7200
```
Top 10 players are returned instantly.

## 10. Live Chat

Unread messages
```
chat:user45

Message1
Message2
Message3
```

## 11. Notifications
```
notification:45

[
 "Order shipped",
 "Payment received",
 "Discount available"
]
```

## 12. Real-Time Analytics
```
Today's Visitors

24567
```
Updated every page view.

## 13. Inventory Counters
```
product:101:stock

10
```
Every purchase:
```
10 -> 9 -> 8 -> 7
```
Redis supports atomic decrement, preventing race conditions.

## 14. Queue (Background Jobs)
```
email_queue

Send Welcome Email
Send Invoice
Generate Report
```
Workers consume jobs.

## 15. Pub/Sub Messages

Publisher
```
Order Created

↓

Redis Channel

↓

Subscribers
```
Notification Service
Inventory Service
Analytics Service

## 16. Distributed Locks
```
lock:order:123

Server A
```
Other servers wait until the lock is released.

Useful to prevent duplicate processing.

## 17. Search Suggestions
```
search:iphone

[
iphone16,
iphone15,
iphone charger
]
```

## 18. Feature Flags
```
feature:new-payment

true
```
Application reads it instantly.

## 19. User Preferences
```
user:55:settings

{
 theme:"dark",
 language:"English",
 currency:"USD"
}
```

## 20. Temporary Reports

Generating reports may take minutes.

Store the generated report temporarily.
```
report:567
```
PDF Location

Expires after one day.
