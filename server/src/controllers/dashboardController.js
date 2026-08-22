import { prisma } from "../config/db.js";

////// GET ALL-IN-ONE DASHBOARD DATA //////
export const getDashboardData = async (req, res) => {
    const companyId = req.user.companyId;
    const isTech = req.user.role === "TECHNICIAN";
    const techId = req.user.id;

    try {
        const now = new Date();
        const currentYear = now.getFullYear();

        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

        const startOfMonth = new Date(currentYear, now.getMonth(), 1);
        const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

        const startOfToday = new Date(currentYear, now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(currentYear, now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const next7Days = new Date(now);
        next7Days.setDate(next7Days.getDate() + 7);

        // Exécution simultanée des requêtes optimisées
        const [
            totalClients,
            interventionsThisMonth,
            revenueThisMonthAggregate,
            revenueThisYearAggregate,
            // Factures en retard
            overdueInvoicesList,
            // Factures en attente (SENT mais pas en retard)
            pendingInvoicesList,
            // Devis Brouillons
            draftQuotesList,
            // Devis Envoyés
            sentQuotesList,
            // Interventions statut répartition
            interventionsPendingCount,
            interventionsInProgressCount,
            interventionsCompletedCount,
            todayInterventions,
            upcomingInterventions,
            recentMessages,
            // Toutes les factures payées cette année pour le graphique mensuel
            paidInvoicesThisYear,
            // Lignes de factures pour le top articles
            invoiceLinesThisYear,
            // Paramètres fiscaux de l'entreprise
            settingsData
        ] = await Promise.all([
            // 1. Total clients
            prisma.client.count({
                where: { companyId, isActive: true }
            }),

            // 2. Interventions ce mois-ci
            prisma.intervention.count({
                where: {
                    companyId,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                    ...(isTech && { technicianId: techId })
                }
            }),

            // 3. CA payé ce mois-ci
            prisma.invoice.aggregate({
                _sum: { amountTTC: true, amountHT: true },
                where: {
                    companyId,
                    status: "PAID",
                    paidAt: { gte: startOfMonth, lte: endOfMonth }
                }
            }),

            // 4. CA payé cette année (pour les plafonds)
            prisma.invoice.aggregate({
                _sum: { amountTTC: true, amountHT: true },
                where: {
                    companyId,
                    status: "PAID",
                    paidAt: { gte: startOfYear, lte: endOfYear }
                }
            }),

            // 5. Factures en retard (OVERDUE ou SENT avec dueAt < now)
            prisma.invoice.findMany({
                where: {
                    companyId,
                    status: { in: ["SENT", "OVERDUE"] },
                    dueAt: { lt: now }
                },
                orderBy: { dueAt: "asc" },
                include: {
                    client: {
                        select: { id: true, firstName: true, lastName: true, companyName: true }
                    }
                }
            }),

            // 6. Factures en attente (SENT avec dueAt >= now ou pas de dueAt)
            prisma.invoice.findMany({
                where: {
                    companyId,
                    status: "SENT",
                    OR: [
                        { dueAt: { gte: now } },
                        { dueAt: null }
                    ]
                },
                orderBy: { createdAt: "desc" },
                include: {
                    client: {
                        select: { id: true, firstName: true, lastName: true, companyName: true }
                    }
                }
            }),

            // 7. Devis brouillons (DRAFT)
            prisma.quote.findMany({
                where: { companyId, status: "DRAFT" },
                orderBy: { createdAt: "desc" },
                include: {
                    client: {
                        select: { id: true, firstName: true, lastName: true, companyName: true }
                    }
                }
            }),

            // 8. Devis envoyés (SENT)
            prisma.quote.findMany({
                where: { companyId, status: "SENT" },
                orderBy: { createdAt: "desc" },
                include: {
                    client: {
                        select: { id: true, firstName: true, lastName: true, companyName: true }
                    }
                }
            }),

            // 9. Statuts des interventions (Productivité)
            prisma.intervention.count({
                where: {
                    companyId,
                    status: { in: ["PENDING", "SCHEDULED"] },
                    ...(isTech && { technicianId: techId })
                }
            }),
            prisma.intervention.count({
                where: {
                    companyId,
                    status: "IN_PROGRESS",
                    ...(isTech && { technicianId: techId })
                }
            }),
            prisma.intervention.count({
                where: {
                    companyId,
                    status: "COMPLETED",
                    ...(isTech && { technicianId: techId })
                }
            }),

            // 10. Interventions du jour
            prisma.intervention.findMany({
                where: {
                    companyId,
                    scheduledAt: { gte: startOfToday, lte: endOfToday },
                    ...(isTech && { technicianId: techId })
                },
                orderBy: { scheduledAt: "asc" },
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            companyName: true,
                            phone: true,
                            address: true,
                            city: true
                        }
                    },
                    equipment: {
                        select: { brand: true, model: true }
                    }
                }
            }),

            // 11. Interventions à venir (7 jours)
            prisma.intervention.findMany({
                where: {
                    companyId,
                    scheduledAt: { gt: endOfToday, lte: next7Days },
                    ...(isTech && { technicianId: techId })
                },
                take: 10,
                orderBy: { scheduledAt: "asc" },
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            companyName: true,
                            city: true
                        }
                    },
                    technician: {
                        select: { firstName: true, lastName: true }
                    }
                }
            }),

            // 12. 5 derniers messages
            prisma.smsLog.findMany({
                where: { companyId },
                take: 5,
                orderBy: { createdAt: "desc" },
                include: {
                    client: {
                        select: { id: true, firstName: true, lastName: true, phone: true }
                    }
                }
            }),

            // 13. Factures payées pour le graphique mensuel (6 derniers mois)
            prisma.invoice.findMany({
                where: {
                    companyId,
                    status: "PAID",
                    paidAt: {
                        gte: new Date(now.getFullYear(), now.getMonth() - 5, 1)
                    }
                },
                select: {
                    amountHT: true,
                    amountTTC: true,
                    paidAt: true,
                    clientId: true,
                    client: {
                        select: { firstName: true, lastName: true, companyName: true }
                    }
                }
            }),

            // 14. Lignes des factures payées pour top articles
            prisma.invoiceLine.findMany({
                where: {
                    invoice: {
                        companyId,
                        status: "PAID"
                    }
                },
                select: {
                    description: true,
                    quantity: true,
                    total: true,
                    unitPrice: true,
                    tvaRate: true
                }
            }),

            // 15. Paramètres fiscaux de l'entreprise
            prisma.companySettings.findUnique({
                where: { companyId },
                select: { documentCustomization: true, defaultTvaRate: true }
            })
        ]);

        // Extraction du profil fiscal
        const docCustom = (settingsData?.documentCustomization || {});
        const fiscalProfile = docCustom.fiscalProfile || {
            legalStatus: "MICRO",
            activityType: "BIC",
            urssafRate: 21.2,
            hasAcre: false,
            cfpRate: 0.3,
            versementLiberatoire: false,
            versementLiberatoireRate: 1.7,
            isTvaAssujetti: false,
            periodicity: "TRIMESTRIELLE"
        };

        // Calcul du taux global d'imposition / cotisations sociales
        let effectiveUrssafRate = Number(fiscalProfile.urssafRate || 21.2);
        if (fiscalProfile.hasAcre) {
            effectiveUrssafRate = Math.round((effectiveUrssafRate / 2) * 10) / 10;
        }
        let totalCotisationsRate = effectiveUrssafRate + Number(fiscalProfile.cfpRate || 0.3);
        if (fiscalProfile.versementLiberatoire) {
            totalCotisationsRate += Number(fiscalProfile.versementLiberatoireRate || 1.7);
        }
        const cotisationsMultiplier = totalCotisationsRate / 100;

        // Calculs des agrégats Factures
        const enRetardAmount = overdueInvoicesList.reduce((sum, inv) => sum + (inv.amountTTC || 0), 0);
        const enAttenteAmount = pendingInvoicesList.reduce((sum, inv) => sum + (inv.amountTTC || 0), 0);

        // Calculs des agrégats Devis
        const brouillonsAmount = draftQuotesList.reduce((sum, q) => sum + (q.amountTTC || 0), 0);
        const envoyesAmount = sentQuotesList.reduce((sum, q) => sum + (q.amountTTC || 0), 0);

        // Calcul du tableau de productivité (interventions)
        const totalInterventionsCount = interventionsPendingCount + interventionsInProgressCount + interventionsCompletedCount;
        const trackingColumns = [
            {
                label: "À faire",
                count: interventionsPendingCount,
                percent: totalInterventionsCount > 0 ? Math.round((interventionsPendingCount / totalInterventionsCount) * 100) : 0,
                colorClass: "bg-blue-light"
            },
            {
                label: "En cours",
                count: interventionsInProgressCount,
                percent: totalInterventionsCount > 0 ? Math.round((interventionsInProgressCount / totalInterventionsCount) * 100) : 0,
                colorClass: "bg-orange"
            },
            {
                label: "Terminé",
                count: interventionsCompletedCount,
                percent: totalInterventionsCount > 0 ? Math.round((interventionsCompletedCount / totalInterventionsCount) * 100) : 0,
                colorClass: "bg-green"
            }
        ];

        // Calcul des 6 derniers mois pour le graphique financier
        const monthNamesShort = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
        const monthlyChartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mYear = String(d.getFullYear()).slice(-2);
            const label = `${monthNamesShort[d.getMonth()]} ${mYear}`;
            
            // Filtrer les factures de ce mois précis
            const invsInMonth = paidInvoicesThisYear.filter(inv => {
                if (!inv.paidAt) return false;
                const pDate = new Date(inv.paidAt);
                return pDate.getFullYear() === d.getFullYear() && pDate.getMonth() === d.getMonth();
            });

            const entrees = invsInMonth.reduce((acc, curr) => acc + (curr.amountTTC || 0), 0);
            const sorties = Math.round(entrees * cotisationsMultiplier * 100) / 100;
            const resultat = Math.round((entrees - sorties) * 100) / 100;

            monthlyChartData.push({
                month: label,
                entrees: Math.round(entrees * 100) / 100,
                sorties,
                resultat
            });
        }

        // Calcul du Top Articles
        const articleMap = {};
        invoiceLinesThisYear.forEach(line => {
            const desc = (line.description || "Article standard").trim();
            if (!articleMap[desc]) {
                articleMap[desc] = { name: desc, totalAmount: 0, count: 0 };
            }
            const lineAmt = Number(line.total !== undefined ? line.total : (line.unitPrice * line.quantity) || 0);
            articleMap[desc].totalAmount += lineAmt;
            articleMap[desc].count += (line.quantity || 1);
        });

        const topArticles = Object.values(articleMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);

        // Calcul du Top Clients
        const clientMap = {};
        paidInvoicesThisYear.forEach(inv => {
            const clientName = inv.client ? (inv.client.companyName || `${inv.client.firstName || ''} ${inv.client.lastName || ''}`.trim()) : "Client";
            if (!clientMap[clientName]) {
                clientMap[clientName] = { name: clientName, totalAmount: 0, count: 0 };
            }
            clientMap[clientName].totalAmount += (inv.amountTTC || 0);
            clientMap[clientName].count += 1;
        });

        const topClients = Object.values(clientMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);

        const revThisMonth = revenueThisMonthAggregate._sum.amountTTC || 0;
        const revThisMonthHT = revenueThisMonthAggregate._sum.amountHT || 0;
        const cotisationsMonth = Math.round(revThisMonthHT * cotisationsMultiplier * 100) / 100;
        const resultatMonth = Math.round((revThisMonthHT - cotisationsMonth) * 100) / 100;

        // Données formatées pour le frontend
        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalClients,
                    interventionsThisMonth,
                    revenueThisMonth: revThisMonth,
                    revenueThisMonthHT: revThisMonthHT,
                    cotisationsThisMonth: cotisationsMonth,
                    resultatThisMonth: resultatMonth,
                    totalCotisationsRate,
                    fiscalProfile,
                    revenueThisYear: revenueThisYearAggregate._sum.amountTTC || 0,
                    revenueThisYearHT: revenueThisYearAggregate._sum.amountHT || 0,
                    pendingQuotes: sentQuotesList.length
                },
                fiscalProfile,
                // Cartes de factures
                factures: {
                    enRetardCount: overdueInvoicesList.length,
                    enRetardAmount,
                    enAttenteCount: pendingInvoicesList.length,
                    enAttenteAmount,
                    overdueInvoices: overdueInvoicesList.map(inv => ({
                        id: inv.id,
                        number: inv.number,
                        totalTtc: inv.amountTTC,
                        clientName: inv.client ? (inv.client.companyName || `${inv.client.firstName || ''} ${inv.client.lastName || ''}`.trim()) : 'Client',
                        dueAt: inv.dueAt
                    })),
                    pendingInvoices: pendingInvoicesList.map(inv => ({
                        id: inv.id,
                        number: inv.number,
                        totalTtc: inv.amountTTC,
                        clientName: inv.client ? (inv.client.companyName || `${inv.client.firstName || ''} ${inv.client.lastName || ''}`.trim()) : 'Client',
                        dueAt: inv.dueAt
                    }))
                },
                // Cartes de devis
                devis: {
                    brouillonsCount: draftQuotesList.length,
                    brouillonsAmount,
                    envoyesCount: sentQuotesList.length,
                    envoyesAmount,
                    brouillonsQuotes: draftQuotesList.map(q => ({
                        id: q.id,
                        number: q.number,
                        totalTtc: q.amountTTC,
                        clientName: q.client ? (q.client.companyName || `${q.client.firstName || ''} ${q.client.lastName || ''}`.trim()) : 'Client'
                    })),
                    sentQuotes: sentQuotesList.map(q => ({
                        id: q.id,
                        number: q.number,
                        totalTtc: q.amountTTC,
                        clientName: q.client ? (q.client.companyName || `${q.client.firstName || ''} ${q.client.lastName || ''}`.trim()) : 'Client'
                    }))
                },
                // Interventions
                interventions: {
                    todayCount: todayInterventions.length,
                    completedThisMonth: interventionsCompletedCount,
                    totalCount: totalInterventionsCount,
                    trackingColumns
                },
                // Plafonds
                plafonds: {
                    servicesCurrent: revenueThisYearAggregate._sum.amountHT || 0,
                    commercialCurrent: 0,
                    servicesMax: 77700,
                    servicesTva: 37500,
                    servicesTvaMax: 41250,
                    commercialMax: 203100,
                    commercialTva: 85000,
                    commercialTvaMax: 93500
                },
                // Graphique et Statistiques
                financialChart: monthlyChartData,
                topArticles,
                topClients,
                urgentClients: [],
                todayInterventions,
                upcomingInterventions,
                recentMessages
            }
        });
    } catch (error) {
        console.error("GET DASHBOARD DATA ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du chargement du tableau de bord"
        });
    }
};

