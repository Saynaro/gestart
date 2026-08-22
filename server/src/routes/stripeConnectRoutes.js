import express from "express";
import {
    startOnboarding,
    getConnectStatus,
    syncStatus,
    updatePaymentSettings,
    disconnectAccount,
    handleConnectCallback
} from "../controllers/stripeConnectController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/checkRole.js";

const router = express.Router();

// Callback Stripe Connect (Redirect public du navigateur)
router.get("/connect/callback", handleConnectCallback);

// Endpoints sécurisés pour la gestion de Stripe Connect et des paramètres de paiement
router.use(authMiddleware);

router.get("/connect/status", getConnectStatus);
router.post("/connect/sync", syncStatus);

// Actions d'administration réservées au propriétaire (OWNER)
router.post("/connect/onboard", requireOwner, startOnboarding);
router.put("/connect/settings", requireOwner, updatePaymentSettings);
router.delete("/connect", requireOwner, disconnectAccount);

export default router;
