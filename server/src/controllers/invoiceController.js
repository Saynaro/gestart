import crypto from "crypto";
import { prisma } from "../config/db.js";

// Helper notification
const createNotification = async ({ companyId, userId, type, title, body, entityId }) => {
    if (!userId) return;
    try {
        await prisma.notification.create({
            data: {
                companyId,
                userId,
                type,
                channel: "IN_APP",
                status: "SENT",
                title,
                body,
                entityType: "invoice",
                entityId,
            }
        });
    } catch (error) {
        console.error("NOTIFICATION ERROR:", error.message);
    }
};

////// GET PAGINATED INVOICES //////
export const getInvoices = async (req, res) => {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, clientId, from, to, search } = req.query;

    const where = {
        companyId,
        ...(status && { status }),
        ...(clientId && { clientId }),
        ...((from || to) && {
            issuedAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) })
            }
        }),
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
        const [total, invoices] = await Promise.all([
            prisma.invoice.count({ where }),
            prisma.invoice.findMany({
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
                invoices,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error("GET INVOICES ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des factures"
        });
    }
};

////// GET INVOICES SUMMARY (STATS: CA, PENDING, OVERDUE) //////
export const getInvoicesSummary = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const now = new Date();

        const [revenueThisMonth, pendingSum, overdueSum] = await Promise.all([
            // CA ce mois (Factures payées ce mois-ci)
            prisma.invoice.aggregate({
                _sum: { amountTTC: true },
                where: {
                    companyId,
                    status: "PAID",
                    paidAt: { gte: startOfMonth }
                }
            }),
            // En attente (Factures envoyées non payées)
            prisma.invoice.aggregate({
                _sum: { amountTTC: true },
                where: {
                    companyId,
                    status: "SENT"
                }
            }),
            // En retard (Factures non payées dont la date d'échéance est dépassée)
            prisma.invoice.aggregate({
                _sum: { amountTTC: true },
                where: {
                    companyId,
                    status: { in: ["SENT", "OVERDUE"] },
                    dueAt: { lt: now }
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    revenueThisMonth: revenueThisMonth._sum.amountTTC || 0,
                    pendingAmount: pendingSum._sum.amountTTC || 0,
                    overdueAmount: overdueSum._sum.amountTTC || 0,
                }
            }
        });
    } catch (error) {
        console.error("GET INVOICES SUMMARY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du calcul du résumé des factures"
        });
    }
};

////// GET INVOICE BY ID //////
export const getInvoiceById = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId },
            include: {
                client: true,
                intervention: true,
                lines: {
                    orderBy: { position: "asc" }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: { invoice }
        });
    } catch (error) {
        console.error("GET INVOICE BY ID ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la facture"
        });
    }
};

////// CREATE INVOICE (AUTO NUMBER INV-2026-001) //////
export const createInvoice = async (req, res) => {
    const companyId = req.user.companyId;
    let {
        clientId,
        clientName,
        clientEmail,
        clientAddress,
        interventionId,
        amountHT,
        tvaRate = 20,
        dueAt,
        subject,
        notes,
        conditions,
        paymentMethod,
        lines = []
    } = req.body;

    try {
        let finalClientId = clientId;

        // If clientId is missing or not provided, try to find or create client by name/email
        if (!finalClientId && (clientName || clientEmail)) {
            const nameParts = (clientName || "Client").trim().split(" ");
            const firstName = nameParts[0] || "Client";
            const lastName = nameParts.slice(1).join(" ") || "";

            const existing = await prisma.client.findFirst({
                where: {
                    companyId,
                    OR: [
                        { email: clientEmail ? clientEmail.trim() : undefined },
                        {
                            firstName: { equals: firstName, mode: "insensitive" },
                            lastName: { equals: lastName || firstName, mode: "insensitive" }
                        },
                        {
                            companyName: { equals: clientName, mode: "insensitive" }
                        }
                    ].filter(Boolean)
                }
            });

            if (existing) {
                finalClientId = existing.id;
            } else {
                const newCreatedClient = await prisma.client.create({
                    data: {
                        companyId,
                        firstName,
                        lastName: lastName || "Particulier",
                        companyName: clientName && nameParts.length === 1 ? clientName : null,
                        phone: "0600000000",
                        email: clientEmail || null,
                        address: clientAddress || "Adresse non renseignée"
                    }
                });
                finalClientId = newCreatedClient.id;
            }
        }

        // If still no clientId, check if company has any client or create default
        if (!finalClientId) {
            const firstClient = await prisma.client.findFirst({ where: { companyId } });
            if (firstClient) {
                finalClientId = firstClient.id;
            } else {
                const defaultClient = await prisma.client.create({
                    data: {
                        companyId,
                        firstName: clientName ? clientName.split(" ")[0] : "Client",
                        lastName: clientName && clientName.split(" ").slice(1).join(" ") ? clientName.split(" ").slice(1).join(" ") : "Particulier",
                        phone: "0600000000",
                        address: "France"
                    }
                });
                finalClientId = defaultClient.id;
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const settings = await tx.companySettings.upsert({
                where: { companyId },
                update: {},
                create: { companyId }
            });

            const currentYear = new Date().getFullYear();
            const prefix = settings.invoicePrefix || "INV";
            const nextNumber = settings.invoiceNextNumber || 1;
            const numberFormatted = `${prefix}-${currentYear}-${String(nextNumber).padStart(3, "0")}`;

            // Incrément du numéro de facture
            await tx.companySettings.update({
                where: { companyId },
                data: { invoiceNextNumber: nextNumber + 1 }
            });

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

            const defaultDueDate = new Date();
            defaultDueDate.setDate(defaultDueDate.getDate() + (settings.defaultPaymentDays || 30));

            const targetStatus = req.body.status === "draft" || req.body.status === "DRAFT" ? "DRAFT" : "SENT";

            const invoice = await tx.invoice.create({
                data: {
                    companyId,
                    clientId: finalClientId,
                    interventionId: interventionId || null,
                    number: numberFormatted,
                    status: targetStatus,
                    amountHT: computedHT,
                    tvaRate: calculatedTVA,
                    amountTTC: computedTTC,
                    subject: subject ? subject.trim() : null,
                    notes: notes || null,
                    conditions: conditions || settings.invoiceConditions || null,
                    paymentMethod: paymentMethod || null,
                    dueAt: dueAt ? new Date(dueAt) : defaultDueDate,
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

            return invoice;
        });

        return res.status(201).json({
            success: true,
            message: `Facture ${result.number} créée avec succès`,
            data: { invoice: result }
        });
    } catch (error) {
        console.error("CREATE INVOICE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de la facture"
        });
    }
};

////// UPDATE INVOICE //////
export const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const existingInvoice = await prisma.invoice.findFirst({
            where: { id, companyId }
        });

        if (!existingInvoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        const { status, dueAt, amountHT, tvaRate, paymentMethod, paymentRef, notes, conditions } = req.body;

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
                ...(amountHT !== undefined && { amountHT: parseFloat(amountHT) }),
                ...(tvaRate !== undefined && { tvaRate: parseFloat(tvaRate) }),
                ...(paymentMethod !== undefined && { paymentMethod }),
                ...(paymentRef !== undefined && { paymentRef }),
                ...(notes !== undefined && { notes }),
                ...(conditions !== undefined && { conditions }),
            },
            include: { lines: true, client: true }
        });

        return res.status(200).json({
            success: true,
            message: "Facture mise à jour avec succès",
            data: { invoice: updatedInvoice }
        });
    } catch (error) {
        console.error("UPDATE INVOICE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de la facture"
        });
    }
};

////// SEND INVOICE BY EMAIL //////
export const sendInvoice = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId },
            include: { client: true }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                status: "SENT",
                emailSentAt: new Date(),
                emailSentTo: invoice.client.email || undefined,
            }
        });

        return res.status(200).json({
            success: true,
            message: `Facture ${invoice.number} envoyée avec succès à ${invoice.client.email || 'client'}`,
            data: { invoice: updatedInvoice }
        });
    } catch (error) {
        console.error("SEND INVOICE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'envoi de la facture"
        });
    }
};

////// MARK INVOICE AS PAID //////
export const markInvoicePaid = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { paidAt, paymentMethod, paymentRef } = req.body;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        const paymentDate = paidAt ? new Date(paidAt) : new Date();

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                status: "PAID",
                amountPaid: invoice.amountTTC,
                paidAt: paymentDate,
                ...(paymentMethod && { paymentMethod }),
                ...(paymentRef && { paymentRef }),
            }
        });

        // Notification au propriétaire
        const owner = await prisma.user.findFirst({
            where: { companyId, role: "OWNER" }
        });

        if (owner) {
            await createNotification({
                companyId,
                userId: owner.id,
                type: "INVOICE_PAID",
                title: "Facture payée",
                body: `La facture ${invoice.number} d'un montant de ${invoice.amountTTC}€ a été marquée comme payée.`,
                entityId: id
            });
        }

        return res.status(200).json({
            success: true,
            message: `Facture ${invoice.number} marquée comme payée avec succès`,
            data: { invoice: updatedInvoice }
        });
    } catch (error) {
        console.error("MARK PAID ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du règlement de la facture"
        });
    }
};

////// SEND INVOICE REMINDER //////
export const sendInvoiceReminder = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId },
            include: { client: true }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                reminderSentAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: `Relance envoyée pour la facture ${invoice.number}`,
            data: { invoice: updatedInvoice }
        });
    } catch (error) {
        console.error("SEND REMINDER ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la relance de la facture"
        });
    }
};

////// GET INVOICE PDF DATA //////
export const getInvoicePdf = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId },
            include: {
                client: true,
                company: {
                    include: { settings: true }
                },
                lines: { orderBy: { position: "asc" } }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                invoice,
                pdfUrl: invoice.pdfUrl || null
            }
        });
    } catch (error) {
        console.error("GET INVOICE PDF ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du PDF"
        });
    }
};

////// DELETE INVOICE (ONLY IF DRAFT) //////
export const deleteInvoice = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        // Selon la loi française, seule une facture en brouillon (DRAFT) peut être annulée/supprimée
        if (invoice.status !== "DRAFT") {
            return res.status(400).json({
                success: false,
                message: "Seule une facture au statut Brouillon (DRAFT) peut être annulée."
            });
        }

        await prisma.invoice.update({
            where: { id },
            data: { status: "CANCELLED" }
        });

        return res.status(200).json({
            success: true,
            message: "Facture annulée avec succès"
        });
    } catch (error) {
        console.error("DELETE INVOICE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de la facture"
        });
    }
};

////// CREATE ONLINE PAYMENT LINK FOR CLIENT //////
export const createInvoicePaymentLink = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId },
            include: { client: true }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        let token = invoice.paymentToken;
        if (!token) {
            token = crypto.randomBytes(32).toString("hex");
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);

            await prisma.invoice.update({
                where: { id },
                data: {
                    paymentToken: token,
                    paymentTokenExpiry: expiry,
                    onlinePaymentEnabled: true
                }
            });
        }

        const paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/invoice/${token}`;

        return res.status(200).json({
            success: true,
            message: "Lien de paiement en ligne généré avec succès",
            data: {
                paymentToken: token,
                paymentUrl,
                amountTTC: invoice.amountTTC
            }
        });
    } catch (error) {
        console.error("CREATE PAYMENT LINK ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création du lien de paiement"
        });
    }
};

