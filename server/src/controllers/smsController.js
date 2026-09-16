import { prisma } from "../config/db.js";
import { TwilioSmsService } from "../services/messaging/sms/twilio.service.js";
import { emitToCompany } from "../config/socket.js";

/**
 * Récupère la liste des conversations SMS pour l'entreprise connectée
 * GET /api/v1/sms/inbox
 */
export const getSmsInbox = async (req, res) => {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { incomingOnly } = req.query;

    try {
        // Récupérer les clients ayant au moins un message SMS
        const clientsWithSms = await prisma.client.findMany({
            where: {
                companyId,
                isActive: true,
                smsLogs: { 
                    some: {
                        ...(incomingOnly === "true" ? { direction: "INCOMING" } : {})
                    }
                }
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
                address: true,
                city: true,
                postalCode: true,
                status: true,
                smsLogs: {
                    where: {
                        ...(incomingOnly === "true" ? { direction: "INCOMING" } : {})
                    },
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
            id: client.id,
            clientId: client.id,
            name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.companyName || client.phone,
            client: {
                id: client.id,
                firstName: client.firstName,
                lastName: client.lastName,
                companyName: client.companyName,
                phone: client.phone,
                email: client.email,
                address: client.address,
                city: client.city,
                postalCode: client.postalCode,
                status: client.status
            },
            lastMessage: client.smsLogs[0] || null,
            time: client.smsLogs[0]?.createdAt || client.updatedAt,
            unreadCount: client._count.smsLogs,
            channel: "SMS"
        }));

        conversations.sort((a, b) => {
            const timeA = new Date(a.time || a.lastMessage?.createdAt || 0).getTime();
            const timeB = new Date(b.time || b.lastMessage?.createdAt || 0).getTime();
            return timeB - timeA;
        });

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

/**
 * Récupère l'historique complet des messages SMS avec un client
 * GET /api/v1/sms/inbox/:clientId
 */
export const getClientSmsHistory = async (req, res) => {
    const { clientId } = req.params;
    const companyId = req.user.companyId;

    try {
        // Multi-tenant check: vérifier que le client appartient bien à l'entreprise
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId, isActive: true },
            include: {
                equipment: true,
                interventions: {
                    orderBy: { scheduledAt: "desc" },
                    take: 5
                },
                invoices: {
                    orderBy: { createdAt: "desc" },
                    take: 5
                },
                quotes: {
                    orderBy: { createdAt: "desc" },
                    take: 5
                }
            }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client introuvable ou accès non autorisé"
            });
        }

        const messages = await prisma.smsLog.findMany({
            where: { clientId, companyId },
            orderBy: { createdAt: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: {
                client,
                messages
            }
        });
    } catch (error) {
        console.error("GET CLIENT SMS HISTORY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de l'historique SMS"
        });
    }
};

/**
 * Envoi d'un message SMS individuel via Twilio
 * POST /api/v1/sms/send
 */
export const sendSms = async (req, res) => {
    const companyId = req.user.companyId;
    const { clientId, message, body } = req.body;
    const messageText = (message || body || "").trim();

    if (!clientId || !messageText) {
        return res.status(400).json({
            success: false,
            message: "Veuillez fournir le destinataire (clientId) et le message"
        });
    }

    try {
        const smsLog = await TwilioSmsService.sendSms({
            companyId,
            clientId,
            body: messageText,
            autoType: "manual"
        });

        return res.status(201).json({
            success: true,
            message: `SMS envoyé avec succès`,
            data: { smsLog }
        });
    } catch (error) {
        console.error("SEND SMS ERROR:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de l'envoi du SMS"
        });
    }
};

/**
 * Envoi groupé de SMS à plusieurs clients
 * POST /api/v1/sms/send-bulk
 */
export const sendBulkSms = async (req, res) => {
    const companyId = req.user.companyId;
    const { clientIds = [], message, body } = req.body;
    const messageText = (message || body || "").trim();

    if (!Array.isArray(clientIds) || clientIds.length === 0 || !messageText) {
        return res.status(400).json({
            success: false,
            message: "Veuillez fournir une liste de clients (clientIds[]) et le texte du message"
        });
    }

    try {
        const results = [];
        const errors = [];

        for (const clientId of clientIds) {
            try {
                const log = await TwilioSmsService.sendSms({
                    companyId,
                    clientId,
                    body: messageText,
                    autoType: "bulk"
                });
                results.push(log);
            } catch (err) {
                errors.push({ clientId, error: err.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `${results.length} SMS envoyés avec succès (${errors.length} échecs)`,
            data: {
                sentCount: results.length,
                failedCount: errors.length,
                errors
            }
        });
    } catch (error) {
        console.error("SEND BULK SMS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'envoi des SMS groupés"
        });
    }
};

/**
 * Marque les SMS d'un client comme lus
 * PATCH /api/v1/sms/read/:clientId
 */
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

        // Informer en temps réel pour mettre à jour les badges
        emitToCompany(companyId, "message:read", {
            clientId,
            conversationId: clientId
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

/**
 * Récupère les statistiques de consommation SMS
 * GET /api/v1/sms/usage
 */
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

/**
 * Récupère le nombre total de messages non lus
 * GET /api/v1/sms/unread-count
 */
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
