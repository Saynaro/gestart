import crypto from "crypto";

/**
 * Qonto OAuth 2.0 Integration Manager
 * Documented at https://docs.qonto.com/
 */
export class QontoOAuth {
    static AUTH_URL_STAGING = "https://oauth-sandbox.qonto.com/oauth2/auth";
    static AUTH_URL_PROD = "https://oauth.qonto.com/oauth2/auth";
    static TOKEN_URL_STAGING = "https://oauth-sandbox.qonto.com/oauth2/token";
    static TOKEN_URL_PROD = "https://oauth.qonto.com/oauth2/token";

    /**
     * Generate official Qonto OAuth 2.0 authorization URL
     * @param {Object} context { companyId: string, redirectUri: string, environment?: string }
     * @returns {{ url: string, state: string }}
     */
    static getAuthorizationUrl(context) {
        const clientId = process.env.QONTO_CLIENT_ID;
        if (!clientId) {
            throw new Error("Variable d'environnement QONTO_CLIENT_ID non configurée");
        }

        const environment = context.environment || process.env.QONTO_ENV || "production";
        const authBase = environment === "production" ? this.AUTH_URL_PROD : this.AUTH_URL_STAGING;

        const statePayload = JSON.stringify({
            companyId: context.companyId,
            nonce: crypto.randomBytes(16).toString("hex"),
            createdAt: Date.now()
        });
        const state = Buffer.from(statePayload).toString("base64url");

        const scopes = [
            "organization.read",
            "invoices.read",
            "invoices.write",
            "attachments.read"
        ].join(" ");

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: context.redirectUri,
            response_type: "code",
            scope: scopes,
            state
        });

        return {
            url: `${authBase}?${params.toString()}`,
            state
        };
    }

    /**
     * Exchange authorization code for access & refresh tokens
     * @param {Object} params { code: string, redirectUri: string, environment?: string }
     * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number, organizationId?: string }>}
     */
    static async exchangeCodeForTokens(params) {
        const clientId = process.env.QONTO_CLIENT_ID;
        const clientSecret = process.env.QONTO_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error("Identifiants OAuth Qonto (CLIENT_ID / CLIENT_SECRET) manquants sur le serveur");
        }

        const environment = params.environment || process.env.QONTO_ENV || "production";
        const tokenUrl = environment === "production" ? this.TOKEN_URL_PROD : this.TOKEN_URL_STAGING;

        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const bodyParams = new URLSearchParams({
            grant_type: "authorization_code",
            code: params.code,
            redirect_uri: params.redirectUri
        });

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${basicAuth}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: bodyParams.toString()
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erreur échange OAuth Qonto (${response.status}): ${errText}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
            tokenType: data.token_type,
            organizationId: data.organization_id || null
        };
    }

    /**
     * Refresh an expired OAuth access token
     * @param {string} refreshToken
     * @param {string} [environment='production']
     * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number }>}
     */
    static async refreshAccessToken(refreshToken, environment = "production") {
        const clientId = process.env.QONTO_CLIENT_ID;
        const clientSecret = process.env.QONTO_CLIENT_SECRET;

        const tokenUrl = environment === "production" ? this.TOKEN_URL_PROD : this.TOKEN_URL_STAGING;
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const bodyParams = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken
        });

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${basicAuth}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: bodyParams.toString()
        });

        if (!response.ok) {
            throw new Error(`Échec du rafraîchissement de token Qonto: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            expiresIn: data.expires_in
        };
    }
}
