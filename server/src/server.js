import { createServer } from "http";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";

const PORT = process.env.PORT || 5001;

const httpServer = createServer(app);

// Initialisation de Socket.io pour les mises à jour temps réel (SMS, notifications, statuts)
initSocket(httpServer);

const startServer = async () => {
    try {
        await connectDB();

        const server = httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on PORT: ${PORT} : http://localhost:${PORT}`);
        });

        // graceful shutdown for docker
        // make sure that the server is closed before the database
        const gracefulShutdown = async () => {
            console.log('Signal received. Shutting down...');

            const forceExitTimeout = setTimeout(() => {
                console.error('Shutdown timeout, forcing exit...');
                process.exit(1);
            }, 30000);

            // Forcefully close all keep-alive connections
            server.closeAllConnections?.();

            server.close(async () => {
                try {
                    await disconnectDB();
                    console.log('DB disconnected.');
                    clearTimeout(forceExitTimeout);
                    process.exit(0);
                } catch (err) {
                    console.error('DB disconnect error:', err);
                    process.exit(1);
                }
            });
        };



        //SIGINT - Ctrl+C in local machine
        process.on('SIGINT', gracefulShutdown);

        //SIGTERM - docker send this signal to the container when it needs to be stopped
        process.on('SIGTERM', gracefulShutdown);

    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
};

startServer();