import { prisma } from "../config/db.js";

////// GET COMPANY INFO //////
export const getCompany = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                subscription: {
                    include: {
                        plan: true,
                    }
                },
                settings: true,
                tradeCategories: {
                    include: {
                        tradeCategory: true,
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Société introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: { company }
        });
    } catch (error) {
        console.error("GET COMPANY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la société"
        });
    }
};

////// UPDATE COMPANY INFO (OWNER ONLY) //////
export const updateCompany = async (req, res) => {
    const companyId = req.user.companyId;
    const {
        name,
        siret,
        siren,
        legalForm,
        tvaNumber,
        phone,
        email,
        address,
        city,
        postalCode,
        website,
        tradeCategories, // Array of category IDs
    } = req.body;

    try {
        // Mise à jour de la société et gestion atomique des catégories de métier
        const updatedCompany = await prisma.$transaction(async (tx) => {
            if (Array.isArray(tradeCategories)) {
                // Supprime les anciennes catégories avant d'ajouter les nouvelles
                await tx.companyTradeCategory.deleteMany({
                    where: { companyId }
                });
            }

            return await tx.company.update({
                where: { id: companyId },
                data: {
                    ...(name !== undefined && { name: name.trim() }),
                    ...(siret !== undefined && { siret: siret.trim() }),
                    ...(siren !== undefined && { siren: siren.trim() }),
                    ...(legalForm !== undefined && { legalForm }),
                    ...(tvaNumber !== undefined && { tvaNumber }),
                    ...(phone !== undefined && { phone }),
                    ...(email !== undefined && { email: email.toLowerCase().trim() }),
                    ...(address !== undefined && { address: address.trim() }),
                    ...(city !== undefined && { city: city.trim() }),
                    ...(postalCode !== undefined && { postalCode: postalCode.trim() }),
                    ...(website !== undefined && { website: website.trim() }),
                    ...(Array.isArray(tradeCategories) && {
                        tradeCategories: {
                            create: tradeCategories.map((catId) => ({
                                tradeCategory: {
                                    connectOrCreate: {
                                        where: { id: catId },
                                        create: {
                                            id: catId,
                                            name: catId,
                                            slug: catId.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                                        }
                                    }
                                }
                            }))
                        }
                    })
                },
                include: {
                    subscription: {
                        include: { plan: true }
                    },
                    settings: true,
                    tradeCategories: {
                        include: { tradeCategory: true }
                    }
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Informations de la société mises à jour avec succès",
            data: { company: updatedCompany }
        });
    } catch (error) {
        console.error("UPDATE COMPANY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de la société"
        });
    }
};

////// UPLOAD COMPANY LOGO (OWNER ONLY) //////
export const uploadCompanyLogo = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const logoUrl = req.file?.path || req.body?.logoUrl;

        if (!logoUrl) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir un fichier image pour le logo"
            });
        }

        const company = await prisma.company.update({
            where: { id: companyId },
            data: { logoUrl },
            select: { id: true, logoUrl: true }
        });

        return res.status(200).json({
            success: true,
            message: "Logo de la société mis à jour avec succès",
            data: { logoUrl: company.logoUrl }
        });
    } catch (error) {
        console.error("UPLOAD LOGO ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du téléchargement du logo"
        });
    }
};

////// DELETE COMPANY LOGO (OWNER ONLY) //////
export const deleteCompanyLogo = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        await prisma.company.update({
            where: { id: companyId },
            data: { logoUrl: null }
        });

        return res.status(200).json({
            success: true,
            message: "Logo supprimé avec succès"
        });
    } catch (error) {
        console.error("DELETE LOGO ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du logo"
        });
    }
};

////// GET COMPANY SETTINGS //////
export const getCompanySettings = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        // Upsert garantit que si les paramètres n'existent pas encore, ils seront créés par défaut
        const settings = await prisma.companySettings.upsert({
            where: { companyId },
            update: {},
            create: { companyId }
        });

        return res.status(200).json({
            success: true,
            data: { settings }
        });
    } catch (error) {
        console.error("GET SETTINGS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des paramètres"
        });
    }
};

////// UPDATE COMPANY SETTINGS (OWNER ONLY) //////
export const updateCompanySettings = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const updatedSettings = await prisma.companySettings.upsert({
            where: { companyId },
            update: { ...req.body },
            create: { companyId, ...req.body }
        });

        return res.status(200).json({
            success: true,
            message: "Paramètres mis à jour avec succès",
            data: { settings: updatedSettings }
        });
    } catch (error) {
        console.error("UPDATE SETTINGS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour des paramètres"
        });
    }
};

////// GET COMPANY STATS (FAST AGGREGATIONS) //////
export const getCompanyStats = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Exécution en parallèle optimisée avec Promise.all
        const [
            totalClients,
            totalInterventionsThisMonth,
            completedInterventionsThisMonth,
            revenueThisMonth,
            pendingInvoicesCount
        ] = await Promise.all([
            prisma.client.count({
                where: { companyId, isActive: true }
            }),
            prisma.intervention.count({
                where: {
                    companyId,
                    createdAt: { gte: startOfMonth }
                }
            }),
            prisma.intervention.count({
                where: {
                    companyId,
                    status: "COMPLETED",
                    updatedAt: { gte: startOfMonth }
                }
            }),
            prisma.invoice.aggregate({
                _sum: { totalAmount: true },
                where: {
                    companyId,
                    status: "PAID",
                    createdAt: { gte: startOfMonth }
                }
            }),
            prisma.invoice.count({
                where: {
                    companyId,
                    status: "SENT"
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalClients,
                    totalInterventionsThisMonth,
                    completedInterventionsThisMonth,
                    revenueThisMonth: revenueThisMonth._sum.totalAmount || 0,
                    pendingInvoicesCount
                }
            }
        });
    } catch (error) {
        console.error("GET STATS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du calcul des statistiques"
        });
    }
};
