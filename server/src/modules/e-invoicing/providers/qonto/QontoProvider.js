import { EInvoicingProvider } from "../../interfaces/EInvoicingProvider.js";
import { QontoOAuth } from "./QontoOAuth.js";
import { QontoClient } from "./QontoClient.js";
import { decryptCredential, encryptCredential } from "../../services/EncryptionService.js";
import { prisma } from "../../../../config/db.js";

/**
 * Qonto E-Invoicing Provider Adapter
 * Implements official OAuth 2.0 and Invoicing endpoints for Qonto (French PA).
 */
export class QontoProvider extends EInvoicingProvider {
    getProviderInfo() {
        return {
            id: "QONTO",
            name: "Qonto",
            legalStatus: "Plateforme Agréée (PDP)",
            description: "Solution bancaire et plateforme agréée pour entreprises et indépendants.",
            docsUrl: "https://docs.qonto.com",
            status: "AVAILABLE",
            authType: "API_KEY"
        };
    }

    getCapabilities() {
        return {
            supportsOAuth: false,
            supportsApiKey: true,
            supportsEmbeddedProvisioning: false,
            supportsIncomingInvoices: true,
            supportsOutgoingInvoices: true,
            supportsInvoiceDownload: true,
            supportsInvoiceSending: true,
            supportsLifecycleStatus: true,
            supportsWebhooks: true,
            supportsPolling: true,
            supportsUBL: true,
            supportsCII: false,
            supportsFacturX: true,
            supportsEReporting: true,
            supportsDirectory: true,
            supportsAutomaticAccountProvisioning: false
        };
    }

    async getAuthorizationUrl(context) {
        return QontoOAuth.getAuthorizationUrl(context);
    }

    async handleOAuthCallback(params) {
        const tokenData = await QontoOAuth.exchangeCodeForTokens(params);

        const connectionData = {
            accessTokenEncrypted: encryptCredential(tokenData.accessToken),
            refreshTokenEncrypted: tokenData.refreshToken ? encryptCredential(tokenData.refreshToken) : null,
            tokenExpiresAt: tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null,
            providerOrganizationId: tokenData.organizationId || null,
            status: "CONNECTED"
        };

        return connectionData;
    }

    async connectCompany(companyId, credentials) {
        const { apiKey, accountId, environment = "sandbox" } = credentials;
        if (!apiKey) {
            throw new Error("La clé API ou le jeton secret Qonto est obligatoire");
        }

        const apiKeyEncrypted = encryptCredential(apiKey);

        const connection = await prisma.eInvoicingConnection.upsert({
            where: { companyId },
            create: {
                companyId,
                provider: "QONTO",
                providerOrganizationId: accountId || null,
                environment,
                status: "CONNECTED",
                apiKeyEncrypted,
                accessTokenEncrypted: apiKeyEncrypted,
                receivingEnabled: true,
                emissionEnabled: true,
                lastSyncAt: new Date()
            },
            update: {
                provider: "QONTO",
                providerOrganizationId: accountId || undefined,
                environment,
                status: "CONNECTED",
                apiKeyEncrypted,
                accessTokenEncrypted: apiKeyEncrypted,
                lastSyncAt: new Date(),
                lastSyncError: null
            }
        });

        return {
            success: true,
            status: connection.status,
            environment: connection.environment
        };
    }

    async refreshAccessToken(connection) {
        if (!connection.refreshTokenEncrypted) {
            throw new Error("Aucun refresh token disponible pour Qonto");
        }

        const refreshToken = decryptCredential(connection.refreshTokenEncrypted);
        const tokens = await QontoOAuth.refreshAccessToken(refreshToken, connection.environment || "production");

        await prisma.eInvoicingConnection.update({
            where: { id: connection.id },
            data: {
                accessTokenEncrypted: encryptCredential(tokens.accessToken),
                refreshTokenEncrypted: tokens.refreshToken ? encryptCredential(tokens.refreshToken) : undefined,
                tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
                status: "CONNECTED"
            }
        });

        return tokens;
    }

    async getClientForConnection(connection) {
        const tokenEncrypted = connection?.accessTokenEncrypted || connection?.apiKeyEncrypted;
        if (!tokenEncrypted) {
            throw new Error("Connexion Qonto non autorisée ou expirée");
        }

        let accessToken = decryptCredential(tokenEncrypted);

        // Check token expiry if refresh token is present
        if (connection.refreshTokenEncrypted && connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) <= new Date()) {
            const refreshed = await this.refreshAccessToken(connection);
            accessToken = refreshed.accessToken;
        }

        return new QontoClient({
            accessToken,
            environment: connection.environment || "production"
        });
    }

    async testConnection(target) {
        const start = Date.now();
        const companyId = typeof target === "string" ? target : (target?.companyId || target?.id);
        const conn = typeof target === "object" && target.apiKeyEncrypted ? target : (companyId ? await prisma.eInvoicingConnection.findUnique({ where: { companyId } }) : null);

        if (!conn) {
            return { connected: false, status: "ERROR", error: "Connexion introuvable" };
        }

        try {
            const client = await this.getClientForConnection(conn);
            const org = await client.getOrganization();

            return {
                connected: true,
                status: "CONNECTED",
                latencyMs: Date.now() - start,
                accountInfo: {
                    organizationName: org?.organization?.legal_name || org?.organization?.name || "Qonto Account",
                    currency: org?.organization?.currency || "EUR"
                }
            };
        } catch (err) {
            return {
                connected: false,
                status: "ERROR",
                latencyMs: Date.now() - start,
                error: err.message
            };
        }
    }

    async sendInvoice(connection, canonicalInvoice, options = {}) {
        const client = await this.getClientForConnection(connection);

        const qontoPayload = {
            invoice_number: canonicalInvoice.number,
            issue_date: new Date(canonicalInvoice.issueDate).toISOString().slice(0, 10),
            due_date: canonicalInvoice.dueDate ? new Date(canonicalInvoice.dueDate).toISOString().slice(0, 10) : undefined,
            currency: "EUR",
            total_amount_cents: Math.round(canonicalInvoice.totals.totalTTC * 100),
            client_name: canonicalInvoice.buyer.companyName || canonicalInvoice.buyer.name,
            client_email: canonicalInvoice.buyer.email || undefined
        };

        const result = await client.createClientInvoice(qontoPayload);
        const qontoInvoice = result.client_invoice || result;

        return {
            providerInvoiceId: String(qontoInvoice.id),
            status: "DELIVERED",
            sentAt: new Date()
        };
    }

    async getInvoiceStatus(connection, providerInvoiceId) {
        const client = await this.getClientForConnection(connection);
        const result = await client.getClientInvoice(providerInvoiceId);
        const inv = result.client_invoice || result;

        return {
            status: inv.status === "paid" ? "PAID" : "DELIVERED",
            statusLabel: inv.status || "Transmis à Qonto",
            updatedAt: new Date(inv.updated_at || Date.now())
        };
    }

    async getIncomingInvoices(connection, queryOptions = {}) {
        const client = await this.getClientForConnection(connection);
        const result = await client.listClientInvoices({ status: "all", page: queryOptions.page || 1 });
        const list = Array.isArray(result) ? result : (result.client_invoices || []);

        return list.map(item => ({
            id: String(item.id),
            providerInvoiceId: String(item.id),
            invoiceNumber: item.invoice_number || `QNT-${item.id}`,
            supplierName: item.client_name || "Fournisseur",
            totalTTC: (item.total_amount_cents || 0) / 100,
            totalHT: (item.total_amount_cents || 0) / 100 / 1.2,
            totalVAT: ((item.total_amount_cents || 0) / 100) - ((item.total_amount_cents || 0) / 100 / 1.2),
            issueDate: item.issue_date || new Date(),
            status: item.status === "paid" ? "PAID" : "RECEIVED"
        }));
    }

    async disconnect(connection) {
        await prisma.eInvoicingConnection.update({
            where: { id: connection.id },
            data: {
                status: "DISCONNECTED",
                accessTokenEncrypted: null,
                refreshTokenEncrypted: null
            }
        });
    }
}
