import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

export const generateAccessToken = (userId, userRole, companyId) => {
    return jwt.sign({
        id: userId,
        role: userRole,
        companyId,
    },
        process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'secret', {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || (process.env.NODE_ENV === "production" ? "15m" : "7d"),
    });
};

export const generateRefreshToken = async (userId) => {
    const token = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret_refresh',
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d"
        }
    );

    const hashedToken = await bcrypt.hash(token, 10);

    await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            refreshTokenHash: hashedToken,
        },
    });

    return token;
};

export const setRefreshCookie = (res, token) => {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("gestart_refresh", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: (1000 * 60 * 60 * 24) * 30, // 30 jours
        path: "/",
    });
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
    const isProd = process.env.NODE_ENV === "production";
    const sameSite = isProd ? "none" : "lax";
    const secure = isProd;

    if (accessToken) {
        res.cookie("accessToken", accessToken, {
            httpOnly: false,
            secure,
            sameSite,
            maxAge: isProd ? 1000 * 60 * 15 : 1000 * 60 * 60 * 24 * 7,
            path: "/",
        });
    }

    if (refreshToken) {
        res.cookie("gestart_refresh", refreshToken, {
            httpOnly: true,
            secure,
            sameSite,
            maxAge: (1000 * 60 * 60 * 24) * 30, // 30 jours
            path: "/",
        });
    }
};