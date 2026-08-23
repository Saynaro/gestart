import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import equipmentRoutes from "./routes/equipmentRoutes.js";
import interventionRoutes from "./routes/interventionRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import eInvoicingRoutes from "./routes/eInvoicingRoutes.js";
import stripeConnectRoutes from "./routes/stripeConnectRoutes.js";
import paymentsRoutes from "./routes/paymentsRoutes.js";
import bankingRoutes from "./routes/bankingRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import channelRoutes from "./routes/channelRoutes.js";

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is running perfectly fine",
        timestamp: new Date().toISOString()
    });
});

// Webhook Routes (Supports /api/v1/webhooks, /api/webhooks, and /webhooks for Twilio / Stripe compatibility)
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/webhooks", webhookRoutes);

// Routes API V1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/company", companyRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);
app.use("/api/v1/invitations", invitationRoutes);
app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/equipment", equipmentRoutes);
app.use("/api/v1/interventions", interventionRoutes);
app.use("/api/v1/quotes", quoteRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/sms", smsRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/v1/e-invoicing", eInvoicingRoutes);
app.use("/api/v1/stripe", stripeConnectRoutes);
app.use("/api/v1/payments", paymentsRoutes);
app.use("/api/v1/banking", bankingRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/communication", channelRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack || err);

    res.status(err.status || 500).json({
        message: err.message || "Internal server error",
    });
});

export default app;