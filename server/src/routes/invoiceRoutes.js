import express from "express";
import {
    getInvoices,
    getInvoicesSummary,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    sendInvoice,
    markInvoicePaid,
    sendInvoiceReminder,
    getInvoicePdf,
    deleteInvoice,
    createInvoicePaymentLink
} from "../controllers/invoiceController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";
import { requireActive } from "../middlewares/requireActive.js";

const router = express.Router();

// Tous les endpoints de factures nécessitent au minimum l'authentification et le rôle MANAGER
router.use(authMiddleware, requireManager);

// Collections et résumés
router.get("/", getInvoices);
router.get("/summary", getInvoicesSummary);

// Détail et PDF
router.get("/:id", getInvoiceById);
router.get("/:id/pdf", getInvoicePdf);

// Actions et modification factures
router.post("/", requireActive, createInvoice);
router.patch("/:id", updateInvoice);
router.put("/:id", updateInvoice);
router.post("/:id/send", sendInvoice);
router.post("/:id/mark-paid", markInvoicePaid);
router.post("/:id/send-reminder", sendInvoiceReminder);
router.post("/:id/payment-link", createInvoicePaymentLink);

// Suppression (Brouillon uniquement) réservée au Владелец (OWNER)
router.delete("/:id", requireOwner, deleteInvoice);

export default router;
