import { prisma } from "../config/db.js";

////// REVENUE & TVA REPORT //////
export const getRevenueReport = async (req, res) => {
    const companyId = req.user.companyId;
    const { from, to, startDate, endDate, groupBy = "month", year = new Date().getFullYear() } = req.query;

    const fromDate = (startDate || from) ? new Date(startDate || from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = (endDate || to) ? new Date(endDate || to) : new Date();
    // Inclusivité de la fin de journée
    toDate.setHours(23, 59, 59, 999);

    try {
        const [invoicesInRange, allInvoicesThisYear, companySettings] = await Promise.all([
            // Factures dans la plage demandée
            prisma.invoice.findMany({
                where: {
                    companyId,
                    status: { not: "CANCELLED" },
                    createdAt: {
                        gte: fromDate,
                        lte: toDate
                    }
                },
                include: {
                    lines: true
                },
                orderBy: { createdAt: "asc" }
            }),

            // Toutes les factures de l'année pour le résumé TVA trimestriel
            prisma.invoice.findMany({
                where: {
                    companyId,
                    status: { not: "CANCELLED" },
                    createdAt: {
                        gte: new Date(Number(year), 0, 1),
                        lte: new Date(Number(year), 11, 31, 23, 59, 59, 999)
                    }
                },
                include: {
                    lines: true
                }
            }),

            // Paramètres de l'entreprise (pour l'historique des déclarations de TVA)
            prisma.companySettings.findUnique({
                where: { companyId },
                select: { documentCustomization: true }
            })
        ]);

        // 1. Groupement mensuel pour les Rapports
        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
        const monthlyMap = {};

        invoicesInRange.forEach(inv => {
            const date = new Date(inv.createdAt);
            const mIdx = date.getMonth();
            const key = `${monthNames[mIdx]} ${date.getFullYear()}`;

            if (!monthlyMap[key]) {
                monthlyMap[key] = {
                    month: key,
                    caHT: 0,
                    caTTC: 0,
                    paid: 0,
                    count: 0
                };
            }

            monthlyMap[key].caHT += (inv.amountHT || 0);
            monthlyMap[key].caTTC += (inv.amountTTC || 0);
            if (inv.status === "PAID") {
                monthlyMap[key].paid += (inv.amountTTC || 0);
            }
            monthlyMap[key].count += 1;
        });

        const monthly = Object.values(monthlyMap);
        const totalHT = invoicesInRange.reduce((acc, curr) => acc + (curr.amountHT || 0), 0);
        const totalTTC = invoicesInRange.reduce((acc, curr) => acc + (curr.amountTTC || 0), 0);
        const totalPaid = invoicesInRange.filter(inv => inv.status === "PAID").reduce((acc, curr) => acc + (curr.amountTTC || 0), 0);
        const totalPending = totalTTC - totalPaid;
        const totalInvoices = invoicesInRange.length;
        const avgInvoice = totalInvoices > 0 ? (totalHT / totalInvoices) : 0;

        // 2. Calcul TVA par trimestre (T1, T2, T3, T4) pour Comptabilité
        const createEmptyQuarters = () => ({
            T1: { base0: 0, tva0: 0, base5: 0, tva5: 0, base10: 0, tva10: 0, base20: 0, tva20: 0, totalBase: 0, totalTva: 0 },
            T2: { base0: 0, tva0: 0, base5: 0, tva5: 0, base10: 0, tva10: 0, base20: 0, tva20: 0, totalBase: 0, totalTva: 0 },
            T3: { base0: 0, tva0: 0, base5: 0, tva5: 0, base10: 0, tva10: 0, base20: 0, tva20: 0, totalBase: 0, totalTva: 0 },
            T4: { base0: 0, tva0: 0, base5: 0, tva5: 0, base10: 0, tva10: 0, base20: 0, tva20: 0, totalBase: 0, totalTva: 0 }
        });

        const quartersEncaissements = createEmptyQuarters();
        const quartersDebits = createEmptyQuarters();

        const addInvoiceToQuarter = (inv, targetQuarters) => {
            const date = new Date(inv.paidAt || inv.createdAt);
            const m = date.getMonth();
            const qKey = m <= 2 ? "T1" : m <= 5 ? "T2" : m <= 8 ? "T3" : "T4";
            const targetQ = targetQuarters[qKey];

            if (inv.lines && inv.lines.length > 0) {
                inv.lines.forEach(line => {
                    const rate = Number(line.tvaRate !== undefined ? line.tvaRate : (inv.tvaRate || 20));
                    const bHT = Number(line.total !== undefined ? line.total : (line.unitPrice * line.quantity) || 0);
                    const tva = (bHT * rate) / 100;

                    if (rate === 0) {
                        targetQ.base0 += bHT;
                        targetQ.tva0 += tva;
                    } else if (rate === 5.5) {
                        targetQ.base5 += bHT;
                        targetQ.tva5 += tva;
                    } else if (rate === 10) {
                        targetQ.base10 += bHT;
                        targetQ.tva10 += tva;
                    } else {
                        targetQ.base20 += bHT;
                        targetQ.tva20 += tva;
                    }
                    targetQ.totalBase += bHT;
                    targetQ.totalTva += tva;
                });
            } else {
                const rate = Number(inv.tvaRate || 20);
                const bHT = Number(inv.amountHT || 0);
                const tva = (bHT * rate) / 100;
                if (rate === 0) {
                    targetQ.base0 += bHT;
                    targetQ.tva0 += tva;
                } else if (rate === 5.5) {
                    targetQ.base5 += bHT;
                    targetQ.tva5 += tva;
                } else if (rate === 10) {
                    targetQ.base10 += bHT;
                    targetQ.tva10 += tva;
                } else {
                    targetQ.base20 += bHT;
                    targetQ.tva20 += tva;
                }
                targetQ.totalBase += bHT;
                targetQ.totalTva += tva;
            }
        };

        allInvoicesThisYear.forEach(inv => {
            // Débits: toutes les factures émises (non brouillon)
            if (inv.status !== "DRAFT") {
                addInvoiceToQuarter(inv, quartersDebits);
            }
            // Encaissements: uniquement les factures payées
            if (inv.status === "PAID") {
                addInvoiceToQuarter(inv, quartersEncaissements);
            }
        });

        // Arrondir toutes les valeurs TVA
        const roundQuarters = (qObj) => {
            Object.keys(qObj).forEach(q => {
                Object.keys(qObj[q]).forEach(field => {
                    qObj[q][field] = Math.round(qObj[q][field] * 100) / 100;
                });
            });
        };

        roundQuarters(quartersEncaissements);
        roundQuarters(quartersEncaissements);
        roundQuarters(quartersDebits);

        const customObj = companySettings?.documentCustomization || {};
        const declarations = customObj.tvaDeclarations || {};
        const urssafDeclarations = customObj.urssafDeclarations || {};
        const fiscalProfile = customObj.fiscalProfile || {
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

        const baseUrssafRate = Number(fiscalProfile.urssafRate || 21.2);
        const effectiveUrssafRate = fiscalProfile.hasAcre ? Math.round((baseUrssafRate / 2) * 10) / 10 : baseUrssafRate;
        const cfpRate = Number(fiscalProfile.cfpRate || 0.3);
        const vlRate = fiscalProfile.versementLiberatoire ? Number(fiscalProfile.versementLiberatoireRate || 1.7) : 0;
        const totalTaxRate = Math.round((effectiveUrssafRate + cfpRate + vlRate) * 10) / 10;

        const quartersUrssaf = {};
        ["T1", "T2", "T3", "T4"].forEach(q => {
            const caHT = quartersEncaissements[q]?.totalBase || 0;
            const urssafDue = Math.round(caHT * (effectiveUrssafRate / 100) * 100) / 100;
            const cfpDue = Math.round(caHT * (cfpRate / 100) * 100) / 100;
            const vlDue = Math.round(caHT * (vlRate / 100) * 100) / 100;
            const totalCharges = Math.round((urssafDue + cfpDue + vlDue) * 100) / 100;
            const netEnPoche = Math.round((caHT - totalCharges) * 100) / 100;
            const netPercent = caHT > 0 ? Math.round((netEnPoche / caHT) * 1000) / 10 : 100;

            quartersUrssaf[q] = {
                caHT,
                effectiveUrssafRate,
                urssafDue,
                cfpRate,
                cfpDue,
                vlRate,
                vlDue,
                totalTaxRate,
                totalCharges,
                netEnPoche,
                netPercent
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalHT: Math.round(totalHT * 100) / 100,
                    totalTTC: Math.round(totalTTC * 100) / 100,
                    totalPaid: Math.round(totalPaid * 100) / 100,
                    totalPending: Math.round(totalPending * 100) / 100,
                    totalInvoices,
                    avgInvoice: Math.round(avgInvoice * 100) / 100
                },
                monthly,
                chartData: monthly,
                quarters: quartersEncaissements,
                quartersEncaissements,
                quartersDebits,
                quartersUrssaf,
                fiscalProfile,
                declarations,
                urssafDeclarations
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

////// PERSISTER LE STATUT DÉCLARÉ DE TVA //////
export const toggleTvaDeclaration = async (req, res) => {
    const companyId = req.user.companyId;
    const { year = "2026", quarter = "T1", declared = true } = req.body;

    try {
        const settings = await prisma.companySettings.findUnique({ where: { companyId } });
        const existingCustom = settings?.documentCustomization || {};
        const tvaDeclarations = existingCustom.tvaDeclarations ? { ...existingCustom.tvaDeclarations } : {};

        const key = `${year}-${quarter}`;
        if (declared) {
            tvaDeclarations[key] = {
                declared: true,
                declaredAt: new Date().toISOString()
            };
        } else {
            delete tvaDeclarations[key];
        }

        await prisma.companySettings.upsert({
            where: { companyId },
            update: {
                documentCustomization: {
                    ...existingCustom,
                    tvaDeclarations
                }
            },
            create: {
                companyId,
                documentCustomization: {
                    tvaDeclarations
                }
            }
        });

        return res.status(200).json({
            success: true,
            tvaDeclarations
        });
    } catch (error) {
        console.error("TOGGLE TVA DECLARATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de l'enregistrement de la déclaration"
        });
    }
};

////// PERSISTER LE STATUT DÉCLARÉ URSSAF //////
export const toggleUrssafDeclaration = async (req, res) => {
    const companyId = req.user.companyId;
    const { year = "2026", quarter = "T1", declared = true } = req.body;

    try {
        const settings = await prisma.companySettings.findUnique({ where: { companyId } });
        const existingCustom = settings?.documentCustomization || {};
        const urssafDeclarations = existingCustom.urssafDeclarations ? { ...existingCustom.urssafDeclarations } : {};

        const key = `${year}-${quarter}`;
        if (declared) {
            urssafDeclarations[key] = {
                declared: true,
                declaredAt: new Date().toISOString()
            };
        } else {
            delete urssafDeclarations[key];
        }

        await prisma.companySettings.upsert({
            where: { companyId },
            update: {
                documentCustomization: {
                    ...existingCustom,
                    urssafDeclarations
                }
            },
            create: {
                companyId,
                documentCustomization: {
                    urssafDeclarations
                }
            }
        });

        return res.status(200).json({
            success: true,
            urssafDeclarations
        });
    } catch (error) {
        console.error("TOGGLE URSSAF DECLARATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de l'enregistrement de la déclaration URSSAF"
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
