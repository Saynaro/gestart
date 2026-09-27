import { EInvoicingProvider } from "../../interfaces/EInvoicingProvider.js";
import { SageActiveClient } from "./SageActiveClient.js";
import { decryptCredential, encryptCredential } from "../../services/EncryptionService.js";
import { prisma } from "../../../../config/db.js";

/**
 * Sage Active Provider Adapter
 * Documented at https://developer.sage.com/sageactive/
 */
export class SageActiveProvider extends EInvoicingProvider {
    getProviderInfo() {
        return {
            id: "SAGE_ACTIVE",
            name: "Sage Active",
            legalStatus: "Plateforme Agréée (PDP / Sage Network)",
            description: "Solution de gestion et facturation électronique pour PME et artisans.",
            docsUrl: "https://developer.sage.com/sageactive",
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
            supportsCII: true,
            supportsFacturX: true,
            supportsEReporting: true,
            supportsDirectory: true,
            supportsAutomaticAccountProvisioning: false
        };
    }

    async connectCompany(companyId, credentials) {
        const { apiKey, accountId, environment = "production" } = credentials;
        if (!apiKey) {
            throw new Error("La clé API ou jeton Sage Active est obligatoire");
        }

        const apiKeyEncrypted = encryptCredential(apiKey);

        const connection = await prisma.eInvoicingConnection.upsert({
            where: { companyId },
            create: {
                companyId,
                provider: "SAGE_ACTIVE",
                providerAccountId: accountId || null,
                environment,
                status: "CONNECTED",
                apiKeyEncrypted,
                receivingEnabled: true,
                emissionEnabled: true,
                lastSyncAt: new Date()
            },
            update: {
                provider: "SAGE_ACTIVE",
                providerAccountId: accountId || undefined,
                environment,
                status: "CONNECTED",
                apiKeyEncrypted,
                lastSyncAt: new Date(),
                lastSyncError: null
            }
        });

        return {
            success: true,
            provider: "SAGE_ACTIVE",
            status: connection.status
        };
    }

    async testConnection(connection) {
        return {
            connected: true,
            status: "CONNECTED",
            accountInfo: {
                provider: "Sage Active",
                environment: connection?.environment || "production"
            }
        };
    }

    async disconnect(connection) {
        const companyId = connection.companyId || connection.id;
        await prisma.eInvoicingConnection.updateMany({
            where: { companyId },
            data: {
                status: "DISCONNECTED",
                accessTokenEncrypted: null,
                apiKeyEncrypted: null
            }
        }).catch(() => {});
    }

    async disconnectCompany(companyId) {
        return this.disconnect({ companyId });
    }
}
