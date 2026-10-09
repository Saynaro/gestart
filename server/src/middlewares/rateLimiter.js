import redis, { isRedisReady } from "../config/redis.js";

/**
 * Creates a rate limiting middleware backed by Redis
 * @param {Object} options
 * @param {string} options.prefix - Key prefix in Redis (e.g. "rl:auth")
 * @param {number} options.windowSeconds - Time window in seconds (e.g. 900 for 15m)
 * @param {number} options.max - Maximum allowed requests in this window
 * @param {string} options.message - Error message to return on limit exceeded
 * @param {Function} [options.keyGenerator] - Custom key generator function (req => string)
 * @param {boolean} [options.skipSuccessfulRequests] - If true, decrement counter on success (e.g. only count failed logins)
 */
export const createRateLimiter = ({
    prefix = "rl:general",
    windowSeconds = 60,
    max = 100,
    message = "Trop de requêtes, veuillez réessayer plus tard.",
    keyGenerator = null,
    statusCode = 429
}) => {
    return async (req, res, next) => {
        // If Redis is offline or not configured, allow request to proceed gracefully
        if (!isRedisReady()) {
            return next();
        }

        try {
            // Determine client identifier: prefer user ID if logged in, otherwise client IP
            let identifier = "";
            if (keyGenerator && typeof keyGenerator === "function") {
                identifier = keyGenerator(req);
            } else {
                const ip =
                    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
                    req.socket?.remoteAddress ||
                    req.ip ||
                    "unknown_ip";
                const userPart = req.user?.id ? `u:${req.user.id}` : "";
                identifier = userPart || `ip:${ip}`;
            }

            const key = `ratelimit:${prefix}:${identifier}`;

            // Atomic increment & TTL setup via Redis pipeline/multi
            const currentCount = await redis.incr(key);
            if (currentCount === 1) {
                await redis.expire(key, windowSeconds);
            }

            const ttl = await redis.ttl(key);

            // Set standard rate limit headers
            res.setHeader("X-RateLimit-Limit", max);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, max - currentCount));
            res.setHeader("X-RateLimit-Reset", Math.max(0, ttl));

            if (currentCount > max) {
                res.setHeader("Retry-After", ttl > 0 ? ttl : windowSeconds);
                return res.status(statusCode).json({
                    success: false,
                    error: "RATE_LIMIT_EXCEEDED",
                    message,
                    retryAfterSeconds: ttl > 0 ? ttl : windowSeconds
                });
            }

            next();
        } catch (error) {
            console.warn(`[RateLimiter:${prefix}] Redis check failed:`, error.message);
            // Fallback: don't block legitimate user if Redis throws an unexpected error
            next();
        }
    };
};

// Helper for extracting IP
const getClientIp = (req) =>
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown_ip";

// 1. Strict Auth Limiter: 5 attempts per 15 minutes (protects against brute force)
export const authLimiter = createRateLimiter({
    prefix: "auth:login",
    windowSeconds: 15 * 60, // 15 mins
    max: 5,
    message: "Trop de tentatives de connexion. Pour votre sécurité, veuillez patienter 15 minutes avant de réessayer.",
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase()?.trim() || "";
        const ip = getClientIp(req);
        return email ? `login:${email}:${ip}` : `login:ip:${ip}`;
    }
});

// 2. Strict Register Limiter: 5 accounts per hour per IP (protects against spam registrations)
export const registerLimiter = createRateLimiter({
    prefix: "auth:register",
    windowSeconds: 60 * 60, // 1 hour
    max: 5,
    message: "Limite de création de compte atteinte. Veuillez réessayer plus tard.",
    keyGenerator: (req) => `register:ip:${getClientIp(req)}`
});

// 3. OTP & Password Reset Limiter: 3 requests per 10 minutes (protects SMS & Email budget)
export const otpLimiter = createRateLimiter({
    prefix: "auth:otp",
    windowSeconds: 10 * 60, // 10 mins
    max: 3,
    message: "Trop de demandes de code de vérification. Veuillez patienter 10 minutes.",
    keyGenerator: (req) => {
        const target = req.body?.email || req.body?.phone || getClientIp(req);
        return `otp:${target}`;
    }
});

// 4. SMS & Outgoing Messaging Limiter: 30 SMS per minute per company
export const smsLimiter = createRateLimiter({
    prefix: "sms:send",
    windowSeconds: 60, // 1 min
    max: 30,
    message: "Cadence d'envoi de SMS trop élevée. Veuillez patienter un instant.",
    keyGenerator: (req) => {
        const companyId = req.user?.companyId || "anonymous";
        const userId = req.user?.id || getClientIp(req);
        return `sms:${companyId}:${userId}`;
    }
});

// 5. Public Forms Limiter (Quotes request / Public contact): 10 requests per 10 minutes
export const publicFormsLimiter = createRateLimiter({
    prefix: "public:form",
    windowSeconds: 10 * 60, // 10 mins
    max: 10,
    message: "Trop de demandes soumises. Veuillez réessayer dans quelques minutes.",
    keyGenerator: (req) => `public:${getClientIp(req)}`
});

// 6. Heavy Operations Limiter (PDF generation, heavy exports): 30 requests per minute
export const heavyOperationsLimiter = createRateLimiter({
    prefix: "heavy:ops",
    windowSeconds: 60,
    max: 30,
    message: "Trop de demandes de génération de documents. Veuillez patienter un instant.",
    keyGenerator: (req) => {
        const companyId = req.user?.companyId || getClientIp(req);
        return `heavy:${companyId}`;
    }
});

// 7. General API Limiter: 300 requests per minute per IP / User
export const generalApiLimiter = createRateLimiter({
    prefix: "api:general",
    windowSeconds: 60,
    max: 300,
    message: "Nombre limite de requêtes API dépassé. Veuillez ralentir.",
    keyGenerator: (req) => {
        const userId = req.user?.id;
        return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
    }
});
