import express from "express";
import {
    getOmnichannelInbox,
    getClientConversation,
    sendMessage,
    markMessagesAsRead,
    getClientChannels,
    getUnreadCount,
    deleteMessages
} from "../controllers/messageController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";
import { requireActive } from "../middlewares/requireActive.js";
import { checkLimits } from "../middlewares/checkLimits.js";

const router = express.Router();

// Tous les endpoints de messagerie nécessitent l'authentification
router.use(authMiddleware);

// Unread count
router.get("/unread-count", getUnreadCount);

// Canaux disponibles pour un client
router.get("/channels/:clientId", getClientChannels);

// Inbox et historique (accessible à tous les membres authentifiés de l'entreprise)
router.get("/inbox", getOmnichannelInbox);
router.get("/inbox/:clientId", getClientConversation);

// Envoi de message omnicanal (avec vérification du quota si SMS et abonnement actif)
router.post("/send", requireActive, checkLimits("sms"), sendMessage);

// Lecture
router.patch("/read/:clientId", markMessagesAsRead);

// Suppression de messages (unitaire ou par lot)
router.delete("/batch", deleteMessages);
router.delete("/:id", deleteMessages);

export default router;
