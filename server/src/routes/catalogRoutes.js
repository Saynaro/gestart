import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
    getCatalogItems,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem
} from "../controllers/catalogController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getCatalogItems);
router.post("/", createCatalogItem);
router.put("/:id", updateCatalogItem);
router.delete("/:id", deleteCatalogItem);

export default router;
