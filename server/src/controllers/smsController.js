import { prisma } from "../config/db.js";

// Helper pour incrémenter le compteur de SMS
const incrementSmsCount = async (companyId, count = 1) => {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Mise à jour de la souscription
        await prisma.subscription.update({
            where: { companyId },
            data: {
                smsUsedThisMonth: { increment: count }
            }
        });

        // Upsert de l'utilisation mensuelle dans SmsUsage
        await prisma.smsUsage.upsert({
            where: {
                companyId_month_year: {
                    companyId,
                    month,
                    year
                }
            },
            update: {
                count: { increment: count }
            },
            create: {
                companyId,
                month,
                year,
                count
            }
        });
    } catch (error) {
        console.error("INCREMENT SMS COUNT ERROR:", error.message);
    }
};

////// GET CONVERSATIONS INBOX //////
export const getSmsInbox = async (req, res) => {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    try {
        // Récupérer les clients ayant un historique de messages avec leur dernier message
        const clientsWithSms = await prisma.client.findMany({
            where: {
                companyId,
                isActive: true,
                smsLogs: { some: {} }
            },
            skip,
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                phone: true,
                email: true,
                smsLogs: {
                    take: 1,
                    orderBy: { createdAt: "desc" }
                },
                _count: {
                    select: {
                        smsLogs: {
                            where: { isRead: false, direction: "INCOMING" }
                        }
                    }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        const conversations = clientsWithSms.map(client => ({
            client: {
                id: client.id,
                firstName: client.firstName,
                lastName: client.lastName,
                companyName: client.companyName,
                phone: client.phone,
            },
            lastMessage: client.smsLogs[0] || null,
            unreadCount: client._count.smsLogs
        }));

        return res.status(200).json({
            success: true,
            data: { conversations }
        });
    } catch (error) {
        console.error("GET SMS INBOX ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des conversations SMS"
        });
    }
};

////// GET SMS HISTORY WITH SPECIFIC CLIENT //////
export const getClientSmsHistory = async (req, res) => {
    const { clientId } = req.params;
    const companyId = req.user.companyId;

    try {
        const messages = await prisma.smsLog.findMany({
            where: { clientId, companyId },
            orderBy: { createdAt: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: { messages }
        });
    } catch (error) {
        console.error("GET CLIENT SMS HISTORY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'historique SMS"
        });
    }
};

////// SEND SINGLE SMS //////
export const sendSms = async (req, res) => {
    const companyId = req.user.companyId;
    const { clientId, message } = req.body;

    if (!clientId || !message) {
        return res.status(400).json({
            success: false,
            message: "Veuillez fournir le destinataire (clientId) et le message"
        });
    }

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId, isActive: true }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client introuvable"
            });
        }

        // Création du log de message
        const smsLog = await prisma.smsLog.create({
            data: {
                companyId,
                clientId,
                direction: "OUTGOING",
                channel: "SMS",
                body: message.trim(),
                toNumber: client.phone,
                status: "sent",
                isRead: true,
                autoType: "manual"
            }
        });

        // Incrémentation du compteur de SMS
        await incrementSmsCount(companyId, 1);

        return res.status(201).json({
            success: true,
            message: `SMS envoyé avec succès à ${client.phone}`,
            data: { smsLog }
        });
    } catch (error) {
        console.error("SEND SMS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'envoi du SMS"
        });
    }
};

////// SEND BULK SMS //////
export const sendBulkSms = async (req, res) => {
    const companyId = req.user.companyId;
    const { clientIds = [], message } = req.body;

    if (!Array.isArray(clientIds) || clientIds.length === 0 || !message) {
        return res.status(400).json({
            success: false,
            message: "Veuillez fournir une liste de clients (clientIds[]) et le message"
        });
    }

    try {
        const clients = await prisma.client.findMany({
            where: {
                id: { in: clientIds },
                companyId,
                isActive: true
            }
        });

        const logs = await prisma.$transaction(
            clients.map(c =>
                prisma.smsLog.create({
                    data: {
                        companyId,
                        clientId: c.id,
                        direction: "OUTGOING",
                        channel: "SMS",
                        body: message.trim(),
                        toNumber: c.phone,
                        status: "sent",
                        isRead: true,
                        autoType: "bulk"
                    }
                })
            )
        );

        await incrementSmsCount(companyId, clients.length);

        return res.status(201).json({
            success: true,
            message: `SMS envoyés avec succès à ${clients.length} clients`,
            data: { count: logs.length }
        });
    } catch (error) {
        console.error("SEND BULK SMS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'envoi des SMS groupés"
        });
    }
};

////// MARK CLIENT SMS AS READ //////
export const markSmsAsRead = async (req, res) => {
    const { clientId } = req.params;
    const companyId = req.user.companyId;

    try {
        await prisma.smsLog.updateMany({
            where: {
                clientId,
                companyId,
                isRead: false
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Messages marqués comme lus"
        });
    } catch (error) {
        console.error("MARK SMS AS READ ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour des messages"
        });
    }
};

////// GET SMS USAGE STATS //////
export const getSmsUsage = async (req, res) => {
    const companyId = req.user.companyId;
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    try {
        const [subscription, usage] = await Promise.all([
            prisma.subscription.findUnique({
                where: { companyId },
                include: { plan: true }
            }),
            prisma.smsUsage.findUnique({
                where: {
                    companyId_month_year: {
                        companyId,
                        month,
                        year
                    }
                }
            })
        ]);

        const maxSms = subscription?.plan?.maxSmsPerMonth ?? 50;
        const count = usage?.count || subscription?.smsUsedThisMonth || 0;

        return res.status(200).json({
            success: true,
            data: {
                month,
                year,
                used: count,
                max: maxSms,
                extraCost: usage?.extraCost || 0,
                isLimitReached: maxSms !== -1 && count >= maxSms
            }
        });
    } catch (error) {
        console.error("GET SMS USAGE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la consommation SMS"
        });
    }
};

////// GET UNREAD SMS COUNT //////
export const getUnreadSmsCount = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const count = await prisma.smsLog.count({
            where: {
                companyId,
                isRead: false,
                direction: "INCOMING"
            }
        });

        return res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error("GET UNREAD SMS COUNT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du comptage des SMS non lus"
        });
    }
};
