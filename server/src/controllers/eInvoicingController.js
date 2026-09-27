import { EInvoicingService } from "../modules/e-invoicing/services/EInvoicingService.js";
import { ProviderRegistry } from "../modules/e-invoicing/core/ProviderRegistry.js";
import { prisma } from "../config/db.js";

/**
 * GET /api/v1/e-invoicing/providers
 * Returns list of available PA providers & compliance features
 */
export const getProviders = async (req, res) => {
    try {
        const providers = EInvoicingService.getAvailableProviders();
        return res.status(200).json({ success: true, data: { providers } });
    } catch (error) {
        console.error("GET PROVIDERS ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/e-invoicing/connection
 * Get company connection metadata without revealing secrets
 */
export const getConnection = async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const connection = await EInvoicingService.getConnection(companyId);
        return res.status(200).json({ success: true, data: { connection } });
    } catch (error) {
        console.error("GET CONNECTION ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/e-invoicing/provision
 * White-Label eDocSync automated activation
 */
export const provisionEDocSync = async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const result = await EInvoicingService.provisionEDocSync(companyId, req.body);
        return res.status(200).json({
            success: true,
            message: "Facturation électronique activée avec succès !",
            data: result
        });
    } catch (error) {
        console.error("PROVISION EDOCSYNC ERROR:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/e-invoicing/:provider/connect
 * Initiate OAuth 2.0 authorization redirect URL
 */
export const getOAuthConnectUrl = async (req, res) => {
    const companyId = req.user.companyId;
    const providerName = (req.params.provider || "QONTO").toUpperCase();

    try {
        const provider = ProviderRegistry.get(providerName);
        if (!provider || !provider.getCapabilities().supportsOAuth) {
            return res.status(400).json({ success: false, message: "Ce fournisseur ne supporte pas OAuth 2.0" });
        }

        const clientRedirectUri = `${process.env.CLIENT_URL || "http://localhost:5173"}/settings/facturation-electronique/callback`;
        const authData = await provider.getAuthorizationUrl({
            companyId,
            redirectUri: clientRedirectUri
        });

        return res.status(200).json({
            success: true,
            data: {
                url: typeof authData === "string" ? authData : authData.url,
                state: authData.state || null
            }
        });
    } catch (error) {
        console.error("GET OAUTH URL ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/e-invoicing/:provider/callback
 * Complete OAuth 2.0 code exchange
 */
export const handleOAuthCallback = async (req, res) => {
    const companyId = req.user.companyId;
    const providerName = (req.params.provider || "QONTO").toUpperCase();
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).json({ success: false, message: "Code d'autorisation manquant" });
    }

    try {
        const provider = ProviderRegistry.get(providerName);
        const clientRedirectUri = `${process.env.CLIENT_URL || "http://localhost:5173"}/settings/facturation-electronique/callback`;

        const connectionData = await provider.handleOAuthCallback({
            code,
            state,
            redirectUri: clientRedirectUri
        });

        await prisma.eInvoicingConnection.upsert({
            where: { companyId },
            create: {
                companyId,
                provider: providerName,
                connectionType: "OAUTH2",
                ...connectionData
            },
            update: {
                provider: providerName,
                connectionType: "OAUTH2",
                ...connectionData
            }
        });

        return res.status(200).json({
            success: true,
            message: `${provider.getProviderInfo().name} connecté avec succès !`
        });
    } catch (error) {
        console.error("OAUTH CALLBACK ERROR:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/e-invoicing/connect
 * Connect or update PA credentials (API Key)
 */
export const connectCompany = async (req, res) => {
    const companyId = req.user.companyId;
    const { provider = "B2BROUTER", apiKey, accountId, environment = "sandbox" } = req.body;

    if (!apiKey) {
        return res.status(400).json({
            success: false,
            message: "La clé API de la Plateforme Agréée est requise"
        });
    }

    try {
        const result = await EInvoicingService.connectCompany(companyId, {
            provider,
            apiKey,
            accountId,
            environment
        });

        return res.status(200).json({
            success: true,
            message: "Plateforme Agréée connectée avec succès !",
            data: result
        });
    } catch (error) {
        console.error("CONNECT COMPANY ERROR:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/e-invoicing/sync
 * Trigger sync of incoming invoices & statuses
 */
export const syncEInvoicing = async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const result = await EInvoicingService.sync(companyId);
        return res.status(200).json({
            success: true,
            message: `Synchronisation terminée (${result.incoming.syncedCount} nouvelles factures reçues)`,
            data: result
        });
    } catch (error) {
        console.error("SYNC E-INVOICING ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/e-invoicing/test
 * Test live connection with provider
 */
export const testConnection = async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const result = await EInvoicingService.testConnection(companyId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("TEST CONNECTION ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/v1/e-invoicing/connection
 * Disconnect PA
 */
export const disconnectCompany = async (req, res) => {
    const companyId = req.user.companyId;
    try {
        await EInvoicingService.disconnectCompany(companyId);
        return res.status(200).json({
            success: true,
            message: "Plateforme Agréée déconnectée avec succès"
        });
    } catch (error) {
        console.error("DISCONNECT COMPANY ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/e-invoicing/invoices/received
 * List incoming supplier invoices (RÉCEPTION 2026)
 */
export const getReceivedInvoices = async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const result = await EInvoicingService.getReceivedInvoices(companyId, req.query);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("GET RECEIVED INVOICES ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/e-invoicing/invoices/received/:id
 * Get detail of a received supplier invoice
 */
export const getReceivedInvoiceById = async (req, res) => {
    const companyId = req.user.companyId;
    const { id } = req.params;

    try {
        const invoice = await EInvoicingService.getReceivedInvoiceById(companyId, id);
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Facture reçue introuvable" });
        }
        return res.status(200).json({ success: true, data: { invoice } });
    } catch (error) {
        console.error("GET RECEIVED INVOICE BY ID ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/e-invoicing/invoices/received/:id/download
 * Download original / Factur-X / PDF document
 */
export const downloadReceivedInvoice = async (req, res) => {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const format = req.query.format || "pdf";

    try {
        const file = await EInvoicingService.downloadReceivedInvoice(companyId, id, format);
        res.setHeader("Content-Type", file.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
        return res.send(file.data);
    } catch (error) {
        console.error("DOWNLOAD RECEIVED INVOICE ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/e-invoicing/invoices/:id/transmit
 * Transmit outgoing invoice via PA
 */
export const transmitInvoice = async (req, res) => {
    const companyId = req.user.companyId;
    const { id } = req.params;

    try {
        const result = await EInvoicingService.transmitInvoice(companyId, id, req.body);
        return res.status(200).json({
            success: true,
            message: "Facture transmise avec succès à la Plateforme Agréée",
            data: result
        });
    } catch (error) {
        console.error("TRANSMIT INVOICE ERROR:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/e-invoicing/invoices/:id/cancel
 * Cancel electronic invoice
 */
export const cancelInvoice = async (req, res) => {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const result = await EInvoicingService.cancelInvoice(companyId, id, reason);
        return res.status(200).json({
            success: true,
            message: "Facture électronique annulée",
            data: result
        });
    } catch (error) {
        console.error("CANCEL INVOICE ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/e-invoicing/reconciliation/run
 * Trigger manual status reconciliation
 */
export const runReconciliation = async (req, res) => {
    const companyId = req.user.companyId;
    try {
        const result = await EInvoicingService.runReconciliation(companyId);
        return res.status(200).json({
            success: true,
            message: "Réconciliation terminée avec succès",
            data: result
        });
    } catch (error) {
        console.error("RUN RECONCILIATION ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
