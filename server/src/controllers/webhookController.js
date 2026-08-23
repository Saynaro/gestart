import { prisma } from "../config/db.js";
import { stripe } from "../config/stripe.js";
import { syncAccountStatus } from "../services/stripeConnectService.js";

/**
 * Webhook Stripe pour la Plateforme & Abonnements SaaS (GestArt CRM)
 * POST /api/v1/webhooks/stripe
 */
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event = req.body;

    // Vérification cryptographique de la signature Stripe si le secret est configuré
    if (process.env.STRIPE_WEBHOOK_SECRET && stripe && sig) {
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error(`[STRIPE WEBHOOK ERROR] Signature invalide:`, err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    try {
        const eventType = event.type || event.eventType;
        const dataObject = event.data?.object || event;

        console.log(`[STRIPE PLATFORM WEBHOOK] Event: ${eventType}`);

        switch (eventType) {
            case "checkout.session.completed": {
                const session = dataObject;
                const metadata = session.metadata || {};

                // 1. Facture (Invoice) Client Online Payment
                if (metadata.type === "INVOICE_PAYMENT" || metadata.invoiceId) {
                    const invoiceId = metadata.invoiceId || session.client_reference_id;
                    if (invoiceId) {
                        try {
                            const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
                            if (inv && inv.paymentStatus !== "PAID") {
                                await prisma.$transaction([
                                    prisma.invoice.update({
                                        where: { id: invoiceId },
                                        data: {
                                            status: "PAID",
                                            paymentStatus: "PAID",
                                            invoicePaymentMethod: "CARD",
                                            amountPaid: inv.amountTTC,
                                            paidAt: new Date(),
                                            paymentMethod: "CARD",
                                            paymentRef: session.payment_intent || session.id
                                        }
                                    }),
                                    prisma.invoiceTransaction.create({
                                        data: {
                                            invoiceId: inv.id,
                                            companyId: inv.companyId,
                                            type: "CARD",
                                            status: "succeeded",
                                            amount: inv.amountTTC,
                                            currency: "EUR",
                                            stripeCheckoutSessionId: session.id,
                                            stripePaymentIntentId: session.payment_intent || null,
                                            paidAt: new Date()
                                        }
                                    })
                                ]);

                                const owner = await prisma.user.findFirst({
                                    where: { companyId: inv.companyId, role: "OWNER" }
                                });
                                if (owner) {
                                    await prisma.notification.create({
                                        data: {
                                            companyId: inv.companyId,
                                            userId: owner.id,
                                            type: "INVOICE_PAID",
                                            channel: "IN_APP",
                                            status: "SENT",
                                            title: `Facture ${inv.number} payée en ligne !`,
                                            body: `Le client a réglé la facture ${inv.number} (${inv.amountTTC}€) par carte bancaire.`,
                                            entityType: "invoice",
                                            entityId: inv.id
                                        }
                                    });
                                }
                            }
                        } catch (e) {
                            console.error("[WEBHOOK] Erreur règlement facture:", e.message);
                        }
                    }
                }

                // 2. Devis (Quote) Client Online Payment
                if (metadata.type === "QUOTE_PAYMENT" || metadata.quoteId) {
                    const quoteId = metadata.quoteId || session.client_reference_id;
                    if (quoteId) {
                        try {
                            const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
                            if (quote) {
                                await prisma.quote.update({
                                    where: { id: quoteId },
                                    data: {
                                        status: "ACCEPTED",
                                        acceptedAt: new Date(),
                                        paidAt: new Date()
                                    }
                                });

                                const linkedInvoice = await prisma.invoice.findFirst({
                                    where: { sourceQuoteId: quote.id }
                                });

                                if (linkedInvoice && linkedInvoice.status !== "PAID") {
                                    await prisma.invoice.update({
                                        where: { id: linkedInvoice.id },
                                        data: {
                                            status: "PAID",
                                            paymentStatus: "PAID",
                                            invoicePaymentMethod: "CARD",
                                            amountPaid: linkedInvoice.amountTTC,
                                            paidAt: new Date(),
                                            paymentMethod: "CARD",
                                            paymentRef: session.payment_intent || session.id
                                        }
                                    });
                                }

                                const owner = await prisma.user.findFirst({
                                    where: { companyId: quote.companyId, role: "OWNER" }
                                });
                                if (owner) {
                                    await prisma.notification.create({
                                        data: {
                                            companyId: quote.companyId,
                                            userId: owner.id,
                                            type: "INVOICE_PAID",
                                            channel: "IN_APP",
                                            status: "SENT",
                                            title: `Devis ${quote.number} validé et payé !`,
                                            body: `Le devis ${quote.number} (${quote.amountTTC || quote.totalTtc}€) a été réglé en ligne.`,
                                            entityType: "quote",
                                            entityId: quote.id
                                        }
                                    });
                                }
                            }
                        } catch (e) {
                            console.error("[WEBHOOK] Erreur règlement devis:", e.message);
                        }
                    }
                }

                // 3. SaaS Subscription Payment (Platform CRM)
                const companyId = session.client_reference_id || session.metadata?.companyId;
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                if (companyId && subscriptionId) {
                    await prisma.subscription.update({
                        where: { companyId },
                        data: {
                            status: "ACTIVE",
                            stripeCustomerId: customerId,
                            stripeSubscriptionId: subscriptionId,
                            currentPeriodStart: new Date(),
                            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        }
                    });
                }
                break;
            }

            case "invoice.payment_succeeded": {
                const invoice = dataObject;
                const customerId = invoice.customer;

                if (customerId) {
                    const sub = await prisma.subscription.findFirst({
                        where: { stripeCustomerId: customerId }
                    });

                    if (sub) {
                        await prisma.subscription.update({
                            where: { id: sub.id },
                            data: {
                                status: "ACTIVE",
                                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            }
                        });
                    }
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = dataObject;
                const customerId = invoice.customer;

                if (customerId) {
                    const sub = await prisma.subscription.findFirst({
                        where: { stripeCustomerId: customerId }
                    });

                    if (sub) {
                        await prisma.subscription.update({
                            where: { id: sub.id },
                            data: { status: "PAST_DUE" }
                        });
                    }
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = dataObject;
                const subscriptionId = subscription.id;

                const sub = await prisma.subscription.findFirst({
                    where: { stripeSubscriptionId: subscriptionId }
                });

                if (sub) {
                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: {
                            status: "CANCELLED",
                            canceledAt: new Date()
                        }
                    });
                }
                break;
            }

            default:
                console.log(`[STRIPE PLATFORM WEBHOOK] Event non traité: ${eventType}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("STRIPE WEBHOOK ERROR:", error.message);
        return res.status(400).json({
            success: false,
            message: `Webhook Error: ${error.message}`
        });
    }
};

/**
 * Webhook Stripe Connect pour les paiements de factures des installateurs (Connected Accounts)
 * POST /api/v1/webhooks/stripe-connect
 */
export const handleStripeConnectWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
    let event = req.body;

    // Vérification cryptographique de la signature Stripe Connect
    if (connectSecret && stripe && sig) {
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, connectSecret);
        } catch (err) {
            console.error(`[STRIPE CONNECT WEBHOOK ERROR] Signature invalide:`, err.message);
            return res.status(400).send(`Webhook Connect Error: ${err.message}`);
        }
    }

    try {
        const eventType = event.type || event.eventType;
        const dataObject = event.data?.object || event;

        console.log(`[STRIPE CONNECT WEBHOOK] Event: ${eventType} (Event ID: ${event.id})`);

        // Idempotence : vérification si l'événement a déjà été traité
        if (event.id) {
            const existingEvent = await prisma.invoicePaymentEvent.findUnique({
                where: { stripeEventId: event.id }
            });
            if (existingEvent) {
                console.log(`[STRIPE CONNECT WEBHOOK] Event ${event.id} déjà traité.`);
                return res.status(200).json({ received: true, idempotent: true });
            }
        }

        switch (eventType) {
            case "checkout.session.completed": {
                const session = dataObject;
                const metadata = session.metadata || {};
                const invoiceId = metadata.invoiceId || session.client_reference_id;

                if (invoiceId) {
                    const invoice = await prisma.invoice.findUnique({
                        where: { id: invoiceId },
                        include: { company: true }
                    });

                    if (invoice && invoice.paymentStatus !== "PAID") {
                        await prisma.$transaction([
                            prisma.invoice.update({
                                where: { id: invoiceId },
                                data: {
                                    status: "PAID",
                                    paymentStatus: "PAID",
                                    invoicePaymentMethod: "CARD",
                                    paymentMethod: "CARD",
                                    amountPaid: invoice.amountTTC,
                                    paidAt: new Date(),
                                    paymentRef: session.payment_intent || session.id
                                }
                            }),
                            prisma.invoiceTransaction.create({
                                data: {
                                    invoiceId: invoice.id,
                                    companyId: invoice.companyId,
                                    type: "CARD",
                                    status: "succeeded",
                                    amount: invoice.amountTTC,
                                    currency: "EUR",
                                    stripeCheckoutSessionId: session.id,
                                    stripePaymentIntentId: session.payment_intent || null,
                                    paidAt: new Date()
                                }
                            }),
                            prisma.invoicePaymentEvent.create({
                                data: {
                                    invoiceId: invoice.id,
                                    event: "checkout.completed",
                                    amount: invoice.amountTTC,
                                    currency: "EUR",
                                    stripeEventId: event.id || `evt_mock_${Date.now()}`,
                                    stripeData: session
                                }
                            })
                        ]);

                        // Notification au propriétaire
                        const owner = await prisma.user.findFirst({
                            where: { companyId: invoice.companyId, role: "OWNER" }
                        });
                        if (owner) {
                            await prisma.notification.create({
                                data: {
                                    companyId: invoice.companyId,
                                    userId: owner.id,
                                    type: "INVOICE_PAID",
                                    channel: "IN_APP",
                                    status: "SENT",
                                    title: `Facture ${invoice.number} réglée par carte !`,
                                    body: `Paiement en ligne de ${invoice.amountTTC}€ reçu pour la facture ${invoice.number}.`,
                                    entityType: "invoice",
                                    entityId: invoice.id
                                }
                            });
                        }
                    }
                }
                break;
            }

            case "payment_intent.succeeded": {
                const paymentIntent = dataObject;
                const invoiceId = paymentIntent.metadata?.invoiceId;

                if (invoiceId) {
                    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
                    if (invoice && invoice.paymentStatus !== "PAID") {
                        await prisma.invoice.update({
                            where: { id: invoiceId },
                            data: {
                                status: "PAID",
                                paymentStatus: "PAID",
                                invoicePaymentMethod: "CARD",
                                paymentMethod: "CARD",
                                amountPaid: invoice.amountTTC,
                                paidAt: new Date(),
                                stripePaymentIntentId: paymentIntent.id,
                                paymentRef: paymentIntent.id
                            }
                        });
                    }
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = dataObject;
                const invoiceId = paymentIntent.metadata?.invoiceId;

                if (invoiceId) {
                    await prisma.invoice.update({
                        where: { id: invoiceId },
                        data: {
                            paymentStatus: "FAILED"
                        }
                    });

                    if (event.id) {
                        await prisma.invoicePaymentEvent.create({
                            data: {
                                invoiceId,
                                event: "payment.failed",
                                amount: (paymentIntent.amount || 0) / 100,
                                stripeEventId: event.id,
                                stripeData: paymentIntent
                            }
                        });
                    }
                }
                break;
            }

            case "account.updated": {
                const account = dataObject;
                const companyId = account.metadata?.companyId;

                if (companyId) {
                    await syncAccountStatus(companyId);
                } else if (account.id) {
                    const company = await prisma.company.findUnique({
                        where: { stripeAccountId: account.id }
                    });
                    if (company) {
                        await syncAccountStatus(company.id);
                    }
                }
                break;
            }

            default:
                console.log(`[STRIPE CONNECT WEBHOOK] Event non traité: ${eventType}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("STRIPE CONNECT WEBHOOK ERROR:", error.message);
        return res.status(400).json({
            success: false,
            message: `Webhook Connect Error: ${error.message}`
        });
    }
};

/**
 * Webhook Twilio pour les SMS entrants (POST /api/v1/webhooks/twilio/sms ou /twilio)
 */
export const handleTwilioWebhook = async (req, res) => {
    try {
        const { TwilioSmsService, validateTwilioWebhookSignature } = await import("../services/messaging/sms/twilio.service.js");

        // 1. Validation de la signature Twilio
        const isSignatureValid = validateTwilioWebhookSignature(req);
        if (!isSignatureValid) {
            return res.status(403).send("<Response><Message>Signature invalide</Message></Response>");
        }

        const { From, To, Body, MessageSid } = req.body || req.query || {};

        if (!From || !Body) {
            return res.status(400).send("<Response><Message>Parametres manquants</Message></Response>");
        }

        // 2. Traitement via TwilioSmsService
        await TwilioSmsService.handleIncomingSms({
            from: From,
            to: To,
            body: Body,
            messageSid: MessageSid,
            rawPayload: req.body
        });

        // 3. Réponse TwiML standard (200 OK avec XML vide pour ne pas renvoyer de SMS automatique non désiré)
        res.set("Content-Type", "text/xml");
        return res.status(200).send("<Response></Response>");
    } catch (error) {
        console.error("[TWILIO INCOMING WEBHOOK ERROR]:", error.message);
        res.set("Content-Type", "text/xml");
        return res.status(500).send("<Response><Message>Erreur de traitement</Message></Response>");
    }
};

/**
 * Webhook Twilio pour les changements de statut de livraison des SMS
 * POST /api/v1/webhooks/twilio/status
 */
export const handleTwilioStatusWebhook = async (req, res) => {
    try {
        const { TwilioSmsService, validateTwilioWebhookSignature } = await import("../services/messaging/sms/twilio.service.js");

        const isSignatureValid = validateTwilioWebhookSignature(req);
        if (!isSignatureValid) {
            return res.status(403).json({ success: false, message: "Signature invalide" });
        }

        const { MessageSid, MessageStatus, SmsStatus, ErrorCode, ErrorMessage } = req.body || {};
        const status = MessageStatus || SmsStatus;

        if (MessageSid && status) {
            await TwilioSmsService.handleStatusCallback({
                messageSid: MessageSid,
                messageStatus: status,
                errorCode: ErrorCode,
                errorMessage: ErrorMessage
            });
        }

        return res.status(200).json({ success: true, received: true });
    } catch (error) {
        console.error("[TWILIO STATUS WEBHOOK ERROR]:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Webhook B2Brouter pour la Facturation Électronique
 */
export const handleB2brouterWebhook = async (req, res) => {
    try {
        const { B2brouterWebhookHandler } = await import("../modules/e-invoicing/providers/b2brouter/B2brouterWebhookHandler.js");
        const payload = req.body;
        const headers = req.headers;
        const result = await B2brouterWebhookHandler.handleWebhook(payload, headers);
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("B2BROUTER WEBHOOK ERROR:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Webhook Meta WhatsApp : Vérification du Challenge lors de la configuration
 * GET /api/v1/webhooks/whatsapp
 */
export const handleWhatsAppVerificationWebhook = async (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "gestart_whatsapp_webhook_verify_secret_token";

    if (mode && token) {
        if (mode === "subscribe" && token === verifyToken) {
            console.log("[WHATSAPP_WEBHOOK_VERIFIED] Challenge Meta accepté avec succès");
            return res.status(200).send(challenge);
        } else {
            console.warn("[WHATSAPP_WEBHOOK_VERIFY_FAILED] Token de vérification invalide:", token);
            return res.sendStatus(403);
        }
    }

    return res.sendStatus(400);
};

/**
 * Webhook Meta WhatsApp : Réception des messages et statuts
 * POST /api/v1/webhooks/whatsapp
 */
export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const { whatsAppProvider } = await import("../services/messaging/providers/whatsapp/WhatsAppProvider.js");
        const payload = req.body;

        await whatsAppProvider.handleIncomingWebhook(payload);

        // Meta exige une réponse 200 OK immédiate
        return res.status(200).json({ status: "EVENT_RECEIVED" });
    } catch (error) {
        console.error("[WHATSAPP WEBHOOK ERROR]:", error.message);
        return res.status(200).json({ status: "ERROR_HANDLED", error: error.message });
    }
};

/**
 * Webhook Inbound Email : Réception des emails entrants
 * POST /api/v1/webhooks/email
 */
export const handleEmailWebhook = async (req, res) => {
    try {
        const { emailProvider } = await import("../services/messaging/providers/email/EmailProvider.js");
        const payload = req.body;

        await emailProvider.handleIncomingWebhook(payload);

        return res.status(200).json({ success: true, message: "Email traité" });
    } catch (error) {
        console.error("[EMAIL WEBHOOK ERROR]:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};


