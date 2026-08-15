import express from "express";
import { handleStripeWebhook, handleTwilioWebhook, handleB2brouterWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// Webhook Stripe
router.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

// Webhook Twilio pour les SMS entrants (urlencoded ou json)
router.post("/twilio", express.urlencoded({ extended: true }), handleTwilioWebhook);

// Webhook B2Brouter pour la Facturation Électronique (JSON)
router.post("/b2brouter", express.json(), handleB2brouterWebhook);

export default router;

