// config/redis.js
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  username: process.env.REDIS_USERNAME || null,
  password: process.env.REDIS_PASSWORD || null,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log(`Connected to Redis at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

export default redis;
