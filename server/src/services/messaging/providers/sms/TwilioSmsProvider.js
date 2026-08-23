import { MessageProvider } from "../../interfaces/MessageProvider.js";
import { TwilioSmsService, validateTwilioWebhookSignature, normalizePhoneNumber } from "../../sms/twilio.service.js";

/**
 * Twilio SMS Provider implementing the MessageProvider interface
 * Wraps the existing, tested TwilioSmsService with 100% fidelity.
 */
export class TwilioSmsProvider extends MessageProvider {
    constructor() {
        super("SMS");
    }

    /**
     * Sends an outbound SMS via Twilio
     */
    async sendMessage({ companyId, clientId, body, autoType = "manual", statusCallbackUrl }) {
        return await TwilioSmsService.sendSms({
            companyId,
            clientId,
            body,
            autoType,
            statusCallbackUrl
        });
    }

    /**
     * Handles incoming SMS webhook from Twilio
     */
    async handleIncomingWebhook({ from, to, body, messageSid, rawPayload }) {
        return await TwilioSmsService.handleIncomingSms({
            from,
            to,
            body,
            messageSid,
            rawPayload
        });
    }

    /**
     * Handles Twilio delivery status callbacks
     */
    async handleStatusWebhook({ messageSid, messageStatus, errorCode, errorMessage }) {
        return await TwilioSmsService.handleStatusCallback({
            messageSid,
            messageStatus,
            errorCode,
            errorMessage
        });
    }

    /**
     * Validates Twilio signature
     */
    validateWebhookSignature(req) {
        return validateTwilioWebhookSignature(req);
    }

    /**
     * Checks if SMS channel is available for this client
     */
    async isChannelAvailable(client, company) {
        if (!client?.phone) {
            return {
                available: false,
                reason: "Le client n'a pas de numéro de téléphone renseigné"
            };
        }

        const normalized = normalizePhoneNumber(client.phone);
        if (!normalized) {
            return {
                available: false,
                reason: "Le numéro de téléphone du client est dans un format invalide"
            };
        }

        return {
            available: true,
            phone: normalized
        };
    }
}

export const twilioSmsProvider = new TwilioSmsProvider();
export default twilioSmsProvider;
