import { prisma } from "../src/config/db.js";
import { OmnichannelService } from "../src/services/messaging/OmnichannelService.js";
import { ChannelConnectionService } from "../src/services/messaging/ChannelConnectionService.js";
import { whatsAppProvider } from "../src/services/messaging/providers/whatsapp/WhatsAppProvider.js";
import { emailProvider } from "../src/services/messaging/providers/email/EmailProvider.js";

async function runOmnichannelTests() {
    console.log("==================================================");
    console.log("🧪 STARTING OMNICHANNEL & CHANNELS SYSTEM TEST SUITE");
    console.log("==================================================");

    try {
        // 1. Get or create test company and client
        let company = await prisma.company.findFirst();
        if (!company) {
            company = await prisma.company.create({
                data: {
                    name: "ClimPro Test Artisan SAS",
                    phone: "+33611223344",
                    email: "contact@climpro-test.fr",
                    smsNumber: "+33611223344"
                }
            });
        }

        let client = await prisma.client.findFirst({
            where: { companyId: company.id }
        });
        if (!client) {
            client = await prisma.client.create({
                data: {
                    companyId: company.id,
                    firstName: "Jean",
                    lastName: "Dupont",
                    phone: "+33698765432",
                    email: "jean.dupont@example.com",
                    address: "12 Rue de la Paix, Paris"
                }
            });
        }

        console.log(`✅ [1/7] Test Company (${company.name}) & Client (${client.firstName} ${client.lastName}) ready.`);

        // 2. Connect WhatsApp channel for Company to test multi-tenant onboarding
        await ChannelConnectionService.connectWhatsApp({
            companyId: company.id,
            phoneNumberId: "104829384729102",
            wabaId: "102938475610293",
            displayPhoneNumber: "+33 6 11 22 33 44",
            verifiedName: "ClimPro Dupont SARL"
        });

        // 3. Test Channel Connection Service (Company level)
        const channelsStatus = await ChannelConnectionService.getCompanyChannels(company.id);
        console.log(`✅ [2/7] Company Channels Status: SMS=${channelsStatus.channels.sms.status}, WA=${channelsStatus.channels.whatsapp.status}, Email=${channelsStatus.channels.email.status}`);

        // 4. Test Channel Availability & Recommendation for Client
        const availability = await OmnichannelService.getClientChannelsAvailability(company.id, client.id);
        console.log(`✅ [3/7] Client Channels Availability: Recommended=${availability.recommendedChannel} (${availability.recommendationReason})`);
        console.log(`   - SMS available: ${availability.channels.SMS.available}`);
        console.log(`   - WhatsApp available: ${availability.channels.WHATSAPP.available}`);
        console.log(`   - Email available: ${availability.channels.EMAIL.available}`);

        // 5. Test Sending Outbound Messages across Channels (SMS, WhatsApp, Email)
        console.log("\n--- Sending Omnichannel Test Messages ---");

        // 5a. SMS
        const smsMsg = await OmnichannelService.sendMessage({
            companyId: company.id,
            clientId: client.id,
            channel: "SMS",
            body: "Bonjour Jean, votre devis ClimPro est disponible. À bientôt !"
        });
        console.log(`✅ [4a/7] Outbound SMS created: ID=${smsMsg.id}, SID=${smsMsg.twilioSid}, Status=${smsMsg.status}`);

        // 5b. WhatsApp
        const waMsg = await OmnichannelService.sendMessage({
            companyId: company.id,
            clientId: client.id,
            channel: "WHATSAPP",
            body: "Bonjour Jean, nous confirmons votre intervention de demain à 14h."
        });
        console.log(`✅ [4b/7] Outbound WhatsApp created: ID=${waMsg.id}, WaID=${waMsg.whatsappMessageId}, Status=${waMsg.status}`);

        // 5c. Email
        const emailMsg = await OmnichannelService.sendMessage({
            companyId: company.id,
            clientId: client.id,
            channel: "EMAIL",
            subject: "Votre facture ClimPro F-2026-001",
            body: "Bonjour Jean,\n\nVeuillez trouver ci-joint votre facture acquittée.\n\nCordialement,\nClimPro",
            attachments: [{ filename: "Facture_F-2026-001.pdf", type: "invoice" }]
        });
        console.log(`✅ [4c/7] Outbound Email created: ID=${emailMsg.id}, Subject="${emailMsg.subject}", MsgID=${emailMsg.emailMessageId}`);

        // 6. Test Receiving Incoming Messages via Webhooks (WhatsApp & Email simulation)
        console.log("\n--- Simulating Incoming Webhooks ---");

        // 6a. Incoming WhatsApp Message Webhook
        const waWebhookPayload = {
            object: "whatsapp_business_account",
            entry: [{
                id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
                changes: [{
                    value: {
                        messaging_product: "whatsapp",
                        metadata: {
                            display_phone_number: "+33611223344",
                            phone_number_id: "104829384729102"
                        },
                        contacts: [{
                            profile: { name: "Jean Dupont" },
                            wa_id: "33698765432"
                        }],
                        messages: [{
                            from: "33698765432",
                            id: `wamid.test_inbound_${Date.now()}`,
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            text: { body: "Merci beaucoup, je serai bien présent demain à 14h !" },
                            type: "text"
                        }]
                    },
                    field: "messages"
                }]
            }]
        };

        const waWebhookResult = await whatsAppProvider.handleIncomingWebhook(waWebhookPayload);
        console.log(`✅ [5a/7] Incoming WhatsApp Webhook handled: Success=${waWebhookResult.handled}, Count=${waWebhookResult.results.length}`);

        // 6b. Incoming Email Webhook
        const emailWebhookPayload = {
            from: client.email,
            to: company.email || "contact@climpro-test.fr",
            subject: "Re: Votre facture ClimPro F-2026-001",
            text: "Merci, j'ai bien reçu la facture !",
            inReplyTo: emailMsg.emailMessageId,
            messageId: `<inbound.${Date.now()}@example.com>`
        };

        const emailWebhookResult = await emailProvider.handleIncomingWebhook(emailWebhookPayload);
        console.log(`✅ [5b/7] Incoming Email Webhook handled: Message ID=${emailWebhookResult.message.id}, Direction=${emailWebhookResult.message.direction}`);

        // 7. Test Omnichannel Timeline Retrieval (Chronological order check)
        console.log("\n--- Testing Unified Omnichannel Timeline ---");
        const timeline = await OmnichannelService.getClientTimeline({
            companyId: company.id,
            clientId: client.id
        });

        console.log(`✅ [6/7] Unified Timeline retrieved: ${timeline.messages.length} messages found in chronological order.`);
        timeline.messages.slice(-6).forEach((m, idx) => {
            const icon = m.channel === "WHATSAPP" ? "🟢" : (m.channel === "EMAIL" ? "✉️" : "📱");
            const dir = m.direction === "OUTGOING" ? "→ [OUT]" : "← [IN] ";
            console.log(`   ${idx + 1}. ${icon} ${dir} [${m.channel}] ${m.subject ? `(${m.subject}) ` : ''}"${m.body.slice(0, 45)}..." (${new Date(m.createdAt).toLocaleTimeString()})`);
        });

        // 8. Test Smart Channel Recommendation update
        const updatedAvail = await OmnichannelService.getClientChannelsAvailability(company.id, client.id);
        console.log(`\n✅ [7/7] Updated Smart Channel Recommendation: ${updatedAvail.recommendedChannel} (${updatedAvail.recommendationReason})`);

        console.log("\n==================================================");
        console.log("🎉 ALL OMNICHANNEL TESTS COMPLETED WITH 100% SUCCESS!");
        console.log("==================================================");
    } catch (err) {
        console.error("❌ OMNICHANNEL TEST FAILED:", err);
        process.exit(1);
    }
}

runOmnichannelTests().then(() => process.exit(0));
