import { prisma } from "../config/db.js";

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
        const invoice = await prisma.invoice.findUnique({
            where: { paymentToken },
            include: {
                company: {
                    select: {
                        name: true,
                        logoUrl: true,
                        phone: true,
                        email: true,
                        address: true,
                        city: true,
                        postalCode: true
                    }
                },
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        email: true,
                        phone: true
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
        const invoice = await prisma.invoice.findUnique({
            where: { paymentToken },
            include: { company: true, client: true }
        });

        if (!invoice || invoice.status === "PAID") {
            return res.status(400).json({
                success: false,
                message: invoice?.status === "PAID" ? "Cette facture a déjà été réglée" : "Facture introuvable"
            });
        }

        const checkoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/success?invoiceId=${invoice.id}`;

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
        let quote = await prisma.quote.findUnique({
            where: { signatureToken },
            include: {
                company: {
                    select: {
                        name: true,
                        logoUrl: true,
                        phone: true,
                        email: true,
                        address: true,
                        city: true,
                        postalCode: true
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
        const quote = await prisma.quote.findUnique({
            where: { signatureToken },
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
        const owner = await prisma.user.findFirst({
            where: { companyId: quote.companyId, role: "OWNER" }
        });

        if (owner) {
            await prisma.notification.create({
                data: {
                    companyId: quote.companyId,
                    userId: owner.id,
                    type: "QUOTE_ACCEPTED",
                    channel: "IN_APP",
                    status: "SENT",
                    title: `Devis ${quote.number} signé et accepté !`,
                    body: `Le client ${quote.client.firstName} ${quote.client.lastName} a signé le devis ${quote.number} d'un montant de ${quote.amountTTC}€.`,
                    entityType: "quote",
                    entityId: quote.id
                }
            });
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


