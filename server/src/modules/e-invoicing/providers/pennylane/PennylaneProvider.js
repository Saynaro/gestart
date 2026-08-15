import { EInvoicingProvider } from "../../interfaces/EInvoicingProvider.js";

/**
 * Pennylane Provider Implementation (Scaffolding for Future Extension)
 * Documented at https://pennylane.readme.io
 */
export class PennylaneProvider extends EInvoicingProvider {
    async connectCompany(companyId, credentials) {
        return {
            success: true,
            provider: "PENNYLANE",
            status: "CONNECTED"
        };
    }

    async disconnectCompany(companyId) {
        return;
    }

    async testConnection(companyId) {
        return {
            connected: true,
            status: "CONNECTED",
            provider: "PENNYLANE"
        };
    }

    async createCustomer(companyId, canonicalCustomer) {
        return { providerCustomerId: canonicalCustomer.id, status: "ACTIVE" };
    }

    async createInvoice(companyId, canonicalInvoice, options = {}) {
        return { providerInvoiceId: canonicalInvoice.number, status: "SENT" };
    }

    async sendInvoice(companyId, providerInvoiceId) {
        return { status: "SENT", sentAt: new Date() };
    }

    async getInvoiceStatus(companyId, providerInvoiceId) {
        return { status: "SENT", statusLabel: "Transmis à Pennylane", updatedAt: new Date() };
    }

    async cancelInvoice(companyId, providerInvoiceId, reason) {
        return { cancelled: true, status: "CANCELLED" };
    }

    async listReceivedInvoices(companyId, queryOptions = {}) {
        return [];
    }

    async getReceivedInvoice(companyId, providerInvoiceId) {
        return null;
    }

    async downloadInvoice(companyId, providerInvoiceId, format = "pdf") {
        return { data: Buffer.from(""), contentType: "application/pdf", filename: `pennylane_${providerInvoiceId}.pdf` };
    }

    async sendPaymentStatus(companyId, providerInvoiceId, paymentData) {
        return { acknowledged: true };
    }

    async handleWebhook(payload, headers = {}) {
        return { processed: true, eventType: "pennylane.event" };
    }
}
