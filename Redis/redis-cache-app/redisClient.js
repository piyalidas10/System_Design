const { createClient } = require("redis");

const client = createClient({
  url: "redis://localhost:6379"
});

client.on("error", (err) => {
  console.error("⚠️ Redis Error:", err.message);
});

(async () => {
  try {
    await client.connect();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Redis connection failed. Using fallback mode.");
  }
})();

module.exports = client;