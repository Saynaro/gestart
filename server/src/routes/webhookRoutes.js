import express from "express";
import {
    handleStripeWebhook,
    handleStripeConnectWebhook,
    handleTwilioWebhook,
    handleTwilioStatusWebhook,
    handleB2brouterWebhook,
    handleWhatsAppVerificationWebhook,
    handleWhatsAppWebhook,
    handleEmailWebhook
} from "../controllers/webhookController.js";

const router = express.Router();

// Webhook Stripe Plateforme & Abonnements (SaaS)
router.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

// Webhook Stripe Connect pour les paiements de factures clients
router.post("/stripe-connect", express.raw({ type: "application/json" }), handleStripeConnectWebhook);

// Webhooks Twilio pour les SMS entrants (support des deux formats: /sms et /twilio)
router.post("/twilio/sms", express.urlencoded({ extended: true }), handleTwilioWebhook);
router.post("/twilio", express.urlencoded({ extended: true }), handleTwilioWebhook);
router.post("/sms", express.urlencoded({ extended: true }), handleTwilioWebhook);

// Webhook Twilio pour les changements de statut d'envoi / livraison
router.post("/twilio/status", express.urlencoded({ extended: true }), handleTwilioStatusWebhook);

// Webhooks Meta WhatsApp Business (Challenge GET + Événements POST)
router.get("/whatsapp", handleWhatsAppVerificationWebhook);
router.post("/whatsapp", express.json(), handleWhatsAppWebhook);

// Webhook Inbound Email
router.post("/email", express.json(), handleEmailWebhook);

// Webhook B2Brouter pour la Facturation Électronique (JSON)
router.post("/b2brouter", express.json(), handleB2brouterWebhook);

export default router;
