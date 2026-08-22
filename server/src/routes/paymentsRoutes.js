import express from "express";
import { getPayments } from "../controllers/paymentsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

router.use(authMiddleware, requireManager);

router.get("/", getPayments);

export default router;
