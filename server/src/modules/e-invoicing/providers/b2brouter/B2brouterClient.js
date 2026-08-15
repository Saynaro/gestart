/**
 * Official B2Brouter HTTP API Client
 * Documented at https://developer.b2brouter.net
 */

export class B2brouterClient {
    /**
     * @param {Object} config
     * @param {string} config.apiKey 
     * @param {string} [config.environment='sandbox'] 'sandbox' | 'production'
     * @param {string} [config.apiVersion='2026-06-26']
     */
    constructor({ apiKey, environment = "sandbox", apiVersion = "2026-06-26" }) {
        this.apiKey = apiKey;
        this.environment = environment;
        this.apiVersion = apiVersion;
        this.baseUrl = environment === "production" 
            ? "https://api.b2brouter.net" 
            : "https://api-staging.b2brouter.net";
    }

    /**
     * Perform HTTP request with exponential backoff for transient errors (429, 500, 502, 503, 504)
     * @param {string} endpoint 
     * @param {Object} options 
     * @returns {Promise<any>}
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
        const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
        let attempt = 0;
        let delay = 300;

        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-B2B-API-Key": this.apiKey,
            "X-B2B-API-Version": this.apiVersion,
            ...(options.headers || {})
        };

        while (attempt <= maxRetries) {
            try {
                const response = await fetch(url, {
                    method: options.method || "GET",
                    headers,
                    body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined
                });

                // Success
                if (response.ok) {
                    const contentType = response.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        return await response.json();
                    }
                    if (contentType.includes("application/pdf") || contentType.includes("application/xml") || contentType.includes("octet-stream")) {
                        const buffer = await response.arrayBuffer();
                        return Buffer.from(buffer);
                    }
                    return await response.text();
                }

                // Check for transient / retryable status codes
                const isTransient = [429, 500, 502, 503, 504].includes(response.status);
                if (isTransient && attempt < maxRetries) {
                    attempt++;
                    console.warn(`[B2brouterClient] Transient error ${response.status} on ${endpoint}, retry #${attempt} in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    continue;
                }

                // Permanent error
                let errorBody = {};
                try {
                    errorBody = await response.json();
                } catch {
                    errorBody = { message: await response.text() };
                }

                const error = new Error(errorBody.message || errorBody.error || `B2Brouter API error ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.details = errorBody;
                error.endpoint = endpoint;
                throw error;
            } catch (err) {
                if (err.status) throw err;

                // Network or connection error (retryable)
                if (attempt < maxRetries) {
                    attempt++;
                    console.warn(`[B2brouterClient] Network error on ${endpoint}, retry #${attempt} in ${delay}ms:`, err.message);
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    continue;
                }
                throw err;
            }
        }
    }

    /**
     * Get account details by account ID (verifies credentials & connectivity)
     * Endpoint: GET /accounts/{accountId}
     */
    async getAccount(accountId) {
        return await this.request(`/accounts/${accountId}`);
    }

    /**
     * List accessible accounts for the API key
     * Endpoint: GET /accounts/
     */
    async listAccounts() {
        return await this.request(`/accounts/`);
    }

    /**
     * Create connected account (for partner provisioning)
     * Endpoint: POST /accounts/
     */
    async createAccount(accountData) {
        return await this.request(`/accounts/`, {
            method: "POST",
            body: accountData
        });
    }

    /**
     * Create / Import invoice
     * Endpoint: POST /accounts/{accountId}/invoices
     * @param {string} accountId 
     * @param {Object} payload 
     * @returns {Promise<Object>}
     */
    async createInvoice(accountId, payload) {
        return await this.request(`/accounts/${accountId}/invoices`, {
            method: "POST",
            body: payload
        });
    }

    /**
     * Transmit / Send created invoice via e-invoicing network
     * Endpoint: POST /invoices/{invoiceId}/send
     * @param {string} invoiceId 
     * @returns {Promise<Object>}
     */
    async sendInvoice(invoiceId) {
        return await this.request(`/invoices/${invoiceId}/send`, {
            method: "POST"
        });
    }

    /**
     * Get invoice metadata & status
     * Endpoint: GET /invoices/{invoiceId}
     * @param {string} invoiceId 
     * @returns {Promise<Object>}
     */
    async getInvoice(invoiceId) {
        return await this.request(`/invoices/${invoiceId}`);
    }

    /**
     * Cancel an invoice
     * Endpoint: POST /invoices/{invoiceId}/cancel
     * @param {string} invoiceId 
     * @param {string} reason 
     * @returns {Promise<Object>}
     */
    async cancelInvoice(invoiceId, reason) {
        return await this.request(`/invoices/${invoiceId}/cancel`, {
            method: "POST",
            body: { reason }
        });
    }

    /**
     * List invoices (e.g. type=ReceivedInvoice for incoming supplier invoices, or type=IssuedInvoice)
     * Endpoint: GET /accounts/{accountId}/invoices
     * @param {string} accountId 
     * @param {Object} query 
     * @returns {Promise<Object>}
     */
    async listInvoices(accountId, query = {}) {
        const params = new URLSearchParams();
        if (query.type) params.append("type", query.type);
        if (query.page) params.append("page", query.page);
        if (query.limit) params.append("limit", query.limit);
        if (query.status) params.append("status", query.status);

        const queryString = params.toString() ? `?${params.toString()}` : "";
        return await this.request(`/accounts/${accountId}/invoices${queryString}`);
    }

    /**
     * Download original or visual invoice file (pdf, factur-x, ubl, xml)
     * Endpoint: GET /invoices/{invoiceId}/as/{format}
     * @param {string} invoiceId 
     * @param {string} format 'pdf' | 'factur-x' | 'ubl' | 'xml'
     * @returns {Promise<Buffer>}
     */
    async downloadInvoice(invoiceId, format = "pdf") {
        return await this.request(`/invoices/${invoiceId}/as/${format}`, {
            headers: {
                "Accept": format === "pdf" ? "application/pdf" : "application/xml"
            }
        });
    }

    /**
     * Register a webhook endpoint
     * Endpoint: POST /accounts/{accountId}/web_hooks
     * @param {string} accountId 
     * @param {Object} webhookData { url, events, secret }
     * @returns {Promise<Object>}
     */
    async registerWebhook(accountId, webhookData) {
        return await this.request(`/accounts/${accountId}/web_hooks`, {
            method: "POST",
            body: {
                web_hook: {
                    url: webhookData.url,
                    events: webhookData.events || [
                        "invoice_status_changed",
                        "invoice_received",
                        "invoice_rejected",
                        "invoice_paid"
                    ],
                    secret: webhookData.secret
                }
            }
        });
    }
}
