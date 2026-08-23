import express from "express";
import {
    getOmnichannelInbox,
    getClientConversation,
    sendMessage,
    markMessagesAsRead,
    getClientChannels,
    getUnreadCount
} from "../controllers/messageController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";
import { checkLimits } from "../middlewares/checkLimits.js";

const router = express.Router();

// Tous les endpoints de messagerie nécessitent l'authentification
router.use(authMiddleware);

// Unread count
router.get("/unread-count", getUnreadCount);

// Canaux disponibles pour un client
router.get("/channels/:clientId", getClientChannels);

// Inbox et historique
router.get("/inbox", requireManager, getOmnichannelInbox);
router.get("/inbox/:clientId", requireManager, getClientConversation);

// Envoi de message omnicanal (avec vérification du quota si SMS)
router.post("/send", requireManager, checkLimits("sms"), sendMessage);

// Lecture
router.patch("/read/:clientId", markMessagesAsRead);

export default router;
