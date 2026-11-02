import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

let ioInstance = null;

/**
 * Initialise Socket.io sur le serveur HTTP avec authentification JWT
 * et gestion des rooms par entreprise et utilisateur.
 * @param {import("http").Server} httpServer
 * @returns {Server}
 */
export const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                const allowedOrigins = [
                    process.env.FRONTEND_URL,
                    "https://gestart.fr",
                    "https://www.gestart.fr",
                    "https://app.gestart.fr",
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://localhost:3000"
                ].filter(Boolean);

                const isLocalNetwork = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
                const isGestartDomain = /^https?:\/\/([a-z0-9-]+\.)?gestart\.fr$/i.test(origin);

                if (allowedOrigins.includes(origin) || isLocalNetwork || isGestartDomain || process.env.NODE_ENV !== "production") {
                    return callback(null, true);
                }
                return callback(new Error("CORS not allowed for this origin"));
            },
            credentials: true,
        },
        pingTimeout: 30000,
        pingInterval: 10000,
    });

    // Middleware d'authentification Socket.io
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth?.token || socket.handshake.query?.token;

            if (!token && socket.handshake.headers?.cookie) {
                const cookies = socket.handshake.headers.cookie.split(";").reduce((res, c) => {
                    const [key, val] = c.trim().split("=");
                    res[key] = val;
                    return res;
                }, {});
                token = cookies.accessToken || cookies.gestart_access || cookies.token;
            }

            if (!token) {
                return next(new Error("AUTH_REQUIRED"));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "secret"
            );

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    companyId: true,
                    role: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                }
            });

            if (!user || !user.isActive) {
                return next(new Error("USER_NOT_FOUND"));
            }

            socket.user = user;
            return next();
        } catch (err) {
            console.warn("[SOCKET AUTH WARNING]", err.message);
            return next(new Error("INVALID_TOKEN"));
        }
    });

    io.on("connection", (socket) => {
        const { id: userId, companyId, role } = socket.user;

        // Rejoindre les rooms isolées pour le multi-tenant
        if (companyId) {
            socket.join(`company:${companyId}`);
        }
        socket.join(`user:${userId}`);

        // Si l'utilisateur est SuperAdmin, il rejoint le canal global superadmin
        if (role === "SUPERADMIN") {
            socket.join("superadmin");
            console.log(`[SOCKET CONNECTED] SuperAdmin ${userId} joined room superadmin`);
        } else {
            console.log(`[SOCKET CONNECTED] User ${userId} joined company:${companyId}`);
        }

        socket.on("disconnect", (reason) => {
            console.log(`[SOCKET DISCONNECTED] User ${userId} (${reason})`);
        });
    });

    ioInstance = io;
    return io;
};

/**
 * Récupère l'instance Socket.io initialisée
 * @returns {Server|null}
 */
export const getIO = () => ioInstance;

/**
 * Émet un événement à tous les utilisateurs d'une même entreprise (multi-tenant)
 * @param {string} companyId 
 * @param {string} event 
 * @param {any} data 
 */
export const emitToCompany = (companyId, event, data) => {
    if (ioInstance && companyId) {
        ioInstance.to(`company:${companyId}`).emit(event, data);
    }
};

/**
 * Émet un événement à tous les SuperAdmins connectés
 * @param {string} event 
 * @param {any} data 
 */
export const emitToSuperadmin = (event, data) => {
    if (ioInstance) {
        ioInstance.to("superadmin").emit(event, data);
    }
};

/**
 * Émet un événement à un utilisateur spécifique
 * @param {string} userId 
 * @param {string} event 
 * @param {any} data 
 */
export const emitToUser = (userId, event, data) => {
    if (ioInstance && userId) {
        ioInstance.to(`user:${userId}`).emit(event, data);
    }
};

