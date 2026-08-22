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
            origin: [
                process.env.FRONTEND_URL,
                "http://localhost:5173",
                "http://localhost:5174"
            ].filter(Boolean),
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
        const { id: userId, companyId } = socket.user;

        // Rejoindre les rooms isolées pour le multi-tenant
        socket.join(`company:${companyId}`);
        socket.join(`user:${userId}`);

        console.log(`[SOCKET CONNECTED] User ${userId} joined company:${companyId}`);

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
