/**
 * Provider Capabilities Specification
 * DGFiP 2026/2027 E-Invoicing & E-Reporting Reform
 */

/**
 * @typedef {Object} ProviderCapabilities
 * @property {boolean} supportsOAuth
 * @property {boolean} supportsApiKey
 * @property {boolean} supportsEmbeddedProvisioning // eDocSync white-label
 * @property {boolean} supportsIncomingInvoices
 * @property {boolean} supportsOutgoingInvoices
 * @property {boolean} supportsInvoiceDownload
 * @property {boolean} supportsInvoiceSending
 * @property {boolean} supportsLifecycleStatus
 * @property {boolean} supportsWebhooks
 * @property {boolean} supportsPolling
 * @property {boolean} supportsUBL
 * @property {boolean} supportsCII
 * @property {boolean} supportsFacturX
 * @property {boolean} supportsEReporting
 * @property {boolean} supportsDirectory
 * @property {boolean} supportsAutomaticAccountProvisioning
 */

export const DEFAULT_CAPABILITIES = {
    supportsOAuth: false,
    supportsApiKey: false,
    supportsEmbeddedProvisioning: false,
    supportsIncomingInvoices: false,
    supportsOutgoingInvoices: false,
    supportsInvoiceDownload: false,
    supportsInvoiceSending: false,
    supportsLifecycleStatus: false,
    supportsWebhooks: false,
    supportsPolling: true,
    supportsUBL: false,
    supportsCII: false,
    supportsFacturX: false,
    supportsEReporting: false,
    supportsDirectory: false,
    supportsAutomaticAccountProvisioning: false
};
