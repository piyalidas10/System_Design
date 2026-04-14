# CORS
Cross-Origin Resource Sharing (CORS) is a browser security feature that restricts web pages from making requests to a different domain than the one that served the page.
It uses HTTP headers to allow servers to explicitly permit cross-origin requests, preventing malicious sites from accessing sensitive data while enabling legitimate API integrations. 

## Tutorials
1. CORS Explained - Cross-Origin Resource Sharing : https://www.youtube.com/watch?v=WWnR4xptSRk
2. Cross-Origin Resource Sharing (CORS) : https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
3. Cross-Origin Resource Sharing (CORS) : https://http.dev/cors

## Key Aspects of CORS
- **Same-Origin Policy (SOP)**: Browsers restrict cross-origin HTTP requests by default to protect user security, such as preventing CSRF (Cross-Site Request Forgery) attacks.
- What is an "Origin"? An origin is defined by the URL scheme (protocol), domain (host), and port. A request from site.com to api.site.com is considered cross-origin.
- How it Works (HTTP Headers):
  - **Access-Control-Allow-Origin**: The main header used by the server to tell the browser which origins are allowed to access its resources.
  - **Access-Control-Allow-Methods**: Specifies which HTTP methods (e.g., GET, POST, PUT) are allowed.
- **Preflight Request (OPTIONS)**: For complex requests (like those with custom headers or JSON data), the browser sends an automatic preflight OPTIONS request to the server to check if it's safe to proceed. 

## Common CORS Errors & Solutions
- **Error**: "Blocked by CORS policy" in the browser console.
- **Solution**: The server hosting the API must be configured to send the appropriate Access-Control-Allow-Origin header, listing the client's domain (or * for public APIs).
- **Tools**: Developers often use libraries like Express CORS Middleware

## Examples
```
Origin = Tuple (Scheme + Host + Port)

Scheme = http or https
```

**Two different origins**
```
https://piyushgarg.dev
https://api.piyushgarg.dev
```
