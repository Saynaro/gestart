import redis, { isRedisReady } from "../config/redis.js";

/**
 * High-performance Cache Service powered by Redis
 * Provides graceful fallback (bypasses cache safely if Redis is offline)
 */
export const cacheService = {
    /**
     * Get item from cache
     * @param {string} key
     * @returns {Promise<any|null>}
     */
    async get(key) {
        if (!isRedisReady()) return null;
        try {
            const data = await redis.get(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (err) {
            console.warn(`[CacheService] get error for key "${key}":`, err.message);
            return null;
        }
    },

    /**
     * Set item in cache with TTL in seconds
     * @param {string} key
     * @param {any} value
     * @param {number} ttlSeconds (default: 300 = 5 min)
     */
    async set(key, value, ttlSeconds = 300) {
        if (!isRedisReady() || value === undefined) return false;
        try {
            const stringified = JSON.stringify(value);
            if (ttlSeconds > 0) {
                await redis.set(key, stringified, "EX", ttlSeconds);
            } else {
                await redis.set(key, stringified);
            }
            return true;
        } catch (err) {
            console.warn(`[CacheService] set error for key "${key}":`, err.message);
            return false;
        }
    },

    /**
     * Delete specific key
     * @param {string} key
     */
    async del(key) {
        if (!isRedisReady()) return false;
        try {
            await redis.del(key);
            return true;
        } catch (err) {
            console.warn(`[CacheService] del error for key "${key}":`, err.message);
            return false;
        }
    },

    /**
     * Delete multiple keys matching a pattern (using SCAN for non-blocking iteration)
     * Example pattern: "cache:dashboard:company_123*"
     * @param {string} pattern
     */
    async delPattern(pattern) {
        if (!isRedisReady()) return false;
        try {
            let cursor = "0";
            do {
                const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
                cursor = nextCursor;
                if (keys && keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== "0");
            return true;
        } catch (err) {
            console.warn(`[CacheService] delPattern error for pattern "${pattern}":`, err.message);
            return false;
        }
    },

    /**
     * Cache-aside helper: tries to get from cache, if missing executes fetchFn, caches and returns
     * @param {string} key
     * @param {number} ttlSeconds
     * @param {Function} fetchFn
     * @returns {Promise<any>}
     */
    async remember(key, ttlSeconds, fetchFn) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        const freshData = await fetchFn();
        if (freshData !== undefined && freshData !== null) {
            await this.set(key, freshData, ttlSeconds);
        }
        return freshData;
    },

    /**
     * Invalidate all dashboard variants for a company
     * @param {string} companyId
     */
    async invalidateDashboard(companyId) {
        if (!companyId) return false;
        return this.delPattern(`cache:dashboard:${companyId}*`);
    },

    /**
     * Invalidate catalog cache for a company
     * @param {string} companyId
     */
    async invalidateCatalog(companyId) {
        if (!companyId) return false;
        return this.del(`cache:catalog:${companyId}`);
    },

    /**
     * Invalidate user session cache
     * @param {string} userId
     */
    async invalidateUserSession(userId) {
        if (!userId) return false;
        return this.del(`user:session:${userId}`);
    }
};

export default cacheService;
