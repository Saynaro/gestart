import { prisma } from "../../config/db.js";
import { emitToCompany } from "../../config/socket.js";
import { twilioSmsProvider } from "./providers/sms/TwilioSmsProvider.js";
import { whatsAppProvider } from "./providers/whatsapp/WhatsAppProvider.js";
import { emailProvider } from "./providers/email/EmailProvider.js";

/**
 * Service Omnicanal Central (SMS, WhatsApp, Email)
 */
export const OmnichannelService = {
    /**
     * Map des providers disponibles
     */
    providers: {
        SMS: twilioSmsProvider,
        WHATSAPP: whatsAppProvider,
        EMAIL: emailProvider
    },

    /**
     * Obtient le provider correspondant à un canal
     */
    getProvider(channel) {
        const normalized = (channel || "SMS").toUpperCase();
        const provider = this.providers[normalized];
        if (!provider) {
            throw new Error(`Canal de messagerie non supporté : ${channel}`);
        }
        return provider;
    },

    /**
     * Envoi d'un message unifié sur n'importe quel canal
     */
    async sendMessage({
        companyId,
        clientId,
        channel = "SMS",
        body,
        subject,
        attachments = [],
        autoType = "manual",
        inReplyTo,
        references,
        threadId,
        metadata = {}
    }) {
        if (!companyId) throw new Error("CompanyId requis");
        if (!clientId) throw new Error("Destinataire (clientId) requis");

        const normalizedChannel = (channel || "SMS").toUpperCase();
        const provider = this.getProvider(normalizedChannel);

        // Validation spécifique Email
        if (normalizedChannel === "EMAIL" && (!subject || !subject.trim())) {
            throw new Error("L'objet est obligatoire pour l'envoi d'un email.");
        }

        // Déléguer l'envoi au provider approprié
        return await provider.sendMessage({
            companyId,
            clientId,
            body,
            subject,
            attachments,
            autoType,
            inReplyTo,
            references,
            threadId,
            metadata
        });
    },

    /**
     * Détermine la disponibilité des canaux et le canal par défaut intelligent pour un client
     */
    async getClientChannelsAvailability(companyId, clientId) {
        const [client, company, lastInbound] = await Promise.all([
            prisma.client.findFirst({
                where: { id: clientId, companyId, isActive: true }
            }),
            prisma.company.findUnique({
                where: { id: companyId }
            }),
            prisma.smsLog.findFirst({
                where: {
                    companyId,
                    clientId,
                    direction: "INCOMING"
                },
                orderBy: { createdAt: "desc" }
            })
        ]);

        if (!client) {
            throw new Error("Client introuvable ou accès non autorisé");
        }

        // Vérification de chaque canal
        const [smsAvail, waAvail, emailAvail] = await Promise.all([
            this.providers.SMS.isChannelAvailable(client, company),
            this.providers.WHATSAPP.isChannelAvailable(client, company),
            this.providers.EMAIL.isChannelAvailable(client, company)
        ]);

        const channels = {
            SMS: {
                id: "SMS",
                label: "SMS",
                icon: "📱",
                available: smsAvail.available,
                reason: smsAvail.reason || null,
                address: smsAvail.phone || client.phone
            },
            WHATSAPP: {
                id: "WHATSAPP",
                label: "WhatsApp",
                icon: "🟢",
                available: waAvail.available,
                reason: waAvail.reason || null,
                address: waAvail.phone || client.phone
            },
            EMAIL: {
                id: "EMAIL",
                label: "Email",
                icon: "✉️",
                available: emailAvail.available,
                reason: emailAvail.reason || null,
                address: client.email || null
            }
        };

        // Règle de sélection intelligente :
        // 1. Dernier canal utilisé par le client (message entrant)
        let defaultChannel = null;
        let defaultReason = "";

        if (lastInbound && lastInbound.channel && channels[lastInbound.channel]?.available) {
            defaultChannel = lastInbound.channel;
            defaultReason = `Canal du dernier message reçu du client (${lastInbound.channel})`;
        }

        // 2. Si pas de message récent, utiliser le canal préféré configuré sur la fiche client
        if (!defaultChannel && client.preferredChannel && channels[client.preferredChannel]?.available) {
            defaultChannel = client.preferredChannel;
            defaultReason = `Canal préféré configuré (${client.preferredChannel})`;
        }

        // 3. Fallbacks automatiques si disponible
        if (!defaultChannel) {
            if (channels.SMS.available) {
                defaultChannel = "SMS";
                defaultReason = "Fallback par défaut (SMS)";
            } else if (channels.WHATSAPP.available) {
                defaultChannel = "WHATSAPP";
                defaultReason = "Fallback par défaut (WhatsApp)";
            } else if (channels.EMAIL.available) {
                defaultChannel = "EMAIL";
                defaultReason = "Fallback par défaut (Email)";
            } else {
                defaultChannel = "SMS";
                defaultReason = "Aucun canal entièrement configuré";
            }
        }

        return {
            client: {
                id: client.id,
                name: `${client.firstName} ${client.lastName}`.trim() || client.companyName,
                phone: client.phone,
                email: client.email,
                preferredChannel: client.preferredChannel
            },
            channels,
            recommendedChannel: defaultChannel,
            recommendationReason: defaultReason
        };
    },

    /**
     * Récupère la boîte de réception omnicanale unifiée
     */
    async getOmnichannelInbox(params) {
        return this.getConversationsList(params);
    },

    async getConversationsList({
        companyId,
        channel,
        unreadOnly = false,
        search = "",
        page = 1,
        limit = 50
    }) {
        // Synchroniser les emails récents de la boîte Gmail connectée
        try {
            await emailProvider.syncGoogleInbox(companyId);
        } catch (syncErr) {
            console.warn("[GMAIL_SYNC_LIST_WARN]", syncErr.message);
        }

        const skip = (page - 1) * limit;

        // Filtre client
        const clientWhere = {
            companyId,
            isActive: true,
            smsLogs: {
                some: {
                    ...(channel ? { channel: channel.toUpperCase() } : {}),
                    ...(unreadOnly ? { isRead: false, direction: "INCOMING" } : {})
                }
            }
        };

        if (search && search.trim()) {
            const q = search.trim();
            clientWhere.OR = [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { companyName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                {
                    smsLogs: {
                        some: {
                            body: { contains: q, mode: "insensitive" }
                        }
                    }
                }
            ];
        }

        const clients = await prisma.client.findMany({
            where: clientWhere,
            skip,
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                phone: true,
                email: true,
                preferredChannel: true,
                status: true,
                updatedAt: true,
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

        const conversations = clients.map(client => {
            const lastMsg = client.smsLogs[0] || null;
            return {
                id: client.id,
                clientId: client.id,
                name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.companyName || client.phone || "Client",
                client: {
                    id: client.id,
                    firstName: client.firstName,
                    lastName: client.lastName,
                    companyName: client.companyName,
                    phone: client.phone,
                    email: client.email,
                    preferredChannel: client.preferredChannel,
                    status: client.status
                },
                lastMessage: lastMsg,
                time: lastMsg?.createdAt || client.updatedAt,
                unreadCount: client._count.smsLogs,
                channel: lastMsg?.channel || client.preferredChannel || "SMS"
            };
        });

        return { conversations };
    },

    /**
     * Récupère la conversation chronologique complète avec un client
     */
    async getClientTimeline({ companyId, clientId, channelFilter }) {
        // Synchronisation automatique en arrière-plan des emails Gmail entrants
        emailProvider.syncGoogleInbox(companyId).catch(err => {
            console.warn("[GMAIL_BG_SYNC_WARN]", err.message);
        });

        // Multi-tenant check
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId, isActive: true },
            include: {
                equipment: true,
                interventions: {
                    orderBy: { scheduledAt: "desc" },
                    take: 25
                },
                invoices: {
                    where: { companyId },
                    include: {
                        lines: { orderBy: { position: "asc" } },
                        client: true,
                        company: true,
                        sourceQuote: {
                            include: { client: true, lines: true }
                        }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 25
                },
                quotes: {
                    where: { companyId },
                    include: {
                        lines: { orderBy: { position: "asc" } },
                        client: true,
                        company: true,
                        invoices: {
                            include: { client: true, lines: true }
                        }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 25
                }
            }
        });

        if (!client) {
            throw new Error("Client introuvable ou accès non autorisé");
        }

        const whereMsg = { clientId, companyId };
        if (channelFilter) {
            whereMsg.channel = channelFilter.toUpperCase();
        }

        const messages = await prisma.smsLog.findMany({
            where: whereMsg,
            orderBy: { createdAt: "asc" },
            include: {
                whatsAppConnection: {
                    select: { id: true, displayPhoneNumber: true, verifiedName: true }
                },
                emailConnection: {
                    select: { id: true, emailAddress: true, provider: true }
                }
            }
        });

        // Récupérer la disponibilité des canaux
        const availability = await this.getClientChannelsAvailability(companyId, clientId);

        return {
            client,
            messages,
            channels: availability.channels,
            recommendedChannel: availability.recommendedChannel,
            recommendationReason: availability.recommendationReason
        };
    },

    /**
     * Marque tous les messages d'un client comme lus
     */
    async markAsRead({ companyId, clientId }) {
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

        // Émission temps réel
        emitToCompany(companyId, "message:read", {
            clientId,
            conversationId: clientId
        });

        return { success: true };
    },

    /**
     * Comptage global des messages non lus par entreprise et par canal
     */
    async getUnreadCounts(companyId) {
        const [total, bySms, byWhatsApp, byEmail] = await Promise.all([
            prisma.smsLog.count({
                where: { companyId, isRead: false, direction: "INCOMING" }
            }),
            prisma.smsLog.count({
                where: { companyId, isRead: false, direction: "INCOMING", channel: "SMS" }
            }),
            prisma.smsLog.count({
                where: { companyId, isRead: false, direction: "INCOMING", channel: "WHATSAPP" }
            }),
            prisma.smsLog.count({
                where: { companyId, isRead: false, direction: "INCOMING", channel: "EMAIL" }
            })
        ]);

        return {
            total,
            sms: bySms,
            whatsapp: byWhatsApp,
            email: byEmail
        };
    }
};

export default OmnichannelService;
