import express from "express";
import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllReadNotifications
} from "../controllers/notificationController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Tous les endpoints notifications nécessitent l'authentification
router.use(authMiddleware);

// Collections et compteurs
router.get("/", getNotifications);
router.get("/unread-count", getUnreadNotificationCount);

// Marquer comme lu
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);

// Suppression
router.delete("/clear-all", clearAllReadNotifications);
router.delete("/:id", deleteNotification);

export default router;
