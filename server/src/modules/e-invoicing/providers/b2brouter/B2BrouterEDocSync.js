import { B2brouterClient } from "./B2brouterClient.js";
import { encryptCredential } from "../../services/EncryptionService.js";
import { prisma } from "../../../../config/db.js";

/**
 * B2Brouter eDocSync White-Label Provisioning Manager
 * Implements automated account provisioning for SaaS solutions.
 * https://www.b2brouter.net/fr/edocsync-pdp/
 */
export class B2BrouterEDocSync {
    /**
     * Provision or link an artisan account via eDocSync
     * @param {string} companyId
     * @param {Object} [options]
     * @returns {Promise<{ success: boolean, accountId: string, status: string }>}
     */
    static async provisionAccount(companyId, options = {}) {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: { einvoicingConnection: true }
        });

        if (!company) throw new Error("Entreprise introuvable");

        const masterApiKey = process.env.B2BROUTER_EDOCSYNC_API_KEY || process.env.B2BROUTER_API_KEY;
        const environment = options.environment || process.env.B2BROUTER_ENV || "sandbox";

        if (!masterApiKey) {
            throw new Error("Clé d'intégration eDocSync / B2Brouter non configurée sur le serveur");
        }

        const client = new B2brouterClient({
            apiKey: masterApiKey,
            environment
        });

        const cleanSiret = (company.siret || "").replace(/\s+/g, "");
        const cleanSiren = (company.siren || (cleanSiret ? cleanSiret.substring(0, 9) : "")).replace(/\s+/g, "");

        if (!cleanSiret && !cleanSiren) {
            throw new Error("Le SIRET ou SIREN de l'entreprise est obligatoire pour l'activation eDocSync");
        }

        const payload = {
            account: {
                name: company.name,
                tin: cleanSiret || cleanSiren, // Tax Identification Number / SIRET
                country: "FR",
                address: company.address || "1 rue de la Paix",
                city: company.city || "Paris",
                postal_code: company.postalCode || "75001",
                email: company.email || options.adminEmail || "contact@artisan.fr",
                scheme: cleanSiret.length === 14 ? "0009" : "0002"
            }
        };

        // Create or get account
        let accountId = null;
        try {
            const created = await client.createAccount(payload);
            accountId = String(created.id || created.account?.id);
        } catch (err) {
            // If already exists on B2Brouter, retrieve from list
            console.warn("[B2BrouterEDocSync] createAccount notice, checking existing accounts:", err.message);
            const accounts = await client.listAccounts();
            const list = Array.isArray(accounts) ? accounts : (accounts.accounts || []);
            const match = list.find(a => (a.tin === cleanSiret || a.tin === cleanSiren || a.name === company.name));
            if (match) {
                accountId = String(match.id);
            } else {
                throw err;
            }
        }

        // Save connection in database
        const encryptedApiKey = encryptCredential(masterApiKey);

        await prisma.eInvoicingConnection.upsert({
            where: { companyId },
            create: {
                companyId,
                provider: "B2BROUTER",
                connectionType: "EDOCSYNC_PROVISIONED",
                providerAccountId: accountId,
                apiKeyEncrypted: encryptedApiKey,
                environment,
                status: "CONNECTED",
                receivingEnabled: true,
                emissionEnabled: true,
                autoSyncIncoming: true,
                lastSyncAt: new Date()
            },
            update: {
                provider: "B2BROUTER",
                connectionType: "EDOCSYNC_PROVISIONED",
                providerAccountId: accountId,
                apiKeyEncrypted: encryptedApiKey,
                environment,
                status: "CONNECTED",
                receivingEnabled: true,
                emissionEnabled: true,
                lastSyncAt: new Date(),
                lastSyncError: null
            }
        });

        return {
            success: true,
            accountId,
            status: "CONNECTED"
        };
    }
}
