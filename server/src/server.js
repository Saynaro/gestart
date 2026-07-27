import { createServer } from "http";
// import { Server } from "socket.io";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";


const PORT = process.env.PORT || 5001;

const httpServer = createServer(app);

// const httpServer = createServer(app);

// const io = new Server(httpServer, {
//     cors: {
//         origin: [
//             process.env.FRONTEND_URL,
//             "http://localhost:5173",
//             "http://localhost:5174"
//         ].filter(Boolean),
//         credentials: true,
//     },
// });


const startServer = async () => {
    try {
        await connectDB();

        // httpServer instead of app.listen(PORT) to support socket.io
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