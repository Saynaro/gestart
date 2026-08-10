import express from "express";
import {
    getClients,
    exportClients,
    getUrgentClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    getClientInterventions,
    getClientInvoices,
    getClientSms,
    getClientEquipment
} from "../controllers/clientController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";
import { requireActive } from "../middlewares/requireActive.js";
import { checkLimits } from "../middlewares/checkLimits.js";

const router = express.Router();

// Tous les endpoints clients nécessitent une authentification
router.use(authMiddleware);

// Collections
router.get("/", requireActive, getClients);
router.get("/export", requireManager, exportClients);
router.get("/urgent", getUrgentClients);

// CRUD Client avec vérification des limites de plan
router.post("/", requireActive, checkLimits("client"), createClient);
router.get("/:id", getClientById);
router.patch("/:id", updateClient);
router.put("/:id", updateClient);
router.delete("/:id", requireManager, deleteClient);

// Relations Client
router.get("/:id/interventions", getClientInterventions);
router.get("/:id/invoices", getClientInvoices);
router.get("/:id/sms", getClientSms);
router.get("/:id/equipment", getClientEquipment);

export default router;
