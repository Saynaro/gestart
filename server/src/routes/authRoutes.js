import express from "express";
import { register, login, logout, refresh, changePassword, googleLogin, appleLogin } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.post("/refresh", refresh);
router.post("/change-password", authMiddleware, changePassword);

// OAuth Social Logins
router.post("/google", googleLogin);
router.post("/apple", appleLogin);

export default router;
