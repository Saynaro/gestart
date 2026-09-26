import { prisma } from "../config/db.js";
import { emitToCompany, emitToSuperadmin } from "../config/socket.js";
import { sendSupportNotificationToAdmin } from "../utils/emailService.js";

/**
 * Récupère les messages d'assistance d'une entreprise.
 * Accessible par l'OWNER (sa propre entreprise) ou par le SUPERADMIN (toutes entreprises).
 */
export const getSupportMessages = async (req, res) => {
    try {
        const { role, companyId: userCompanyId } = req.user;
        let targetCompanyId = userCompanyId;

        if (role === "SUPERADMIN") {
            const queryCompanyId = req.query.companyId;
            if (!queryCompanyId) {
                return res.status(400).json({ success: false, message: "companyId requis pour le superadmin." });
            }
            targetCompanyId = queryCompanyId;
        } else if (role !== "OWNER") {
            return res.status(403).json({
                success: false,
                message: "Accès réservé au dirigeant d'entreprise (Owner) ou au Super Admin."
            });
        }

        const messages = await prisma.supportMessage.findMany({
            where: { companyId: targetCompanyId },
            orderBy: { createdAt: "asc" }
        });

        // Récupérer les informations de la société pour le header du chat
        const company = await prisma.company.findUnique({
            where: { id: targetCompanyId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                logoUrl: true,
                subscription: {
                    select: {
                        status: true,
                        plan: { select: { name: true, displayName: true } }
                    }
                },
                users: {
                    where: { role: "OWNER" },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatarUrl: true
                    },
                    take: 1
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                messages,
                company
            }
        });
    } catch (error) {
        console.error("[GET SUPPORT MESSAGES ERROR]", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la récupération des messages." });
    }
};

/**
 * Envoie un message dans le support direct GestArt.
 * Instantanément propagé via WebSockets.
 */
export const sendSupportMessage = async (req, res) => {
    try {
        const { role, id: userId, firstName, lastName, email: userEmail, companyId: userCompanyId } = req.user;
        const { content, attachments } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: "Le contenu du message ne peut pas être vide." });
        }

        let targetCompanyId = userCompanyId;
        let senderRole = role;

        if (role === "SUPERADMIN") {
            const { companyId: reqCompanyId } = req.body;
            if (!reqCompanyId) {
                return res.status(400).json({ success: false, message: "companyId requis pour envoyer une réponse." });
            }
            targetCompanyId = reqCompanyId;
            senderRole = "SUPERADMIN";
        } else if (role !== "OWNER") {
            return res.status(403).json({
                success: false,
                message: "Seul le propriétaire du compte (Owner) peut contacter le support direct."
            });
        }

        const senderName = role === "SUPERADMIN"
            ? "Assistant GestArt"
            : `${firstName || ""} ${lastName || ""}`.trim() || "Dirigeant";

        // Création du message en base de données
        const message = await prisma.supportMessage.create({
            data: {
                companyId: targetCompanyId,
                senderId: userId,
                senderRole: senderRole,
                senderName: senderName,
                senderEmail: userEmail,
                content: content.trim(),
                attachments: attachments || null,
                readByAdmin: role === "SUPERADMIN",
                readByOwner: role === "OWNER"
            }
        });

        //  Si une réponse automatique intelligente est demandée (depuis les boutons d'assistance rapide)
        if (role === "OWNER" && req.body.autoReply) {
            const autoReplyContent = req.body.autoReply;
            setTimeout(async () => {
                try {
                    const botMsg = await prisma.supportMessage.create({
                        data: {
                            companyId: targetCompanyId,
                            senderId: "gestart-assistant",
                            senderRole: "SUPERADMIN",
                            senderName: "Assistant GestArt",
                            senderEmail: "support@gestart.fr",
                            content: autoReplyContent,
                            readByAdmin: true,
                            readByOwner: false
                        }
                    });

                    emitToCompany(targetCompanyId, "support:new_message", botMsg);
                    emitToSuperadmin("support:new_message", botMsg);
                } catch (bErr) {
                    console.error("[AUTO REPLY ERROR]", bErr);
                }
            }, 600);
        }

        // Si le SuperAdmin envoie un message, créer une notification in-app pour le gérant
        if (role === "SUPERADMIN") {
            const owner = await prisma.user.findFirst({
                where: { companyId: targetCompanyId, role: "OWNER" }
            });

            if (owner) {
                await prisma.notification.create({
                    data: {
                        companyId: targetCompanyId,
                        userId: owner.id,
                        type: "NEW_MESSAGE_RECEIVED",
                        channel: "IN_APP",
                        title: "Message du Support GestArt",
                        message: content.trim().slice(0, 120),
                        status: "PENDING"
                    }
                }).catch(() => { });

                emitToCompany(targetCompanyId, "notification:new", {
                    type: "NEW_MESSAGE_RECEIVED",
                    title: "Message du Support GestArt",
                    message: content.trim().slice(0, 120),
                    link: "/settings?tab=support"
                });
            }
        } else if (role === "OWNER") {
            // Notifier le SuperAdmin par email en arrière-plan
            (async () => {
                try {
                    const company = await prisma.company.findUnique({
                        where: { id: targetCompanyId },
                        select: { name: true }
                    });

                    const superAdmins = await prisma.user.findMany({
                        where: { role: "SUPERADMIN" },
                        select: { email: true }
                    });

                    const targetEmails = superAdmins.length > 0
                        ? superAdmins.map(sa => sa.email).filter(Boolean)
                        : [process.env.ADMIN_EMAIL || "support.gestart@gmail.com"];

                    for (const email of targetEmails) {
                        if (email) {
                            sendSupportNotificationToAdmin({
                                adminEmail: email,
                                senderName,
                                senderEmail,
                                companyName: company?.name || "Entreprise",
                                companyId: targetCompanyId,
                                content: content.trim(),
                                createdAt: message.createdAt
                            }).catch(err => {
                                console.warn(`[SUPPORT EMAIL ERROR TO ${email}]:`, err.message);
                            });
                        }
                    }
                } catch (emailErr) {
                    console.warn("[SUPPORT EMAIL NOTIFICATION FAILED]", emailErr.message);
                }
            })();
        }

        //  Émission temps réel WebSocket instantanée
        // 1. Envoyer à l'entreprise (room `company:${companyId}`)
        emitToCompany(targetCompanyId, "support:new_message", message);

        // 2. Envoyer à tous les SuperAdmins connectés (room `superadmin`)
        emitToSuperadmin("support:new_message", message);

        return res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        console.error("[SEND SUPPORT MESSAGE ERROR]", error);
        return res.status(500).json({ success: false, message: "Erreur lors de l'envoi du message." });
    }
};

/**
 * Marque les messages comme lus.
 */
export const markSupportMessagesAsRead = async (req, res) => {
    try {
        const { role, companyId: userCompanyId } = req.user;
        let targetCompanyId = userCompanyId;

        if (role === "SUPERADMIN") {
            const { companyId: reqCompanyId } = req.body;
            if (!reqCompanyId) {
                return res.status(400).json({ success: false, message: "companyId requis." });
            }
            targetCompanyId = reqCompanyId;

            await prisma.supportMessage.updateMany({
                where: {
                    companyId: targetCompanyId,
                    readByAdmin: false
                },
                data: {
                    readByAdmin: true
                }
            });
        } else if (role === "OWNER") {
            await prisma.supportMessage.updateMany({
                where: {
                    companyId: targetCompanyId,
                    readByOwner: false
                },
                data: {
                    readByOwner: true
                }
            });
        }

        // Notifier via websocket
        emitToCompany(targetCompanyId, "support:messages_read", { companyId: targetCompanyId, role });
        emitToSuperadmin("support:messages_read", { companyId: targetCompanyId, role });

        return res.status(200).json({ success: true, message: "Messages marqués comme lus." });
    } catch (error) {
        console.error("[MARK SUPPORT READ ERROR]", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la mise à jour des messages." });
    }
};

/**
 * Récupère la liste de toutes les conversations d'entreprises pour le SuperAdmin.
 */
export const getSupportConversations = async (req, res) => {
    try {
        if (req.user.role !== "SUPERADMIN") {
            return res.status(403).json({ success: false, message: "Accès Super Admin requis." });
        }

        // Récupérer toutes les entreprises avec leurs messages et owner
        const companies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                logoUrl: true,
                createdAt: true,
                subscription: {
                    select: {
                        status: true,
                        plan: { select: { name: true, displayName: true } }
                    }
                },
                users: {
                    where: { role: "OWNER" },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatarUrl: true,
                        lastLoginAt: true
                    },
                    take: 1
                },
                supportMessages: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Calculer les compteurs non lus pour chaque entreprise
        const unreadCounts = await prisma.supportMessage.groupBy({
            by: ["companyId"],
            where: {
                readByAdmin: false,
                senderRole: "OWNER"
            },
            _count: {
                _all: true
            }
        });

        const unreadMap = new Map();
        unreadCounts.forEach(item => {
            unreadMap.set(item.companyId, item._count._all);
        });

        const conversations = companies.map(comp => {
            const owner = comp.users[0] || null;
            const lastMsg = comp.supportMessages[0] || null;
            const unreadCount = unreadMap.get(comp.id) || 0;

            return {
                companyId: comp.id,
                companyName: comp.name,
                companyEmail: comp.email,
                companyPhone: comp.phone,
                logoUrl: comp.logoUrl,
                plan: comp.subscription?.plan?.displayName || "Starter",
                planStatus: comp.subscription?.status || "TRIALING",
                owner: owner ? {
                    id: owner.id,
                    name: `${owner.firstName} ${owner.lastName}`.trim(),
                    email: owner.email,
                    phone: owner.phone,
                    avatarUrl: owner.avatarUrl,
                    lastLoginAt: owner.lastLoginAt
                } : null,
                lastMessage: lastMsg ? {
                    id: lastMsg.id,
                    content: lastMsg.content,
                    senderRole: lastMsg.senderRole,
                    senderName: lastMsg.senderName,
                    createdAt: lastMsg.createdAt
                } : null,
                unreadCount
            };
        });

        // Trier : d'abord les entreprises ayant un message récent, sinon par date de création
        conversations.sort((a, b) => {
            if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
            if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
            const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        return res.status(200).json({
            success: true,
            data: conversations
        });
    } catch (error) {
        console.error("[GET SUPPORT CONVERSATIONS ERROR]", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la récupération des conversations." });
    }
};

/**
 * Récupère le nombre global de messages non lus pour l'utilisateur connecté.
 */
export const getUnreadSupportCount = async (req, res) => {
    try {
        const { role, companyId } = req.user;

        if (role === "SUPERADMIN") {
            const count = await prisma.supportMessage.count({
                where: {
                    readByAdmin: false,
                    senderRole: "OWNER"
                }
            });
            return res.status(200).json({ success: true, count });
        } else if (role === "OWNER") {
            const count = await prisma.supportMessage.count({
                where: {
                    companyId: companyId,
                    readByOwner: false,
                    senderRole: "SUPERADMIN"
                }
            });
            return res.status(200).json({ success: true, count });
        }

        return res.status(200).json({ success: true, count: 0 });
    } catch (error) {
        console.error("[GET UNREAD SUPPORT COUNT ERROR]", error);
        return res.status(500).json({ success: false, count: 0 });
    }
};
