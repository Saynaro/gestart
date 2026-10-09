import { prisma } from "../config/db.js";
import { cacheService } from "../services/cacheService.js";

////// GET ME //////
export const getMe = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                jobTitle: true,
                role: true,
                isActive: true,
                companyId: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
                company: {
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
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Utilisateur trouvé",
            data: {
                user,
            }
        });
    } catch (error) {
        console.error("GET ME ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'utilisateur",
        });
    }
};

////// UPDATE ME //////
export const updateMe = async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, phone, avatarUrl, jobTitle } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(firstName !== undefined && { firstName: firstName.trim() }),
                ...(lastName !== undefined && { lastName: lastName.trim() }),
                ...(phone !== undefined && { phone }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(jobTitle !== undefined && { jobTitle: jobTitle.trim() }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                jobTitle: true,
                role: true,
                companyId: true,
            }
        });

        // Invalidate Redis user session cache so next request picks up updated details
        await cacheService.del(`user:session:${userId}`);

        return res.status(200).json({
            success: true,
            message: "Profil mis à jour avec succès",
            data: {
                user,
            }
        });
    } catch (error) {
        console.error("UPDATE ME ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du profil",
        });
    }
};

////// UPLOAD AVATAR //////
export const uploadAvatar = async (req, res) => {
    const userId = req.user.id;

    try {
        // req.file est fourni par le middleware Multer / Cloudinary (ex: req.file.path)
        const avatarUrl = req.file?.path || req.body?.avatarUrl;

        if (!avatarUrl) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir un fichier image pour l'avatar"
            });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                avatarUrl: true,
            }
        });

        await cacheService.del(`user:session:${userId}`);

        return res.status(200).json({
            success: true,
            message: "Avatar mis à jour avec succès",
            data: { avatarUrl: user.avatarUrl }
        });
    } catch (error) {
        console.error("UPLOAD AVATAR ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du téléchargement de l'avatar",
        });
    }
};

////// DELETE AVATAR //////
export const deleteAvatar = async (req, res) => {
    const userId = req.user.id;

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: null }
        });

        await cacheService.del(`user:session:${userId}`);

        return res.status(200).json({
            success: true,
            message: "Avatar supprimé avec succès"
        });
    } catch (error) {
        console.error("DELETE AVATAR ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de l'avatar",
        });
    }
};

////// GET COMPANY USERS //////
export const getCompanyUsers = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const users = await prisma.user.findMany({
            where: { companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            success: true,
            data: { users }
        });
    } catch (error) {
        console.error("GET USERS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des utilisateurs",
        });
    }
};

////// GET USER BY ID //////
export const getUserById = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const user = await prisma.user.findFirst({
            where: { id, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                role: true,
                isActive: true,
                createdAt: true,
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable dans votre société"
            });
        }

        return res.status(200).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error("GET USER BY ID ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'utilisateur",
        });
    }
};

////// UPDATE USER (OWNER / MANAGER) //////
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { firstName, lastName, phone, role, isActive } = req.body;

    try {
        const targetUser = await prisma.user.findFirst({
            where: { id, companyId }
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable dans votre société"
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(firstName !== undefined && { firstName: firstName.trim() }),
                ...(lastName !== undefined && { lastName: lastName.trim() }),
                ...(phone !== undefined && { phone }),
                ...(role !== undefined && { role }),
                ...(isActive !== undefined && { isActive }),
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
            }
        });

        return res.status(200).json({
            success: true,
            message: "Utilisateur mis à jour avec succès",
            data: { user: updatedUser }
        });
    } catch (error) {
        console.error("UPDATE USER ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de l'utilisateur",
        });
    }
};

////// DELETE USER (TECHNICIAN / MEMBER REMOVAL) //////
export const deleteUser = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const targetUser = await prisma.user.findFirst({
            where: { id, companyId }
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable dans votre société"
            });
        }

        if (targetUser.role === "OWNER" || targetUser.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "Vous ne pouvez pas supprimer le compte propriétaire principal de l'entreprise"
            });
        }

        await prisma.$transaction(async (tx) => {
            // Unassign from interventions so they become unassigned
            await tx.intervention.updateMany({
                where: { technicianId: id },
                data: { technicianId: null }
            });
            // Delete user sessions, tokens, login histories and notifications
            await tx.pushToken.deleteMany({ where: { userId: id } });
            await tx.userSession.deleteMany({ where: { userId: id } });
            await tx.loginHistory.deleteMany({ where: { userId: id } });
            await tx.notification.deleteMany({ where: { userId: id } });
            // Delete user
            await tx.user.delete({ where: { id } });
        });

        return res.status(200).json({
            success: true,
            message: "Technicien supprimé avec succès de l'entreprise"
        });
    } catch (error) {
        console.error("DELETE USER ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de l'utilisateur",
        });
    }
};

////// ADD FCM PUSH TOKEN //////
export const addPushToken = async (req, res) => {
    const { id } = req.params;
    const { token, device, platform } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Le token FCM est requis"
        });
    }

    try {
        const pushToken = await prisma.pushToken.upsert({
            where: { token },
            update: {
                userId: id,
                device,
                platform,
                isActive: true,
            },
            create: {
                userId: id,
                token,
                device,
                platform,
                isActive: true,
            }
        });

        return res.status(201).json({
            success: true,
            message: "Token de notification enregistré",
            data: { pushToken }
        });
    } catch (error) {
        console.error("ADD PUSH TOKEN ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'enregistrement du token push",
        });
    }
};

////// REMOVE FCM PUSH TOKEN //////
export const removePushToken = async (req, res) => {
    const { id, tokenId } = req.params;

    try {
        await prisma.pushToken.deleteMany({
            where: {
                id: tokenId,
                userId: id,
            }
        });

        return res.status(200).json({
            success: true,
            message: "Token de notification supprimé"
        });
    } catch (error) {
        console.error("REMOVE PUSH TOKEN ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression du token push",
        });
    }
};
