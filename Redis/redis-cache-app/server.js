const express = require("express");
const axios = require("axios");
const redisClient = require("./redisClient");

const app = express();
const PORT = 3000;

app.use(express.json()); // ✅ body parser

// 🔥 👉 ADD RATE LIMITER HERE
app.use(rateLimiter);

// Rate limiting middleware should be placed before route handlers so it can intercept and control incoming traffic efficiently.
async function rateLimiter(req, res, next) {
  const ip = req.ip;
  const key = `rate:${ip}`;
  const LIMIT = 5; // max requests
  const WINDOW = 60; // seconds

  try {
    if (!redisClient.isOpen) {
      return next(); // fallback if Redis down
    }

    const requests = await redisClient.incr(key);

    if (requests === 1) {
      await redisClient.expire(key, WINDOW);
    }

    if (requests > LIMIT) {
      return res.status(429).json({
        error: "Too many requests. Try later.",
      });
    }

    next();
  } catch (err) {
    console.log("⚠️ Rate limiter failed, skipping");
    next();
  }
}

// Cache middleware
// 👉 Never block request if Redis fails
async function cache(req, res, next) {
  const key = "todos";

  try {
    if (!redisClient.isOpen) {
      console.log("⚠️ Redis DOWN → skipping cache");
      return next();
    }

    const cachedData = await redisClient.get(key);

    if (cachedData) {
      console.log("⚡ Cache HIT");
      return res.json(JSON.parse(cachedData));
    }

    console.log("❌ Cache MISS");
    next();
  } catch (err) {
    console.log("⚠️ Cache error → fallback to API");
    next(); // ✅ ALWAYS fallback
  }
}

// API route
app.get("/todos", cache, async (req, res) => {
  console.log("👉 Fetching from API");

  try {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/todos"
    );

    // 🔥 Non-blocking cache write
    if (redisClient.isOpen) {
      // Store in Redis without awaiting  
      redisClient
        .set("todos", JSON.stringify(data), { EX: 30 })
        .then(() => console.log("✅ Cached"))
        .catch(() => console.log("⚠️ Cache write failed"));
    }

    res.json(data);
  } catch (err) {
    console.error("❌ API failed:", err.message);

    res.status(500).json({
      error: "Service temporarily unavailable",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});