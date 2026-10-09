import express from "express";
import {
    getSmsInbox,
    getClientSmsHistory,
    sendSms,
    sendBulkSms,
    markSmsAsRead,
    getSmsUsage,
    getUnreadSmsCount
} from "../controllers/smsController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";
import { checkLimits } from "../middlewares/checkLimits.js";
import { smsLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Tous les endpoints SMS nécessitent l'authentification
router.use(authMiddleware);

// Unread count (accessible par tous les users autorisés)
router.get("/unread-count", getUnreadSmsCount);

// Inbox et historique
router.get("/inbox", getSmsInbox);
router.get("/inbox/:clientId", getClientSmsHistory);

// Envoi SMS (avec vérification du quota du plan et rate limiting Redis)
router.post("/send", smsLimiter, checkLimits("sms"), sendSms);
router.post("/send-bulk", requireManager, smsLimiter, checkLimits("sms"), sendBulkSms);

// Lecture
router.patch("/read/:clientId", markSmsAsRead);

// Consommation (réservé au Владелец)
router.get("/usage", requireOwner, getSmsUsage);

export default router;
