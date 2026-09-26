import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireSuperAdmin } from "../middlewares/checkRole.js";
import {
    getAdminStats,
    getAdminCompanies,
    updateAdminCompany,
    deleteAdminCompany,
    toggleCompanyStatus,
    getAdminActivities
} from "../controllers/adminController.js";

const router = express.Router();

// Apply authMiddleware and requireSuperAdmin to all admin routes
router.use(authMiddleware, requireSuperAdmin);

router.get("/stats", getAdminStats);
router.get("/companies", getAdminCompanies);
router.get("/activities", getAdminActivities);
router.put("/companies/:id", updateAdminCompany);
router.delete("/companies/:id", deleteAdminCompany);
router.post("/companies/:id/toggle-status", toggleCompanyStatus);

export default router;
