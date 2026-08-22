import { prisma } from "../config/db.js";

/**
 * Récupère les statistiques et l'historique de tous les paiements (Stripe + Virements bancaires)
 * GET /api/v1/payments
 */
export const getPayments = async (req, res) => {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { filter = "all", search, from, to } = req.query;

    try {
        // Date de début du mois courant pour le calcul du KPI
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Calcul des indicateurs globaux (KPIs)
        const [paidInvoices, pendingInvoices, thisMonthPaid] = await Promise.all([
            // Total encaissé (Factures payées)
            prisma.invoice.aggregate({
                where: {
                    companyId,
                    status: "PAID"
                },
                _sum: { amountPaid: true, amountTTC: true }
            }),
            // En attente d'encaissement (Factures envoyées non payées)
            prisma.invoice.aggregate({
                where: {
                    companyId,
                    status: { in: ["SENT", "OVERDUE"] },
                    paymentStatus: { not: "PAID" }
                },
                _sum: { amountTTC: true }
            }),
            // Encaissé ce mois-ci
            prisma.invoice.aggregate({
                where: {
                    companyId,
                    status: "PAID",
                    paidAt: { gte: startOfMonth }
                },
                _sum: { amountPaid: true, amountTTC: true }
            })
        ]);

        const totalReceived = paidInvoices._sum.amountPaid || paidInvoices._sum.amountTTC || 0;
        const totalPending = pendingInvoices._sum.amountTTC || 0;
        const thisMonthReceived = thisMonthPaid._sum.amountPaid || thisMonthPaid._sum.amountTTC || 0;

        // 2. Construction de la requête pour la liste des paiements / transactions
        // On récupère les InvoiceTransaction enregistrées ainsi que les Invoices payées ou en attente
        const whereClause = {
            companyId,
            ...(from || to ? {
                createdAt: {
                    ...(from && { gte: new Date(from) }),
                    ...(to && { lte: new Date(to) })
                }
            } : {})
        };

        if (filter === "virements" || filter === "transfer") {
            whereClause.type = "BANK_TRANSFER";
        } else if (filter === "carte" || filter === "card") {
            whereClause.type = "CARD";
        }

        // Si recherche textuelle
        if (search) {
            whereClause.OR = [
                { invoice: { number: { contains: search, mode: "insensitive" } } },
                { invoice: { client: { firstName: { contains: search, mode: "insensitive" } } } },
                { invoice: { client: { lastName: { contains: search, mode: "insensitive" } } } },
                { invoice: { client: { companyName: { contains: search, mode: "insensitive" } } } },
                { bankReference: { contains: search, mode: "insensitive" } },
                { stripePaymentIntentId: { contains: search, mode: "insensitive" } },
            ];
        }

        const [totalTransactions, transactionsList] = await Promise.all([
            prisma.invoiceTransaction.count({ where: whereClause }),
            prisma.invoiceTransaction.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    invoice: {
                        select: {
                            id: true,
                            number: true,
                            amountTTC: true,
                            amountPaid: true,
                            status: true,
                            paymentStatus: true,
                            issuedAt: true,
                            dueAt: true,
                            paidAt: true,
                            client: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    companyName: true,
                                    email: true,
                                    phone: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        // Si la liste des transactions est vide (ex: factures payées avant l'ajout de la table InvoiceTransaction),
        // on fait un fallback sur les factures au statut PAID pour afficher l'historique existant.
        let displayItems = transactionsList;
        let totalCount = totalTransactions;

        if (totalTransactions === 0 && (filter === "all" || filter === "virements" || filter === "carte")) {
            const invoiceWhere = {
                companyId,
                status: "PAID",
                ...(filter === "virements" ? { paymentMethod: "TRANSFER" } : {}),
                ...(filter === "carte" ? { paymentMethod: "CARD" } : {}),
                ...(search ? {
                    OR: [
                        { number: { contains: search, mode: "insensitive" } },
                        { client: { firstName: { contains: search, mode: "insensitive" } } },
                        { client: { lastName: { contains: search, mode: "insensitive" } } },
                        { client: { companyName: { contains: search, mode: "insensitive" } } }
                    ]
                } : {})
            };

            const [invCount, paidInvs] = await Promise.all([
                prisma.invoice.count({ where: invoiceWhere }),
                prisma.invoice.findMany({
                    where: invoiceWhere,
                    skip,
                    take: limit,
                    orderBy: { paidAt: "desc" },
                    include: {
                        client: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                companyName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                })
            ]);

            totalCount = invCount;
            displayItems = paidInvs.map(inv => ({
                id: `legacy_${inv.id}`,
                invoiceId: inv.id,
                companyId: inv.companyId,
                type: inv.paymentMethod === "CARD" ? "CARD" : "BANK_TRANSFER",
                status: "succeeded",
                amount: inv.amountPaid || inv.amountTTC,
                currency: "EUR",
                stripePaymentIntentId: inv.stripePaymentIntentId,
                stripeCheckoutSessionId: inv.stripeCheckoutSessionId,
                bankReference: inv.paymentRef,
                paidAt: inv.paidAt || inv.issuedAt,
                createdAt: inv.paidAt || inv.createdAt,
                invoice: inv
            }));
        }

        // Récupération des transactions bancaires "À vérifier" (Rapprochement bancaire)
        const pendingBankTransactions = await prisma.bankTransaction.findMany({
            where: {
                companyId,
                reconciliationStatus: { in: ["PROBABLE", "PENDING"] }
            },
            take: 10,
            orderBy: { transactionDate: "desc" },
            include: {
                matchedInvoice: {
                    select: {
                        id: true,
                        number: true,
                        amountTTC: true,
                        client: {
                            select: {
                                firstName: true,
                                lastName: true,
                                companyName: true
                            }
                        }
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                kpis: {
                    totalReceived,
                    totalPending,
                    thisMonthReceived
                },
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit) || 1
                },
                payments: displayItems,
                pendingReconciliations: pendingBankTransactions
            }
        });

    } catch (error) {
        console.error("GET PAYMENTS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des paiements"
        });
    }
};
