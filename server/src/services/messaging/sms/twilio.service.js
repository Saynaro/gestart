import twilio from "twilio";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { prisma } from "../../../config/db.js";
import { emitToCompany } from "../../../config/socket.js";

/**
 * Normalise un numéro de téléphone au format E.164 (+33612345678)
 * @param {string} rawPhone 
 * @param {string} [defaultCountry="FR"] 
 * @returns {string|null}
 */
export const normalizePhoneNumber = (rawPhone, defaultCountry = "FR") => {
    if (!rawPhone || typeof rawPhone !== "string") return null;

    const cleaned = rawPhone.trim();
    const phoneNumber = parsePhoneNumberFromString(cleaned, defaultCountry);

    if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.number; // Format E.164 international standard
    }

    // Fallback pour les numéros français sans indicatif (06..., 07...)
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length === 10 && (digitsOnly.startsWith("06") || digitsOnly.startsWith("07") || digitsOnly.startsWith("01") || digitsOnly.startsWith("02") || digitsOnly.startsWith("03") || digitsOnly.startsWith("04") || digitsOnly.startsWith("05") || digitsOnly.startsWith("09"))) {
        return `+33${digitsOnly.slice(1)}`;
    }

    return null;
};

/**
 * Obtient le numéro expéditeur pour une entreprise donnée (multi-tenant)
 * @param {string} companyId 
 * @returns {Promise<string|null>}
 */
export const getSmsSender = async (companyId) => {
    try {
        if (companyId) {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { smsNumber: true }
            });

            if (company?.smsNumber) {
                const normalized = normalizePhoneNumber(company.smsNumber);
                if (normalized) return normalized;
            }
        }
    } catch (err) {
        console.error("[SMS SENDER RESOLUTION ERROR]", err.message);
    }

    // Fallback sur le numéro Twilio global configuré dans l'environnement
    const globalNumber = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_PHONE_NUMBER;
    return globalNumber ? (normalizePhoneNumber(globalNumber) || globalNumber) : null;
};

/**
 * Helper pour incrémenter l'utilisation mensuelle de SMS d'une société
 * @param {string} companyId 
 * @param {number} count 
 */
export const incrementSmsUsage = async (companyId, count = 1) => {
    if (!companyId) return;
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        await prisma.subscription.updateMany({
            where: { companyId },
            data: {
                smsUsedThisMonth: { increment: count }
            }
        });

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
        console.error("[SMS USAGE INCREMENT ERROR]", error.message);
    }
};

/**
 * Validation cryptographique de la signature Twilio
 * @param {import("express").Request} req 
 * @returns {boolean}
 */
export const validateTwilioWebhookSignature = (req) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.headers["x-twilio-signature"];

    // En développement local sans signature fournie, autoriser si non configuré
    if (!authToken || !signature) {
        if (process.env.NODE_ENV === "production") {
            console.warn("[TWILIO_WEBHOOK_REJECTED] Missing signature or auth token in production.");
            return false;
        }
        return true;
    }

    try {
        // Reconstitution de l'URL complète reçue
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const url = `${protocol}://${host}${req.originalUrl}`;

        const isValid = twilio.validateRequest(
            authToken,
            signature,
            url,
            req.body || {}
        );

        if (!isValid) {
            console.warn(`[TWILIO_WEBHOOK_REJECTED] Invalid signature for URL: ${url}`);
        }
        return isValid;
    } catch (err) {
        console.error("[TWILIO_WEBHOOK_REJECTED] Error during signature validation:", err.message);
        return false;
    }
};

/**
 * Service Principal Twilio SMS
 */
export const TwilioSmsService = {
    /**
     * Envoie un SMS à un client
     * @param {Object} params
     * @param {string} params.companyId
     * @param {string} params.clientId
     * @param {string} params.body
     * @param {string} [params.autoType="manual"]
     * @param {string} [params.statusCallbackUrl]
     */
    async sendSms({ companyId, clientId, body, autoType = "manual", statusCallbackUrl }) {
        console.log(`[SMS_SEND_STARTED] Company: ${companyId}, Client: ${clientId}`);

        if (!body || !body.trim()) {
            throw new Error("Le contenu du message ne peut pas être vide.");
        }

        // 1. Vérification et chargement du client
        const client = await prisma.client.findFirst({
            where: {
                id: clientId,
                companyId,
                isActive: true
            }
        });

        if (!client) {
            throw new Error("Client introuvable ou n'appartenant pas à cette entreprise.");
        }

        if (!client.phone) {
            throw new Error("Ce client n'a pas de numéro de téléphone.");
        }

        // 2. Normalisation du numéro de téléphone destinataire
        const normalizedTo = normalizePhoneNumber(client.phone);
        if (!normalizedTo) {
            console.warn(`[SMS_SEND_FAILED] Invalid phone number: ${client.phone}`);
            throw new Error("Le numéro de téléphone du client est invalide.");
        }

        // 3. Résolution de l'expéditeur de l'entreprise
        const sender = await getSmsSender(companyId);
        if (!sender) {
            console.warn(`[SMS_SEND_FAILED] Missing SMS sender for company: ${companyId}`);
            throw new Error("Aucun numéro SMS expéditeur configuré pour cette société.");
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        let twilioMessageSid = null;
        let smsStatus = "sent";

        const isRealTwilioCreds = Boolean(
            accountSid &&
            authToken &&
            accountSid.startsWith("AC") &&
            !accountSid.includes("XXXX") &&
            !authToken.includes("your_") &&
            process.env.TWILIO_MOCK !== "true" &&
            process.env.NODE_ENV !== "test"
        );

        const statusUrl = statusCallbackUrl ||
            process.env.TWILIO_STATUS_CALLBACK_URL ||
            (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/v1/webhooks/twilio/status` : undefined);

        // 4. Envoi via Twilio SDK si de vraies credentials sont configurées
        if (isRealTwilioCreds) {
            try {
                const clientTwilio = twilio(accountSid, authToken);
                const twilioResponse = await clientTwilio.messages.create({
                    body: body.trim(),
                    from: sender,
                    to: normalizedTo,
                    ...(statusUrl ? { statusCallback: statusUrl } : {})
                });

                twilioMessageSid = twilioResponse.sid;
                smsStatus = twilioResponse.status || "sent";
                console.log(`[SMS_SEND_SUCCESS] Twilio SID: ${twilioMessageSid}, Status: ${smsStatus}`);
            } catch (twilioErr) {
                console.error(`[SMS_SEND_FAILED] Twilio API Error: ${twilioErr.message}`);
                throw new Error(`Erreur d'envoi Twilio: ${twilioErr.message}`);
            }
        } else {
            // Mode Mock de simulation / dev / test
            twilioMessageSid = `SM_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            console.log(`[SMS_SEND_SUCCESS] (DEV MOCK) Mock Twilio SID: ${twilioMessageSid}`);
        }

        // 5. Sauvegarde du message dans SmsLog
        const smsLog = await prisma.smsLog.create({
            data: {
                companyId,
                clientId: client.id,
                direction: "OUTGOING",
                channel: "SMS",
                body: body.trim(),
                fromNumber: sender,
                toNumber: normalizedTo,
                twilioSid: twilioMessageSid,
                status: smsStatus,
                isRead: true,
                autoType
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

        // 6. Incrémentation du compteur d'utilisation
        await incrementSmsUsage(companyId, 1);

        // 7. Notification temps réel via Socket.io
        emitToCompany(companyId, "message:new", {
            type: "message:new",
            clientId: client.id,
            conversationId: client.id,
            message: smsLog
        });

        return smsLog;
    },

    /**
     * Traite un SMS entrant reçu via Webhook Twilio
     * @param {Object} params
     * @param {string} params.from
     * @param {string} params.to
     * @param {string} params.body
     * @param {string} params.messageSid
     * @param {any} [params.rawPayload]
     */
    async handleIncomingSms({ from, to, body, messageSid, rawPayload }) {
        console.log(`[SMS_RECEIVED] From: ${from}, To: ${to}, MessageSid: ${messageSid}`);

        if (!from || !body) {
            throw new Error("Numéro expéditeur ou contenu manquant");
        }

        // 1. Idempotence : Vérification si le MessageSid a déjà été enregistré
        if (messageSid) {
            const existingLog = await prisma.smsLog.findUnique({
                where: { twilioSid: messageSid }
            });
            if (existingLog) {
                console.log(`[SMS_DUPLICATE_WEBHOOK_IGNORED] MessageSid ${messageSid} déjà enregistré.`);
                return { isDuplicate: true, smsLog: existingLog };
            }
        }

        const normalizedFrom = normalizePhoneNumber(from);
        const normalizedTo = normalizePhoneNumber(to) || to;

        if (!normalizedFrom) {
            console.warn(`[SMS_RECEIVED_WARNING] Cannot normalize sender phone: ${from}`);
        }

        // 2. ÉTAPE 1: Recherche par numéro dédié d'entreprise (Company.smsNumber)
        let company = null;
        let client = null;

        if (normalizedTo) {
            company = await prisma.company.findFirst({
                where: { smsNumber: normalizedTo }
            });
        }

        const phoneVariants = [
            normalizedFrom,
            from.replace(/\s+/g, ""),
            from.replace(/\D/g, "").slice(-9) // 9 derniers chiffres
        ].filter(Boolean);

        // 3. ÉTAPE 2 (Numéro partagé): Recherche par Contexte de Conversation Récente (Active Thread)
        // Si une entreprise a envoyé un SMS à ce numéro récemment, la réponse lui revient en priorité absolue
        const recentOutbound = await prisma.smsLog.findFirst({
            where: {
                direction: "OUTGOING",
                OR: phoneVariants.map(p => ({
                    toNumber: { contains: p }
                }))
            },
            orderBy: { createdAt: "desc" },
            include: {
                company: true,
                client: true
            }
        });

        if (recentOutbound && (!company || company.id === recentOutbound.companyId)) {
            company = recentOutbound.company;
            client = recentOutbound.client;
            console.log(`[SMS_ROUTED_BY_THREAD] Routé vers ${company.name} via le fil de discussion récent.`);
        }

        // 4. ÉTAPE 3: Si pas de fil récent, recherche du client dans la base de données
        if (!client && company) {
            // Recherche dans l'entreprise du numéro dédié
            client = await prisma.client.findFirst({
                where: {
                    companyId: company.id,
                    isActive: true,
                    OR: phoneVariants.map(p => ({
                        phone: { contains: p }
                    }))
                }
            });
        }

        if (!client) {
            // Recherche du client parmi toutes les entreprises (trié par mise à jour la plus récente)
            const foundClient = await prisma.client.findFirst({
                where: {
                    isActive: true,
                    OR: phoneVariants.map(p => ({
                        phone: { contains: p }
                    }))
                },
                include: { company: true },
                orderBy: { updatedAt: "desc" }
            });

            if (foundClient) {
                client = foundClient;
                company = foundClient.company;
                console.log(`[SMS_ROUTED_BY_CLIENT] Routé vers ${company.name} car le client y est enregistré.`);
            }
        }

        // 5. ÉTAPE 4: Fallback si numéro inconnu
        if (!company) {
            company = await prisma.company.findFirst({
                orderBy: { createdAt: "asc" }
            });
        }

        if (!company) {
            throw new Error("Aucune entreprise trouvée pour associer le SMS entrant.");
        }

        // Si le client n'existe toujours pas dans cette entreprise, créer un contact automatique "Client SMS"
        if (!client) {
            const displayPhone = normalizedFrom || from;
            client = await prisma.client.create({
                data: {
                    companyId: company.id,
                    firstName: "Contact",
                    lastName: displayPhone,
                    phone: displayPhone,
                    address: "Reçu par SMS",
                    source: "sms"
                }
            });
            console.log(`[SMS_CLIENT_AUTO_CREATED] Nouveau contact client créé: ${client.id} (${displayPhone})`);
        }

        // 4. Enregistrement du message entrant dans SmsLog
        const smsLog = await prisma.smsLog.create({
            data: {
                companyId: company.id,
                clientId: client.id,
                direction: "INCOMING",
                channel: "SMS",
                body: body.trim(),
                fromNumber: normalizedFrom || from,
                toNumber: normalizedTo,
                twilioSid: messageSid || null,
                status: "received",
                isRead: false,
                autoType: "incoming"
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

        // 5. Création d'une notification in-app pour le gérant / owner
        try {
            const owner = await prisma.user.findFirst({
                where: { companyId: company.id, role: "OWNER" }
            });

            if (owner) {
                const notification = await prisma.notification.create({
                    data: {
                        companyId: company.id,
                        userId: owner.id,
                        type: "NEW_MESSAGE_RECEIVED",
                        channel: "IN_APP",
                        status: "SENT",
                        title: `Nouveau SMS de ${client.firstName} ${client.lastName}`,
                        body: body.length > 100 ? `${body.slice(0, 97)}...` : body,
                        entityType: "sms",
                        entityId: smsLog.id,
                        data: {
                            clientId: client.id,
                            smsLogId: smsLog.id
                        }
                    }
                });

                emitToCompany(company.id, "notification:new", {
                    type: "notification:new",
                    notification
                });
            }
        } catch (notifErr) {
            console.error("[SMS INCOMING NOTIFICATION ERROR]", notifErr.message);
        }

        // 6. Émission temps réel dans la room de l'entreprise
        emitToCompany(company.id, "message:new", {
            type: "message:new",
            clientId: client.id,
            conversationId: client.id,
            message: smsLog
        });

        return { success: true, smsLog, client, company };
    },

    /**
     * Traite les changements d'état d'un SMS (sent, delivered, failed, undelivered)
     * @param {Object} params
     * @param {string} params.messageSid
     * @param {string} params.messageStatus
     * @param {string} [params.errorCode]
     * @param {string} [params.errorMessage]
     */
    async handleStatusCallback({ messageSid, messageStatus, errorCode, errorMessage }) {
        console.log(`[SMS_STATUS_UPDATED] SID: ${messageSid}, Status: ${messageStatus}`);

        if (!messageSid) return null;

        const smsLog = await prisma.smsLog.findUnique({
            where: { twilioSid: messageSid }
        });

        if (!smsLog) {
            console.warn(`[SMS_STATUS_NOT_FOUND] Aucun SmsLog trouvé pour le SID ${messageSid}`);
            return null;
        }

        const updated = await prisma.smsLog.update({
            where: { id: smsLog.id },
            data: {
                status: messageStatus
            }
        });

        // Diffusion du changement de statut en temps réel
        emitToCompany(smsLog.companyId, "message:status", {
            type: "message:status",
            clientId: smsLog.clientId,
            conversationId: smsLog.clientId,
            messageId: smsLog.id,
            twilioSid: messageSid,
            status: messageStatus,
            errorCode: errorCode || null,
            errorMessage: errorMessage || null
        });

        return updated;
    }
};

export default TwilioSmsService;
