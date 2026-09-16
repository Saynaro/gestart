import express from "express";
import {
    getCompany,
    updateCompany,
    uploadCompanyLogo,
    deleteCompanyLogo,
    uploadCompanySignature,
    deleteCompanySignature,
    getCompanySettings,
    updateCompanySettings,
    getCompanyStats,
    createStripeConnectAccount,
    getStripeConnectStatus,
    validateIbanPublic,
    deleteCompanyAccount
} from "../controllers/companyController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";
import { requireActive } from "../middlewares/requireActive.js";

const router = express.Router();

// Public IBAN / BIC Validation API
router.post("/validate-iban", validateIbanPublic);
router.get("/validate-iban", validateIbanPublic);

// Infos Société
router.get("/", authMiddleware, getCompany);
router.patch("/", authMiddleware, requireOwner, requireActive, updateCompany);
router.put("/", authMiddleware, requireOwner, requireActive, updateCompany);

// Logo Société
router.patch("/logo", authMiddleware, requireOwner, requireActive, uploadCompanyLogo);
router.delete("/logo", authMiddleware, requireOwner, requireActive, deleteCompanyLogo);

// Signature Société
router.patch("/signature", authMiddleware, requireOwner, requireActive, uploadCompanySignature);
router.delete("/signature", authMiddleware, requireOwner, requireActive, deleteCompanySignature);

// Paramètres Société (SMS, Factures, PDF...)
router.get("/settings", authMiddleware, requireOwner, getCompanySettings);
router.patch("/settings", authMiddleware, requireOwner, requireActive, updateCompanySettings);
router.put("/settings", authMiddleware, requireOwner, requireActive, updateCompanySettings);

// Stripe Connect (Liaison IBAN propriétaire pour encaissement factures)
router.post("/stripe-connect/connect", authMiddleware, requireOwner, createStripeConnectAccount);
router.get("/stripe-connect/status", authMiddleware, requireOwner, getStripeConnectStatus);

// Statistiques Société
router.get("/stats", authMiddleware, requireManager, getCompanyStats);

// Suppression définitive du compte (Art. 17 RGPD)
router.delete("/delete-account", authMiddleware, requireOwner, deleteCompanyAccount);

export default router;
