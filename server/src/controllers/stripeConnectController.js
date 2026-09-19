import {
    createAccountOnboardingLink,
    syncAccountStatus,
    disconnectConnectedAccount
} from "../services/stripeConnectService.js";
import { prisma } from "../config/db.js";

/**
 * Démarre le flux d'onboarding Stripe Express avec pré-remplissage des données CRM
 * POST /api/v1/stripe/connect/onboard
 */
export const startOnboarding = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const { returnUrl, refreshUrl } = req.body || {};
        const result = await createAccountOnboardingLink(companyId, returnUrl, refreshUrl);

        return res.status(200).json({
            success: true,
            message: "Lien d'activation Stripe généré avec succès",
            data: {
                onboardingUrl: result.url,
                stripeAccountId: result.stripeAccountId
            }
        });
    } catch (error) {
        console.error("START STRIPE ONBOARDING ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de la génération du lien Stripe"
        });
    }
};

/**
 * Récupère le statut actuel du compte Stripe Connect de l'entreprise
 * GET /api/v1/stripe/connect/status
 */
export const getConnectStatus = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        let company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                stripeAccountId: true,
                stripeAccountStatus: true,
                stripeOnboardingStatus: true,
                stripeChargesEnabled: true,
                stripePayoutsEnabled: true,
                stripeDetailsSubmitted: true,
                onlinePaymentEnabled: true,
                stripeConnectedAt: true,
                settings: {
                    select: {
                        stripePaymentEnabled: true,
                        stripeFeeBearer: true,
                        bankTransferEnabled: true,
                        bankIban: true,
                        bankBic: true,
                        bankAccountOwner: true,
                        bankName: true
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: "Entreprise introuvable" });
        }

        // Auto-sync status with Stripe if account exists and status is not yet marked COMPLETE
        if (company.stripeAccountId && company.stripeOnboardingStatus !== "COMPLETE") {
            try {
                await syncAccountStatus(companyId);
                company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: {
                        stripeAccountId: true,
                        stripeAccountStatus: true,
                        stripeOnboardingStatus: true,
                        stripeChargesEnabled: true,
                        stripePayoutsEnabled: true,
                        stripeDetailsSubmitted: true,
                        onlinePaymentEnabled: true,
                        stripeConnectedAt: true,
                        settings: {
                            select: {
                                stripePaymentEnabled: true,
                                stripeFeeBearer: true,
                                bankTransferEnabled: true,
                                bankIban: true,
                                bankBic: true,
                                bankAccountOwner: true,
                                bankName: true
                            }
                        }
                    }
                });
            } catch (syncErr) {
                console.warn("[STRIPE STATUS AUTO-SYNC WARN]", syncErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                stripeAccountId: company.stripeAccountId,
                onboardingStatus: company.stripeOnboardingStatus || (company.stripeAccountId ? "IN_PROGRESS" : "NOT_STARTED"),
                chargesEnabled: company.stripeChargesEnabled,
                payoutsEnabled: company.stripePayoutsEnabled,
                detailsSubmitted: company.stripeDetailsSubmitted,
                onlinePaymentEnabled: company.onlinePaymentEnabled,
                stripePaymentEnabled: company.settings?.stripePaymentEnabled ?? company.onlinePaymentEnabled,
                stripeFeeBearer: company.settings?.stripeFeeBearer || "COMPANY",
                bankTransferEnabled: company.settings?.bankTransferEnabled ?? true,
                bankIban: company.settings?.bankIban,
                bankBic: company.settings?.bankBic,
                bankAccountOwner: company.settings?.bankAccountOwner,
                bankName: company.settings?.bankName,
                connectedAt: company.stripeConnectedAt
            }
        });
    } catch (error) {
        console.error("GET STRIPE STATUS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du statut Stripe"
        });
    }
};

/**
 * Force la synchronisation du statut Stripe depuis l'API Stripe
 * POST /api/v1/stripe/connect/sync
 */
export const syncStatus = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const status = await syncAccountStatus(companyId);
        return res.status(200).json({
            success: true,
            message: "Statut Stripe synchronisé avec succès",
            data: status
        });
    } catch (error) {
        console.error("SYNC STRIPE STATUS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de la synchronisation Stripe"
        });
    }
};

/**
 * Met à jour les paramètres de paiement (Frais bearer, activation méthodes)
 * PUT /api/v1/stripe/connect/settings
 */
export const updatePaymentSettings = async (req, res) => {
    const companyId = req.user.companyId;
    const {
        stripePaymentEnabled,
        stripeFeeBearer,
        bankTransferEnabled,
        bankIban,
        bankBic,
        bankAccountOwner,
        bankName
    } = req.body;

    try {
        const settings = await prisma.companySettings.upsert({
            where: { companyId },
            create: {
                companyId,
                stripePaymentEnabled: Boolean(stripePaymentEnabled),
                stripeFeeBearer: stripeFeeBearer === "CLIENT" ? "CLIENT" : "COMPANY",
                bankTransferEnabled: bankTransferEnabled !== undefined ? Boolean(bankTransferEnabled) : true,
                bankIban: bankIban || null,
                bankBic: bankBic || null,
                bankAccountOwner: bankAccountOwner || null,
                bankName: bankName || null
            },
            update: {
                ...(stripePaymentEnabled !== undefined && { stripePaymentEnabled: Boolean(stripePaymentEnabled) }),
                ...(stripeFeeBearer && { stripeFeeBearer: stripeFeeBearer === "CLIENT" ? "CLIENT" : "COMPANY" }),
                ...(bankTransferEnabled !== undefined && { bankTransferEnabled: Boolean(bankTransferEnabled) }),
                ...(bankIban !== undefined && { bankIban: bankIban || null }),
                ...(bankBic !== undefined && { bankBic: bankBic || null }),
                ...(bankAccountOwner !== undefined && { bankAccountOwner: bankAccountOwner || null }),
                ...(bankName !== undefined && { bankName: bankName || null })
            }
        });

        return res.status(200).json({
            success: true,
            message: "Paramètres de paiement mis à jour avec succès",
            data: { settings }
        });
    } catch (error) {
        console.error("UPDATE PAYMENT SETTINGS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à jour des paramètres de paiement"
        });
    }
};

/**
 * Simule l'activation réussie de Stripe Connect en mode développement / test
 * POST /api/v1/stripe/connect/test-simulate
 */
export const simulateOnboardingForTest = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const mockStripeId = `acct_test_${Date.now().toString(36)}`;

        await prisma.company.update({
            where: { id: companyId },
            data: {
                stripeAccountId: mockStripeId,
                stripeOnboardingStatus: "COMPLETE",
                stripeChargesEnabled: true,
                stripePayoutsEnabled: true,
                stripeDetailsSubmitted: true,
                onlinePaymentEnabled: true,
                stripeAccountStatus: "active",
                stripeConnectedAt: new Date(),
                settings: {
                    upsert: {
                        create: { stripePaymentEnabled: true },
                        update: { stripePaymentEnabled: true }
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Stripe Connect activé avec succès en mode Test !",
            data: {
                stripeAccountId: mockStripeId,
                onboardingStatus: "COMPLETE",
                chargesEnabled: true,
                onlinePaymentEnabled: true
            }
        });
    } catch (error) {
        console.error("SIMULATE ONBOARDING ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Déconnecte le compte Stripe Connect
 * DELETE /api/v1/stripe/connect
 */
export const disconnectAccount = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        await disconnectConnectedAccount(companyId);
        return res.status(200).json({
            success: true,
            message: "Compte Stripe déconnecté avec succès"
        });
    } catch (error) {
        console.error("DISCONNECT STRIPE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de la déconnexion Stripe"
        });
    }
};

/**
 * Callback de redirection après onboarding Stripe (retour navigateur)
 * GET /api/v1/stripe/connect/callback
 */
export const handleConnectCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const { companyId } = req.query;

    if (companyId) {
        try {
            await syncAccountStatus(companyId);
        } catch (e) {
            console.warn("Auto-sync callback error:", e.message);
        }
    }

    return res.redirect(`${frontendUrl}/settings?tab=paiements&stripe=success`);
};
