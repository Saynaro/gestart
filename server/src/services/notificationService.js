import { prisma } from "../config/db.js";
import { emitToCompany } from "../config/socket.js";
import { sendEmail } from "../utils/emailService.js";

/**
 * Mapping des types de notifications vers les réglages booléens de CompanySettings
 */
const TYPE_TO_SETTING_MAP = {
    NEW_CLIENT_ADDED: "notifyNewClient",
    NEW_MESSAGE_RECEIVED: "notifyNewMessage",
    INTERVENTION_COMPLETED: "notifyInterventionDone",
    INTERVENTION_CREATED: "notifyInterventionDone",
    INVOICE_PAID: "notifyInvoicePaid",
    INVOICE_OVERDUE: "notifyInvoicePaid",
    MAINTENANCE_URGENT: "notifyUrgentMaintenance",
    MAINTENANCE_WARNING: "notifyUrgentMaintenance",
    NEW_QUOTE_REQUEST: "notifyQuoteRequest",
    TECHNICIAN_STARTED: "notifyInterventionDone",
    PLAN_EXPIRING_SOON: "notifyPlanExpiring",
    PLAN_EXPIRED: "notifyPlanExpiring",
    SMS_LIMIT_WARNING: "notifySmsLimit",
    INTERVENTION_ASSIGNED: "notifyTechAssigned",
    INTERVENTION_UPDATED: "notifyTechUpdated",
    INTERVENTION_CANCELLED: "notifyTechCancelled",
    REMINDER_TOMORROW: "notifyTechReminder24h",
    REMINDER_ONE_HOUR: "notifyTechReminder1h"
};

/**
 * Mapping des types de notifications vers les clés de préférences UI
 */
const TYPE_TO_PREF_KEY = {
    NEW_CLIENT_ADDED: { scope: "ownerNotifs", key: "newClient" },
    NEW_MESSAGE_RECEIVED: { scope: "ownerNotifs", key: "newSms" },
    INTERVENTION_COMPLETED: { scope: "ownerNotifs", key: "jobDone" },
    INTERVENTION_CREATED: { scope: "ownerNotifs", key: "jobDone" },
    INVOICE_PAID: { scope: "ownerNotifs", key: "invoicePaid" },
    INVOICE_OVERDUE: { scope: "ownerNotifs", key: "invoicePaid" },
    MAINTENANCE_URGENT: { scope: "ownerNotifs", key: "urgentMaintenance" },
    MAINTENANCE_WARNING: { scope: "ownerNotifs", key: "urgentMaintenance" },
    NEW_QUOTE_REQUEST: { scope: "ownerNotifs", key: "formRequest" },
    PLAN_EXPIRING_SOON: { scope: "ownerNotifs", key: "subExpiring" },
    PLAN_EXPIRED: { scope: "ownerNotifs", key: "subExpiring" },
    INTERVENTION_ASSIGNED: { scope: "techNotifs", key: "jobAssigned" },
    INTERVENTION_UPDATED: { scope: "techNotifs", key: "jobUpdated" },
    INTERVENTION_CANCELLED: { scope: "techNotifs", key: "jobCancelled" },
    REMINDER_TOMORROW: { scope: "techNotifs", key: "reminderDayBefore" },
    REMINDER_ONE_HOUR: { scope: "techNotifs", key: "reminderHourBefore" }
};

/**
 * Canaux par défaut selon le type d'événement
 */
const DEFAULT_CHANNELS_BY_TYPE = {
    NEW_CLIENT_ADDED: { inapp: true, email: true, push: true },
    NEW_MESSAGE_RECEIVED: { inapp: true, email: false, push: true },
    INTERVENTION_COMPLETED: { inapp: true, email: true, push: true },
    INTERVENTION_CREATED: { inapp: true, email: true, push: true },
    INVOICE_PAID: { inapp: true, email: true, push: true },
    INVOICE_OVERDUE: { inapp: true, email: true, push: true },
    MAINTENANCE_URGENT: { inapp: true, email: true, push: true },
    MAINTENANCE_WARNING: { inapp: true, email: true, push: true },
    NEW_QUOTE_REQUEST: { inapp: true, email: true, push: false },
    PLAN_EXPIRING_SOON: { inapp: true, email: true, push: false },
    PLAN_EXPIRED: { inapp: true, email: true, push: false },
    INTERVENTION_ASSIGNED: { inapp: true, email: false, push: true },
    INTERVENTION_UPDATED: { inapp: true, email: false, push: true },
    INTERVENTION_CANCELLED: { inapp: true, email: true, push: true },
    REMINDER_TOMORROW: { inapp: true, email: false, push: true },
    REMINDER_ONE_HOUR: { inapp: true, email: false, push: true }
};

/**
 * Template HTML premium pour les emails de notification système
 */
function buildNotificationEmailHtml({ title, body, companyName, actionUrl, actionText }) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const targetUrl = actionUrl ? (actionUrl.startsWith("http") ? actionUrl : `${frontendUrl}${actionUrl}`) : frontendUrl;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #556B2F; padding: 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
            .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
            .content { padding: 32px 24px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: #f0fdf4; color: #166534; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid #bbf7d0; }
            .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
            .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .btn { display: inline-block; background: #556B2F; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; }
            .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${companyName || "GestArt CRM"}</h1>
                <p>Notification en temps réel</p>
            </div>
            <div class="content">
                <span class="badge">Alerte GestArt</span>
                <h2 class="title">${title}</h2>
                <div class="body-text">${body}</div>
                <div style="text-align: center; margin-top: 24px;">
                    <a href="${targetUrl}" class="btn">${actionText || "Ouvrir dans GestArt CRM"}</a>
                </div>
            </div>
            <div class="footer">
                Vous recevez cette alerte conformément aux préférences de notifications configurées dans votre espace GestArt CRM.
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Service centralisé de répartition et d'envoi de notifications
 */
export const dispatchNotification = async ({
    companyId,
    userId,
    type,
    title,
    body,
    entityType = null,
    entityId = null,
    data = {}
}) => {
    if (!companyId) return { sent: false, reason: "missing_company_id" };

    try {
        // 1. Récupérer les paramètres de l'entreprise
        const settings = await prisma.companySettings.upsert({
            where: { companyId },
            update: {},
            create: { companyId }
        });

        // 2. Vérifier si ce type de notification est activé
        const settingField = TYPE_TO_SETTING_MAP[type];
        if (settingField && settings[settingField] === false) {
            // Notification explicitement désactivée par l'utilisateur
            return { sent: false, reason: "disabled_by_settings", settingField };
        }

        // 3. Déterminer les canaux configurés (Push, Email, In-App)
        const prefMapping = TYPE_TO_PREF_KEY[type];
        const defaultChannel = DEFAULT_CHANNELS_BY_TYPE[type] || { inapp: true, email: false, push: true };
        let channels = { ...defaultChannel };

        if (settings.notificationPreferences && typeof settings.notificationPreferences === "object") {
            const prefs = settings.notificationPreferences;
            if (prefMapping && prefs[prefMapping.scope] && prefs[prefMapping.scope][prefMapping.key]) {
                const itemPref = prefs[prefMapping.scope][prefMapping.key];
                if (itemPref.enabled === false) {
                    return { sent: false, reason: "disabled_by_preferences" };
                }
                channels = {
                    inapp: itemPref.inapp !== undefined ? Boolean(itemPref.inapp) : defaultChannel.inapp,
                    email: itemPref.email !== undefined ? Boolean(itemPref.email) : defaultChannel.email,
                    push: itemPref.push !== undefined ? Boolean(itemPref.push) : defaultChannel.push
                };
            }
        }

        // 4. Identifier le ou les utilisateurs destinataires
        let recipients = [];
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true }
            });
            if (user && user.isActive) {
                recipients = [user];
            }
        } else {
            // Si aucun userId n'est spécifié, envoyer aux gérants / administrateurs
            recipients = await prisma.user.findMany({
                where: {
                    companyId,
                    role: { in: ["OWNER", "MANAGER", "ADMIN"] },
                    isActive: true
                },
                select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true }
            });
        }

        if (!recipients || recipients.length === 0) {
            return { sent: false, reason: "no_recipients_found" };
        }

        // Récupérer le nom de l'entreprise pour l'email
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true }
        });
        const companyName = company?.name || "GestArt CRM";

        // Déterminer l'URL d'action pour le bouton
        let actionUrl = "/";
        if (entityType === "invoice" && entityId) actionUrl = `/factures`;
        else if (entityType === "quote" && entityId) actionUrl = `/devis`;
        else if (entityType === "client" && entityId) actionUrl = `/clients/${entityId}`;
        else if (entityType === "intervention" && entityId) actionUrl = `/planning`;
        else if (entityType === "quote_request") actionUrl = `/devis`;

        let createdCount = 0;

        // 5. Distribuer sur les canaux activés pour chaque destinataire
        for (const recipient of recipients) {
            // A. CANAL IN-APP (Base de données + WebSocket temps réel)
            if (channels.inapp) {
                try {
                    const notif = await prisma.notification.create({
                        data: {
                            companyId,
                            userId: recipient.id,
                            type,
                            channel: "IN_APP",
                            status: "SENT",
                            title,
                            body,
                            entityType,
                            entityId: entityId ? String(entityId) : null,
                            data: data || {}
                        }
                    });

                    emitToCompany(companyId, "notification:new", notif);
                    createdCount++;
                } catch (inAppErr) {
                    console.error(`[NOTIFICATION] Erreur création In-App:`, inAppErr.message);
                }
            }

            // B. CANAL EMAIL
            if (channels.email && recipient.email) {
                try {
                    const emailHtml = buildNotificationEmailHtml({
                        title,
                        body,
                        companyName,
                        actionUrl,
                        actionText: "Consulter dans le CRM"
                    });

                    await sendEmail({
                        to: recipient.email,
                        subject: `[GestArt] ${title}`,
                        html: emailHtml,
                        text: `${title}\n\n${body}\n\nAccéder à votre espace : ${process.env.FRONTEND_URL || 'http://localhost:5173'}${actionUrl}`
                    });
                } catch (emailErr) {
                    console.error(`[NOTIFICATION] Erreur envoi Email à ${recipient.email}:`, emailErr.message);
                }
            }

            // C. CANAL PUSH
            if (channels.push) {
                try {
                    const tokens = await prisma.pushToken.findMany({
                        where: { userId: recipient.id, isActive: true }
                    });
                    if (tokens.length > 0) {
                        console.log(`[PUSH NOTIFICATION] Envoi push à ${tokens.length} appareil(s) pour ${recipient.email}: "${title}"`);
                    }
                } catch (pushErr) {
                    console.error(`[NOTIFICATION] Erreur Push:`, pushErr.message);
                }
            }
        }

        return { success: true, sent: true, recipientsCount: recipients.length, createdCount };
    } catch (error) {
        console.error("[NOTIFICATION DISPATCH ERROR]:", error.message);
        return { success: false, error: error.message };
    }
};

export default {
    dispatchNotification
};
