import nodemailer from "nodemailer";
import { generateQuotePdfBuffer, generateInvoicePdfBuffer } from "./pdfGenerator.js";
import { prisma } from "../config/db.js";
import { emailProvider } from "../services/messaging/providers/email/EmailProvider.js";
import { emitToCompany } from "../config/socket.js";

/**
 * Direct Nodemailer Transporter Configuration
 * Uses standard SMTP environment variables:
 * - SMTP_HOST (e.g. smtp.gmail.com)
 * - SMTP_PORT (e.g. 587 or 465)
 * - SMTP_USER
 * - SMTP_PASS
 * - EMAIL_FROM (e.g. "GestArt CRM <support.gestart@gmail.com>")
 */
const createTransporter = () => {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER || "support.gestart@gmail.com";
    const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : "";

    if (user && pass) {
        if (host.includes("gmail")) {
            return nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user,
                    pass,
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
        }

        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    return null;
};

/**
 * Helper to send email with automatic dev fallback logging
 */
export const sendEmail = async ({ to, subject, html, text, attachments }) => {
    const from = process.env.EMAIL_FROM || '"GestArt CRM" <support.gestart@gmail.com>';
    const transporter = createTransporter();

    if (!transporter) {
        console.log("--------------------------------------------------");
        console.log(`[EMAIL SERVICE - DEV FALLBACK]`);
        console.log(`TO: ${to}`);
        console.log(`SUBJECT: ${subject}`);
        console.log(`ATTACHMENTS: ${attachments ? attachments.length + ' file(s)' : 'None'}`);
        console.log(`BODY (TEXT): ${text || "See HTML"}`);
        console.log("--------------------------------------------------");
        return { success: true, isDevFallback: true };
    }

    try {
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            text,
            html,
            attachments: attachments || []
        });
        console.log(`[EMAIL SENT] MessageId: ${info.messageId} to ${to}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Email Verification link & 6-digit code
 */
export const sendVerificationEmail = async ({ to, code, token, firstName = "Utilisateur" }) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;

    const subject = `${code} est votre code de vérification - GestArt CRM`;

    const html = `
        <!DOCTYPE html>
        <html>
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
                            GestArt
                        </td>
                    </tr>
                </table>

                <h1 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0; letter-spacing: -0.01em;">
                    Confirmation de votre email
                </h1>

                <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
                    Bonjour ${firstName},<br/>
                    Merci de votre inscription. Voici votre code de validation :
                </p>

                <div style="margin: 24px 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0F172A;">
                    ${code}
                </div>
                <p style="font-size: 13px; color: #64748B; margin: 0 0 28px 0;">Ce code expire dans 15 minutes.</p>

                <div style="margin: 28px 0 28px 0;">
                    <a href="${verifyUrl}" style="background-color: #556B2F; color: #FFFFFF; padding: 12px 28px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block;">
                        Confirmer mon compte
                    </a>
                </div>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                    <p style="margin: 0 0 4px 0;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} GestArt CRM</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `Votre code de vérification est : ${code}\n\nBonjour ${firstName},\nMerci de votre inscription sur GestArt CRM. Voici votre code de validation : ${code}\n\nOu confirmez directement via ce lien : ${verifyUrl}\n\n(Ce code expire dans 15 minutes)`;

    return await sendEmail({ to, subject, html, text });
};

/**
 * Send Password Reset Link & 6-digit code
 */
export const sendPasswordResetEmail = async ({ to, token, code, firstName = "Utilisateur" }) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const subject = "Réinitialisation de votre mot de passe - GestArt CRM";

    const html = `
        <!DOCTYPE html>
        <html>
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
                            GestArt
                        </td>
                    </tr>
                </table>

                <h1 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0; letter-spacing: -0.01em;">
                    Réinitialisation de votre mot de passe
                </h1>

                <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
                    Bonjour ${firstName},<br/>
                    Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau :
                </p>

                <div style="margin: 28px 0 12px 0;">
                    <a href="${resetUrl}" style="background-color: #556B2F; color: #FFFFFF; padding: 12px 28px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block;">
                        Changer mon mot de passe
                    </a>
                </div>
                <p style="font-size: 13px; color: #64748B; margin: 0 0 28px 0;">Ce lien est valable pendant 1 heure.</p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                    <p style="margin: 0 0 4px 0;">Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} GestArt CRM</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `Bonjour ${firstName},\n\nVous avez demandé la réinitialisation de votre mot de passe sur GestArt CRM.\nCliquez sur ce lien : ${resetUrl}\n(Lien valable 1 heure)`;

    return await sendEmail({ to, subject, html, text });
};

/**
 * Send 2FA 6-digit verification code email
 */
export const sendTwoFactorCodeEmail = async ({ to, code, firstName = "Utilisateur" }) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const subject = `${code} est votre code de vérification 2FA - GestArt CRM`;

    const html = `
        <!DOCTYPE html>
        <html>
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
                            GestArt
                        </td>
                    </tr>
                </table>

                <h1 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0; letter-spacing: -0.01em;">
                    Connexion sécurisée (2FA)
                </h1>

                <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
                    Bonjour ${firstName},<br/>
                    Voici votre code de sécurité pour valider votre connexion :
                </p>

                <div style="margin: 24px 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0F172A;">
                    ${code}
                </div>
                <p style="font-size: 13px; color: #64748B; margin: 0 0 32px 0;">Ce code expire dans 10 minutes.</p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                    <p style="margin: 0 0 4px 0;">Ne partagez jamais ce code de sécurité avec un tiers.</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} GestArt CRM</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `Votre code de sécurité 2FA est : ${code}\n\nCe code expire dans 10 minutes.`;

    return await sendEmail({ to, subject, html, text });
};

/**
 * Send Quote to Client with Signature & Online Payment Link + PDF Attachment
 * Utilise l'adresse email connectée (Google / SMTP / Microsoft) de l'entreprise
 */
export const sendQuoteClientEmail = async ({ to, quote, company, signatureUrl, senderEmail, primaryColor = "#556B2F", customization = {}, isReminder = false }) => {
    const companyId = company?.id || quote.companyId;
    const companyName = company?.name || quote.company?.name || "Votre entreprise";
    const clientName = quote.client ? `${quote.client.firstName || ''} ${quote.client.lastName || quote.client.companyName || ''}`.trim() : "Client";
    const totalTtc = Number(quote.amountTTC || quote.totalTtc || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const docNumber = quote.number || "Devis";
    const accentColor = customization.primaryColor || company?.settings?.documentCustomization?.primaryColor || company?.settings?.primaryColor || primaryColor || "#556B2F";

    // 1. Vérifier la connexion email active de l'entreprise
    let connection = await prisma.emailConnection.findFirst({
        where: {
            companyId,
            status: "CONNECTED"
        },
        orderBy: { isDefault: "desc" }
    });

    if (!connection) {
        // Fallback auto-heal si une connexion existe avec identifiants enregistrés (ex: Google OAuth avec refresh token)
        const existingConn = await prisma.emailConnection.findFirst({
            where: { companyId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
        });
        if (existingConn && (existingConn.encryptedRefreshToken || existingConn.encryptedSmtpPass || existingConn.encryptedAccessToken)) {
            connection = existingConn;
            prisma.emailConnection.update({
                where: { id: existingConn.id },
                data: { status: "CONNECTED" }
            }).catch(() => {});
        }
    }

    if (!connection) {
        const error = new Error("EMAIL_NOT_CONFIGURED: Aucune adresse email professionnelle n'est connectée pour votre entreprise. Veuillez connecter votre compte Google/Email dans les Paramètres pour envoyer vos devis.");
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }

    const { transporter } = await emailProvider.getCompanyTransporter(companyId);
    if (!transporter) {
        const error = new Error(`EMAIL_NOT_CONFIGURED: Impossible d'initialiser l'envoi depuis votre adresse email connectée (${connection.emailAddress}). Veuillez vérifier votre connexion dans les Paramètres.`);
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }

    const fromAddress = `"${companyName}" <${connection.emailAddress}>`;
    const subjectPrefix = isReminder ? "[Rappel] " : "";
    const subject = `${subjectPrefix}Devis ${docNumber} (${totalTtc} € TTC) — ${companyName}`;

    const companyLogoHtml = company?.logoUrl
        ? `<img src="${company.logoUrl}" alt="${companyName}" height="36" style="max-height: 36px; display: block; margin-bottom: 28px; border: 0;" />`
        : `<div style="font-size: 19px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em; margin-bottom: 28px;">${companyName}</div>`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
            <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                <!-- Header -->
                ${companyLogoHtml}

                ${isReminder ? `
                    <div style="display: inline-block; background: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px;">
                        Rappel de validation
                    </div>
                ` : ''}

                <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0;">Bonjour ${clientName},</h2>
                
                <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
                    ${isReminder
                        ? `Sauf erreur de notre part, nous n'avons pas encore reçu votre accord concernant le devis <strong>${docNumber}</strong>. Vous pouvez le consulter et le signer en ligne ci-dessous :`
                        : `Veuillez trouver ci-joint votre devis <strong>${docNumber}</strong> (document PDF joint à cet email). Vous pouvez le consulter et le signer directement en ligne :`
                    }
                </p>

                <!-- Amount -->
                <div style="margin: 20px 0; font-size: 15px; color: #334155;">
                    <span style="font-size: 13px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">Montant total :</span>
                    <strong style="font-size: 22px; font-weight: 800; color: #0F172A; margin-left: 8px;">${totalTtc} € TTC</strong>
                    <span style="font-size: 13px; color: #64748B; margin-left: 6px;">(Réf. ${docNumber})</span>
                </div>

                <!-- CTA Button -->
                <div style="margin: 28px 0 24px 0;">
                    <a href="${signatureUrl}" target="_blank" style="background-color: ${accentColor} !important; color: #FFFFFF !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                        ${isReminder ? "Consulter et signer mon devis" : "Signer le devis en ligne"}
                    </a>
                </div>

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.6;">
                    <p style="margin: 0 0 4px 0;">Envoyé par <strong>${companyName}</strong> (<a href="mailto:${connection.emailAddress}" style="color: #64748B; text-decoration: underline;">${connection.emailAddress}</a>)</p>
                    <p style="margin: 0; font-size: 11px; color: #94A3B8;">💡 Pensez à vérifier vos courriers indésirables / spams si besoin.</p>
                    <p style="margin-top: 6px; margin-bottom: 0;">© ${new Date().getFullYear()} ${companyName}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre devis ${docNumber} d'un montant de ${totalTtc} € TTC.\n\nVous pouvez le consulter et le signer en ligne ici : ${signatureUrl}\n\n(Si besoin, vérifiez vos courriers indésirables/spams. Expéditeur : ${connection.emailAddress})\n\nCordialement,\n${companyName}`;

    let attachments = [];
    try {
        const effectiveCustomization = {
            primaryColor: accentColor,
            ...(company?.settings?.documentCustomization || {}),
            ...customization
        };
        const pdfBuffer = await generateQuotePdfBuffer({ quote, company, customization: effectiveCustomization });
        attachments.push({
            filename: `Devis_${docNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
        });
    } catch (pdfErr) {
        console.warn("Could not generate quote PDF attachment:", pdfErr.message);
    }

    const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html,
        attachments,
        replyTo: connection.emailAddress
    });

    console.log(`[QUOTE EMAIL SENT] From: ${fromAddress} To: ${to} (MessageId: ${info.messageId})`);

    // Synchronisation automatique dans l'historique de messagerie omnicanale (SmsLog)
    if (quote.clientId) {
        try {
            const log = await prisma.smsLog.create({
                data: {
                    companyId,
                    clientId: quote.clientId,
                    channel: "EMAIL",
                    direction: "OUTGOING",
                    status: "DELIVERED",
                    subject,
                    body: `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre devis ${docNumber} d'un montant de ${totalTtc} € TTC.\nLien de signature en ligne : ${signatureUrl}`,
                    emailMessageId: info.messageId || null,
                    attachments: [
                        {
                            filename: `Devis_${docNumber}.pdf`,
                            type: "quote",
                            quoteId: quote.id,
                            number: docNumber,
                            total: quote.amountTTC || quote.totalTtc || 0
                        }
                    ],
                    emailConnectionId: connection.id
                }
            });
            emitToCompany(companyId, "message:new", {
                clientId: quote.clientId,
                message: log
            });
        } catch (logErr) {
            console.warn("[SEND_QUOTE] Erreur journalisation smsLog:", logErr.message);
        }
    }

    return { success: true, messageId: info.messageId };
};

/**
 * Send Invoice to Client with Online Payment Link + Bank Transfer Details + PDF Attachment
 * Utilise l'adresse email connectée (Google / SMTP / Microsoft) de l'entreprise
 */
export const sendInvoiceClientEmail = async ({
    to,
    invoice,
    company,
    paymentUrl,
    senderEmail,
    primaryColor = "#556B2F",
    customization = {},
    paymentOptions = {},
    isReminder = false
}) => {
    const companyId = company?.id || invoice.companyId;
    const companyName = company?.name || invoice.company?.name || "Votre entreprise";
    const clientName = invoice.client ? `${invoice.client.firstName || ''} ${invoice.client.lastName || invoice.client.companyName || ''}`.trim() : "Client";
    const totalTtc = Number(invoice.amountTTC || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const docNumber = invoice.number || "Facture";
    const accentColor = customization.primaryColor || company?.settings?.documentCustomization?.primaryColor || company?.settings?.primaryColor || primaryColor || "#556B2F";

    // 1. Vérifier la connexion email active de l'entreprise
    let connection = await prisma.emailConnection.findFirst({
        where: {
            companyId,
            status: "CONNECTED"
        },
        orderBy: { isDefault: "desc" }
    });

    if (!connection) {
        // Fallback auto-heal si une connexion existe avec identifiants enregistrés (ex: Google OAuth avec refresh token)
        const existingConn = await prisma.emailConnection.findFirst({
            where: { companyId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
        });
        if (existingConn && (existingConn.encryptedRefreshToken || existingConn.encryptedSmtpPass || existingConn.encryptedAccessToken)) {
            connection = existingConn;
            prisma.emailConnection.update({
                where: { id: existingConn.id },
                data: { status: "CONNECTED" }
            }).catch(() => {});
        }
    }

    if (!connection) {
        const error = new Error("EMAIL_NOT_CONFIGURED: Aucune adresse email professionnelle n'est connectée pour votre entreprise. Veuillez connecter votre compte Google/Email dans les Paramètres pour envoyer vos factures.");
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }

    const { transporter } = await emailProvider.getCompanyTransporter(companyId);
    if (!transporter) {
        const error = new Error(`EMAIL_NOT_CONFIGURED: Impossible d'initialiser l'envoi depuis votre adresse email connectée (${connection.emailAddress}). Veuillez vérifier votre connexion dans les Paramètres.`);
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }

    const fromAddress = `"${companyName}" <${connection.emailAddress}>`;
    const subjectPrefix = isReminder ? "[Rappel] " : "";
    const subject = `${subjectPrefix}Facture ${docNumber} (${totalTtc} € TTC) — ${companyName}`;

    const isStripeActive = Boolean(paymentOptions.stripeEnabled);
    const isBankTransferActive = Boolean(paymentOptions.bankTransferEnabled);
    const bankDetails = paymentOptions.bankDetails || {
        iban: company?.settings?.bankIban,
        bic: company?.settings?.bankBic,
        accountOwner: company?.settings?.bankAccountOwner || company?.name,
        reference: docNumber
    };

    let dueDateFormatted = "";
    if (invoice.dueAt) {
        try {
            dueDateFormatted = new Date(invoice.dueAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
        } catch(e) {}
    }

    // Construction conditionnelle des sections de paiement
    let paymentSectionsHtml = "";
    let paymentTextGuide = "";

    const companyLogoHtml = company?.logoUrl
        ? `<img src="${company.logoUrl}" alt="${companyName}" height="36" style="max-height: 36px; display: block; margin-bottom: 28px; border: 0;" />`
        : `<div style="font-size: 19px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em; margin-bottom: 28px;">${companyName}</div>`;

    if (isStripeActive && isBankTransferActive) {
        paymentSectionsHtml = `
            <div style="margin: 28px 0 20px 0;">
                <a href="${paymentUrl}" target="_blank" style="background-color: ${accentColor} !important; color: #FFFFFF !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                    Payer en ligne par carte bancaire
                </a>
            </div>

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #F1F5F9;">
                <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 10px;">
                    Ou par virement bancaire :
                </div>
                <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748B; width: 100px;">Titulaire :</td>
                        <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${bankDetails.accountOwner || companyName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748B;">IBAN :</td>
                        <td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: #0F172A;">${bankDetails.iban || 'Non renseigné'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748B;">BIC :</td>
                        <td style="padding: 4px 0; font-family: monospace; color: #0F172A;">${bankDetails.bic || 'Non renseigné'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748B;">Référence :</td>
                        <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${bankDetails.reference || docNumber}</td>
                    </tr>
                </table>
            </div>
        `;
        paymentTextGuide = `Modes de règlement :\n1. Carte bancaire en ligne : ${paymentUrl}\n2. Virement bancaire :\n   - IBAN : ${bankDetails.iban || 'N/A'}\n   - BIC : ${bankDetails.bic || 'N/A'}\n   - Référence : ${bankDetails.reference || docNumber}`;
    } else if (isStripeActive) {
        paymentSectionsHtml = `
            <div style="margin: 28px 0 24px 0;">
                <a href="${paymentUrl}" target="_blank" style="background-color: ${accentColor} !important; color: #FFFFFF !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                    Payer ma facture en ligne
                </a>
            </div>
        `;
        paymentTextGuide = `Réglez votre facture en ligne ici : ${paymentUrl}`;
    } else if (isBankTransferActive) {
        paymentSectionsHtml = `
            <div style="margin: 24px 0;">
                <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 10px;">
                    Coordonnées pour virement bancaire :
                </div>
                <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748B; width: 100px;">Titulaire :</td>
                        <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${bankDetails.accountOwner || companyName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748B;">IBAN :</td>
                        <td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: #0F172A;">${bankDetails.iban || 'Non renseigné'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748B;">BIC :</td>
                        <td style="padding: 4px 0; font-family: monospace; color: #0F172A;">${bankDetails.bic || 'Non renseigné'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748B;">Référence :</td>
                        <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${bankDetails.reference || docNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748B;">Montant :</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">${totalTtc} €</td>
                    </tr>
                </table>
            </div>
            <div style="margin-top: 16px;">
                <a href="${paymentUrl}" target="_blank" style="color: ${accentColor}; font-size: 13px; font-weight: 600; text-decoration: underline;">
                    Consulter et télécharger la facture en ligne
                </a>
            </div>
        `;
        paymentTextGuide = `Coordonnées bancaires pour virement :\n- Titulaire : ${bankDetails.accountOwner || companyName}\n- IBAN : ${bankDetails.iban || 'N/A'}\n- BIC : ${bankDetails.bic || 'N/A'}\n- Référence : ${bankDetails.reference || docNumber}\n- Montant : ${totalTtc} €`;
    } else {
        paymentSectionsHtml = `
            <div style="margin: 28px 0 24px 0;">
                <a href="${paymentUrl}" target="_blank" style="background-color: ${accentColor} !important; color: #FFFFFF !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                    Consulter la facture en ligne
                </a>
            </div>
        `;
        paymentTextGuide = `Consultez votre facture en ligne ici : ${paymentUrl}`;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
            <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                <!-- Header -->
                ${companyLogoHtml}

                ${isReminder ? `
                    <div style="display: inline-block; background: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px;">
                        Rappel de paiement
                    </div>
                ` : ''}

                <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0;">Bonjour ${clientName},</h2>
                
                <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
                    ${isReminder
                        ? `Sauf erreur ou omission de notre part, nous constatons que votre facture <strong>${docNumber}</strong> est actuellement en attente de règlement.`
                        : `Veuillez trouver ci-joint votre facture <strong>${docNumber}</strong> d'un montant de <strong>${totalTtc} € TTC</strong> (fichier PDF attaché à cet email).`
                    }
                </p>

                <!-- Amount -->
                <div style="margin: 20px 0; font-size: 15px; color: #334155;">
                    <span style="font-size: 13px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">Net à payer :</span>
                    <strong style="font-size: 22px; font-weight: 800; color: #0F172A; margin-left: 8px;">${totalTtc} € TTC</strong>
                    <span style="font-size: 13px; color: #64748B; margin-left: 6px;">(Facture N° ${docNumber}${dueDateFormatted ? ` • Échéance : ${dueDateFormatted}` : ''})</span>
                </div>

                ${paymentSectionsHtml}

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.6;">
                    <p style="margin: 0 0 4px 0;">Envoyé par <strong>${companyName}</strong> (<a href="mailto:${connection.emailAddress}" style="color: #64748B; text-decoration: underline;">${connection.emailAddress}</a>)</p>
                    <p style="margin: 0; font-size: 11px; color: #94A3B8;">💡 Pensez à vérifier vos courriers indésirables / spams si besoin.</p>
                    <p style="margin-top: 6px; margin-bottom: 0;">© ${new Date().getFullYear()} ${companyName}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre facture ${docNumber} d'un montant de ${totalTtc} € TTC.\n\n${paymentTextGuide}\n\nLien direct de consultation : ${paymentUrl}\n\n(Si besoin, vérifiez vos spams. Expéditeur : ${connection.emailAddress})\n\nCordialement,\n${companyName}`;

    let attachments = [];
    try {
        const effectiveCustomization = {
            primaryColor: accentColor,
            ...(company?.settings?.documentCustomization || {}),
            ...customization
        };
        const pdfBuffer = await generateInvoicePdfBuffer({ invoice, company, customization: effectiveCustomization });
        attachments.push({
            filename: `Facture_${docNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
        });
    } catch (pdfErr) {
        console.warn("Could not generate invoice PDF attachment:", pdfErr.message);
    }

    const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html,
        attachments,
        replyTo: connection.emailAddress
    });

    console.log(`[INVOICE EMAIL SENT] From: ${fromAddress} To: ${to} (MessageId: ${info.messageId})`);

    // Synchronisation automatique dans l'historique de messagerie omnicanale (SmsLog)
    if (invoice.clientId) {
        try {
            const log = await prisma.smsLog.create({
                data: {
                    companyId,
                    clientId: invoice.clientId,
                    channel: "EMAIL",
                    direction: "OUTGOING",
                    status: "DELIVERED",
                    subject,
                    body: `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre facture ${docNumber} d'un montant de ${totalTtc} € TTC.\nLien de paiement en ligne : ${paymentUrl}`,
                    emailMessageId: info.messageId || null,
                    attachments: [
                        {
                            filename: `Facture_${docNumber}.pdf`,
                            type: "invoice",
                            invoiceId: invoice.id,
                            number: docNumber,
                            total: invoice.amountTTC || 0
                        }
                    ],
                    emailConnectionId: connection.id
                }
            });
            emitToCompany(companyId, "message:new", {
                clientId: invoice.clientId,
                message: log
            });
        } catch (logErr) {
            console.warn("[SEND_INVOICE] Erreur journalisation smsLog:", logErr.message);
        }
    }

    return { success: true, messageId: info.messageId };
};

/**
 * Envoie une notification par email au SuperAdmin lorsqu'un client (Owner) écrit dans le Support Direct
 */
export const sendSupportNotificationToAdmin = async ({
    adminEmail,
    senderName,
    senderEmail,
    companyName,
    companyId,
    content,
    createdAt
}) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const adminChatUrl = `${frontendUrl}/admin`;
        const subject = `💬 Nouveau message Support : ${senderName} (${companyName || 'Entreprise'})`;

        const dateFormatted = new Date(createdAt || Date.now()).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
                <div style="max-width: 560px; margin: 0 auto; padding: 36px 20px;">
                    
                    <!-- Header Logo -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                        <tr>
                            <td style="vertical-align: middle; padding-right: 10px;">
                                <img src="${frontendUrl}/Logo-transparent.png" alt="GestArt" width="28" height="28" style="display: block; width: 28px; height: 28px; border: 0;" />
                            </td>
                            <td style="vertical-align: middle; font-size: 17px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                                GestArt <span style="font-weight: 500; font-size: 13px; color: #64748B; margin-left: 6px;">Support Direct</span>
                            </td>
                        </tr>
                    </table>

                    <div style="font-size: 15px; color: #334155; margin-bottom: 4px; line-height: 1.5;">
                        Nouveau message de <strong style="color: #0F172A;">${senderName}</strong> ${companyName ? `(${companyName})` : ''}
                    </div>

                    <div style="font-size: 13px; color: #64748B; margin-bottom: 24px;">
                        ${senderEmail ? `<a href="mailto:${senderEmail}" style="color: #64748B; text-decoration: underline;">${senderEmail}</a> • ` : ''}${dateFormatted}
                    </div>

                    <!-- The Message Content -->
                    <div style="font-size: 15.5px; line-height: 1.65; color: #0F172A; margin: 24px 0 32px 0; white-space: pre-wrap; word-break: break-word;">
${content}
                    </div>

                    <!-- Action Button -->
                    <div style="margin: 28px 0 36px 0;">
                        <a href="${adminChatUrl}" style="background-color: #556B2F; color: #FFFFFF !important; padding: 12px 24px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block;">
                            Ouvrir le chat Support →
                        </a>
                    </div>

                    <!-- Clean Minimalist Footer -->
                    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                        <p style="margin: 0;">Notification envoyée aux administrateurs GestArt CRM.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `Nouveau message Support Direct GestArt\n\nDe : ${senderName} (${companyName})\nEmail : ${senderEmail}\nDate : ${dateFormatted}\n\nMessage :\n${content}\n\nAccédez à la console Admin pour répondre : ${adminChatUrl}`;

        return await sendEmail({
            to: adminEmail,
            subject,
            html,
            text
        });
    } catch (err) {
        console.error("[SUPPORT NOTIFICATION EMAIL ERROR]", err);
        return { success: false, error: err.message };
    }
};

