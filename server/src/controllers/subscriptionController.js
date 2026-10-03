import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/db.js";
import { stripe, getStripePriceId, STRIPE_PRICES } from "../config/stripe.js";
import { generateReceiptPdfBuffer } from "../utils/pdfGenerator.js";
import {
    sendSubscriptionActivatedEmail,
    sendSubscriptionCancelledEmail
} from "../utils/emailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        // Si aucune souscription n'existe, création automatique du Plan STARTER Trial 14 jours
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

        if (subscription) {
            const now = new Date();
            const periodEnd = subscription.status === "TRIALING" ? subscription.trialEndsAt : subscription.currentPeriodEnd;
            const isPeriodEnded = Boolean(periodEnd && new Date(periodEnd) < now);

            if (isPeriodEnded) {
                // Si la période est terminée et pas de renouvellement Stripe actif
                if (subscription.status !== "EXPIRED" && !subscription.stripeSubscriptionId) {
                    subscription = await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { status: "EXPIRED" },
                        include: { plan: true }
                    });
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: { subscription }
        });
    } catch (error) {
        console.error("[GET SUBSCRIPTION ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'abonnement"
        });
    }
};

////// CREATE CHECKOUT SESSION (OFFICIAL STRIPE PRICES) //////
export const createCheckoutSession = async (req, res) => {
    const companyId = req.user.companyId;
    const { planName, cycle = "MONTHLY" } = req.body;

    if (!planName) {
        return res.status(400).json({
            success: false,
            message: "Le nom du plan est requis (STARTER, PRO, UNLIMITED)"
        });
    }

    const normalizedPlan = planName.toUpperCase().trim();
    const normalizedCycle = (cycle || "MONTHLY").toUpperCase().trim();

    try {
        const targetPlan = await prisma.plan.findFirst({
            where: {
                name: (normalizedPlan === "PREMIUM" || normalizedPlan === "PRO")
                    ? { in: ["PRO", "PREMIUM"] }
                    : normalizedPlan
            }
        });

        if (!targetPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan demandé introuvable"
            });
        }

        if (!stripe) {
            return res.status(503).json({
                success: false,
                message: "Stripe n'est pas configuré sur le serveur"
            });
        }

        const stripePriceId = getStripePriceId(targetPlan.name, normalizedCycle);
        if (!stripePriceId) {
            console.error(`[STRIPE ERROR] Aucun Price ID trouvé pour plan=${targetPlan.name} cycle=${normalizedCycle}`);
            return res.status(500).json({
                success: false,
                message: `Configuration de prix Stripe manquante pour le plan ${targetPlan.displayName} (${normalizedCycle})`
            });
        }

        // 1. Get or create single Stripe Customer for this Company
        let subscription = await prisma.subscription.findUnique({ where: { companyId } });
        let customerId = subscription?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : undefined,
                metadata: { companyId }
            });
            customerId = customer.id;

            if (subscription) {
                await prisma.subscription.update({
                    where: { companyId },
                    data: { stripeCustomerId: customerId }
                });
            }
        }

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

        // 2. Create Stripe Checkout Session using fixed Stripe Price ID
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            payment_method_options: {
                card: {
                    request_three_d_secure: 'any',
                },
            },
            line_items: [{
                price: stripePriceId,
                quantity: 1,
            }],
            mode: 'subscription',
            client_reference_id: companyId,
            subscription_data: {
                metadata: {
                    companyId,
                    planName: targetPlan.name,
                    cycle: normalizedCycle
                }
            },
            metadata: {
                companyId,
                planName: targetPlan.name,
                cycle: normalizedCycle
            },
            success_url: `${frontendUrl}/settings?tab=abonnement&success=true&session_id={CHECKOUT_SESSION_ID}&plan=${targetPlan.name}&cycle=${normalizedCycle}`,
            cancel_url: `${frontendUrl}/settings?tab=abonnement&canceled=true`,
        });

        return res.status(200).json({
            success: true,
            message: "Session de paiement créée avec succès",
            data: {
                checkoutUrl: session.url
            }
        });
    } catch (error) {
        console.error("[CHECKOUT SESSION ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la création de la session de paiement: " + error.message
        });
    }
};

////// VERIFY CHECKOUT SESSION (IDEMPOTENT & AUTHORITATIVE) //////
export const verifyCheckoutSession = async (req, res) => {
    const companyId = req.user.companyId;
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: "L'identifiant de session est requis"
        });
    }

    try {
        if (!stripe) {
            return res.status(503).json({
                success: false,
                message: "Stripe n'est pas configuré"
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'payment_intent', 'invoice']
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session introuvable"
            });
        }

        // Strict verification: only accept completed sessions
        if (session.payment_status !== 'paid' && session.status !== 'complete') {
            return res.status(400).json({
                success: false,
                message: "Le paiement n'a pas encore été validé par Stripe"
            });
        }

        // Verify company ownership
        if (session.metadata?.companyId && session.metadata.companyId !== companyId && session.client_reference_id !== companyId) {
            return res.status(403).json({
                success: false,
                message: "Cette session n'appartient pas à votre entreprise"
            });
        }

        const planName = session.metadata?.planName || "PRO";
        const cycle = session.metadata?.cycle || "MONTHLY";

        const targetPlan = await prisma.plan.findFirst({
            where: {
                name: (planName === "PREMIUM" || planName === "PRO") ? { in: ["PRO", "PREMIUM"] } : planName
            }
        });

        if (!targetPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan demandé introuvable"
            });
        }

        const stripeSubId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        const stripeCustId = typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id;

        // Retrieve real billing period from Stripe subscription object
        let periodStart = new Date();
        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        if (session.subscription && typeof session.subscription === 'object') {
            if (session.subscription.current_period_start) {
                periodStart = new Date(session.subscription.current_period_start * 1000);
            }
            if (session.subscription.current_period_end) {
                periodEnd = new Date(session.subscription.current_period_end * 1000);
            }
        }

        const updatedSubscription = await prisma.subscription.upsert({
            where: { companyId },
            update: {
                planId: targetPlan.id,
                status: "ACTIVE",
                cycle: cycle.toUpperCase(),
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                cancelledAt: null,
                ...(stripeSubId ? { stripeSubscriptionId: stripeSubId } : {}),
                ...(stripeCustId ? { stripeCustomerId: stripeCustId } : {})
            },
            create: {
                companyId,
                planId: targetPlan.id,
                status: "ACTIVE",
                cycle: cycle.toUpperCase(),
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                stripeSubscriptionId: stripeSubId || null,
                stripeCustomerId: stripeCustId || null
            },
            include: { plan: true }
        });

        // Record payment history idempotently if invoice or payment intent available
        const stripeInvoice = typeof session.invoice === 'object' ? session.invoice : null;
        const invoiceId = stripeInvoice?.id || (typeof session.invoice === 'string' ? session.invoice : null);
        const paymentIntentId = session.payment_intent
            ? (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id)
            : null;

        if (paymentIntentId || invoiceId) {
            const existingPayment = await prisma.payment.findFirst({
                where: {
                    OR: [
                        ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
                        ...(invoiceId ? [{ stripeInvoiceId: invoiceId }] : [])
                    ]
                }
            });

            if (!existingPayment) {
                const amountPaid = session.amount_total ? session.amount_total / 100 : targetPlan.priceMonthly;
                await prisma.payment.create({
                    data: {
                        subscriptionId: updatedSubscription.id,
                        amount: amountPaid,
                        currency: (session.currency || "EUR").toUpperCase(),
                        status: "succeeded",
                        method: "CARD",
                        stripePaymentIntentId: paymentIntentId,
                        stripeInvoiceId: invoiceId,
                        stripeInvoiceUrl: stripeInvoice?.hosted_invoice_url || null,
                        paidAt: new Date()
                    }
                }).catch(err => console.warn("[VERIFY_SESSION PAYMENT RECORD WARNING]:", err.message));
            }
        }

        return res.status(200).json({
            success: true,
            message: `Abonnement ${targetPlan.displayName} activé avec succès !`,
            data: { subscription: updatedSubscription }
        });
    } catch (error) {
        console.error("[VERIFY SESSION ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la vérification de la session: " + error.message
        });
    }
};

////// UPGRADE / PLAN CHANGE (FOR EXISTING ACTIVE SUBSCRIPTION) //////
export const upgradeSubscription = async (req, res) => {
    const companyId = req.user.companyId;
    const { planName, cycle = "MONTHLY" } = req.body;

    if (!planName) {
        return res.status(400).json({
            success: false,
            message: "Le nom du plan est obligatoire"
        });
    }

    const normalizedPlan = planName.toUpperCase().trim();
    const normalizedCycle = (cycle || "MONTHLY").toUpperCase().trim();

    try {
        const newPlan = await prisma.plan.findFirst({
            where: {
                name: (normalizedPlan === "PREMIUM" || normalizedPlan === "PRO") ? { in: ["PRO", "PREMIUM"] } : normalizedPlan
            }
        });

        if (!newPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan demandé introuvable"
            });
        }

        const sub = await prisma.subscription.findUnique({
            where: { companyId },
            include: { plan: true }
        });

        // If active Stripe Subscription exists, update the item in Stripe with proration
        if (sub?.stripeSubscriptionId && stripe) {
            const newStripePriceId = getStripePriceId(newPlan.name, normalizedCycle);
            if (!newStripePriceId) {
                return res.status(400).json({
                    success: false,
                    message: "Identifiant de tarif Stripe introuvable pour cette formule"
                });
            }

            const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

            // Find main plan item (the item that is not the extra bank add-on)
            const mainItem = stripeSub.items.data.find(
                item => item.price.id !== STRIPE_PRICES.EXTRA_BANK
            ) || stripeSub.items.data[0];

            if (mainItem) {
                const updatedStripeSub = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
                    items: [
                        {
                            id: mainItem.id,
                            price: newStripePriceId
                        }
                    ],
                    proration_behavior: 'always_invoice',
                    metadata: {
                        companyId,
                        planName: newPlan.name,
                        cycle: normalizedCycle
                    }
                });

                const updatedSubscription = await prisma.subscription.update({
                    where: { companyId },
                    data: {
                        planId: newPlan.id,
                        cycle: normalizedCycle,
                        currentPeriodStart: new Date(updatedStripeSub.current_period_start * 1000),
                        currentPeriodEnd: new Date(updatedStripeSub.current_period_end * 1000),
                        cancelledAt: null,
                        status: "ACTIVE"
                    },
                    include: { plan: true }
                });

                return res.status(200).json({
                    success: true,
                    message: `Abonnement mis à niveau vers l'offre ${newPlan.displayName}`,
                    data: { subscription: updatedSubscription }
                });
            }
        }

        // If no active Stripe subscription exists yet, delegate to createCheckoutSession flow
        return createCheckoutSession(req, res);
    } catch (error) {
        console.error("[UPGRADE SUBSCRIPTION ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à niveau: " + error.message
        });
    }
};

////// CANCEL SUBSCRIPTION (AT PERIOD END — NO IMMEDIATE LOSS OF ACCESS) //////
export const cancelSubscription = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const sub = await prisma.subscription.findUnique({
            where: { companyId },
            include: { plan: true }
        });

        if (sub?.stripeSubscriptionId && stripe) {
            try {
                await stripe.subscriptions.update(sub.stripeSubscriptionId, {
                    cancel_at_period_end: true
                });
            } catch (stripeErr) {
                console.warn("[STRIPE CANCEL WARNING]:", stripeErr.message);
            }
        }

        // Keep status ACTIVE until currentPeriodEnd expires, but record cancelledAt
        const updatedSubscription = await prisma.subscription.update({
            where: { companyId },
            data: {
                cancelledAt: new Date()
            },
            include: { plan: true }
        });

        if (req.user?.email) {
            sendSubscriptionCancelledEmail({
                to: req.user.email,
                firstName: req.user.firstName || "Cher client",
                planName: sub?.plan?.displayName || sub?.plan?.name || "Pro",
                accessUntilDate: sub?.currentPeriodEnd || new Date()
            }).catch(err => console.error("[CANCEL_SUB EMAIL ERR]:", err.message));
        }

        return res.status(200).json({
            success: true,
            message: "Le renouvellement automatique a été désactivé. Vous conservez votre accès jusqu'à la fin de la période en cours.",
            data: { subscription: updatedSubscription }
        });
    } catch (error) {
        console.error("[CANCEL SUBSCRIPTION ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la désactivation du renouvellement"
        });
    }
};

////// REACTIVATE SUBSCRIPTION //////
export const reactivateSubscription = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const sub = await prisma.subscription.findUnique({ where: { companyId } });

        if (sub?.stripeSubscriptionId && stripe) {
            try {
                await stripe.subscriptions.update(sub.stripeSubscriptionId, {
                    cancel_at_period_end: false
                });
            } catch (stripeErr) {
                console.warn("[STRIPE REACTIVATE WARNING]:", stripeErr.message);
            }
        }

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
            message: "Abonnement réactivé avec succès !",
            data: { subscription: updatedSubscription }
        });
    } catch (error) {
        console.error("[REACTIVATE SUBSCRIPTION ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la réactivation de l'abonnement"
        });
    }
};

////// ADD EXTRA BANK ACCOUNT ADD-ON (+7 €/MO) //////
export const addExtraBankAddon = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        if (!stripe) {
            return res.status(503).json({ success: false, message: "Stripe n'est pas configuré" });
        }

        const extraBankPriceId = STRIPE_PRICES.EXTRA_BANK;
        if (!extraBankPriceId) {
            return res.status(500).json({ success: false, message: "STRIPE_EXTRA_BANK_PRICE_ID non configuré sur le serveur" });
        }

        const sub = await prisma.subscription.findUnique({
            where: { companyId },
            include: { plan: true }
        });

        if (!sub || !sub.stripeSubscriptionId) {
            return res.status(400).json({
                success: false,
                message: "Vous devez avoir un abonnement actif pour ajouter une option bancaire"
            });
        }

        const planName = (sub.plan?.name || "").toUpperCase();
        if (planName === "STARTER") {
            return res.status(403).json({
                success: false,
                message: "La synchronisation bancaire n'est pas disponible sur le forfait Starter. Passez au forfait Pro ou Unlimited."
            });
        }

        // For PRO: 1 bank is included. Max 1 extra bank addon (total 2 banks).
        if ((planName === "PRO" || planName === "PREMIUM") && sub.stripeExtraBankSubscriptionItemId) {
            return res.status(400).json({
                success: false,
                message: "Vous avez déjà atteint la limite maximale de 2 comptes bancaires sur le forfait Pro. Passez au forfait Unlimited."
            });
        }

        // Add subscription item in Stripe
        const item = await stripe.subscriptionItems.create({
            subscription: sub.stripeSubscriptionId,
            price: extraBankPriceId,
            quantity: 1,
            proration_behavior: 'always_invoice'
        });

        const updatedSub = await prisma.subscription.update({
            where: { companyId },
            data: {
                stripeExtraBankSubscriptionItemId: item.id
            },
            include: { plan: true }
        });

        return res.status(200).json({
            success: true,
            message: "Option compte bancaire supplémentaire activée (+7 €/mois)",
            data: { subscription: updatedSub }
        });
    } catch (error) {
        console.error("[ADD EXTRA BANK ADDON ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de l'ajout de l'option bancaire: " + error.message
        });
    }
};

////// REMOVE EXTRA BANK ACCOUNT ADD-ON //////
export const removeExtraBankAddon = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const sub = await prisma.subscription.findUnique({ where: { companyId } });

        if (!sub?.stripeExtraBankSubscriptionItemId) {
            return res.status(400).json({
                success: false,
                message: "Aucune option de compte bancaire supplémentaire active"
            });
        }

        if (stripe) {
            try {
                await stripe.subscriptionItems.del(sub.stripeExtraBankSubscriptionItemId, {
                    proration_behavior: 'always_invoice'
                });
            } catch (stripeErr) {
                console.warn("[REMOVE EXTRA BANK STRIPE WARNING]:", stripeErr.message);
            }
        }

        const updatedSub = await prisma.subscription.update({
            where: { companyId },
            data: {
                stripeExtraBankSubscriptionItemId: null
            },
            include: { plan: true }
        });

        return res.status(200).json({
            success: true,
            message: "Option de compte bancaire supplémentaire retirée avec succès",
            data: { subscription: updatedSub }
        });
    } catch (error) {
        console.error("[REMOVE EXTRA BANK ADDON ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors du retrait de l'option bancaire: " + error.message
        });
    }
};

////// GET STRIPE CUSTOMER PORTAL URL //////
export const getPortalUrl = async (req, res) => {
    const companyId = req.user.companyId;
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?tab=abonnement`;

    try {
        if (!stripe) {
            return res.status(200).json({
                success: true,
                data: { portalUrl: returnUrl }
            });
        }

        const subscription = await prisma.subscription.findUnique({ where: { companyId } });
        let customerId = subscription?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : undefined,
                metadata: { companyId }
            });
            customerId = customer.id;

            if (subscription) {
                await prisma.subscription.update({
                    where: { companyId },
                    data: { stripeCustomerId: customerId }
                });
            }
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return res.status(200).json({
            success: true,
            data: { portalUrl: portalSession.url }
        });

    } catch (error) {
        console.error("[PORTAL URL ERROR]:", error.message);

        if (error.message && error.message.includes('No configuration')) {
            return res.status(200).json({
                success: true,
                data: { portalUrl: returnUrl, warning: "Portail Stripe non configuré dans le Dashboard Stripe" }
            });
        }

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la génération du lien portail: " + error.message
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

        const maxClients = plan?.maxClients ?? 100;
        const maxTechnicians = plan?.maxTechnicians ?? 1;
        const maxSmsPerMonth = plan?.maxSmsPerMonth ?? 100;

        const smsUsed = subscription?.smsUsedThisMonth || 0;

        // Calculate allowed connected bank accounts based on plan and extra bank add-on
        let maxBankAccounts = 0;
        const planName = (plan?.name || "").toUpperCase();
        if (planName === "PRO" || planName === "PREMIUM") {
            maxBankAccounts = subscription?.stripeExtraBankSubscriptionItemId ? 2 : 1;
        } else if (planName === "UNLIMITED") {
            maxBankAccounts = subscription?.stripeExtraBankSubscriptionItemId ? 4 : 3;
        }

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
                    },
                    banks: {
                        max: maxBankAccounts,
                        hasExtraAddon: Boolean(subscription?.stripeExtraBankSubscriptionItemId)
                    }
                }
            }
        });
    } catch (error) {
        console.error("[GET USAGE ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du calcul des limites d'utilisation"
        });
    }
};

////// GET SUBSCRIPTION INVOICES //////
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
        console.error("[GET INVOICES ERROR]:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'historique des factures"
        });
    }
};

////// GET SUBSCRIPTION PAYMENT RECEIPT PDF //////
export const getSubscriptionReceiptPdf = async (req, res) => {
    const companyId = req.user.companyId;
    const { id } = req.params;

    try {
        const payment = await prisma.payment.findFirst({
            where: {
                id,
                subscription: { companyId }
            },
            include: {
                subscription: {
                    include: {
                        plan: true,
                        company: true
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Reçu de règlement introuvable" });
        }

        const company = payment.subscription?.company || {};
        const clientName = company.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email || "Client GestArt";
        const clientAddress = company.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "";
        const clientSiret = company.siret || "";
        const clientEmail = req.user.email || company.email || "";
        const planName = payment.subscription?.plan?.displayName || payment.subscription?.plan?.name || "Pro";
        const displayId = `REC-${payment.id.slice(-6).toUpperCase()}`;

        const rawAmountTtc = Number(payment.amount || 0);
        const rawAmountHt = rawAmountTtc;
        const rawTva = 0; // Art. 293 B CGI (Franchise en base de TVA)

        const paymentData = {
            type: "SUBSCRIPTION",
            docNumber: `${displayId} — Abonnement ${planName}`,
            amountTTC: rawAmountTtc,
            amountHT: rawAmountHt,
            tvaAmount: rawTva,
            tvaRate: 0,
            companyName: "KHALID SAINARO EI (GestArt)",
            companyAddress: "23 Rue Paganini, 06000 Nice, France",
            companySiret: "944 087 725 00015",
            companyEmail: "support.gestart@gmail.com",
            companyPhone: "06 51 60 43 16",
            clientName,
            clientEmail,
            clientPhone: company.phone || "",
            clientAddress,
            clientSiret,
            cardBrand: "CARTE BANCAIRE (STRIPE)",
            cardLast4: "",
            transactionId: payment.stripePaymentIntentId || payment.stripeInvoiceId || displayId,
            paidAt: payment.paidAt || payment.createdAt
        };

        let logoDataUri = null;
        try {
            const possiblePaths = [
                path.join(__dirname, "../assets/Logo-transparent.png"),
                path.resolve(process.cwd(), "src/assets/Logo-transparent.png"),
                path.resolve(process.cwd(), "../client/public/Logo-transparent.png")
            ];
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    const buf = fs.readFileSync(p);
                    logoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
                    break;
                }
            }
        } catch (e) {
            console.warn("Could not load receipt logo:", e);
        }

        const pdfBuffer = await generateReceiptPdfBuffer({
            paymentData,
            company: {
                name: "KHALID SAINARO EI (GestArt)",
                address: "23 Rue Paganini",
                postalCode: "06000",
                city: "Nice",
                siret: "944 087 725 00015",
                phone: "06 51 60 43 16",
                email: "support.gestart@gmail.com",
                logoUrl: logoDataUri
            },
            customization: {
                primaryColor: "#556B2F",
                logoUrl: logoDataUri
            }
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Recu_Paiement_${displayId}.pdf"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("[GET SUBSCRIPTION RECEIPT PDF ERROR]:", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la génération du reçu PDF" });
    }
};

