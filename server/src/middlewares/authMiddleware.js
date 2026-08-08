import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

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

        const user = await prisma.user.findUnique({
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