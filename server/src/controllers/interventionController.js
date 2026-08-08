import { prisma } from "../config/db.js";

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

    const { status, type, technicianId, clientId, from, to } = req.query;

    // Règle de rôle: le technicien ne voit que SES propres interventions assignées
    const effectiveTechnicianId = req.user.role === "TECHNICIAN"
        ? req.user.id
        : (technicianId || undefined);

    const where = {
        companyId,
        ...(status && { status }),
        ...(technicianId && { technicianId: effectiveTechnicianId }),
        ...(req.user.role === "TECHNICIAN" && { technicianId: req.user.id }),
        ...(clientId && { clientId }),
        ...((from || to) && {
            scheduledAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
            }
        })
    };

    try {
        const [total, interventions] = await Promise.all([
            prisma.intervention.count({ where }),
            prisma.intervention.findMany({
                where,
                skip,
                take: limit,
                orderBy: { scheduledAt: "desc" },
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
                    equipment: {
                        select: {
                            id: true,
                            brand: true,
                            model: true,
                        }
                    },
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
                        email: true,
                        phone: true,
                        avatarUrl: true
                    }
                },
                equipment: true,
                photos: true,
                invoice: true,
                quote: true
            }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        // Sécurité pour les techniciens
        if (req.user.role === "TECHNICIAN" && intervention.technicianId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Vous n'avez pas accès à cette intervention"
            });
        }

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
        accessCode
    } = req.body;

    if (!clientId || !title || !address) {
        return res.status(400).json({
            success: false,
            message: "Veuillez indiquer le client, le titre et l'adresse de l'intervention"
        });
    }

    try {
        const newIntervention = await prisma.intervention.create({
            data: {
                companyId,
                clientId,
                createdById,
                equipmentId: equipmentId || null,
                technicianId: technicianId || null,
                title: title.trim(),
                description: description || null,
                address: address.trim(),
                city: city ? city.trim() : null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : 60,
                accessCode: accessCode || null,
                status: scheduledAt ? "SCHEDULED" : "PENDING",
            },
            include: {
                client: { select: { firstName: true, lastName: true } },
                technician: { select: { id: true, firstName: true } }
            }
        });

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

        const { technicianId, scheduledAt, status, title, description, techNotes } = req.body;

        const updatedIntervention = await prisma.intervention.update({
            where: { id },
            data: {
                ...(technicianId !== undefined && { technicianId }),
                ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
                ...(status !== undefined && { status }),
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(techNotes !== undefined && { techNotes }),
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

////// START INTERVENTION (IN_PROGRESS) //////
export const startIntervention = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId }
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
            }
        });

        // Notification au propriétaire/managers de l'entreprise
        const owner = await prisma.user.findFirst({
            where: { companyId, role: "OWNER" }
        });

        if (owner) {
            await createNotification({
                companyId,
                userId: owner.id,
                type: "TECHNICIAN_STARTED",
                title: "Intervention démarrée",
                body: `Le technicien a démarré l'intervention "${intervention.title}".`,
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
    const { techNotes, clientSignature, materialsUsed } = req.body;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        const now = new Date();

        // Transaction pour terminer l'intervention et mettre à jour le ТО de l'équipement
        const updatedIntervention = await prisma.$transaction(async (tx) => {
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

            return completed;
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

        return res.status(200).json({
            success: true,
            message: "Intervention terminée avec succès. Maintenance équipement mise à jour.",
            data: { intervention: updatedIntervention }
        });
    } catch (error) {
        console.error("COMPLETE INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la clôture de l'intervention"
        });
    }
};

////// DELETE INTERVENTION (SOFT DELETE / CANCEL) //////
export const deleteIntervention = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const intervention = await prisma.intervention.findFirst({
            where: { id, companyId }
        });

        if (!intervention) {
            return res.status(404).json({
                success: false,
                message: "Intervention introuvable"
            });
        }

        await prisma.intervention.update({
            where: { id },
            data: { status: "CANCELLED" }
        });

        if (intervention.technicianId) {
            await createNotification({
                companyId,
                userId: intervention.technicianId,
                type: "INTERVENTION_CANCELLED",
                title: "Intervention annulée",
                body: `L'intervention "${intervention.title}" a été annulée.`,
                entityId: id,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Intervention annulée avec succès"
        });
    } catch (error) {
        console.error("DELETE INTERVENTION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'annulation de l'intervention"
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
