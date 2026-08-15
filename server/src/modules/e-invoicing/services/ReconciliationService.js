import { prisma } from "../../../config/db.js";
import { ProviderFactory } from "../providers/ProviderFactory.js";
import { B2brouterMapper } from "../providers/b2brouter/B2brouterMapper.js";

/**
 * Reconciliation Service
 * Reconciles invoice statuses with the PA/PDP in case webhooks were dropped or delayed.
 */
export class ReconciliationService {
    /**
     * Run reconciliation for a specific company or all connected companies
     * @param {string} [targetCompanyId] 
     * @returns {Promise<{ reconciledCount: number, errors: Array<string> }>}
     */
    static async runReconciliation(targetCompanyId = null) {
        const whereClause = targetCompanyId 
            ? { companyId: targetCompanyId, status: "CONNECTED" }
            : { status: "CONNECTED" };

        const connections = await prisma.eInvoicingConnection.findMany({
            where: whereClause
        });

        let reconciledCount = 0;
        const errors = [];

        for (const conn of connections) {
            try {
                const provider = await ProviderFactory.getProviderForCompany(conn.companyId);

                // 1. Reconcile outgoing invoices in progress
                const pendingOutgoing = await prisma.invoice.findMany({
                    where: {
                        companyId: conn.companyId,
                        providerInvoiceId: { not: null },
                        einvoicingStatus: { in: ["PROCESSING", "SENT", "DRAFT"] }
                    },
                    take: 50
                });

                for (const inv of pendingOutgoing) {
                    try {
                        const statusResult = await provider.getInvoiceStatus(conn.companyId, inv.providerInvoiceId);
                        if (statusResult && statusResult.status !== inv.einvoicingStatus) {
                            await prisma.invoice.update({
                                where: { id: inv.id },
                                data: {
                                    einvoicingStatus: statusResult.status,
                                    einvoicingProcessedAt: new Date()
                                }
                            });
                            reconciledCount++;
                        }
                    } catch (err) {
                        errors.push(`[Outgoing Invoice ${inv.id}] ${err.message}`);
                    }
                }

                // 2. Reconcile incoming supplier invoices (RÉCEPTION 2026)
                if (conn.receivingEnabled && conn.providerAccountId) {
                    try {
                        const receivedList = await provider.listReceivedInvoices(conn.companyId, { limit: 50 });
                        for (const item of receivedList) {
                            const canonical = item.structuredData ? B2brouterMapper.toCanonicalReceivedInvoice(item.structuredData) : item;

                            await prisma.receivedInvoice.upsert({
                                where: {
                                    companyId_provider_providerInvoiceId: {
                                        companyId: conn.companyId,
                                        provider: conn.provider,
                                        providerInvoiceId: canonical.providerInvoiceId
                                    }
                                },
                                create: {
                                    companyId: conn.companyId,
                                    provider: conn.provider,
                                    providerInvoiceId: canonical.providerInvoiceId,
                                    supplierName: canonical.supplierName,
                                    supplierSiren: canonical.supplierSiren,
                                    supplierSiret: canonical.supplierSiret,
                                    supplierVatNumber: canonical.supplierVatNumber,
                                    supplierAddress: canonical.supplierAddress,
                                    supplierCity: canonical.supplierCity,
                                    supplierPostalCode: canonical.supplierPostalCode,
                                    supplierCountry: canonical.supplierCountry,
                                    supplierEmail: canonical.supplierEmail,
                                    invoiceNumber: canonical.invoiceNumber,
                                    issueDate: canonical.issueDate,
                                    dueDate: canonical.dueDate,
                                    currency: canonical.currency,
                                    totalHT: canonical.totalHT,
                                    totalVAT: canonical.totalVAT,
                                    totalTTC: canonical.totalTTC,
                                    status: canonical.status,
                                    structuredData: canonical.structuredData,
                                    documentUrl: canonical.documentUrl,
                                    rawFormat: canonical.rawFormat,
                                    receivedAt: new Date()
                                },
                                update: {
                                    status: canonical.status,
                                    totalHT: canonical.totalHT,
                                    totalVAT: canonical.totalVAT,
                                    totalTTC: canonical.totalTTC,
                                    documentUrl: canonical.documentUrl || undefined
                                }
                            });
                            reconciledCount++;
                        }
                    } catch (err) {
                        errors.push(`[Received Invoices Sync ${conn.companyId}] ${err.message}`);
                    }
                }

                // Update connection sync timestamp
                await prisma.eInvoicingConnection.update({
                    where: { id: conn.id },
                    data: { lastSyncAt: new Date(), lastSyncError: null }
                });

            } catch (connError) {
                errors.push(`[Company ${conn.companyId}] ${connError.message}`);
            }
        }

        return { reconciledCount, errors };
    }
}
