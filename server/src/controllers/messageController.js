import { OmnichannelService } from "../services/messaging/OmnichannelService.js";

/**
 * Récupère la liste des conversations omnicanales pour l'entreprise
 * GET /api/v1/messages/inbox
 */
export const getOmnichannelInbox = async (req, res) => {
    const companyId = req.user.companyId;
    const { channel, unreadOnly, search, page, limit } = req.query;

    try {
        const result = await OmnichannelService.getOmnichannelInbox({
            companyId,
            channel,
            unreadOnly: unreadOnly === "true",
            search,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("GET OMNICHANNEL INBOX ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des conversations."
        });
    }
};

/**
 * Récupère la conversation chronologique complète avec un client
 * GET /api/v1/messages/inbox/:clientId
 */
export const getClientConversation = async (req, res) => {
    const { clientId } = req.params;
    const companyId = req.user.companyId;
    const { channel } = req.query;

    try {
        const result = await OmnichannelService.getClientTimeline({
            companyId,
            clientId,
            channelFilter: channel
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("GET CLIENT CONVERSATION ERROR:", error.message);
        return res.status(error.message.includes("introuvable") ? 404 : 500).json({
            success: false,
            message: error.message || "Erreur lors de la récupération de la conversation"
        });
    }
};

/**
 * Envoie un message omnicanal (SMS, WhatsApp, Email)
 * POST /api/v1/messages/send
 */
export const sendMessage = async (req, res) => {
    const companyId = req.user.companyId;
    const {
        clientId,
        channel = "SMS",
        message,
        body,
        subject,
        attachments = [],
        autoType = "manual",
        inReplyTo,
        references,
        threadId,
        metadata
    } = req.body;

    const messageText = (message || body || "").trim();

    if (!clientId) {
        return res.status(400).json({
            success: false,
            message: "Destinataire (clientId) obligatoire."
        });
    }

    if (!messageText && attachments.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Le contenu du message ne peut pas être vide."
        });
    }

    try {
        const messageLog = await OmnichannelService.sendMessage({
            companyId,
            clientId,
            channel,
            body: messageText,
            subject,
            attachments,
            autoType,
            inReplyTo,
            references,
            threadId,
            metadata
        });

        return res.status(201).json({
            success: true,
            message: `Message envoyé avec succès via ${channel.toUpperCase()}`,
            data: { messageLog, smsLog: messageLog }
        });
    } catch (error) {
        console.error("SEND MESSAGE ERROR:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de l'envoi du message"
        });
    }
};

/**
 * Marque les messages d'un client comme lus sur tous les canaux
 * PATCH /api/v1/messages/read/:clientId
 */
export const markMessagesAsRead = async (req, res) => {
    const { clientId } = req.params;
    const companyId = req.user.companyId;

    try {
        await OmnichannelService.markAsRead({ companyId, clientId });

        return res.status(200).json({
            success: true,
            message: "Messages marqués comme lus"
        });
    } catch (error) {
        console.error("MARK MESSAGES AS READ ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour des messages"
        });
    }
};

/**
 * Obtient la disponibilité des canaux et la recommandation intelligente pour un client
 * GET /api/v1/messages/channels/:clientId
 */
export const getClientChannels = async (req, res) => {
    const { clientId } = req.params;
    const companyId = req.user.companyId;

    try {
        const result = await OmnichannelService.getClientChannelsAvailability(companyId, clientId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("GET CLIENT CHANNELS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la vérification des canaux"
        });
    }
};

/**
 * Obtient le nombre total de messages non lus
 * GET /api/v1/messages/unread-count
 */
export const getUnreadCount = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const counts = await OmnichannelService.getUnreadCounts(companyId);

        return res.status(200).json({
            success: true,
            data: counts
        });
    } catch (error) {
        console.error("GET UNREAD COUNT ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors du comptage des messages non lus"
        });
    }
};
