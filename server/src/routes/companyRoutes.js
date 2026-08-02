import express from "express";
import {
    getCompany,
    updateCompany,
    uploadCompanyLogo,
    deleteCompanyLogo,
    getCompanySettings,
    updateCompanySettings,
    getCompanyStats,
} from "../controllers/companyController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

// Infos Société
router.get("/", authMiddleware, getCompany);
router.patch("/", authMiddleware, requireOwner, updateCompany);

// Logo Société (upload.single("logo") pourra être inséré ici)
router.patch("/logo", authMiddleware, requireOwner, uploadCompanyLogo);
router.delete("/logo", authMiddleware, requireOwner, deleteCompanyLogo);

// Paramètres Société (SMS, Factures, PDF...)
router.get("/settings", authMiddleware, requireOwner, getCompanySettings);
router.patch("/settings", authMiddleware, requireOwner, updateCompanySettings);

// Statistiques Société
router.get("/stats", authMiddleware, requireManager, getCompanyStats);

export default router;
