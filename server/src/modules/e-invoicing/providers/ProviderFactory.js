import { B2brouterProvider } from "./b2brouter/B2brouterProvider.js";
import { PennylaneProvider } from "./pennylane/PennylaneProvider.js";
import { prisma } from "../../../config/db.js";

export class ProviderFactory {
    /**
     * Resolve provider instance by provider name or company connection
     * @param {string} providerName 'B2BROUTER' | 'PENNYLANE' | 'SAGE'
     * @returns {import("../interfaces/EInvoicingProvider.js").EInvoicingProvider}
     */
    static getProvider(providerName = "B2BROUTER") {
        const normalized = String(providerName || "B2BROUTER").toUpperCase();

        switch (normalized) {
            case "B2BROUTER":
                return new B2brouterProvider();
            case "PENNYLANE":
                return new PennylaneProvider();
            case "SAGE":
                // Scaffolding for Sage
                return new B2brouterProvider();
            default:
                return new B2brouterProvider();
        }
    }

    /**
     * Resolve provider for a specific company from its configured connection
     * @param {string} companyId 
     * @returns {Promise<import("../interfaces/EInvoicingProvider.js").EInvoicingProvider>}
     */
    static async getProviderForCompany(companyId) {
        const connection = await prisma.eInvoicingConnection.findUnique({
            where: { companyId }
        });

        const providerType = connection ? connection.provider : "B2BROUTER";
        return ProviderFactory.getProvider(providerType);
    }
}
