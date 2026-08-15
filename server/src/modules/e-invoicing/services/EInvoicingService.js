import { prisma } from "../../../config/db.js";
import { ProviderFactory } from "../providers/ProviderFactory.js";
import { CanonicalInvoiceMapper } from "./CanonicalInvoiceMapper.js";
import { EInvoicingValidator } from "./EInvoicingValidator.js";
import { JobQueueService } from "./JobQueueService.js";
import { ReconciliationService } from "./ReconciliationService.js";

/**
 * Main E-Invoicing Service Facade for the CRM
 */
export class EInvoicingService {
    /**
     * Get available providers metadata
     */
    static getAvailableProviders() {
        return [
            {
                id: "B2BROUTER",
                name: "B2Brouter",
                description: "Plateforme Agréée certifiée DGFiP pour facturation électronique et e-reporting B2B / B2G.",
                status: "ACTIVE",
                receptionReady2026: true,
                emissionReady2027: true,
                supportedEnvironments: ["sandbox", "production"],
                docsUrl: "https://developer.b2brouter.net"
            },
            {
                id: "PENNYLANE",
                name: "Pennylane",
                description: "Plateforme Agréée partenaire comptable.",
                status: "BETA",
                receptionReady2026: true,
                emissionReady2027: true,
                supportedEnvironments: ["production"],
                docsUrl: "https://pennylane.readme.io"
            },
            {
                id: "SAGE",
                name: "Sage Network",
                description: "Réseau de facturation électronique Sage.",
                status: "COMING_SOON",
                receptionReady2026: true,
                emissionReady2027: true,
                supportedEnvironments: ["sandbox", "production"],
                docsUrl: "https://developer.sage.com"
            }
        ];
    }

    /**
     * Connect company to a provider
     */
    static async connectCompany(companyId, credentials) {
        const providerName = credentials.provider || "B2BROUTER";
        const provider = ProviderFactory.getProvider(providerName);
        return await provider.connectCompany(companyId, credentials);
    }

    /**
     * Disconnect company
     */
    static async disconnectCompany(companyId) {
        const provider = await ProviderFactory.getProviderForCompany(companyId);
        return await provider.disconnectCompany(companyId);
    }

    /**
     * Test active connection
     */
    static async testConnection(companyId) {
        const provider = await ProviderFactory.getProviderForCompany(companyId);
        return await provider.testConnection(companyId);
    }

    /**
     * Get company connection details (WITHOUT exposing plaintext secrets)
     */
    static async getConnection(companyId) {
        const [connection, company] = await Promise.all([
            prisma.eInvoicingConnection.findUnique({
                where: { companyId }
            }),
            prisma.company.findUnique({
                where: { id: companyId },
                select: {
                    id: true,
                    name: true,
                    siret: true,
                    siren: true,
                    tvaNumber: true,
                    address: true,
                    city: true,
                    postalCode: true,
                    legalForm: true
                }
            })
        ]);

        const formattedCompany = company ? {
            ...company,
            siren: company.siren || (company.siret ? company.siret.replace(/\s+/g, "").substring(0, 9) : null),
            tvaNumber: company.tvaNumber || (company.siret ? `FR${(12 + (3 * (parseInt(company.siret.replace(/\s+/g, "").substring(0, 9), 10) % 97))) % 97}${company.siret.replace(/\s+/g, "").substring(0, 9)}` : null)
        } : null;

        if (!connection) {
            return {
                connected: false,
                status: "DISCONNECTED",
                provider: "B2BROUTER",
                receivingEnabled: true,
                emissionEnabled: false,
                company: formattedCompany
            };
        }

        return {
            id: connection.id,
            connected: connection.status === "CONNECTED",
            status: connection.status,
            provider: connection.provider,
            providerAccountId: connection.providerAccountId,
            environment: connection.environment,
            receivingEnabled: connection.receivingEnabled,
            emissionEnabled: connection.emissionEnabled,
            autoSyncIncoming: connection.autoSyncIncoming,
            lastSyncAt: connection.lastSyncAt,
            lastSyncError: connection.lastSyncError,
            company: formattedCompany
        };
    }

    /**
     * Transmit / Prepare Outgoing E-Invoice
     */
    static async transmitInvoice(companyId, invoiceId, options = {}) {
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, companyId },
            include: {
                client: true,
                company: { include: { settings: true } },
                lines: { orderBy: { position: "asc" } }
            }
        });

        if (!invoice) throw new Error("Facture introuvable");

        const canonical = CanonicalInvoiceMapper.toCanonicalInvoice(invoice);
        const validation = EInvoicingValidator.validate(canonical);

        if (!validation.valid) {
            const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(" | ");
            throw new Error(`Validation e-invoicing échouée: ${errorMessages}`);
        }

        // Asynchronously enqueue creation and sending
        const job = await JobQueueService.enqueue(companyId, "CREATE_E_INVOICE", {
            invoiceId,
            sendImmediately: options.sendImmediately !== false
        });

        // Set status to PROCESSING
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                einvoicingStatus: "PROCESSING",
                einvoicingError: null
            }
        });

        return {
            success: true,
            jobId: job.id,
            status: "PROCESSING",
            validation
        };
    }

    /**
     * Get received supplier invoices
     */
    static async getReceivedInvoices(companyId, query = {}) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where = {
            companyId,
            ...(query.status && { status: query.status }),
            ...(query.search && {
                OR: [
                    { invoiceNumber: { contains: query.search, mode: "insensitive" } },
                    { supplierName: { contains: query.search, mode: "insensitive" } },
                    { supplierSiret: { contains: query.search, mode: "insensitive" } }
                ]
            })
        };

        const [total, invoices] = await Promise.all([
            prisma.receivedInvoice.count({ where }),
            prisma.receivedInvoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { issueDate: "desc" }
            })
        ]);

        return {
            invoices,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get single received invoice by ID
     */
    static async getReceivedInvoiceById(companyId, id) {
        return await prisma.receivedInvoice.findFirst({
            where: { id, companyId },
            include: { events: { orderBy: { createdAt: "desc" } } }
        });
    }

    /**
     * Download original / Factur-X / PDF document
     */
    static async downloadReceivedInvoice(companyId, id, format = "pdf") {
        const received = await prisma.receivedInvoice.findFirst({
            where: { id, companyId }
        });
        if (!received) throw new Error("Facture reçue introuvable");

        const provider = await ProviderFactory.getProviderForCompany(companyId);
        return await provider.downloadInvoice(companyId, received.providerInvoiceId, format);
    }

    /**
     * Cancel an electronic invoice
     */
    static async cancelInvoice(companyId, invoiceId, reason) {
        const invoice = await prisma.invoice.findFirst({
            where: { id: invoiceId, companyId }
        });
        if (!invoice) throw new Error("Facture introuvable");

        if (invoice.providerInvoiceId) {
            const provider = await ProviderFactory.getProviderForCompany(companyId);
            await provider.cancelInvoice(companyId, invoice.providerInvoiceId, reason);
        }

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                einvoicingStatus: "CANCELLED",
                status: "CANCELLED"
            }
        });

        return { success: true, status: "CANCELLED" };
    }

    /**
     * Trigger manual or automated reconciliation
     */
    static async runReconciliation(companyId) {
        return await ReconciliationService.runReconciliation(companyId);
    }

    /**
     * Handle incoming provider webhook
     */
    static async handleWebhook(providerName, payload, headers) {
        const provider = ProviderFactory.getProvider(providerName);
        return await provider.handleWebhook(payload, headers);
    }
}
