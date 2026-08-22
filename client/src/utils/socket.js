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

    if (!socket) {
        socket = io(BACKEND_URL, {
            auth: { token },
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socket.on("connect", () => {
            console.log("[SOCKET] Connecté au serveur temps réel");
        });

        socket.on("connect_error", (err) => {
            console.warn("[SOCKET ERROR]", err.message);
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
