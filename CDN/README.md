# Content Delivery Networks (CDNs)

What is CDN | Content Delivery Network : https://www.youtube.com/watch?v=4pd5FgTluCM&t=2s

<img src="./img/CDN%20Caching%20Network%20Diagram.png" width="100%" />

Today we're going to learn about CDNs—Content Delivery Networks.

I hope all of you have at least heard the term before. Even if you haven't, don't worry. Today we'll cover everything from the absolute basics all the way to advanced concepts using first-principles thinking.

Many people who know a little about CDNs often get confused about one thing:
- Which type of data should be cached?
- Which type of data should never be cached?

The basic definition everyone has heard is:
```
"Cache static data, but don't cache dynamic data."
```
But how accurate is that statement? Where does the confusion come from?

Today we'll understand everything from A to Z.

---

## Understanding the Problem

Imagine this is my server. It hosts the website striver.in, and the server is located in Mumbai.

Now suppose I'm located in Delhi.

Whenever I visit this website, my browser sends a request to the Mumbai server. The server processes the request and sends back a response, after which the website opens in my browser.

Now imagine another user who is located in the United States.

This user also wants to access the same website. The server is still located in Mumbai, so their request also has to travel all the way to Mumbai before the response comes back.

Now let me ask you something.

Who will receive the response faster?
- The user in Delhi?
- Or the user in the USA?

Some people might think both should receive it at the same speed.

But that's not true.

The physical distance matters a lot.

For example:
- The round-trip distance between the USA and Mumbai may be around 14,000 kilometers.
- The round-trip distance between Delhi and Mumbai may be roughly 1,400 kilometers.

The data traveling over the network has a speed limit.

Nothing can travel faster than the speed of light.

The speed of light is approximately 300,000 km/s, while network signals typically travel at around 200,000 km/s through fiber optic cables.

Because of this:
- The user in the USA may receive a response after roughly 70 milliseconds.
- The user in Delhi may receive a response in around 7 milliseconds.

So clearly there's a noticeable delay.

And honestly, even 70 milliseconds sounds small.

In reality, the request doesn't travel directly.

It passes through many routers along the way, and each router performs some processing. Because of this additional network overhead, the delay increases.

In practice:
- A request from the USA might take around 200 milliseconds.
- A request from Delhi might take roughly 30 milliseconds.

Now you may think:
```
"What's the big deal? Even 200 milliseconds is less than one second."
```
That's true, but this is only the delay for a single request.

---

## A Website Requires Multiple Requests

Let's see what actually happens when someone visits a website.

Suppose I'm trying to open the Striver website.

The browser first sends a request.

The very first thing the server sends back is an HTML page.

Initially, the browser receives only the HTML document.

Inside that HTML file, there are references to other resources.

For example, the HTML says:
- I need this CSS file.
- I need this JavaScript file.

There may be multiple JavaScript files.

There may also be multiple CSS stylesheets.

After receiving the HTML page, the browser has to send additional requests:
- "Please send me the CSS file."
- "Please send me the JavaScript file."

The server responds with the CSS.

Then another request is made.

The JavaScript file is downloaded.

Each one of these requests introduces additional network delay.

---

## How Can We Solve This?

We want the user sitting in the USA to experience the website just as quickly as someone sitting near the server.

One possible idea is:
```
"Why don't I simply create another server in the USA?"
```
Then American users would directly connect to the US server instead of the Mumbai server.

Sounds like a good solution.

But there's a major problem.

Cost.

If I want fast performance across the world, I'd have to deploy servers in:
- The USA
- Europe
- Asia
- Australia
- And many other regions

Maintaining servers in every region would be extremely expensive.

Even within India, if I wanted users from every state to experience very low latency, I might need to deploy 10 to 15 additional servers.

That would significantly increase infrastructure costs.

Instead of building all of that infrastructure myself, wouldn't it be better to use a third-party service that has already built a global network of servers?

That's exactly where a Content Delivery Network (CDN) comes in.

---

## What Is a CDN?

Companies such as:
- Amazon CloudFront
- Cloudflare
- Akamai

already have servers distributed all over the world.

These companies provide what we call CDN services.

A CDN is essentially a network of servers that cache your data.

Now let's understand exactly how it works.

---

## How a CDN Works

Suppose a user in the USA wants to visit striver.in.

Instead of sending the request directly to my origin server in Mumbai, the request first goes to the nearest CDN server.

Initially, this CDN server has no cached copy of the website.

Since it doesn't have the requested data, it forwards the request to the original server.

The origin server sends back the required files—such as the HTML document.

The CDN forwards those files to the user.

At the same time, it stores a copy locally.

So now the CDN has cached that content.

Later, if another user from the same region visits the same website, the request again reaches the CDN server.

This time, the CDN already has the HTML page stored.

Instead of contacting the origin server again, it immediately serves the cached copy to the user.

The first request resulted in a cache miss, because the CDN didn't have the data.

The second request becomes a cache hit, because the content is already available in the CDN cache.

This means the origin server no longer has to process every request from users in that region.

The CDN serves the content directly, making the website much faster while reducing the load on the original server.

---

## The CDN Stores a Copy of the Data

After the CDN requests the HTML file from the origin server, it returns that file to the user.

But something else happens behind the scenes.

The CDN keeps a copy of that data in its own storage.

In other words, it caches the data locally.

Now imagine that another user from the same region wants to visit the same website.

The request again goes to the CDN server.

This time, however, the CDN already has the HTML file for the website.

Instead of contacting the origin server again, it simply serves the cached copy directly.

The first request was a cache miss because the CDN didn't have the data.

The second request is a cache hit, because the required content is already available in the CDN cache.

The CDN has stored that information so it can quickly serve future users without repeatedly contacting the origin server.

---

## Another Example: Video Delivery

Let's take another example.

Suppose your server hosts a video.

A user named Rohit wants to watch that video.

When Rohit requests it:
1. The request reaches the CDN.
2. The CDN doesn't have the video.
3. It forwards the request to the origin server.
4. The origin server sends the video.
5. The CDN sends the video to Rohit.
6. At the same time, it stores a copy locally.

Later, another user from the same region requests the exact same video.

Now the CDN already has the video.

It serves the video immediately without contacting the origin server again.

This is exactly what caching means.

The CDN stores frequently requested content so it can serve it much faster to future users.

---

## CDN Servers Exist Everywhere

CDN providers operate servers across the globe.

Imagine they have 300–400 servers worldwide.

Whenever a user makes a request, it is routed to the nearest CDN server.

The process works like this:
- The user sends a request to the nearest CDN.
- If that CDN already has the requested content, it serves it immediately.
- If it doesn't, it fetches the content from the origin server.
- It stores a copy locally.
- Then it serves the content to the user.

Now, if another user from the same geographical region requests the same resource, the CDN can deliver it directly.

There is no need to repeatedly contact the origin server.

---

## What Kind of Data Should a CDN Cache?

This is one of the most important questions.

I'll give you a very simple way to think about it.

Suppose one million users use your website.

Ask yourself:
```
Which data is identical for all one million users?
```
That is the data you should cache.

---

## Example: Website Homepage

Suppose someone visits striver.in.

Every visitor sees:
- The website logo
- Home button
- Courses
- Practice
- Articles
- Contest
- Navigation bar
- Colors
- Background
- Cards
- Layout

All of this is the same for every user.

Since every visitor receives identical content, this is excellent cacheable content.

---

## What Should Not Be Cached?

Now think about the profile section.

Suppose the profile shows:

**Aditya Tomar**

Another user may see:

**Mohan**

Someone else may see:

**Priya**

This data is different for every individual user.

Therefore, it is dynamic data.

Dynamic, user-specific information should not be stored in a shared CDN cache.

Whenever this information is needed, the application should request it directly from the origin server.

---

## More Examples of Dynamic Data

Suppose your profile page displays:
- Number of problems solved
- Personal achievements
- Progress
- User statistics

These values are different for every user.

Similarly, imagine opening a coding problem where you've already written some code.

That source code belongs only to you.

Another user has completely different code.

Again, this is user-specific information.

Such content should never be cached globally.

---

## User-Specific Recommendations

The same applies to:
- Personalized recommendations
- User-specific dashboards
- Private information
- Account settings

Anything that belongs to one specific user should always be fetched from the origin server rather than being stored inside a shared CDN cache.

---

## What Can Be Cached?

Let's look at a coding platform.

Suppose thousands of users open the same programming problem.

The problem statement itself is identical for everyone.

Since every user receives exactly the same problem description, this is a perfect candidate for CDN caching.

---

## Why Not Cache Personal Information?

You might ask:
```
"Can't a CDN cache personal data as well?"
```
Technically, it can.

The technology is capable of storing any kind of data.

But doing so creates several problems.

**1. Security**

Users trust your application with their personal information.

If that sensitive information is copied across hundreds of CDN servers worldwide, the risk of data leakage increases significantly.

That's one major reason.

**2. Synchronization**

Imagine a user updates their profile.

If that profile were cached in hundreds of CDN servers, every cached copy would also need to be updated.

Keeping all those copies synchronized would become extremely difficult and inefficient.

Therefore, dynamic and frequently changing user information is usually not stored inside the CDN.

---

## General Rule

Cache content that is:
- Common for everyone
- Public
- Shared by the majority of users

Examples include:
- CSS files
- JavaScript files
- Images
- Fonts
- Videos

Do not cache:
- User details
- Personal information
- Sensitive data
- Individual account information

These should always come from the origin server.

---

## Is Static Content Really Static?

When I first learned about CDNs, I was told:
```
"Static data means data that never changes."
```
But let's think carefully.

Suppose you've deployed your website.

Does that mean you'll never change your CSS again?

Of course not.

Tomorrow you might:
- Add a new font.
- Change the theme.
- Change the background color.
- Update the styling.

That means even CSS files can change over time.

So how does the CDN know when it should serve the updated version instead of the old cached one?

That's exactly the problem we'll solve in the next section.

---

## Static Files Can Also Change

At first glance, we think of CSS, JavaScript, and images as "static" files.

But are they truly permanent?

Not at all.

Imagine you've deployed your website today.

A week later, your designer changes the UI.

You modify:
- CSS styles
- JavaScript code
- Images
- Icons

Now a question arises.

The CDN has already cached the old CSS file.

How will users receive the updated version?

If the CDN keeps serving the old file forever, users will continue seeing the outdated website.

Clearly, there must be a mechanism to update the cached content.

---

## The Problem with Cached Files

Let's understand the problem.

Suppose your HTML page contains:
```
<link rel="stylesheet" href="style.css">
```
The browser requests:
```
style.css
```
The CDN caches this file.

Later you update your CSS and deploy the new version.

However, the filename remains exactly the same:

style.css

The CDN cannot automatically determine that the file contents have changed.

As a result, users may continue receiving the older cached version.

---

## The Solution: Versioning

A simple solution is to change the filename whenever the content changes.

Instead of:
```
style.css
```
deploy:
```
style-v2.css
```
or
```
style-v3.css
```
Now your HTML references:
```
<link rel="stylesheet" href="style-v2.css">
```
Since the CDN has never seen this filename before, it treats it as a completely new resource.

The request goes to the origin server.

The updated CSS is downloaded.

The CDN stores the new version in its cache.

Future users now receive the latest file.

---

## Hash-Based File Names

Modern frontend frameworks automate this process.

Instead of naming files:
```
style-v2.css
```
they generate filenames containing a unique hash.

For example:
```
style.4fd9ab.css
```
or
```
main.93af21.js
```
Whenever the file content changes, the hash changes automatically.

Since the filename changes, the CDN immediately knows it needs to fetch a fresh copy.

This technique avoids cache-related problems without requiring manual intervention.

---

## Why Frameworks Generate Hashed Files

Frameworks like Angular, React, and Vue automatically create hashed filenames during production builds.

This provides several advantages:
- Long-term browser caching
- Efficient CDN caching
- Automatic cache invalidation
- Better deployment strategy

Users always receive the latest version whenever the application's assets change.

---

## Does HTML Also Get Cached?

This raises another question.

What about the HTML page itself?

Can HTML also be cached?

The answer is:

Yes.

HTML can also be cached.

However, unlike CSS or JavaScript, HTML tends to change more frequently.

For example:
- Home page announcements
- New blog posts
- Updated navigation
- Promotional banners

Because HTML changes more often, it is usually cached for a much shorter duration.

---

## Understanding Time-To-Live (TTL)

Every cached resource has an expiration time.

This is called Time-To-Live (TTL).

For example:
- CSS may be cached for one year.
- Images may be cached for one year.
- Fonts may be cached for several months.
- HTML may be cached for only a few minutes or a few hours.

After the TTL expires, the CDN checks with the origin server to determine whether a newer version exists.

If a newer version is available, the CDN updates its cache.

Otherwise, it continues serving the existing copy.

---

## Choosing an Appropriate TTL

The TTL depends on how frequently the content changes.

For example:

Static Assets

Resources such as:
- Logos
- Fonts
- JavaScript bundles
- CSS files

rarely change after deployment.

These can safely have very long TTL values.

---

## Frequently Updated Content

Resources like:
- Homepage HTML
- News pages
- Blog listings

change more frequently.

These should have shorter TTL values.

A shorter TTL ensures that users receive updated information relatively quickly.

---

## Is Dynamic Content Never Cached?

Many beginners believe:
```
"Dynamic content should never be cached."
```
That isn't always true.

Let's consider an example.

Suppose you're watching a YouTube video.

Below the video is a comments section.

Comments are dynamic.

New comments appear regularly.

Should every user request force the origin server to generate the comments again?

Not necessarily.

---

## Short-Term Caching

Imagine comments are cached for only 30 seconds.

During those 30 seconds:
- Thousands of users can receive the cached response.
- The origin server avoids processing thousands of identical requests.

After 30 seconds:
- The cache expires.
- The CDN requests fresh comments.
- The updated response is cached again.

Most users won't even notice a 30-second delay in newly posted comments.

Yet the origin server experiences a dramatic reduction in load.

---

## Performance vs Freshness

Caching is always a balance between two goals:
1. Performance
2. Freshness of data

Long TTL values improve performance because fewer requests reach the origin server.

Short TTL values improve freshness because updates become visible more quickly.

Choosing the right TTL depends entirely on the nature of the application and how frequently its content changes.

In the next section, we'll see what happens when you need users to receive updated content immediately, without waiting for the TTL to expire.

## What If We Need Users to See Updates Immediately?

So far, we've discussed Time-To-Live (TTL).

Normally, the CDN serves cached content until the TTL expires.

But what if you've made an important update and you don't want to wait?

For example:
- You fixed a critical bug.
- You updated your website's homepage.
- You corrected incorrect information.
- You changed an important CSS or JavaScript file.

Waiting for the cache to expire naturally isn't always acceptable.

In such situations, CDNs provide another mechanism.

## Cache Invalidation

CDN providers allow developers to invalidate or purge cached content.

When you invalidate the cache:
1. The cached copy is removed from CDN servers.
2. The next incoming request cannot be served from the cache.
3. The CDN contacts the origin server.
4. It retrieves the latest version.
5. It stores the updated version in the cache.
6. Future users now receive the latest content.

This process is called cache invalidation or cache purging.

## When Should Cache Be Invalidated?

Cache invalidation is useful whenever users must receive updated content immediately.

Common examples include:
- Emergency production bug fixes
- Security patches
- Updated homepage announcements
- Pricing changes
- Product information updates
- Important business announcements

Instead of waiting for the TTL to expire, developers simply purge the affected cache entries.

## Cache Expiration vs Cache Invalidation

It's important to understand the difference.

**Cache Expiration**

The cache automatically expires after its configured TTL.

No manual action is required.

Example:
```
TTL = 1 hour
```
After one hour, the CDN requests a fresh copy from the origin server.

**Cache Invalidation**

The developer manually removes the cached resource before the TTL expires.

Example:
```
TTL = 1 year
```
But today you deploy a new version.

Rather than waiting an entire year, you invalidate the cache immediately.

The CDN fetches the new file on the very next request.

## Can Premium Content Be Served Through a CDN?

Many people ask this question.

Suppose you're running an online learning platform.

Some courses are free.

Some courses are available only to paid subscribers.

Can those paid videos also be delivered through a CDN?

Yes.

They absolutely can.

However, the CDN must first verify whether the user is authorized to access the content.

## Authentication Before Serving Protected Content

The process works like this.
1. The user logs in.
2. The application verifies the user's credentials.
3. The origin server generates an authentication token.
4. The user includes this token in future requests.
5. The CDN validates the token.
6. If the token is valid, the CDN serves the protected resource.
7. Otherwise, access is denied.

This ensures that only authorized users receive premium content.

## Why Authentication Matters

Imagine a premium course worth thousands of dollars.

If the CDN simply served the cached video without checking authentication, anyone who knew the URL could access the course.

That would be a serious security problem.

Therefore, authentication is always verified before protected content is delivered.

Caching should never bypass authorization.

## Large CDN Architectures

Large CDN providers don't rely on just a single cache server.

Instead, they build multiple layers of caching.

A simplified architecture looks like this:
```
User
   │
   ▼
Nearest Edge Server
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
Each layer increases efficiency.

If the edge server doesn't have the requested resource, it first checks a higher-level cache before contacting the origin server.

This greatly reduces traffic reaching the application server.

## Why Multiple Cache Layers?

Suppose several CDN edge locations belong to the same region.

Instead of every edge server independently contacting the origin server, they can first communicate with a shared regional cache.

Benefits include:
- Fewer requests to the origin server
- Lower bandwidth usage
- Faster cache warm-up
- Better scalability

This hierarchical design is one of the reasons modern CDNs handle millions of requests efficiently.

## Does Every Request Reach the Origin Server?

No.

Ideally, only a very small percentage of requests ever reach the origin server.

A typical flow looks like this:
- User requests a resource.
- Edge cache checks for the file.
- If found, it serves the response immediately.
- If not found, it checks higher cache layers.
- Only if all cache layers miss does the request reach the origin server.

This minimizes both latency and server load.

## Why Is This Beneficial?

Because the origin server no longer needs to handle every user request.

Instead, it only processes:
- New content
- Uncached requests
- Expired content
- Dynamic user-specific data

Everything else can be served directly from the CDN.

As traffic grows from thousands to millions of users, this dramatically improves scalability while reducing infrastructure costs.

In the final section, we'll discuss another major advantage of CDNs—security—including how they help protect applications against attacks such as DDoS and why many organizations place a CDN in front of their origin servers.

## CDNs Are Not Just About Speed

So far, we've learned that CDNs reduce latency and improve website performance.

But that's not their only advantage.

A CDN also acts as an additional layer between users and your origin server.

Instead of allowing every request to directly reach your application, users first communicate with the CDN.

Only when necessary does the CDN forward requests to the origin server.

This architecture provides significant security benefits.

## Protecting the Origin Server

Without a CDN, users communicate directly with the origin server.

That means:
```
User
   │
   ▼
Origin Server
```
Every incoming request reaches the application server.

If millions of requests suddenly arrive, the server may become overloaded.

## CDN as a Protective Layer

With a CDN in front of the application, the architecture changes.
```
Users
   │
   ▼
Content Delivery Network
   │
   ▼
Origin Server
```
Now the origin server is no longer directly exposed to the public internet.

Instead, the CDN becomes the public-facing layer.

Most traffic is handled there.

Only necessary requests reach the application server.

## Hiding the Origin Server

Another important benefit is that the actual IP address of the origin server can remain hidden.

Users interact with the CDN rather than communicating directly with the server hosting the application.

Because the origin server is less exposed, attackers have a more difficult time targeting it directly.

This significantly improves the application's overall security posture.

## Protection Against DDoS Attacks

One of the biggest advantages of using a CDN is protection against Distributed Denial-of-Service (DDoS) attacks.

A DDoS attack attempts to overwhelm a server by sending an enormous number of requests simultaneously.

For example:
- Thousands
- Millions
- Or even billions of requests

may arrive within a short period.

If every request reached the origin server, the application could become unavailable.

## How a CDN Helps

A CDN operates a massive global network.

Instead of allowing all malicious traffic to reach the application, the CDN absorbs and distributes the traffic across its infrastructure.

Many malicious requests are identified and blocked before they ever reach the origin server.

As a result:
- The application remains available.
- The origin server processes far fewer unnecessary requests.
- Legitimate users continue accessing the website.

## Traffic Filtering

Modern CDNs do much more than simple caching.

They also inspect incoming traffic.

Depending on the provider, they can:
- Detect suspicious requests.
- Block malicious clients.
- Rate-limit abusive traffic.
- Filter automated attacks.
- Protect against common web threats.

This makes the CDN an important component of an application's security architecture.

## Reduced Load on the Origin Server

Because cached content is served directly from CDN edge servers:
- Static resources never reach the origin server.
- Many repeated requests are eliminated.
- Network bandwidth consumption decreases.
- CPU utilization on the application server is reduced.

The origin server can dedicate its resources to processing:
- Dynamic requests
- Authentication
- Business logic
- Database operations

instead of repeatedly serving identical files.

## Improved Scalability

Imagine your website suddenly becomes popular.

Instead of serving ten thousand users, it now serves ten million users.

Without a CDN, your infrastructure requirements would increase dramatically.

With a CDN:
- Frequently requested content is already distributed globally.
- Most users are served directly by nearby edge servers.
- Only a relatively small number of requests reach the origin server.

This allows applications to scale much more efficiently.

## Key Takeaways

Let's summarize everything we've learned.

**Why Do We Need a CDN?**

Because users are located around the world.

Serving content from geographically nearby servers reduces network latency and improves page load speed.

**How Does a CDN Work?**
1. A user sends a request.
2. The request reaches the nearest CDN edge server.
3. If the content is cached (Cache Hit), it is served immediately.
4. Otherwise (Cache Miss), the CDN requests it from the origin server.
5. The CDN caches the content.
6. Future users receive the cached copy.

**What Should Be Cached?**

Cache content that is:
- Public
- Shared among most users
- Relatively stable

Examples include:
- HTML (where appropriate)
- CSS
- JavaScript
- Images
- Fonts
- Videos
- Documents

**What Should Not Be Cached?**

Avoid globally caching:
- User profiles
- Personalized dashboards
- Shopping carts
- Account settings
- Private messages
- Sensitive personal information

These should be retrieved directly from the origin server.

**How Is Cached Content Updated?**

CDNs use several techniques:
- File versioning
- Hashed filenames
- Time-To-Live (TTL)
- Cache expiration
- Manual cache invalidation (purging)

These mechanisms ensure users receive updated content when necessary.

**Can Dynamic Data Be Cached?**

Yes.

If temporary staleness is acceptable, dynamic responses can be cached for short durations.

Examples include:
- Comments
- Public statistics
- Trending content
- Frequently accessed API responses

The TTL should be selected based on how fresh the data needs to be.

**Security Benefits**

A CDN also improves security by:
- Acting as a protective layer in front of the origin server.
- Hiding the origin server from public access.
- Filtering malicious traffic.
- Mitigating DDoS attacks.
- Reducing unnecessary requests to the application.

## Conclusion

Content Delivery Networks are far more than simple caching systems.

They form a globally distributed infrastructure that improves:
- Website performance
- Scalability
- Availability
- Reliability
- Security

Understanding what to cache, how long to cache it, when to invalidate cached content, and how CDNs protect applications is essential for designing modern, high-performance web applications.

With that, we've completed our discussion on Content Delivery Networks (CDNs) from first principles.

I hope this session helped you understand not only how CDNs work, but also why they are one of the most important building blocks of modern web architecture.
