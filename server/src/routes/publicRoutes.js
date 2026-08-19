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

const router = express.Router();

// Public routes (sans authentification)
router.get("/plans", getPublicPlans);
router.get("/company/:companySlug", getPublicCompany);
router.post("/quote-request/:companySlug", submitQuoteRequest);

// Confirmation, vérification et reçu de paiement public
router.post("/pay/verify-payment", verifyPublicPayment);
router.get("/pay/receipt/pdf", downloadPublicReceiptPdf);

// Factures publiques (consultation, paiement et téléchargement PDF officiel)
router.get("/pay/invoice/:paymentToken", getPublicInvoiceByToken);
router.get("/pay/invoice/:paymentToken/pdf", downloadPublicInvoicePdf);
router.post("/pay/invoice/:paymentToken/checkout", createPublicInvoiceCheckoutSession);

// Devis publics (consultation, signature et téléchargement PDF officiel)
router.get("/sign/quote/:signatureToken", getPublicQuoteByToken);
router.get("/sign/quote/:signatureToken/pdf", downloadPublicQuotePdf);
router.post("/sign/quote/:signatureToken/sign", signPublicQuote);
router.post("/sign/quote/:signatureToken/checkout", createPublicQuoteCheckoutSession);

export default router;
