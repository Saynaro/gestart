import { prisma } from "../config/db.js";
import { ReminderEngineService } from "../services/reminders/ReminderEngineService.js";
import { emitToCompany } from "../config/socket.js";

// Helper pour créer une notification facilement
const createNotification = async ({ companyId, userId, type, title, body, entityId, data }) => {
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
                entityType: "intervention",
                entityId,
                data: data || {},
            }
        });
    } catch (error) {
        console.error("NOTIFICATION HELPER ERROR:", error.message);
    }
};

////// GET PAGINATED INTERVENTIONS //////
export const getInterventions = async (req, res) => {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, type, technicianId, clientId, from, to, period, sort, search } = req.query;

    // Règle de rôle: le technicien ne voit que SES propres interventions assignées
    const effectiveTechnicianId = req.user.role === "TECHNICIAN"
        ? req.user.id
        : (technicianId || undefined);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let statusCondition = undefined;
    if (status && status !== "ALL") {
        statusCondition = status;
    } else if (!status && !period) {
        statusCondition = { not: "CANCELLED" };
    }

    const where = {
        companyId,
        ...(statusCondition && { status: statusCondition }),
        ...(effectiveTechnicianId && { technicianId: effectiveTechnicianId }),
        ...(clientId && { clientId }),
        ...(search && {
            OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { client: { firstName: { contains: search, mode: "insensitive" } } },
                { client: { lastName: { contains: search, mode: "insensitive" } } },
                { client: { companyName: { contains: search, mode: "insensitive" } } },
            ]
        }),
        ...(period === "past" && {
            OR: [
                { status: "COMPLETED" },
                { scheduledAt: { lt: startOfToday } }
            ]
        }),
        ...(period === "upcoming" && {
            scheduledAt: { gte: startOfToday },
            status: { notIn: ["COMPLETED", "CANCELLED"] }
        }),
        ...(period === "today" && {
            scheduledAt: { gte: startOfToday, lte: endOfToday }
        }),
        ...((from || to) && !period && {
            scheduledAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
            }
        })
    };

    const orderDirection = sort === "asc" ? "asc" : "desc";

    try {
        const [total, interventions] = await Promise.all([
            prisma.intervention.count({ where }),
            prisma.intervention.findMany({
                where,
                skip,
                take: limit,
                orderBy: { scheduledAt: orderDirection },
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            companyName: true,
                            phone: true,
                            city: true,
                            address: true,
                        }
                    },
                    technician: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        }
                    },
                    interventionType: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    equipment: {
                        select: {
                            id: true,
                            brand: true,
                            model: true,
                        }
                    },
                    services: {
                        include: {
                            serviceType: true
                        }
                    },
                    photos: true,
                    _count: {
                        select: { photos: true }
                    }
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                interventions,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error("GET INTERVENTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des interventions"
        });
    }
};

////// GET TODAY INTERVENTIONS //////
export const getTodayInterventions = async (req, res) => {
    const companyId = req.user.companyId;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const where = {
        companyId,
        scheduledAt: {
            gte: startOfDay,
            lte: endOfDay
        },
        ...(req.user.role === "TECHNICIAN" && { technicianId: req.user.id })
    };

    try {
        const interventions = await prisma.intervention.findMany({
            where,
            orderBy: { scheduledAt: "asc" },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        address: true,
                        city: true
                    }
                },
                equipment: true,
                photos: true,
                technician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: { interventions }
        });
    } catch (error) {
        console.error("GET TODAY INTERVENTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des interventions du jour"
        });
    }
};

////// GET WEEK PLANNING INTERVENTIONS //////
export const getWeekInterventions = async (req, res) => {
    const companyId = req.user.companyId;
    const { from, technicianId } = req.query;

    const startDate = from ? new Date(from) : new Date();
    // Ajustement au lundi de la semaine
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(startDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const where = {
        companyId,
        scheduledAt: {
            gte: monday,
            lte: sunday
        },
        ...(req.user.role === "TECHNICIAN" ? { technicianId: req.user.id } : (technicianId ? { technicianId } : {}))
    };

    try {
        const interventions = await prisma.intervention.findMany({
            where,
            orderBy: { scheduledAt: "asc" },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        city: true
                    }
                },
                technician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                weekRange: { monday, sunday },
                interventions
            }
        });
    } catch (error) {
        console.error("GET WEEK INTERVENTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du planning de la semaine"
        });
    }
};

////// GET INTERVENTION BY ID //////
export const getInterventionById = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId },
            include: {
                client: true,
                technician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                        phone: true,
                        email: true,
                    }
                },
                interventionType: true,
                equipment: true,
                photos: true,
                services: {
                    include: {
                        serviceType: true
                    }
                },
                invoice: {
                    select: {
                        id: true,
                        number: true,
                        status: true,
                        amountTTC: true,
                    }
                },
                quote: {
                    select: {
                        id: true,
                        number: true,
                        status: true,
                        amountTTC: true,
                    }
                }
            }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        // Company validation is already guaranteed by where: { id, companyId }

        return res.status(200).json({
            success: true,
            data: { intervention }
        });
    } catch (error) {
        console.error("GET INTERVENTION BY ID ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'intervention"
        });
    }
};

////// CREATE INTERVENTION //////
export const createIntervention = async (req, res) => {
    const companyId = req.user.companyId;
    const createdById = req.user.id;

    const {
        clientId,
        equipmentId,
        technicianId,
        title,
        description,
        address,
        city,
        scheduledAt,
        estimatedDuration,
        accessCode,
        type,
        serviceType,
        serviceIds,
        autoReminder
    } = req.body;

    if (!clientId || !title || !address) {
        return res.status(400).json({
            success: false,
            message: "Veuillez indiquer le client, le titre et l'adresse de l'intervention"
        });
    }

    try {
        let interventionTypeId = undefined;
        if (serviceType || type) {
            const typeName = (serviceType || type).trim();
            const typeItem = await prisma.interventionTypeItem.upsert({
                where: { companyId_name: { companyId, name: typeName } },
                update: {},
                create: { companyId, name: typeName, isDefault: false }
            });
            interventionTypeId = typeItem.id;
        }

        const newIntervention = await prisma.intervention.create({
            data: {
                companyId,
                clientId,
                createdById,
                equipmentId: equipmentId || null,
                technicianId: technicianId || null,
                interventionTypeId: interventionTypeId || null,
                title: title.trim(),
                description: description || null,
                address: address.trim(),
                city: city ? city.trim() : null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : 60,
                accessCode: accessCode || null,
                status: scheduledAt ? "SCHEDULED" : "PENDING",
                ...(Array.isArray(serviceIds) && serviceIds.length > 0 && {
                    services: {
                        create: serviceIds.map(sId => ({ serviceTypeId: sId }))
                    }
                })
            },
            include: {
                client: { select: { firstName: true, lastName: true, companyName: true } },
                technician: { select: { id: true, firstName: true, lastName: true } },
                interventionType: { select: { id: true, name: true } },
                services: { include: { serviceType: true } }
            }
        });

        // Si une configuration de rappel automatique est fournie à la création
        if (autoReminder && typeof autoReminder === "object") {
            try {
                await ReminderEngineService.setupReminderAutomation({
                    companyId,
                    clientId,
                    serviceTypeId: autoReminder.serviceTypeId || (serviceIds && serviceIds[0]) || null,
                    name: autoReminder.name || `Rappel ${title}`,
                    automationType: autoReminder.automationType || "PERIODIC",
                    frequencyValue: autoReminder.frequencyValue || 12,
                    frequencyUnit: autoReminder.frequencyUnit || "MONTHS",
                    advanceNoticeValue: autoReminder.advanceNoticeValue || 30,
                    advanceNoticeUnit: autoReminder.advanceNoticeUnit || "DAYS",
                    channel: autoReminder.channel || "LAST_USED",
                    fallbackChannel: autoReminder.fallbackChannel || "SMS",
                    customMessageTemplate: autoReminder.customMessageTemplate || null,
                    initialBaseDate: scheduledAt ? new Date(scheduledAt) : new Date()
                });
            } catch (autoErr) {
                console.warn("[CREATE_INTERVENTION_AUTO_REMINDER_WARN]:", autoErr.message);
            }
        }

        // Arrêter automatiquement les relances actives si le client prend rendez-vous (RDV planifié)
        if (clientId && (scheduledAt || newIntervention.status === "SCHEDULED")) {
            try {
                await ReminderEngineService.handleAppointmentCreated({
                    clientId,
                    companyId
                });
            } catch (appErr) {
                console.warn("[HANDLE_APPOINTMENT_CREATED_WARN]:", appErr.message);
            }
        }

        // Déclenchement de la notification si un technicien a été assigné
        if (technicianId) {
            await createNotification({
                companyId,
                userId: technicianId,
                type: "INTERVENTION_ASSIGNED",
                title: "Nouvelle intervention assignée",
                body: `Une nouvelle intervention "${title}" vous a été assignée.`,
                entityId: newIntervention.id,
            });
        }

        return res.status(201).json({
            success: true,
            message: "Intervention créée avec succès",
            data: { intervention: newIntervention }
        });
    } catch (error) {
        console.error("CREATE INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de l'intervention"
        });
    }
};

////// UPDATE INTERVENTION //////
export const updateIntervention = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const existingIntervention = await prisma.intervention.findFirst({
            where: { id, companyId }
        });

        if (!existingIntervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        const {
            clientId,
            technicianId,
            scheduledAt,
            estimatedDuration,
            status,
            title,
            description,
            techNotes,
            address,
            city,
            type,
            serviceType
        } = req.body;

        let interventionTypeId = undefined;
        if (serviceType || type) {
            const typeName = (serviceType || type).trim();
            const typeItem = await prisma.interventionTypeItem.upsert({
                where: { companyId_name: { companyId, name: typeName } },
                update: {},
                create: { companyId, name: typeName, isDefault: false }
            });
            interventionTypeId = typeItem.id;
        }

        const updateData = {};
        if (clientId !== undefined) updateData.clientId = clientId;
        if (interventionTypeId !== undefined) updateData.interventionTypeId = interventionTypeId;
        if (technicianId !== undefined) updateData.technicianId = technicianId || null;
        if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
        if (estimatedDuration !== undefined) updateData.estimatedDuration = parseInt(estimatedDuration);
        if (status !== undefined) updateData.status = status;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (techNotes !== undefined) updateData.techNotes = techNotes;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;

        const updatedIntervention = await prisma.intervention.update({
            where: { id },
            data: updateData,
            include: {
                client: { select: { firstName: true, lastName: true, companyName: true, phone: true, city: true, address: true } },
                technician: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                interventionType: { select: { id: true, name: true } },
                equipment: { select: { id: true, brand: true, model: true } }
            }
        });

        // Notifications conditionnelles
        if (technicianId && technicianId !== existingIntervention.technicianId) {
            await createNotification({
                companyId,
                userId: technicianId,
                type: "INTERVENTION_ASSIGNED",
                title: "Intervention assignée",
                body: `Vous avez été assigné(e) à l'intervention "${updatedIntervention.title}".`,
                entityId: id,
            });
        } else if (scheduledAt && new Date(scheduledAt).getTime() !== new Date(existingIntervention.scheduledAt).getTime()) {
            if (updatedIntervention.technicianId) {
                await createNotification({
                    companyId,
                    userId: updatedIntervention.technicianId,
                    type: "INTERVENTION_UPDATED",
                    title: "Horaire d'intervention modifié",
                    body: `L'horaire de l'intervention "${updatedIntervention.title}" a été mis à jour.`,
                    entityId: id,
                });
            }
        }

        if (status === "CANCELLED" && updatedIntervention.technicianId) {
            await createNotification({
                companyId,
                userId: updatedIntervention.technicianId,
                type: "INTERVENTION_CANCELLED",
                title: "Intervention annulée",
                body: `L'intervention "${updatedIntervention.title}" a été annulée.`,
                entityId: id,
            });
        }

        // Arrêter automatiquement les relances actives si l'intervention est planifiée
        if (updatedIntervention.clientId && (scheduledAt || updatedIntervention.status === "SCHEDULED")) {
            try {
                await ReminderEngineService.handleAppointmentCreated({
                    clientId: updatedIntervention.clientId,
                    companyId
                });
            } catch (appErr) {
                console.warn("[HANDLE_APPOINTMENT_UPDATED_WARN]:", appErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Intervention mise à jour avec succès",
            data: { intervention: updatedIntervention }
        });
    } catch (error) {
        console.error("UPDATE INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de l'intervention"
        });
    }
};

////// ARRIVE INTERVENTION (ARRIVED) //////
export const arriveIntervention = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId },
            include: { client: true, technician: true }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        const now = new Date();
        const updated = await prisma.intervention.update({
            where: { id },
            data: {
                status: "ARRIVED",
                arrivedAt: now
            },
            include: {
                client: true,
                technician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    }
                },
                photos: true,
                services: { include: { serviceType: true } }
            }
        });

        // Émission temps réel à l'entreprise
        emitToCompany(companyId, "intervention:updated", updated);

        // Notification au propriétaire/managers
        const owner = await prisma.user.findFirst({
            where: { companyId, role: "OWNER" }
        });

        if (owner) {
            const techName = intervention.technician
                ? `${intervention.technician.firstName || ''} ${intervention.technician.lastName || ''}`.trim()
                : "Le technicien";
            const clientName = intervention.client
                ? `${intervention.client.firstName || ''} ${intervention.client.lastName || ''}`.trim() || intervention.client.companyName
                : "";

            await createNotification({
                companyId,
                userId: owner.id,
                type: "TECHNICIAN_ARRIVED",
                title: "Technicien arrivé sur place 📍",
                body: `${techName} est arrivé chez ${clientName || 'le client'} (${intervention.title}).`,
                entityId: id,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Statut mis à jour : Arrivé sur place",
            data: { intervention: updated }
        });
    } catch (error) {
        console.error("ARRIVE INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du marquage d'arrivée"
        });
    }
};

////// START INTERVENTION (IN_PROGRESS) //////
export const startIntervention = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId },
            include: { client: true, technician: true }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        const updated = await prisma.intervention.update({
            where: { id },
            data: {
                status: "IN_PROGRESS",
                startedAt: new Date()
            },
            include: {
                client: true,
                technician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    }
                },
                photos: true,
                services: { include: { serviceType: true } }
            }
        });

        // Émission temps réel à l'entreprise
        emitToCompany(companyId, "intervention:updated", updated);

        // Notification au propriétaire/managers de l'entreprise
        const owner = await prisma.user.findFirst({
            where: { companyId, role: "OWNER" }
        });

        if (owner) {
            const techName = intervention.technician
                ? `${intervention.technician.firstName || ''} ${intervention.technician.lastName || ''}`.trim()
                : "Le technicien";

            await createNotification({
                companyId,
                userId: owner.id,
                type: "TECHNICIAN_STARTED",
                title: "Intervention en cours ⚡",
                body: `${techName} a commencé l'intervention "${intervention.title}".`,
                entityId: id,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Intervention démarrée avec succès",
            data: { intervention: updated }
        });
    } catch (error) {
        console.error("START INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du démarrage de l'intervention"
        });
    }
};

////// COMPLETE INTERVENTION & AUTO UPDATE EQUIPMENT MAINTENANCE //////
export const completeIntervention = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const {
        techNotes,
        clientSignature,
        materialsUsed,
        serviceIds,
        manualReminderUpdates,
        newReminderConfig
    } = req.body;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId },
            include: { client: true, services: true }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        const now = new Date();

        // Transaction globale : clôture intervention + services + maintenance équipement + moteur Auto Rappel
        const result = await prisma.$transaction(async (tx) => {
            const completed = await tx.intervention.update({
                where: { id },
                data: {
                    status: "COMPLETED",
                    completedAt: now,
                    techNotes: techNotes || undefined,
                    clientSignature: clientSignature || undefined,
                    clientSignedAt: clientSignature ? now : undefined,
                    materialsUsed: materialsUsed || undefined,
                }
            });

            // Si des services sont sélectionnés, les lier à l'intervention
            if (Array.isArray(serviceIds) && serviceIds.length > 0) {
                for (const sId of serviceIds) {
                    await tx.interventionService.upsert({
                        where: {
                            interventionId_serviceTypeId: {
                                interventionId: id,
                                serviceTypeId: sId
                            }
                        },
                        update: {},
                        create: {
                            interventionId: id,
                            serviceTypeId: sId
                        }
                    });
                }
            }

            // Si un équipement est associé, on met à jour lastServiceDate et recalcul de nextServiceDate
            if (intervention.equipmentId) {
                const eq = await tx.equipment.findUnique({
                    where: { id: intervention.equipmentId }
                });

                if (eq) {
                    const interval = eq.serviceInterval || 12;
                    const nextDate = new Date(now);
                    nextDate.setMonth(nextDate.getMonth() + interval);

                    await tx.equipment.update({
                        where: { id: intervention.equipmentId },
                        data: {
                            lastServiceDate: now,
                            nextServiceDate: nextDate,
                        }
                    });
                }
            }

            // Mise à jour des cycles de rappel indépendants via le ReminderEngineService
            const reminderResult = await ReminderEngineService.handleInterventionCompleted({
                interventionId: id,
                companyId,
                serviceIds: serviceIds || [],
                manualReminderUpdates,
                tx
            });

            // Si l'utilisateur a configuré un nouveau rappel automatique lors de la clôture
            if (newReminderConfig && typeof newReminderConfig === "object" && newReminderConfig.enabled) {
                const targetServiceId = newReminderConfig.serviceTypeId || (serviceIds && serviceIds[0]) || null;
                const nextDate = ReminderEngineService.calculateNextDate(
                    now,
                    newReminderConfig.frequencyValue || 12,
                    newReminderConfig.frequencyUnit || "MONTHS",
                    newReminderConfig.advanceNoticeValue || 30,
                    newReminderConfig.advanceNoticeUnit || "DAYS"
                );

                const newAuto = await tx.reminderAutomation.create({
                    data: {
                        companyId,
                        clientId: intervention.clientId,
                        name: newReminderConfig.name || "Rappel Entretien",
                        automationType: newReminderConfig.automationType || "PERIODIC",
                        enabled: true,
                        frequencyValue: parseInt(newReminderConfig.frequencyValue, 10) || 12,
                        frequencyUnit: newReminderConfig.frequencyUnit || "MONTHS",
                        advanceNoticeValue: parseInt(newReminderConfig.advanceNoticeValue, 10) || 30,
                        advanceNoticeUnit: newReminderConfig.advanceNoticeUnit || "DAYS",
                        channel: newReminderConfig.channel || "LAST_USED",
                        fallbackChannel: newReminderConfig.fallbackChannel || "SMS",
                        customMessageTemplate: newReminderConfig.customMessageTemplate || null,
                        stopOnReply: newReminderConfig.stopOnReply !== false,
                        stopOnAppointment: newReminderConfig.stopOnAppointment !== false,
                        maxFollowUps: parseInt(newReminderConfig.maxFollowUps, 10) || 2,
                        followUpIntervalDays: parseInt(newReminderConfig.followUpIntervalDays, 10) || 7,
                        status: "SCHEDULED",
                        nextReminderAt: nextDate,
                        lastCompletedInterventionId: id,
                        lastCompletedAt: now,
                        ...(targetServiceId && {
                            trackedServices: {
                                create: [{ serviceTypeId: targetServiceId }]
                            }
                        })
                    }
                });

                await tx.reminderExecution.create({
                    data: {
                        companyId,
                        reminderAutomationId: newAuto.id,
                        clientId: intervention.clientId,
                        interventionId: id,
                        sequenceStep: 1,
                        scheduledAt: nextDate,
                        status: "SCHEDULED"
                    }
                });
            }

            return { completed, reminderResult };
        });

        // Notification au propriétaire/managers
        const owner = await prisma.user.findFirst({
            where: { companyId, role: "OWNER" }
        });

        if (owner) {
            await createNotification({
                companyId,
                userId: owner.id,
                type: "INTERVENTION_COMPLETED",
                title: "Intervention terminée",
                body: `L'intervention "${intervention.title}" a été marquée comme terminée.`,
                entityId: id,
            });
        }

        const fullUpdated = await prisma.intervention.findUnique({
            where: { id },
            include: {
                client: true,
                technician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    }
                },
                photos: true,
                services: { include: { serviceType: true } },
                equipment: true
            }
        });

        // Émission temps réel à l'entreprise
        emitToCompany(companyId, "intervention:updated", fullUpdated);

        return res.status(200).json({
            success: true,
            message: "Intervention terminée avec succès. Cycles de rappel mis à jour indépendamment.",
            data: {
                intervention: fullUpdated,
                reminders: result.reminderResult
            }
        });
    } catch (error) {
        console.error("COMPLETE INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de la clôture de l'intervention"
        });
    }
};

////// DELETE INTERVENTION //////
export const deleteIntervention = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId },
            include: { photos: true }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        // Unlink quotes & invoices first to allow complete cascade deletion
        try {
            await prisma.quote.updateMany({
                where: { interventionId: id },
                data: { interventionId: null }
            });
            await prisma.invoice.updateMany({
                where: { interventionId: id },
                data: { interventionId: null }
            });
        } catch (unlinkErr) {
            console.warn("[UNLINK_INTERVENTION_WARN]", unlinkErr.message);
        }

        // Delete photos if any
        if (intervention.photos && intervention.photos.length > 0) {
            await prisma.interventionPhoto.deleteMany({
                where: { interventionId: id }
            });
        }

        try {
            await prisma.intervention.delete({
                where: { id }
            });
        } catch (delErr) {
            // If still constrained, fallback to setting status CANCELLED
            await prisma.intervention.update({
                where: { id },
                data: { status: "CANCELLED" }
            });
        }

        if (intervention.technicianId) {
            createNotification({
                companyId,
                userId: intervention.technicianId,
                type: "INTERVENTION_CANCELLED",
                title: "Intervention supprimée",
                body: `L'intervention "${intervention.title}" a été supprimée.`,
                entityId: id,
            }).catch(() => {});
        }

        return res.status(200).json({
            success: true,
            message: "Intervention supprimée avec succès"
        });
    } catch (error) {
        console.error("DELETE INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de l'intervention"
        });
    }
};

////// BATCH DELETE INTERVENTIONS //////
export const batchDeleteInterventions = async (req, res) => {
    const { ids } = req.body;
    const companyId = req.user.companyId;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Aucun identifiant d'intervention fourni"
        });
    }

    try {
        const interventions = await prisma.intervention.findMany({
            where: { id: { in: ids }, companyId },
            select: { id: true, title: true, technicianId: true }
        });

        const foundIds = interventions.map(i => i.id);
        if (foundIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Aucune intervention correspondante trouvée"
            });
        }

        // Unlink quotes and invoices
        try {
            await prisma.quote.updateMany({
                where: { interventionId: { in: foundIds } },
                data: { interventionId: null }
            });
            await prisma.invoice.updateMany({
                where: { interventionId: { in: foundIds } },
                data: { interventionId: null }
            });
        } catch (unlinkErr) {
            console.warn("[UNLINK_BATCH_INTERVENTIONS_WARN]", unlinkErr.message);
        }

        // Delete photos
        await prisma.interventionPhoto.deleteMany({
            where: { interventionId: { in: foundIds } }
        });

        // Delete interventions
        let deletedCount = 0;
        try {
            const delRes = await prisma.intervention.deleteMany({
                where: { id: { in: foundIds }, companyId }
            });
            deletedCount = delRes.count;
        } catch (delManyErr) {
            // Fallback: delete one by one or cancel if constraint blocks
            for (const item of interventions) {
                try {
                    await prisma.intervention.delete({ where: { id: item.id } });
                    deletedCount++;
                } catch {
                    await prisma.intervention.update({
                        where: { id: item.id },
                        data: { status: "CANCELLED" }
                    });
                }
            }
        }

        // Notify assigned technicians
        for (const item of interventions) {
            if (item.technicianId) {
                createNotification({
                    companyId,
                    userId: item.technicianId,
                    type: "INTERVENTION_CANCELLED",
                    title: "Intervention supprimée",
                    body: `L'intervention "${item.title}" a été supprimée.`,
                    entityId: item.id,
                }).catch(() => {});
            }
        }

        return res.status(200).json({
            success: true,
            deletedCount,
            message: `${deletedCount} intervention(s) supprimée(s) avec succès`
        });
    } catch (error) {
        console.error("BATCH DELETE INTERVENTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de la suppression groupée"
        });
    }
};

////// UPLOAD INTERVENTION PHOTOS //////
export const uploadInterventionPhotos = async (req, res) => {
    const { id } = req.params;
    const { type = "after", photoUrl, photoUrls } = req.body;

    const urls = req.files ? req.files.map(f => f.path) : (photoUrls || (photoUrl ? [photoUrl] : []));

    if (urls.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Veuillez fournir au moins une photo"
        });
    }

    try {
        const photos = await prisma.$transaction(
            urls.map(url =>
                prisma.interventionPhoto.create({
                    data: {
                        interventionId: id,
                        url,
                        type,
                    }
                })
            )
        );

        return res.status(201).json({
            success: true,
            message: "Photos ajoutées avec succès",
            data: { photos }
        });
    } catch (error) {
        console.error("UPLOAD PHOTOS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du téléchargement des photos"
        });
    }
};

////// DELETE INTERVENTION PHOTO //////
export const deleteInterventionPhoto = async (req, res) => {
    const { photoId } = req.params;

    try {
        await prisma.interventionPhoto.delete({
            where: { id: photoId }
        });

        return res.status(200).json({
            success: true,
            message: "Photo supprimée avec succès"
        });
    } catch (error) {
        console.error("DELETE PHOTO ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de la photo"
        });
    }
};
