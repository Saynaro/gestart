import { prisma } from "../config/db.js";
import { dispatchNotification } from "../services/notificationService.js";

////// GET PAGINATED CLIENTS //////
export const getClients = async (req, res) => {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { search, status, city } = req.query;

    const where = {
        companyId,
        isActive: true,
        ...(status && { status }),
        ...(city && { city: { contains: city, mode: "insensitive" } }),
        ...(search && {
            OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { companyName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
            ]
        })
    };

    try {
        const [total, clients] = await Promise.all([
            prisma.client.count({ where }),
            prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    equipment: true,
                    interventions: {
                        include: {
                            technician: {
                                select: { id: true, firstName: true, lastName: true, email: true }
                            },
                            photos: true,
                            services: {
                                include: { serviceType: true }
                            }
                        },
                        orderBy: { scheduledAt: "desc" }
                    },
                    reminderAutomations: {
                        include: {
                            trackedServices: { include: { serviceType: true } },
                            executions: {
                                orderBy: { scheduledAt: "desc" },
                                take: 3
                            }
                        },
                        orderBy: { nextReminderAt: "asc" }
                    },
                    invoices: {
                        select: {
                            id: true,
                            number: true,
                            issuedAt: true,
                            createdAt: true,
                            amountTTC: true,
                            amountHT: true,
                            status: true
                        },
                        orderBy: { createdAt: "desc" },
                        take: 20
                    },
                    quotes: {
                        select: {
                            id: true,
                            number: true,
                            issuedAt: true,
                            createdAt: true,
                            amountTTC: true,
                            amountHT: true,
                            status: true
                        },
                        orderBy: { createdAt: "desc" },
                        take: 20
                    },
                    smsLogs: {
                        orderBy: { createdAt: "desc" },
                        take: 15
                    },
                    _count: {
                        select: {
                            equipment: true,
                            interventions: true,
                            invoices: true,
                            quotes: true,
                            smsLogs: true
                        }
                    }
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                clients,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error("GET CLIENTS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des clients"
        });
    }
};

////// EXPORT CLIENTS (CSV / EXCEL) //////
export const exportClients = async (req, res) => {
    const companyId = req.user.companyId;
    const { format = "csv" } = req.query;

    try {
        const clients = await prisma.client.findMany({
            where: { companyId, isActive: true },
            orderBy: { lastName: "asc" }
        });

        if (format.toLowerCase() === "csv") {
            const header = "ID,Prénom,Nom,Société,Téléphone,Email,Adresse,Code Postal,Ville,Statut\n";
            const rows = clients.map(c =>
                `"${c.id}","${c.firstName}","${c.lastName}","${c.companyName || ''}","${c.phone}","${c.email || ''}","${c.address}","${c.postalCode || ''}","${c.city || ''}","${c.status}"`
            ).join("\n");

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="clients.csv"');
            return res.status(200).send(header + rows);
        }

        return res.status(200).json({
            success: true,
            data: { clients }
        });
    } catch (error) {
        console.error("EXPORT CLIENTS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'export des clients"
        });
    }
};

////// GET URGENT & WARNING CLIENTS //////
export const getUrgentClients = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const clients = await prisma.client.findMany({
            where: {
                companyId,
                isActive: true,
                status: { in: ["URGENT", "WARNING"] }
            },
            include: {
                equipment: true,
                interventions: {
                    take: 1,
                    orderBy: { createdAt: "desc" }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        return res.status(200).json({
            success: true,
            data: { clients }
        });
    } catch (error) {
        console.error("GET URGENT CLIENTS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des clients urgents"
        });
    }
};

////// GET CLIENT DETAILS BY ID //////
export const getClientById = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const client = await prisma.client.findFirst({
            where: { id, companyId, isActive: true },
            include: {
                equipment: true,
                interventions: {
                    include: {
                        technician: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        },
                        photos: true,
                        services: {
                            include: { serviceType: true }
                        }
                    },
                    orderBy: { scheduledAt: "desc" }
                },
                reminderAutomations: {
                    include: {
                        trackedServices: { include: { serviceType: true } },
                        executions: {
                            orderBy: { scheduledAt: "desc" },
                            take: 5
                        }
                    },
                    orderBy: { nextReminderAt: "asc" }
                },
                invoices: {
                    include: {
                        lines: { orderBy: { position: "asc" } },
                        client: true,
                        company: true
                    },
                    orderBy: { createdAt: "desc" }
                },
                quotes: {
                    include: {
                        lines: { orderBy: { position: "asc" } },
                        client: true,
                        company: true
                    },
                    orderBy: { createdAt: "desc" }
                },
                smsLogs: {
                    orderBy: { createdAt: "desc" }
                },
                _count: {
                    select: {
                        invoices: true,
                        quotes: true,
                        interventions: true,
                        smsLogs: true
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: { client }
        });
    } catch (error) {
        console.error("GET CLIENT BY ID ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la fiche client"
        });
    }
};

////// CREATE NEW CLIENT (CHECK PLAN LIMIT) //////
export const createClient = async (req, res) => {
    const companyId = req.user.companyId;
    const createdById = req.user.id;
    const {
        firstName,
        lastName,
        phone,
        email,
        address,
        city,
        postalCode,
        companyName,
        notes,
        source,
        preferredChannel
    } = req.body;

    if (!firstName || !lastName || !phone || !address) {
        return res.status(400).json({
            success: false,
            message: "Veuillez remplir les champs obligatoires (prénom, nom, téléphone, adresse)"
        });
    }

    try {
        // Vérification de la limite de clients du Plan
        const subscription = await prisma.subscription.findUnique({
            where: { companyId },
            include: { plan: true }
        });

        if (subscription?.plan) {
            const maxClients = subscription.plan.maxClients;

            if (maxClients !== -1) {
                const currentClientsCount = await prisma.client.count({
                    where: { companyId, isActive: true }
                });

                if (currentClientsCount >= maxClients) {
                    return res.status(403).json({
                        success: false,
                        message: `Limite de clients atteinte pour votre plan (${maxClients} max). Veuillez mettre à niveau votre abonnement.`,
                        code: "LIMIT_REACHED"
                    });
                }
            }
        }

        const newClient = await prisma.client.create({
            data: {
                companyId,
                createdById,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim(),
                email: email ? email.toLowerCase().trim() : null,
                address: address.trim(),
                city: city ? city.trim() : null,
                postalCode: postalCode ? postalCode.trim() : null,
                notes: notes || null,
                source: source || null,
                preferredChannel: preferredChannel || "SMS",
            }
        });

        const {
            equipmentModel,
            equipmentInstallDate,
            equipmentSerial
        } = req.body;

        if (equipmentModel || equipmentSerial || equipmentInstallDate) {
            let parsedDate = null;
            if (equipmentInstallDate) {
                const str = String(equipmentInstallDate).trim();
                if (str.includes("/")) {
                    const parts = str.split("/");
                    if (parts.length === 3) {
                        parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                    }
                } else if (str.includes(".")) {
                    const parts = str.split(".");
                    if (parts.length === 3) {
                        parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                    }
                } else if (str.includes("-")) {
                    const parts = str.split("-");
                    if (parts.length === 3) {
                        if (parts[0].length === 4) {
                            parsedDate = new Date(str);
                        } else {
                            parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                        }
                    }
                } else {
                    parsedDate = new Date(str);
                }
                if (parsedDate && isNaN(parsedDate.getTime())) parsedDate = null;
            }

            await prisma.equipment.create({
                data: {
                    clientId: newClient.id,
                    model: equipmentModel ? equipmentModel.trim() : "Climatisation",
                    brand: "Daikin",
                    serialNumber: equipmentSerial ? equipmentSerial.trim() : null,
                    installDate: parsedDate
                }
            });

            // Auto-créer le cycle de rappel basé sur la date d'installation réelle (ex: anciens clients)
            if (parsedDate) {
                try {
                    const { ReminderEngineService } = await import("../services/reminders/ReminderEngineService.js");
                    await ReminderEngineService.setupReminderAutomation({
                        companyId,
                        clientId: newClient.id,
                        initialBaseDate: parsedDate,
                        name: "Rappel Entretien Annuel",
                        frequencyValue: 24,
                        frequencyUnit: "MONTHS",
                        advanceNoticeValue: 30,
                        advanceNoticeUnit: "DAYS",
                        channel: "LAST_USED"
                    });
                } catch (autoErr) {
                    console.error("[AUTO_RAPPEL_INIT_ERROR]:", autoErr.message);
                }
            }
        }

        const freshClient = await prisma.client.findUnique({
            where: { id: newClient.id },
            include: {
                equipment: true,
                interventions: { include: { technician: true } },
                invoices: true,
                quotes: true,
                smsLogs: true
            }
        });

        // Notification centralisée d'ajout de client (si activée)
        try {
            const clientFullName = `${newClient.firstName} ${newClient.lastName}`.trim();
            await dispatchNotification({
                companyId,
                type: "NEW_CLIENT_ADDED",
                title: "Nouveau client ajouté",
                body: `${clientFullName} a été ajouté avec succès (${newClient.phone || newClient.email || 'Sans contact'}).`,
                entityType: "client",
                entityId: newClient.id,
                data: { clientId: newClient.id, clientName: clientFullName }
            });
        } catch (notifErr) {
            console.warn("[NOTIFICATION CLIENT] Warning non bloquant:", notifErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Client créé avec succès",
            data: { client: freshClient || newClient }
        });
    } catch (error) {
        console.error("CREATE CLIENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création du client"
        });
    }
};

////// UPDATE CLIENT //////
export const updateClient = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const client = await prisma.client.findFirst({
            where: { id, companyId, isActive: true },
            include: { equipment: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client introuvable"
            });
        }

        const {
            firstName,
            lastName,
            companyName,
            phone,
            email,
            address,
            city,
            postalCode,
            notes,
            status,
            source,
            preferredChannel,
            sirenNumber,
            clientTvaNumber,
            clientLegalForm,
            clientNafCode,
            hasDeliveryAddress,
            deliveryAddress,
            deliveryCity,
            deliveryPostalCode,
            equipmentModel,
            equipmentInstallDate,
            equipmentSerial
        } = req.body;

        const updateData = {};
        if (firstName !== undefined) updateData.firstName = firstName ? firstName.trim() : client.firstName;
        if (lastName !== undefined) updateData.lastName = lastName !== null && lastName !== undefined ? lastName.trim() : client.lastName;
        if (companyName !== undefined) updateData.companyName = companyName ? companyName.trim() : null;
        if (phone !== undefined) updateData.phone = phone ? phone.trim() : client.phone;
        if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
        if (address !== undefined) updateData.address = address ? address.trim() : client.address;
        if (city !== undefined) updateData.city = city ? city.trim() : null;
        if (postalCode !== undefined) updateData.postalCode = postalCode ? postalCode.trim() : null;
        if (notes !== undefined) updateData.notes = notes || null;
        if (status !== undefined) updateData.status = status;
        if (source !== undefined) updateData.source = source || null;
        if (preferredChannel !== undefined) updateData.preferredChannel = preferredChannel;
        if (sirenNumber !== undefined) updateData.sirenNumber = sirenNumber || null;
        if (clientTvaNumber !== undefined) updateData.clientTvaNumber = clientTvaNumber || null;
        if (clientLegalForm !== undefined) updateData.clientLegalForm = clientLegalForm || null;
        if (clientNafCode !== undefined) updateData.clientNafCode = clientNafCode || null;
        if (hasDeliveryAddress !== undefined) updateData.hasDeliveryAddress = Boolean(hasDeliveryAddress);
        if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress || null;
        if (deliveryCity !== undefined) updateData.deliveryCity = deliveryCity || null;
        if (deliveryPostalCode !== undefined) updateData.deliveryPostalCode = deliveryPostalCode || null;

        await prisma.client.update({
            where: { id },
            data: updateData
        });

        // Update or create equipment if provided
        if (equipmentModel || equipmentSerial || equipmentInstallDate) {
            let parsedDate = null;
            if (equipmentInstallDate) {
                const str = String(equipmentInstallDate).trim();
                if (str.includes("/")) {
                    const parts = str.split("/");
                    if (parts.length === 3) {
                        parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                    }
                } else if (str.includes(".")) {
                    const parts = str.split(".");
                    if (parts.length === 3) {
                        parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                    }
                } else if (str.includes("-")) {
                    const parts = str.split("-");
                    if (parts.length === 3) {
                        if (parts[0].length === 4) {
                            parsedDate = new Date(str);
                        } else {
                            parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                        }
                    }
                } else {
                    parsedDate = new Date(str);
                }
                if (parsedDate && isNaN(parsedDate.getTime())) parsedDate = null;
            }

            if (client.equipment && client.equipment.length > 0) {
                const eqId = client.equipment[0].id;
                await prisma.equipment.update({
                    where: { id: eqId },
                    data: {
                        ...(equipmentModel && { model: equipmentModel.trim() }),
                        ...(equipmentSerial !== undefined && { serialNumber: equipmentSerial ? equipmentSerial.trim() : null }),
                        ...(parsedDate && { installDate: parsedDate })
                    }
                });
            } else if (equipmentModel || equipmentSerial || parsedDate) {
                await prisma.equipment.create({
                    data: {
                        clientId: id,
                        model: equipmentModel ? equipmentModel.trim() : "Climatisation",
                        brand: "Daikin",
                        serialNumber: equipmentSerial ? equipmentSerial.trim() : null,
                        installDate: parsedDate
                    }
                });
            }

            // Recalculer le cycle de rappel basé sur la nouvelle date d'installation
            if (parsedDate) {
                try {
                    const { ReminderEngineService } = await import("../services/reminders/ReminderEngineService.js");
                    await ReminderEngineService.setupReminderAutomation({
                        companyId,
                        clientId: id,
                        initialBaseDate: parsedDate,
                        name: "Rappel Entretien Annuel",
                        frequencyValue: 24,
                        frequencyUnit: "MONTHS",
                        advanceNoticeValue: 30,
                        advanceNoticeUnit: "DAYS",
                        channel: "LAST_USED"
                    });
                } catch (autoErr) {
                    console.error("[AUTO_RAPPEL_UPDATE_ERROR]:", autoErr.message);
                }
            }
        }

        const freshUpdatedClient = await prisma.client.findUnique({
            where: { id },
            include: {
                equipment: true,
                interventions: { include: { technician: true } },
                invoices: true,
                quotes: true,
                smsLogs: true
            }
        });

        return res.status(200).json({
            success: true,
            message: "Fiche client mise à jour avec succès",
            data: { client: freshUpdatedClient }
        });
    } catch (error) {
        console.error("UPDATE CLIENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du client"
        });
    }
};

////// DELETE CLIENT (SOFT DELETE) //////
export const deleteClient = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const client = await prisma.client.findFirst({
            where: { id, companyId, isActive: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client introuvable"
            });
        }

        await prisma.client.update({
            where: { id },
            data: { isActive: false }
        });

        return res.status(200).json({
            success: true,
            message: "Client supprimé avec succès"
        });
    } catch (error) {
        console.error("DELETE CLIENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du client"
        });
    }
};

////// GET CLIENT INTERVENTIONS HISTORY //////
export const getClientInterventions = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const [total, interventions] = await Promise.all([
            prisma.intervention.count({ where: { clientId: id, companyId } }),
            prisma.intervention.findMany({
                where: { clientId: id, companyId },
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                interventions,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            }
        });
    } catch (error) {
        console.error("GET CLIENT INTERVENTIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'historique des interventions"
        });
    }
};

////// GET CLIENT INVOICES HISTORY //////
export const getClientInvoices = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invoices = await prisma.invoice.findMany({
            where: { clientId: id, companyId },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            success: true,
            data: { invoices }
        });
    } catch (error) {
        console.error("GET CLIENT INVOICES ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'historique des factures"
        });
    }
};

////// GET CLIENT SMS HISTORY //////
export const getClientSms = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const smsLogs = await prisma.smsLog.findMany({
            where: { clientId: id, companyId },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            success: true,
            data: { smsLogs }
        });
    } catch (error) {
        console.error("GET CLIENT SMS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'historique SMS"
        });
    }
};

////// GET CLIENT EQUIPMENT LIST //////
export const getClientEquipment = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const equipment = await prisma.equipment.findMany({
            where: { clientId: id, companyId },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            success: true,
            data: { equipment }
        });
    } catch (error) {
        console.error("GET CLIENT EQUIPMENT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des équipements"
        });
    }
};
