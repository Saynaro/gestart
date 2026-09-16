import express from "express";
import {
    getEquipment,
    getDueSoonEquipment,
    getEquipmentById,
    createEquipment,
    updateEquipment,
    deleteEquipment
} from "../controllers/equipmentController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";
import { requireActive } from "../middlewares/requireActive.js";

const router = express.Router();

// Tous les endpoints d'équipement nécessitent l'authentification
router.use(authMiddleware);

// Routes spécifiques
router.get("/", getEquipment);
router.get("/due-soon", getDueSoonEquipment);
router.get("/:id", getEquipmentById);

// CRUD Équipement
router.post("/", requireActive, createEquipment);
router.patch("/:id", requireActive, updateEquipment);
router.delete("/:id", requireManager, requireActive, deleteEquipment);

export default router;
