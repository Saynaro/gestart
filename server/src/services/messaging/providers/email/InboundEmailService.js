import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../../../../config/db.js";
import { emitToCompany } from "../../../../config/socket.js";
import { decryptCredential } from "../../../../modules/e-invoicing/services/EncryptionService.js";
import { cloudinary } from "../../../../config/cloudinary.js";

/**
 * Upload an attachment buffer to Cloudinary
 */
async function uploadAttachmentToCloudinary(buffer, filename, mimeType) {
    return new Promise((resolve, reject) => {
        const isImage = (mimeType || "").startsWith("image/");
        const resourceType = isImage ? "image" : "raw";
        const safeName = (filename || "piece_jointe").replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "gestart/inbound_attachments",
                public_id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`,
                resource_type: resourceType,
                use_filename: false,
                overwrite: false
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        uploadStream.end(buffer);
    });
}

class InboundEmailService {
    constructor() {
        this.isRelaySyncing = false;
        this.activeCompanySyncs = new Set();
    }

    /**
     * Nettoie le corps du texte (retire les citations répétées d'emails précédents)
     */
    cleanBodyText(rawText) {
        if (!rawText) return "";
        let text = rawText.replace(/\r\n/g, "\n");
        // Couper au niveau des marqueurs de réponse courants (Le ... a écrit : / On ... wrote:)
        const replyMarkers = [
            /\n[-_]{2,}\s*Original Message\s*[-_]{2,}/i,
            /\nLe\s+\d{1,2}\s+[a-zéû]+\s+\d{4}.*?a écrit\s*:/i,
            /\nOn\s+.*?wrote\s*:/i,
            /\nDe\s*:\s*.*?\nEnvoyé\s*:/i,
            /\nFrom\s*:\s*.*?\nSent\s*:/i
        ];
        for (const marker of replyMarkers) {
            const match = text.search(marker);
            if (match !== -1) {
                text = text.substring(0, match);
            }
        }
        return text.trim();
    }

    /**
     * Synchronise le relais central GestArt (support.gestart@gmail.com)
     * Capture les réponses des clients aux devis, factures et messages du CRM
     */
    async syncRelayInbox() {
        const user = process.env.SMTP_USER || "support.gestart@gmail.com";
        const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";
        const host = process.env.IMAP_HOST || "imap.gmail.com";
        const port = parseInt(process.env.IMAP_PORT || "993", 10);

        if (!user || !pass) {
            return { synced: 0, reason: "SMTP_USER ou SMTP_PASS non configuré" };
        }

        if (this.isRelaySyncing) {
            return { synced: 0, reason: "Sync déjà en cours" };
        }

        this.isRelaySyncing = true;
        let syncedCount = 0;

        const client = new ImapFlow({
            host,
            port,
            secure: port === 993,
            auth: { user, pass },
            logger: false
        });

        try {
            await client.connect();
            const lock = await client.getMailboxLock("INBOX");

            try {
                // Recherche des messages non lus ou récents
                const messagesList = await client.search({ seen: false }, { uid: true });
                const uids = Array.isArray(messagesList) ? messagesList : [];

                // Traiter les 25 derniers messages max par passage
                const targetUids = uids.slice(-25);

                for (const uid of targetUids) {
                    try {
                        const messageData = await client.download(String(uid), undefined, { uid: true });
                        if (!messageData?.content) continue;

                        const parsed = await simpleParser(messageData.content);

                        const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase()?.trim() || "";
                        const fromName = parsed.from?.value?.[0]?.name || fromEmail;
                        const toEmail = parsed.to?.value?.[0]?.address?.toLowerCase()?.trim() || user;
                        const subject = parsed.subject || "Sans objet";
                        const inReplyTo = parsed.inReplyTo || null;
                        const references = Array.isArray(parsed.references) ? parsed.references.join(" ") : (parsed.references || null);
                        const messageIdHeader = parsed.messageId || `<${uid}@gestart.relay>`;
                        const rawBody = parsed.text || parsed.html || "";
                        const bodyText = this.cleanBodyText(rawBody) || parsed.text || "Message sans texte";

                        // Vérifier si le message a déjà été importé
                        const existingLog = await prisma.smsLog.findFirst({
                            where: {
                                OR: [
                                    { emailMessageId: messageIdHeader },
                                    { externalMessageId: messageIdHeader }
                                ]
                            }
                        });
                        if (existingLog) {
                            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
                            continue;
                        }

                        // Résolution de l'entreprise et du client :
                        let resolvedCompanyId = null;
                        let resolvedClientId = null;

                        // 1. Par Message-ID parent (In-Reply-To ou References)
                        if (inReplyTo || references) {
                            const idsToSearch = [
                                ...(inReplyTo ? [inReplyTo, inReplyTo.replace(/^<|>$/g, "")] : []),
                                ...(references ? references.split(/\s+/).map(r => r.replace(/^<|>$/g, "")) : [])
                            ].filter(Boolean);

                            const parentLog = await prisma.smsLog.findFirst({
                                where: {
                                    OR: idsToSearch.map(id => ({ emailMessageId: id }))
                                },
                                include: { client: true }
                            });

                            if (parentLog?.companyId && parentLog?.clientId) {
                                resolvedCompanyId = parentLog.companyId;
                                resolvedClientId = parentLog.clientId;
                            }
                        }

                        // 2. Par numéro de document dans l'objet (ex: Devis D-102 ou Facture F-102)
                        if (!resolvedClientId && subject) {
                            const quoteMatch = subject.match(/(?:Devis|Quote)\s+([A-Za-z0-9_-]+)/i);
                            if (quoteMatch && quoteMatch[1]) {
                                const quoteDoc = await prisma.quote.findFirst({
                                    where: { number: quoteMatch[1].trim() }
                                });
                                if (quoteDoc) {
                                    resolvedCompanyId = quoteDoc.companyId;
                                    resolvedClientId = quoteDoc.clientId;
                                }
                            }

                            if (!resolvedClientId) {
                                const invoiceMatch = subject.match(/(?:Facture|Invoice)\s+([A-Za-z0-9_-]+)/i);
                                if (invoiceMatch && invoiceMatch[1]) {
                                    const invoiceDoc = await prisma.invoice.findFirst({
                                        where: { number: invoiceMatch[1].trim() }
                                    });
                                    if (invoiceDoc) {
                                        resolvedCompanyId = invoiceDoc.companyId;
                                        resolvedClientId = invoiceDoc.clientId;
                                    }
                                }
                            }
                        }

                        // 3. Par correspondance directe de l'adresse email de l'expéditeur
                        if (!resolvedClientId && fromEmail && fromEmail !== user) {
                            const matchingClient = await prisma.client.findFirst({
                                where: {
                                    email: { equals: fromEmail, mode: "insensitive" },
                                    isActive: true
                                }
                            });

                            if (matchingClient) {
                                resolvedCompanyId = matchingClient.companyId;
                                resolvedClientId = matchingClient.id;
                            }
                        }

                        // Si aucun client de la CRM ne correspond, ignorer ce message
                        if (!resolvedCompanyId || !resolvedClientId) {
                            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
                            continue;
                        }

                        // Traitement des pièces jointes éventuelles
                        const preparedAttachments = [];
                        if (Array.isArray(parsed.attachments) && parsed.attachments.length > 0) {
                            for (const att of parsed.attachments) {
                                try {
                                    const cloudUrl = await uploadAttachmentToCloudinary(att.content, att.filename, att.contentType);
                                    preparedAttachments.push({
                                        filename: att.filename || "piece_jointe",
                                        url: cloudUrl,
                                        path: cloudUrl,
                                        size: att.size || att.content?.length || 0,
                                        contentType: att.contentType,
                                        isImage: (att.contentType || "").startsWith("image/")
                                    });
                                } catch (attErr) {
                                    console.warn("[INBOUND_RELAY] Erreur upload pièce jointe:", attErr.message);
                                }
                            }
                        }

                        // Création du message entrant dans la base de données
                        const newLog = await prisma.smsLog.create({
                            data: {
                                companyId: resolvedCompanyId,
                                clientId: resolvedClientId,
                                direction: "INCOMING",
                                channel: "EMAIL",
                                subject: subject.trim(),
                                body: bodyText,
                                fromEmail,
                                toEmail,
                                emailMessageId: messageIdHeader,
                                externalMessageId: messageIdHeader,
                                threadId: inReplyTo || messageIdHeader,
                                inReplyTo,
                                references,
                                attachments: preparedAttachments.length > 0 ? preparedAttachments : undefined,
                                status: "DELIVERED",
                                isRead: false,
                                autoType: "incoming",
                                createdAt: parsed.date || new Date()
                            },
                            include: {
                                client: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phone: true,
                                        companyName: true
                                    }
                                }
                            }
                        });

                        // Notification temps réel via Socket.io pour mise à jour immédiate du chat
                        emitToCompany(resolvedCompanyId, "message:new", {
                            type: "message:new",
                            clientId: resolvedClientId,
                            conversationId: resolvedClientId,
                            message: newLog
                        });

                        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
                        syncedCount++;
                        console.log(`[INBOUND_RELAY_SYNC] Message reçu de ${fromEmail} (Client: ${resolvedClientId})`);
                    } catch (itemErr) {
                        console.error("[INBOUND_RELAY_ITEM_ERROR]", itemErr.message);
                    }
                }
            } finally {
                lock.release();
            }

            await client.logout();
        } catch (err) {
            console.error("[INBOUND_RELAY_CONNECT_ERROR]", err.message);
        } finally {
            this.isRelaySyncing = false;
        }

        return { synced: syncedCount };
    }

    /**
     * Synchronise la boîte IMAP personnalisée d'un artisan (si configurée avec mot de passe d'application Google ou SMTP/IMAP)
     */
    async syncCompanyImap(companyId) {
        if (!companyId || this.activeCompanySyncs.has(companyId)) {
            return { synced: 0 };
        }

        const connection = await prisma.emailConnection.findFirst({
            where: {
                companyId,
                status: "CONNECTED",
                provider: "SMTP"
            }
        });

        if (!connection || !connection.encryptedSmtpPass || !connection.emailAddress) {
            return { synced: 0 };
        }

        this.activeCompanySyncs.add(companyId);
        let syncedCount = 0;

        let pass = "";
        try {
            pass = decryptCredential(connection.encryptedSmtpPass);
        } catch (e) {
            this.activeCompanySyncs.delete(companyId);
            return { synced: 0, error: "Déchiffrement mot de passe échoué" };
        }

        const isGmail = (connection.smtpHost || "").includes("gmail") || connection.emailAddress.includes("@gmail.com");
        const host = isGmail ? "imap.gmail.com" : (connection.smtpHost?.replace(/^smtp\./i, "imap.") || "imap.gmail.com");
        const port = 993;

        const client = new ImapFlow({
            host,
            port,
            secure: true,
            auth: {
                user: connection.smtpUser || connection.emailAddress,
                pass
            },
            logger: false
        });

        try {
            await client.connect();
            const lock = await client.getMailboxLock("INBOX");

            try {
                const messagesList = await client.search({ seen: false }, { uid: true });
                const uids = Array.isArray(messagesList) ? messagesList.slice(-20) : [];

                for (const uid of uids) {
                    try {
                        const messageData = await client.download(String(uid), undefined, { uid: true });
                        if (!messageData?.content) continue;

                        const parsed = await simpleParser(messageData.content);
                        const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase()?.trim() || "";
                        const subject = parsed.subject || "Sans objet";
                        const messageIdHeader = parsed.messageId || `<${uid}@${connection.emailAddress}>`;
                        const rawBody = parsed.text || parsed.html || "";
                        const bodyText = this.cleanBodyText(rawBody) || parsed.text || "Message";

                        // Vérifier si déjà importé
                        const exists = await prisma.smsLog.findFirst({
                            where: {
                                companyId,
                                OR: [
                                    { emailMessageId: messageIdHeader },
                                    { externalMessageId: messageIdHeader }
                                ]
                            }
                        });
                        if (exists) {
                            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
                            continue;
                        }

                        // Trouver le client de cette entreprise
                        const clientRecord = await prisma.client.findFirst({
                            where: {
                                companyId,
                                email: { equals: fromEmail, mode: "insensitive" },
                                isActive: true
                            }
                        });

                        if (!clientRecord) {
                            // Ignorer les newsletters et emails non reliés aux clients CRM
                            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
                            continue;
                        }

                        const newLog = await prisma.smsLog.create({
                            data: {
                                companyId,
                                clientId: clientRecord.id,
                                direction: "INCOMING",
                                channel: "EMAIL",
                                subject: subject.trim(),
                                body: bodyText,
                                fromEmail,
                                toEmail: connection.emailAddress,
                                emailMessageId: messageIdHeader,
                                externalMessageId: messageIdHeader,
                                emailConnectionId: connection.id,
                                status: "DELIVERED",
                                isRead: false,
                                autoType: "incoming",
                                createdAt: parsed.date || new Date()
                            },
                            include: {
                                client: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phone: true,
                                        companyName: true
                                    }
                                }
                            }
                        });

                        emitToCompany(companyId, "message:new", {
                            type: "message:new",
                            clientId: clientRecord.id,
                            conversationId: clientRecord.id,
                            message: newLog
                        });

                        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
                        syncedCount++;
                    } catch (itemErr) {
                        console.warn("[COMPANY_IMAP_ITEM_ERROR]", itemErr.message);
                    }
                }
            } finally {
                lock.release();
            }

            await client.logout();
        } catch (err) {
            console.warn(`[COMPANY_IMAP_ERROR] ${connection.emailAddress}:`, err.message);
        } finally {
            this.activeCompanySyncs.delete(companyId);
        }

        return { synced: syncedCount };
    }
}

export const inboundEmailService = new InboundEmailService();
