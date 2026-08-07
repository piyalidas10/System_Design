# What if the phone and server clocks aren't exactly synchronized?
Exactly — your understanding is correct.

If the phone and server use different time values, they can calculate different OTPs. The important detail is that TOTP doesn't require their clocks to be perfectly synchronized because the server can allow a small time window.

<img src="./What if the phone and server clocks aren't exactly synchronized.png" width="90%" />

**Example**

TOTP usually uses a 30-second time step:
```
                    30-second windows

10:00:00 ───────────────────── 10:00:29
             OTP = 123456

10:00:30 ───────────────────── 10:00:59
             OTP = 789012

10:01:00 ───────────────────── 10:01:29
             OTP = 456789
```
Suppose:
```
Phone time  = 10:00:15
Server time = 10:00:15
```
Both are in the same window:
```
Phone  ──► Window 10:00:00–10:00:29 ──► 123456
Server ──► Window 10:00:00–10:00:29 ──► 123456

                         ✅ MATCH
```

## What if the clocks are different?

Suppose:
```
Phone  = 10:00:29
Server = 10:00:31
```
They are technically in different 30-second windows:
```
Phone
10:00:00 ─────────────── 10:00:29
                         │
                         ▼
                       123456


Server
10:00:30 ─────────────── 10:00:59
                         │
                         ▼
                       789012
```
So yes:
```
123456 ≠ 789012
```
A strict implementation would reject it.

## But TOTP verification usually handles this

The server can check the previous, current, and sometimes next time window.
```
              SERVER VERIFICATION

       Previous       Current        Next
          │              │             │
          ▼              ▼             ▼
       123456          789012        456789
          │              │             │
          └──────────────┼─────────────┘
                         │
                  User entered:
                     123456
                         │
                         ▼
                   Check all
                   valid windows
                         │
                         ▼
                      MATCH ✅
```
For example, with a ±1 window:
```
Current server window = 10:00:30
```
Check:
``
10:00:00 → 123456  ← previous
10:00:30 → 789012  ← current
10:01:00 → 456789  ← next
```
If the user enters 123456, the server can still accept it.

## Why this works
```
The server essentially does:

expected OTP for previous window
expected OTP for current window
expected OTP for next window
```
Then:
```
             User OTP
                │
                ▼
        ┌─────────────────┐
        │ Compare against │
        │ allowed windows │
        └────────┬────────┘
                 │
          ┌──────┴───────┐
          │              │
       MATCH           NO MATCH
          │              │
          ▼              ▼
       ACCEPT          REJECT
```
So there is still no OTP stored in the database.

The server simply performs the TOTP calculation multiple times.

## Important security trade-off

You might wonder:
```
"Why not allow ±10 minutes?"
```
Because that increases the attack window.

For example:
```
±1 window
≈ 30–90 seconds of tolerance
       ↓
Better security
```
versus:
```
±10 minutes
       ↓
Much larger attack window
       ↓
Lower security
```
So production systems generally use a small tolerance, depending on the implementation.

The key idea
> TOTP requires synchronized time, but not perfectly synchronized clocks. The server compensates for small clock differences by validating a small number of adjacent 30-second time windows.

And that's why NTP/time synchronization is important on authentication servers.
