import express from "express";
import {
    handleStripeWebhook,
    handleStripeConnectWebhook,
    handleTwilioWebhook,
    handleB2brouterWebhook
} from "../controllers/webhookController.js";

const router = express.Router();

// Webhook Stripe Plateforme & Abonnements (SaaS)
router.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

// Webhook Stripe Connect pour les paiements de factures clients
router.post("/stripe-connect", express.raw({ type: "application/json" }), handleStripeConnectWebhook);

// Webhook Twilio pour les SMS entrants (urlencoded ou json)
router.post("/twilio", express.urlencoded({ extended: true }), handleTwilioWebhook);

// Webhook B2Brouter pour la Facturation Électronique (JSON)
router.post("/b2brouter", express.json(), handleB2brouterWebhook);

export default router;
