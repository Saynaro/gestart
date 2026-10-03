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
        // 1. Check company subscription and plan limits
        const subscription = await prisma.subscription.findUnique({
            where: { companyId },
            include: { plan: true }
        });

        const now = new Date();
        const isTrialValid = subscription?.status === "TRIALING" && subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > now;
        const isActivePeriod = subscription?.status === "ACTIVE" && (!subscription?.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > now);
        const isLifetime = subscription?.status === "LIFETIME" || subscription?.status === "ACTIVE_TRIAL";

        if (!isTrialValid && !isActivePeriod && !isLifetime && (subscription?.status === "EXPIRED" || subscription?.status === "CANCELED" || (subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) <= now))) {
            return res.status(403).json({
                success: false,
                code: "SUBSCRIPTION_EXPIRED",
                message: "Votre abonnement a expiré. Veuillez renouveler votre offre pour connecter votre compte bancaire."
            });
        }

        const planName = (subscription?.plan?.name || "STARTER").toUpperCase();

        if (planName === "STARTER") {
            return res.status(403).json({
                success: false,
                code: "STARTER_LOCK",
                message: "La synchronisation bancaire automatique requiert le forfait Pro ou Unlimited."
            });
        }

        // 2. Count existing connected bank accounts
        const existingAccountsCount = await prisma.bankAccount.count({
            where: { companyId }
        });

        // Pro / Premium: 1 bank included. 2nd bank requires extra bank addon (+7€/mo)
        if (planName === "PRO" || planName === "PREMIUM") {
            const hasExtraAddon = Boolean(subscription?.stripeExtraBankSubscriptionItemId);
            if (existingAccountsCount >= 1 && !hasExtraAddon) {
                return res.status(403).json({
                    success: false,
                    code: "EXTRA_BANK_REQUIRED",
                    message: "Votre forfait Pro inclut 1 compte bancaire synchronisé. Pour connecter un deuxième compte, activez l'option à 7 €/mois ou passez au forfait Unlimited.",
                    currentAccounts: existingAccountsCount,
                    maxAccounts: 1,
                    planName: "Pro"
                });
            }

            if (existingAccountsCount >= 2) {
                return res.status(403).json({
                    success: false,
                    code: "LIMIT_REACHED",
                    message: "Limite maximale de 2 comptes bancaires atteinte pour le forfait Pro. Passez au forfait Unlimited pour connecter davantage de comptes.",
                    currentAccounts: existingAccountsCount,
                    maxAccounts: 2
                });
            }
        }

        // Unlimited: 3 banks included. 4th bank requires extra bank addon (+7€/mo)
        if (planName === "UNLIMITED") {
            const hasExtraAddon = Boolean(subscription?.stripeExtraBankSubscriptionItemId);
            if (existingAccountsCount >= 3 && !hasExtraAddon) {
                return res.status(403).json({
                    success: false,
                    code: "EXTRA_BANK_REQUIRED",
                    message: "Votre forfait Unlimited inclut 3 comptes bancaires synchronisés. Activez l'option à 7 €/mois pour connecter un compte supplémentaire.",
                    currentAccounts: existingAccountsCount,
                    maxAccounts: 3,
                    planName: "Unlimited"
                });
            }
        }

        const provider = getBankingProvider();
        const callbackUrl = redirectUrl || `${frontendUrl}/settings?tab=banques`;
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
 * Callback de finalisation de connexion bancaire (Powens Webview)
 * POST /api/v1/banking/callback
 */
export const handleBankingCallback = async (req, res) => {
    const companyId = req.user.companyId;
    const { connectionId, error, errorDescription } = req.body || {};

    if (error) {
        console.warn("Banking connection error from Powens:", error, errorDescription);
        return res.status(400).json({
            success: false,
            message: errorDescription || `Erreur Powens: ${error}`
        });
    }

    try {
        const connection = await prisma.bankConnection.findUnique({
            where: { companyId }
        });

        if (!connection || !connection.accessTokenEncrypted) {
            return res.status(404).json({
                success: false,
                message: "Session bancaire introuvable pour cette entreprise."
            });
        }

        const provider = getBankingProvider();
        const effectiveConnectionId = connectionId || connection.connectionId;

        // 1. Mettre à jour la connexion en ACTIVE
        const updatedConnection = await prisma.bankConnection.update({
            where: { companyId },
            data: {
                connectionId: String(effectiveConnectionId),
                status: "ACTIVE",
                lastSyncAt: new Date()
            }
        });

        // 2. Récupérer et sauvegarder les comptes bancaires
        const rawAccounts = await provider.getAccounts(connection.accessTokenEncrypted);
        const savedAccounts = [];

        for (const acc of rawAccounts) {
            const extId = String(acc.id);
            const existing = await prisma.bankAccount.findFirst({
                where: { companyId, externalId: extId }
            });

            const savedAcc = existing
                ? await prisma.bankAccount.update({
                    where: { id: existing.id },
                    data: {
                        iban: acc.iban || existing.iban,
                        bic: acc.bic || existing.bic,
                        accountName: acc.name || existing.accountName,
                        balance: typeof acc.balance === "number" ? acc.balance : existing.balance
                    }
                })
                : await prisma.bankAccount.create({
                    data: {
                        companyId,
                        bankConnectionId: updatedConnection.id,
                        externalId: extId,
                        iban: acc.iban || null,
                        bic: acc.bic || null,
                        accountName: acc.name || "Compte principal",
                        balance: typeof acc.balance === "number" ? acc.balance : 0,
                        currency: (acc.currency && acc.currency.id) || "EUR"
                    }
                });
            savedAccounts.push(savedAcc);
        }

        // 3. Récupérer les transactions initiales
        const rawTxs = await provider.getTransactions(connection.accessTokenEncrypted);
        let syncedCount = 0;

        for (const tx of rawTxs) {
            const extTxId = String(tx.id);
            const matchedDbAcc = savedAccounts.find(a => a.externalId === String(tx.id_account)) || savedAccounts[0];
            if (!matchedDbAcc) continue;

            const existingTx = await prisma.bankTransaction.findUnique({
                where: { externalTransactionId: extTxId }
            });

            if (!existingTx) {
                await prisma.bankTransaction.create({
                    data: {
                        companyId,
                        bankAccountId: matchedDbAcc.id,
                        externalTransactionId: extTxId,
                        amount: typeof tx.value === "number" ? tx.value : 0,
                        currency: "EUR",
                        label: tx.original_wording || tx.simplified_wording || "Virement",
                        reference: tx.reference || (tx.id ? `DISTYRA_${tx.id}` : null),
                        transactionDate: tx.date ? new Date(tx.date) : new Date(),
                        reconciliationStatus: "PENDING"
                    }
                });
                syncedCount++;
            }
        }

        // 4. Lancer la réconciliation automatique sur les virements créditeurs
        const pendingTxs = await prisma.bankTransaction.findMany({
            where: {
                companyId,
                reconciliationStatus: { in: ["PENDING", "PROBABLE"] },
                amount: { gt: 0 }
            }
        });
        for (const pTx of pendingTxs) {
            await matchTransactionWithInvoices(pTx.id);
        }

        return res.status(200).json({
            success: true,
            message: "Compte bancaire synchronisé avec succès.",
            data: {
                isConnected: true,
                connection: updatedConnection,
                accounts: savedAccounts,
                syncedTransactionsCount: syncedCount
            }
        });
    } catch (err) {
        console.error("HANDLE BANKING CALLBACK ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Erreur lors de la finalisation de la connexion bancaire."
        });
    }
};

/**
 * Déconnecte la banque liée
 * POST /api/v1/banking/disconnect
 */
export const disconnectBanking = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const connection = await prisma.bankConnection.findUnique({ where: { companyId } });
        if (connection) {
            const provider = getBankingProvider();
            if (connection.connectionId && connection.accessTokenEncrypted) {
                await provider.disconnectBankAccount(connection.connectionId, connection.accessTokenEncrypted);
            }
            await prisma.bankConnection.delete({ where: { companyId } });
        }

        return res.status(200).json({
            success: true,
            message: "Compte bancaire déconnecté avec succès."
        });
    } catch (error) {
        console.error("DISCONNECT BANKING ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la déconnexion bancaire"
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

        if (connection && connection.accessTokenEncrypted) {
            await provider.refreshTransactions(connection.connectionId, connection.accessTokenEncrypted);

            // Synchroniser les soldes des comptes
            const rawAccounts = await provider.getAccounts(connection.accessTokenEncrypted);
            for (const acc of rawAccounts) {
                const extId = String(acc.id);
                const existing = await prisma.bankAccount.findFirst({
                    where: { companyId, externalId: extId }
                });
                if (existing) {
                    await prisma.bankAccount.update({
                        where: { id: existing.id },
                        data: {
                            balance: typeof acc.balance === "number" ? acc.balance : existing.balance,
                            iban: acc.iban || existing.iban,
                            bic: acc.bic || existing.bic
                        }
                    });
                }
            }

            // Récupérer les nouvelles transactions
            const rawTxs = await provider.getTransactions(connection.accessTokenEncrypted);
            const dbAccounts = await prisma.bankAccount.findMany({ where: { companyId } });

            for (const tx of rawTxs) {
                const extTxId = String(tx.id);
                const matchedDbAcc = dbAccounts.find(a => a.externalId === String(tx.id_account)) || dbAccounts[0];
                if (!matchedDbAcc) continue;

                const existingTx = await prisma.bankTransaction.findUnique({
                    where: { externalTransactionId: extTxId }
                });

                if (!existingTx) {
                    await prisma.bankTransaction.create({
                        data: {
                            companyId,
                            bankAccountId: matchedDbAcc.id,
                            externalTransactionId: extTxId,
                            amount: typeof tx.value === "number" ? tx.value : 0,
                            currency: "EUR",
                            label: tx.original_wording || tx.simplified_wording || "Virement",
                            reference: tx.reference || (tx.id ? `DISTYRA_${tx.id}` : null),
                            transactionDate: tx.date ? new Date(tx.date) : new Date(),
                            reconciliationStatus: "PENDING"
                        }
                    });
                }
            }
        }

        // Exécute le moteur de rapprochement sur toutes les transactions bancaires non traitées
        const pendingTxs = await prisma.bankTransaction.findMany({
            where: {
                companyId,
                amount: { gt: 0 },
                OR: [
                    { reconciliationStatus: "PENDING" },
                    { reconciliationStatus: "PROBABLE" },
                    { reconciliationStatus: null }
                ]
            }
        });

        let matchedCount = 0;
        let probableCount = 0;

        for (const tx of pendingTxs) {
            const result = await matchTransactionWithInvoices(tx.id);
            if (result?.status === "MATCHED") matchedCount++;
            if (result?.status === "PROBABLE") probableCount++;
        }

        let summaryMsg = "Synchronisation bancaire terminée !";
        if (matchedCount > 0) {
            summaryMsg = `Synchronisation : ${matchedCount} facture(s) lettrée(s)`;
        } else if (probableCount > 0) {
            summaryMsg = `Synchronisation : ${probableCount} à vérifier`;
        }

        return res.status(200).json({
            success: true,
            message: summaryMsg,
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

/**
 * Récupère les factures ouvertes ou récentes pour association manuelle
 * GET /api/v1/banking/open-invoices
 */
export const getOpenInvoicesForReconciliation = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                status: { in: ["SENT", "OVERDUE", "DRAFT"] },
                paymentStatus: { not: "PAID" }
            },
            take: 100,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                number: true,
                amountTTC: true,
                amountPaid: true,
                status: true,
                paymentStatus: true,
                issuedAt: true,
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        email: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: { invoices }
        });
    } catch (error) {
        console.error("GET OPEN INVOICES ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des factures"
        });
    }
};
