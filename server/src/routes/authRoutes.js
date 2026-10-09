import express from "express";
import {
    register,
    login,
    logout,
    refresh,
    changePassword,
    getSecurityData,
    changeEmail,
    toggle2FA,
    verify2FALogin,
    revokeSession,
    revokeAllOtherSessions,
    googleLogin,
    googleCallback,
    appleLogin,
    sendVerificationCode,
    verifyCode,
    verifyEmail,
    forgotPassword,
    verifyResetToken,
    resetPassword
} from "../controllers/authController.js";
import { getMe } from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { authLimiter, registerLimiter, otpLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.post("/register", registerLimiter, register);
router.post("/login", authLimiter, login);
router.post("/2fa/verify-login", authLimiter, verify2FALogin);
router.post("/send-verification-code", otpLimiter, sendVerificationCode);
router.post("/verify-code", otpLimiter, verifyCode);
router.post("/verify-email", verifyEmail);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.get("/verify-reset-token", verifyResetToken);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/logout", logout);
router.post("/refresh", refresh);

// Security & Account Settings
router.get("/security", authMiddleware, getSecurityData);
router.patch("/change-email", authMiddleware, changeEmail);
router.post("/change-password", authMiddleware, changePassword);
router.patch("/change-password", authMiddleware, changePassword);
router.patch("/2fa/toggle", authMiddleware, toggle2FA);
router.delete("/sessions/:sessionId", authMiddleware, revokeSession);
router.delete("/sessions", authMiddleware, revokeAllOtherSessions);

// OAuth Social Logins
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.post("/google", registerLimiter, googleLogin);
router.post("/apple", registerLimiter, appleLogin);

export default router;

