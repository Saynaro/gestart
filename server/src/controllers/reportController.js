import { prisma } from "../config/db.js";
import * as XLSX from "xlsx";
import { generatePdfFromHtml } from "../utils/pdfGenerator.js";

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

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const where = {
        companyId,
        ...(technicianId ? { technicianId } : {}),
        ...(fromDate || toDate ? {
            createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {})
            }
        } : {})
    };

    try {
        const [total, completed, cancelled, pending, scheduled, inProgress, allInterventions, companyUsers, equipments] = await Promise.all([
            prisma.intervention.count({ where }),
            prisma.intervention.count({ where: { ...where, status: "COMPLETED" } }),
            prisma.intervention.count({ where: { ...where, status: "CANCELLED" } }),
            prisma.intervention.count({ where: { ...where, status: "PENDING" } }),
            prisma.intervention.count({ where: { ...where, status: { in: ["SCHEDULED", "ARRIVED"] } } }),
            prisma.intervention.count({ where: { ...where, status: "IN_PROGRESS" } }),
            prisma.intervention.findMany({
                where,
                select: {
                    id: true,
                    status: true,
                    technicianId: true,
                    startedAt: true,
                    completedAt: true,
                    estimatedDuration: true,
                    technician: {
                        select: { id: true, firstName: true, lastName: true, role: true }
                    },
                    createdBy: {
                        select: { id: true, firstName: true, lastName: true, role: true }
                    },
                    equipment: {
                        select: { id: true, brand: true, model: true }
                    },
                    interventionType: {
                        select: { id: true, name: true }
                    }
                }
            }),
            prisma.user.findMany({
                where: {
                    companyId,
                    role: { in: ["TECHNICIAN", "MANAGER", "OWNER"] },
                    isActive: true
                },
                select: { id: true, firstName: true, lastName: true, role: true }
            }),
            prisma.equipment.findMany({
                where: {
                    client: { companyId, isActive: true },
                    isActive: true
                },
                select: { brand: true, model: true }
            })
        ]);

        // Calcul de la durée moyenne (en minutes)
        let totalDurationMinutes = 0;
        let validDurationsCount = 0;

        allInterventions.forEach(item => {
            if (item.status === "COMPLETED") {
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
            }
        });

        const avgDurationMinutes = validDurationsCount > 0 ? Math.round(totalDurationMinutes / validDurationsCount) : 0;
        const scheduledTotal = scheduled + inProgress;

        // 2. Technicians Workload
        const techMap = new Map();
        companyUsers.forEach(u => {
            techMap.set(u.id, {
                id: u.id,
                name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || "Collaborateur",
                role: u.role,
                completed: 0,
                planned: 0
            });
        });

        allInterventions.forEach(item => {
            const assigned = item.technician || item.createdBy;
            const uid = assigned?.id || 'unassigned';
            if (!techMap.has(uid)) {
                techMap.set(uid, {
                    id: uid,
                    name: assigned ? `${assigned.firstName || ''} ${assigned.lastName || ''}`.trim() : "Non assigné",
                    role: assigned?.role || "TECHNICIAN",
                    completed: 0,
                    planned: 0
                });
            }
            const record = techMap.get(uid);
            if (item.status === 'COMPLETED') {
                record.completed += 1;
            } else if (item.status !== 'CANCELLED') {
                record.planned += 1;
            }
        });

        const techWorkload = Array.from(techMap.values())
            .sort((a, b) => (b.completed + b.planned) - (a.completed + a.planned));

        // 3. Equipment Breakdown
        const brandCounts = {};
        allInterventions.forEach(item => {
            if (item.equipment?.brand) {
                const brand = item.equipment.brand.trim();
                brandCounts[brand] = (brandCounts[brand] || 0) + 1;
            } else if (item.interventionType?.name) {
                const typeName = item.interventionType.name.trim();
                brandCounts[typeName] = (brandCounts[typeName] || 0) + 1;
            }
        });

        equipments.forEach(eq => {
            if (eq.brand) {
                const brand = eq.brand.trim();
                brandCounts[brand] = (brandCounts[brand] || 0) + 1;
            }
        });

        const totalEquipCount = Object.values(brandCounts).reduce((acc, c) => acc + c, 0);
        const equipmentBreakdown = Object.entries(brandCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([brand, count]) => ({
                brand,
                count,
                percentage: totalEquipCount > 0 ? Math.round((count / totalEquipCount) * 100) : 0
            }));

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    total,
                    completed,
                    scheduled: scheduledTotal,
                    cancelled,
                    pending,
                    inProgress,
                    completionRate: total > 0 ? Math.round((completed / (total - cancelled || 1)) * 100) : 0,
                    avgDurationMinutes
                },
                techWorkload,
                equipmentBreakdown
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

        // Clients nécessitant une action (URGENT ou WARNING en priorité)
        let actionClients = await prisma.client.findMany({
            where: {
                companyId,
                isActive: true,
                status: { in: ["URGENT", "WARNING"] }
            },
            take: 5,
            orderBy: [
                { status: "desc" },
                { updatedAt: "desc" }
            ],
            select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                phone: true,
                status: true,
                equipment: {
                    where: { isActive: true },
                    take: 1,
                    select: { brand: true, model: true, power: true }
                }
            }
        });

        // Si aucun client n'est en warning/urgent, renvoyer les derniers clients actifs
        if (actionClients.length === 0) {
            actionClients = await prisma.client.findMany({
                where: {
                    companyId,
                    isActive: true
                },
                take: 5,
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true,
                    phone: true,
                    status: true,
                    equipment: {
                        where: { isActive: true },
                        take: 1,
                        select: { brand: true, model: true, power: true }
                    }
                }
            });
        }

        const formattedActionClients = actionClients.map(c => {
            const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || "Client";
            const eq = c.equipment?.[0];
            const eqDesc = eq 
                ? `${eq.brand || ''} ${eq.model || ''}${eq.power ? ` (${eq.power})` : ''}`.trim() 
                : "Équipement en suivi";
            return {
                id: c.id,
                name: fullName,
                phone: c.phone || "",
                status: c.status || "OK",
                equipment: eqDesc
            };
        });

        // Données SMS réelles de l'entreprise
        const now = new Date();
        const [smsUsage, subscription, outgoingSms, deliveredSms] = await Promise.all([
            prisma.smsUsage.findFirst({
                where: {
                    companyId,
                    month: now.getMonth() + 1,
                    year: now.getFullYear()
                }
            }),
            prisma.subscription.findUnique({
                where: { companyId },
                include: { plan: true }
            }),
            prisma.smsLog.count({
                where: { companyId, direction: "OUTGOING" }
            }),
            prisma.smsLog.count({
                where: { companyId, direction: "OUTGOING", status: { in: ["DELIVERED", "SENT"] } }
            })
        ]);

        const planLimit = subscription?.plan?.maxSmsPerMonth ?? 50;
        const sentSmsThisMonth = smsUsage?.count || subscription?.smsUsedThisMonth || 0;
        const remainingSms = planLimit === -1 ? 9999 : Math.max(0, planLimit - sentSmsThisMonth);
        const deliveryRate = outgoingSms > 0 ? Math.round((deliveredSms / outgoingSms) * 1000) / 10 : 100;

        return res.status(200).json({
            success: true,
            data: {
                totalActive,
                newClients,
                statusBreakdown: {
                    OK: okCount,
                    WARNING: warningCount,
                    URGENT: urgentCount
                },
                clientStats: {
                    ok: okCount,
                    warning: warningCount,
                    urgent: urgentCount,
                    total: totalActive
                },
                urgentClients: formattedActionClients,
                smsStats: {
                    sent: sentSmsThisMonth,
                    limit: planLimit === -1 ? 9999 : planLimit,
                    remaining: remainingSms,
                    deliveryRate
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

////// HELPER: FETCH ACCOUNTING EXPORT DATA //////
async function getAccountingData(companyId, startDate, endDate) {
    const fromDate = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    toDate.setHours(23, 59, 59, 999);

    const [invoices, company, companySettings] = await Promise.all([
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
                client: true,
                lines: true
            },
            orderBy: { createdAt: "asc" }
        }),
        prisma.company.findUnique({
            where: { id: companyId }
        }),
        prisma.companySettings.findUnique({
            where: { companyId }
        })
    ]);

    let totalHT = 0;
    let totalTTC = 0;
    let totalPaid = 0;
    let paidCount = 0;

    const tvaMap = {
        "0%": { base: 0, tva: 0 },
        "5.5%": { base: 0, tva: 0 },
        "10%": { base: 0, tva: 0 },
        "20%": { base: 0, tva: 0 }
    };

    invoices.forEach(inv => {
        const ht = Number(inv.amountHT || inv.totalHt || 0);
        const ttc = Number(inv.amountTTC || inv.totalTtc || ht);
        const isPaid = inv.status === "PAID";

        totalHT += ht;
        totalTTC += ttc;

        if (isPaid) {
            totalPaid += ttc;
            paidCount++;
        }

        if (Array.isArray(inv.lines) && inv.lines.length > 0) {
            inv.lines.forEach(line => {
                const lineHt = Number(line.totalHT || line.amountHT || ((line.unitPrice || 0) * (line.quantity || 1)));
                const rate = Number(line.tvaRate !== undefined ? line.tvaRate : (line.taxRate !== undefined ? line.taxRate : 20));
                let key = "20%";
                if (rate === 0) key = "0%";
                else if (rate === 5.5) key = "5.5%";
                else if (rate === 10) key = "10%";
                else key = "20%";

                const lineTva = Math.round(lineHt * (rate / 100) * 100) / 100;
                tvaMap[key].base += lineHt;
                tvaMap[key].tva += lineTva;
            });
        } else {
            const diff = Math.max(0, ttc - ht);
            tvaMap["20%"].base += ht;
            tvaMap["20%"].tva += diff;
        }
    });

    const totalTVA = Math.round((totalTTC - totalHT) * 100) / 100;
    const pendingCount = Math.max(0, invoices.length - paidCount);
    const totalPending = Math.max(0, totalTTC - totalPaid);

    // Cotisations sociales (Taux auto-entrepreneur standard / configuré)
    const urssafRate = 21.2;
    const cfpRate = 0.3;
    const urssafDue = Math.round(totalHT * (urssafRate / 100) * 100) / 100;
    const cfpDue = Math.round(totalHT * (cfpRate / 100) * 100) / 100;
    const totalCharges = Math.round((urssafDue + cfpDue) * 100) / 100;
    const netEnPoche = Math.round((totalHT - totalCharges) * 100) / 100;
    const netPercent = totalHT > 0 ? Math.round((netEnPoche / totalHT) * 1000) / 10 : 78.5;

    return {
        company: {
            name: company?.name || "KHALID SAINARO",
            commercialName: company?.commercialName || "GestArt",
            siret: company?.siret || "944 087 725 00015",
            siren: company?.siren || "944 087 725",
            ape: company?.apeCode || "53.20Z",
            address: company?.address || "23 RUE PAGANINI, 06000 NICE",
            email: company?.email || "support.gestart@gmail.com",
            phone: company?.phone || "06 51 60 43 16"
        },
        period: {
            startDate: fromDate.toLocaleDateString("fr-FR"),
            endDate: toDate.toLocaleDateString("fr-FR"),
            rawStart: startDate || fromDate.toISOString().split("T")[0],
            rawEnd: endDate || toDate.toISOString().split("T")[0]
        },
        summary: {
            totalInvoices: invoices.length,
            totalHT: Math.round(totalHT * 100) / 100,
            totalTTC: Math.round(totalTTC * 100) / 100,
            totalTVA,
            totalPaid: Math.round(totalPaid * 100) / 100,
            totalPending: Math.round(totalPending * 100) / 100,
            paidCount,
            pendingCount
        },
        invoices,
        tvaMap,
        socialCharges: {
            urssafRate,
            cfpRate,
            urssafDue,
            cfpDue,
            totalCharges,
            netEnPoche,
            netPercent
        }
    };
}

////// 1. EXPORT EXCEL (.xlsx) //////
export const exportAccountingExcel = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { startDate, endDate } = req.query;

        const data = await getAccountingData(companyId, startDate, endDate);
        const { company, period, summary, invoices, tvaMap, socialCharges } = data;

        const wb = XLSX.utils.book_new();

        // SHEET 1: Factures
        const invoiceRows = [
            ["N° Facture", "Date Émission", "Client", "Email", "Téléphone", "Statut", "Montant HT (€)", "Montant TVA (€)", "Montant TTC (€)", "Date Paiement", "Mode de Règlement"]
        ];

        invoices.forEach(inv => {
            const clientName = inv.client ? `${inv.client.firstName || ''} ${inv.client.lastName || inv.client.companyName || ''}`.trim() : (inv.clientName || 'Client divers');
            const ht = Number(inv.amountHT || inv.totalHt || 0);
            const ttc = Number(inv.amountTTC || inv.totalTtc || ht);
            const tva = Math.round((ttc - ht) * 100) / 100;
            const statusLabel = inv.status === "PAID" ? "Payée" : inv.status === "SENT" ? "Émise (En attente)" : inv.status === "OVERDUE" ? "En retard" : "Brouillon";

            invoiceRows.push([
                inv.number || `F-${inv.id}`,
                inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("fr-FR") : "",
                clientName,
                inv.client?.email || "",
                inv.client?.phone || "",
                statusLabel,
                ht,
                tva,
                ttc,
                inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("fr-FR") : (inv.status === "PAID" ? "Réglé" : ""),
                inv.paymentMethod || (inv.status === "PAID" ? "Virement / CB" : "")
            ]);
        });

        // Add summary total row
        invoiceRows.push([
            "TOTAL",
            "",
            `${summary.totalInvoices} facture(s)`,
            "",
            "",
            `${summary.paidCount} payée(s) / ${summary.pendingCount} en attente`,
            summary.totalHT,
            summary.totalTVA,
            summary.totalTTC,
            `${summary.totalPaid} € encaissé`,
            ""
        ]);

        const wsInvoices = XLSX.utils.aoa_to_sheet(invoiceRows);
        wsInvoices["!cols"] = [
            { wch: 15 }, { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, wsInvoices, "Factures & Ventes");

        // SHEET 2: Récapitulatif TVA
        const tvaRows = [
            ["Taux de TVA", "Base Hors Taxe (HT €)", "Montant TVA Collectée (€)", "Régime d'exigibilité"],
            ["Taux 0%", Math.round(tvaMap["0%"].base * 100) / 100, Math.round(tvaMap["0%"].tva * 100) / 100, "Franchise / Exonéré"],
            ["Taux 5.5%", Math.round(tvaMap["5.5%"].base * 100) / 100, Math.round(tvaMap["5.5%"].tva * 100) / 100, "Encaissements (Art. 269-2 CGI)"],
            ["Taux 10%", Math.round(tvaMap["10%"].base * 100) / 100, Math.round(tvaMap["10%"].tva * 100) / 100, "Encaissements (Art. 269-2 CGI)"],
            ["Taux 20%", Math.round(tvaMap["20%"].base * 100) / 100, Math.round(tvaMap["20%"].tva * 100) / 100, "Encaissements (Art. 269-2 CGI)"],
            ["TOTAL TVA", summary.totalHT, summary.totalTVA, "Total Déclarable"]
        ];
        const wsTva = XLSX.utils.aoa_to_sheet(tvaRows);
        wsTva["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 24 }, { wch: 32 }];
        XLSX.utils.book_append_sheet(wb, wsTva, "Récapitulatif TVA");

        // SHEET 3: Cotisations URSSAF & Net
        const socialRows = [
            ["Poste de Dépense / Cotisation", "Base de Calcul HT (€)", "Taux Appliqué (%)", "Montant Déduit (€)", "Organisme Récepteur"],
            ["1. Cotisations sociales URSSAF", summary.totalHT, `${socialCharges.urssafRate}%`, socialCharges.urssafDue, "URSSAF"],
            ["2. Formation Professionnelle (CFP)", summary.totalHT, `${socialCharges.cfpRate}%`, socialCharges.cfpDue, "URSSAF / FAFCEA"],
            ["3. Versement Libératoire (IR)", summary.totalHT, "—", 0, "DGFIP (Déclaration 2042)"],
            ["TOTAL CHARGES SOCIALES & FISCALES", summary.totalHT, `${socialCharges.urssafRate + socialCharges.cfpRate}%`, socialCharges.totalCharges, "URSSAF"],
            ["REVENU NET RESTANT EN POCHE", summary.totalHT, `${socialCharges.netPercent}%`, socialCharges.netEnPoche, "Entrepreneur (Bénéfice Net)"]
        ];
        const wsSocial = XLSX.utils.aoa_to_sheet(socialRows);
        wsSocial["!cols"] = [{ wch: 35 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsSocial, "Cotisations & Net");

        const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const filename = `Export_Comptable_GestArt_${period.rawStart}_au_${period.rawEnd}.xlsx`;

        // Enregistrer dans l'historique des exports
        await logExportHistory(companyId, {
            format: "excel",
            filename,
            startDate: period.rawStart,
            endDate: period.rawEnd,
            periodLabel: `Du ${period.startDate} au ${period.endDate}`,
            invoicesCount: summary.totalInvoices,
            totalHT: summary.totalHT,
            totalTTC: summary.totalTTC
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(excelBuffer);
    } catch (error) {
        console.error("EXPORT EXCEL ERROR:", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la génération de l'export Excel: " + error.message });
    }
};

////// 2. EXPORT PDF (.pdf) //////
export const exportAccountingPdf = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { startDate, endDate } = req.query;

        const data = await getAccountingData(companyId, startDate, endDate);
        const { company, period, summary, invoices, tvaMap, socialCharges } = data;

        const invoiceRowsHtml = invoices.map(inv => {
            const clientName = inv.client ? `${inv.client.firstName || ''} ${inv.client.lastName || inv.client.companyName || ''}`.trim() : (inv.clientName || 'Client divers');
            const ht = Number(inv.amountHT || inv.totalHt || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
            const ttc = Number(inv.amountTTC || inv.totalTtc || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
            const tva = (Math.max(0, Number(inv.amountTTC || inv.totalTtc || 0) - Number(inv.amountHT || inv.totalHt || 0))).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
            const date = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("fr-FR") : "-";
            const statusClass = inv.status === "PAID" ? "badge-paid" : "badge-pending";
            const statusText = inv.status === "PAID" ? "RÉGLÉE" : "EN ATTENTE";

            return `
                <tr>
                    <td><strong>${inv.number || `F-${inv.id}`}</strong></td>
                    <td>${date}</td>
                    <td>${clientName}</td>
                    <td style="text-align: right;">${ht} €</td>
                    <td style="text-align: right;">${tva} €</td>
                    <td style="text-align: right; font-weight: 700;">${ttc} €</td>
                    <td style="text-align: center;"><span class="badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }).join("");

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>Rapport Comptable GestArt</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        color: #1e293b;
                        background: #ffffff;
                        padding: 24px 30px;
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #556B2F;
                        padding-bottom: 16px;
                        margin-bottom: 20px;
                    }
                    .brand-name {
                        font-size: 22px;
                        font-weight: 800;
                        color: #556B2F;
                        margin: 0 0 4px 0;
                    }
                    .company-details {
                        font-size: 10px;
                        color: #64748b;
                    }
                    .report-title-box {
                        text-align: right;
                    }
                    .report-title {
                        font-size: 16px;
                        font-weight: 800;
                        color: #0f172a;
                        margin: 0;
                    }
                    .report-period {
                        font-size: 11px;
                        font-weight: 600;
                        color: #556B2F;
                        margin-top: 2px;
                    }
                    .kpis-row {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 20px;
                    }
                    .kpi-tile {
                        flex: 1;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        padding: 10px 12px;
                    }
                    .kpi-title {
                        font-size: 9px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #64748b;
                        letter-spacing: 0.5px;
                    }
                    .kpi-val {
                        font-size: 15px;
                        font-weight: 800;
                        color: #0f172a;
                        margin-top: 2px;
                    }
                    .section-title {
                        font-size: 14px;
                        font-weight: 800;
                        color: #0f172a;
                        margin: 20px 0 10px 0;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 4px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                        margin-bottom: 20px;
                    }
                    th {
                        background-color: #f1f5f9;
                        color: #475569;
                        font-weight: 700;
                        text-align: left;
                        padding: 8px 10px;
                        border-bottom: 1px solid #cbd5e1;
                    }
                    td {
                        padding: 7px 10px;
                        border-bottom: 1px solid #f1f5f9;
                        color: #334155;
                    }
                    tr:nth-child(even) td {
                        background-color: #f8fafc;
                    }
                    .total-row td {
                        font-weight: 800;
                        background-color: #f1f5f9;
                        border-top: 1px solid #cbd5e1;
                        border-bottom: 2px solid #556B2F;
                    }
                    .badge {
                        padding: 3px 6px;
                        border-radius: 4px;
                        font-size: 9px;
                        font-weight: 700;
                        display: inline-block;
                    }
                    .badge-paid {
                        background-color: #dcfce7;
                        color: #166534;
                    }
                    .badge-pending {
                        background-color: #fef9c3;
                        color: #854d0e;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 12px;
                        border-top: 1px solid #e2e8f0;
                        font-size: 9px;
                        color: #94a3b8;
                        display: flex;
                        justify-content: space-between;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="brand-name">${company.commercialName || "GestArt"}</h1>
                        <div class="company-details">
                            <strong>${company.name}</strong> • SIRET : ${company.siret} • APE : ${company.ape}<br>
                            ${company.address} • Tél : ${company.phone} • Email : ${company.email}
                        </div>
                    </div>
                    <div class="report-title-box">
                        <div class="report-title">RAPPORT COMPTABLE</div>
                        <div class="report-period">Période du ${period.startDate} au ${period.endDate}</div>
                    </div>
                </div>

                <!-- KPIS -->
                <div class="kpis-row">
                    <div class="kpi-tile">
                        <div class="kpi-title">Factures Émises</div>
                        <div class="kpi-val">${summary.totalInvoices}</div>
                    </div>
                    <div class="kpi-tile">
                        <div class="kpi-title">Chiffre d'Affaires HT</div>
                        <div class="kpi-val" style="color: #556B2F;">${summary.totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
                    </div>
                    <div class="kpi-tile">
                        <div class="kpi-title">TVA Collectée</div>
                        <div class="kpi-val">${summary.totalTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
                    </div>
                    <div class="kpi-tile">
                        <div class="kpi-title">Total Encaissé (TTC)</div>
                        <div class="kpi-val" style="color: #16a34a;">${summary.totalPaid.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
                    </div>
                </div>

                <!-- TABLE FACTURES -->
                <div class="section-title">1. Journal des Ventes & Factures</div>
                <table>
                    <thead>
                        <tr>
                            <th>N° Facture</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th style="text-align: right;">Montant HT</th>
                            <th style="text-align: right;">TVA</th>
                            <th style="text-align: right;">Montant TTC</th>
                            <th style="text-align: center;">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoiceRowsHtml || '<tr><td colspan="7" style="text-align: center; color: #94a3b8;">Aucune facture pour cette période</td></tr>'}
                        <tr class="total-row">
                            <td colspan="3">TOTAL GÉNÉRAL</td>
                            <td style="text-align: right;">${summary.totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                            <td style="text-align: right;">${summary.totalTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                            <td style="text-align: right;">${summary.totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                            <td style="text-align: center;">${summary.paidCount}/${summary.totalInvoices} payées</td>
                        </tr>
                    </tbody>
                </table>

                <!-- TABLE TVA & URSSAF (2 COLUMNS) -->
                <div style="display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        <div class="section-title">2. Récapitulatif TVA</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Taux</th>
                                    <th style="text-align: right;">Base HT</th>
                                    <th style="text-align: right;">TVA</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Taux 0%</td><td style="text-align: right;">${tvaMap["0%"].base.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td><td style="text-align: right;">0,00 €</td></tr>
                                <tr><td>Taux 5.5%</td><td style="text-align: right;">${tvaMap["5.5%"].base.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td><td style="text-align: right;">${tvaMap["5.5%"].tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                                <tr><td>Taux 10%</td><td style="text-align: right;">${tvaMap["10%"].base.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td><td style="text-align: right;">${tvaMap["10%"].tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                                <tr><td>Taux 20%</td><td style="text-align: right;">${tvaMap["20%"].base.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td><td style="text-align: right;">${tvaMap["20%"].tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                                <tr class="total-row"><td>TOTAL</td><td style="text-align: right;">${summary.totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td><td style="text-align: right;">${summary.totalTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="flex: 1;">
                        <div class="section-title">3. Cotisations Sociales & Net</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Poste</th>
                                    <th style="text-align: right;">Taux</th>
                                    <th style="text-align: right;">Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>URSSAF (Social)</td><td style="text-align: right;">${socialCharges.urssafRate}%</td><td style="text-align: right; color: #dc2626;">- ${socialCharges.urssafDue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                                <tr><td>Formation (CFP)</td><td style="text-align: right;">${socialCharges.cfpRate}%</td><td style="text-align: right; color: #dc2626;">- ${socialCharges.cfpDue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                                <tr class="total-row"><td>TOTAL CHARGES</td><td style="text-align: right;">${socialCharges.urssafRate + socialCharges.cfpRate}%</td><td style="text-align: right; color: #dc2626;">- ${socialCharges.totalCharges.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                                <tr style="background-color: #f0fdf4; font-weight: 800;"><td>REVENU NET</td><td style="text-align: right; color: #16a34a;">${socialCharges.netPercent}%</td><td style="text-align: right; color: #16a34a;">${socialCharges.netEnPoche.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="footer">
                    <span>Document généré par la plateforme GestArt • Conformité Code du Commerce & CGI</span>
                    <span>Page 1 / 1</span>
                </div>
            </body>
            </html>
        `;

        const pdfBuffer = await generatePdfFromHtml(fullHtml);
        const filename = `Rapport_Comptable_GestArt_${period.rawStart}_au_${period.rawEnd}.pdf`;

        // Enregistrer dans l'historique des exports
        await logExportHistory(companyId, {
            format: "pdf",
            filename,
            startDate: period.rawStart,
            endDate: period.rawEnd,
            periodLabel: `Du ${period.startDate} au ${period.endDate}`,
            invoicesCount: summary.totalInvoices,
            totalHT: summary.totalHT,
            totalTTC: summary.totalTTC
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("EXPORT PDF ERROR:", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la génération du PDF: " + error.message });
    }
};

////// 3. EXPORT TEXTE (.txt) //////
export const exportAccountingTxt = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { startDate, endDate } = req.query;

        const data = await getAccountingData(companyId, startDate, endDate);
        const { company, period, summary, invoices, tvaMap, socialCharges } = data;

        let txt = `================================================================================
                     RAPPORT COMPTABLE ET FINANCIER
================================================================================
Éditeur : ${company.commercialName} - ${company.name}
SIRET   : ${company.siret} | APE : ${company.ape}
Adresse : ${company.address}
Contact : ${company.phone} | ${company.email}
--------------------------------------------------------------------------------
Période comptable : Du ${period.startDate} au ${period.endDate}
Généré le         : ${new Date().toLocaleString("fr-FR")}
================================================================================

1. SYNTHÈSE GLOBALE
--------------------------------------------------------------------------------
Nombre de factures émises : ${summary.totalInvoices}
- Factures réglées        : ${summary.paidCount} (${summary.totalPaid.toLocaleString("fr-FR")} € TTC)
- Factures en attente     : ${summary.pendingCount} (${summary.totalPending.toLocaleString("fr-FR")} € TTC)

Chiffre d'Affaires HT     : ${summary.totalHT.toLocaleString("fr-FR")} €
Total TVA Collectée       : ${summary.totalTVA.toLocaleString("fr-FR")} €
Total Facturé TTC         : ${summary.totalTTC.toLocaleString("fr-FR")} €

2. DÉTAIL DES FACTURES DE LA PÉRIODE
--------------------------------------------------------------------------------
${invoices.map(inv => {
    const clientName = inv.client ? `${inv.client.firstName || ''} ${inv.client.lastName || inv.client.companyName || ''}`.trim() : (inv.clientName || 'Client divers');
    const ht = Number(inv.amountHT || inv.totalHt || 0).toLocaleString("fr-FR");
    const ttc = Number(inv.amountTTC || inv.totalTtc || 0).toLocaleString("fr-FR");
    const date = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("fr-FR") : "-";
    const status = inv.status === "PAID" ? "PAYÉE" : "EN ATTENTE";
    return `• ${inv.number || `F-${inv.id}`} | Date: ${date} | Client: ${clientName.padEnd(20, " ")} | HT: ${ht} € | TTC: ${ttc} € | [${status}]`;
}).join("\n")}

3. RÉCAPITULATIF DE TVA
--------------------------------------------------------------------------------
- Taux  0.0% : Base HT = ${tvaMap["0%"].base.toLocaleString("fr-FR")} € | TVA = 0,00 €
- Taux  5.5% : Base HT = ${tvaMap["5.5%"].base.toLocaleString("fr-FR")} € | TVA = ${tvaMap["5.5%"].tva.toLocaleString("fr-FR")} €
- Taux 10.0% : Base HT = ${tvaMap["10%"].base.toLocaleString("fr-FR")} € | TVA = ${tvaMap["10%"].tva.toLocaleString("fr-FR")} €
- Taux 20.0% : Base HT = ${tvaMap["20%"].base.toLocaleString("fr-FR")} € | TVA = ${tvaMap["20%"].tva.toLocaleString("fr-FR")} €
--------------------------------------------------------------------------------
TOTAL TVA COLLECTÉE : ${summary.totalTVA.toLocaleString("fr-FR")} €

4. CHARGES SOCIALES & REVENU NET (ESTIMATION URSSAF)
--------------------------------------------------------------------------------
- Cotisations sociales URSSAF (${socialCharges.urssafRate}%) : - ${socialCharges.urssafDue.toLocaleString("fr-FR")} €
- Formation Professionnelle CFP (${socialCharges.cfpRate}%)  : - ${socialCharges.cfpDue.toLocaleString("fr-FR")} €
- Total Cotisations à verser                      : - ${socialCharges.totalCharges.toLocaleString("fr-FR")} €
--------------------------------------------------------------------------------
REVENU NET RESTANT EN POCHE (${socialCharges.netPercent}%)       : ${socialCharges.netEnPoche.toLocaleString("fr-FR")} €

================================================================================
GestArt v1.0.0 • Logiciel de Gestion et Facturation Conforme
================================================================================
`;

        const filename = `Export_Comptable_GestArt_${period.rawStart}_au_${period.rawEnd}.txt`;

        // Enregistrer dans l'historique des exports
        await logExportHistory(companyId, {
            format: "txt",
            filename,
            startDate: period.rawStart,
            endDate: period.rawEnd,
            periodLabel: `Du ${period.startDate} au ${period.endDate}`,
            invoicesCount: summary.totalInvoices,
            totalHT: summary.totalHT,
            totalTTC: summary.totalTTC
        });

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(txt);
    } catch (error) {
        console.error("EXPORT TXT ERROR:", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la génération du TXT: " + error.message });
    }
};

////// 4. HELPER & ROUTE POUR L'HISTORIQUE DES EXPORTS //////
export const logExportHistory = async (companyId, item) => {
    try {
        const settings = await prisma.companySettings.findUnique({
            where: { companyId },
            select: { documentCustomization: true }
        });
        const customObj = (settings?.documentCustomization && typeof settings.documentCustomization === "object") ? settings.documentCustomization : {};
        const prevList = Array.isArray(customObj.exportHistory) ? customObj.exportHistory : [];
        const newHistory = [
            {
                id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                ...item,
                createdAt: new Date().toISOString()
            },
            ...prevList
        ].slice(0, 20); // Garder les 20 derniers exports au maximum (FIFO)

        await prisma.companySettings.upsert({
            where: { companyId },
            update: {
                documentCustomization: {
                    ...customObj,
                    exportHistory: newHistory
                }
            },
            create: {
                companyId,
                documentCustomization: {
                    exportHistory: newHistory
                }
            }
        });
    } catch (e) {
        console.warn("Failed to log export history:", e.message);
    }
};

export const getExportHistory = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const settings = await prisma.companySettings.findUnique({
            where: { companyId },
            select: { documentCustomization: true }
        });
        const history = (settings?.documentCustomization?.exportHistory || []).slice(0, 20);
        return res.json({ success: true, history });
    } catch (error) {
        console.error("GET EXPORT HISTORY ERROR:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
