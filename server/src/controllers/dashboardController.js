import { prisma } from "../config/db.js";

////// GET ALL-IN-ONE DASHBOARD DATA //////
export const getDashboardData = async (req, res) => {
    const companyId = req.user.companyId;
    const isTech = req.user.role === "TECHNICIAN";
    const techId = req.user.id;

    try {
        const now = new Date();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const next7Days = new Date(now);
        next7Days.setDate(next7Days.getDate() + 7);

        // Chargement simultané des métriques pour une vitesse d'exécution maximale
        const [
            totalClients,
            interventionsThisMonth,
            revenueThisMonthAggregate,
            pendingQuotes,
            urgentClients,
            todayInterventions,
            upcomingInterventions,
            recentMessages,
            overdueInvoices
        ] = await Promise.all([
            // 1. Nombre total de clients
            prisma.client.count({
                where: { companyId, isActive: true }
            }),

            // 2. Nombre d'interventions ce mois-ci
            prisma.intervention.count({
                where: {
                    companyId,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                    ...(isTech && { technicianId: techId })
                }
            }),

            // 3. Chiffre d'affaires payé ce mois-ci
            prisma.invoice.aggregate({
                _sum: { amountTTC: true },
                where: {
                    companyId,
                    status: "PAID",
                    paidAt: { gte: startOfMonth }
                }
            }),

            // 4. Nombre de devis en attente (brouillons ou envoyés)
            prisma.quote.count({
                where: {
                    companyId,
                    status: { in: ["DRAFT", "SENT"] }
                }
            }),

            // 5. Clients urents (statut URGENT)
            prisma.client.findMany({
                where: {
                    companyId,
                    isActive: true,
                    status: "URGENT"
                },
                take: 5,
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true,
                    phone: true,
                    city: true,
                    status: true,
                }
            }),

            // 6. Interventions prévues aujourd'hui
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

            // 7. Interventions des 7 prochains jours
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

            // 8. 5 derniers SMS / Conversations récents
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

            // 9. Factures en retard
            prisma.invoice.findMany({
                where: {
                    companyId,
                    status: { in: ["SENT", "OVERDUE"] },
                    dueAt: { lt: now }
                },
                take: 5,
                orderBy: { dueAt: "asc" },
                include: {
                    client: {
                        select: { id: true, firstName: true, lastName: true, companyName: true }
                    }
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalClients,
                    interventionsThisMonth,
                    revenueThisMonth: revenueThisMonthAggregate._sum.amountTTC || 0,
                    pendingQuotes,
                },
                urgentClients,
                todayInterventions,
                upcomingInterventions,
                recentMessages,
                overdueInvoices
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
