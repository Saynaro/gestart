import crypto from "crypto";
import { prisma } from "../config/db.js";
import { sendInvoiceClientEmail } from "../utils/emailService.js";

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

const normalizePaymentMethod = (method) => {
    if (!method) return null;
    const validEnums = ["CARD", "SEPA", "TRANSFER", "CASH", "CHEQUE"];
    const upper = String(method).toUpperCase().trim();
    if (validEnums.includes(upper)) return upper;

    const m = String(method).toLowerCase().trim();
    if (m.includes("virement") || m.includes("transfer") || m.includes("iban") || m.includes("banque")) return "TRANSFER";
    if (m.includes("carte") || m.includes("card") || m.includes("cb") || m.includes("stripe") || m.includes("visa") || m.includes("mastercard")) return "CARD";
    if (m.includes("sepa") || m.includes("prélèvement") || m.includes("prelevement")) return "SEPA";
    if (m.includes("chèque") || m.includes("cheque") || m.includes("cesu")) return "CHEQUE";
    if (m.includes("espèce") || m.includes("espece") || m.includes("cash") || m.includes("liquide")) return "CASH";
    return "TRANSFER";
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
                            address: true,
                            city: true,
                            postalCode: true
                        }
                    },
                    lines: {
                        orderBy: { position: "asc" }
                    },
                    _count: {
                        select: { lines: true }
                    }
                }
            })
        ]);

        const sourceQuoteIds = invoices.map(i => i.sourceQuoteId).filter(Boolean);
        const linkedQuotes = sourceQuoteIds.length > 0 ? await prisma.quote.findMany({
            where: {
                companyId,
                id: { in: sourceQuoteIds }
            },
            include: {
                client: true,
                lines: true
            }
        }) : [];

        const quoteById = {};
        linkedQuotes.forEach(q => {
            quoteById[q.id] = q;
        });

        const invoicesWithLinked = invoices.map(i => {
            const linked = i.sourceQuoteId ? quoteById[i.sourceQuoteId] : null;
            return {
                ...i,
                linkedDevis: linked,
                linkedQuote: linked
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                invoices: invoicesWithLinked,
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

        const linkedQuote = invoice.sourceQuoteId ? await prisma.quote.findFirst({
            where: { companyId, id: invoice.sourceQuoteId },
            include: { client: true, lines: true }
        }) : null;

        const invoiceWithLinked = {
            ...invoice,
            linkedDevis: linkedQuote,
            linkedQuote: linkedQuote
        };

        return res.status(200).json({
            success: true,
            data: { invoice: invoiceWithLinked }
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
        clientPhone,
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
            const trimmedName = (clientName || "").trim();
            const trimmedEmail = (clientEmail || "").trim();
            const nameParts = trimmedName.split(" ").filter(Boolean);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            const orConditions = [];
            if (trimmedEmail) {
                orConditions.push({ email: { equals: trimmedEmail, mode: "insensitive" } });
            }
            if (firstName && lastName) {
                orConditions.push({
                    AND: [
                        { firstName: { equals: firstName, mode: "insensitive" } },
                        { lastName: { equals: lastName, mode: "insensitive" } }
                    ]
                });
            } else if (firstName) {
                orConditions.push({ firstName: { equals: firstName, mode: "insensitive" } });
            }
            if (trimmedName) {
                orConditions.push({ companyName: { equals: trimmedName, mode: "insensitive" } });
            }

            const existing = orConditions.length > 0 ? await prisma.client.findFirst({
                where: {
                    companyId,
                    OR: orConditions
                }
            }) : null;

            if (existing) {
                finalClientId = existing.id;
                if (clientPhone && (!existing.phone || existing.phone === "0600000000")) {
                    await prisma.client.update({
                        where: { id: existing.id },
                        data: { phone: clientPhone }
                    });
                }
            } else if (trimmedName || trimmedEmail) {
                const newCreatedClient = await prisma.client.create({
                    data: {
                        companyId,
                        firstName: firstName || "Client",
                        lastName: lastName || (trimmedName && nameParts.length === 1 ? "" : "Particulier"),
                        companyName: trimmedName && nameParts.length === 1 ? trimmedName : null,
                        phone: clientPhone || "0600000000",
                        email: trimmedEmail || null,
                        address: clientAddress || "Adresse non renseignée"
                    }
                });
                finalClientId = newCreatedClient.id;
            }
        }

        // If finalClientId was passed, update phone if not already present
        if (finalClientId && clientPhone) {
            const curClient = await prisma.client.findFirst({ where: { id: finalClientId, companyId } });
            if (curClient && (!curClient.phone || curClient.phone === "0600000000")) {
                await prisma.client.update({
                    where: { id: finalClientId },
                    data: { phone: clientPhone }
                });
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

            const calculatedTVA = tvaRate !== undefined && tvaRate !== null ? parseFloat(tvaRate) : 20;
            let computedHT = 0;
            let computedTVAAmount = 0;

            if (lines.length > 0) {
                lines.forEach(l => {
                    const qty = parseFloat(l.quantity) || 1;
                    const price = parseFloat(l.unitPrice) || 0;
                    const disc = parseFloat(l.discount) || 0;
                    const lineHT = qty * price * (1 - disc / 100);
                    const lineTva = l.tvaRate !== undefined && l.tvaRate !== null ? parseFloat(l.tvaRate) : calculatedTVA;
                    computedHT += lineHT;
                    computedTVAAmount += lineHT * (lineTva / 100);
                });
            } else {
                computedHT = parseFloat(amountHT) || 0;
                computedTVAAmount = computedHT * (calculatedTVA / 100);
            }

            const computedTTC = computedHT + computedTVAAmount;

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
                    paymentMethod: normalizePaymentMethod(paymentMethod),
                    dueAt: dueAt ? new Date(dueAt) : defaultDueDate,
                    lines: {
                        create: lines.map((l, index) => {
                            const lineTva = l.tvaRate !== undefined && l.tvaRate !== null ? parseFloat(l.tvaRate) : calculatedTVA;
                            return {
                                description: l.description,
                                reference: l.reference || null,
                                quantity: parseFloat(l.quantity) || 1,
                                unitPrice: parseFloat(l.unitPrice) || 0,
                                tvaRate: lineTva,
                                discount: parseFloat(l.discount) || 0,
                                total: (parseFloat(l.quantity) || 1) * (parseFloat(l.unitPrice) || 0) * (1 - (parseFloat(l.discount) || 0) / 100),
                                position: index,
                                catalogItemId: l.catalogItemId || null,
                            };
                        })
                    }
                },
                include: {
                    client: true,
                    lines: true
                }
            });

            return invoice;
        });

        // Auto-persist new items into CatalogItem
        if (Array.isArray(lines)) {
            for (const l of lines) {
                if (l && l.description && l.description.trim()) {
                    const desc = l.description.trim();
                    const price = parseFloat(l.unitPrice) || 0;
                    try {
                        const existingCat = await prisma.catalogItem.findFirst({
                            where: {
                                companyId,
                                name: { equals: desc, mode: "insensitive" }
                            }
                        });
                        if (!existingCat) {
                            await prisma.catalogItem.create({
                                data: {
                                    companyId,
                                    name: desc,
                                    reference: l.reference || null,
                                    defaultPrice: price,
                                    tvaRate: parseFloat(l.tvaRate) || 20,
                                    type: (l.urssafCategory?.includes("Matériel") || l.urssafCategory?.includes("marchandises")) ? "PRODUCT" : "SERVICE"
                                }
                            });
                        }
                    } catch (err) {
                        console.warn("Auto-sync catalog item error:", err.message);
                    }
                }
            }
        }

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
            where: { id, companyId },
            include: { lines: true, client: true }
        });

        if (!existingInvoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        const {
            clientId,
            clientName,
            clientEmail,
            clientAddress,
            interventionId,
            dueAt,
            dueDate,
            date,
            issuedAt,
            amountHT,
            subtotalHt,
            tvaRate,
            amountTTC,
            totalTtc,
            status,
            paymentMethod,
            paymentRef,
            notes,
            conditions,
            paymentConditions,
            subject,
            interventionType,
            workDescription,
            workDetails,
            lines,
            emailSentAt
        } = req.body;

        // Block modifying core fields (client, items, amounts) if invoice is already finalized/sent or paid
        const isCurrentlyDraft = (existingInvoice.status || "").toUpperCase() === "DRAFT";
        const isModifyingContent = lines !== undefined || clientId !== undefined || clientName !== undefined || clientEmail !== undefined || amountHT !== undefined || subtotalHt !== undefined;
        if (!isCurrentlyDraft && isModifyingContent) {
            return res.status(400).json({
                success: false,
                message: "Cette facture a déjà été finalisée ou payée. Conformément aux règles de facturation, son contenu ne peut plus être modifié."
            });
        }

        const parseSafeDate = (val) => {
            if (!val) return undefined;
            const d = new Date(val);
            return !isNaN(d.getTime()) ? d : undefined;
        };

        const result = await prisma.$transaction(async (tx) => {
            let finalClientId = clientId;

            // Update or find client if clientName/email is given
            if (!finalClientId && (clientName || clientEmail)) {
                const trimmedName = (clientName || "").trim();
                const trimmedEmail = (clientEmail || "").trim();
                const nameParts = trimmedName.split(" ").filter(Boolean);
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";

                const orConditions = [];
                if (trimmedEmail) {
                    orConditions.push({ email: { equals: trimmedEmail, mode: "insensitive" } });
                }
                if (firstName && lastName) {
                    orConditions.push({
                        AND: [
                            { firstName: { equals: firstName, mode: "insensitive" } },
                            { lastName: { equals: lastName, mode: "insensitive" } }
                        ]
                    });
                } else if (firstName) {
                    orConditions.push({ firstName: { equals: firstName, mode: "insensitive" } });
                }
                if (trimmedName) {
                    orConditions.push({ companyName: { equals: trimmedName, mode: "insensitive" } });
                }

                const existing = orConditions.length > 0 ? await tx.client.findFirst({
                    where: {
                        companyId,
                        OR: orConditions
                    }
                }) : null;

                if (existing) {
                    finalClientId = existing.id;
                } else if (trimmedName || trimmedEmail) {
                    const newCreatedClient = await tx.client.create({
                        data: {
                            companyId,
                            firstName: firstName || "Client",
                            lastName: lastName || (trimmedName && nameParts.length === 1 ? "" : "Particulier"),
                            companyName: trimmedName && nameParts.length === 1 ? trimmedName : null,
                            phone: "0600000000",
                            email: trimmedEmail || null,
                            address: clientAddress || "Adresse non renseignée"
                        }
                    });
                    finalClientId = newCreatedClient.id;
                }
            }

            // If lines are provided, recompute amounts and recreate lines
            let calculatedTVA = tvaRate !== undefined && tvaRate !== null ? parseFloat(tvaRate) : (existingInvoice.tvaRate !== undefined ? existingInvoice.tvaRate : 20);
            let computedHT = parseFloat(amountHT ?? subtotalHt);
            let computedTTC = parseFloat(amountTTC ?? totalTtc);

            if (Array.isArray(lines)) {
                await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });

                computedHT = 0;
                let computedTVAAmount = 0;

                lines.forEach(l => {
                    const qty = Number(l.quantity || l.qty || 1);
                    const price = parseFloat(l.unitPrice) || 0;
                    const disc = parseFloat(l.discount) || 0;
                    const lineHT = qty * price * (1 - disc / 100);
                    const lineTva = l.tvaRate !== undefined && l.tvaRate !== null ? parseFloat(l.tvaRate) : calculatedTVA;
                    computedHT += lineHT;
                    computedTVAAmount += lineHT * (lineTva / 100);
                });

                computedTTC = computedHT + computedTVAAmount;

                if (lines.length > 0) {
                    await tx.invoiceLine.createMany({
                        data: lines.map((l, index) => {
                            const qVal = Number(l.quantity || l.qty || 1);
                            const pVal = parseFloat(l.unitPrice) || 0;
                            const dVal = parseFloat(l.discount) || 0;
                            const lineTva = l.tvaRate !== undefined && l.tvaRate !== null ? parseFloat(l.tvaRate) : calculatedTVA;
                            return {
                                invoiceId: id,
                                description: l.description || "Prestation",
                                reference: l.reference || null,
                                quantity: qVal,
                                unitPrice: pVal,
                                tvaRate: lineTva,
                                discount: dVal,
                                total: qVal * pVal * (1 - dVal / 100),
                                position: index,
                                catalogItemId: l.catalogItemId || null
                            };
                        })
                    });
                }
            }

            const targetDueAt = parseSafeDate(dueAt || dueDate);
            const targetIssuedAt = parseSafeDate(issuedAt || date);

            let normalizedStatus = status ? status.toUpperCase() : undefined;
            if (normalizedStatus === "PENDING" || normalizedStatus === "FINALIZED") normalizedStatus = "SENT";

            const updated = await tx.invoice.update({
                where: { id },
                data: {
                    ...(finalClientId && { clientId: finalClientId }),
                    ...(interventionId !== undefined && { interventionId: interventionId || null }),
                    ...(normalizedStatus && { status: normalizedStatus }),
                    ...(targetDueAt !== undefined && { dueAt: targetDueAt }),
                    ...(targetIssuedAt !== undefined && { issuedAt: targetIssuedAt }),
                    ...(!isNaN(computedHT) && { amountHT: computedHT }),
                    ...(!isNaN(calculatedTVA) && { tvaRate: calculatedTVA }),
                    ...(!isNaN(computedTTC) && { amountTTC: computedTTC }),
                    ...(paymentMethod !== undefined && { paymentMethod: normalizePaymentMethod(paymentMethod) }),
                    ...(paymentRef !== undefined && { paymentRef }),
                    ...(notes !== undefined && { notes }),
                    ...((conditions !== undefined || paymentConditions !== undefined) && { conditions: conditions ?? paymentConditions }),
                    ...((subject !== undefined || interventionType !== undefined) && { subject: subject ?? interventionType }),
                    ...((workDescription !== undefined || workDetails !== undefined) && { workDescription: workDescription ?? workDetails }),
                    ...(emailSentAt !== undefined && { emailSentAt: emailSentAt ? new Date(emailSentAt) : null })
                },
                include: {
                    lines: { orderBy: { position: "asc" } },
                    client: true
                }
            });

            return updated;
        });

        // Auto-sync new items into CatalogItem
        if (Array.isArray(lines)) {
            for (const l of lines) {
                if (l && l.description && l.description.trim()) {
                    const desc = l.description.trim();
                    const price = parseFloat(l.unitPrice) || 0;
                    try {
                        const existingCat = await prisma.catalogItem.findFirst({
                            where: {
                                companyId,
                                name: { equals: desc, mode: "insensitive" }
                            }
                        });
                        if (!existingCat) {
                            await prisma.catalogItem.create({
                                data: {
                                    companyId,
                                    name: desc,
                                    reference: l.reference || null,
                                    defaultPrice: price,
                                    tvaRate: parseFloat(l.tvaRate) || 20,
                                    type: (l.urssafCategory?.includes("Matériel") || l.urssafCategory?.includes("marchandises")) ? "PRODUCT" : "SERVICE"
                                }
                            });
                        }
                    } catch (err) {
                        console.warn("Auto-sync catalog item error:", err.message);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Facture mise à jour avec succès",
            data: { invoice: result }
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
            include: {
                client: true,
                company: true
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Facture introuvable"
            });
        }

        let token = invoice.paymentToken;
        if (!token) {
            token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await prisma.invoice.update({
                where: { id },
                data: { paymentToken: token }
            });
        }

        const paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/invoice/${token}`;
        const recipientEmail = invoice.client?.email;

        if (recipientEmail) {
            await sendInvoiceClientEmail({
                to: recipientEmail,
                invoice,
                company: invoice.company,
                paymentUrl,
                senderEmail: req.user?.email || invoice.company?.email,
                primaryColor: req.body?.primaryColor || (typeof invoice.company?.settings === 'object' && invoice.company.settings?.primaryColor) || "#556B2F"
            });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                status: "SENT",
                emailSentAt: new Date(),
                emailSentTo: recipientEmail || undefined,
            }
        });

        return res.status(200).json({
            success: true,
            message: `Facture ${invoice.number} envoyée avec succès à ${recipientEmail || 'client'}`,
            data: {
                invoice: updatedInvoice,
                paymentToken: token,
                paymentUrl
            }
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
        const safePaymentMethod = normalizePaymentMethod(paymentMethod) || "TRANSFER";

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                status: "PAID",
                amountPaid: invoice.amountTTC,
                paidAt: paymentDate,
                paymentMethod: safePaymentMethod,
                paymentRef: paymentRef || (typeof paymentMethod === "string" ? paymentMethod : undefined),
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

        // Selon la loi française, seule une facture en brouillon (DRAFT) peut être supprimée
        if (invoice.status !== "DRAFT") {
            return res.status(400).json({
                success: false,
                message: "Conformément à la loi, seule une facture au statut Brouillon peut être supprimée."
            });
        }

        // Suppression des lignes puis de la facture brouillon
        await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });
        await prisma.invoice.delete({ where: { id } });

        return res.status(200).json({
            success: true,
            message: "Facture supprimée avec succès"
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

