import express from "express";
import {
    getRevenueReport,
    getInterventionsReport,
    getTechniciansReport,
    getClientsReport,
    getMaintenanceReport,
    getSmsReport
} from "../controllers/reportController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

// Tous les rapports nécessitent l'authentification
router.use(authMiddleware);

// Rapports accessibles aux Managers et Owner
router.get("/revenue", requireManager, getRevenueReport);
router.get("/interventions", requireManager, getInterventionsReport);
router.get("/clients", requireManager, getClientsReport);
router.get("/maintenance", requireManager, getMaintenanceReport);

// Rapports financiers/stratégiques réservés au Владелец (OWNER)
router.get("/technicians", requireOwner, getTechniciansReport);
router.get("/sms", requireOwner, getSmsReport);

export default router;
