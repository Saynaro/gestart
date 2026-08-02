import { prisma } from "../config/db.js";

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
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true,
                    phone: true,
                    email: true,
                    address: true,
                    city: true,
                    postalCode: true,
                    status: true,
                    source: true,
                    preferredChannel: true,
                    createdAt: true,
                    _count: {
                        select: {
                            equipment: true,
                            interventions: true,
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
                    take: 5,
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
                companyName: companyName ? companyName.trim() : null,
                notes: notes || null,
                source: source || null,
                preferredChannel: preferredChannel || "SMS",
            }
        });

        return res.status(201).json({
            success: true,
            message: "Client créé avec succès",
            data: { client: newClient }
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
            where: { id, companyId, isActive: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client introuvable"
            });
        }

        const updatedClient = await prisma.client.update({
            where: { id },
            data: { ...req.body }
        });

        return res.status(200).json({
            success: true,
            message: "Fiche client mise à jour avec succès",
            data: { client: updatedClient }
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
