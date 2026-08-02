import express from "express";
import {
    getSubscription,
    createCheckoutSession,
    upgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    getPortalUrl,
    getSubscriptionUsage,
    getSubscriptionInvoices
} from "../controllers/subscriptionController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/checkRole.js";

const router = express.Router();

// Tous les endpoints de gestion d'abonnement sont protégés pour le Владелец (OWNER)
router.use(authMiddleware, requireOwner);

// Subscription details
router.get("/", getSubscription);

// Checkout & Upgrades
router.post("/checkout", createCheckoutSession);
router.post("/upgrade", upgradeSubscription);

// Annulation & Réactivation
router.post("/cancel", cancelSubscription);
router.post("/reactivate", reactivateSubscription);

// Stripe Portal & Utilisation
router.get("/portal", getPortalUrl);
router.get("/usage", getSubscriptionUsage);
router.get("/invoices", getSubscriptionInvoices);

export default router;
