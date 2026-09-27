/**
 * Official Sage Active API Client
 * Documented at https://developer.sage.com/sageactive/
 */
export class SageActiveClient {
    /**
     * @param {Object} options
     * @param {string} options.accessToken
     * @param {string} [options.subscriptionKey]
     * @param {string} [options.environment='sandbox']
     */
    constructor({ accessToken, subscriptionKey, environment = "sandbox" }) {
        this.accessToken = accessToken;
        this.subscriptionKey = subscriptionKey || process.env.SAGE_ACTIVE_SUBSCRIPTION_KEY;
        this.baseUrl = environment === "production"
            ? "https://api.sage.com/active/v1"
            : "https://api-sandbox.sage.com/active/v1";
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
        const headers = {
            "Authorization": `Bearer ${this.accessToken}`,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey || "",
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
            throw new Error(`Sage Active API error (${res.status}): ${bodyText || res.statusText}`);
        }

        return await res.json();
    }

    async getCompanies() {
        return await this.request("/companies");
    }

    async createSalesInvoice(companyId, invoicePayload) {
        return await this.request(`/companies/${companyId}/sales_invoices`, {
            method: "POST",
            body: invoicePayload
        });
    }

    async getSalesInvoice(companyId, invoiceId) {
        return await this.request(`/companies/${companyId}/sales_invoices/${invoiceId}`);
    }
}
