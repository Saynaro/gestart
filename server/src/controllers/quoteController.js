import crypto from "crypto";
import { prisma } from "../config/db.js";
import { sendQuoteClientEmail } from "../utils/emailService.js";
import { generateQuotePdfBuffer } from "../utils/pdfGenerator.js";
import { emitToCompany } from "../config/socket.js";

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

        const quoteIds = quotes.map(q => q.id);
        const linkedInvoices = quoteIds.length > 0 ? await prisma.invoice.findMany({
            where: {
                companyId,
                sourceQuoteId: { in: quoteIds }
            },
            include: {
                client: true,
                lines: true
            }
        }) : [];

        const invoiceByQuoteId = {};
        linkedInvoices.forEach(inv => {
            invoiceByQuoteId[inv.sourceQuoteId] = inv;
        });

        const quotesWithLinked = quotes.map(q => {
            const linked = invoiceByQuoteId[q.id] || null;
            return {
                ...q,
                linkedFacture: linked,
                linkedInvoice: linked,
                invoiceId: linked ? linked.id : null,
                amountFactured: linked ? (linked.amountTTC || linked.amountHT || 0) : 0
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                quotes: quotesWithLinked,
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

        const linkedInvoice = await prisma.invoice.findFirst({
            where: { companyId, sourceQuoteId: quote.id },
            include: { client: true, lines: true }
        });

        const quoteWithLinked = {
            ...quote,
            linkedFacture: linkedInvoice || null,
            linkedInvoice: linkedInvoice || null,
            invoiceId: linkedInvoice ? linkedInvoice.id : null,
            amountFactured: linkedInvoice ? (linkedInvoice.amountTTC || linkedInvoice.amountHT || 0) : 0
        };

        return res.status(200).json({
            success: true,
            data: { quote: quoteWithLinked }
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
    let {
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        interventionId,
        amountHT,
        tvaRate = 20,
        validUntil,
        subject,
        notes,
        conditions,
        documentCustomization,
        customization,
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

            // Calcul du montant HT et TTC depuis les lignes
            const calculatedTVA = tvaRate !== undefined && tvaRate !== null ? parseFloat(tvaRate) : 20;
            let computedHT = 0;
            let computedTVAAmount = 0;

            if (lines.length > 0) {
                lines.forEach(l => {
                    const qty = Number(l.quantity || l.qty || 1);
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

            const targetStatus = req.body.status && ["SENT", "ACCEPTED", "REFUSED"].includes(req.body.status.toUpperCase()) ? req.body.status.toUpperCase() : "DRAFT";

            const quote = await tx.quote.create({
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
                    documentCustomization: (documentCustomization ?? customization) || null,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    lines: {
                        create: lines.map((l, index) => {
                            const qVal = Number(l.quantity || l.qty || 1);
                            const pVal = parseFloat(l.unitPrice) || 0;
                            const dVal = parseFloat(l.discount) || 0;
                            const lineTva = l.tvaRate !== undefined && l.tvaRate !== null ? parseFloat(l.tvaRate) : calculatedTVA;
                            return {
                                description: l.description,
                                reference: l.reference || null,
                                quantity: qVal,
                                unitPrice: pVal,
                                tvaRate: lineTva,
                                discount: dVal,
                                total: qVal * pVal * (1 - dVal / 100),
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

            return quote;
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

        // Émission temps réel WebSocket
        emitToCompany(companyId, "quote:new", result);

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
            where: { id, companyId },
            include: { lines: true, client: true }
        });

        if (!existingQuote) {
            return res.status(404).json({
                success: false,
                message: "Devis introuvable"
            });
        }

        const {
            clientId,
            clientName,
            clientEmail,
            clientAddress,
            interventionId,
            validUntil,
            date,
            createdAt,
            amountHT,
            subtotalHt,
            tvaRate,
            amountTTC,
            totalTtc,
            status,
            notes,
            conditions,
            paymentConditions,
            depositPercent,
            depositAmount,
            subject,
            interventionType,
            lines,
            emailSentAt,
            documentCustomization,
            customization
        } = req.body;


        // Block modifying core fields (client, items, amounts) if quote is already sent or accepted
        const isCurrentlyDraft = (existingQuote.status || "").toUpperCase() === "DRAFT";
        const isModifyingContent = lines !== undefined || clientId !== undefined || clientName !== undefined || clientEmail !== undefined || amountHT !== undefined || subtotalHt !== undefined;
        if (!isCurrentlyDraft && isModifyingContent) {
            return res.status(400).json({
                success: false,
                message: "Ce devis a déjà été envoyé ou accepté. Conformément aux règles de devis, son contenu et son client ne peuvent plus être modifiés."
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
            let calculatedTVA = tvaRate !== undefined && tvaRate !== null ? parseFloat(tvaRate) : (existingQuote.tvaRate !== undefined ? existingQuote.tvaRate : 20);
            let computedHT = parseFloat(amountHT ?? subtotalHt);
            let computedTTC = parseFloat(amountTTC ?? totalTtc);

            if (Array.isArray(lines)) {
                await tx.quoteLine.deleteMany({ where: { quoteId: id } });

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
                    await tx.quoteLine.createMany({
                        data: lines.map((l, index) => {
                            const qVal = Number(l.quantity || l.qty || 1);
                            const pVal = parseFloat(l.unitPrice) || 0;
                            const dVal = parseFloat(l.discount) || 0;
                            const lineTva = l.tvaRate !== undefined && l.tvaRate !== null ? parseFloat(l.tvaRate) : calculatedTVA;
                            return {
                                quoteId: id,
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

            const targetValidUntil = parseSafeDate(validUntil);
            const targetCreatedAt = parseSafeDate(createdAt || date);

            let normalizedStatus = status ? status.toUpperCase() : undefined;
            if (normalizedStatus === "PENDING" || normalizedStatus === "FINALIZED") normalizedStatus = "SENT";
            if ((existingQuote.status === "ACCEPTED" || existingQuote.status === "SIGNED" || existingQuote.status === "PAID" || existingQuote.status === "REJECTED") && normalizedStatus === "SENT") {
                normalizedStatus = existingQuote.status;
            }

            const updated = await tx.quote.update({
                where: { id },
                data: {
                    ...(finalClientId && { clientId: finalClientId }),
                    ...(interventionId !== undefined && { interventionId: interventionId || null }),
                    ...(normalizedStatus && { status: normalizedStatus }),
                    ...(targetValidUntil !== undefined && { validUntil: targetValidUntil }),
                    ...(targetCreatedAt !== undefined && { createdAt: targetCreatedAt }),
                    ...(!isNaN(computedHT) && { amountHT: computedHT }),
                    ...(!isNaN(calculatedTVA) && { tvaRate: calculatedTVA }),
                    ...(!isNaN(computedTTC) && { amountTTC: computedTTC }),
                    ...(notes !== undefined && { notes }),
                    ...((conditions !== undefined || paymentConditions !== undefined) && { conditions: conditions ?? paymentConditions }),
                    ...(paymentConditions !== undefined && { paymentConditions }),
                    ...(depositPercent !== undefined && { depositPercent: parseFloat(depositPercent) }),
                    ...(depositAmount !== undefined && { depositAmount: parseFloat(depositAmount) }),
                    ...((subject !== undefined || interventionType !== undefined) && { subject: subject ?? interventionType }),
                    ...(emailSentAt !== undefined && { emailSentAt: emailSentAt ? new Date(emailSentAt) : null }),
                    ...((documentCustomization !== undefined || customization !== undefined) && { documentCustomization: documentCustomization ?? customization })
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

        // Émission temps réel WebSocket
        emitToCompany(companyId, "quote:updated", result);

        return res.status(200).json({
            success: true,
            message: "Devis mis à jour avec succès",
            data: { quote: result }
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
    const { email: customTargetEmail } = req.body || {};
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
        const recipientEmail = customTargetEmail || quote.client?.email;

        if (recipientEmail) {
            const companySettings = (typeof quote.company?.settings === 'object' && quote.company.settings) ? quote.company.settings : {};
            const effectiveCustomization = {
                ...(companySettings.documentCustomization || {}),
                ...(quote.documentCustomization || {}),
                ...(req.body?.customization || {}),
                primaryColor: req.body?.primaryColor || req.body?.customization?.primaryColor || quote.documentCustomization?.primaryColor || companySettings.documentCustomization?.primaryColor || companySettings.primaryColor || "#556B2F"
            };

            await sendQuoteClientEmail({
                to: recipientEmail,
                quote,
                company: quote.company,
                signatureUrl,
                senderEmail: req.user?.email || quote.company?.email,
                primaryColor: effectiveCustomization.primaryColor,
                customization: effectiveCustomization
            });
        }


        const newStatus = (quote.status === "ACCEPTED" || quote.status === "SIGNED" || quote.status === "PAID" || quote.status === "REJECTED") 
            ? quote.status 
            : "SENT";

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: {
                status: newStatus,
                emailSentAt: new Date(),
                emailSentTo: recipientEmail || undefined,
            }
        });

        // Émission temps réel WebSocket
        emitToCompany(companyId, "quote:updated", updatedQuote);

        return res.status(200).json({
            success: true,
            message: `Devis ${quote.number} envoyé avec succès à ${recipientEmail || 'client'}`,
            data: {
                quote: updatedQuote,
                signatureToken: token,
                signatureUrl
            }
        });
    } catch (error) {
        console.error("SEND QUOTE ERROR:", error.message);
        if (error.code === "EMAIL_NOT_CONFIGURED" || error.message?.includes("EMAIL_NOT_CONFIGURED")) {
            return res.status(400).json({
                success: false,
                code: "EMAIL_NOT_CONFIGURED",
                message: error.message.replace(/^EMAIL_NOT_CONFIGURED:\s*/, ""),
                redirectUrl: "/settings?tab=communication"
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de l'envoi du devis"
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

        // Émission temps réel WebSocket
        emitToCompany(quote.companyId, "quote:updated", updatedQuote);
        emitToCompany(quote.companyId, "quote:signed", updatedQuote);

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
                    amountPaid: 0,
                    paidAt: null,
                    paymentMethod: null,
                    subject: quote.subject,
                    notes: quote.notes,
                    conditions: quote.conditions || settings.invoiceConditions,
                    documentCustomization: quote.documentCustomization || quote.customization || null,
                    paymentToken: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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

            // Marquer le devis comme accepté s'il ne l'était pas
            await tx.quote.update({
                where: { id: quote.id },
                data: {
                    status: "ACCEPTED",
                    acceptedAt: quote.acceptedAt || new Date()
                }
            });

            return newInvoice;
        });

        // Émission temps réel WebSocket
        emitToCompany(companyId, "quote:updated", { ...quote, status: "ACCEPTED" });
        emitToCompany(companyId, "invoice:new", invoice);

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

// ==================== GET QUOTE PDF ====================
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

        let queryCustomization = {};
        if (req.query.customization) {
            try {
                queryCustomization = typeof req.query.customization === 'string' ? JSON.parse(req.query.customization) : req.query.customization;
            } catch (e) {}
        } else if (req.query.structure || req.query.primaryColor || req.query.fontFamily || req.query.fontSize || req.query.clientBoxPosition) {
            queryCustomization = { ...req.query };
        }

        const effectiveCustomization = {
            ...(quote.company?.settings?.documentCustomization || {}),
            ...(quote.documentCustomization || {}),
            ...queryCustomization
        };

        const pdfBuffer = await generateQuotePdfBuffer({
            quote,
            company: quote.company,
            customization: effectiveCustomization
        });

        const filename = `Devis_${(quote.number || 'devis').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);

    } catch (error) {
        console.error("GET QUOTE PDF ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du PDF du devis"
        });
    }
};


////// DELETE QUOTE //////
export const deleteQuote = async (req, res) => {
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

        // Vérifier si une facture active est liée à ce devis
        const linkedInvoice = await prisma.invoice.findFirst({
            where: { sourceQuoteId: id, status: { not: "CANCELLED" } }
        });

        if (linkedInvoice) {
            return res.status(400).json({
                success: false,
                message: `Ce devis ne peut pas être supprimé car la facture ${linkedInvoice.number || ""} y est associée.`
            });
        }

        // Suppression des lignes puis du devis
        await prisma.quoteLine.deleteMany({ where: { quoteId: id } });
        await prisma.quote.delete({ where: { id } });

        // Émission temps réel WebSocket
        emitToCompany(companyId, "quote:deleted", { id });

        return res.status(200).json({
            success: true,
            message: "Devis supprimé avec succès"
        });
    } catch (error) {
        console.error("DELETE QUOTE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du devis"
        });
    }
};

