import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireActive } from "../middlewares/requireActive.js";
import {
    getReminderDashboard,
    getReminderAutomations,
    createReminderAutomation,
    updateReminderAutomation,
    toggleReminderAutomation,
    executeReminderNow,
    deleteReminderAutomation,
    getReminderExecutions,
    getCompanyServices,
    createCompanyService,
    getTradePresets
} from "../controllers/reminderController.js";

const router = Router();

// Toutes les routes exigent l'authentification
router.use(authMiddleware);

// Dashboard & Statistiques
router.get("/dashboard", getReminderDashboard);

// Règles d'automatisation (CRUD + actions)
router.get("/automations", getReminderAutomations);
router.post("/automations", requireActive, createReminderAutomation);
router.put("/automations/:id", requireActive, updateReminderAutomation);
router.patch("/automations/:id/toggle", requireActive, toggleReminderAutomation);
router.post("/automations/:id/execute-now", requireActive, executeReminderNow);
router.delete("/automations/:id", requireActive, deleteReminderAutomation);

// Historique des exécutions & relances
router.get("/executions", getReminderExecutions);

// Catalogue de services multi-services par entreprise
router.get("/services", getCompanyServices);
router.post("/services", createCompanyService);

// Modèles métiers
router.get("/presets", getTradePresets);

export default router;
