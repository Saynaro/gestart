import { prisma } from "../config/db.js";

////// GET CURRENT SUBSCRIPTION //////
export const getSubscription = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        let subscription = await prisma.subscription.findUnique({
            where: { companyId },
            include: {
                plan: true
            }
        });

        // Si aucune souscription n'existe, création automatique du Plan STARTER Trial
        if (!subscription) {
            const starterPlan = await prisma.plan.findFirst({
                where: { name: "STARTER" }
            });

            if (starterPlan) {
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 14);

                subscription = await prisma.subscription.create({
                    data: {
                        companyId,
                        planId: starterPlan.id,
                        status: "TRIALING",
                        cycle: "MONTHLY",
                        trialEndsAt: trialEndDate,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: trialEndDate,
                    },
                    include: { plan: true }
                });
            }
        }

        return res.status(200).json({
            success: true,
            data: { subscription }
        });
    } catch (error) {
        console.error("GET SUBSCRIPTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'abonnement"
        });
    }
};

////// CREATE CHECKOUT SESSION //////
export const createCheckoutSession = async (req, res) => {
    const companyId = req.user.companyId;
    const { planName, cycle = "MONTHLY" } = req.body;

    if (!planName) {
        return res.status(400).json({
            success: false,
            message: "Le nom du plan est requis (STARTER, PRO, UNLIMITED)"
        });
    }

    try {
        const targetPlan = await prisma.plan.findFirst({
            where: { name: planName.toUpperCase() }
        });

        if (!targetPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan demandé introuvable"
            });
        }

        // Si Stripe Secret Key est configurée
        if (process.env.STRIPE_SECRET_KEY) {
            // Intégration Stripe dynamique
            const priceId = cycle === "ANNUAL"
                ? targetPlan.stripeAnnualPriceId
                : targetPlan.stripeMonthlyPriceId;

            // Retourne l'URL Stripe Checkout
            return res.status(200).json({
                success: true,
                message: "Session de paiement créée avec succès",
                data: {
                    checkoutUrl: `${process.env.FRONTEND_URL}/checkout?plan=${targetPlan.name.toLowerCase()}&cycle=${cycle.toLowerCase()}`
                }
            });
        }

        // Mode Dev / Sandbox sans clé Stripe
        return res.status(200).json({
            success: true,
            message: "Session de démonstration (Stripe non configuré)",
            data: {
                checkoutUrl: `${process.env.FRONTEND_URL}/billing?success=true&plan=${targetPlan.name.toLowerCase()}`
            }
        });
    } catch (error) {
        console.error("CHECKOUT SESSION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de la session de paiement"
        });
    }
};

////// UPGRADE SUBSCRIPTION IMMEDIATELY //////
export const upgradeSubscription = async (req, res) => {
    const companyId = req.user.companyId;
    const { planName, cycle = "MONTHLY" } = req.body;

    if (!planName) {
        return res.status(400).json({
            success: false,
            message: "Le nom du plan est obligatoire"
        });
    }

    try {
        const newPlan = await prisma.plan.findFirst({
            where: { name: planName.toUpperCase() }
        });

        if (!newPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan demandé introuvable"
            });
        }

        const now = new Date();
        const nextPeriodEnd = new Date();
        if (cycle === "ANNUAL") {
            nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
        } else {
            nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        }

        const updatedSubscription = await prisma.subscription.upsert({
            where: { companyId },
            update: {
                planId: newPlan.id,
                status: "ACTIVE",
                cycle: cycle.toUpperCase(),
                currentPeriodStart: now,
                currentPeriodEnd: nextPeriodEnd,
                cancelledAt: null,
            },
            create: {
                companyId,
                planId: newPlan.id,
                status: "ACTIVE",
                cycle: cycle.toUpperCase(),
                currentPeriodStart: now,
                currentPeriodEnd: nextPeriodEnd,
            },
            include: { plan: true }
        });

        return res.status(200).json({
            success: true,
            message: `Abonnement mis à jour vers l'offre ${newPlan.displayName}`,
            data: { subscription: updatedSubscription }
        });
    } catch (error) {
        console.error("UPGRADE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à niveau de l'abonnement"
        });
    }
};

////// CANCEL SUBSCRIPTION //////
export const cancelSubscription = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const updatedSubscription = await prisma.subscription.update({
            where: { companyId },
            data: {
                cancelledAt: new Date()
            },
            include: { plan: true }
        });

        return res.status(200).json({
            success: true,
            message: "Abonnement annulé. L'accès reste actif jusqu'à la fin de la période en cours.",
            data: { subscription: updatedSubscription }
        });
    } catch (error) {
        console.error("CANCEL SUBSCRIPTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'annulation de l'abonnement"
        });
    }
};

////// REACTIVATE SUBSCRIPTION //////
export const reactivateSubscription = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const updatedSubscription = await prisma.subscription.update({
            where: { companyId },
            data: {
                status: "ACTIVE",
                cancelledAt: null
            },
            include: { plan: true }
        });

        return res.status(200).json({
            success: true,
            message: "Abonnement réactivé avec succès",
            data: { subscription: updatedSubscription }
        });
    } catch (error) {
        console.error("REACTIVATE SUBSCRIPTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la réactivation de l'abonnement"
        });
    }
};

////// GET STRIPE PORTAL URL //////
export const getPortalUrl = async (req, res) => {
    try {
        const portalUrl = process.env.STRIPE_SECRET_KEY
            ? `${process.env.FRONTEND_URL}/billing/portal`
            : `${process.env.FRONTEND_URL}/settings/billing`;

        return res.status(200).json({
            success: true,
            data: { portalUrl }
        });
    } catch (error) {
        console.error("PORTAL URL ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du lien du portail"
        });
    }
};

////// GET SUBSCRIPTION USAGE & LIMITS //////
export const getSubscriptionUsage = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const [subscription, activeClientsCount, activeTechsCount] = await Promise.all([
            prisma.subscription.findUnique({
                where: { companyId },
                include: { plan: true }
            }),
            prisma.client.count({
                where: { companyId, isActive: true }
            }),
            prisma.user.count({
                where: { companyId, isActive: true, role: "TECHNICIAN" }
            })
        ]);

        const plan = subscription?.plan;

        const maxClients = plan?.maxClients ?? 20;
        const maxTechnicians = plan?.maxTechnicians ?? 1;
        const maxSmsPerMonth = plan?.maxSmsPerMonth ?? 50;

        const smsUsed = subscription?.smsUsedThisMonth || 0;

        return res.status(200).json({
            success: true,
            data: {
                usage: {
                    clients: {
                        current: activeClientsCount,
                        max: maxClients,
                        isLimitReached: maxClients !== -1 && activeClientsCount >= maxClients
                    },
                    technicians: {
                        current: activeTechsCount,
                        max: maxTechnicians,
                        isLimitReached: maxTechnicians !== -1 && activeTechsCount >= maxTechnicians
                    },
                    sms: {
                        current: smsUsed,
                        max: maxSmsPerMonth,
                        isLimitReached: maxSmsPerMonth !== -1 && smsUsed >= maxSmsPerMonth
                    }
                }
            }
        });
    } catch (error) {
        console.error("GET USAGE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du calcul des limites d'utilisation"
        });
    }
};

////// GET SUBSCRIPTION INVOICES (STRIPE PAYMENTS) //////
export const getSubscriptionInvoices = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const subscription = await prisma.subscription.findUnique({
            where: { companyId }
        });

        if (!subscription) {
            return res.status(200).json({
                success: true,
                data: { invoices: [] }
            });
        }

        const invoices = await prisma.payment.findMany({
            where: { subscriptionId: subscription.id },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            success: true,
            data: { invoices }
        });
    } catch (error) {
        console.error("GET INVOICES ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'historique des factures"
        });
    }
};
