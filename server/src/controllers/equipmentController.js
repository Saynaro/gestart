import { prisma } from "../config/db.js";

// Helper pour calculer la prochaine date d'entretien (prochain ТО)
const calculateNextServiceDate = (lastServiceDate, installDate, serviceInterval = 12) => {
    const baseDate = lastServiceDate
        ? new Date(lastServiceDate)
        : (installDate ? new Date(installDate) : new Date());

    const nextDate = new Date(baseDate);
    nextDate.setMonth(nextDate.getMonth() + parseInt(serviceInterval));
    return nextDate;
};

// Helper pour synchroniser automatiquement le statut santé du client (OK, WARNING, URGENT)
export const syncClientHealthStatus = async (clientId) => {
    try {
        const equipment = await prisma.equipment.findMany({
            where: { clientId, isActive: true }
        });

        if (equipment.length === 0) {
            await prisma.client.update({
                where: { id: clientId },
                data: { status: "OK" }
            });
            return;
        }

        const now = new Date();
        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 30);

        let newStatus = "OK";

        for (const eq of equipment) {
            if (eq.nextServiceDate) {
                const nextDate = new Date(eq.nextServiceDate);
                if (nextDate <= now) {
                    newStatus = "URGENT";
                    break;
                } else if (nextDate <= in30Days && newStatus !== "URGENT") {
                    newStatus = "WARNING";
                }
            }
        }

        await prisma.client.update({
            where: { id: clientId },
            data: { status: newStatus }
        });
    } catch (error) {
        console.error("SYNC CLIENT HEALTH ERROR:", error.message);
    }
};

////// GET ALL EQUIPMENT WITH FILTERS //////
export const getEquipment = async (req, res) => {
    const companyId = req.user.companyId;
    const { clientId, tradeSlug, category, needsService, search } = req.query;

    const where = {
        isActive: true,
        client: {
            companyId,
            isActive: true
        },
        ...(clientId && { clientId }),
        ...((tradeSlug || category) && { tradeSlug: tradeSlug || category }),
        ...(needsService === "true" && {
            nextServiceDate: { lte: new Date() }
        }),
        ...(search && {
            OR: [
                { brand: { contains: search, mode: "insensitive" } },
                { model: { contains: search, mode: "insensitive" } },
                { serialNumber: { contains: search, mode: "insensitive" } },
                { location: { contains: search, mode: "insensitive" } },
            ]
        })
    };

    try {
        const equipment = await prisma.equipment.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        phone: true,
                        address: true,
                        city: true,
                    }
                }
            },
            orderBy: { nextServiceDate: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: { equipment }
        });
    } catch (error) {
        console.error("GET EQUIPMENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des équipements"
        });
    }
};

////// GET EQUIPMENT DUE FOR SERVICE SOON //////
export const getDueSoonEquipment = async (req, res) => {
    const companyId = req.user.companyId;
    const days = parseInt(req.query.days) || 30;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    try {
        const equipment = await prisma.equipment.findMany({
            where: {
                isActive: true,
                client: {
                    companyId,
                    isActive: true
                },
                nextServiceDate: {
                    lte: targetDate
                }
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        phone: true,
                        email: true,
                        city: true,
                        status: true
                    }
                }
            },
            orderBy: { nextServiceDate: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: { equipment }
        });
    } catch (error) {
        console.error("GET DUE SOON EQUIPMENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des équipements à entretenir"
        });
    }
};

////// GET EQUIPMENT BY ID //////
export const getEquipmentById = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const equipment = await prisma.equipment.findFirst({
            where: {
                id,
                isActive: true,
                client: { companyId }
            },
            include: {
                client: true,
                interventions: {
                    take: 10,
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!equipment) {
            return res.status(404).json({
                success: false,
                message: "Équipement introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: { equipment }
        });
    } catch (error) {
        console.error("GET EQUIPMENT BY ID ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la fiche équipement"
        });
    }
};

////// CREATE EQUIPMENT (AUTO-CALCULATE NEXT SERVICE DATE) //////
export const createEquipment = async (req, res) => {
    const companyId = req.user.companyId;
    const {
        clientId,
        brand,
        model,
        serialNumber,
        power,
        location,
        tradeType,
        tradeSlug,
        category,
        installDate,
        warrantyExpiry,
        lastServiceDate,
        serviceInterval = 12,
        notes
    } = req.body;

    if (!clientId || !brand) {
        return res.status(400).json({
            success: false,
            message: "Veuillez fournir le client (clientId) et la marque de l'équipement"
        });
    }

    try {
        // Vérification que le client appartient à la même société
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId, isActive: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client introuvable dans votre société"
            });
        }

        const parsedInstallDate = installDate ? new Date(installDate) : null;
        const parsedLastService = lastServiceDate ? new Date(lastServiceDate) : null;

        // Calcul automatique de la prochaine date d'entretien
        const nextServiceDate = calculateNextServiceDate(parsedLastService, parsedInstallDate, serviceInterval);

        const newEquipment = await prisma.equipment.create({
            data: {
                clientId,
                brand: brand.trim(),
                model: model ? model.trim() : null,
                serialNumber: serialNumber ? serialNumber.trim() : null,
                power: power ? power.trim() : null,
                location: location ? location.trim() : null,
                tradeSlug: tradeSlug || category || tradeType || null,
                installDate: parsedInstallDate,
                warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
                lastServiceDate: parsedLastService,
                nextServiceDate,
                serviceInterval: parseInt(serviceInterval),
                notes: notes || null,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            }
        });

        await syncClientHealthStatus(clientId);

        return res.status(201).json({
            success: true,
            message: "Équipement ajouté avec succès",
            data: { equipment: newEquipment }
        });
    } catch (error) {
        console.error("CREATE EQUIPMENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de l'équipement"
        });
    }
};

////// UPDATE EQUIPMENT (RECALCULATE NEXT SERVICE DATE IF DATES CHANGE) //////
export const updateEquipment = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const existingEquipment = await prisma.equipment.findFirst({
            where: { id, isActive: true, client: { companyId } }
        });

        if (!existingEquipment) {
            return res.status(404).json({
                success: false,
                message: "Équipement introuvable"
            });
        }

        const {
            lastServiceDate,
            installDate,
            serviceInterval,
            tradeType,
            category,
            tradeSlug,
            ...otherData
        } = req.body;

        const updatedLastService = lastServiceDate !== undefined
            ? (lastServiceDate ? new Date(lastServiceDate) : null)
            : existingEquipment.lastServiceDate;

        const updatedInstallDate = installDate !== undefined
            ? (installDate ? new Date(installDate) : null)
            : existingEquipment.installDate;

        const updatedInterval = serviceInterval !== undefined
            ? parseInt(serviceInterval)
            : existingEquipment.serviceInterval;

        // Recalcul de nextServiceDate si les dates ou l'intervalle d'entretien ont changé
        let nextServiceDate = existingEquipment.nextServiceDate;
        if (lastServiceDate !== undefined || installDate !== undefined || serviceInterval !== undefined) {
            nextServiceDate = calculateNextServiceDate(updatedLastService, updatedInstallDate, updatedInterval);
        }

        const updatedEquipment = await prisma.equipment.update({
            where: { id },
            data: {
                ...otherData,
                ...(tradeSlug || category || tradeType ? { tradeSlug: tradeSlug || category || tradeType } : {}),
                lastServiceDate: updatedLastService,
                installDate: updatedInstallDate,
                serviceInterval: updatedInterval,
                nextServiceDate,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        await syncClientHealthStatus(existingEquipment.clientId);

        return res.status(200).json({
            success: true,
            message: "Équipement mis à jour avec succès",
            data: { equipment: updatedEquipment }
        });
    } catch (error) {
        console.error("UPDATE EQUIPMENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de l'équipement"
        });
    }
};

////// DELETE EQUIPMENT (SOFT DELETE) //////
export const deleteEquipment = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const equipment = await prisma.equipment.findFirst({
            where: { id, isActive: true, client: { companyId } }
        });

        if (!equipment) {
            return res.status(404).json({
                success: false,
                message: "Équipement introuvable"
            });
        }

        await prisma.equipment.update({
            where: { id },
            data: { isActive: false }
        });

        return res.status(200).json({
            success: true,
            message: "Équipement supprimé avec succès"
        });
    } catch (error) {
        console.error("DELETE EQUIPMENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de l'équipement"
        });
    }
};
