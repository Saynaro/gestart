import { prisma } from "../config/db.js";
import { stripe } from "../config/stripe.js";
import { generateInvoicePdfBuffer, generateQuotePdfBuffer } from "../utils/pdfGenerator.js";

////// PUBLIC PLANS LIST (FOR LANDING PAGE) //////
export const getPublicPlans = async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { priceMonthly: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: { plans }
        });
    } catch (error) {
        console.error("GET PUBLIC PLANS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des offres"
        });
    }
};

////// GET PUBLIC COMPANY INFO (FOR WEBSITE FORM) //////
export const getPublicCompany = async (req, res) => {
    const { companySlug } = req.params;

    try {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { slug: companySlug },
                    { id: companySlug }
                ]
            },
            select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                phone: true,
                email: true,
                website: true,
                tradeCategories: {
                    select: {
                        name: true,
                        slug: true
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
        console.error("GET PUBLIC COMPANY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des informations de la société"
        });
    }
};

////// SUBMIT PUBLIC QUOTE REQUEST (CONTACT FORM) //////
export const submitQuoteRequest = async (req, res) => {
    const { companySlug } = req.params;
    const { firstName, lastName, phone, email, address, tradeType, tradeSlug, message } = req.body;

    if (!firstName || !lastName || !phone) {
        return res.status(400).json({
            success: false,
            message: "Veuillez renseigner votre prénom, nom et numéro de téléphone"
        });
    }

    try {
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { slug: companySlug },
                    { id: companySlug }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Société destinataire introuvable"
            });
        }

        // Création de la demande de devis public
        const quoteRequest = await prisma.quoteRequest.create({
            data: {
                companyId: company.id,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim(),
                email: email ? email.toLowerCase().trim() : null,
                address: address ? address.trim() : null,
                tradeSlug: tradeSlug || tradeType || null,
                message: message ? message.trim() : null,
                isProcessed: false
            }
        });

        // Notification au propriétaire de l'entreprise
        const owner = await prisma.user.findFirst({
            where: { companyId: company.id, role: "OWNER" }
        });

        if (owner) {
            await prisma.notification.create({
                data: {
                    companyId: company.id,
                    userId: owner.id,
                    type: "NEW_QUOTE_REQUEST",
                    channel: "IN_APP",
                    status: "SENT",
                    title: "Nouvelle demande de devis",
                    body: `Demande de devis reçue de ${firstName} ${lastName} (${phone})`,
                    entityType: "quote_request",
                    entityId: quoteRequest.id
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Votre demande de devis a été transmise avec succès",
            data: { quoteRequest }
        });
    } catch (error) {
        console.error("SUBMIT QUOTE REQUEST ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la transmission de votre demande de devis"
        });
    }
};

////// GET PUBLIC INVOICE FOR ONLINE PAYMENT //////
export const getPublicInvoiceByToken = async (req, res) => {
    const { paymentToken } = req.params;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { paymentToken },
                    { id: paymentToken }
                ]
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        signatureUrl: true,
                        phone: true,
                        email: true,
                        address: true,
                        city: true,
                        postalCode: true,
                        siret: true,
                        settings: true
                    }
                },
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        email: true,
                        phone: true,
                        address: true
                    }
                },
                lines: { orderBy: { position: "asc" } }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Lien de paiement invalide ou facture introuvable"
            });
        }

        // Marquer le moment d'ouverture de la page de paiement
        if (!invoice.paymentLinkOpenedAt) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { paymentLinkOpenedAt: new Date() }
            });
        }

        return res.status(200).json({
            success: true,
            data: { invoice }
        });
    } catch (error) {
        console.error("GET PUBLIC INVOICE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la facture"
        });
    }
};

////// CREATE STRIPE CHECKOUT SESSION FOR INVOICE //////
export const createPublicInvoiceCheckoutSession = async (req, res) => {
    const { paymentToken } = req.params;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { paymentToken },
                    { id: paymentToken }
                ]
            },
            include: { company: true, client: true }
        });

        if (!invoice || invoice.status === "PAID") {
            return res.status(400).json({
                success: false,
                message: invoice?.status === "PAID" ? "Cette facture a déjà été réglée" : "Facture introuvable"
            });
        }

        let checkoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/success?invoiceId=${invoice.id}`;

        if (stripe) {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                payment_method_options: {
                    card: {
                        request_three_d_secure: 'any',
                    },
                },
                payment_intent_data: {
                    metadata: {
                        invoiceId: invoice.id,
                        companyId: invoice.companyId,
                        type: 'INVOICE_PAYMENT'
                    },
                },
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: `Facture ${invoice.number} - ${invoice.company?.name || 'Prestation'}`,
                                description: invoice.subject || 'Règlement de facture',
                            },
                            unit_amount: Math.round(Number(invoice.amountTTC) * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                customer_email: invoice.client?.email || undefined,
                client_reference_id: invoice.id,
                metadata: {
                    invoiceId: invoice.id,
                    companyId: invoice.companyId,
                    type: 'INVOICE_PAYMENT'
                },
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/success?invoiceId=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/invoice/${paymentToken}?canceled=true`,
            });

            if (session?.url) {
                checkoutUrl = session.url;
            }
        }

        return res.status(200).json({
            success: true,
            message: "Session de paiement créée avec succès",
            data: {
                checkoutUrl,
                amountTTC: invoice.amountTTC,
                invoiceNumber: invoice.number
            }
        });
    } catch (error) {
        console.error("CREATE CHECKOUT SESSION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de la session de paiement"
        });
    }
};

////// GET PUBLIC QUOTE FOR ONLINE SIGNATURE (WITH AUTO EXPIRATION CHECK) //////
export const getPublicQuoteByToken = async (req, res) => {
    const { signatureToken } = req.params;

    try {
        let quote = await prisma.quote.findFirst({
            where: {
                OR: [
                    { signatureToken },
                    { id: signatureToken }
                ]
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        signatureUrl: true,
                        phone: true,
                        email: true,
                        address: true,
                        city: true,
                        postalCode: true,
                        siret: true,
                        settings: true
                    }
                },
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        email: true,
                        phone: true,
                        address: true
                    }
                },
                lines: { orderBy: { position: "asc" } }
            }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Lien de devis invalide ou devis introuvable"
            });
        }

        // Vérification automatique de l'expiration du devis (validUntil < now)
        const now = new Date();
        if (quote.validUntil && new Date(quote.validUntil) < now && quote.status === "SENT") {
            quote = await prisma.quote.update({
                where: { id: quote.id },
                data: { status: "EXPIRED" },
                include: {
                    company: { select: { name: true, logoUrl: true, phone: true, email: true } },
                    client: { select: { firstName: true, lastName: true, companyName: true, email: true, phone: true } },
                    lines: { orderBy: { position: "asc" } }
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: { quote }
        });
    } catch (error) {
        console.error("GET PUBLIC QUOTE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du devis"
        });
    }
};

////// SIGN PUBLIC QUOTE ONLINE (AUTOMATIC ACCEPTANCE & NOTIFICATION) //////
export const signPublicQuote = async (req, res) => {
    const { signatureToken } = req.params;
    const { signatureData } = req.body; // Image base64 ou signature canvas

    if (!signatureData) {
        return res.status(400).json({
            success: false,
            message: "Veuillez apposer votre signature"
        });
    }

    try {
        const quote = await prisma.quote.findFirst({
            where: {
                OR: [
                    { signatureToken },
                    { id: signatureToken }
                ]
            },
            include: { client: true }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Lien de devis invalide"
            });
        }

        const now = new Date();

        if (quote.validUntil && new Date(quote.validUntil) < now) {
            await prisma.quote.update({
                where: { id: quote.id },
                data: { status: "EXPIRED" }
            });

            return res.status(400).json({
                success: false,
                message: "Ce devis a expiré et ne peut plus être signé."
            });
        }

        if (quote.status === "ACCEPTED") {
            return res.status(400).json({
                success: false,
                message: "Ce devis a déjà été signé et accepté."
            });
        }

        // Mise à jour automatique du statut à ACCEPTED + enregistrement de la signature
        const updatedQuote = await prisma.quote.update({
            where: { id: quote.id },
            data: {
                status: "ACCEPTED",
                signedAt: now,
                acceptedAt: now,
                signatureUrl: signatureData,
                signatureIp: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
            }
        });

        // Notification automatique au propriétaire de l'entreprise
        try {
            const owner = await prisma.user.findFirst({
                where: { companyId: quote.companyId, role: "OWNER" }
            });

            const clientName = quote.client
                ? `${quote.client.firstName || ''} ${quote.client.lastName || quote.client.companyName || ''}`.trim()
                : 'Client';

            if (owner) {
                await prisma.notification.create({
                    data: {
                        companyId: quote.companyId,
                        userId: owner.id,
                        type: "NEW_QUOTE_REQUEST",
                        channel: "IN_APP",
                        status: "SENT",
                        title: `Devis ${quote.number} signé et accepté !`,
                        body: `Le client ${clientName} a signé le devis ${quote.number} d'un montant de ${quote.amountTTC || quote.totalTtc || 0}€.`,
                        entityType: "quote",
                        entityId: quote.id
                    }
                });
            }
        } catch (notifErr) {
            console.warn("NOTIFICATION ERROR (NON-BLOCKING):", notifErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Devis ${quote.number} signé et accepté avec succès !`,
            data: { quote: updatedQuote }
        });
    } catch (error) {
        console.error("SIGN PUBLIC QUOTE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la signature du devis"
        });
    }
};

////// CREATE STRIPE CHECKOUT SESSION FOR QUOTE ONLINE PAYMENT //////
export const createPublicQuoteCheckoutSession = async (req, res) => {
    const { signatureToken } = req.params;

    try {
        const quote = await prisma.quote.findFirst({
            where: {
                OR: [
                    { signatureToken },
                    { id: signatureToken }
                ]
            },
            include: { company: true, client: true }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        if (quote.paidAt || quote.status === "PAID") {
            return res.status(400).json({
                success: false,
                message: "Ce devis a déjà été réglé avec succès."
            });
        }

        let checkoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/success?quoteId=${quote.id}`;

        if (stripe) {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                payment_method_options: {
                    card: {
                        request_three_d_secure: 'any',
                    },
                },
                payment_intent_data: {
                    metadata: {
                        quoteId: quote.id,
                        companyId: quote.companyId,
                        type: 'QUOTE_PAYMENT'
                    },
                },
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: `Devis ${quote.number} - ${quote.company?.name || 'Prestation'}`,
                                description: quote.subject || 'Règlement de devis validé',
                            },
                            unit_amount: Math.round(Number(quote.amountTTC || quote.totalTtc || 0) * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                customer_email: quote.client?.email || undefined,
                client_reference_id: quote.id,
                metadata: {
                    quoteId: quote.id,
                    companyId: quote.companyId,
                    type: 'QUOTE_PAYMENT'
                },
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/success?quoteId=${quote.id}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/quote/${signatureToken}?canceled=true`,
            });

            if (session?.url) {
                checkoutUrl = session.url;
            }
        }

        return res.status(200).json({
            success: true,
            message: "Session de paiement sécurisée Stripe créée avec succès",
            data: {
                checkoutUrl,
                amountTTC: quote.amountTTC,
                quoteNumber: quote.number
            }
        });
    } catch (error) {
        console.error("CREATE QUOTE CHECKOUT SESSION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de la session de paiement"
        });
    }
};

////// VERIFY PUBLIC PAYMENT (AFTER STRIPE OR DIRECT PAY) //////
export const verifyPublicPayment = async (req, res) => {
    const { quoteId, invoiceId, sessionId } = req.body;

    try {
        let isStripeVerified = false;
        if (sessionId && stripe) {
            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId);
                if (session && (session.payment_status === 'paid' || session.status === 'complete')) {
                    isStripeVerified = true;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: "Le paiement n'a pas été finalisé par la banque."
                    });
                }
            } catch (sErr) {
                console.warn("Stripe session retrieve warning:", sErr.message);
            }
        }

        // If for a Quote
        if (quoteId) {
            const quote = await prisma.quote.findFirst({
                where: {
                    OR: [
                        { id: quoteId },
                        { signatureToken: quoteId }
                    ]
                },
                include: { company: true, client: true, lines: true }
            });

            if (!quote) {
                return res.status(404).json({ success: false, message: "Devis introuvable" });
            }

            // Update quote status to ACCEPTED with paidAt timestamp
            const updatedQuote = await prisma.quote.update({
                where: { id: quote.id },
                data: {
                    status: "ACCEPTED",
                    paidAt: quote.paidAt || new Date()
                },
                include: { company: true, client: true }
            });

            // Record income transaction only if not already recorded
            try {
                const existingTx = await prisma.transaction.findFirst({
                    where: {
                        companyId: quote.companyId,
                        description: { contains: quote.number }
                    }
                });

                if (!existingTx) {
                    await prisma.transaction.create({
                        data: {
                            companyId: quote.companyId,
                            amount: Number(quote.amountTTC || quote.totalTtc || 0),
                            type: "INCOME",
                            category: "Devis encaissé",
                            date: new Date(),
                            description: `Paiement en ligne CB - Devis ${quote.number} (${quote.client ? `${quote.client.firstName || ''} ${quote.client.lastName || quote.client.companyName || ''}`.trim() : 'Client'})`,
                            paymentMethod: "CARD",
                        }
                    });
                }
            } catch (tErr) {
                console.warn("Transaction note:", tErr.message);
            }

            return res.status(200).json({
                success: true,
                message: "Paiement du devis confirmé avec succès",
                data: {
                    type: "QUOTE",
                    docNumber: updatedQuote.number,
                    amountTTC: updatedQuote.amountTTC || updatedQuote.totalTtc,
                    companyName: updatedQuote.company?.name,
                    clientName: updatedQuote.client ? `${updatedQuote.client.firstName || ''} ${updatedQuote.client.lastName || updatedQuote.client.companyName || ''}`.trim() : "Client",
                    paidAt: updatedQuote.paidAt || new Date(),
                    signatureToken: updatedQuote.signatureToken
                }
            });
        }

        // If for an Invoice
        if (invoiceId) {
            const invoice = await prisma.invoice.findFirst({
                where: {
                    OR: [
                        { id: invoiceId },
                        { paymentToken: invoiceId }
                    ]
                },
                include: { company: true, client: true, lines: true }
            });

            if (!invoice) {
                return res.status(404).json({ success: false, message: "Facture introuvable" });
            }

            const totalTtc = Number(invoice.amountTTC || 0);

            // Update invoice status to PAID
            const updatedInvoice = await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: "PAID",
                    amountPaid: totalTtc,
                    paidAt: invoice.paidAt || new Date()
                },
                include: { company: true, client: true }
            });

            // Create accounting transaction only if not existing
            try {
                const existingTx = await prisma.transaction.findFirst({
                    where: {
                        companyId: invoice.companyId,
                        invoiceId: invoice.id
                    }
                });

                if (!existingTx) {
                    await prisma.transaction.create({
                        data: {
                            companyId: invoice.companyId,
                            invoiceId: invoice.id,
                            amount: totalTtc,
                            type: "INCOME",
                            category: "Ventes de prestations / matériel",
                            date: new Date(),
                            description: `Paiement en ligne CB - Facture ${invoice.number} (${invoice.client ? `${invoice.client.firstName || ''} ${invoice.client.lastName || invoice.client.companyName || ''}`.trim() : 'Client'})`,
                            paymentMethod: "CARD",
                        }
                    });
                }
            } catch (tErr) {
                console.warn("Transaction note:", tErr.message);
            }

            return res.status(200).json({
                success: true,
                message: "Paiement de la facture confirmé avec succès",
                data: {
                    type: "INVOICE",
                    docNumber: updatedInvoice.number,
                    amountTTC: updatedInvoice.amountTTC,
                    companyName: updatedInvoice.company?.name,
                    clientName: updatedInvoice.client ? `${updatedInvoice.client.firstName || ''} ${updatedInvoice.client.lastName || updatedInvoice.client.companyName || ''}`.trim() : "Client",
                    paidAt: updatedInvoice.paidAt || new Date(),
                    paymentToken: updatedInvoice.paymentToken
                }
            });
        }

        return res.status(400).json({
            success: false,
            message: "Paramètres de paiement manquants"
        });
    } catch (error) {
        console.error("VERIFY PUBLIC PAYMENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la vérification du paiement"
        });
    }
};

// ==================== DOWNLOAD PUBLIC INVOICE PDF ====================
export const downloadPublicInvoicePdf = async (req, res) => {
    const { paymentToken } = req.params;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { paymentToken },
                    { id: paymentToken }
                ]
            },
            include: {
                company: {
                    include: { settings: true }
                },
                client: true,
                lines: { orderBy: { position: "asc" } }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        const effectiveCustomization = {
            ...(invoice.company?.settings?.documentCustomization || {}),
            ...(invoice.documentCustomization || {})
        };

        const pdfBuffer = await generateInvoicePdfBuffer({
            invoice,
            company: invoice.company,
            customization: effectiveCustomization
        });

        const filename = `Facture_${(invoice.number || 'document').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("DOWNLOAD PUBLIC INVOICE PDF ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la génération du PDF"
        });
    }
};

// ==================== DOWNLOAD PUBLIC QUOTE PDF ====================
export const downloadPublicQuotePdf = async (req, res) => {
    const { signatureToken } = req.params;

    try {
        const quote = await prisma.quote.findFirst({
            where: {
                OR: [
                    { signatureToken },
                    { id: signatureToken }
                ]
            },
            include: {
                company: {
                    include: { settings: true }
                },
                client: true,
                lines: { orderBy: { position: "asc" } }
            }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        const effectiveCustomization = {
            ...(quote.company?.settings?.documentCustomization || {}),
            ...(quote.documentCustomization || {})
        };

        const pdfBuffer = await generateQuotePdfBuffer({
            quote,
            company: quote.company,
            customization: effectiveCustomization
        });


        const filename = `Devis_${(quote.number || 'document').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("DOWNLOAD PUBLIC QUOTE PDF ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la génération du PDF"
        });
    }
};

