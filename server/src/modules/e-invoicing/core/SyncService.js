import { ProviderFactory } from "../providers/ProviderFactory.js";
import { prisma } from "../../../config/db.js";
import { LifecycleNormalizer } from "./LifecycleNormalizer.js";

/**
 * Idempotent Synchronization Service for E-Invoicing
 */
export class SyncService {
    /**
     * Synchronize incoming supplier invoices from active Plateforme Agréée
     * @param {string} companyId
     * @returns {Promise<{ syncedCount: number, errors: string[] }>}
     */
    static async syncIncomingInvoices(companyId) {
        const connection = await prisma.eInvoicingConnection.findUnique({
            where: { companyId }
        });

        if (!connection || connection.status !== "CONNECTED") {
            return { syncedCount: 0, errors: ["Connexion active requise"] };
        }

        const provider = await ProviderFactory.getProviderForCompany(companyId);
        let incomingList = [];
        const errors = [];

        try {
            incomingList = await provider.listReceivedInvoices(companyId, { limit: 50 });
        } catch (err) {
            console.error(`[SyncService] Failed to fetch incoming invoices:`, err.message);
            errors.push(err.message);
            return { syncedCount: 0, errors };
        }

        let syncedCount = 0;
        for (const item of incomingList) {
            try {
                const providerInvoiceId = String(item.providerInvoiceId || item.id);
                const existing = await prisma.receivedInvoice.findUnique({
                    where: {
                        companyId_provider_providerInvoiceId: {
                            companyId,
                            provider: connection.provider,
                            providerInvoiceId
                        }
                    }
                });

                if (!existing) {
                    await prisma.receivedInvoice.create({
                        data: {
                            companyId,
                            provider: connection.provider,
                            providerInvoiceId,
                            supplierName: item.supplierName || "Fournisseur",
                            supplierSiren: item.supplierSiren || null,
                            supplierSiret: item.supplierSiret || null,
                            supplierVatNumber: item.supplierVatNumber || null,
                            supplierAddress: item.supplierAddress || null,
                            supplierCity: item.supplierCity || null,
                            supplierPostalCode: item.supplierPostalCode || null,
                            invoiceNumber: item.invoiceNumber || `REC-${providerInvoiceId}`,
                            issueDate: item.issueDate ? new Date(item.issueDate) : new Date(),
                            dueDate: item.dueDate ? new Date(item.dueDate) : null,
                            currency: item.currency || "EUR",
                            totalHT: Number(item.totalHT || 0),
                            totalVAT: Number(item.totalVAT || 0),
                            totalTTC: Number(item.totalTTC || 0),
                            status: "RECEIVED",
                            rawFormat: item.rawFormat || "Factur-X"
                        }
                    });
                    syncedCount++;
                }
            } catch (err) {
                console.warn(`[SyncService] Error saving received invoice:`, err.message);
            }
        }

        // Update last sync timestamp
        await prisma.eInvoicingConnection.update({
            where: { companyId },
            data: {
                lastSyncAt: new Date(),
                lastSyncError: errors.length > 0 ? errors.join("; ") : null
            }
        });

        return { syncedCount, errors };
    }

    /**
     * Synchronize outgoing invoice statuses from PA
     * @param {string} companyId
     * @returns {Promise<{ updatedCount: number }>}
     */
    static async syncOutgoingStatuses(companyId) {
        const pendingInvoices = await prisma.invoice.findMany({
            where: {
                companyId,
                einvoicingStatus: { in: ["PROCESSING", "SENT"] },
                providerInvoiceId: { not: null }
            }
        });

        if (pendingInvoices.length === 0) return { updatedCount: 0 };

        const provider = await ProviderFactory.getProviderForCompany(companyId);
        let updatedCount = 0;

        for (const invoice of pendingInvoices) {
            try {
                const statusInfo = await provider.getInvoiceStatus(companyId, invoice.providerInvoiceId);
                const normalized = LifecycleNormalizer.normalizeStatus(invoice.einvoicingProvider, statusInfo.status);

                if (normalized && normalized !== invoice.einvoicingStatus) {
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            einvoicingStatus: normalized,
                            einvoicingProcessedAt: new Date()
                        }
                    });
                    updatedCount++;
                }
            } catch (err) {
                console.warn(`[SyncService] Failed status sync for invoice ${invoice.id}:`, err.message);
            }
        }

        return { updatedCount };
    }
}
