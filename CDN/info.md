# Content Delivery Networks (CDNs)

## Introduction

Every modern website aims to deliver content to users as quickly as possible, regardless of where they are located. Whether someone is accessing a website from New Delhi, New York, London, or Sydney, users expect pages to load almost instantly.

One of the most important technologies that makes this possible is the **Content Delivery Network (CDN)**.

Many developers understand that CDNs cache static content, but often struggle with practical questions such as:

* What exactly should be cached?
* What should never be cached?
* Can dynamic content also be cached?
* How do CDNs keep cached files up to date?
* How do CDNs improve both performance and security?

This article explains these concepts from first principles.

---

# Why Do We Need a CDN?

Imagine your application's origin server is located in **Mumbai, India**.

Now consider two users:

* User A is in Delhi.
* User B is in the United States.

Both request the same website.

Although both requests reach the same server, the physical distance traveled by data is very different.

A request from Delhi reaches Mumbai much faster than one originating from the United States.

Longer distances introduce:

* Higher network latency
* More intermediate routers
* Additional processing delays
* Increased round-trip time (RTT)

A page that loads in approximately 30 milliseconds for a nearby user may take around 200 milliseconds—or more—for someone on another continent.

The problem becomes even more noticeable because loading a webpage involves multiple requests.

---

# One Page Requires Multiple Requests

When a browser loads a webpage, it does not retrieve everything in a single request.

The process typically looks like this:

1. Request the HTML document.
2. Parse the HTML.
3. Discover CSS files.
4. Download CSS.
5. Discover JavaScript files.
6. Download JavaScript.
7. Download images.
8. Download fonts.
9. Download videos or other media.

Each network request adds additional latency.

For users located far from the origin server, these delays accumulate and significantly affect page load performance.

---

# A Simple Solution... and Its Problem

One possible solution would be deploying servers in every country.

For example:

* Mumbai
* Singapore
* London
* Frankfurt
* New York
* Tokyo
* Sydney

While this would reduce latency, it introduces enormous infrastructure costs.

Organizations would need to:

* Purchase servers
* Maintain hardware
* Configure networking
* Handle redundancy
* Perform updates
* Monitor availability

Operating global infrastructure independently is expensive.

---

# Enter the Content Delivery Network (CDN)

Instead of building worldwide infrastructure yourself, you can use a CDN provider.

Popular CDN providers include:

* Amazon CloudFront
* Cloudflare
* Akamai

These companies already operate thousands of servers distributed across the globe.

Rather than contacting your origin server directly, users first connect to the nearest CDN edge server.

---

# How a CDN Works

Suppose a user in the United States visits your website for the first time.

### First Request (Cache Miss)

1. User requests the webpage.
2. Request reaches the nearest CDN server.
3. CDN checks whether the requested file is already cached.
4. Since this is the first request, the cache is empty.
5. CDN forwards the request to the origin server.
6. Origin server returns the requested content.
7. CDN sends the content back to the user.
8. CDN stores a copy locally.

This is called a **Cache Miss**.

---

### Subsequent Requests (Cache Hit)

When another user from the same region requests the same resource:

1. Request reaches the nearby CDN.
2. CDN already has the cached copy.
3. The content is served immediately.

The origin server is no longer involved.

This is known as a **Cache Hit**.

The result is:

* Lower latency
* Faster page loads
* Reduced server load
* Better scalability

---

# What Should Be Cached?

A useful rule of thumb is:

> Cache content that is identical for the majority of users.

Examples include:

* HTML (in some situations)
* CSS
* JavaScript bundles
* Images
* Fonts
* Videos
* Logos
* Public documentation
* Product images
* Static assets

These resources are the same regardless of who visits the website.

---

# What Should Not Be Cached?

Personalized or user-specific information should generally not be cached globally.

Examples include:

* User profiles
* Dashboard information
* Account settings
* Shopping cart contents
* Personalized recommendations
* User-written code
* Private messages
* Personal statistics

Each user sees different data, making these responses dynamic.

Fetching them directly from the origin server ensures correctness and privacy.

---

# Static vs Dynamic Content

Many developers assume that only static content can be cached.

The reality is more nuanced.

Instead of asking:

> Is this static?

Ask:

> Is this response identical for most users?

If the answer is yes, it is an excellent CDN candidate.

If the response varies significantly per user, avoid caching it globally.

---

# Keeping Cached Files Updated

Suppose you update your CSS file after deployment.

The CDN still holds the older version.

How does it know a new version exists?

A common solution is **asset versioning**.

Instead of:

```
style.css
```

Deploy:

```
style.v2.css
```

or

```
style.4f3b91.css
```

The HTML references the new filename, causing the CDN to fetch the updated asset automatically.

Modern build tools such as React, Angular, and similar frameworks generate hashed filenames automatically during production builds.

---

# HTML Caching Strategy

HTML changes more frequently than CSS or JavaScript.

Many systems therefore:

* Cache HTML for shorter durations
* Cache assets for much longer periods

For example:

* HTML: 5 minutes to 7 days
* CSS: several months
* JavaScript: several months
* Images: several months
* Fonts: several months

The appropriate duration depends on how often the content changes.

---

# Time-To-Live (TTL)

Every cached resource has a lifetime.

This is known as **Time-To-Live (TTL).**

For example:

* HTML cached for 7 days
* Comments cached for 30 seconds
* Images cached for one year

After the TTL expires, the CDN requests a fresh copy from the origin server.

Choosing the right TTL balances performance with freshness.

---

# Can Dynamic Data Be Cached?

Yes—but only when temporary staleness is acceptable.

Consider a video's comment section.

Comments change frequently.

However, serving comments that are 30 seconds old is often perfectly acceptable.

Instead of requesting comments from the origin server every time:

* Cache them for 30 seconds.
* After expiration, fetch fresh comments.
* Cache the updated response again.

This dramatically reduces origin server load while maintaining a good user experience.

---

# CDN Cache Invalidation

Sometimes waiting for the TTL to expire is unacceptable.

Imagine a critical production bug has just been fixed.

You want users to receive the updated files immediately.

CDN providers allow manual cache invalidation.

From the provider's dashboard, developers can purge cached resources across all edge locations.

The next request retrieves the latest version directly from the origin server.

---

# Authentication and Protected Content

What about premium or members-only content?

A CDN should never blindly serve protected resources.

Instead, authentication is verified before delivering the content.

The transcript describes a token-based approach:

1. User logs in.
2. Origin server issues a signed authentication token.
3. CDN validates the token.
4. If valid, protected content can be served.

This allows premium content to be distributed efficiently while ensuring that only authorized users can access it.

---

# CDN Hierarchy

Large CDN providers operate multiple layers of caching.

A request may travel through:

```
User
   │
   ▼
Edge Cache
   │
   ▼
Regional Cache
   │
   ▼
Origin Shield
   │
   ▼
Origin Server
```

Each level reduces traffic reaching the actual application server.

---

# Security Benefits of CDNs

CDNs do more than accelerate content delivery.

They also enhance security.

Key advantages include:

* Hiding the origin server's IP address
* Acting as a protective layer between users and the origin
* Filtering malicious traffic
* Rate limiting abusive requests
* Mitigating Distributed Denial-of-Service (DDoS) attacks
* Functioning as an application firewall

Only CDN servers communicate directly with the origin, reducing its exposure to the public internet.

---

# Key Takeaways

* A CDN reduces latency by serving content from geographically distributed edge servers.
* The first request results in a cache miss; subsequent requests become cache hits.
* Cache resources that are identical for most users.
* Avoid globally caching personalized or sensitive user data.
* Use asset versioning or hashed filenames to keep cached resources up to date.
* Configure appropriate TTL values based on how frequently content changes.
* Frequently changing content can still be cached for short durations when slight staleness is acceptable.
* CDNs improve not only performance but also scalability, reliability, and security.

## Conclusion

Content Delivery Networks are far more than simple caching systems. They are globally distributed platforms that accelerate applications, reduce infrastructure load, improve scalability, enhance resilience, and strengthen security.

Understanding **what to cache, how long to cache it, and when to invalidate cached content** is essential for designing modern, high-performance web applications. When used thoughtfully, a CDN becomes one of the most impactful components of a scalable web architecture.
