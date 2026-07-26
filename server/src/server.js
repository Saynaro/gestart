// import { createServer } from "http";
// import { Server } from "socket.io";
import app from "./app.js";

const PORT = process.env.PORT || 5001;

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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
});
