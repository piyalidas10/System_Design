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
