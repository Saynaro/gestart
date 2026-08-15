import { prisma } from "../config/db.js";

////// STRIPE WEBHOOK HANDLER //////
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const event = req.body;

    try {
        const eventType = event.type || event.eventType;
        const dataObject = event.data?.object || event;

        console.log(`[STRIPE WEBHOOK] Event: ${eventType}`);

        switch (eventType) {
            case "checkout.session.completed": {
                const session = dataObject;
                const companyId = session.client_reference_id || session.metadata?.companyId;
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                if (companyId) {
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

                        const owner = await prisma.user.findFirst({
                            where: { companyId: sub.companyId, role: "OWNER" }
                        });

                        if (owner) {
                            await prisma.notification.create({
                                data: {
                                    companyId: sub.companyId,
                                    userId: owner.id,
                                    type: "PAYMENT_FAILED",
                                    channel: "IN_APP",
                                    status: "SENT",
                                    title: "Échec du paiement de l'abonnement",
                                    body: "Le paiement de votre abonnement a échoué. Veuillez mettre à jour vos coordonnées bancaires.",
                                    entityType: "subscription",
                                    entityId: sub.id
                                }
                            });
                        }
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
                console.log(`[STRIPE WEBHOOK] Non traité: ${eventType}`);
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

////// TWILIO INCOMING SMS WEBHOOK HANDLER //////
export const handleTwilioWebhook = async (req, res) => {
    const { From, To, Body, MessageSid } = req.body || req.query;

    if (!From || !Body) {
        return res.status(400).send("<Response><Message>Informations manquantes</Message></Response>");
    }

    try {
        const cleanFrom = From.replace(/\s+/g, "");

        // Recherche du client par numéro de téléphone
        const client = await prisma.client.findFirst({
            where: {
                phone: { contains: cleanFrom.slice(-9) },
                isActive: true
            }
        });

        if (client) {
            // Création de la ligne SMS entrante
            const smsLog = await prisma.smsLog.create({
                data: {
                    companyId: client.companyId,
                    clientId: client.id,
                    direction: "INCOMING",
                    channel: "SMS",
                    body: Body.trim(),
                    fromNumber: From,
                    toNumber: To,
                    twilioSid: MessageSid || null,
                    status: "received",
                    isRead: false
                }
            });

            // Notification au propriétaire de l'entreprise
            const owner = await prisma.user.findFirst({
                where: { companyId: client.companyId, role: "OWNER" }
            });

            if (owner) {
                await prisma.notification.create({
                    data: {
                        companyId: client.companyId,
                        userId: owner.id,
                        type: "NEW_MESSAGE_RECEIVED",
                        channel: "IN_APP",
                        status: "SENT",
                        title: `Nouveau SMS de ${client.firstName} ${client.lastName}`,
                        body: Body.slice(0, 100),
                        entityType: "sms",
                        entityId: smsLog.id
                    }
                });
            }
        }

        res.set("Content-Type", "text/xml");
        return res.status(200).send("<Response></Response>");
    } catch (error) {
        console.error("TWILIO WEBHOOK ERROR:", error.message);
        res.set("Content-Type", "text/xml");
        return res.status(500).send("<Response><Message>Erreur serveur</Message></Response>");
    }
};

////// B2BROUTER E-INVOICING WEBHOOK HANDLER //////
export const handleB2brouterWebhook = async (req, res) => {
    try {
        const { B2brouterWebhookHandler } = await import("../modules/e-invoicing/providers/b2brouter/B2brouterWebhookHandler.js");
        
        const payload = req.body;
        const headers = req.headers;
        
        console.log(`[B2BROUTER WEBHOOK] Received event: ${payload?.event || payload?.type || 'unknown'}`);
        
        const result = await B2brouterWebhookHandler.handleWebhook(payload, headers);
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("B2BROUTER WEBHOOK ERROR:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};

