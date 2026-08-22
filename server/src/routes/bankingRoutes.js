import express from "express";
import {
    connectBanking,
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

// Actions de rapprochement et synchronisation
router.post("/connect", requireOwner, connectBanking);
router.post("/transactions/refresh", requireManager, refreshBankingTransactions);
router.post("/reconcile/:transactionId", requireManager, confirmReconciliationEndpoint);
router.delete("/reconcile/:transactionId", requireManager, ignoreReconciliationEndpoint);

export default router;
