import express from "express";
import {
    getChannelsStatus,
    connectWhatsApp,
    testWhatsApp,
    disconnectWhatsApp,
    connectEmail,
    testEmail,
    disconnectEmail,
    startGoogleEmailAuth,
    handleGoogleEmailCallback,
    syncEmail
} from "../controllers/channelController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

// Callback Google OAuth public (redirigé par Google)
router.get("/email/google/callback", handleGoogleEmailCallback);

// Endpoints sécurisés nécessitant l'authentification
router.use(authMiddleware);

// Récupération des statuts
router.get("/channels", getChannelsStatus);

// WhatsApp
router.post("/whatsapp/connect", requireManager, connectWhatsApp);
router.post("/whatsapp/test", requireManager, testWhatsApp);
router.post("/whatsapp/disconnect", requireManager, disconnectWhatsApp);

// Email
router.get("/email/google/auth", requireManager, startGoogleEmailAuth);
router.post("/email/connect", requireManager, connectEmail);
router.post("/email/test", requireManager, testEmail);
router.post("/email/disconnect", requireManager, disconnectEmail);
router.post("/email/sync", syncEmail);

export default router;
