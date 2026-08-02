import { prisma } from "../config/db.js";

////// REVENUE REPORT //////
export const getRevenueReport = async (req, res) => {
    const companyId = req.user.companyId;
    const { from, to, groupBy = "month" } = req.query;

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                status: "PAID",
                paidAt: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            select: {
                amountHT: true,
                amountTTC: true,
                paidAt: true
            },
            orderBy: { paidAt: "asc" }
        });

        // Groupement par jour / semaine / mois
        const revenueMap = {};

        invoices.forEach(inv => {
            const date = new Date(inv.paidAt);
            let key = date.toISOString().slice(0, 7); // "YYYY-MM" por défaut

            if (groupBy === "day") {
                key = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
            } else if (groupBy === "week") {
                const year = date.getFullYear();
                const firstDayOfYear = new Date(year, 0, 1);
                const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                key = `${year}-W${String(weekNum).padStart(2, '0')}`;
            }

            if (!revenueMap[key]) {
                revenueMap[key] = { period: key, amountHT: 0, amountTTC: 0, count: 0 };
            }

            revenueMap[key].amountHT += inv.amountHT;
            revenueMap[key].amountTTC += inv.amountTTC;
            revenueMap[key].count += 1;
        });

        const chartData = Object.values(revenueMap);
        const totalHT = chartData.reduce((acc, curr) => acc + curr.amountHT, 0);
        const totalTTC = chartData.reduce((acc, curr) => acc + curr.amountTTC, 0);

        return res.status(200).json({
            success: true,
            data: {
                summary: { totalHT, totalTTC, totalInvoices: invoices.length },
                chartData
            }
        });
    } catch (error) {
        console.error("GET REVENUE REPORT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du rapport de chiffre d'affaires"
        });
    }
};

////// INTERVENTIONS REPORT //////
export const getInterventionsReport = async (req, res) => {
    const companyId = req.user.companyId;
    const { from, to, technicianId } = req.query;

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    const where = {
        companyId,
        createdAt: { gte: fromDate, lte: toDate },
        ...(technicianId && { technicianId })
    };

    try {
        const [total, completed, cancelled, pending, inProgress, interventions] = await Promise.all([
            prisma.intervention.count({ where }),
            prisma.intervention.count({ where: { ...where, status: "COMPLETED" } }),
            prisma.intervention.count({ where: { ...where, status: "CANCELLED" } }),
            prisma.intervention.count({ where: { ...where, status: "PENDING" } }),
            prisma.intervention.count({ where: { ...where, status: "IN_PROGRESS" } }),
            prisma.intervention.findMany({
                where: { ...where, status: "COMPLETED" },
                select: { startedAt: true, completedAt: true, estimatedDuration: true }
            })
        ]);

        // Calcul de la durée moyenne (en minutes)
        let totalDurationMinutes = 0;
        let validDurationsCount = 0;

        interventions.forEach(item => {
            if (item.startedAt && item.completedAt) {
                const diffMs = new Date(item.completedAt) - new Date(item.startedAt);
                const diffMin = Math.round(diffMs / 60000);
                if (diffMin > 0 && diffMin < 1440) { // < 24h
                    totalDurationMinutes += diffMin;
                    validDurationsCount++;
                }
            } else if (item.estimatedDuration) {
                totalDurationMinutes += item.estimatedDuration;
                validDurationsCount++;
            }
        });

        const avgDurationMinutes = validDurationsCount > 0 ? Math.round(totalDurationMinutes / validDurationsCount) : 0;

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    total,
                    completed,
                    cancelled,
                    pending,
                    inProgress,
                    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                    avgDurationMinutes
                }
            }
        });
    } catch (error) {
        console.error("GET INTERVENTIONS REPORT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du rapport des interventions"
        });
    }
};

////// TECHNICIANS PERFORMANCE REPORT //////
export const getTechniciansReport = async (req, res) => {
    const companyId = req.user.companyId;
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    try {
        const technicians = await prisma.user.findMany({
            where: {
                companyId,
                role: { in: ["TECHNICIAN", "MANAGER", "OWNER"] },
                isActive: true
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
            }
        });

        const techStats = await Promise.all(technicians.map(async (tech) => {
            const [total, completed, cancelled] = await Promise.all([
                prisma.intervention.count({
                    where: { companyId, technicianId: tech.id, createdAt: { gte: fromDate, lte: toDate } }
                }),
                prisma.intervention.count({
                    where: { companyId, technicianId: tech.id, status: "COMPLETED", createdAt: { gte: fromDate, lte: toDate } }
                }),
                prisma.intervention.count({
                    where: { companyId, technicianId: tech.id, status: "CANCELLED", createdAt: { gte: fromDate, lte: toDate } }
                })
            ]);

            return {
                technician: tech,
                totalAssigned: total,
                completed,
                cancelled,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        }));

        return res.status(200).json({
            success: true,
            data: { technicians: techStats }
        });
    } catch (error) {
        console.error("GET TECHNICIANS REPORT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du rapport des techniciens"
        });
    }
};

////// CLIENTS GROWTH & RETENTION REPORT //////
export const getClientsReport = async (req, res) => {
    const companyId = req.user.companyId;
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    try {
        const [totalActive, newClients, okCount, warningCount, urgentCount] = await Promise.all([
            prisma.client.count({ where: { companyId, isActive: true } }),
            prisma.client.count({ where: { companyId, isActive: true, createdAt: { gte: fromDate, lte: toDate } } }),
            prisma.client.count({ where: { companyId, isActive: true, status: "OK" } }),
            prisma.client.count({ where: { companyId, isActive: true, status: "WARNING" } }),
            prisma.client.count({ where: { companyId, isActive: true, status: "URGENT" } }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalActive,
                newClients,
                statusBreakdown: {
                    OK: okCount,
                    WARNING: warningCount,
                    URGENT: urgentCount
                }
            }
        });
    } catch (error) {
        console.error("GET CLIENTS REPORT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du rapport des clients"
        });
    }
};

////// MAINTENANCE HEALTH REPORT //////
export const getMaintenanceReport = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const equipmentList = await prisma.equipment.findMany({
            where: {
                isActive: true,
                client: { companyId, isActive: true }
            },
            select: {
                tradeSlug: true,
                nextServiceDate: true
            }
        });

        const now = new Date();
        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 30);

        const breakdown = {
            total: equipmentList.length,
            OK: 0,
            WARNING: 0,
            URGENT: 0,
            byTrade: {}
        };

        equipmentList.forEach(eq => {
            const trade = eq.tradeSlug || "general";
            if (!breakdown.byTrade[trade]) {
                breakdown.byTrade[trade] = { OK: 0, WARNING: 0, URGENT: 0 };
            }

            const nextDate = eq.nextServiceDate ? new Date(eq.nextServiceDate) : null;

            if (!nextDate || nextDate > in30Days) {
                breakdown.OK++;
                breakdown.byTrade[trade].OK++;
            } else if (nextDate <= now) {
                breakdown.URGENT++;
                breakdown.byTrade[trade].URGENT++;
            } else {
                breakdown.WARNING++;
                breakdown.byTrade[trade].WARNING++;
            }
        });

        return res.status(200).json({
            success: true,
            data: { maintenance: breakdown }
        });
    } catch (error) {
        console.error("GET MAINTENANCE REPORT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du rapport de maintenance"
        });
    }
};

////// SMS USAGE REPORT //////
export const getSmsReport = async (req, res) => {
    const companyId = req.user.companyId;
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    try {
        const [sentCount, receivedCount, usage] = await Promise.all([
            prisma.smsLog.count({
                where: { companyId, direction: "OUTGOING" }
            }),
            prisma.smsLog.count({
                where: { companyId, direction: "INCOMING" }
            }),
            prisma.smsUsage.findUnique({
                where: { companyId_month_year: { companyId, month, year } }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                month,
                year,
                totalSent: sentCount,
                totalReceived: receivedCount,
                monthlyCount: usage?.count || 0,
                replyRatePercent: sentCount > 0 ? Math.round((receivedCount / sentCount) * 100) : 0
            }
        });
    } catch (error) {
        console.error("GET SMS REPORT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la génération du rapport SMS"
        });
    }
};
