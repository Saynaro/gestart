/**
 * Official Qonto REST API Client v2
 * Documented at https://docs.qonto.com/
 */
export class QontoClient {
    /**
     * @param {Object} options
     * @param {string} options.accessToken
     * @param {string} [options.environment='production']
     */
    constructor({ accessToken, environment = "production" }) {
        this.accessToken = accessToken;
        this.environment = environment;
        this.baseUrl = environment === "production"
            ? "https://thirdparty.qonto.com/v2"
            : "https://thirdparty-sandbox.qonto.com/v2";
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
        const headers = {
            "Authorization": `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(options.headers || {})
        };

        const res = await fetch(url, {
            method: options.method || "GET",
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!res.ok) {
            let bodyText = "";
            try { bodyText = await res.text(); } catch {}
            const err = new Error(`Qonto API Error ${res.status}: ${bodyText || res.statusText}`);
            err.status = res.status;
            throw err;
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            return await res.json();
        }
        if (contentType.includes("pdf") || contentType.includes("octet-stream")) {
            const buffer = await res.arrayBuffer();
            return Buffer.from(buffer);
        }
        return await res.text();
    }

    /**
     * Get organization info (Connectivity check)
     * Endpoint: GET /v2/organization
     */
    async getOrganization() {
        return await this.request("/organization");
    }

    /**
     * List incoming & outgoing client invoices
     * Endpoint: GET /v2/client_invoices
     */
    async listClientInvoices(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/client_invoices${query ? `?${query}` : ""}`);
    }

    /**
     * Create client invoice
     * Endpoint: POST /v2/client_invoices
     */
    async createClientInvoice(invoiceData) {
        return await this.request("/client_invoices", {
            method: "POST",
            body: { client_invoice: invoiceData }
        });
    }

    /**
     * Get client invoice details
     * Endpoint: GET /v2/client_invoices/:id
     */
    async getClientInvoice(id) {
        return await this.request(`/client_invoices/${id}`);
    }

    /**
     * Download invoice PDF/attachment
     * Endpoint: GET /v2/attachments/:id
     */
    async downloadAttachment(attachmentId) {
        return await this.request(`/attachments/${attachmentId}`);
    }
}
