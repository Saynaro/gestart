import express from "express";
import {
    getQuotes,
    getQuoteById,
    createQuote,
    updateQuote,
    sendQuote,
    acceptQuote,
    convertQuoteToInvoice,
    getQuotePdf
} from "../controllers/quoteController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

// Tous les endpoints devis nécessitent l'authentification
router.use(authMiddleware);

// Lecture devis
router.get("/", requireManager, getQuotes);
router.get("/:id", getQuoteById);
router.get("/:id/pdf", getQuotePdf);

// Actions et création de devis
router.post("/", requireManager, createQuote);
router.patch("/:id", requireManager, updateQuote);
router.post("/:id/send", requireManager, sendQuote);
router.post("/:id/accept", requireManager, acceptQuote);
router.post("/:id/convert-to-invoice", requireManager, convertQuoteToInvoice);

export default router;
