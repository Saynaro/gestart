import express from "express";
import {
    getRevenueReport,
    getInterventionsReport,
    getTechniciansReport,
    getClientsReport,
    getMaintenanceReport,
    getSmsReport,
    toggleTvaDeclaration,
    toggleUrssafDeclaration,
    exportAccountingExcel,
    exportAccountingPdf,
    exportAccountingTxt,
    getExportHistory
} from "../controllers/reportController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

// Tous les rapports nécessitent l'authentification
router.use(authMiddleware);

// Exports comptables (Excel, PDF, TXT) avec données réelles et historique
router.get("/export/history", requireManager, getExportHistory);
router.get("/export/excel", requireManager, exportAccountingExcel);
router.get("/export/pdf", requireManager, exportAccountingPdf);
router.get("/export/txt", requireManager, exportAccountingTxt);

// Rapports accessibles aux Managers et Owner
router.get("/revenue", requireManager, getRevenueReport);
router.post("/tva-declaration", requireManager, toggleTvaDeclaration);
router.post("/urssaf-declaration", requireManager, toggleUrssafDeclaration);
router.get("/interventions", requireManager, getInterventionsReport);
router.get("/clients", requireManager, getClientsReport);
router.get("/maintenance", requireManager, getMaintenanceReport);

// Rapports financiers/stratégiques réservés au Владелец (OWNER)
router.get("/technicians", requireOwner, getTechniciansReport);
router.get("/sms", requireOwner, getSmsReport);

export default router;
