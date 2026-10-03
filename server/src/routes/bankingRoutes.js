import express from "express";
import {
    connectBanking,
    handleBankingCallback,
    disconnectBanking,
    getBankingAccounts,
    getBankingTransactions,
    refreshBankingTransactions,
    confirmReconciliationEndpoint,
    ignoreReconciliationEndpoint,
    getOpenInvoicesForReconciliation
} from "../controllers/bankingController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwner, requireManager } from "../middlewares/checkRole.js";
import { checkSubscription } from "../middlewares/checkSubscription.js";

const router = express.Router();

router.use(authMiddleware);

// Lecture des données bancaires et transactions locales (Manager+) - Toujours accessible en mode consultation
router.get("/accounts", requireManager, getBankingAccounts);
router.get("/transactions", requireManager, getBankingTransactions);
router.get("/open-invoices", requireManager, getOpenInvoicesForReconciliation);

// Actions de connexion, callback et synchronisation externe (Nécessite abonnement actif)
router.post("/connect", requireOwner, checkSubscription, connectBanking);
router.post("/callback", requireOwner, handleBankingCallback);
router.post("/disconnect", requireOwner, disconnectBanking);
router.post("/transactions/refresh", requireManager, checkSubscription, refreshBankingTransactions);
router.post("/refresh", requireManager, checkSubscription, refreshBankingTransactions);
router.post("/reconcile/:transactionId", requireManager, checkSubscription, confirmReconciliationEndpoint);
router.delete("/reconcile/:transactionId", requireManager, checkSubscription, ignoreReconciliationEndpoint);

export default router;
