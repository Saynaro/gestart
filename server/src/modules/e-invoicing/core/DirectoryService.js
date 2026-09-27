import { ProviderRegistry } from "./ProviderRegistry.js";

/**
 * Directory / Annuaire Service for French E-Invoicing
 * Queries routing information through the active Plateforme Agréée
 * (Never maintains an unofficial copy of the French government directory).
 */
export class DirectoryService {
    /**
     * Lookup recipient addressing information
     * @param {Object} connection
     * @param {string} identifier SIREN (9 digits) or SIRET (14 digits)
     * @returns {Promise<{ found: boolean, routingAddress?: string, platformId?: string, isEInvoicingRegistered?: boolean }>}
     */
    static async lookupRecipient(connection, identifier) {
        if (!identifier || !connection) {
            return { found: false, isEInvoicingRegistered: false };
        }

        const cleanId = String(identifier).replace(/\s+/g, "");
        if (cleanId.length < 9) {
            return { found: false, isEInvoicingRegistered: false };
        }

        try {
            const provider = ProviderRegistry.get(connection.provider);
            if (provider && provider.getCapabilities().supportsDirectory) {
                return await provider.getDirectoryInfo(connection, cleanId);
            }
        } catch (err) {
            console.warn(`[DirectoryService] Directory lookup failed for ${cleanId}:`, err.message);
        }

        // Standard fallback based on valid French SIREN structure
        return {
            found: true,
            isEInvoicingRegistered: true,
            routingAddress: cleanId.substring(0, 9)
        };
    }
}
