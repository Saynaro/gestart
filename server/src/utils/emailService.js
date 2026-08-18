import nodemailer from "nodemailer";
import { generateQuotePdfBuffer, generateInvoicePdfBuffer } from "./pdfGenerator.js";

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

    const subject = "Vérification de votre compte - GestArt CRM";

    const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: linear-gradient(135deg, #131C0C 0%, #1C2812 100%); color: #F8FAFC; border-radius: 16px; border: 1px solid #36451C; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #A3E635; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">GestArt CRM</h1>
                <p style="color: #A3B18A; font-size: 14px; margin-top: 6px; font-weight: 500;">Confirmation de votre adresse email</p>
            </div>
            
            <div style="background: #243317; padding: 28px; border-radius: 12px; border: 1px solid #36451C;">
                <h2 style="font-size: 19px; margin-top: 0; color: #FFFFFF; font-weight: 700;">Bonjour ${firstName},</h2>
                <p style="color: #E2E8F0; line-height: 1.6; font-size: 15px;">Merci de vous être inscrit sur <strong>GestArt CRM</strong>. Pour finaliser la création de votre compte, veuillez saisir le code de vérification ci-dessous ou cliquer sur le bouton.</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #A3E635; background: #131C0C; display: inline-block; padding: 14px 32px; border-radius: 10px; border: 2px dashed #A3E635; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                        ${code}
                    </div>
                    <p style="font-size: 12px; color: #A3B18A; margin-top: 10px;">Ce code est valable pendant 15 minutes.</p>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                    <a href="${verifyUrl}" style="background-color: #556B2F; color: #ffffff; padding: 14px 32px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 30px; display: inline-block; box-shadow: 0 4px 14px rgba(85, 107, 47, 0.4); border: 1px solid #6B873B;">
                        Vérifier mon email
                    </a>
                </div>

                <p style="font-size: 13px; color: #94A3B8; margin-top: 24px; text-align: center;">
                    Ou copiez ce lien dans votre navigateur : <br/>
                    <a href="${verifyUrl}" style="color: #A3E635; word-break: break-all; font-weight: 500;">${verifyUrl}</a>
                </p>
            </div>

            <div style="text-align: center; margin-top: 28px; color: #A3B18A; font-size: 12px;">
                <p style="font-size: 11.5px; color: #94A3B8; margin-bottom: 8px;">💡 Si vous ne trouvez pas nos emails, vérifiez votre dossier <strong>Spam / Courriers indésirables</strong>. Email officiel : <strong>support.gestart@gmail.com</strong></p>
                <p>© 2026 GestArt CRM. L'outil CRM N°1 des artisans & installateurs.</p>
            </div>
        </div>
    `;

    const text = `Bonjour ${firstName},\n\nVotre code de vérification GestArt CRM est: ${code}\n\nOu cliquez sur ce lien pour vérifier votre email: ${verifyUrl}\n\n(Pensez à vérifier votre dossier Spam si besoin. Expéditeur : support.gestart@gmail.com)`;

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
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: linear-gradient(135deg, #131C0C 0%, #1C2812 100%); color: #F8FAFC; border-radius: 16px; border: 1px solid #36451C; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #A3E635; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">GestArt CRM</h1>
                <p style="color: #A3B18A; font-size: 14px; margin-top: 6px; font-weight: 500;">Demande de réinitialisation du mot de passe</p>
            </div>
            
            <div style="background: #243317; padding: 28px; border-radius: 12px; border: 1px solid #36451C;">
                <h2 style="font-size: 19px; margin-top: 0; color: #FFFFFF; font-weight: 700;">Bonjour ${firstName},</h2>
                <p style="color: #E2E8F0; line-height: 1.6; font-size: 15px;">Vous avez demandé la réinitialisation de votre mot de passe sur <strong>GestArt CRM</strong>. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" style="background-color: #556B2F; color: #ffffff; padding: 14px 34px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 30px; display: inline-block; box-shadow: 0 4px 14px rgba(85, 107, 47, 0.4); border: 1px solid #6B873B;">
                        Réinitialiser mon mot de passe
                    </a>
                </div>

                <p style="font-size: 12px; color: #A3B18A; margin-top: 18px; text-align: center;">Ce lien est valable pendant 1 heure.</p>

                <p style="font-size: 13px; color: #94A3B8; margin-top: 24px; text-align: center;">
                    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : <br/>
                    <a href="${resetUrl}" style="color: #A3E635; word-break: break-all; font-weight: 500;">${resetUrl}</a>
                </p>
            </div>

            <div style="text-align: center; margin-top: 28px; color: #A3B18A; font-size: 12px;">
                <p style="font-size: 11.5px; color: #94A3B8; margin-bottom: 8px;">💡 Si vous ne trouvez pas nos emails, vérifiez votre dossier <strong>Spam / Courriers indésirables</strong>. Email officiel : <strong>support.gestart@gmail.com</strong></p>
                <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
                <p>© 2026 GestArt CRM. L'outil CRM N°1 des artisans & installateurs.</p>
            </div>
        </div>
    `;

    const text = `Bonjour ${firstName},\n\nVous avez demandé la réinitialisation de votre mot de passe sur GestArt CRM. Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}\n\nLien valable pendant 1 heure.\n\n(Pensez à vérifier votre dossier Spam si besoin. Expéditeur : support.gestart@gmail.com)`;

    return await sendEmail({ to, subject, html, text });
};

/**
 * Send 2FA 6-digit verification code email
 */
export const sendTwoFactorCodeEmail = async ({ to, code, firstName = "Utilisateur" }) => {
    const subject = `${code} est votre code de vérification 2FA - GestArt CRM`;

    const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: linear-gradient(135deg, #131C0C 0%, #1C2812 100%); color: #F8FAFC; border-radius: 16px; border: 1px solid #36451C; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #A3E635; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">GestArt CRM</h1>
                <p style="color: #A3B18A; font-size: 14px; margin-top: 6px; font-weight: 500;">Double Authentification (2FA)</p>
            </div>
            
            <div style="background: #243317; padding: 28px; border-radius: 12px; border: 1px solid #36451C; text-align: center;">
                <h2 style="font-size: 19px; margin-top: 0; color: #FFFFFF; font-weight: 700;">Bonjour ${firstName},</h2>
                <p style="color: #E2E8F0; line-height: 1.6; font-size: 15px;">Voici votre code de sécurité à 6 chiffres pour vous connecter à votre compte GestArt CRM :</p>
                
                <div style="margin: 28px 0; padding: 18px 24px; background: #131C0C; border: 2px dashed #A3E635; border-radius: 12px; display: inline-block;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #A3E635;">${code}</span>
                </div>

                <p style="font-size: 13px; color: #A3B18A; margin-top: 8px;">Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.</p>
            </div>

            <div style="text-align: center; margin-top: 24px; color: #A3B18A; font-size: 12px;">
                <p style="font-size: 11.5px; color: #94A3B8; margin-bottom: 8px;">💡 Si vous ne trouvez pas nos emails, vérifiez votre dossier <strong>Spam / Courriers indésirables</strong>. Email officiel : <strong>support.gestart@gmail.com</strong></p>
                <p>Si vous n'êtes pas à l'origine de cette tentative de connexion, nous vous conseillons de changer immédiatement votre mot de passe.</p>
                <p>© 2026 GestArt CRM.</p>
            </div>
        </div>
    `;

    const text = `Bonjour ${firstName},\n\nVotre code de connexion 2FA GestArt CRM est : ${code}\n\nCe code expire dans 10 minutes.\n\n(Pensez à vérifier votre dossier Spam si besoin. Expéditeur : support.gestart@gmail.com)`;

    return await sendEmail({ to, subject, html, text });
};

/**
 * Send Quote to Client with Signature & Online Payment Link + PDF Attachment
 */
export const sendQuoteClientEmail = async ({ to, quote, company, signatureUrl, senderEmail, primaryColor = "#556B2F", customization = {} }) => {
    const companyName = company?.name || "Votre entreprise";
    const clientName = quote.client ? `${quote.client.firstName || ''} ${quote.client.lastName || quote.client.companyName || ''}`.trim() : "Client";
    const totalTtc = Number(quote.amountTTC || quote.totalTtc || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const docNumber = quote.number || "Devis";
    const accentColor = primaryColor || "#556B2F";

    const subject = `Devis ${docNumber} (${totalTtc} € TTC) — ${companyName}`;

    const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #0F172A; color: #F8FAFC; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">${companyName}</h1>
                <p style="color: #94A3B8; font-size: 14px; margin-top: 4px; font-weight: 500;">Devis & Proposition commerciale</p>
            </div>
            
            <div style="background: #1E293B; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
                <h2 style="font-size: 18px; margin-top: 0; color: #FFFFFF; font-weight: 700;">Bonjour ${clientName},</h2>
                <p style="color: #E2E8F0; line-height: 1.6; font-size: 15px;">
                    Veuillez trouver ci-joint votre devis <strong>${docNumber}</strong> d'un montant de <strong>${totalTtc} € TTC</strong> (fichier PDF attaché).
                </p>

                <div style="margin: 24px 0; padding: 18px; background: #0F172A; border-radius: 10px; border-left: 4px solid #3B82F6;">
                    <div style="font-size: 13px; color: #94A3B8; margin-bottom: 4px;">Montant du devis :</div>
                    <div style="font-size: 24px; font-weight: 800; color: #FFFFFF;">${totalTtc} € TTC</div>
                </div>
                
                <p style="color: #E2E8F0; line-height: 1.5; font-size: 14px;">
                    Vous pouvez consulter ce devis et <strong>le valider par signature électronique en ligne (valeur légale)</strong> :
                </p>

                <div style="text-align: center; margin: 28px 0;">
                    <a href="${signatureUrl}" target="_blank" style="background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
                        Signer le devis en ligne
                    </a>
                </div>

                <p style="font-size: 12px; color: #94A3B8; text-align: center; margin-top: 16px;">
                    Lien direct sécurisé : <a href="${signatureUrl}" style="color: #60A5FA; word-break: break-all;">${signatureUrl}</a>
                </p>
            </div>

            <div style="text-align: center; margin-top: 24px; color: #64748B; font-size: 12px; line-height: 1.5;">
                <p style="font-size: 11.5px; color: #94A3B8; margin-bottom: 8px;">💡 Si vous ne trouvez pas nos messages, pensez à vérifier votre dossier <strong>Spam / Courriers indésirables</strong>. Envoyé via <strong>GestArt (support.gestart@gmail.com)</strong>.</p>
                <p>Pour toute question relative à ce devis, vous pouvez répondre directement à cet email (${senderEmail || company?.email || ''}).</p>
                <p>© ${new Date().getFullYear()} ${companyName} • Tous droits réservés.</p>
            </div>
        </div>
    `;


    const text = `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre devis ${docNumber} d'un montant de ${totalTtc} € TTC.\n\nVous pouvez le consulter et le signer en ligne ici : ${signatureUrl}\n\n(Si besoin, vérifiez vos courriers indésirables/spams. Email expéditeur : support.gestart@gmail.com)\n\nCordialement,\n${companyName}`;

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

    return await sendEmail({ to, subject, html, text, attachments });
};

/**
 * Send Invoice to Client with Online Payment Link + PDF Attachment
 */
export const sendInvoiceClientEmail = async ({ to, invoice, company, paymentUrl, senderEmail, primaryColor = "#556B2F", customization = {} }) => {
    const companyName = company?.name || "Votre entreprise";
    const clientName = invoice.client ? `${invoice.client.firstName || ''} ${invoice.client.lastName || invoice.client.companyName || ''}`.trim() : "Client";
    const totalTtc = Number(invoice.amountTTC || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const docNumber = invoice.number || "Facture";
    const accentColor = primaryColor || "#556B2F";

    const subject = `Facture ${docNumber} (${totalTtc} € TTC) — ${companyName}`;

    const html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #0F172A; color: #F8FAFC; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">${companyName}</h1>
                <p style="color: #94A3B8; font-size: 14px; margin-top: 4px; font-weight: 500;">Facture officielle</p>
            </div>
            
            <div style="background: #1E293B; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
                <h2 style="font-size: 18px; margin-top: 0; color: #FFFFFF; font-weight: 700;">Bonjour ${clientName},</h2>
                <p style="color: #E2E8F0; line-height: 1.6; font-size: 15px;">
                    Veuillez trouver ci-joint votre facture <strong>${docNumber}</strong> d'un montant de <strong>${totalTtc} € TTC</strong> (fichier PDF attaché).
                </p>

                <div style="margin: 24px 0; padding: 18px; background: #0F172A; border-radius: 10px; border-left: 4px solid #3B82F6;">
                    <div style="font-size: 13px; color: #94A3B8; margin-bottom: 4px;">Net à payer :</div>
                    <div style="font-size: 24px; font-weight: 800; color: #FFFFFF;">${totalTtc} € TTC</div>
                </div>
                
                <p style="color: #E2E8F0; line-height: 1.5; font-size: 14px;">
                    Vous pouvez consulter le détail de votre facture, la télécharger en PDF ou <strong>effectuer votre paiement en ligne par carte bancaire sécurisée</strong> :
                </p>

                <div style="text-align: center; margin: 28px 0;">
                    <a href="${paymentUrl}" target="_blank" style="background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
                        Consulter & Payer ma facture
                    </a>
                </div>

                <p style="font-size: 12px; color: #94A3B8; text-align: center; margin-top: 16px;">
                    Lien direct sécurisé : <a href="${paymentUrl}" style="color: #60A5FA; word-break: break-all;">${paymentUrl}</a>
                </p>
            </div>

            <div style="text-align: center; margin-top: 24px; color: #64748B; font-size: 12px; line-height: 1.5;">
                <p style="font-size: 11.5px; color: #94A3B8; margin-bottom: 8px;">💡 Si vous ne trouvez pas nos messages, pensez à vérifier votre dossier <strong>Spam / Courriers indésirables</strong>. Envoyé via <strong>GestArt (support.gestart@gmail.com)</strong>.</p>
                <p>Pour toute question relative à cette facture, vous pouvez répondre directement à cet email (${senderEmail || company?.email || ''}).</p>
                <p>© ${new Date().getFullYear()} ${companyName} • Tous droits réservés.</p>
            </div>
        </div>
    `;


    const text = `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre facture ${docNumber} d'un montant de ${totalTtc} € TTC.\n\nVous pouvez la consulter et la régler en ligne ici : ${paymentUrl}\n\n(Si besoin, vérifiez vos courriers indésirables/spams. Email expéditeur : support.gestart@gmail.com)\n\nCordialement,\n${companyName}`;

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


    return await sendEmail({ to, subject, html, text, attachments });
};

