import express from "express";
import {
    getCompany,
    updateCompany,
    uploadCompanyLogo,
    deleteCompanyLogo,
    getCompanySettings,
    updateCompanySettings,
    getCompanyStats,
    createStripeConnectAccount,
    getStripeConnectStatus
} from "../controllers/companyController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

// Infos Société
router.get("/", authMiddleware, getCompany);
router.patch("/", authMiddleware, requireOwner, updateCompany);
router.put("/", authMiddleware, requireOwner, updateCompany);

// Logo Société
router.patch("/logo", authMiddleware, requireOwner, uploadCompanyLogo);
router.delete("/logo", authMiddleware, requireOwner, deleteCompanyLogo);

// Paramètres Société (SMS, Factures, PDF...)
router.get("/settings", authMiddleware, requireOwner, getCompanySettings);
router.patch("/settings", authMiddleware, requireOwner, updateCompanySettings);
router.put("/settings", authMiddleware, requireOwner, updateCompanySettings);

// Stripe Connect (Liaison IBAN propriétaire pour encaissement factures)
router.post("/stripe-connect/connect", authMiddleware, requireOwner, createStripeConnectAccount);
router.get("/stripe-connect/status", authMiddleware, requireOwner, getStripeConnectStatus);

// Statistiques Société
router.get("/stats", authMiddleware, requireManager, getCompanyStats);

export default router;
