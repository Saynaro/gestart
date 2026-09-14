import { prisma } from "../config/db.js";

////// GET NOTIFICATIONS FOR LOGGED IN USER //////
export const getNotifications = async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const { unreadOnly, type } = req.query;

    try {
        // Exclure les messages reçus car ils ont leur propre onglet dédié 'Messages reçus'
        const where = {
            userId,
            type: { not: "NEW_MESSAGE_RECEIVED" },
            ...(unreadOnly === "true" && { isRead: false }),
            ...(type && { type })
        };

        const [total, notifications] = await Promise.all([
            prisma.notification.count({ where }),
            prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                notifications,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error("GET NOTIFICATIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des notifications"
        });
    }
};

////// GET UNREAD NOTIFICATIONS COUNT //////
export const getUnreadNotificationCount = async (req, res) => {
    const userId = req.user.id;

    try {
        // Compter les notifications métier non lues (hors messages)
        const count = await prisma.notification.count({
            where: {
                userId,
                type: { not: "NEW_MESSAGE_RECEIVED" },
                isRead: false
            }
        });

        return res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error("GET UNREAD NOTIFICATIONS COUNT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du comptage des notifications non lues"
        });
    }
};

////// MARK SINGLE NOTIFICATION AS READ //////
export const markNotificationAsRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification introuvable"
            });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Notification marquée comme lue",
            data: { notification: updated }
        });
    } catch (error) {
        console.error("MARK NOTIFICATION AS READ ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de la notification"
        });
    }
};

////// MARK ALL NOTIFICATIONS AS READ //////
export const markAllNotificationsAsRead = async (req, res) => {
    const userId = req.user.id;

    try {
        await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Toutes les notifications ont été marquées comme lues"
        });
    } catch (error) {
        console.error("MARK ALL READ ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de toutes les notifications"
        });
    }
};

////// DELETE SINGLE NOTIFICATION //////
export const deleteNotification = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification introuvable"
            });
        }

        await prisma.notification.delete({
            where: { id }
        });

        return res.status(200).json({
            success: true,
            message: "Notification supprimée avec succès"
        });
    } catch (error) {
        console.error("DELETE NOTIFICATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression de la notification"
        });
    }
};

////// BATCH DELETE NOTIFICATIONS //////
export const batchDeleteNotifications = async (req, res) => {
    const userId = req.user.id;
    const { notificationIds } = req.body || {};

    try {
        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Aucun identifiant fourni"
            });
        }

        const deleted = await prisma.notification.deleteMany({
            where: {
                id: { in: notificationIds },
                userId
            }
        });

        return res.status(200).json({
            success: true,
            data: { count: deleted.count },
            message: `${deleted.count} notification(s) supprimée(s) avec succès`
        });
    } catch (error) {
        console.error("BATCH DELETE NOTIFICATIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la suppression des notifications"
        });
    }
};

////// DELETE ALL READ NOTIFICATIONS //////
export const clearAllReadNotifications = async (req, res) => {
    const userId = req.user.id;

    try {
        const deleted = await prisma.notification.deleteMany({
            where: {
                userId,
                isRead: true
            }
        });

        return res.status(200).json({
            success: true,
            message: `${deleted.count} notification(s) lue(s) supprimée(s) avec succès`
        });
    } catch (error) {
        console.error("CLEAR ALL NOTIFICATIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du nettoyage des notifications"
        });
    }
};
