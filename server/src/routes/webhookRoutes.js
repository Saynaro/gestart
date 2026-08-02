import express from "express";
import { handleStripeWebhook, handleTwilioWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// Webhook Stripe
router.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

// Webhook Twilio pour les SMS entrants (urlencoded ou json)
router.post("/twilio", express.urlencoded({ extended: true }), handleTwilioWebhook);

export default router;
