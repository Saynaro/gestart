import { ProviderRegistry } from "./ProviderRegistry.js";

/**
 * Capability Service
 * Inspects provider capabilities and informs frontend features
 */
export class CapabilityService {
    /**
     * Get capabilities for a given provider
     * @param {string} providerId
     */
    static getProviderCapabilities(providerId) {
        try {
            const provider = ProviderRegistry.get(providerId);
            return provider ? provider.getCapabilities() : null;
        } catch {
            return null;
        }
    }

    /**
     * Check if a specific feature is supported by the provider
     * @param {string} providerId
     * @param {string} capabilityKey
     */
    static isSupported(providerId, capabilityKey) {
        const caps = this.getProviderCapabilities(providerId);
        return Boolean(caps && caps[capabilityKey]);
    }
}
