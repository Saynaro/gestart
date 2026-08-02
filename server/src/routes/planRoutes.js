import express from "express";
import { getPlans, getPlanByName } from "../controllers/planController.js";

const router = express.Router();

// Public routes for landing page & pricing details
router.get("/", getPlans);
router.get("/:name", getPlanByName);

export default router;
