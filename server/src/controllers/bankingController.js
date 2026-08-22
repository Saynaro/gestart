import { prisma } from "../config/db.js";
import { getBankingProvider } from "../services/bankingProvider.js";
import {
    confirmReconciliation,
    ignoreReconciliation,
    matchTransactionWithInvoices
} from "../services/reconciliationEngine.js";

/**
 * Initie la connexion bancaire Open Banking (Powens)
 * POST /api/v1/banking/connect
 */
export const connectBanking = async (req, res) => {
    const companyId = req.user.companyId;
    const { redirectUrl } = req.body || {};
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    try {
        const provider = getBankingProvider();
        const callbackUrl = redirectUrl || `${frontendUrl}/settings?tab=paiements&banking=success`;
        const result = await provider.connectBankAccount(companyId, callbackUrl);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("CONNECT BANKING ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de l'initialisation Open Banking"
        });
    }
};

/**
 * Récupère les comptes bancaires connectés
 * GET /api/v1/banking/accounts
 */
export const getBankingAccounts = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const connection = await prisma.bankConnection.findUnique({
            where: { companyId },
            include: { accounts: true }
        });

        return res.status(200).json({
            success: true,
            data: {
                isConnected: Boolean(connection && connection.status === "ACTIVE"),
                connection,
                accounts: connection?.accounts || []
            }
        });
    } catch (error) {
        console.error("GET BANKING ACCOUNTS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des comptes bancaires"
        });
    }
};

/**
 * Récupère les transactions bancaires et le statut de rapprochement
 * GET /api/v1/banking/transactions
 */
export const getBankingTransactions = async (req, res) => {
    const companyId = req.user.companyId;
    const { status } = req.query;

    try {
        const where = {
            companyId,
            ...(status ? { reconciliationStatus: status } : {})
        };

        const transactions = await prisma.bankTransaction.findMany({
            where,
            orderBy: { transactionDate: "desc" },
            take: 50,
            include: {
                matchedInvoice: {
                    select: {
                        id: true,
                        number: true,
                        amountTTC: true,
                        status: true,
                        client: {
                            select: {
                                firstName: true,
                                lastName: true,
                                companyName: true
                            }
                        }
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: { transactions }
        });
    } catch (error) {
        console.error("GET BANKING TRANSACTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des transactions"
        });
    }
};

/**
 * Synchronise et déclenche le moteur de rapprochement automatique
 * POST /api/v1/banking/transactions/refresh
 */
export const refreshBankingTransactions = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const provider = getBankingProvider();
        const connection = await prisma.bankConnection.findUnique({ where: { companyId } });

        if (connection) {
            await provider.refreshTransactions(connection.connectionId);
        }

        // Exécute le moteur de rapprochement sur toutes les transactions bancaires non traitées
        const pendingTxs = await prisma.bankTransaction.findMany({
            where: {
                companyId,
                reconciliationStatus: { in: ["PENDING", null] }
            }
        });

        let matchedCount = 0;
        let probableCount = 0;

        for (const tx of pendingTxs) {
            const result = await matchTransactionWithInvoices(tx.id);
            if (result?.status === "MATCHED") matchedCount++;
            if (result?.status === "PROBABLE") probableCount++;
        }

        return res.status(200).json({
            success: true,
            message: `Synchronisation terminée : ${matchedCount} facture(s) rapprochée(s) automatiquement, ${probableCount} à vérifier.`,
            data: { matchedCount, probableCount }
        });
    } catch (error) {
        console.error("REFRESH TRANSACTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la synchronisation bancaire"
        });
    }
};

/**
 * Confirme manuellement un rapprochement bancaire
 * POST /api/v1/banking/reconcile/:transactionId
 */
export const confirmReconciliationEndpoint = async (req, res) => {
    const { transactionId } = req.params;
    const { invoiceId } = req.body;
    const userId = req.user.id;

    if (!invoiceId) {
        return res.status(400).json({ success: false, message: "ID de la facture requis" });
    }

    try {
        await confirmReconciliation(transactionId, invoiceId, userId);
        return res.status(200).json({
            success: true,
            message: "Rapprochement bancaire validé avec succès. Facture marquée comme payée."
        });
    } catch (error) {
        console.error("CONFIRM RECONCILIATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la validation du rapprochement"
        });
    }
};

/**
 * Ignore une transaction pour le rapprochement
 * DELETE /api/v1/banking/reconcile/:transactionId
 */
export const ignoreReconciliationEndpoint = async (req, res) => {
    const { transactionId } = req.params;

    try {
        await ignoreReconciliation(transactionId);
        return res.status(200).json({
            success: true,
            message: "Transaction ignorée pour le rapprochement"
        });
    } catch (error) {
        console.error("IGNORE RECONCILIATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors du traitement de la transaction"
        });
    }
};
