import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";



dotenv.config();

const app = express();

// If our backend is behind a proxy like Heroku, AWS Elastic Beanstalk, or Nginx
// We need to tell express to trust the proxy so it can get the real client IP.
app.set("trust proxy", 1);

app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174"
    ].filter(Boolean),
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is running perfectly fine",
        timestamp: new Date().toISOString()
    });
});



app.use("/api/auth", authRoutes);



app.use((err, req, res, next) => {
    console.error(err.stack || err);

    res.status(err.status || 500).json({
        message: err.message || "Internal server error",
    });
});

export default app;