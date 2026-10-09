import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { cacheService } from "../services/cacheService.js";

export const authMiddleware = async (req, res, next) => {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    } else if (req.cookies?.gestart_access) {
        token = req.cookies.gestart_access;
    } else if (req.query?.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token manquant ou invalide",
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'secret'
        );

        if (!decoded?.id) {
            return res.status(401).json({
                success: false,
                message: "Accès non autorisé, token invalide"
            });
        }

        // Cache user session lookup in Redis to avoid hitting PostgreSQL on every single API call
        const cacheKey = `user:session:${decoded.id}`;
        let user = await cacheService.get(cacheKey);

        if (!user) {
            user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                    phone: true,
                    isActive: true,
                    role: true,
                    companyId: true,
                }
            });

            if (user && user.isActive) {
                // Cache active user for 5 minutes (300 seconds)
                await cacheService.set(cacheKey, user, 300);
            }
        }

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Utilisateur introuvable ou compte désactivé",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("JWT Error:", error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expiré",
                error: "TokenExpiredError"
            });
        }

        return res.status(401).json({
            success: false,
            message: "Accès non autorisé, token invalide"
        });
    }
};