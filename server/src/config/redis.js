import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;

const redisConfig = redisUrl
    ? redisUrl
    : {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            const delay = Math.min(times * 100, 3000);
            return delay;
        }
    };

let isConnected = false;

export const redis = new Redis(redisConfig, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
        if (times > 5 && process.env.NODE_ENV !== "production") {
            // In dev mode without local Redis, avoid spamming logs endlessly
            return Math.min(times * 500, 10000);
        }
        return Math.min(times * 100, 3000);
    }
});

redis.on("connect", () => {
    isConnected = true;
    console.log("⚡ [Redis] Connected successfully to Redis server");
});

redis.on("ready", () => {
    isConnected = true;
});

redis.on("error", (err) => {
    isConnected = false;
    // Log concise message to prevent console flood if Redis is not running locally
    if (process.env.NODE_ENV === "development") {
        console.warn(`[Redis] Connection warning: ${err.message}`);
    } else {
        console.error("[Redis] Error:", err.message);
    }
});

redis.on("close", () => {
    isConnected = false;
});

export const connectRedis = async () => {
    try {
        await redis.connect();
    } catch (err) {
        console.warn("⚠️ [Redis] Failed initial connection, running with graceful fallback:", err.message);
    }
};

export const isRedisReady = () => isConnected;

export const disconnectRedis = async () => {
    try {
        if (isConnected) {
            await redis.quit();
            console.log("[Redis] Disconnected gracefully");
        }
    } catch (err) {
        console.warn("[Redis] Error while disconnecting:", err.message);
    }
};

export default redis;
