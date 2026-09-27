import { DEFAULT_CAPABILITIES } from "./ProviderCapabilities.js";

/**
 * Universal E-Invoicing Provider Interface
 * All concrete PA adapters (B2Brouter, Qonto, Sage Active, Indy, Pennylane, etc.)
 * must implement this contract.
 */
export class EInvoicingProvider {
    /**
     * @returns {{ id: string, name: string, legalStatus: string, description: string, docsUrl: string, status: string }}
     */
    getProviderInfo() {
        throw new Error("Method getProviderInfo() must be implemented");
    }

    /**
     * @returns {import('./ProviderCapabilities.js').ProviderCapabilities}
     */
    getCapabilities() {
        return { ...DEFAULT_CAPABILITIES };
    }

    /**
     * Get OAuth 2.0 authorization URL
     * @param {Object} context { state: string, redirectUri: string, companyId: string }
     * @returns {Promise<string>}
     */
    async getAuthorizationUrl(context) {
        throw new Error("OAuth authorization is not supported by this provider");
    }

    /**
     * Handle OAuth 2.0 callback and token exchange
     * @param {Object} params { code: string, state: string, redirectUri: string }
     * @returns {Promise<{ accessToken: string, refreshToken?: string, expiresIn?: number, tokenType?: string, accountId?: string, organizationId?: string, scopes?: string[] }>}
     */
    async handleOAuthCallback(params) {
        throw new Error("OAuth callback is not supported by this provider");
    }

    /**
     * Refresh OAuth access token
     * @param {Object} connection
     * @returns {Promise<{ accessToken: string, refreshToken?: string, expiresIn?: number }>}
     */
    async refreshAccessToken(connection) {
        throw new Error("Token refresh is not supported by this provider");
    }

    /**
     * Connect or configure a company with API Key
     * @param {string} companyId
     * @param {Object} credentials
     * @returns {Promise<{ success: boolean, accountId?: string, message?: string }>}
     */
    async connect(credentials) {
        throw new Error("Method connect() must be implemented");
    }

    /**
     * Provision new account on PDP via White-Label eDocSync API
     * @param {Object} companyData
     * @returns {Promise<{ success: boolean, accountId: string, metadata?: any }>}
     */
    async provisionAccount(companyData) {
        throw new Error("Automatic account provisioning is not supported by this provider");
    }

    /**
     * Disconnect company
     * @param {Object} connection
     * @returns {Promise<void>}
     */
    async disconnect(connection) {
        throw new Error("Method disconnect() must be implemented");
    }

    /**
     * Test active connection with provider
     * @param {Object} connection
     * @returns {Promise<{ connected: boolean, status: string, latencyMs?: number, accountInfo?: any }>}
     */
    async testConnection(connection) {
        throw new Error("Method testConnection() must be implemented");
    }

    /**
     * Send / Transmit an electronic invoice
     * @param {Object} connection
     * @param {Object} canonicalInvoice
     * @param {Object} options
     * @returns {Promise<{ providerInvoiceId: string, transmissionId?: string, status: string, sentAt?: Date, warnings?: string[] }>}
     */
    async sendInvoice(connection, canonicalInvoice, options = {}) {
        throw new Error("Method sendInvoice() must be implemented");
    }

    /**
     * Get live status of an electronic invoice
     * @param {Object} connection
     * @param {string} providerInvoiceId
     * @returns {Promise<{ status: string, statusLabel: string, updatedAt: Date, reasonCode?: string, rawStatus?: any }>}
     */
    async getInvoiceStatus(connection, providerInvoiceId) {
        throw new Error("Method getInvoiceStatus() must be implemented");
    }

    /**
     * Get lifecycle events history for an invoice
     * @param {Object} connection
     * @param {string} providerInvoiceId
     * @returns {Promise<Array<{ eventId: string, status: string, reasonCode?: string, message?: string, occurredAt: Date, rawPayload?: any }>>}
     */
    async getLifecycleEvents(connection, providerInvoiceId) {
        return [];
    }

    /**
     * Cancel an electronic invoice
     * @param {Object} connection
     * @param {string} providerInvoiceId
     * @param {string} reason
     * @returns {Promise<{ cancelled: boolean, status: string }>}
     */
    async cancelInvoice(connection, providerInvoiceId, reason) {
        throw new Error("Method cancelInvoice() must be implemented");
    }

    /**
     * List incoming supplier invoices
     * @param {Object} connection
     * @param {Object} queryOptions
     * @returns {Promise<Array<Object>>}
     */
    async getIncomingInvoices(connection, queryOptions = {}) {
        return [];
    }

    /**
     * Get specific received invoice
     * @param {Object} connection
     * @param {string} providerInvoiceId
     * @returns {Promise<Object>}
     */
    async getInvoice(connection, providerInvoiceId) {
        throw new Error("Method getInvoice() must be implemented");
    }

    /**
     * Download original structured document or PDF
     * @param {Object} connection
     * @param {string} providerInvoiceId
     * @param {string} format 'pdf' | 'factur-x' | 'ubl' | 'xml'
     * @returns {Promise<{ data: Buffer, contentType: string, filename: string }>}
     */
    async downloadInvoice(connection, providerInvoiceId, format = "pdf") {
        throw new Error("Method downloadInvoice() must be implemented");
    }

    /**
     * Lookup addressing in directory (Annuaire / Routing)
     * @param {Object} connection
     * @param {string} identifier SIREN/SIRET
     * @returns {Promise<{ found: boolean, routingAddress?: string, platformId?: string, isEInvoicingRegistered?: boolean }>}
     */
    async getDirectoryInfo(connection, identifier) {
        return { found: false, isEInvoicingRegistered: false };
    }

    /**
     * Handle incoming webhook event
     * @param {Object} payload
     * @param {Object} headers
     * @returns {Promise<{ processed: boolean, eventType: string, idempotencyKey?: string, invoiceId?: string, status?: string }>}
     */
    async handleWebhook(payload, headers) {
        throw new Error("Method handleWebhook() must be implemented");
    }

    // ── Backward compatibility helpers ──────────────────────────
    async connectCompany(companyId, credentials) {
        return this.connect({ companyId, ...credentials });
    }

    async disconnectCompany(companyId) {
        return this.disconnect({ companyId });
    }

    async listReceivedInvoices(companyId, queryOptions = {}) {
        return this.getIncomingInvoices({ companyId }, queryOptions);
    }

    async getReceivedInvoice(companyId, providerInvoiceId) {
        return this.getInvoice({ companyId }, providerInvoiceId);
    }
}
