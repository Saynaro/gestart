import express from "express";
import { getReferralStats, validateReferralCode } from "../controllers/referralController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public validation endpoint for registration form
router.get("/validate", validateReferralCode);
router.post("/validate", validateReferralCode);

// Private endpoints for logged-in users
router.get("/my-stats", authMiddleware, getReferralStats);
router.get("/", authMiddleware, getReferralStats);

export default router;
