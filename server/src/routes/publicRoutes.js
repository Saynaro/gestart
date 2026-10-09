import express from "express";
import {
    getPublicPlans,
    getPublicCompany,
    submitQuoteRequest,
    getPublicInvoiceByToken,
    createPublicInvoiceCheckoutSession,
    downloadPublicInvoicePdf,
    getPublicQuoteByToken,
    signPublicQuote,
    createPublicQuoteCheckoutSession,
    downloadPublicQuotePdf,
    verifyPublicPayment,
    downloadPublicReceiptPdf
} from "../controllers/publicController.js";
import { publicFormsLimiter, heavyOperationsLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Public routes (sans authentification)
router.get("/plans", getPublicPlans);
router.get("/company/:companySlug", getPublicCompany);
router.post("/quote-request/:companySlug", publicFormsLimiter, submitQuoteRequest);

// Confirmation, vérification et reçu de paiement public
router.post("/pay/verify-payment", verifyPublicPayment);
router.get("/pay/receipt/pdf", heavyOperationsLimiter, downloadPublicReceiptPdf);

// Factures publiques (consultation, paiement et téléchargement PDF officiel)
router.get("/pay/invoice/:paymentToken", getPublicInvoiceByToken);
router.get("/pay/invoice/:paymentToken/pdf", heavyOperationsLimiter, downloadPublicInvoicePdf);
router.post("/pay/invoice/:paymentToken/checkout", publicFormsLimiter, createPublicInvoiceCheckoutSession);

// Devis publics (consultation, signature et téléchargement PDF officiel)
router.get("/sign/quote/:signatureToken", getPublicQuoteByToken);
router.get("/sign/quote/:signatureToken/pdf", heavyOperationsLimiter, downloadPublicQuotePdf);
router.post("/sign/quote/:signatureToken/sign", publicFormsLimiter, signPublicQuote);
router.post("/sign/quote/:signatureToken/checkout", publicFormsLimiter, createPublicQuoteCheckoutSession);

export default router;
