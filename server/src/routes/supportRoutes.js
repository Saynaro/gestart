import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
    getSupportMessages,
    sendSupportMessage,
    markSupportMessagesAsRead,
    getSupportConversations,
    getUnreadSupportCount
} from "../controllers/supportController.js";

const router = express.Router();

// Apply auth middleware to all support routes
router.use(authMiddleware);

// Get messages for an enterprise (Owner gets their own, SuperAdmin passes companyId query)
router.get("/messages", getSupportMessages);

// Send message (Owner -> SuperAdmin or SuperAdmin -> Owner)
router.post("/messages", sendSupportMessage);

// Mark conversation messages as read
router.post("/read", markSupportMessagesAsRead);

// SuperAdmin: List of all enterprise support conversations
router.get("/conversations", getSupportConversations);

// Global unread badge count
router.get("/unread-count", getUnreadSupportCount);

export default router;
