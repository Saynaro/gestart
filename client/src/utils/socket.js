import { io } from "socket.io-client";
import { BACKEND_URL } from "./config";
import { getAuthToken } from "./auth";

let socket = null;

/**
 * Obtient ou initialise l'instance Socket.io connectée
 * @returns {import("socket.io-client").Socket}
 */
export const getSocket = () => {
    const token = getAuthToken();

    if (!token) {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        return null;
    }

    if (!socket) {
        socket = io(BACKEND_URL || undefined, {
            auth: { token },
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socket.on("connect", () => {
            console.log("[SOCKET] Connecté au serveur temps réel");
        });

        socket.on("connect_error", (err) => {
            console.warn("[SOCKET ERROR]", err.message);
            if (err.message === "AUTH_REQUIRED" || err.message === "INVALID_TOKEN" || err.message === "USER_NOT_FOUND") {
                socket.disconnect();
            }
        });

        socket.on("disconnect", (reason) => {
            console.log("[SOCKET] Déconnecté:", reason);
        });
    } else if (token && socket.auth?.token !== token) {
        socket.auth = { token };
        if (socket.connected) {
            socket.disconnect().connect();
        }
    }

    return socket;
};

/**
 * Déconnecte proprement le socket (par exemple au logout)
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export default getSocket;
