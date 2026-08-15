/**
 * Abstract E-Invoicing Provider Interface
 * All concrete providers (B2Brouter, Pennylane, Sage, etc.) must implement this interface.
 */

export class EInvoicingProvider {
    /**
     * Connect or configure a company with the provider
     * @param {string} companyId 
     * @param {Object} credentials 
     * @returns {Promise<{ success: boolean, accountId?: string, message?: string }>}
     */
    async connectCompany(companyId, credentials) {
        throw new Error("Method connectCompany() must be implemented");
    }

    /**
     * Disconnect company and revoke integration
     * @param {string} companyId 
     * @returns {Promise<void>}
     */
    async disconnectCompany(companyId) {
        throw new Error("Method disconnectCompany() must be implemented");
    }

    /**
     * Test active connection with provider API
     * @param {string} companyId 
     * @returns {Promise<{ connected: boolean, status: string, latencyMs?: number, accountInfo?: Object }>}
     */
    async testConnection(companyId) {
        throw new Error("Method testConnection() must be implemented");
    }

    /**
     * Create or sync customer / contact in provider directory
     * @param {string} companyId 
     * @param {Object} canonicalCustomer 
     * @returns {Promise<{ providerCustomerId: string, status: string }>}
     */
    async createCustomer(companyId, canonicalCustomer) {
        throw new Error("Method createCustomer() must be implemented");
    }

    /**
     * Create / Import invoice in provider
     * @param {string} companyId 
     * @param {Object} canonicalInvoice 
     * @param {Object} options 
     * @returns {Promise<{ providerInvoiceId: string, status: string, warnings?: string[] }>}
     */
    async createInvoice(companyId, canonicalInvoice, options = {}) {
        throw new Error("Method createInvoice() must be implemented");
    }

    /**
     * Transmit / Send created invoice via official e-invoicing network (PDP / PA routing)
     * @param {string} companyId 
     * @param {string} providerInvoiceId 
     * @returns {Promise<{ status: string, sentAt: Date, transmissionId?: string }>}
     */
    async sendInvoice(companyId, providerInvoiceId) {
        throw new Error("Method sendInvoice() must be implemented");
    }

    /**
     * Get live status of an outgoing invoice from provider
     * @param {string} companyId 
     * @param {string} providerInvoiceId 
     * @returns {Promise<{ status: string, statusLabel: string, updatedAt: Date, rawStatus?: any }>}
     */
    async getInvoiceStatus(companyId, providerInvoiceId) {
        throw new Error("Method getInvoiceStatus() must be implemented");
    }

    /**
     * Cancel an electronic invoice
     * @param {string} companyId 
     * @param {string} providerInvoiceId 
     * @param {string} reason 
     * @returns {Promise<{ cancelled: boolean, status: string }>}
     */
    async cancelInvoice(companyId, providerInvoiceId, reason) {
        throw new Error("Method cancelInvoice() must be implemented");
    }

    /**
     * List incoming supplier invoices received on PA
     * @param {string} companyId 
     * @param {Object} queryOptions 
     * @returns {Promise<Array<Object>>}
     */
    async listReceivedInvoices(companyId, queryOptions = {}) {
        throw new Error("Method listReceivedInvoices() must be implemented");
    }

    /**
     * Get specific received invoice metadata
     * @param {string} companyId 
     * @param {string} providerInvoiceId 
     * @returns {Promise<Object>}
     */
    async getReceivedInvoice(companyId, providerInvoiceId) {
        throw new Error("Method getReceivedInvoice() must be implemented");
    }

    /**
     * Download original structured document or visual PDF (Factur-X / UBL / CII)
     * @param {string} companyId 
     * @param {string} providerInvoiceId 
     * @param {string} format 'pdf' | 'factur-x' | 'ubl' | 'xml'
     * @returns {Promise<{ data: Buffer, contentType: string, filename: string }>}
     */
    async downloadInvoice(companyId, providerInvoiceId, format = 'pdf') {
        throw new Error("Method downloadInvoice() must be implemented");
    }

    /**
     * Send payment/settlement status update (E-reporting payment data)
     * @param {string} companyId 
     * @param {string} providerInvoiceId 
     * @param {Object} paymentData 
     * @returns {Promise<{ acknowledged: boolean }>}
     */
    async sendPaymentStatus(companyId, providerInvoiceId, paymentData) {
        throw new Error("Method sendPaymentStatus() must be implemented");
    }

    /**
     * Handle incoming webhook event from provider
     * @param {Object} payload 
     * @param {Object} headers 
     * @returns {Promise<{ processed: boolean, eventType: string, idempotencyKey?: string }>}
     */
    async handleWebhook(payload, headers) {
        throw new Error("Method handleWebhook() must be implemented");
    }
}
