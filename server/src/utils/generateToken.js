import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

export const generateAccessToken = (userId, userRole, companyId) => {
    return jwt.sign({
        id: userId,
        role: userRole,
        companyId,
    },
        process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    });
};

export const generateRefreshToken = async (userId) => {
    const token = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
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
    res.cookie("gestart_refresh", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: (1000 * 60 * 60 * 24) * 30,
        path: "/",
    });
};