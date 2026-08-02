import crypto from "crypto";
import { prisma } from "../config/db.js";

////// GET PAGINATED QUOTES //////
export const getQuotes = async (req, res) => {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, clientId, search } = req.query;

    const where = {
        companyId,
        ...(status && { status }),
        ...(clientId && { clientId }),
        ...(search && {
            OR: [
                { number: { contains: search, mode: "insensitive" } },
                { subject: { contains: search, mode: "insensitive" } },
                { client: { firstName: { contains: search, mode: "insensitive" } } },
                { client: { lastName: { contains: search, mode: "insensitive" } } },
                { client: { companyName: { contains: search, mode: "insensitive" } } },
            ]
        })
    };

    try {
        const [total, quotes] = await Promise.all([
            prisma.quote.count({ where }),
            prisma.quote.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            companyName: true,
                            email: true,
                            phone: true,
                        }
                    },
                    _count: {
                        select: { lines: true }
                    }
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                quotes,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error("GET QUOTES ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des devis"
        });
    }
};

////// GET QUOTE BY ID //////
export const getQuoteById = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const quote = await prisma.quote.findFirst({
            where: { id, companyId },
            include: {
                client: true,
                intervention: true,
                lines: {
                    orderBy: { position: "asc" }
                }
            }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: { quote }
        });
    } catch (error) {
        console.error("GET QUOTE BY ID ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du devis"
        });
    }
};

////// CREATE QUOTE (AUTO NUMBER D-2026-001) //////
export const createQuote = async (req, res) => {
    const companyId = req.user.companyId;
    const {
        clientId,
        interventionId,
        amountHT,
        tvaRate = 20,
        validUntil,
        subject,
        notes,
        conditions,
        lines = []
    } = req.body;

    if (!clientId) {
        return res.status(400).json({
            success: false,
            message: "Le client (clientId) est obligatoire"
        });
    }

    try {
        // Transaction pour générer le numéro auto et créer le devis
        const result = await prisma.$transaction(async (tx) => {
            const settings = await tx.companySettings.upsert({
                where: { companyId },
                update: {},
                create: { companyId }
            });

            const currentYear = new Date().getFullYear();
            const prefix = settings.quotePrefix || "D";
            const nextNumber = settings.quoteNextNumber || 1;
            const numberFormatted = `${prefix}-${currentYear}-${String(nextNumber).padStart(3, "0")}`;

            // Incrément du compteur de devis
            await tx.companySettings.update({
                where: { companyId },
                data: { quoteNextNumber: nextNumber + 1 }
            });

            // Calcul du montant HT depuis les lignes si présent
            let computedHT = parseFloat(amountHT) || 0;
            if (lines.length > 0) {
                computedHT = lines.reduce((acc, l) => {
                    const qty = parseFloat(l.quantity) || 1;
                    const price = parseFloat(l.unitPrice) || 0;
                    const disc = parseFloat(l.discount) || 0;
                    return acc + (qty * price * (1 - disc / 100));
                }, 0);
            }

            const calculatedTVA = parseFloat(tvaRate) || 20;
            const computedTTC = computedHT * (1 + calculatedTVA / 100);

            const quote = await tx.quote.create({
                data: {
                    companyId,
                    clientId,
                    interventionId: interventionId || null,
                    number: numberFormatted,
                    status: "DRAFT",
                    amountHT: computedHT,
                    tvaRate: calculatedTVA,
                    amountTTC: computedTTC,
                    subject: subject ? subject.trim() : null,
                    notes: notes || null,
                    conditions: conditions || settings.invoiceConditions || null,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    lines: {
                        create: lines.map((l, index) => ({
                            description: l.description,
                            reference: l.reference || null,
                            quantity: parseFloat(l.quantity) || 1,
                            unitPrice: parseFloat(l.unitPrice) || 0,
                            tvaRate: parseFloat(l.tvaRate) || calculatedTVA,
                            discount: parseFloat(l.discount) || 0,
                            total: (parseFloat(l.quantity) || 1) * (parseFloat(l.unitPrice) || 0) * (1 - (parseFloat(l.discount) || 0) / 100),
                            position: index,
                            catalogItemId: l.catalogItemId || null,
                        }))
                    }
                },
                include: {
                    client: true,
                    lines: true
                }
            });

            return quote;
        });

        return res.status(201).json({
            success: true,
            message: `Devis ${result.number} créé avec succès`,
            data: { quote: result }
        });
    } catch (error) {
        console.error("CREATE QUOTE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création du devis"
        });
    }
};

////// UPDATE QUOTE //////
export const updateQuote = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const existingQuote = await prisma.quote.findFirst({
            where: { id, companyId }
        });

        if (!existingQuote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        const { status, validUntil, subject, notes, conditions, amountHT, tvaRate } = req.body;

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
                ...(subject !== undefined && { subject }),
                ...(notes !== undefined && { notes }),
                ...(conditions !== undefined && { conditions }),
                ...(amountHT !== undefined && { amountHT: parseFloat(amountHT) }),
                ...(tvaRate !== undefined && { tvaRate: parseFloat(tvaRate) }),
            },
            include: { lines: true, client: true }
        });

        return res.status(200).json({
            success: true,
            message: "Devis mis à jour avec succès",
            data: { quote: updatedQuote }
        });
    } catch (error) {
        console.error("UPDATE QUOTE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du devis"
        });
    }
};

////// SEND QUOTE BY EMAIL //////
export const sendQuote = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const quote = await prisma.quote.findFirst({
            where: { id, companyId },
            include: { client: true }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        let token = quote.signatureToken;
        if (!token) {
            token = crypto.randomBytes(32).toString("hex");
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);

            await prisma.quote.update({
                where: { id },
                data: {
                    signatureToken: token,
                    signatureTokenExpiry: expiry
                }
            });
        }

        const signatureUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/quote/${token}`;

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: {
                status: "SENT",
                emailSentAt: new Date(),
                emailSentTo: quote.client.email || undefined,
            }
        });

        return res.status(200).json({
            success: true,
            message: `Devis ${quote.number} marqué comme envoyé à ${quote.client.email || 'client'}`,
            data: {
                quote: updatedQuote,
                signatureToken: token,
                signatureUrl
            }
        });
    } catch (error) {
        console.error("SEND QUOTE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'envoi du devis"
        });
    }
};

////// ACCEPT QUOTE //////
export const acceptQuote = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const quote = await prisma.quote.findFirst({
            where: { id, companyId }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: {
                status: "ACCEPTED",
                acceptedAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: `Devis ${quote.number} marqué comme accepté`,
            data: { quote: updatedQuote }
        });
    } catch (error) {
        console.error("ACCEPT QUOTE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'acceptation du devis"
        });
    }
};

////// CONVERT QUOTE TO INVOICE //////
export const convertQuoteToInvoice = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const quote = await prisma.quote.findFirst({
            where: { id, companyId },
            include: { lines: true }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        // Création de la facture à partir du devis en transaction
        const invoice = await prisma.$transaction(async (tx) => {
            const settings = await tx.companySettings.upsert({
                where: { companyId },
                update: {},
                create: { companyId }
            });

            const currentYear = new Date().getFullYear();
            const prefix = settings.invoicePrefix || "INV";
            const nextNumber = settings.invoiceNextNumber || 1;
            const invoiceNumberFormatted = `${prefix}-${currentYear}-${String(nextNumber).padStart(3, "0")}`;

            // Incrément du compteur de factures
            await tx.companySettings.update({
                where: { companyId },
                data: { invoiceNextNumber: nextNumber + 1 }
            });

            const dueAt = new Date();
            dueAt.setDate(dueAt.getDate() + (settings.defaultPaymentDays || 30));

            const newInvoice = await tx.invoice.create({
                data: {
                    companyId,
                    clientId: quote.clientId,
                    interventionId: quote.interventionId || null,
                    sourceQuoteId: quote.id,
                    number: invoiceNumberFormatted,
                    status: "DRAFT",
                    amountHT: quote.amountHT,
                    tvaRate: quote.tvaRate,
                    amountTTC: quote.amountTTC,
                    subject: quote.subject,
                    notes: quote.notes,
                    conditions: quote.conditions || settings.invoiceConditions,
                    dueAt,
                    lines: {
                        create: quote.lines.map(l => ({
                            description: l.description,
                            reference: l.reference,
                            quantity: l.quantity,
                            unitPrice: l.unitPrice,
                            tvaRate: l.tvaRate,
                            discount: l.discount,
                            total: l.total,
                            position: l.position,
                            catalogItemId: l.catalogItemId,
                        }))
                    }
                },
                include: { lines: true, client: true }
            });

            // Marquer le devis comme accepté
            await tx.quote.update({
                where: { id: quote.id },
                data: {
                    status: "ACCEPTED",
                    acceptedAt: quote.acceptedAt || new Date()
                }
            });

            return newInvoice;
        });

        return res.status(201).json({
            success: true,
            message: `Devis converti en Facture ${invoice.number} avec succès`,
            data: { invoice }
        });
    } catch (error) {
        console.error("CONVERT TO INVOICE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la conversion du devis en facture"
        });
    }
};

////// GET QUOTE PDF DATA //////
export const getQuotePdf = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const quote = await prisma.quote.findFirst({
            where: { id, companyId },
            include: {
                client: true,
                company: {
                    include: { settings: true }
                },
                lines: { orderBy: { position: "asc" } }
            }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                quote,
                pdfUrl: quote.signatureUrl || null
            }
        });
    } catch (error) {
        console.error("GET QUOTE PDF ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du PDF du devis"
        });
    }
};
