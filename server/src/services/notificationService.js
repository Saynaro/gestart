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

function buildNotificationEmailHtml({ title, body, companyName, actionUrl, actionText }) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const targetUrl = actionUrl ? (actionUrl.startsWith("http") ? actionUrl : `${frontendUrl}${actionUrl}`) : frontendUrl;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
        <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header Logo -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                        <img src="${frontendUrl}/Logo-transparent.png" alt="GestArt" width="32" height="32" style="display: block; width: 32px; height: 32px; border: 0;" />
                    </td>
                    <td style="vertical-align: middle; font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                        ${companyName || "GestArt"}
                    </td>
                </tr>
            </table>

            <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0; letter-spacing: -0.01em;">${title}</h2>
            <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">${body}</div>

            <div style="margin: 28px 0 24px 0;">
                <a href="${targetUrl}" style="background-color: #556B2F; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
                    ${actionText || "Ouvrir dans GestArt CRM"}
                </a>
            </div>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                Vous recevez cette notification conformément aux préférences de votre espace GestArt CRM.
                <p style="margin: 6px 0 0 0;">© ${new Date().getFullYear()} ${companyName || "GestArt CRM"}</p>
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
