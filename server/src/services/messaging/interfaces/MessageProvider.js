/**
 * Base Abstract Interface for Omnichannel Message Providers
 */
export class MessageProvider {
    /**
     * Provider Name / Identifier (e.g., "SMS", "WHATSAPP", "EMAIL")
     */
    constructor(channelName) {
        if (this.constructor === MessageProvider) {
            throw new Error("Cannot instantiate abstract class MessageProvider directly");
        }
        this.channel = channelName;
    }

    /**
     * Sends an outbound message through this provider
     * @param {Object} params
     * @param {string} params.companyId
     * @param {string} params.clientId
     * @param {string} params.body
     * @param {string} [params.subject]
     * @param {Array} [params.attachments]
     * @param {string} [params.autoType="manual"]
     * @param {Object} [params.metadata]
     * @returns {Promise<Object>} Created message record
     */
    async sendMessage(params) {
        throw new Error("Method 'sendMessage()' must be implemented");
    }

    /**
     * Handles an incoming message webhook payload from this provider
     * @param {Object} params
     * @param {Object} params.payload
     * @param {Object} params.headers
     * @returns {Promise<Object>}
     */
    async handleIncomingWebhook(params) {
        throw new Error("Method 'handleIncomingWebhook()' must be implemented");
    }

    /**
     * Handles message delivery / read status update callbacks
     * @param {Object} params
     * @param {Object} params.payload
     * @param {Object} params.headers
     * @returns {Promise<Object>}
     */
    async handleStatusWebhook(params) {
        throw new Error("Method 'handleStatusWebhook()' must be implemented");
    }

    /**
     * Validates cryptographic webhook signature if applicable
     * @param {import("express").Request} req
     * @returns {boolean}
     */
    validateWebhookSignature(req) {
        return true;
    }

    /**
     * Checks if this channel is currently usable for a given client & company
     * @param {Object} client
     * @param {Object} company
     * @returns {Promise<{ available: boolean, reason?: string, details?: any }>}
     */
    async isChannelAvailable(client, company) {
        throw new Error("Method 'isChannelAvailable()' must be implemented");
    }
}

export default MessageProvider;
