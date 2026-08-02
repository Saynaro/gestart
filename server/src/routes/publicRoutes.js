import express from "express";
import {
    getPublicPlans,
    getPublicCompany,
    submitQuoteRequest,
    getPublicInvoiceByToken,
    createPublicInvoiceCheckoutSession,
    getPublicQuoteByToken,
    signPublicQuote
} from "../controllers/publicController.js";

const router = express.Router();

// Public routes (sans authentification)
router.get("/plans", getPublicPlans);
router.get("/company/:companySlug", getPublicCompany);
router.post("/quote-request/:companySlug", submitQuoteRequest);

// Paiement en ligne de facture (lien public pour les clients)
router.get("/pay/invoice/:paymentToken", getPublicInvoiceByToken);
router.post("/pay/invoice/:paymentToken/checkout", createPublicInvoiceCheckoutSession);

// Signature électronique de devis en ligne (lien public pour les clients)
router.get("/sign/quote/:signatureToken", getPublicQuoteByToken);
router.post("/sign/quote/:signatureToken/sign", signPublicQuote);

export default router;
