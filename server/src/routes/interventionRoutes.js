import express from "express";
import {
    getInterventions,
    getTodayInterventions,
    getWeekInterventions,
    getInterventionById,
    createIntervention,
    updateIntervention,
    startIntervention,
    completeIntervention,
    deleteIntervention,
    uploadInterventionPhotos,
    deleteInterventionPhoto
} from "../controllers/interventionController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";
import { requireActive } from "../middlewares/requireActive.js";

const router = express.Router();

// Tous les endpoints nécessitent l'authentification
router.use(authMiddleware);

// Collections et vues spécialisées
router.get("/", getInterventions);
router.get("/today", getTodayInterventions);
router.get("/week", getWeekInterventions);
router.get("/:id", getInterventionById);

// CRUD et Actions du technicien
router.post("/", requireActive, createIntervention);
router.patch("/:id", updateIntervention);
router.patch("/:id/start", startIntervention);
router.patch("/:id/complete", completeIntervention);
router.delete("/:id", requireManager, deleteIntervention);

// Photos d'intervention (upload.array("photos", 10) pourra être inséré ici)
router.post("/:id/photos", uploadInterventionPhotos);
router.delete("/:id/photos/:photoId", deleteInterventionPhoto);

export default router;
