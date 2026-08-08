import express from "express";
import { register, login, logout, refresh, changePassword, googleLogin, googleCallback, appleLogin, sendVerificationCode, verifyCode } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/send-verification-code", sendVerificationCode);
router.post("/verify-code", verifyCode);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/change-password", authMiddleware, changePassword);

// OAuth Social Logins
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.post("/google", googleLogin);
router.post("/apple", appleLogin);

export default router;
