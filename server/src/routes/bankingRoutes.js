import express from "express";
import {
    connectBanking,
    handleBankingCallback,
    disconnectBanking,
    getBankingAccounts,
    getBankingTransactions,
    refreshBankingTransactions,
    confirmReconciliationEndpoint,
    ignoreReconciliationEndpoint
} from "../controllers/bankingController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";

const router = express.Router();

router.use(authMiddleware);

// Lecture des données bancaires et transactions (Manager+)
router.get("/accounts", requireManager, getBankingAccounts);
router.get("/transactions", requireManager, getBankingTransactions);

// Actions de connexion, callback et synchronisation
router.post("/connect", requireOwner, connectBanking);
router.post("/callback", requireOwner, handleBankingCallback);
router.post("/disconnect", requireOwner, disconnectBanking);
router.post("/transactions/refresh", requireManager, refreshBankingTransactions);
router.post("/refresh", requireManager, refreshBankingTransactions);
router.post("/reconcile/:transactionId", requireManager, confirmReconciliationEndpoint);
router.delete("/reconcile/:transactionId", requireManager, ignoreReconciliationEndpoint);

export default router;
