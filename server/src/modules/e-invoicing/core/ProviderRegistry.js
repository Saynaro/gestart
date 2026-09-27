/**
 * Provider Registry for E-Invoicing
 * Allows dynamic registration of PA adapters without modifying core services.
 */
class ProviderRegistryClass {
    constructor() {
        this.providers = new Map();
    }

    /**
     * Register a provider adapter
     * @param {import('../interfaces/EInvoicingProvider.js').EInvoicingProvider} provider
     */
    register(provider) {
        const info = provider.getProviderInfo();
        if (!info || !info.id) {
            throw new Error("Provider must provide an info object with an 'id'");
        }
        this.providers.set(info.id.toUpperCase(), provider);
    }

    /**
     * Get provider by ID
     * @param {string} providerId
     * @returns {import('../interfaces/EInvoicingProvider.js').EInvoicingProvider}
     */
    get(providerId) {
        if (!providerId) return null;
        const provider = this.providers.get(providerId.toUpperCase());
        if (!provider) {
            throw new Error(`E-Invoicing provider '${providerId}' is not registered`);
        }
        return provider;
    }

    /**
     * Check if a provider is registered
     * @param {string} providerId
     * @returns {boolean}
     */
    has(providerId) {
        if (!providerId) return false;
        return this.providers.has(providerId.toUpperCase());
    }

    /**
     * Get all registered providers
     * @returns {Array<import('../interfaces/EInvoicingProvider.js').EInvoicingProvider>}
     */
    getAll() {
        return Array.from(this.providers.values());
    }

    /**
     * Get provider info list with capabilities for clients
     */
    getProviderCatalog() {
        return this.getAll().map(p => ({
            ...p.getProviderInfo(),
            capabilities: p.getCapabilities()
        }));
    }
}

export const ProviderRegistry = new ProviderRegistryClass();
