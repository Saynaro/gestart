import nodemailer from "nodemailer";

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
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
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
export const sendEmail = async ({ to, subject, html, text }) => {
    const from = process.env.EMAIL_FROM || '"GestArt CRM" <support.gestart@gmail.com>';
    const transporter = createTransporter();

    if (!transporter) {
        console.log("--------------------------------------------------");
        console.log(`[EMAIL SERVICE - DEV FALLBACK]`);
        console.log(`TO: ${to}`);
        console.log(`SUBJECT: ${subject}`);
        console.log(`BODY (TEXT): ${text || "See HTML"}`);
        console.log(`HTML: ${html}`);
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
        });
        console.log(`[EMAIL SENT] MessageId: ${info.messageId} to ${to}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
        console.log(`[DEV FALLBACK DUE TO SMTP ERROR]:`);
        console.log(`TO: ${to}`);
        console.log(`SUBJECT: ${subject}`);
        console.log(`TEXT: ${text}`);
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
                <p>© 2026 GestArt CRM. L'outil CRM N°1 des artisans & installateurs.</p>
            </div>
        </div>
    `;

    const text = `Bonjour ${firstName},\n\nVotre code de vérification GestArt CRM est: ${code}\n\nOu cliquez sur ce lien pour vérifier votre email: ${verifyUrl}`;

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
                <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
                <p>© 2026 GestArt CRM. L'outil CRM N°1 des artisans & installateurs.</p>
            </div>
        </div>
    `;

    const text = `Bonjour ${firstName},\n\nVous avez demandé la réinitialisation de votre mot de passe sur GestArt CRM. Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}\n\nLien valable pendant 1 heure.`;

    return await sendEmail({ to, subject, html, text });
};
