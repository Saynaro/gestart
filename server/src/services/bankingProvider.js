import { prisma } from "../config/db.js";

/**
 * Abstraction du fournisseur Open Banking (Distyra, DSP2, GoCardless, etc.)
 */
export class BankingProvider {
    async connectBankAccount(companyId, redirectUrl) {
        throw new Error("connectBankAccount() non implémenté");
    }

    async getAccounts(userToken) {
        throw new Error("getAccounts() non implémenté");
    }

    async getTransactions(userToken, accountId) {
        throw new Error("getTransactions() non implémenté");
    }

    async refreshTransactions(connectionId, userToken) {
        throw new Error("refreshTransactions() non implémenté");
    }

    async disconnectBankAccount(connectionId, userToken) {
        throw new Error("disconnectBankAccount() non implémenté");
    }
}

/**
 * Implémentation officielle du fournisseur Open Banking Distyra (https://api.distyra.com)
 */
export class DistyraBankingProvider extends BankingProvider {
    constructor() {
        super();
        this.baseUrl = process.env.DISTYRA_API_URL || "https://api.distyra.com";
        this.apiKey = process.env.DISTYRA_API_KEY || "";
        this.isConfigured = Boolean(this.apiKey);
    }

    async connectBankAccount(companyId, redirectUrl) {
        if (!this.isConfigured) {
            return {
                isConfigured: false,
                message: "Le module Open Banking Distyra n'est pas encore configuré (DISTYRA_API_KEY requise).",
                connectUrl: null
            };
        }

        try {
            // 1. Initialisation du lien hébergé Distyra Connect (hosted-link)
            const res = await fetch(`${this.baseUrl}/v1/connect/hosted-link`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    country: "FR",
                    mode: "own",
                    return_url: redirectUrl
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.url) {
                throw new Error(data.detail || data.error || "Impossible d'initialiser la session Distyra Connect");
            }

            await prisma.bankConnection.upsert({
                where: { companyId },
                create: {
                    companyId,
                    provider: "DISTYRA",
                    connectionId: data.token || `distyra_pending_${Date.now()}`,
                    accessTokenEncrypted: data.token || this.apiKey,
                    status: "PENDING"
                },
                update: {
                    provider: "DISTYRA",
                    accessTokenEncrypted: data.token || this.apiKey,
                    status: "PENDING"
                }
            });

            return {
                isConfigured: true,
                connectUrl: data.url,
                token: data.token
            };
        } catch (err) {
            console.error("[DISTYRA CONNECT BANKING ERROR]:", err.message);
            return {
                isConfigured: false,
                message: `Erreur Distyra: ${err.message}`,
                connectUrl: null
            };
        }
    }

    async getAccounts(connectionId) {
        if (!this.isConfigured) return [];
        try {
            // 1. Si connectionId direct fourni
            if (connectionId && !connectionId.startsWith("distyra_pending") && !connectionId.startsWith("eyJ")) {
                const res = await fetch(`${this.baseUrl}/v1/connect/connections/${connectionId}/accounts`, {
                    headers: { "Authorization": `Bearer ${this.apiKey}` }
                });
                const data = await res.json().catch(() => ({}));
                if (data.accounts && Array.isArray(data.accounts)) {
                    return data.accounts.map(acc => ({
                        id: acc.account_id || acc.uid || acc.id,
                        connectionId,
                        name: acc.name || acc.holder_name || "Compte principal",
                        iban: acc.iban || acc.iban_masked || null,
                        bic: acc.bic || null,
                        balance: typeof acc.balance?.amount === "number" ? acc.balance.amount : (typeof acc.balance === "number" ? acc.balance : 0),
                        currency: acc.currency || acc.balance?.currency || "EUR"
                    }));
                }
            }

            // 2. Sinon interroger la liste des connexions actives
            const connRes = await fetch(`${this.baseUrl}/v1/connect/connections`, {
                headers: { "Authorization": `Bearer ${this.apiKey}` }
            });
            const connData = await connRes.json().catch(() => ({}));
            const connections = connData.connections || [];
            const allAccounts = [];

            for (const conn of connections) {
                if (conn.status === "active" || conn.status === "ACTIVE") {
                    const accRes = await fetch(`${this.baseUrl}/v1/connect/connections/${conn.id}/accounts`, {
                        headers: { "Authorization": `Bearer ${this.apiKey}` }
                    });
                    const accData = await accRes.json().catch(() => ({}));
                    if (accData.accounts && Array.isArray(accData.accounts)) {
                        for (const acc of accData.accounts) {
                            allAccounts.push({
                                id: acc.account_id || acc.uid || acc.id,
                                connectionId: conn.id,
                                name: acc.name || acc.holder_name || "Compte principal",
                                iban: acc.iban || acc.iban_masked || null,
                                bic: acc.bic || null,
                                balance: typeof acc.balance?.amount === "number" ? acc.balance.amount : (typeof acc.balance === "number" ? acc.balance : 0),
                                currency: acc.currency || acc.balance?.currency || "EUR"
                            });
                        }
                    }
                }
            }

            return allAccounts;
        } catch (err) {
            console.error("[DISTYRA GET ACCOUNTS ERROR]:", err.message);
            return [];
        }
    }

    async getTransactions(connectionId, accountId) {
        if (!this.isConfigured) return [];
        try {
            let targetConnectionId = connectionId;

            // Si le connectionId stocké est le token JWT temporaire ou absent, retrouver la connexion active
            if (!targetConnectionId || targetConnectionId.startsWith("distyra_pending") || targetConnectionId.startsWith("eyJ")) {
                const connRes = await fetch(`${this.baseUrl}/v1/connect/connections`, {
                    headers: { "Authorization": `Bearer ${this.apiKey}` }
                });
                const connData = await connRes.json().catch(() => ({}));
                const connections = connData.connections || [];
                if (connections.length > 0) {
                    targetConnectionId = connections[0].id;
                }
            }

            if (!targetConnectionId) return [];

            const res = await fetch(`${this.baseUrl}/v1/connect/connections/${targetConnectionId}/transactions?enrich=true`, {
                headers: { "Authorization": `Bearer ${this.apiKey}` }
            });
            const data = await res.json().catch(() => ({}));
            const txList = data.transactions || [];

            return txList.map(tx => ({
                id: tx.id || tx.entry_reference || tx.transaction_id,
                id_account: tx.account_id,
                value: typeof tx.amount === "number" ? tx.amount : 0,
                currency: tx.currency || "EUR",
                date: tx.booking_date || tx.date || tx.value_date || new Date().toISOString(),
                original_wording: tx.enrichment?.merchant?.name || tx.descriptor || tx.counterparty_name || (Array.isArray(tx.remittance_information) ? tx.remittance_information.join(" ") : "Virement"),
                simplified_wording: tx.enrichment?.merchant?.name || tx.descriptor || "Virement",
                counterparty: tx.counterparty_name || tx.enrichment?.merchant?.name || null,
                reference: tx.reference_number || (tx.id ? `DISTYRA_${tx.id}` : null)
            }));
        } catch (err) {
            console.error("[DISTYRA GET TRANSACTIONS ERROR]:", err.message);
            return [];
        }
    }

    async refreshTransactions(connectionId) {
        if (!this.isConfigured) return { success: false, syncedCount: 0 };
        try {
            const txs = await this.getTransactions(connectionId);
            return { success: true, count: txs.length };
        } catch (err) {
            console.error("[DISTYRA REFRESH ERROR]:", err.message);
            return { success: false, syncedCount: 0 };
        }
    }

    async disconnectBankAccount(connectionId) {
        if (!this.isConfigured || !connectionId) return { success: true };
        try {
            if (!connectionId.startsWith("distyra_pending") && !connectionId.startsWith("eyJ")) {
                await fetch(`${this.baseUrl}/v1/connect/connections/${connectionId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${this.apiKey}` }
                });
            }
            return { success: true };
        } catch (err) {
            console.error("[DISTYRA DISCONNECT ERROR]:", err.message);
            return { success: false };
        }
    }
}

let providerInstance = null;
export const getBankingProvider = () => {
    if (!providerInstance) {
        providerInstance = new DistyraBankingProvider();
    }
    return providerInstance;
};

