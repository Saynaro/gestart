import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/db.js";
import { stripe } from "../config/stripe.js";
import { generateReceiptPdfBuffer } from "../utils/pdfGenerator.js";

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

        if (subscription) {
            const now = new Date();
            const periodEnd = subscription.status === "TRIALING" ? subscription.trialEndsAt : subscription.currentPeriodEnd;
            const isPeriodEnded = Boolean(periodEnd && new Date(periodEnd) < now);
            if (isPeriodEnded) {
                if (subscription.status !== "EXPIRED") {
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
        console.error("GET SUBSCRIPTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'abonnement"
        });
    }
};

////// CREATE PAYMENT INTENT (Stripe Elements) //////
export const createPaymentIntent = async (req, res) => {
    const companyId = req.user.companyId;
    const { planName, cycle = "MONTHLY" } = req.body;

    if (!planName) {
        return res.status(400).json({ success: false, message: "Plan requis" });
    }

    try {
        const targetPlan = await prisma.plan.findFirst({
            where: { name: planName.toUpperCase() }
        });

        if (!targetPlan) {
            return res.status(404).json({ success: false, message: "Plan introuvable" });
        }

        if (!stripe) {
            return res.status(503).json({ success: false, message: "Stripe non configuré" });
        }

        const amount = cycle === "ANNUAL"
            ? Math.round(targetPlan.priceAnnual * 12 * 100)
            : Math.round(targetPlan.priceMonthly * 100);

        // Get or create Stripe customer
        let subscription = await prisma.subscription.findUnique({ where: { companyId } });
        let customerId = subscription?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                metadata: { companyId }
            });
            customerId = customer.id;
        }

        // Create PaymentIntent with automatic_payment_methods for 3DS support
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'eur',
            customer: customerId,
            setup_future_usage: 'off_session',
            automatic_payment_methods: { enabled: true },
            metadata: { companyId, planName: targetPlan.name, cycle }
        });

        return res.status(200).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                amount,
                planDisplayName: targetPlan.displayName
            }
        });

    } catch (error) {
        console.error("CREATE PAYMENT INTENT ERROR:", error.message);
        return res.status(500).json({ success: false, message: error.message });
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

        if (stripe) {
            const amount = cycle === "ANNUAL"
                ? Math.round(targetPlan.priceAnnual * 12 * 100)
                : Math.round(targetPlan.priceMonthly * 100);

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                payment_method_options: {
                    card: {
                        request_three_d_secure: 'any',
                    },
                },
                line_items: [{
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Abonnement GestArt CRM — ${targetPlan.displayName} (${cycle === "ANNUAL" ? 'Annuel' : 'Mensuel'})`,
                            description: `Accès complet au plan ${targetPlan.displayName}`
                        },
                        unit_amount: amount,
                        recurring: {
                            interval: cycle === "ANNUAL" ? "year" : "month"
                        }
                    },
                    quantity: 1,
                }],
                mode: 'subscription',
                client_reference_id: companyId,
                customer_email: req.user.email,
                metadata: {
                    companyId,
                    planName: targetPlan.name,
                    cycle
                },
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?tab=abonnement&success=true&session_id={CHECKOUT_SESSION_ID}&plan=${targetPlan.name}&cycle=${cycle}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?tab=abonnement&canceled=true`,
            });

            return res.status(200).json({
                success: true,
                message: "Session de paiement créée avec succès",
                data: {
                    checkoutUrl: session.url
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Session de démonstration (Stripe non configuré)",
            data: {
                checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing?success=true&plan=${targetPlan.name.toLowerCase()}`
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

////// VERIFY CHECKOUT SESSION (ONLY UPGRADES IF STRIPE CONFIRMS PAYMENT WAS MADE) //////
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
            return res.status(400).json({
                success: false,
                message: "Stripe n'est pas configuré"
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'payment_intent']
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session introuvable"
            });
        }

        // Strict verification: only upgrade if Stripe confirms payment
        if (session.payment_status !== 'paid' && session.status !== 'complete') {
            return res.status(400).json({
                success: false,
                message: "Le paiement n'a pas été validé par Stripe"
            });
        }

        // Verify the session belongs to this user/company
        if (session.metadata?.companyId && session.metadata.companyId !== companyId && session.client_reference_id !== companyId) {
            return res.status(403).json({
                success: false,
                message: "Cette session n'appartient pas à votre entreprise"
            });
        }

        const planName = session.metadata?.planName || "PRO";
        const cycle = session.metadata?.cycle || "MONTHLY";

        const targetPlan = await prisma.plan.findFirst({
            where: { name: planName.toUpperCase() }
        });

        if (!targetPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan demandé introuvable"
            });
        }

        // Check if this session was already processed
        const existingPayment = await prisma.payment.findFirst({
            where: { stripePaymentIntentId: session.id }
        });

        if (existingPayment) {
            const currentSub = await prisma.subscription.findUnique({
                where: { companyId },
                include: { plan: true }
            });
            return res.status(200).json({
                success: true,
                message: "Abonnement déjà activé pour cette session",
                data: { subscription: currentSub }
            });
        }

        const now = new Date();
        const nextPeriodEnd = new Date();
        if (cycle === "ANNUAL") {
            nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
        } else {
            nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        }

        const stripeSubId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || `sub_${session.id}`;
        const stripeCustId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

        const updatedSubscription = await prisma.subscription.upsert({
            where: { companyId },
            update: {
                planId: targetPlan.id,
                status: "ACTIVE",
                cycle: cycle.toUpperCase(),
                currentPeriodStart: now,
                currentPeriodEnd: nextPeriodEnd,
                cancelledAt: null,
                stripeSubscriptionId: stripeSubId,
                ...(stripeCustId ? { stripeCustomerId: stripeCustId } : {})
            },
            create: {
                companyId,
                planId: targetPlan.id,
                status: "ACTIVE",
                cycle: cycle.toUpperCase(),
                currentPeriodStart: now,
                currentPeriodEnd: nextPeriodEnd,
                stripeSubscriptionId: stripeSubId,
                ...(stripeCustId ? { stripeCustomerId: stripeCustId } : {})
            },
            include: { plan: true }
        });

        const priceAmount = cycle === "ANNUAL" ? targetPlan.priceAnnual : targetPlan.priceMonthly;
        await prisma.payment.create({
            data: {
                subscriptionId: updatedSubscription.id,
                amount: priceAmount,
                currency: "EUR",
                status: "succeeded",
                method: "CARD",
                stripePaymentIntentId: session.id,
                paidAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: `Abonnement ${targetPlan.displayName} activé avec succès !`,
            data: { subscription: updatedSubscription }
        });

    } catch (error) {
        console.error("VERIFY SESSION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la vérification de la session: " + error.message
        });
    }
};

////// UPGRADE SUBSCRIPTION IMMEDIATELY //////
export const upgradeSubscription = async (req, res) => {
    const companyId = req.user.companyId;
    const { planName, cycle = "MONTHLY", cardHolder, cardNumber, cardExpiry, cardCvc } = req.body;

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

        // If Stripe keys are configured and card data was provided in the modal, process Stripe PaymentMethod & PaymentIntent
        if (stripe && cardNumber && cardExpiry && cardCvc) {
            const cleanNum = cardNumber.replace(/\s/g, "");
            const [expMonthStr, expYearStr] = cardExpiry.split("/");

            if (cleanNum.length >= 15 && expMonthStr && expYearStr) {
                try {
                    const expMonth = parseInt(expMonthStr, 10);
                    const expYear = parseInt(expYearStr.length === 2 ? `20${expYearStr}` : expYearStr, 10);

                    // 1. Create Payment Method in Stripe from entered card details
                    const paymentMethod = await stripe.paymentMethods.create({
                        type: 'card',
                        card: {
                            number: cleanNum,
                            exp_month: expMonth,
                            exp_year: expYear,
                            cvc: cardCvc,
                        },
                        billing_details: {
                            name: cardHolder || req.user.email,
                            email: req.user.email,
                        }
                    });

                    const amountInCents = Math.round((cycle === "ANNUAL" ? newPlan.priceAnnual : newPlan.priceMonthly) * 100);

                    // 2. Create and confirm PaymentIntent
                    const paymentIntent = await stripe.paymentIntents.create({
                        amount: amountInCents,
                        currency: 'eur',
                        payment_method: paymentMethod.id,
                        confirm: true,
                        automatic_payment_methods: {
                            enabled: true,
                            allow_redirects: 'always'
                        },
                        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?tab=abonnement&success=true&plan=${newPlan.name}&cycle=${cycle}`,
                        metadata: { companyId, planName: newPlan.name, cycle }
                    });

                    // 3. Check if 3D Secure bank verification challenge is required
                    if (paymentIntent.status === 'requires_action' && paymentIntent.next_action?.redirect_to_url?.url) {
                        return res.status(200).json({
                            success: true,
                            requires3DS: true,
                            redirectUrl: paymentIntent.next_action.redirect_to_url.url
                        });
                    }
                } catch (stripeError) {
                    console.warn("Stripe Direct PaymentMethod processing warning:", stripeError.message);
                }
            }
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
                stripeSubscriptionId: `sub_${Date.now()}`
            },
            create: {
                companyId,
                planId: newPlan.id,
                status: "ACTIVE",
                cycle: cycle.toUpperCase(),
                currentPeriodStart: now,
                currentPeriodEnd: nextPeriodEnd,
                stripeSubscriptionId: `sub_${Date.now()}`
            },
            include: { plan: true }
        });

        // Record payment in database history
        const priceAmount = cycle === "ANNUAL" ? newPlan.priceAnnual : newPlan.priceMonthly;
        await prisma.payment.create({
            data: {
                subscriptionId: updatedSubscription.id,
                amount: priceAmount,
                currency: "EUR",
                status: "succeeded",
                method: "CARD",
                stripePaymentIntentId: `pi_${Date.now()}`,
                paidAt: new Date()
            }
        }).catch(err => console.warn("Payment history creation skip:", err.message));

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
        const sub = await prisma.subscription.findUnique({ where: { companyId } });

        // If active Stripe Subscription exists, tell Stripe to cancel at end of period (no further charges)
        if (sub?.stripeSubscriptionId && stripe) {
            try {
                await stripe.subscriptions.update(sub.stripeSubscriptionId, {
                    cancel_at_period_end: true
                });
            } catch (stripeErr) {
                console.warn("Stripe subscription cancel_at_period_end warning:", stripeErr.message);
            }
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { companyId },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date()
            },
            include: { plan: true }
        });

        return res.status(200).json({
            success: true,
            message: "Votre abonnement a été résilié avec succès. Aucun prélèvement ne sera effectué le mois prochain.",
            data: { subscription: updatedSubscription }
        });
    } catch (error) {
        console.error("CANCEL SUBSCRIPTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la résiliation de l'abonnement"
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
                console.warn("Stripe subscription reactivate warning:", stripeErr.message);
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
        console.error("REACTIVATE SUBSCRIPTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la réactivation de l'abonnement"
        });
    }
};

////// GET STRIPE PORTAL URL //////
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

        // Find Stripe customer ID from DB
        const subscription = await prisma.subscription.findUnique({ where: { companyId } });
        let customerId = subscription?.stripeCustomerId;

        // If no customer exists, create one
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                metadata: { companyId }
            });
            customerId = customer.id;

            // Save customer ID to DB
            if (subscription) {
                await prisma.subscription.update({
                    where: { companyId },
                    data: { stripeCustomerId: customerId }
                });
            }
        }

        // Create Stripe Customer Portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return res.status(200).json({
            success: true,
            data: { portalUrl: portalSession.url }
        });

    } catch (error) {
        console.error("PORTAL URL ERROR:", error.message);

        // If portal not configured in Stripe Dashboard, return settings page
        if (error.message && error.message.includes('No configuration')) {
            return res.status(200).json({
                success: true,
                data: { portalUrl: returnUrl, warning: "Portail Stripe non configuré dans le Dashboard" }
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
        const planName = payment.subscription?.plan?.displayName || payment.subscription?.plan?.name || "Unlimited";
        const displayId = `REC-${payment.id.slice(-6).toUpperCase()}`;

        const rawAmountTtc = Number(payment.amount || 1);
        const rawAmountHt = rawAmountTtc / 1.2;
        const rawTva = rawAmountTtc - rawAmountHt;

        const paymentData = {
            type: "SUBSCRIPTION",
            docNumber: `${displayId} — Abonnement ${planName}`,
            amountTTC: rawAmountTtc,
            amountHT: rawAmountHt,
            tvaAmount: rawTva,
            tvaRate: 20,
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
            transactionId: payment.stripePaymentIntentId || displayId,
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
        console.error("GET SUBSCRIPTION RECEIPT PDF ERROR:", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la génération du reçu PDF" });
    }
};

