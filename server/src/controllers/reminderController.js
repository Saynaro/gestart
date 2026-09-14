import { prisma } from "../config/db.js";
import { PresetService } from "../services/reminders/PresetService.js";
import { ReminderEngineService } from "../services/reminders/ReminderEngineService.js";
import { autoRappelScheduler } from "../services/reminders/AutoRappelScheduler.js";

/**
 * GET /api/v1/reminders/dashboard
 * Tableau de bord complet des rappels à venir et statistiques
 */
export const getReminderDashboard = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Assurer que les services par défaut sont initialisés
        await PresetService.ensureCompanyDefaultServices(companyId).catch(() => {});

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const endOfWeek = new Date(startOfDay);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);

        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 1. Récupération des exécutions selon les échéances
        const [overdue, today, thisWeek, thisMonth, future, allExecutions, automationsCount] = await Promise.all([
            // En retard
            prisma.reminderExecution.findMany({
                where: {
                    companyId,
                    status: "SCHEDULED",
                    scheduledAt: { lt: startOfDay }
                },
                include: {
                    client: true,
                    reminderAutomation: {
                        include: {
                            trackedServices: { include: { serviceType: true } }
                        }
                    }
                },
                orderBy: { scheduledAt: "asc" }
            }),

            // Aujourd'hui
            prisma.reminderExecution.findMany({
                where: {
                    companyId,
                    status: "SCHEDULED",
                    scheduledAt: { gte: startOfDay, lte: endOfDay }
                },
                include: {
                    client: true,
                    reminderAutomation: {
                        include: {
                            trackedServices: { include: { serviceType: true } }
                        }
                    }
                },
                orderBy: { scheduledAt: "asc" }
            }),

            // Cette semaine
            prisma.reminderExecution.findMany({
                where: {
                    companyId,
                    status: "SCHEDULED",
                    scheduledAt: { gt: endOfDay, lte: endOfWeek }
                },
                include: {
                    client: true,
                    reminderAutomation: {
                        include: {
                            trackedServices: { include: { serviceType: true } }
                        }
                    }
                },
                orderBy: { scheduledAt: "asc" }
            }),

            // Ce mois
            prisma.reminderExecution.findMany({
                where: {
                    companyId,
                    status: "SCHEDULED",
                    scheduledAt: { gt: endOfWeek, lte: endOfMonth }
                },
                include: {
                    client: true,
                    reminderAutomation: {
                        include: {
                            trackedServices: { include: { serviceType: true } }
                        }
                    }
                },
                orderBy: { scheduledAt: "asc" }
            }),

            // Échéances futures (Au-delà de ce mois / Prochains mois & années)
            prisma.reminderExecution.findMany({
                where: {
                    companyId,
                    status: "SCHEDULED",
                    scheduledAt: { gt: endOfMonth }
                },
                include: {
                    client: true,
                    reminderAutomation: {
                        include: {
                            trackedServices: { include: { serviceType: true } }
                        }
                    }
                },
                orderBy: { scheduledAt: "asc" }
            }),

            // Statistiques globales
            prisma.reminderExecution.groupBy({
                by: ["status"],
                where: { companyId },
                _count: { id: true }
            }),

            // Total des règles d'automatisation actives
            prisma.reminderAutomation.count({
                where: { companyId, enabled: true }
            })
        ]);

        const stats = {
            activeRules: automationsCount,
            scheduled: 0,
            sent: 0,
            responded: 0,
            failed: 0,
            overdueCount: overdue.length,
            todayCount: today.length,
            futureCount: (future || []).length
        };

        allExecutions.forEach(item => {
            if (item.status === "SCHEDULED") stats.scheduled += item._count.id;
            if (["SENT", "DELIVERED", "WAITING_FOR_RESPONSE", "RESPONDED"].includes(item.status)) stats.sent += item._count.id;
            if (item.status === "RESPONDED") stats.responded += item._count.id;
            if (item.status === "FAILED") stats.failed += item._count.id;
        });

        return res.status(200).json({
            success: true,
            data: {
                stats,
                groups: {
                    overdue,
                    today,
                    thisWeek,
                    thisMonth,
                    future: future || []
                }
            }
        });
    } catch (error) {
        console.error("GET REMINDER DASHBOARD ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors du chargement du tableau de bord des rappels"
        });
    }
};

/**
 * GET /api/v1/reminders/automations
 * Liste des règles de rappels configurées
 */
export const getReminderAutomations = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId, status, automationType } = req.query;

        const where = {
            companyId,
            ...(clientId && { clientId }),
            ...(status && { status }),
            ...(automationType && { automationType })
        };

        const automations = await prisma.reminderAutomation.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                        preferredChannel: true,
                        companyName: true
                    }
                },
                lastCompletedIntervention: {
                    select: {
                        id: true,
                        title: true,
                        completedAt: true,
                        status: true
                    }
                },
                trackedServices: {
                    include: {
                        serviceType: true
                    }
                },
                executions: {
                    orderBy: { createdAt: "desc" },
                    take: 5
                }
            },
            orderBy: { nextReminderAt: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: { automations }
        });
    } catch (error) {
        console.error("GET REMINDER AUTOMATIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des automatisations"
        });
    }
};

/**
 * POST /api/v1/reminders/automations
 * Créer une nouvelle règle de rappel
 */
export const createReminderAutomation = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const {
            clientId,
            serviceTypeId,
            serviceTypeIds,
            name,
            automationType = "PERIODIC",
            frequencyValue = 12,
            frequencyUnit = "MONTHS",
            advanceNoticeValue = 30,
            advanceNoticeUnit = "DAYS",
            channel = "LAST_USED",
            fallbackChannel = "SMS",
            customMessageTemplate,
            stopOnReply = true,
            stopOnAppointment = true,
            maxFollowUps = 2,
            followUpIntervalDays = 7,
            initialBaseDate = new Date()
        } = req.body;

        if (!clientId) {
            return res.status(400).json({ success: false, message: "Le client est obligatoire." });
        }

        const targetServiceIds = serviceTypeIds || (serviceTypeId ? [serviceTypeId] : []);

        // Gestion de l'application globale à tous les clients
        if (clientId === "ALL" || clientId === "all") {
            const allClients = await prisma.client.findMany({
                where: { companyId, isActive: true }
            });
            let updatedCount = 0;
            let skippedCustomCount = 0;
            for (const c of allClients) {
                // Vérifier si ce client a une règle personnalisée explicite pour ce service
                const existingCustom = await prisma.reminderAutomation.findFirst({
                    where: {
                        companyId,
                        clientId: c.id,
                        isCustomOverride: true,
                        ...(targetServiceIds[0] && {
                            trackedServices: { some: { serviceTypeId: targetServiceIds[0] } }
                        })
                    }
                });

                if (existingCustom) {
                    skippedCustomCount++;
                    continue; // Préserver les paramètres personnalisés de ce client !
                }

                await ReminderEngineService.setupReminderAutomation({
                    companyId,
                    clientId: c.id,
                    serviceTypeId: targetServiceIds[0] || null,
                    name,
                    automationType,
                    frequencyValue,
                    frequencyUnit,
                    advanceNoticeValue,
                    advanceNoticeUnit,
                    channel,
                    fallbackChannel,
                    customMessageTemplate,
                    stopOnReply,
                    stopOnAppointment,
                    maxFollowUps,
                    followUpIntervalDays,
                    initialBaseDate,
                    isCustomOverride: false
                });
                updatedCount++;
            }
            return res.status(201).json({
                success: true,
                message: `Règle de rappel configurée pour ${updatedCount} clients (${skippedCustomCount > 0 ? `${skippedCustomCount} règle(s) personnalisée(s) préservée(s)` : 'toute la base'}) !`
            });
        }

        // Vérifier que le client appartient à l'entreprise
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId }
        });
        if (!client) {
            return res.status(404).json({ success: false, message: "Client introuvable." });
        }

        const automation = await ReminderEngineService.setupReminderAutomation({
            companyId,
            clientId,
            serviceTypeId: targetServiceIds[0] || null,
            name,
            automationType,
            frequencyValue,
            frequencyUnit,
            advanceNoticeValue,
            advanceNoticeUnit,
            channel,
            fallbackChannel,
            customMessageTemplate,
            stopOnReply,
            stopOnAppointment,
            maxFollowUps,
            followUpIntervalDays,
            initialBaseDate,
            isCustomOverride: true
        });

        // Si plusieurs services suivis
        if (targetServiceIds.length > 1) {
            for (let i = 1; i < targetServiceIds.length; i++) {
                await prisma.reminderAutomationService.upsert({
                    where: {
                        reminderAutomationId_serviceTypeId: {
                            reminderAutomationId: automation.id,
                            serviceTypeId: targetServiceIds[i]
                        }
                    },
                    update: {},
                    create: {
                        reminderAutomationId: automation.id,
                        serviceTypeId: targetServiceIds[i]
                    }
                });
            }
        }

        const fullAutomation = await prisma.reminderAutomation.findUnique({
            where: { id: automation.id },
            include: {
                client: true,
                trackedServices: { include: { serviceType: true } },
                executions: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Rappel automatique créé avec succès.",
            data: { automation: fullAutomation }
        });
    } catch (error) {
        console.error("CREATE REMINDER AUTOMATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la création du rappel automatique"
        });
    }
};

/**
 * PUT /api/v1/reminders/automations/:id
 * Modifier une règle de rappel existante
 */
export const updateReminderAutomation = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const existing = await prisma.reminderAutomation.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: "Rappel introuvable." });
        }

        const {
            name,
            enabled,
            clientId,
            frequencyValue,
            frequencyUnit,
            advanceNoticeValue,
            advanceNoticeUnit,
            channel,
            fallbackChannel,
            customMessageTemplate,
            stopOnReply,
            stopOnAppointment,
            maxFollowUps,
            followUpIntervalDays,
            serviceTypeId,
            serviceTypeIds
        } = req.body;

        // Recalcul de la prochaine date si fréquence ou préavis modifiés
        const freqVal = frequencyValue !== undefined ? (parseInt(frequencyValue, 10) || 1) : existing.frequencyValue;
        const freqUnit = frequencyUnit !== undefined ? frequencyUnit : existing.frequencyUnit;
        const advVal = advanceNoticeValue !== undefined ? (parseInt(advanceNoticeValue, 10) || 0) : existing.advanceNoticeValue;
        const advUnit = advanceNoticeUnit !== undefined ? advanceNoticeUnit : existing.advanceNoticeUnit;

        const baseDate = existing.lastCompletedAt || existing.createdAt;
        const nextReminderAt = ReminderEngineService.calculateNextDate(baseDate, freqVal, freqUnit, advVal, advUnit);

        const updated = await prisma.reminderAutomation.update({
            where: { id },
            data: {
                name: name !== undefined ? name : existing.name,
                clientId: clientId !== undefined ? (clientId === "ALL" ? null : clientId) : existing.clientId,
                enabled: enabled !== undefined ? enabled : existing.enabled,
                frequencyValue: freqVal,
                frequencyUnit: freqUnit,
                advanceNoticeValue: advVal,
                advanceNoticeUnit: advUnit,
                channel: channel !== undefined ? channel : existing.channel,
                fallbackChannel: fallbackChannel !== undefined ? fallbackChannel : existing.fallbackChannel,
                customMessageTemplate: customMessageTemplate !== undefined ? customMessageTemplate : existing.customMessageTemplate,
                stopOnReply: stopOnReply !== undefined ? stopOnReply : existing.stopOnReply,
                stopOnAppointment: stopOnAppointment !== undefined ? stopOnAppointment : existing.stopOnAppointment,
                maxFollowUps: maxFollowUps !== undefined ? (parseInt(maxFollowUps, 10) || 2) : existing.maxFollowUps,
                followUpIntervalDays: followUpIntervalDays !== undefined ? (parseInt(followUpIntervalDays, 10) || 7) : existing.followUpIntervalDays,
                isCustomOverride: true,
                nextReminderAt
            }
        });

        // Mettre à jour les services suivis si fournis
        const targetServiceIds = serviceTypeIds || (serviceTypeId ? [serviceTypeId] : null);
        if (Array.isArray(targetServiceIds) && targetServiceIds.length > 0) {
            await prisma.reminderAutomationService.deleteMany({
                where: { reminderAutomationId: id }
            });
            for (const sId of targetServiceIds) {
                await prisma.reminderAutomationService.create({
                    data: { reminderAutomationId: id, serviceTypeId: sId }
                });
            }
        }

        // Mettre à jour l'exécution SCHEDULED active
        const scheduledUpdateData = { scheduledAt: nextReminderAt };
        if (clientId !== undefined) {
            scheduledUpdateData.clientId = clientId === "ALL" ? null : clientId;
        }
        await prisma.reminderExecution.updateMany({
            where: { reminderAutomationId: id, status: "SCHEDULED" },
            data: scheduledUpdateData
        });

        const fullUpdated = await prisma.reminderAutomation.findUnique({
            where: { id },
            include: {
                client: true,
                trackedServices: { include: { serviceType: true } },
                executions: true
            }
        });

        return res.status(200).json({
            success: true,
            message: "Rappel automatique mis à jour avec succès.",
            data: { automation: fullUpdated }
        });
    } catch (error) {
        console.error("UPDATE REMINDER AUTOMATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à jour du rappel"
        });
    }
};

/**
 * PATCH /api/v1/reminders/automations/:id/toggle
 * Pause / Reprendre une automatisation
 */
export const toggleReminderAutomation = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const automation = await prisma.reminderAutomation.findFirst({
            where: { id, companyId }
        });

        if (!automation) {
            return res.status(404).json({ success: false, message: "Rappel introuvable." });
        }

        const newEnabled = !automation.enabled;
        const newStatus = newEnabled ? "SCHEDULED" : "PAUSED";

        const updated = await prisma.reminderAutomation.update({
            where: { id },
            data: {
                enabled: newEnabled,
                status: newStatus
            }
        });

        return res.status(200).json({
            success: true,
            message: newEnabled ? "Rappel réactivé avec succès." : "Rappel mis en pause.",
            data: { automation: updated }
        });
    } catch (error) {
        console.error("TOGGLE REMINDER AUTOMATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la modification de l'état du rappel"
        });
    }
};

/**
 * POST /api/v1/reminders/automations/:id/execute-now
 * Déclenchement manuel immédiat d'un rappel par l'artisan
 */
export const executeReminderNow = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const automation = await prisma.reminderAutomation.findFirst({
            where: { id, companyId },
            include: {
                client: true,
                company: { include: { subscription: { include: { plan: true } } } },
                trackedServices: { include: { serviceType: true } }
            }
        });

        if (!automation) {
            return res.status(404).json({ success: false, message: "Rappel introuvable." });
        }

        // Créer une exécution immédiate
        const execution = await prisma.reminderExecution.create({
            data: {
                companyId,
                reminderAutomationId: automation.id,
                clientId: automation.clientId,
                sequenceStep: 1,
                scheduledAt: new Date(),
                status: "SCHEDULED"
            },
            include: {
                company: { include: { subscription: { include: { plan: true } } } },
                client: true,
                reminderAutomation: {
                    include: { trackedServices: { include: { serviceType: true } } }
                }
            }
        });

        // Déclencher directement l'envoi via le scheduler
        await autoRappelScheduler.executeSingleReminder(execution, new Date());

        const refreshedExecution = await prisma.reminderExecution.findUnique({
            where: { id: execution.id }
        });

        if (refreshedExecution?.status === "FAILED") {
            return res.status(400).json({
                success: false,
                message: `Échec d'envoi du rappel : ${refreshedExecution.error}`,
                data: { execution: refreshedExecution }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Rappel exécuté et envoyé avec succès.",
            data: { execution: refreshedExecution }
        });
    } catch (error) {
        console.error("EXECUTE REMINDER NOW ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de l'exécution manuelle du rappel"
        });
    }
};

/**
 * DELETE /api/v1/reminders/automations/:id
 * Supprimer une règle de rappel
 */
export const deleteReminderAutomation = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const existing = await prisma.reminderAutomation.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: "Rappel introuvable." });
        }

        await prisma.reminderAutomation.delete({
            where: { id }
        });

        return res.status(200).json({
            success: true,
            message: "Rappel supprimé avec succès."
        });
    } catch (error) {
        console.error("DELETE REMINDER AUTOMATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression du rappel"
        });
    }
};

/**
 * GET /api/v1/reminders/executions
 * Historique des exécutions
 */
export const getReminderExecutions = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, clientId, limit = 50 } = req.query;

        const executions = await prisma.reminderExecution.findMany({
            where: {
                companyId,
                ...(status && { status }),
                ...(clientId && { clientId })
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true
                    }
                },
                reminderAutomation: {
                    select: {
                        id: true,
                        name: true,
                        frequencyValue: true,
                        frequencyUnit: true
                    }
                },
                message: {
                    select: {
                        id: true,
                        channel: true,
                        body: true,
                        status: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { scheduledAt: "desc" },
            take: parseInt(limit, 10) || 50
        });

        return res.status(200).json({
            success: true,
            data: { executions }
        });
    } catch (error) {
        console.error("GET REMINDER EXECUTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération de l'historique des relances"
        });
    }
};

/**
 * GET /api/v1/reminders/services
 * Liste des types de services (Catalogue par entreprise)
 */
export const getCompanyServices = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Auto-provisionner les services par défaut si aucun n'existe
        await PresetService.ensureCompanyDefaultServices(companyId).catch(() => {});

        const services = await prisma.serviceType.findMany({
            where: {
                companyId,
                isActive: true
            },
            orderBy: [
                { sortOrder: "asc" },
                { name: "asc" }
            ]
        });

        return res.status(200).json({
            success: true,
            data: { services }
        });
    } catch (error) {
        console.error("GET SERVICES ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des services"
        });
    }
};

/**
 * POST /api/v1/reminders/services
 * Créer un service personnalisé pour l'entreprise
 */
export const createCompanyService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const {
            name,
            tradeSlug,
            category = "maintenance",
            description,
            defaultFrequencyValue = 12,
            defaultFrequencyUnit = "MONTHS",
            defaultAdvanceNoticeValue = 30,
            defaultAdvanceNoticeUnit = "DAYS",
            defaultChannel = "LAST_USED",
            defaultTemplate,
            recommendationLevel = "CUSTOMIZABLE"
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Le nom du service est obligatoire." });
        }

        const service = await prisma.serviceType.create({
            data: {
                companyId,
                name: name.trim(),
                tradeSlug,
                category,
                description,
                defaultFrequencyValue: parseInt(defaultFrequencyValue, 10) || 12,
                defaultFrequencyUnit,
                defaultAdvanceNoticeValue: parseInt(defaultAdvanceNoticeValue, 10) || 30,
                defaultAdvanceNoticeUnit,
                defaultChannel,
                defaultTemplate,
                recommendationLevel,
                isDefault: false,
                isActive: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Service créé avec succès.",
            data: { service }
        });
    } catch (error) {
        console.error("CREATE SERVICE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la création du service"
        });
    }
};

/**
 * GET /api/v1/reminders/presets
 * Liste globale des presets de métiers
 */
export const getTradePresets = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: { presets: PresetService.INDUSTRY_PRESETS }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des modèles de métiers"
        });
    }
};
