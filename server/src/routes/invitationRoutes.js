import express from "express";
import {
    getInvitations,
    createInvitation,
    revokeInvitation,
    resendInvitation,
    checkInvitationToken,
    acceptInvitation
} from "../controllers/invitationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/checkRole.js";
import { checkLimits } from "../middlewares/checkLimits.js";

const router = express.Router();

// Routes publiques pour accepter l'invitation (par paramètre URL ou Body)
router.get("/accept/:token", checkInvitationToken);
router.post("/accept/:token", acceptInvitation);
router.post("/accept", acceptInvitation);

// Routes réservées au Владелец (OWNER) pour gérer l'équipe
router.get("/", authMiddleware, requireOwner, getInvitations);
router.post("/", authMiddleware, requireOwner, checkLimits("technician"), createInvitation);
router.delete("/:id", authMiddleware, requireOwner, revokeInvitation);
router.post("/resend/:id", authMiddleware, requireOwner, resendInvitation);

export default router;