import crypto from "crypto";
import { prisma } from "../../../../config/db.js";
import { B2brouterMapper } from "./B2brouterMapper.js";
import { INTERNAL_EINVOICING_STATUS } from "../../interfaces/CanonicalTypes.js";

export class B2brouterWebhookHandler {
    /**
     * Verify HMAC-SHA256 signature if secret is provided in headers
     * @param {string|Buffer} rawBody 
     * @param {string} signature 
     * @param {string} secret 
     * @returns {boolean}
     */
    static verifySignature(rawBody, signature, secret) {
        if (!secret) return true; // If no webhook secret configured, fallback to token check
        if (!signature) return false;

        try {
            const hmac = crypto.createHmac("sha256", secret);
            const bodyString = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
            hmac.update(bodyString);
            const expected = hmac.digest("hex");
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        } catch (error) {
            console.error("[B2brouterWebhook] Signature verification error:", error.message);
            return false;
        }
    }

    /**
     * Process incoming webhook event with strict idempotency
     * @param {Object} payload 
     * @param {Object} headers 
     * @returns {Promise<{ success: boolean, eventType: string, idempotencyKey: string, duplicate?: boolean }>}
     */
    static async handleWebhook(payload, headers = {}) {
        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid webhook payload");
        }

        const eventType = payload.event || payload.type || payload.event_type || "unknown";
        const eventId = payload.id || payload.event_id || payload.delivery_id;
        const invoiceData = payload.invoice || payload.data || payload;
        const providerInvoiceId = String(invoiceData.id || invoiceData.invoice_id || "");
        const accountId = String(payload.account_id || invoiceData.account_id || "");

        // Generate unique idempotency key
        const idempotencyKey = eventId 
            ? `b2brouter_evt_${eventId}` 
            : `b2brouter_${eventType}_${providerInvoiceId}_${Date.now()}`;

        // Check if event was already processed
        const existingEvent = await prisma.eInvoicingEvent.findUnique({
            where: { idempotencyKey }
        });

        if (existingEvent) {
            console.log(`[B2brouterWebhook] Event already processed: ${idempotencyKey}`);
            return { success: true, eventType, idempotencyKey, duplicate: true };
        }

        // Find associated company by connection or providerAccountId
        let connection = null;
        if (accountId) {
            connection = await prisma.eInvoicingConnection.findFirst({
                where: {
                    provider: "B2BROUTER",
                    providerAccountId: accountId
                },
                include: { company: true }
            });
        }

        // If not found by accountId, try to find by outgoing invoice if matching
        let matchedInvoice = null;
        if (!connection && providerInvoiceId) {
            matchedInvoice = await prisma.invoice.findFirst({
                where: { providerInvoiceId },
                include: { company: true }
            });
            if (matchedInvoice) {
                connection = await prisma.eInvoicingConnection.findUnique({
                    where: { companyId: matchedInvoice.companyId },
                    include: { company: true }
                });
            }
        }

        // Default to first active B2Brouter connection in sandbox if multi-tenant lookup isn't passed in test
        if (!connection) {
            connection = await prisma.eInvoicingConnection.findFirst({
                where: { provider: "B2BROUTER", status: "CONNECTED" },
                include: { company: true }
            });
        }

        const companyId = connection ? connection.companyId : (matchedInvoice ? matchedInvoice.companyId : null);

        // Record incoming event in audit log
        const recordedEvent = await prisma.eInvoicingEvent.create({
            data: {
                companyId: companyId || "global",
                invoiceId: matchedInvoice ? matchedInvoice.id : null,
                provider: "B2BROUTER",
                providerInvoiceId: providerInvoiceId || null,
                eventType,
                providerStatus: invoiceData.status || null,
                idempotencyKey,
                payloadJson: payload,
                receivedAt: new Date()
            }
        });

        try {
            // Process according to event type
            if (eventType.includes("received") || payload.type === "ReceivedInvoice" || invoiceData.type === "ReceivedInvoice") {
                // Incoming supplier invoice (RÉCEPTION 2026)
                if (companyId) {
                    const canonical = B2brouterMapper.toCanonicalReceivedInvoice(invoiceData);
                    
                    const receivedInvoice = await prisma.receivedInvoice.upsert({
                        where: {
                            companyId_provider_providerInvoiceId: {
                                companyId,
                                provider: "B2BROUTER",
                                providerInvoiceId: canonical.providerInvoiceId
                            }
                        },
                        create: {
                            companyId,
                            provider: "B2BROUTER",
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
                            documentUrl: canonical.documentUrl || undefined,
                            structuredData: canonical.structuredData
                        }
                    });

                    // Link event to received invoice
                    await prisma.eInvoicingEvent.update({
                        where: { id: recordedEvent.id },
                        data: {
                            receivedInvoiceId: receivedInvoice.id,
                            processedAt: new Date()
                        }
                    });
                }
            } else {
                // Outgoing invoice status update
                if (providerInvoiceId) {
                    const invoice = matchedInvoice || await prisma.invoice.findFirst({
                        where: { providerInvoiceId }
                    });

                    if (invoice) {
                        const newStatus = B2brouterMapper.mapStatus(invoiceData.status);
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                einvoicingStatus: newStatus,
                                einvoicingProcessedAt: new Date()
                            }
                        });

                        await prisma.eInvoicingEvent.update({
                            where: { id: recordedEvent.id },
                            data: {
                                invoiceId: invoice.id,
                                processedAt: new Date()
                            }
                        });
                    }
                }
            }

            return { success: true, eventType, idempotencyKey };
        } catch (error) {
            console.error(`[B2brouterWebhook] Error processing event ${idempotencyKey}:`, error.message);
            await prisma.eInvoicingEvent.update({
                where: { id: recordedEvent.id },
                data: { errorMessage: error.message }
            });
            throw error;
        }
    }
}
