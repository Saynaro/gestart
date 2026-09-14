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

const router = express.Router();

// Public IBAN / BIC Validation API
router.post("/validate-iban", validateIbanPublic);
router.get("/validate-iban", validateIbanPublic);

// Infos Société
router.get("/", authMiddleware, getCompany);
router.patch("/", authMiddleware, requireOwner, updateCompany);
router.put("/", authMiddleware, requireOwner, updateCompany);

// Logo Société
router.patch("/logo", authMiddleware, requireOwner, uploadCompanyLogo);
router.delete("/logo", authMiddleware, requireOwner, deleteCompanyLogo);

// Signature Société
router.patch("/signature", authMiddleware, requireOwner, uploadCompanySignature);
router.delete("/signature", authMiddleware, requireOwner, deleteCompanySignature);

// Paramètres Société (SMS, Factures, PDF...)
router.get("/settings", authMiddleware, requireOwner, getCompanySettings);
router.patch("/settings", authMiddleware, requireOwner, updateCompanySettings);
router.put("/settings", authMiddleware, requireOwner, updateCompanySettings);

// Stripe Connect (Liaison IBAN propriétaire pour encaissement factures)
router.post("/stripe-connect/connect", authMiddleware, requireOwner, createStripeConnectAccount);
router.get("/stripe-connect/status", authMiddleware, requireOwner, getStripeConnectStatus);

// Statistiques Société
router.get("/stats", authMiddleware, requireManager, getCompanyStats);

// Suppression définitive du compte (Art. 17 RGPD)
router.delete("/delete-account", authMiddleware, requireOwner, deleteCompanyAccount);

export default router;
