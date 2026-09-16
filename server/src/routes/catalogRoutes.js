import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireActive } from "../middlewares/requireActive.js";
import {
    getCatalogItems,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem
} from "../controllers/catalogController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getCatalogItems);
router.post("/", requireActive, createCatalogItem);
router.put("/:id", requireActive, updateCatalogItem);
router.delete("/:id", requireActive, deleteCatalogItem);

export default router;
