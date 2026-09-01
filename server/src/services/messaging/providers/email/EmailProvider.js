import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MessageProvider } from "../../interfaces/MessageProvider.js";
import { prisma } from "../../../../config/db.js";
import { emitToCompany } from "../../../../config/socket.js";
import { decryptCredential, encryptCredential } from "../../../../modules/e-invoicing/services/EncryptionService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../../../../uploads/attachments");
if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
}

/**
 * Email Provider (Multi-tenant)
 * Supporte Google Workspace, Microsoft 365, SMTP dédié et fallback SMTP global
 */
export class EmailProvider extends MessageProvider {
    constructor() {
        super("EMAIL");
    }

    /**
     * Crée le transporteur d'envoi pour une entreprise
     * @param {string} companyId 
     * @returns {Promise<{ transporter: any, fromAddress: string, connectionId?: string }>}
     */
    async getCompanyTransporter(companyId) {
        if (companyId) {
            const connection = await prisma.emailConnection.findFirst({
                where: {
                    companyId,
                    status: "CONNECTED"
                },
                orderBy: { isDefault: "desc" }
            });

            if (connection) {
                // 1. Connexion SMTP dédiée
                if (connection.provider === "SMTP" && connection.smtpHost && connection.smtpUser) {
                    let pass = "";
                    if (connection.encryptedSmtpPass) {
                        try {
                            pass = decryptCredential(connection.encryptedSmtpPass);
                        } catch (e) {
                            console.error("[EMAIL] Erreur déchiffrement pass SMTP:", e.message);
                        }
                    }

                    const port = connection.smtpPort || 465;
                    const transporter = nodemailer.createTransport({
                        host: connection.smtpHost,
                        port,
                        secure: port === 465,
                        auth: {
                            user: connection.smtpUser,
                            pass
                        },
                        tls: { rejectUnauthorized: false }
                    });

                    const fromAddress = connection.displayName
                        ? `"${connection.displayName}" <${connection.emailAddress}>`
                        : connection.emailAddress;

                    return { transporter, fromAddress, connectionId: connection.id };
                }

                // 2. Connexion Google Workspace OAuth
                if (connection.provider === "GOOGLE") {
                    let accessToken = "";
                    if (connection.encryptedAccessToken) {
                        try {
                            accessToken = decryptCredential(connection.encryptedAccessToken);
                        } catch (e) {
                            console.error("[EMAIL] Erreur déchiffrement token Google:", e.message);
                        }
                    }

                    let refreshToken = undefined;
                    if (connection.encryptedRefreshToken) {
                        try {
                            refreshToken = decryptCredential(connection.encryptedRefreshToken);
                        } catch (e) {
                            console.error("[EMAIL] Erreur déchiffrement refreshToken Google:", e.message);
                        }
                    }

                    const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
                    const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 465,
                        secure: true,
                        auth: {
                            type: "OAuth2",
                            user: connection.emailAddress,
                            clientId: googleClientId,
                            clientSecret: googleClientSecret,
                            refreshToken: refreshToken || undefined,
                            accessToken: accessToken || undefined
                        }
                    });

                    const fromAddress = connection.displayName
                        ? `"${connection.displayName}" <${connection.emailAddress}>`
                        : connection.emailAddress;

                    return { transporter, fromAddress, connectionId: connection.id };
                }

                // 3. Connexion Microsoft 365 OAuth
                if (connection.provider === "MICROSOFT" && connection.encryptedAccessToken) {
                    let accessToken = "";
                    try {
                        accessToken = decryptCredential(connection.encryptedAccessToken);
                    } catch (e) {
                        console.error("[EMAIL] Erreur déchiffrement token Microsoft:", e.message);
                    }

                    const transporter = nodemailer.createTransport({
                        host: "smtp.office365.com",
                        port: 587,
                        secure: false,
                        auth: {
                            type: "OAuth2",
                            user: connection.emailAddress,
                            accessToken
                        },
                        tls: { ciphers: "SSLv3" }
                    });

                    const fromAddress = connection.displayName
                        ? `"${connection.displayName}" <${connection.emailAddress}>`
                        : connection.emailAddress;

                    return { transporter, fromAddress, connectionId: connection.id };
                }
            }
        }

        // Fallback sur le service SMTP global configuré dans l'environnement
        const host = process.env.SMTP_HOST || "smtp.gmail.com";
        const port = parseInt(process.env.SMTP_PORT || "465", 10);
        const user = process.env.SMTP_USER || "support.gestart@gmail.com";
        const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : "";

        if (user && pass) {
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: { rejectUnauthorized: false }
            });

            const fromAddress = process.env.EMAIL_FROM || `"GestArt CRM" <${user}>`;
            return { transporter, fromAddress, connectionId: null };
        }

        return { transporter: null, fromAddress: process.env.EMAIL_FROM || "contact@climpro.fr", connectionId: null };
    }

    /**
     * Envoie un email à un client
     */
    async sendMessage({
        companyId,
        clientId,
        subject,
        body,
        attachments = [],
        autoType = "manual",
        inReplyTo,
        references,
        threadId,
        metadata = {}
    }) {
        console.log(`[EMAIL_SEND_STARTED] Company: ${companyId}, Client: ${clientId}`);

        if (!subject || !subject.trim()) {
            subject = `Échange avec ${company?.name || "Client"}`;
        }

        const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
        const bodyContent = (body || "").trim();

        if (!bodyContent && !hasAttachments) {
            throw new Error("Le contenu de l'email ne peut pas être vide.");
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

        if (!client.email || !client.email.includes("@")) {
            throw new Error("Le client n'a pas d'adresse email valide renseignée.");
        }

        // 2. Chargement de l'entreprise et du transporteur
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        const { transporter, fromAddress, connectionId } = await this.getCompanyTransporter(companyId);

        // 3. Préparation des identifiants RFC de threading
        const domain = fromAddress.includes("@") ? fromAddress.split("@")[1].replace(/[>]/g, "") : "climpro.fr";
        const generatedMessageId = `<${Date.now()}.${crypto.randomBytes(8).toString("hex")}@${domain}>`;
        const activeThreadId = threadId || inReplyTo || generatedMessageId;

        // 4. Construction de l'HTML élégant
        const companyDisplayName = company?.name || "Votre Artisan";
        const htmlBody = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0F172A; color: #F8FAFC; border-radius: 12px; border: 1px solid #334155;">
                <div style="margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px;">
                    <h2 style="color: #FFFFFF; margin: 0 0 4px 0; font-size: 20px; font-weight: 700;">${companyDisplayName}</h2>
                    <p style="color: #94A3B8; font-size: 13px; margin: 0;">${subject.trim()}</p>
                </div>
                ${bodyContent ? `
                <div style="background: #1E293B; padding: 20px; border-radius: 8px; border: 1px solid #334155; font-size: 14.5px; line-height: 1.6; color: #E2E8F0; white-space: pre-wrap;">
${bodyContent}
                </div>` : `
                <div style="background: #1E293B; padding: 16px; border-radius: 8px; border: 1px solid #334155; font-size: 13.5px; color: #94A3B8; text-align: center;">
                    📎 Veuillez trouver la ou les pièce(s) jointe(s) à ce message.
                </div>`}
                <div style="text-align: center; margin-top: 20px; color: #64748B; font-size: 11.5px;">
                    <p style="margin: 0;">Envoyé par ${companyDisplayName} via ClimPro CRM</p>
                    <p style="margin: 4px 0 0 0;">Pour toute question, vous pouvez répondre directement à cet email.</p>
                </div>
            </div>
        `;

        let emailStatus = "sent";
        let messageIdHeader = generatedMessageId;

        // 4.5 Préparation des vrais fichiers PDF pour les Devis et Factures joints
        const preparedAttachments = [];
        if (Array.isArray(attachments) && attachments.length > 0) {
            for (const att of attachments) {
                try {
                    const isQuote = att.type === "quote" || att.type === "devis" || (att.filename && att.filename.toLowerCase().startsWith("devis_")) || (att.name && att.name.toLowerCase().startsWith("devis_"));
                    const isInvoice = att.type === "invoice" || att.type === "facture" || (att.filename && att.filename.toLowerCase().startsWith("facture_")) || (att.name && att.name.toLowerCase().startsWith("facture_"));

                    if (isQuote) {
                        const quoteNumber = att.number || (att.filename ? att.filename.replace(/^Devis_/i, "").replace(/\.pdf$/i, "") : null);
                        const quote = await prisma.quote.findFirst({
                            where: {
                                companyId,
                                OR: [
                                    ...(att.quoteId ? [{ id: att.quoteId }] : []),
                                    ...(att.id ? [{ id: att.id }] : []),
                                    ...(quoteNumber ? [{ number: quoteNumber }] : [])
                                ]
                            },
                            include: { lines: true, client: true, company: true }
                        });

                        if (quote) {
                            const { generateQuotePdfBuffer } = await import("../../../../utils/pdfGenerator.js");
                            const pdfBuf = await generateQuotePdfBuffer({
                                quote,
                                company: quote.company || company,
                                customization: quote.documentCustomization || company?.documentCustomization || {}
                            });
                            preparedAttachments.push({
                                filename: `Devis_${quote.number}.pdf`,
                                content: pdfBuf,
                                contentType: "application/pdf"
                            });
                            console.log(`[ATTACHMENT_QUOTE_PDF_GENERATED] Devis ${quote.number} (${pdfBuf.length} octets)`);
                            continue;
                        }
                    }

                    if (isInvoice) {
                        const invoiceNumber = att.number || (att.filename ? att.filename.replace(/^Facture_/i, "").replace(/\.pdf$/i, "") : null);
                        const invoice = await prisma.invoice.findFirst({
                            where: {
                                companyId,
                                OR: [
                                    ...(att.invoiceId ? [{ id: att.invoiceId }] : []),
                                    ...(att.id ? [{ id: att.id }] : []),
                                    ...(invoiceNumber ? [{ number: invoiceNumber }] : [])
                                ]
                            },
                            include: { lines: true, client: true, company: true }
                        });

                        if (invoice) {
                            const { generateInvoicePdfBuffer } = await import("../../../../utils/pdfGenerator.js");
                            const pdfBuf = await generateInvoicePdfBuffer({
                                invoice,
                                company: invoice.company || company,
                                customization: invoice.documentCustomization || company?.documentCustomization || {}
                            });
                            preparedAttachments.push({
                                filename: `Facture_${invoice.number}.pdf`,
                                content: pdfBuf,
                                contentType: "application/pdf"
                            });
                            console.log(`[ATTACHMENT_INVOICE_PDF_GENERATED] Facture ${invoice.number} (${pdfBuf.length} octets)`);
                            continue;
                        }
                    }

                    // Fichier personnalisé uploadé depuis l'ordinateur (base64 ou path)
                    if (att.data || att.base64) {
                        const rawBase64 = (att.data || att.base64).replace(/^data:.*?;base64,/, '');
                        const buf = Buffer.from(rawBase64, 'base64');
                        const safeName = (att.filename || att.name || "fichier").replace(/[^a-zA-Z0-9._-]/g, "_");
                        const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`;
                        const filePath = path.join(uploadDir, uniqueName);
                        await fs.promises.mkdir(uploadDir, { recursive: true });
                        await fs.promises.writeFile(filePath, buf);

                        const isImg = (att.mimeType || att.type || "").startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(safeName);
                        att.url = `/uploads/attachments/${uniqueName}`;
                        att.path = `/uploads/attachments/${uniqueName}`;
                        att.size = buf.length;
                        att.isImage = isImg;
                        delete att.data;
                        delete att.base64;

                        preparedAttachments.push({
                            filename: att.filename || att.name || safeName,
                            content: buf,
                            contentType: att.mimeType || att.contentType || (isImg ? "image/jpeg" : "application/octet-stream")
                        });
                        continue;
                    }

                    // Fallback pièce jointe standard
                    if (att.content || att.path || att.url) {
                        preparedAttachments.push({
                            filename: att.filename || att.name || "Document.pdf",
                            content: att.content || undefined,
                            path: att.url || att.path || undefined,
                            contentType: att.contentType || att.mimeType || "application/pdf"
                        });
                    }
                } catch (pdfErr) {
                    console.error("[ATTACHMENT_PDF_GEN_ERROR]", pdfErr.message);
                }
            }
        }

        // 5. Envoi effectif
        if (transporter) {
            try {
                const mailOptions = {
                    from: fromAddress,
                    to: `"${client.firstName} ${client.lastName}" <${client.email}>`,
                    subject: subject.trim(),
                    text: body.trim(),
                    html: htmlBody,
                    attachments: preparedAttachments
                };

                if (inReplyTo) mailOptions.inReplyTo = inReplyTo;
                if (references) mailOptions.references = references;
                if (messageIdHeader) mailOptions.messageId = messageIdHeader;

                const sendResult = await transporter.sendMail(mailOptions);
                messageIdHeader = sendResult?.messageId || messageIdHeader;
                emailStatus = "sent";
                console.log(`[EMAIL_SENT_SUCCESS] MessageId: ${messageIdHeader} to ${client.email} with ${preparedAttachments.length} attachments`);
            } catch (sendErr) {
                console.error("[EMAIL_SEND_TRANSPORT_ERROR]", sendErr.message);
                emailStatus = "failed";
                throw new Error(`Échec de l'envoi de l'email : ${sendErr.message}`);
            }
        } else {
            console.log(`[EMAIL_SEND_FALLBACK_DEV] Email simulé vers ${client.email} (MessageId: ${messageIdHeader})`);
        }

        // 6. Enregistrement dans la base de données
        const cleanAttachments = attachments && attachments.length > 0
            ? attachments.map(a => {
                const { data, base64, content, ...rest } = a;
                return rest;
            })
            : undefined;

        const emailLog = await prisma.smsLog.create({
            data: {
                companyId,
                clientId: client.id,
                direction: "OUTGOING",
                channel: "EMAIL",
                subject: subject.trim(),
                body: body.trim(),
                fromEmail: fromAddress,
                toEmail: client.email,
                emailMessageId: messageIdHeader,
                externalMessageId: messageIdHeader,
                threadId: activeThreadId,
                inReplyTo: inReplyTo || null,
                references: references || null,
                emailConnectionId: connectionId,
                status: emailStatus,
                isRead: true,
                autoType,
                attachments: cleanAttachments,
                metadata
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

        // 7. Émission en temps réel via Socket.io
        emitToCompany(companyId, "message:new", {
            type: "message:new",
            clientId: client.id,
            conversationId: client.id,
            message: emailLog
        });

        return emailLog;
    }

    /**
     * Traite un email entrant reçu par webhook (SendGrid Inbound, Resend, Mailgun, etc.)
     */
    async handleIncomingWebhook(payload) {
        const from = payload.from || payload.sender || payload.From;
        const to = payload.to || payload.recipient || payload.To;
        const subject = payload.subject || payload.Subject || "Sans objet";
        const text = payload.text || payload.body || payload.html || "";
        const messageId = payload.messageId || payload["message-id"] || payload.MessageId || `email_${Date.now()}`;
        const inReplyTo = payload.inReplyTo || payload["in-reply-to"] || null;
        const references = payload.references || null;

        if (!from || !to) {
            throw new Error("Adresses expéditeur et destinataire manquantes dans le webhook email.");
        }

        // 1. Extraire les adresses email pures
        const extractEmail = (str) => {
            const match = str.match(/<([^>]+)>/) || str.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
            return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim();
        };

        const cleanFrom = extractEmail(from);
        const cleanTo = extractEmail(to);

        // 2. ÉTAPE CLÉ MULTI-TENANT : Identifier l'entreprise propriétaire via l'adresse destinataire
        let company = null;
        let connection = await prisma.emailConnection.findFirst({
            where: { emailAddress: { contains: cleanTo, mode: "insensitive" } },
            include: { company: true }
        });

        if (connection) {
            company = connection.company;
            console.log(`[EMAIL_ROUTED_BY_CONNECTION] Routé vers ${company.name} via ${cleanTo}`);
        }

        // Si pas de connection spécifique, chercher dans Company.email
        if (!company) {
            company = await prisma.company.findFirst({
                where: { email: { contains: cleanTo, mode: "insensitive" } }
            });
        }

        // Si toujours pas trouvée, chercher par threading existant (inReplyTo)
        if (!company && inReplyTo) {
            const parentMsg = await prisma.smsLog.findFirst({
                where: { emailMessageId: inReplyTo },
                include: { company: true }
            });
            if (parentMsg) {
                company = parentMsg.company;
                console.log(`[EMAIL_ROUTED_BY_THREADING] Routé vers ${company.name} via Thread ${inReplyTo}`);
            }
        }

        // Fallback si non trouvé
        if (!company) {
            company = await prisma.company.findFirst({
                orderBy: { createdAt: "asc" }
            });
        }

        if (!company) {
            throw new Error("Aucune entreprise trouvée pour associer l'email entrant.");
        }

        // 3. Recherche du client par email dans l'entreprise
        let client = await prisma.client.findFirst({
            where: {
                companyId: company.id,
                isActive: true,
                email: { contains: cleanFrom, mode: "insensitive" }
            }
        });

        // 4. Si client introuvable, création automatique du contact client
        if (!client) {
            client = await prisma.client.create({
                data: {
                    companyId: company.id,
                    firstName: "Contact",
                    lastName: cleanFrom.split("@")[0],
                    email: cleanFrom,
                    phone: "0000000000",
                    address: "Reçu par Email",
                    source: "email",
                    preferredChannel: "EMAIL"
                }
            });
            console.log(`[EMAIL_CLIENT_AUTO_CREATED] Nouveau client créé: ${client.id} (${cleanFrom})`);
        }

        // 5. Enregistrement du message entrant dans SmsLog
        const emailLog = await prisma.smsLog.create({
            data: {
                companyId: company.id,
                clientId: client.id,
                direction: "INCOMING",
                channel: "EMAIL",
                subject: subject.trim(),
                body: text.trim(),
                fromEmail: cleanFrom,
                toEmail: cleanTo,
                emailMessageId: messageId,
                externalMessageId: messageId,
                threadId: inReplyTo || messageId,
                inReplyTo,
                references,
                emailConnectionId: connection?.id || null,
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
                        email: true,
                        phone: true,
                        companyName: true
                    }
                }
            }
        });

        // 6. Notification pour le gérant
        try {
            const owner = await prisma.user.findFirst({
                where: { companyId: company.id, role: "OWNER" }
            });

            if (owner) {
                const notif = await prisma.notification.create({
                    data: {
                        companyId: company.id,
                        userId: owner.id,
                        type: "NEW_MESSAGE_RECEIVED",
                        channel: "IN_APP",
                        status: "SENT",
                        title: `Nouvel Email de ${client.firstName} ${client.lastName}`,
                        body: `Objet : ${subject}`,
                        entityType: "email",
                        entityId: emailLog.id,
                        data: {
                            clientId: client.id,
                            messageId: emailLog.id,
                            channel: "EMAIL"
                        }
                    }
                });

                emitToCompany(company.id, "notification:new", {
                    type: "notification:new",
                    notification: notif
                });
            }
        } catch (e) {
            console.error("[EMAIL_NOTIF_ERROR]", e.message);
        }

        // 7. Émission temps réel dans la room de l'entreprise
        emitToCompany(company.id, "message:new", {
            type: "message:new",
            clientId: client.id,
            conversationId: client.id,
            message: emailLog
        });

        // 8. Arrêt automatique des relances Auto Rappel (Stop conditions)
        try {
            const { ReminderEngineService } = await import("../../../reminders/ReminderEngineService.js");
            await ReminderEngineService.handleClientReply({
                clientId: client.id,
                companyId: company.id,
                channel: "EMAIL",
                body: text
            });
        } catch (stopErr) {
            console.error("[EMAIL AUTO RAPPEL STOP ON REPLY ERROR]:", stopErr.message);
        }

        return { success: true, message: emailLog, client, company };
    }

    /**
     * Synchronise les emails entrants depuis la boîte Gmail / Google Workspace connectée
     */
    async syncGoogleInbox(companyId) {
        if (!companyId) return { synced: 0 };

        const connections = await prisma.emailConnection.findMany({
            where: { companyId, provider: "GOOGLE", status: "CONNECTED" }
        });

        if (!connections || connections.length === 0) return { synced: 0 };

        let totalSynced = 0;

        for (const connection of connections) {
            try {
                let accessToken = "";
                if (connection.encryptedAccessToken) {
                    try {
                        accessToken = decryptCredential(connection.encryptedAccessToken);
                    } catch (e) {
                        console.error("[GMAIL_SYNC] Erreur déchiffrement access token:", e.message);
                    }
                }

                const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
                const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

                // Refresh token if available
                if (connection.encryptedRefreshToken && googleClientId && googleClientSecret) {
                    try {
                        const refreshToken = decryptCredential(connection.encryptedRefreshToken);
                        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                            method: "POST",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: new URLSearchParams({
                                client_id: googleClientId,
                                client_secret: googleClientSecret,
                                refresh_token: refreshToken,
                                grant_type: "refresh_token"
                            })
                        });
                        const refreshData = await refreshRes.json();
                        if (refreshData.access_token) {
                            accessToken = refreshData.access_token;
                            // Persist newly refreshed access token
                            await prisma.emailConnection.update({
                                where: { id: connection.id },
                                data: { encryptedAccessToken: encryptCredential(refreshData.access_token) }
                            }).catch(() => {});
                        } else if (refreshData.error === "invalid_grant") {
                            // Token revoked or expired: mark as disconnected
                            await prisma.emailConnection.update({
                                where: { id: connection.id },
                                data: { status: "ERROR" }
                            }).catch(() => {});
                            console.warn("[GMAIL_SYNC] Session Google expirée, reconnexion requise pour l'entreprise:", companyId);
                            continue;
                        }
                    } catch (refErr) {
                        console.warn("[GMAIL_SYNC] Avertissement refresh token:", refErr.message);
                    }
                }

                if (!accessToken) continue;

                // 1. Récupérer les 15 derniers messages dans Inbox
                const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=in:inbox", {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                if (!listRes.ok) {
                    if (listRes.status === 401 || listRes.status === 403) {
                        await prisma.emailConnection.update({
                            where: { id: connection.id },
                            data: { status: "ERROR" }
                        }).catch(() => {});
                        console.warn(`[GMAIL_SYNC] Permissions Gmail insuffisantes ou token expiré (${listRes.status}). Reconnexion requise dans Paramètres.`);
                    } else {
                        console.warn("[GMAIL_SYNC] Erreur list messages Gmail (statut %s)", listRes.status);
                    }
                    continue;
                }

                const listData = await listRes.json();
                const messagesList = listData.messages || [];

                for (const item of messagesList) {
                    // Vérifier si le message Gmail a déjà été importé
                    const existing = await prisma.smsLog.findFirst({
                        where: {
                            companyId,
                            OR: [
                                { externalMessageId: item.id },
                                { emailMessageId: item.id }
                            ]
                        }
                    });

                    if (existing) continue;

                    // 2. Récupérer les détails complets du message
                    const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    if (!detailRes.ok) continue;

                    const detail = await detailRes.json();
                    const headers = detail.payload?.headers || [];

                    const getHeader = (name) => {
                        const h = headers.find(hdr => hdr.name.toLowerCase() === name.toLowerCase());
                        return h ? h.value : "";
                    };

                    const fromHeader = getHeader("From");
                    const toHeader = getHeader("To");
                    const subject = getHeader("Subject") || "Sans objet";
                    const messageIdHeader = getHeader("Message-ID") || item.id;
                    const inReplyTo = getHeader("In-Reply-To") || null;
                    const references = getHeader("References") || null;
                    const dateHeader = getHeader("Date");

                    const extractEmail = (str) => {
                        const match = str.match(/<([^>]+)>/) || str.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
                        return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim();
                    };

                    const cleanFrom = extractEmail(fromHeader);
                    const cleanTo = extractEmail(toHeader);

                    // Si c'est un message envoyé par soi-même ou un service automatisé / spam / newsletter, ignorer
                    if (
                        cleanFrom === connection.emailAddress.toLowerCase().trim() ||
                        cleanFrom.startsWith("noreply@") ||
                        cleanFrom.startsWith("no-reply@") ||
                        cleanFrom.startsWith("newsletter@") ||
                        cleanFrom.startsWith("notifications@") ||
                        cleanFrom.startsWith("alert@") ||
                        cleanFrom.startsWith("support@google")
                    ) {
                        continue;
                    }

                    // Extraire le corps du message et les pièces jointes (fichiers, images, PDF)
                    let bodyText = detail.snippet || "";
                    const attachmentsList = [];

                    const extractBodyAndAttachments = async (part) => {
                        if (!part) return;
                        if (part.mimeType === "text/plain" && part.body?.data && !bodyText) {
                            try {
                                bodyText = Buffer.from(part.body.data, 'base64url').toString('utf-8');
                            } catch (e) {}
                        }

                        // Détection d'une pièce jointe
                        if (part.filename && part.filename.trim().length > 0) {
                            let fileBuffer = null;
                            if (part.body?.data) {
                                fileBuffer = Buffer.from(part.body.data, 'base64url');
                            } else if (part.body?.attachmentId) {
                                try {
                                    const attRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}/attachments/${part.body.attachmentId}`, {
                                        headers: { Authorization: `Bearer ${accessToken}` }
                                    });
                                    if (attRes.ok) {
                                        const attJson = await attRes.json();
                                        if (attJson.data) {
                                            fileBuffer = Buffer.from(attJson.data, 'base64url');
                                        }
                                    }
                                } catch (attErr) {
                                    console.warn("[GMAIL_SYNC] Erreur téléchargement pièce jointe:", attErr.message);
                                }
                            }

                            if (fileBuffer) {
                                try {
                                    const safeName = part.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
                                    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`;
                                    const filePath = path.join(uploadDir, uniqueName);
                                    await fs.promises.writeFile(filePath, fileBuffer);

                                    const isImg = (part.mimeType || "").startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(part.filename);
                                    attachmentsList.push({
                                        name: part.filename,
                                        filename: part.filename,
                                        url: `/uploads/attachments/${uniqueName}`,
                                        path: `/uploads/attachments/${uniqueName}`,
                                        size: part.body?.size || fileBuffer.length,
                                        mimeType: part.mimeType || (isImg ? "image/jpeg" : "application/octet-stream"),
                                        isImage: isImg
                                    });
                                } catch (saveErr) {
                                    console.warn("[GMAIL_SYNC] Erreur écriture fichier pièce jointe:", saveErr.message);
                                }
                            }
                        }

                        if (part.parts && Array.isArray(part.parts)) {
                            for (const subPart of part.parts) {
                                await extractBodyAndAttachments(subPart);
                            }
                        }
                    };

                    await extractBodyAndAttachments(detail.payload);

                    // 3. Trouver le client correspondant dans l'entreprise (par email ou par fil de discussion)
                    let client = await prisma.client.findFirst({
                        where: {
                            companyId,
                            isActive: true,
                            email: { contains: cleanFrom, mode: "insensitive" }
                        }
                    });

                    // Si pas trouvé par email exact, chercher par l'In-Reply-To ou References du message envoyé
                    if (!client && (inReplyTo || references)) {
                        const cleanInReplyTo = (inReplyTo || "").trim();
                        const cleanReferences = (references || "").trim();

                        const parentMsg = await prisma.smsLog.findFirst({
                            where: {
                                companyId,
                                OR: [
                                    ...(cleanInReplyTo ? [
                                        { emailMessageId: cleanInReplyTo },
                                        { externalMessageId: cleanInReplyTo },
                                        { emailMessageId: cleanInReplyTo.replace(/^<|>$/g, "") },
                                        { externalMessageId: cleanInReplyTo.replace(/^<|>$/g, "") }
                                    ] : []),
                                    ...(cleanReferences ? [
                                        { emailMessageId: cleanReferences },
                                        { externalMessageId: cleanReferences },
                                        { emailMessageId: cleanReferences.replace(/^<|>$/g, "") },
                                        { externalMessageId: cleanReferences.replace(/^<|>$/g, "") }
                                    ] : [])
                                ]
                            },
                            include: { client: true }
                        });

                        if (parentMsg?.client && parentMsg.client.isActive) {
                            client = parentMsg.client;
                        }
                    }

                    // OPTION A (Base propre) : Si ce n'est PAS un client enregistré dans le CRM ni une réponse à un devis/facture/message, on ignore pour garder la base propre
                    if (!client) {
                        continue;
                    }

                    // 4. Enregistrer dans SmsLog
                    const emailLog = await prisma.smsLog.create({
                        data: {
                            companyId,
                            clientId: client.id,
                            direction: "INCOMING",
                            channel: "EMAIL",
                            subject: subject.trim(),
                            body: bodyText.trim(),
                            fromEmail: cleanFrom,
                            toEmail: cleanTo,
                            attachments: attachmentsList.length > 0 ? attachmentsList : undefined,
                            emailMessageId: item.id,
                            externalMessageId: item.id,
                            threadId: inReplyTo || messageIdHeader,
                            inReplyTo,
                            references,
                            emailConnectionId: connection.id,
                            status: "received",
                            isRead: false,
                            autoType: "incoming",
                            createdAt: dateHeader ? new Date(dateHeader) : new Date()
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

                    // 5. Notification pour l'équipe
                    try {
                        const owner = await prisma.user.findFirst({
                            where: { companyId, role: "OWNER" }
                        });
                        if (owner) {
                            await prisma.notification.create({
                                data: {
                                    companyId,
                                    userId: owner.id,
                                    type: "NEW_MESSAGE_RECEIVED",
                                    channel: "IN_APP",
                                    status: "SENT",
                                    title: `Nouvel Email de ${client.firstName} ${client.lastName}`,
                                    body: `Objet : ${subject}`,
                                    entityType: "email",
                                    entityId: emailLog.id,
                                    data: {
                                        clientId: client.id,
                                        messageId: emailLog.id,
                                        channel: "EMAIL"
                                    }
                                }
                            });
                        }
                    } catch (notifErr) {}

                    // 6. Émettre en temps réel via Socket.io
                    emitToCompany(companyId, "message:new", {
                        type: "message:new",
                        clientId: client.id,
                        conversationId: client.id,
                        message: emailLog
                    });

                    totalSynced++;
                }

                // Mettre à jour lastSyncAt
                await prisma.emailConnection.update({
                    where: { id: connection.id },
                    data: { lastSyncAt: new Date() }
                });

            } catch (err) {
                console.error("[GMAIL_SYNC_ERROR]", err.message);
            }
        }

        return { synced: totalSynced };
    }

    /**
     * Vérifie si le canal Email est disponible pour ce client
     */
    async isChannelAvailable(client, company) {
        if (!client?.email || !client.email.includes("@")) {
            return {
                available: false,
                reason: "Le client n'a pas d'adresse email renseignée"
            };
        }

        return {
            available: true,
            email: client.email
        };
    }
}

export const emailProvider = new EmailProvider();
export default emailProvider;
