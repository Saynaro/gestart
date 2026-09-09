import { prisma } from "../config/db.js";

/**
 * Abstraction du fournisseur Open Banking (Powens, GoCardless, etc.)
 * Permet de brancher n'importe quelle API bancaire sans toucher à la logique métier
 */
export class BankingProvider {
    /**
     * Initie le flux de connexion d'un compte bancaire
     * @param {string} companyId - ID de l'entreprise
     * @param {string} redirectUrl - URL de redirection après authentification bancaire
     * @returns {Promise<{ connectUrl: string, connectionId: string }>}
     */
    async connectBankAccount(companyId, redirectUrl) {
        throw new Error("connectBankAccount() non implémenté");
    }

    /**
     * Récupère la liste des comptes bancaires associés à une connexion
     * @param {string} connectionId - ID de la connexion bancaire
     * @returns {Promise<Array<{ id: string, iban: string, bic: string, name: string, balance: number, currency: string }>>}
     */
    async getAccounts(connectionId) {
        throw new Error("getAccounts() non implémenté");
    }

    /**
     * Récupère les transactions bancaires d'un compte sur une période
     * @param {string} accountId - ID externe du compte
     * @param {Date} [from] - Date de début
     * @param {Date} [to] - Date de fin
     * @returns {Promise<Array<{ id: string, amount: number, label: string, reference: string, date: Date, counterparty: string }>>}
     */
    async getTransactions(accountId, from, to) {
        throw new Error("getTransactions() non implémenté");
    }

    /**
     * Force la synchronisation des transactions pour une connexion
     * @param {string} connectionId - ID de la connexion bancaire
     * @returns {Promise<{ success: boolean, syncedCount: number }>}
     */
    async refreshTransactions(connectionId) {
        throw new Error("refreshTransactions() non implémenté");
    }

    /**
     * Déconnecte et révoque l'accès à un compte bancaire
     * @param {string} connectionId - ID de la connexion bancaire
     * @returns {Promise<{ success: boolean }>}
     */
    async disconnectBankAccount(connectionId) {
        throw new Error("disconnectBankAccount() non implémenté");
    }
}

/**
 * Implémentation du fournisseur Powens (anciennement Budget Insight)
 * Architecture prête pour intégration Sandbox puis Production
 */
export class PowensBankingProvider extends BankingProvider {
    constructor() {
        super();
        this.baseUrl = process.env.POWENS_BASE_URL || "https://sandbox.powens.com";
        this.clientId = process.env.POWENS_CLIENT_ID || "";
        this.clientSecret = process.env.POWENS_CLIENT_SECRET || "";
        this.isConfigured = Boolean(this.clientId && this.clientSecret);
    }

    async connectBankAccount(companyId, redirectUrl) {
        if (!this.isConfigured) {
            return {
                isConfigured: false,
                message: "Le module Open Banking Powens n'est pas encore configuré (clés API en attente).",
                connectUrl: null
            };
        }

        try {
            // 1. Initialisation / récupération du jeton utilisateur Powens
            const initRes = await fetch(`${this.baseUrl}/2.0/auth/init`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }).toString()
            });
            const initData = await initRes.json();

            if (!initData.auth_token) {
                console.error("Powens auth/init error:", initData);
                throw new Error(initData.description || "Échec d'initialisation de session Powens");
            }

            // 2. Enregistrer ou mettre à jour la connexion en attente avec ce jeton utilisateur
            await prisma.bankConnection.upsert({
                where: { companyId },
                create: {
                    companyId,
                    provider: "POWENS",
                    connectionId: "pending",
                    userId: String(initData.id_user || ""),
                    accessTokenEncrypted: initData.auth_token,
                    status: "PENDING"
                },
                update: {
                    provider: "POWENS",
                    userId: String(initData.id_user || ""),
                    accessTokenEncrypted: initData.auth_token,
                    status: "PENDING"
                }
            });

            // 3. Génération du code temporaire pour la Webview Connect
            const codeRes = await fetch(`${this.baseUrl}/2.0/auth/token/code`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${initData.auth_token}` }
            });
            const codeData = await codeRes.json();

            if (!codeData.code) {
                console.error("Powens auth/token/code error:", codeData);
                throw new Error(codeData.description || "Échec de génération du code Powens Webview");
            }

            // 3. Extraction du nom de domaine (ex: gestart-sandbox.biapi.pro)
            let domain = this.baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

            const state = Buffer.from(JSON.stringify({ companyId, timestamp: Date.now() })).toString("base64");
            const connectUrl = `https://webview.powens.com/fr/connect?domain=${domain}&client_id=${this.clientId}&code=${encodeURIComponent(codeData.code)}&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(state)}`;

            return {
                isConfigured: true,
                connectUrl,
                connectionId: `powens_temp_${Date.now()}`
            };
        } catch (err) {
            console.error("CONNECT BANKING POWENS ERROR:", err.message);
            throw err;
        }
    }

    async getAccounts(userToken) {
        if (!this.isConfigured || !userToken) return [];
        try {
            const res = await fetch(`${this.baseUrl}/2.0/users/me/accounts`, {
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            const data = await res.json();
            return data.accounts || [];
        } catch (err) {
            console.error("POWENS GET ACCOUNTS ERROR:", err.message);
            return [];
        }
    }

    async getTransactions(userToken, accountId) {
        if (!this.isConfigured || !userToken) return [];
        try {
            const endpoint = accountId
                ? `${this.baseUrl}/2.0/users/me/accounts/${accountId}/transactions?limit=100`
                : `${this.baseUrl}/2.0/users/me/transactions?limit=100`;

            const res = await fetch(endpoint, {
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            const data = await res.json();
            return data.transactions || [];
        } catch (err) {
            console.error("POWENS GET TRANSACTIONS ERROR:", err.message);
            return [];
        }
    }

    async refreshTransactions(connectionId, userToken) {
        if (!this.isConfigured || !userToken || !connectionId) return { success: false, syncedCount: 0 };
        try {
            const res = await fetch(`${this.baseUrl}/2.0/users/me/connections/${connectionId}/sync`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            const data = await res.json();
            return { success: true, data };
        } catch (err) {
            console.error("POWENS REFRESH ERROR:", err.message);
            return { success: false, syncedCount: 0 };
        }
    }

    async disconnectBankAccount(connectionId, userToken) {
        if (!this.isConfigured || !userToken || !connectionId) return { success: true };
        try {
            await fetch(`${this.baseUrl}/2.0/users/me/connections/${connectionId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${userToken}` }
            });
            return { success: true };
        } catch (err) {
            console.error("POWENS DISCONNECT ERROR:", err.message);
            return { success: false };
        }
    }
}

/**
 * Factory fournissant l'instance de provider actif
 * Pour changer de fournisseur à l'avenir (GoCardless, Tink...), il suffit de changer ici.
 */
let providerInstance = null;
export const getBankingProvider = () => {
    if (!providerInstance) {
        providerInstance = new PowensBankingProvider();
    }
    return providerInstance;
};
