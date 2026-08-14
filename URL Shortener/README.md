# URL Shortener

**System Design - Part 13 | Design a URL Shortener | 2 Methods** : https://www.youtube.com/watch?v=vKAZ16P4kdg

## For example:
```
https://www.example.com/products/electronics/mobile-phones/samsung/galaxy-s25?campaign=summer-sale&user=12345
```
can become:
```
https://short.ly/aB92xK
```
When someone opens the short URL, the system finds the original URL and redirects the user.

## Why do we need URL shortening?

There are several practical reasons:

1. Easy sharing
- Short URLs are much easier to copy, paste, send in messages, emails, etc.
2. Better readability
- Instead of exposing a huge URL with many parameters, users see something compact.
3. Storage optimization
- If an application generates billions of URLs, storing the full URLs can consume significant database/storage capacity.
- The system can store a short identifier such as aB92xK along with the original URL.
4. Faster lookup
- The short key can act as an efficient lookup key:
aB92xK → original_long_url
5. Analytics
- A URL shortener can track:
- Number of clicks
- Geographic location
- Device/browser
- Referrer
- Timestamp
6. Centralized redirect management
- The original URL can change while the short URL remains the same.

## 🏗️ Basic System Design
```
                CREATE SHORT URL
                       │
                       ▼
              ┌─────────────────┐
              │   URL Shortener │
              │     Service     │
              └────────┬────────┘
                       │
             Generate Short ID
                       │
                       ▼
              ┌─────────────────┐
              │    Database     │
              │                 │
              │ aB92xK → Long URL
              └─────────────────┘


                USER CLICKS
              https://s.io/aB92xK
                       │
                       ▼
              ┌─────────────────┐
              │   URL Shortener │
              │     Service     │
              └────────┬────────┘
                       │
                  Lookup aB92xK
                       │
                       ▼
              ┌─────────────────┐
              │    Database     │
              └────────┬────────┘
                       │
                  Original URL
                       │
                       ▼
                 HTTP 301/302
                  Redirect
                       │
                       ▼
                Original Website
```

## Exactly — this is the real system-design problem behind a URL shortener.

A production-grade design can be thought of as:
```
                    ┌─────────────────────┐
                    │       Clients       │
                    │ Browser / Mobile    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    CDN / Edge       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Load Balancer    │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
          ┌──────────┐   ┌──────────┐   ┌──────────┐
          │ URL API  │   │ URL API  │   │ URL API  │
          │ Server 1 │   │ Server 2 │   │ Server N │
          └────┬─────┘   └────┬─────┘   └────┬─────┘
               │              │              │
               └──────────────┼──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │      Redis        │
                    │  Short → Long URL │
                    └─────────┬─────────┘
                              │ Cache Miss
                              ▼
                    ┌────────────────────┐
                    │ Distributed DB     │
                    │                    │
                    │ short_id → URL     │
                    └────────────────────┘
```




