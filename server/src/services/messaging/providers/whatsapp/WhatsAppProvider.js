import { MessageProvider } from "../../interfaces/MessageProvider.js";
import { prisma } from "../../../../config/db.js";
import { emitToCompany } from "../../../../config/socket.js";
import { normalizePhoneNumber } from "../../sms/twilio.service.js";
import { decryptCredential } from "../../../../modules/e-invoicing/services/EncryptionService.js";

/**
 * Normalise un numéro pour l'API Meta WhatsApp (E.164 sans le '+', ex: "33612345678")
 */
export const formatWhatsAppRecipient = (rawPhone) => {
    const normalized = normalizePhoneNumber(rawPhone);
    if (!normalized) return null;
    return normalized.replace(/^\+/, "");
};

/**
 * WhatsApp Business Cloud API Provider (Multi-tenant)
 */
export class WhatsAppProvider extends MessageProvider {
    constructor() {
        super("WHATSAPP");
    }

    /**
     * Résout la configuration WhatsApp pour une entreprise
     * @param {string} companyId 
     * @returns {Promise<{ phoneNumberId: string, accessToken: string, connectionId?: string }|null>}
     */
    async getCompanyWhatsAppConfig(companyId) {
        if (companyId) {
            const connection = await prisma.whatsAppConnection.findFirst({
                where: {
                    companyId,
                    status: "CONNECTED"
                },
                orderBy: { isDefault: "desc" }
            });

            if (connection && connection.phoneNumberId) {
                let token = null;
                if (connection.encryptedAccessToken) {
                    try {
                        token = decryptCredential(connection.encryptedAccessToken);
                    } catch (e) {
                        console.error("[WHATSAPP] Erreur déchiffrement token:", e.message);
                    }
                }

                if (!token) {
                    token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
                }

                return {
                    phoneNumberId: connection.phoneNumberId,
                    accessToken: token,
                    connectionId: connection.id,
                    displayNumber: connection.displayPhoneNumber
                };
            }
        }

        // Fallback sur les variables d'environnement globales
        const globalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const globalToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_SYSTEM_USER_TOKEN;

        if (globalPhoneNumberId && globalToken) {
            return {
                phoneNumberId: globalPhoneNumberId,
                accessToken: globalToken,
                connectionId: null,
                displayNumber: process.env.WHATSAPP_BUSINESS_PHONE || null
            };
        }

        return null;
    }

    /**
     * Envoie un message WhatsApp sortant
     */
    async sendMessage({ companyId, clientId, body, attachments = [], autoType = "manual", metadata = {} }) {
        console.log(`[WHATSAPP_SEND_STARTED] Company: ${companyId}, Client: ${clientId}`);

        const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
        const bodyContent = (body || "").trim();

        if (!bodyContent && !hasAttachments) {
            throw new Error("Le contenu du message WhatsApp ne peut pas être vide.");
        }

        // 1. Chargement du client
        const client = await prisma.client.findFirst({
            where: {
                id: clientId,
                companyId,
                isActive: true
            }
        });

        if (!client) {
            throw new Error("Client introuvable ou non autorisé.");
        }

        if (!client.phone) {
            throw new Error("Le client n'a pas de numéro de téléphone enregistré.");
        }

        const normalizedPhone = normalizePhoneNumber(client.phone);
        const recipientPhone = formatWhatsAppRecipient(client.phone);

        if (!recipientPhone) {
            throw new Error("Le numéro de téléphone du client est invalide pour WhatsApp.");
        }

        // 2. Récupération de la configuration WhatsApp de l'entreprise
        const waConfig = await this.getCompanyWhatsAppConfig(companyId);
        if (!waConfig || !waConfig.phoneNumberId) {
            throw new Error("Aucun compte WhatsApp Business n'est connecté pour cette entreprise. Rendez-vous dans Paramètres > Communication pour connecter votre numéro.");
        }

        const { phoneNumberId, accessToken, connectionId } = waConfig;
        let whatsappMessageId = null;
        let status = "sent";
        let isRealApi = Boolean(accessToken && accessToken.length > 20 && !accessToken.includes("your_") && process.env.NODE_ENV !== "test");

        // 3. Envoi via Meta Graph API v20.0
        if (isRealApi) {
            try {
                const endpoint = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
                
                let payload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipientPhone,
                    type: "text",
                    text: {
                        preview_url: false,
                        body: body.trim()
                    }
                };

                // Si pièces jointes fournies (ex: document / devis PDF)
                if (attachments && attachments.length > 0) {
                    const firstAttachment = attachments[0];
                    if (firstAttachment.url) {
                        payload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: recipientPhone,
                            type: "document",
                            document: {
                                link: firstAttachment.url,
                                filename: firstAttachment.filename || "Document.pdf",
                                caption: body.trim()
                            }
                        };
                    }
                }

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    const errObj = data?.error || {};
                    console.error("[WHATSAPP_API_ERROR]", JSON.stringify(errObj));

                    // Gestion spécifique de la fenêtre de messagerie 24h Meta
                    if (errObj.code === 131047 || errObj.message?.includes("24 hours") || errObj.error_subcode === 2494010) {
                        throw new Error("La fenêtre de messagerie WhatsApp de 24h est fermée avec ce client. Vous ne pouvez envoyer qu'un message modèle approuvé, ou basculer sur l'envoi par SMS.");
                    }

                    throw new Error(errObj.message || `Erreur Meta WhatsApp (${errObj.code || response.status})`);
                }

                if (data?.messages && data.messages.length > 0) {
                    whatsappMessageId = data.messages[0].id;
                }
                console.log(`[WHATSAPP_SEND_SUCCESS] Message ID: ${whatsappMessageId}`);
            } catch (err) {
                console.error("[WHATSAPP_SEND_FAILED]", err.message);
                throw err;
            }
        } else {
            // Mode simulation / dev sans credentials Meta
            whatsappMessageId = `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            console.log(`[WHATSAPP_SEND_SUCCESS] (DEV MOCK) Mock ID: ${whatsappMessageId}`);
        }

        // 4. Enregistrement dans la base de données (SmsLog étendu)
        const messageLog = await prisma.smsLog.create({
            data: {
                companyId,
                clientId: client.id,
                direction: "OUTGOING",
                channel: "WHATSAPP",
                body: body.trim(),
                fromNumber: waConfig.displayNumber || "WhatsApp Business",
                toNumber: normalizedPhone,
                whatsappMessageId,
                externalMessageId: whatsappMessageId,
                whatsAppConnectionId: connectionId,
                status,
                isRead: true,
                autoType,
                attachments: attachments && attachments.length > 0 ? attachments : undefined,
                metadata
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        companyName: true
                    }
                }
            }
        });

        // 5. Émission en temps réel via Socket.io
        emitToCompany(companyId, "message:new", {
            type: "message:new",
            clientId: client.id,
            conversationId: client.id,
            message: messageLog
        });

        return messageLog;
    }

    /**
     * Traite les événements de webhooks WhatsApp entrants (Messages & Statuts)
     */
    async handleIncomingWebhook(payload) {
        if (!payload || payload.object !== "whatsapp_business_account") {
            return { handled: false };
        }

        const entries = payload.entry || [];
        const results = [];

        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field !== "messages") continue;
                const value = change.value || {};
                const metadata = value.metadata || {};
                const phoneNumberId = metadata.phone_number_id;

                // 1. Traitement des statuts de livraison / lecture (statuses)
                if (Array.isArray(value.statuses)) {
                    for (const statusObj of value.statuses) {
                        await this.handleStatusUpdate(statusObj);
                    }
                }

                // 2. Traitement des messages reçus (messages)
                if (Array.isArray(value.messages)) {
                    for (const msgObj of value.messages) {
                        const res = await this.handleIncomingMessage({
                            msgObj,
                            phoneNumberId,
                            contacts: value.contacts || []
                        });
                        results.push(res);
                    }
                }
            }
        }

        return { handled: true, results };
    }

    /**
     * Traite un message WhatsApp individuel reçu
     */
    async handleIncomingMessage({ msgObj, phoneNumberId, contacts }) {
        const from = msgObj.from; // e.g. "33612345678"
        const messageId = msgObj.id;
        const timestamp = msgObj.timestamp ? new Date(parseInt(msgObj.timestamp) * 1000) : new Date();

        let messageBody = "";
        let attachments = [];

        if (msgObj.type === "text") {
            messageBody = msgObj.text?.body || "";
        } else if (msgObj.type === "document") {
            messageBody = msgObj.document?.caption || "[Document joint]";
            attachments.push({
                type: "document",
                mimeType: msgObj.document?.mime_type,
                filename: msgObj.document?.filename,
                id: msgObj.document?.id
            });
        } else if (msgObj.type === "image") {
            messageBody = msgObj.image?.caption || "[Photo jointe]";
            attachments.push({
                type: "image",
                mimeType: msgObj.image?.mime_type,
                id: msgObj.image?.id
            });
        } else if (msgObj.type === "audio") {
            messageBody = "[Message vocal]";
        } else if (msgObj.type === "location") {
            messageBody = `[Position géographique : ${msgObj.location?.latitude}, ${msgObj.location?.longitude}]`;
        } else {
            messageBody = `[Message ${msgObj.type || 'WhatsApp'}]`;
        }

        // Idempotence : vérifier si le messageId a déjà été enregistré
        if (messageId) {
            const existing = await prisma.smsLog.findUnique({
                where: { whatsappMessageId: messageId }
            });
            if (existing) {
                console.log(`[WHATSAPP_DUPLICATE_IGNORED] Message ${messageId} déjà présent.`);
                return { isDuplicate: true, message: existing };
            }
        }

        // 1. ÉTAPE CLÉ MULTI-TENANT : Identifier l'entreprise propriétaire via le phoneNumberId Meta
        let company = null;
        let connection = null;

        if (phoneNumberId) {
            connection = await prisma.whatsAppConnection.findFirst({
                where: { phoneNumberId },
                include: { company: true }
            });

            if (connection) {
                company = connection.company;
                console.log(`[WHATSAPP_ROUTED_BY_PHONE_NUMBER_ID] Routé vers ${company.name} via phoneNumberId: ${phoneNumberId}`);
            }
        }

        // 2. Si pas de connection par phoneNumberId, fallback sur la première company active
        if (!company) {
            company = await prisma.company.findFirst({
                orderBy: { createdAt: "asc" }
            });
        }

        if (!company) {
            throw new Error("Aucune entreprise trouvée pour associer le message WhatsApp entrant.");
        }

        // 3. Recherche du client dans l'entreprise par numéro de téléphone
        const normalizedFrom = normalizePhoneNumber(`+${from}`) || `+${from}`;
        const phoneVariants = [
            normalizedFrom,
            from,
            from.replace(/\D/g, "").slice(-9)
        ].filter(Boolean);

        let client = await prisma.client.findFirst({
            where: {
                companyId: company.id,
                isActive: true,
                OR: phoneVariants.map(p => ({
                    phone: { contains: p }
                }))
            }
        });

        // 4. Si client introuvable, création automatique du contact
        if (!client) {
            const profileName = contacts?.[0]?.profile?.name || `Contact WhatsApp ${normalizedFrom}`;
            client = await prisma.client.create({
                data: {
                    companyId: company.id,
                    firstName: profileName.split(" ")[0] || "Client",
                    lastName: profileName.split(" ").slice(1).join(" ") || "WhatsApp",
                    phone: normalizedFrom,
                    address: "Reçu via WhatsApp",
                    source: "whatsapp",
                    preferredChannel: "WHATSAPP"
                }
            });
            console.log(`[WHATSAPP_CLIENT_AUTO_CREATED] Nouveau client créé: ${client.id} (${normalizedFrom})`);
        }

        // 5. Création de l'enregistrement de message
        const messageLog = await prisma.smsLog.create({
            data: {
                companyId: company.id,
                clientId: client.id,
                direction: "INCOMING",
                channel: "WHATSAPP",
                body: messageBody.trim(),
                fromNumber: normalizedFrom,
                toNumber: connection?.displayPhoneNumber || "WhatsApp",
                whatsappMessageId: messageId,
                externalMessageId: messageId,
                whatsAppConnectionId: connection?.id || null,
                status: "received",
                isRead: false,
                autoType: "incoming",
                attachments: attachments.length > 0 ? attachments : undefined,
                createdAt: timestamp
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        companyName: true
                    }
                }
            }
        });

        // 6. Notification in-app pour le gérant
        // 7. Émission temps réel dans la room de l'entreprise
        emitToCompany(company.id, "message:new", {
            type: "message:new",
            clientId: client.id,
            conversationId: client.id,
            message: messageLog
        });

        // 8. Arrêt automatique des relances Auto Rappel (Stop conditions)
        try {
            const { ReminderEngineService } = await import("../../../reminders/ReminderEngineService.js");
            await ReminderEngineService.handleClientReply({
                clientId: client.id,
                companyId: company.id,
                channel: "WHATSAPP",
                body: messageBody
            });
        } catch (stopErr) {
            console.error("[WHATSAPP AUTO RAPPEL STOP ON REPLY ERROR]:", stopErr.message);
        }

        return { success: true, message: messageLog, client, company };
    }

    /**
     * Traite un changement de statut WhatsApp (sent, delivered, read, failed)
     */
    async handleStatusUpdate(statusObj) {
        const { id: messageId, status, timestamp, errors } = statusObj;
        if (!messageId) return null;

        console.log(`[WHATSAPP_STATUS_UPDATE] MessageId: ${messageId}, Status: ${status}`);

        const message = await prisma.smsLog.findUnique({
            where: { whatsappMessageId: messageId }
        });

        if (!message) {
            console.warn(`[WHATSAPP_STATUS_NOT_FOUND] Aucun message trouvé pour l'ID ${messageId}`);
            return null;
        }

        const updateData = { status };
        if (status === "delivered") {
            updateData.deliveredAt = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();
        } else if (status === "read") {
            updateData.readAt = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();
        } else if (status === "failed" && errors && errors.length > 0) {
            updateData.errorCode = String(errors[0].code || "");
            updateData.errorMessage = errors[0].title || errors[0].message || "Échec d'envoi WhatsApp";
        }

        const updated = await prisma.smsLog.update({
            where: { id: message.id },
            data: updateData
        });

        emitToCompany(message.companyId, "message:status", {
            type: "message:status",
            clientId: message.clientId,
            conversationId: message.clientId,
            messageId: message.id,
            whatsappMessageId: messageId,
            status,
            deliveredAt: updateData.deliveredAt,
            readAt: updateData.readAt,
            errorCode: updateData.errorCode,
            errorMessage: updateData.errorMessage
        });

        return updated;
    }

    /**
     * Vérification de la disponibilité du canal WhatsApp pour un client
     */
    async isChannelAvailable(client, company) {
        if (!client?.phone) {
            return {
                available: false,
                reason: "Le client n'a pas de numéro de téléphone"
            };
        }

        const normalized = normalizePhoneNumber(client.phone);
        if (!normalized) {
            return {
                available: false,
                reason: "Numéro de téléphone client invalide"
            };
        }

        // Vérifier si la société a un compte WhatsApp connecté
        const connection = await prisma.whatsAppConnection.findFirst({
            where: { companyId: company.id, status: "CONNECTED" }
        });

        const hasGlobalConfig = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

        if (!connection && !hasGlobalConfig) {
            return {
                available: false,
                reason: "Aucun compte WhatsApp Business n'est connecté pour votre entreprise"
            };
        }

        return {
            available: true,
            phone: normalized,
            displayNumber: connection?.displayPhoneNumber || null
        };
    }
}

export const whatsAppProvider = new WhatsAppProvider();
export default whatsAppProvider;
