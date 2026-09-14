import { prisma } from "../config/db.js";
import { stripe } from "../config/stripe.js";

////// GET COMPANY INFO //////
export const getCompany = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                subscription: {
                    include: {
                        plan: true,
                    }
                },
                settings: true,
                tradeCategories: {
                    include: {
                        tradeCategory: true,
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Société introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: { company }
        });
    } catch (error) {
        console.error("GET COMPANY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la société"
        });
    }
};

////// UPDATE COMPANY INFO (OWNER ONLY) //////
export const updateCompany = async (req, res) => {
    const companyId = req.user.companyId;
    const {
        name,
        siret,
        siren,
        legalForm,
        tvaNumber,
        rcsNumber,
        shareCapital,
        nafCode,
        phone,
        email,
        address,
        city,
        postalCode,
        website,
        logoUrl,
        signatureUrl,
        bankIban,
        bankBic,
        iban,
        bic,
        tradeCategories, // Array of category IDs
    } = req.body;

    try {
        // Mise à jour de la société et gestion atomique des catégories de métier & paramètres bancaires
        const updatedCompany = await prisma.$transaction(async (tx) => {
            if (Array.isArray(tradeCategories)) {
                // Supprime les anciennes catégories avant d'ajouter les nouvelles
                await tx.companyTradeCategory.deleteMany({
                    where: { companyId }
                });
            }

            const finalIban = bankIban !== undefined ? bankIban : iban;
            const finalBic = bankBic !== undefined ? bankBic : bic;
            if (finalIban !== undefined || finalBic !== undefined) {
                await tx.companySettings.upsert({
                    where: { companyId },
                    update: {
                        ...(finalIban !== undefined && { bankIban: finalIban ? finalIban.trim() : null }),
                        ...(finalBic !== undefined && { bankBic: finalBic ? finalBic.trim() : null })
                    },
                    create: {
                        companyId,
                        ...(finalIban !== undefined && { bankIban: finalIban ? finalIban.trim() : null }),
                        ...(finalBic !== undefined && { bankBic: finalBic ? finalBic.trim() : null })
                    }
                });
            }

            return await tx.company.update({
                where: { id: companyId },
                data: {
                    ...(name !== undefined && { name: name.trim() }),
                    ...(siret !== undefined && { siret: siret.trim() }),
                    ...(siren !== undefined && { siren: siren.trim() }),
                    ...(legalForm !== undefined && { legalForm }),
                    ...(tvaNumber !== undefined && { tvaNumber }),
                    ...(rcsNumber !== undefined && { rcsNumber: rcsNumber.trim() }),
                    ...(shareCapital !== undefined && { shareCapital: shareCapital.trim() }),
                    ...(nafCode !== undefined && { nafCode: nafCode.trim() }),
                    ...(phone !== undefined && { phone }),
                    ...(email !== undefined && { email: email.toLowerCase().trim() }),
                    ...(address !== undefined && { address: address.trim() }),
                    ...(city !== undefined && { city: city.trim() }),
                    ...(postalCode !== undefined && { postalCode: postalCode.trim() }),
                    ...(website !== undefined && { website: website.trim() }),
                    ...(logoUrl !== undefined && { logoUrl }),
                    ...(signatureUrl !== undefined && { signatureUrl }),
                    ...(Array.isArray(tradeCategories) && {
                        tradeCategories: {
                            create: tradeCategories.map((catId) => ({
                                tradeCategory: {
                                    connectOrCreate: {
                                        where: { id: catId },
                                        create: {
                                            id: catId,
                                            name: catId,
                                            slug: catId.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                                        }
                                    }
                                }
                            }))
                        }
                    })
                },
                include: {
                    subscription: {
                        include: { plan: true }
                    },
                    settings: true,
                    tradeCategories: {
                        include: { tradeCategory: true }
                    }
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Informations de la société mises à jour avec succès",
            data: { company: updatedCompany }
        });
    } catch (error) {
        console.error("UPDATE COMPANY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de la société"
        });
    }
};

////// UPLOAD COMPANY LOGO (OWNER ONLY) //////
export const uploadCompanyLogo = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const logoUrl = req.file?.path || req.body?.logoUrl;

        if (!logoUrl) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir un fichier image pour le logo"
            });
        }

        const company = await prisma.company.update({
            where: { id: companyId },
            data: { logoUrl },
            select: { id: true, logoUrl: true }
        });

        return res.status(200).json({
            success: true,
            message: "Logo de la société mis à jour avec succès",
            data: { logoUrl: company.logoUrl }
        });
    } catch (error) {
        console.error("UPLOAD LOGO ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du téléchargement du logo"
        });
    }
};

////// DELETE COMPANY LOGO (OWNER ONLY) //////
export const deleteCompanyLogo = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        await prisma.company.update({
            where: { id: companyId },
            data: { logoUrl: null }
        });

        return res.status(200).json({
            success: true,
            message: "Logo supprimé avec succès"
        });
    } catch (error) {
        console.error("DELETE LOGO ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du logo"
        });
    }
};

////// UPLOAD COMPANY SIGNATURE (OWNER ONLY) //////
export const uploadCompanySignature = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const signatureUrl = req.body?.signatureUrl;

        const company = await prisma.company.update({
            where: { id: companyId },
            data: { signatureUrl },
            select: { id: true, signatureUrl: true }
        });

        return res.status(200).json({
            success: true,
            message: "Signature de la société enregistrée avec succès",
            data: { signatureUrl: company.signatureUrl }
        });
    } catch (error) {
        console.error("UPLOAD SIGNATURE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'enregistrement de la signature"
        });
    }
};

////// DELETE COMPANY SIGNATURE (OWNER ONLY) //////
export const deleteCompanySignature = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        await prisma.company.update({
            where: { id: companyId },
            data: { signatureUrl: null }
        });

        return res.status(200).json({
            success: true,
            message: "Signature supprimée avec succès"
        });
    } catch (error) {
        console.error("DELETE SIGNATURE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de la signature"
        });
    }
};

////// GET COMPANY SETTINGS //////
export const getCompanySettings = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        // Upsert garantit que si les paramètres n'existent pas encore, ils seront créés par défaut
        const settings = await prisma.companySettings.upsert({
            where: { companyId },
            update: {},
            create: { companyId }
        });

        return res.status(200).json({
            success: true,
            data: { settings }
        });
    } catch (error) {
        console.error("GET SETTINGS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des paramètres"
        });
    }
};

////// UPDATE COMPANY SETTINGS (OWNER ONLY) //////
export const updateCompanySettings = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const { id, company, companyId: _cId, createdAt, updatedAt, ...validData } = req.body;
        const updatedSettings = await prisma.companySettings.upsert({
            where: { companyId },
            update: { ...validData },
            create: { companyId, ...validData }
        });

        return res.status(200).json({
            success: true,
            message: "Paramètres mis à jour avec succès",
            data: { settings: updatedSettings }
        });
    } catch (error) {
        console.error("UPDATE SETTINGS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour des paramètres"
        });
    }
};


////// GET COMPANY STATS (FAST AGGREGATIONS) //////
export const getCompanyStats = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Exécution en parallèle optimisée avec Promise.all
        const [
            totalClients,
            totalInterventionsThisMonth,
            completedInterventionsThisMonth,
            revenueThisMonth,
            pendingInvoicesCount
        ] = await Promise.all([
            prisma.client.count({
                where: { companyId, isActive: true }
            }),
            prisma.intervention.count({
                where: {
                    companyId,
                    createdAt: { gte: startOfMonth }
                }
            }),
            prisma.intervention.count({
                where: {
                    companyId,
                    status: "COMPLETED",
                    updatedAt: { gte: startOfMonth }
                }
            }),
            prisma.invoice.aggregate({
                _sum: { totalAmount: true },
                where: {
                    companyId,
                    status: "PAID",
                    createdAt: { gte: startOfMonth }
                }
            }),
            prisma.invoice.count({
                where: {
                    companyId,
                    status: "SENT"
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalClients,
                    totalInterventionsThisMonth,
                    completedInterventionsThisMonth,
                    revenueThisMonth: revenueThisMonth._sum.totalAmount || 0,
                    pendingInvoicesCount
                }
            }
        });
    } catch (error) {
        console.error("GET STATS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du calcul des statistiques"
        });
    }
};

////// CREATE STRIPE CONNECT ACCOUNT FOR COMPANY OWNER (IBAN LINKING) //////
export const createStripeConnectAccount = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        let company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Société introuvable"
            });
        }

        if (!stripe) {
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    stripeAccountId: `acct_demo_${companyId.slice(-6)}`,
                    stripeAccountStatus: "active",
                    onlinePaymentEnabled: true
                }
            });

            return res.status(200).json({
                success: true,
                message: "IBAN d'entreprise connecté avec succès à Stripe (Mode Démonstration)",
                data: {
                    url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?tab=abonnement&stripe_connected=true`
                }
            });
        }

        let stripeAccountId = company.stripeAccountId;

        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: "express",
                country: "FR",
                email: company.email || req.user.email,
                business_type: "company",
                company: { name: company.name }
            });

            stripeAccountId = account.id;

            await prisma.company.update({
                where: { id: companyId },
                data: {
                    stripeAccountId,
                    stripeAccountStatus: "pending"
                }
            });
        }

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/stripe?refresh=true`,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/stripe?success=true`,
            type: "account_onboarding",
        });

        return res.status(200).json({
            success: true,
            message: "Lien de connexion Stripe Connect généré avec succès",
            data: { url: accountLink.url }
        });
    } catch (error) {
        console.error("STRIPE CONNECT ACCOUNT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la connexion Stripe Connect"
        });
    }
};

////// GET STRIPE CONNECT ACCOUNT STATUS //////
export const getStripeConnectStatus = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company || !company.stripeAccountId) {
            return res.status(200).json({
                success: true,
                data: {
                    connected: false,
                    onlinePaymentEnabled: false,
                    status: "none"
                }
            });
        }

        if (stripe) {
            const account = await stripe.accounts.retrieve(company.stripeAccountId);
            const isEnabled = account.charges_enabled && account.payouts_enabled;

            await prisma.company.update({
                where: { id: companyId },
                data: {
                    onlinePaymentEnabled: isEnabled,
                    stripeAccountStatus: isEnabled ? "active" : "pending"
                }
            });

            return res.status(200).json({
                success: true,
                data: {
                    connected: true,
                    onlinePaymentEnabled: isEnabled,
                    status: isEnabled ? "active" : "pending",
                    chargesEnabled: account.charges_enabled,
                    payoutsEnabled: account.payouts_enabled
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                connected: !!company.stripeAccountId,
                onlinePaymentEnabled: company.onlinePaymentEnabled,
                status: company.stripeAccountStatus || "pending"
            }
        });
    } catch (error) {
        console.error("GET STRIPE CONNECT STATUS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la vérification du statut Stripe Connect"
        });
    }
};

////// PUBLIC IBAN & BIC VALIDATION ENDPOINT //////
export const validateIbanPublic = async (req, res) => {
    const { iban, bic } = req.body || req.query;

    if (!iban) {
        return res.status(400).json({
            success: false,
            message: "Le paramètre IBAN est obligatoire"
        });
    }

    const clean = iban.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    if (clean.length < 14 || clean.length > 34) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: "Longueur IBAN invalide"
        });
    }

    const country = clean.substring(0, 2);
    if (country === "FR" && clean.length !== 27) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: "Un IBAN français doit comporter exactement 27 caractères"
        });
    }

    const rearranged = clean.substring(4) + clean.substring(0, 4);
    let digits = "";
    for (let i = 0; i < rearranged.length; i++) {
        const charCode = rearranged.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) {
            digits += (charCode - 55).toString();
        } else if (charCode >= 48 && charCode <= 57) {
            digits += rearranged[i];
        } else {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Caractères non autorisés"
            });
        }
    }

    try {
        const remainder = BigInt(digits) % 97n;
        const isValid = remainder === 1n;

        let bicValid = true;
        if (bic) {
            const cleanBic = bic.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            bicValid = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic);
        }

        return res.status(200).json({
            success: true,
            valid: isValid && bicValid,
            data: {
                ibanValid: isValid,
                bicValid,
                country,
                formattedIban: clean.match(/.{1,4}/g)?.join(" ") || clean
            }
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: "Erreur de validation de l'IBAN"
        });
    }
};

////// DELETE COMPANY ACCOUNT (RGPD ART. 17 - DROIT À L'EFFACEMENT) //////
export const deleteCompanyAccount = async (req, res) => {
    const companyId = req.user.companyId;

    if (!companyId) {
        return res.status(400).json({
            success: false,
            message: "Identifiant de société manquant"
        });
    }

    try {
        // 1. Cancel Stripe Subscription if active
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { companyId }
            });
            if (stripe && subscription?.stripeSubscriptionId) {
                await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            }
        } catch (stripeErr) {
            console.warn("Could not cancel Stripe subscription during account deletion:", stripeErr.message);
        }

        // 2. Cascade delete all company data in an atomic transaction
        await prisma.$transaction(async (tx) => {
            // Delete payments & subscription
            const sub = await tx.subscription.findUnique({ where: { companyId } });
            if (sub) {
                await tx.payment.deleteMany({ where: { subscriptionId: sub.id } });
                await tx.subscription.delete({ where: { id: sub.id } });
            }

            // Quotes
            const quotes = await tx.quote.findMany({ where: { companyId }, select: { id: true } });
            if (quotes.length > 0) {
                const quoteIds = quotes.map(q => q.id);
                await tx.quoteLine.deleteMany({ where: { quoteId: { in: quoteIds } } });
                await tx.quote.deleteMany({ where: { companyId } });
            }

            // Invoices
            const invoices = await tx.invoice.findMany({ where: { companyId }, select: { id: true } });
            if (invoices.length > 0) {
                const invoiceIds = invoices.map(i => i.id);
                await tx.invoiceLine.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
                await tx.invoiceTransaction.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
                await tx.invoice.deleteMany({ where: { companyId } });
            }

            // Interventions
            const interventions = await tx.intervention.findMany({ where: { companyId }, select: { id: true } });
            if (interventions.length > 0) {
                const interventionIds = interventions.map(i => i.id);
                await tx.interventionPhoto.deleteMany({ where: { interventionId: { in: interventionIds } } });
                await tx.intervention.deleteMany({ where: { companyId } });
            }

            // Clients & Equipments
            const clients = await tx.client.findMany({ where: { companyId }, select: { id: true } });
            if (clients.length > 0) {
                const clientIds = clients.map(c => c.id);
                await tx.equipment.deleteMany({ where: { clientId: { in: clientIds } } });
                await tx.client.deleteMany({ where: { companyId } });
            }

            // Other related company records
            await tx.smsLog.deleteMany({ where: { companyId } });
            await tx.smsUsage.deleteMany({ where: { companyId } });
            await tx.whatsappConnection.deleteMany({ where: { companyId } });
            await tx.emailConnection.deleteMany({ where: { companyId } });
            await tx.notification.deleteMany({ where: { companyId } });
            await tx.invitation.deleteMany({ where: { companyId } });
            await tx.auditLog.deleteMany({ where: { companyId } });
            await tx.quoteRequest.deleteMany({ where: { companyId } });
            await tx.catalogItem.deleteMany({ where: { companyId } });
            await tx.interventionTypeItem.deleteMany({ where: { companyId } });
            await tx.companyTradeCategory.deleteMany({ where: { companyId } });
            await tx.bankTransaction.deleteMany({ where: { companyId } });
            await tx.bankAccount.deleteMany({ where: { companyId } });
            await tx.bankConnection.deleteMany({ where: { companyId } });
            await tx.serviceType.deleteMany({ where: { companyId } });
            await tx.reminderExecution.deleteMany({ where: { companyId } });
            await tx.reminderAutomation.deleteMany({ where: { companyId } });
            await tx.accountingExport.deleteMany({ where: { companyId } });
            await tx.tvaSummary.deleteMany({ where: { companyId } });
            await tx.accountingIntegration.deleteMany({ where: { companyId } });
            await tx.receivedInvoice.deleteMany({ where: { companyId } });
            await tx.eInvoicingEvent.deleteMany({ where: { companyId } });
            await tx.eInvoicingJob.deleteMany({ where: { companyId } });
            await tx.eInvoicingConnection.deleteMany({ where: { companyId } });
            await tx.companySettings.deleteMany({ where: { companyId } });

            // Users and push tokens
            const users = await tx.user.findMany({ where: { companyId }, select: { id: true } });
            if (users.length > 0) {
                const userIds = users.map(u => u.id);
                await tx.pushToken.deleteMany({ where: { userId: { in: userIds } } });
                await tx.user.deleteMany({ where: { companyId } });
            }

            // Finally, the company
            await tx.company.delete({ where: { id: companyId } });
        });

        return res.status(200).json({
            success: true,
            message: "Votre compte et toutes vos données ont été définitivement supprimés (Art. 17 RGPD)."
        });
    } catch (error) {
        console.error("DELETE ACCOUNT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression du compte: " + error.message
        });
    }
};


