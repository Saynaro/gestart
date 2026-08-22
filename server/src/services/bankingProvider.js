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

        // Flux Powens : création d'un temporary code / webview URL
        // https://docs.powens.com/
        const state = Buffer.from(JSON.stringify({ companyId, timestamp: Date.now() })).toString("base64");
        const connectUrl = `${this.baseUrl}/auth/webview/fr/connect?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${state}`;

        return {
            isConfigured: true,
            connectUrl,
            connectionId: `powens_temp_${Date.now()}`
        };
    }

    async getAccounts(connectionId) {
        if (!this.isConfigured) return [];
        // TODO: Appel API Powens GET /users/me/accounts
        return [];
    }

    async getTransactions(accountId, from, to) {
        if (!this.isConfigured) return [];
        // TODO: Appel API Powens GET /users/me/accounts/{id}/transactions
        return [];
    }

    async refreshTransactions(connectionId) {
        if (!this.isConfigured) return { success: false, syncedCount: 0 };
        // TODO: Appel API Powens POST /users/me/connections/{id}/sync
        return { success: true, syncedCount: 0 };
    }

    async disconnectBankAccount(connectionId) {
        if (!this.isConfigured) return { success: true };
        // TODO: Appel API Powens DELETE /users/me/connections/{id}
        return { success: true };
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
