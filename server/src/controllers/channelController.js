import { ChannelConnectionService } from "../services/messaging/ChannelConnectionService.js";

/**
 * Récupère le statut de tous les canaux de communication pour l'entreprise
 * GET /api/v1/communication/channels
 */
export const getChannelsStatus = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const data = await ChannelConnectionService.getCompanyChannels(companyId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("GET CHANNELS STATUS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la récupération des canaux de communication"
        });
    }
};

/**
 * Connecte un compte WhatsApp Business
 * POST /api/v1/communication/whatsapp/connect
 */
export const connectWhatsApp = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { code, phoneNumberId, wabaId, displayPhoneNumber, verifiedName, accessToken } = req.body;

        const connection = await ChannelConnectionService.connectWhatsApp({
            companyId,
            code,
            phoneNumberId,
            wabaId,
            displayPhoneNumber,
            verifiedName,
            accessToken
        });

        return res.status(200).json({
            success: true,
            message: "Compte WhatsApp Business connecté avec succès !",
            data: { connection }
        });
    } catch (error) {
        console.error("CONNECT WHATSAPP ERROR:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de la connexion WhatsApp"
        });
    }
};

/**
 * Test de connectivité WhatsApp
 * POST /api/v1/communication/whatsapp/test
 */
export const testWhatsApp = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const result = await ChannelConnectionService.testWhatsAppConnection(companyId);
        return res.status(200).json(result);
    } catch (error) {
        console.error("TEST WHATSAPP ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors du test WhatsApp"
        });
    }
};

/**
 * Déconnecte WhatsApp
 * POST /api/v1/communication/whatsapp/disconnect
 */
export const disconnectWhatsApp = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.body;

        await ChannelConnectionService.disconnectWhatsApp(companyId, connectionId);

        return res.status(200).json({
            success: true,
            message: "Canal WhatsApp déconnecté."
        });
    } catch (error) {
        console.error("DISCONNECT WHATSAPP ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la déconnexion WhatsApp"
        });
    }
};

/**
 * Connecte une boîte email (Google, Microsoft, SMTP)
 * POST /api/v1/communication/email/connect
 */
export const connectEmail = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const connection = await ChannelConnectionService.connectEmail({
            companyId,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "Compte Email connecté avec succès !",
            data: { connection }
        });
    } catch (error) {
        console.error("CONNECT EMAIL ERROR:", error.message);
        return res.status(400).json({
            success: false,
            message: error.message || "Erreur lors de la connexion Email"
        });
    }
};

/**
 * Test de connectivité Email
 * POST /api/v1/communication/email/test
 */
export const testEmail = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const result = await ChannelConnectionService.testEmailConnection(companyId);
        return res.status(200).json(result);
    } catch (error) {
        console.error("TEST EMAIL ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors du test Email"
        });
    }
};

/**
 * Déconnecte un compte Email
 * POST /api/v1/communication/email/disconnect
 */
export const disconnectEmail = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.body;

        await ChannelConnectionService.disconnectEmail(companyId, connectionId);

        return res.status(200).json({
            success: true,
            message: "Boîte Email déconnectée."
        });
    } catch (error) {
        console.error("DISCONNECT EMAIL ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la déconnexion Email"
        });
    }
};

/**
 * Démarre le flux OAuth 1-clic Google Workspace / Gmail
 * GET /api/v1/communication/email/google/auth
 */
export const startGoogleEmailAuth = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5001').trim();
        const redirectUri = `${backendUrl}/api/v1/auth/google/callback`;

        if (!googleClientId) {
            return res.status(400).json({
                success: false,
                message: "GOOGLE_CLIENT_ID n'est pas configuré sur le serveur."
            });
        }

        const params = new URLSearchParams({
            client_id: googleClientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
            access_type: "offline",
            prompt: "consent",
            state: Buffer.from(JSON.stringify({ type: "email_channel", companyId })).toString("base64")
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        return res.redirect(authUrl);
    } catch (error) {
        console.error("START GOOGLE AUTH ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de l'initialisation Google OAuth"
        });
    }
};

/**
 * Callback de retour Google OAuth pour connexion de boîte Email
 * GET /api/v1/communication/email/google/callback
 */
export const handleGoogleEmailCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`${frontendUrl}/settings?tab=communication&error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            return res.redirect(`${frontendUrl}/settings?tab=communication&error=invalid_request`);
        }

        let stateData = {};
        try {
            stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
        } catch (e) {
            console.error("Invalid state:", e.message);
        }

        const companyId = stateData.companyId;
        if (!companyId) {
            return res.redirect(`${frontendUrl}/settings?tab=communication&error=missing_company`);
        }

        const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
        const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');
        const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
        const redirectUri = `${backendUrl}/api/v1/communication/email/google/callback`;

        // Échange du code contre les tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: googleClientId,
                client_secret: googleClientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(tokenData.error_description || "Impossible de récupérer les jetons Google");
        }

        // Récupération de l'adresse email et du nom du compte
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await userRes.json();

        const emailAddress = profile.email;
        const displayName = profile.name || emailAddress;

        // Enregistrement dans la base
        await ChannelConnectionService.connectEmail({
            companyId,
            provider: "GOOGLE",
            emailAddress,
            displayName,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in
        });

        return res.redirect(`${frontendUrl}/settings?tab=communication&connected=google`);
    } catch (err) {
        console.error("GOOGLE EMAIL CALLBACK ERROR:", err.message);
        return res.redirect(`${frontendUrl}/settings?tab=communication&error=${encodeURIComponent(err.message)}`);
    }
};
