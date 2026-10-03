import express from "express";
import {
    getSubscription,
    createCheckoutSession,
    verifyCheckoutSession,
    upgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    addExtraBankAddon,
    removeExtraBankAddon,
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
router.post("/upgrade", upgradeSubscription);

// Annulation & Réactivation
router.post("/cancel", cancelSubscription);
router.post("/reactivate", reactivateSubscription);

// Options & Add-ons (+7 €/mois extra bank)
router.post("/extra-bank", addExtraBankAddon);
router.delete("/extra-bank", removeExtraBankAddon);

// Stripe Portal & Utilisation
router.get("/portal", getPortalUrl);
router.get("/usage", getSubscriptionUsage);
router.get("/invoices", getSubscriptionInvoices);
router.get("/receipts/:id/pdf", getSubscriptionReceiptPdf);

export default router;

