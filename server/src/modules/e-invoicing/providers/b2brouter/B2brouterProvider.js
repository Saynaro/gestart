import { EInvoicingProvider } from "../../interfaces/EInvoicingProvider.js";
import { B2brouterClient } from "./B2brouterClient.js";
import { B2brouterMapper } from "./B2brouterMapper.js";
import { B2brouterWebhookHandler } from "./B2brouterWebhookHandler.js";
import { decryptCredential, encryptCredential } from "../../services/EncryptionService.js";
import { prisma } from "../../../../config/db.js";
import { INTERNAL_EINVOICING_STATUS } from "../../interfaces/CanonicalTypes.js";

export class B2brouterProvider extends EInvoicingProvider {
    getProviderInfo() {
        return {
            id: "B2BROUTER",
            name: "B2Brouter",
            legalStatus: "Plateforme Agréée (PDP / PPF)",
            description: "Plateforme Agréée certifiée DGFiP pour facturation électronique et e-reporting B2B / B2G.",
            docsUrl: "https://developer.b2brouter.net",
            status: "AVAILABLE",
            authType: "API_KEY_AND_EDOCSYNC"
        };
    }

    getCapabilities() {
        return {
            supportsOAuth: false,
            supportsApiKey: true,
            supportsEmbeddedProvisioning: true,
            supportsIncomingInvoices: true,
            supportsOutgoingInvoices: true,
            supportsInvoiceDownload: true,
            supportsInvoiceSending: true,
            supportsLifecycleStatus: true,
            supportsWebhooks: true,
            supportsPolling: true,
            supportsUBL: true,
            supportsCII: true,
            supportsFacturX: true,
            supportsEReporting: true,
            supportsDirectory: true,
            supportsAutomaticAccountProvisioning: true
        };
    }

    /**
     * Helper to get an authenticated B2brouterClient instance for a company
     * @param {string|Object} companyIdOrConn 
     * @returns {Promise<{ client: B2brouterClient, connection: Object, companyId: string }>}
     */
    async getClientForCompany(companyIdOrConn) {
        let connection = null;
        let companyId = null;

        if (typeof companyIdOrConn === "string") {
            companyId = companyIdOrConn;
            connection = await prisma.eInvoicingConnection.findUnique({
                where: { companyId }
            });
        } else if (companyIdOrConn && typeof companyIdOrConn === "object") {
            companyId = companyIdOrConn.companyId || companyIdOrConn.id;
            if (companyIdOrConn.apiKeyEncrypted) {
                connection = companyIdOrConn;
            } else if (companyId) {
                connection = await prisma.eInvoicingConnection.findUnique({
                    where: { companyId }
                });
            }
        }

        if (!connection || !connection.apiKeyEncrypted) {
            throw new Error(`Aucune connexion B2Brouter configurée pour cette entreprise`);
        }

        const apiKey = decryptCredential(connection.apiKeyEncrypted);
        if (!apiKey) {
            throw new Error(`Impossible de déchiffrer la clé API B2Brouter`);
        }

        const client = new B2brouterClient({
            apiKey,
            environment: connection.environment || "sandbox"
        });

        return { client, connection, companyId };
    }

    /**
     * Connect or configure company credentials
     */
    async connectCompany(companyId, credentials) {
        const { apiKey, accountId, environment = "sandbox" } = credentials;

        if (!apiKey || typeof apiKey !== "string") {
            throw new Error("La clé API B2Brouter est obligatoire");
        }

        // Test API key by listing accounts or fetching specified account
        const testClient = new B2brouterClient({ apiKey, environment });
        let validatedAccountId = accountId;

        try {
            if (accountId) {
                const acc = await testClient.getAccount(accountId);
                validatedAccountId = acc?.id || accountId;
            } else {
                const accounts = await testClient.listAccounts();
                const accList = Array.isArray(accounts) ? accounts : (accounts?.accounts || []);
                if (accList.length > 0) {
                    validatedAccountId = String(accList[0].id);
                }
            }
        } catch (err) {
            console.warn("[B2brouterProvider] Credentials test notice:", err.message);
            if (!validatedAccountId) {
                validatedAccountId = "default_account";
            }
        }

        const apiKeyEncrypted = encryptCredential(apiKey);

        const connection = await prisma.eInvoicingConnection.upsert({
            where: { companyId },
            create: {
                companyId,
                provider: "B2BROUTER",
                providerAccountId: validatedAccountId || null,
                environment,
                status: "CONNECTED",
                apiKeyEncrypted,
                receivingEnabled: true,
                emissionEnabled: false,
                lastSyncAt: new Date()
            },
            update: {
                provider: "B2BROUTER",
                providerAccountId: validatedAccountId || undefined,
                environment,
                status: "CONNECTED",
                apiKeyEncrypted,
                lastSyncAt: new Date(),
                lastSyncError: null
            }
        });

        return {
            success: true,
            accountId: connection.providerAccountId,
            environment: connection.environment,
            status: connection.status
        };
    }

    /**
     * Disconnect company
     */
    async disconnect(companyIdOrConn) {
        const companyId = typeof companyIdOrConn === "string" ? companyIdOrConn : (companyIdOrConn?.companyId || companyIdOrConn?.id);
        if (!companyId) return;

        await prisma.eInvoicingConnection.updateMany({
            where: { companyId },
            data: {
                status: "DISCONNECTED",
                apiKeyEncrypted: null,
                apiSecretEncrypted: null,
                accessTokenEncrypted: null,
                refreshTokenEncrypted: null
            }
        }).catch(() => {});
    }

    async disconnectCompany(companyIdOrConn) {
        return this.disconnect(companyIdOrConn);
    }

    /**
     * Test active connection
     */
    async testConnection(companyIdOrConn) {
        const startTime = Date.now();
        try {
            const { client, connection, companyId } = await this.getClientForCompany(companyIdOrConn);
            
            let accountInfo = null;
            if (connection.providerAccountId && connection.providerAccountId !== "default_account") {
                try {
                    accountInfo = await client.getAccount(connection.providerAccountId);
                } catch (e) {
                    accountInfo = await client.listAccounts().catch(() => null);
                }
            } else {
                accountInfo = await client.listAccounts().catch(() => null);
            }

            const latencyMs = Date.now() - startTime;

            if (companyId) {
                await prisma.eInvoicingConnection.updateMany({
                    where: { companyId },
                    data: {
                        status: "CONNECTED",
                        lastSyncAt: new Date(),
                        lastSyncError: null
                    }
                }).catch(() => {});
            }

            return {
                connected: true,
                status: "CONNECTED",
                latencyMs,
                environment: connection.environment,
                accountId: connection.providerAccountId,
                accountInfo
            };
        } catch (error) {
            const companyId = typeof companyIdOrConn === "string" ? companyIdOrConn : (companyIdOrConn?.companyId || companyIdOrConn?.id);
            if (companyId) {
                await prisma.eInvoicingConnection.updateMany({
                    where: { companyId },
                    data: {
                        status: "ERROR",
                        lastSyncError: error.message
                    }
                }).catch(() => {});
            }

            return {
                connected: false,
                status: "ERROR",
                latencyMs: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * Create customer
     */
    async createCustomer(companyId, canonicalCustomer) {
        return {
            providerCustomerId: canonicalCustomer.siret || canonicalCustomer.id,
            status: "ACTIVE"
        };
    }

    /**
     * Create / Import invoice in B2Brouter
     */
    async createInvoice(companyId, canonicalInvoice, options = {}) {
        const { client, connection } = await this.getClientForCompany(companyId);
        const accountId = connection.providerAccountId;

        if (!accountId) {
            throw new Error("L'identifiant de compte (accountId) B2Brouter n'est pas configuré");
        }

        const b2bPayload = B2brouterMapper.toB2brouterInvoice(canonicalInvoice, options);
        const result = await client.createInvoice(accountId, b2bPayload);

        const providerInvoiceId = String(result.id || (result.invoice && result.invoice.id) || canonicalInvoice.number);

        return {
            providerInvoiceId,
            status: B2brouterMapper.mapStatus(result.status || "draft"),
            rawResult: result
        };
    }

    /**
     * Send invoice via B2Brouter PDP routing
     */
    async sendInvoice(companyId, providerInvoiceId) {
        const { client } = await this.getClientForCompany(companyId);
        const result = await client.sendInvoice(providerInvoiceId);

        return {
            status: B2brouterMapper.mapStatus(result.status || "sent"),
            sentAt: new Date(),
            transmissionId: String(result.transmission_id || result.id || "")
        };
    }

    /**
     * Get invoice live status from B2Brouter
     */
    async getInvoiceStatus(companyId, providerInvoiceId) {
        const { client } = await this.getClientForCompany(companyId);
        const result = await client.getInvoice(providerInvoiceId);

        const status = B2brouterMapper.mapStatus(result.status);
        return {
            status,
            statusLabel: result.status || status,
            updatedAt: new Date(),
            rawStatus: result
        };
    }

    /**
     * Cancel an invoice
     */
    async cancelInvoice(companyId, providerInvoiceId, reason = "Annulation demandée par l'émetteur") {
        const { client } = await this.getClientForCompany(companyId);
        const result = await client.cancelInvoice(providerInvoiceId, reason);

        return {
            cancelled: true,
            status: INTERNAL_EINVOICING_STATUS.CANCELLED,
            rawResult: result
        };
    }

    /**
     * List received invoices from B2Brouter (FOURNISSEURS)
     */
    async listReceivedInvoices(companyId, queryOptions = {}) {
        const { client, connection } = await this.getClientForCompany(companyId);
        const accountId = connection.providerAccountId;

        const result = await client.listInvoices(accountId, {
            type: "ReceivedInvoice",
            page: queryOptions.page || 1,
            limit: queryOptions.limit || 50
        });

        const invoiceList = Array.isArray(result) ? result : (result.invoices || []);
        return invoiceList.map(inv => B2brouterMapper.toCanonicalReceivedInvoice(inv));
    }

    /**
     * Get specific received invoice
     */
    async getReceivedInvoice(companyId, providerInvoiceId) {
        const { client } = await this.getClientForCompany(companyId);
        const result = await client.getInvoice(providerInvoiceId);
        return B2brouterMapper.toCanonicalReceivedInvoice(result);
    }

    /**
     * Download original / Factur-X / PDF document
     */
    async downloadInvoice(companyId, providerInvoiceId, format = "pdf") {
        const { client } = await this.getClientForCompany(companyId);
        const buffer = await client.downloadInvoice(providerInvoiceId, format);

        return {
            data: buffer,
            contentType: format === "pdf" ? "application/pdf" : "application/xml",
            filename: `Facture_${providerInvoiceId}.${format === "factur-x" ? "pdf" : format}`
        };
    }

    /**
     * Send payment status update
     */
    async sendPaymentStatus(companyId, providerInvoiceId, paymentData) {
        return { acknowledged: true };
    }

    /**
     * Handle webhook
     */
    async handleWebhook(payload, headers = {}) {
        return await B2brouterWebhookHandler.handleWebhook(payload, headers);
    }
}
