import express from "express";
import {
    getSubscription,
    createCheckoutSession,
    verifyCheckoutSession,
    createPaymentIntent,
    upgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    getPortalUrl,
    getSubscriptionUsage,
    getSubscriptionInvoices,
    getSubscriptionReceiptPdf
} from "../controllers/subscriptionController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/checkRole.js";

const router = express.Router();

// 1. Consultation du statut de l'abonnement (accessible à tous les membres connectés : Owner, Manager, Technicien)
router.get("/", authMiddleware, getSubscription);

// 2. Tous les endpoints de gestion/modification d'abonnement restent protégés pour le Propriétaire (OWNER)
router.use(authMiddleware, requireOwner);

// Checkout & Upgrades
router.post("/checkout", createCheckoutSession);
router.post("/create-checkout-session", createCheckoutSession);
router.post("/verify-session", verifyCheckoutSession);
router.post("/payment-intent", createPaymentIntent);
router.post("/upgrade", upgradeSubscription);

// Annulation & Réactivation
router.post("/cancel", cancelSubscription);
router.post("/reactivate", reactivateSubscription);

// Stripe Portal & Utilisation
router.get("/portal", getPortalUrl);
router.get("/usage", getSubscriptionUsage);
router.get("/invoices", getSubscriptionInvoices);
router.get("/receipts/:id/pdf", getSubscriptionReceiptPdf);

export default router;
