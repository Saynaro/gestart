import { ProviderRegistry } from "../core/ProviderRegistry.js";
import { B2brouterProvider } from "./b2brouter/B2brouterProvider.js";
import { QontoProvider } from "./qonto/QontoProvider.js";
import { SageActiveProvider } from "./sage-active/SageActiveProvider.js";
import { IndyProvider } from "./indy/IndyProvider.js";
import { PennylaneProvider } from "./pennylane/PennylaneProvider.js";
import { prisma } from "../../../config/db.js";

// Register all available adapters
ProviderRegistry.register(new B2brouterProvider());
ProviderRegistry.register(new QontoProvider());
ProviderRegistry.register(new SageActiveProvider());
ProviderRegistry.register(new IndyProvider());
ProviderRegistry.register(new PennylaneProvider());

/**
 * Provider Factory (Facade for ProviderRegistry with DB resolution)
 */
export class ProviderFactory {
    /**
     * Get provider by ID/name
     * @param {string} providerName 'B2BROUTER' | 'QONTO' | 'SAGE_ACTIVE' | 'INDY' | 'PENNYLANE'
     * @returns {import('../interfaces/EInvoicingProvider.js').EInvoicingProvider}
     */
    static getProvider(providerName) {
        const id = (providerName || "B2BROUTER").toUpperCase().replace(/-/g, "_");
        if (ProviderRegistry.has(id)) {
            return ProviderRegistry.get(id);
        }
        return ProviderRegistry.get("B2BROUTER");
    }

    /**
     * Get provider configured for a specific company
     * @param {string} companyId 
     * @returns {Promise<import('../interfaces/EInvoicingProvider.js').EInvoicingProvider>}
     */
    static async getProviderForCompany(companyId) {
        const connection = await prisma.eInvoicingConnection.findUnique({
            where: { companyId }
        });

        if (!connection || !connection.provider) {
            return ProviderFactory.getProvider("B2BROUTER");
        }

        return ProviderFactory.getProvider(connection.provider);
    }
}
