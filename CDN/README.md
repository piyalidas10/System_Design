# Content Delivery Networks (CDNs)

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




