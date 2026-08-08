import express from "express";
import {
    getMe,
    updateMe,
    uploadAvatar,
    deleteAvatar,
    getCompanyUsers,
    getUserById,
    updateUser,
    deleteUser,
    addPushToken,
    removePushToken
} from "../controllers/userController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";
import { uploadAvatarMiddleware } from "../config/cloudinary.js";

const router = express.Router();

// Current User Profile Routes
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

// Avatar Routes (avec middleware Cloudinary)
router.patch("/me/avatar", authMiddleware, uploadAvatarMiddleware, uploadAvatar);
router.delete("/me/avatar", authMiddleware, deleteAvatar);

// Company Users Management Routes
router.get("/", authMiddleware, getCompanyUsers);
router.get("/:id", authMiddleware, requireManager, getUserById);
router.patch("/:id", authMiddleware, requireOwner, updateUser);
router.delete("/:id", authMiddleware, requireOwner, deleteUser);

// Push Token Routes
router.post("/:id/push-token", authMiddleware, addPushToken);
router.delete("/:id/push-token/:tokenId", authMiddleware, removePushToken);

export default router;
