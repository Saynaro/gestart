import { prisma } from "../config/db.js";
import { stripe } from "../config/stripe.js";

/**
 * Mappe les formes juridiques françaises vers les types et structures Stripe
 */
const mapLegalFormToStripe = (legalForm) => {
    if (!legalForm) return { businessType: "company", structure: "private_corporation" };

    const norm = legalForm.toLowerCase().trim();
    if (norm.includes("auto") || norm.includes("micro") || norm.includes("individuelle") || norm === "ei") {
        return { businessType: "individual", structure: "sole_establishment" };
    }
    if (norm.includes("sa") && !norm.includes("sas") && !norm.includes("sarl")) {
        return { businessType: "company", structure: "public_corporation" };
    }
    if (norm.includes("snc") || norm.includes("société en nom collectif")) {
        return { businessType: "company", structure: "partnership" };
    }
    // SARL, SAS, SASU, EURL, etc.
    return { businessType: "company", structure: "private_corporation" };
};

/**
 * Nettoie et formate un numéro de téléphone français pour Stripe (+33...)
 */
const formatPhoneForStripe = (phone) => {
    if (!phone) return undefined;
    const clean = phone.replace(/[\s.-]/g, "");
    if (clean.startsWith("+")) return clean;
    if (clean.startsWith("0") && clean.length === 10) {
        return "+33" + clean.substring(1);
    }
    return clean;
};

/**
 * Construit le payload de pré-remplissage pour la création d'un compte Stripe Connect Express
 */
export const buildStripeAccountPrefill = async (companyId) => {
    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });

    if (!company) {
        throw new Error("Entreprise introuvable");
    }

    const owner = await prisma.user.findFirst({
        where: { companyId, role: "OWNER" }
    });

    const { businessType, structure } = mapLegalFormToStripe(company.legalForm);
    const companyPhone = formatPhoneForStripe(company.phone || owner?.phone);
    const ownerPhone = formatPhoneForStripe(owner?.phone || company.phone);

    const payload = {
        type: "express",
        country: "FR",
        email: company.email || owner?.email || undefined,
        business_type: businessType,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        business_profile: {
            name: company.name || undefined,
            support_email: company.email || owner?.email || undefined,
            support_phone: companyPhone,
            url: company.website || undefined,
            mcc: "1711", // Heating, Plumbing, Air Conditioning Contractors
        },
        metadata: {
            companyId: company.id,
            companyName: company.name || "",
            siret: company.siret || "",
        }
    };

    // Pré-remplissage pour une société (Personne morale)
    if (businessType === "company") {
        payload.company = {
            name: company.name || undefined,
            phone: companyPhone,
            structure: structure,
            tax_id: company.siret ? company.siret.replace(/\s+/g, "") : (company.siren ? company.siren.replace(/\s+/g, "") : undefined),
            address: {
                line1: company.address || undefined,
                city: company.city || undefined,
                postal_code: company.postalCode || undefined,
                country: "FR"
            }
        };

        if (company.tvaNumber) {
            payload.company.vat_id = company.tvaNumber.replace(/\s+/g, "");
        }
    }

    // Pré-remplissage pour un entrepreneur individuel / Auto-entrepreneur (Personne physique)
    if (businessType === "individual" && owner) {
        payload.individual = {
            first_name: owner.firstName || undefined,
            last_name: owner.lastName || undefined,
            email: owner.email || undefined,
            phone: ownerPhone,
            address: {
                line1: company.address || undefined,
                city: company.city || undefined,
                postal_code: company.postalCode || undefined,
                country: "FR"
            }
        };
    }

    return payload;
};

/**
 * Crée ou récupère le Connected Account Stripe pour une entreprise
 */
export const getOrCreateConnectedAccount = async (companyId) => {
    if (!stripe) {
        throw new Error("Stripe n'est pas configuré sur le serveur (STRIPE_SECRET_KEY manquant)");
    }

    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });

    if (!company) {
        throw new Error("Entreprise introuvable");
    }

    // Si le compte existe déjà dans la base, on vérifie qu'il existe bien sur le compte Stripe actuel
    if (company.stripeAccountId) {
        try {
            await stripe.accounts.retrieve(company.stripeAccountId);
            return company.stripeAccountId;
        } catch (err) {
            console.warn(`[STRIPE CONNECT] Compte existant ${company.stripeAccountId} invalide ou non lié à cette clé API Stripe. Recréation...`);
        }
    }

    // Préparation des données avec prefill CRM
    const accountPayload = await buildStripeAccountPrefill(companyId);
    
    // Création du compte chez Stripe
    const account = await stripe.accounts.create(accountPayload);

    // Sauvegarde de l'ID Stripe dans la base de données
    await prisma.company.update({
        where: { id: companyId },
        data: {
            stripeAccountId: account.id,
            stripeOnboardingStatus: "IN_PROGRESS",
            stripeAccountStatus: "pending",
            stripeConnectedAt: new Date()
        }
    });

    return account.id;
};

/**
 * Génère le lien officiel d'onboarding Stripe Express
 */
export const createAccountOnboardingLink = async (companyId, customReturnUrl, customRefreshUrl) => {
    if (!stripe) {
        throw new Error("Stripe n'est pas configuré sur le serveur");
    }

    let stripeAccountId = await getOrCreateConnectedAccount(companyId);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const returnUrl = customReturnUrl || process.env.STRIPE_CONNECT_CALLBACK_URL || `${frontendUrl}/settings?tab=paiements&stripe=success`;
    const refreshUrl = customRefreshUrl || `${frontendUrl}/settings?tab=paiements&stripe=refresh`;

    try {
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: "account_onboarding",
        });

        return {
            url: accountLink.url,
            stripeAccountId
        };
    } catch (err) {
        // En cas d'erreur de compte introuvable ou non connecté à la plateforme actuelle
        if (err.message && (err.message.includes("not connected to your platform") || err.message.includes("does not exist") || err.code === "resource_missing")) {
            console.warn(`[STRIPE CONNECT] Recréation immédiate suite à l'erreur: ${err.message}`);
            // Nettoyage en base
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    stripeAccountId: null,
                    stripeOnboardingStatus: "NOT_STARTED",
                    stripeChargesEnabled: false,
                    stripePayoutsEnabled: false,
                    stripeDetailsSubmitted: false,
                    onlinePaymentEnabled: false,
                    stripeAccountStatus: null
                }
            });
            // Création d'un nouveau compte
            stripeAccountId = await getOrCreateConnectedAccount(companyId);
            const accountLink = await stripe.accountLinks.create({
                account: stripeAccountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: "account_onboarding",
            });
            return {
                url: accountLink.url,
                stripeAccountId
            };
        }
        throw err;
    }
};

/**
 * Synchronise et met à jour le statut du Connected Account Stripe depuis l'API Stripe
 */
export const syncAccountStatus = async (companyId) => {
    if (!stripe) {
        throw new Error("Stripe non configuré");
    }

    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });

    if (!company || !company.stripeAccountId) {
        return {
            stripeAccountId: null,
            status: "NOT_STARTED",
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false
        };
    }

    try {
        const account = await stripe.accounts.retrieve(company.stripeAccountId);

        const detailsSubmitted = Boolean(account.details_submitted);
        const chargesEnabled = Boolean(account.charges_enabled);
        const payoutsEnabled = Boolean(account.payouts_enabled);
        const requiresInfo = Boolean(account.requirements?.currently_due?.length > 0 || account.requirements?.eventually_due?.length > 0);

        let onboardingStatus = "IN_PROGRESS";
        if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
            onboardingStatus = "COMPLETE";
        } else if (requiresInfo && detailsSubmitted) {
            onboardingStatus = "REQUIRES_INFO";
        } else if (!detailsSubmitted) {
            onboardingStatus = "IN_PROGRESS";
        }

        const isOnlinePaymentReady = chargesEnabled && detailsSubmitted;

        await prisma.company.update({
            where: { id: companyId },
            data: {
                stripeOnboardingStatus: onboardingStatus,
                stripeChargesEnabled: chargesEnabled,
                stripePayoutsEnabled: payoutsEnabled,
                stripeDetailsSubmitted: detailsSubmitted,
                onlinePaymentEnabled: isOnlinePaymentReady,
                stripeAccountStatus: isOnlinePaymentReady ? "active" : (requiresInfo ? "restricted" : "pending")
            }
        });

        return {
            stripeAccountId: company.stripeAccountId,
            status: onboardingStatus,
            chargesEnabled,
            payoutsEnabled,
            detailsSubmitted,
            onlinePaymentEnabled: isOnlinePaymentReady,
            requirements: account.requirements?.currently_due || []
        };
    } catch (error) {
        if (error.message && (error.message.includes("not connected to your platform") || error.message.includes("does not exist") || error.code === "resource_missing")) {
            console.warn(`[STRIPE CONNECT SYNC] Compte ${company.stripeAccountId} obsolète ou introuvable. Réinitialisation en base...`);
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    stripeAccountId: null,
                    stripeOnboardingStatus: "NOT_STARTED",
                    stripeChargesEnabled: false,
                    stripePayoutsEnabled: false,
                    stripeDetailsSubmitted: false,
                    onlinePaymentEnabled: false,
                    stripeAccountStatus: null
                }
            });
            return {
                stripeAccountId: null,
                status: "NOT_STARTED",
                chargesEnabled: false,
                payoutsEnabled: false,
                detailsSubmitted: false
            };
        }
        console.error(`[STRIPE CONNECT SYNC ERROR] Account ${company.stripeAccountId}:`, error.message);
        throw error;
    }
};

/**
 * Déconnecte le compte Stripe d'une entreprise
 */
export const disconnectConnectedAccount = async (companyId) => {
    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });

    if (!company) {
        throw new Error("Entreprise introuvable");
    }

    await prisma.company.update({
        where: { id: companyId },
        data: {
            stripeAccountId: null,
            stripeOnboardingStatus: "NOT_STARTED",
            stripeChargesEnabled: false,
            stripePayoutsEnabled: false,
            stripeDetailsSubmitted: false,
            onlinePaymentEnabled: false,
            stripeAccountStatus: null
        }
    });

    return { success: true };
};
