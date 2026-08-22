import { normalizePhoneNumber, getSmsSender, TwilioSmsService } from "../src/services/messaging/sms/twilio.service.js";
import { prisma } from "../src/config/db.js";

async function runTests() {
    console.log("==================================================");
    console.log("STARTING TWILIO TWO-WAY SMS INTEGRATION TESTS");
    console.log("==================================================");

    let passedTests = 0;
    let failedTests = 0;

    const assert = (condition, description) => {
        if (condition) {
            console.log(`PASS: ${description}`);
            passedTests++;
        } else {
            console.error(`FAIL: ${description}`);
            failedTests++;
        }
    };

    try {
        // ── 1. Phone Normalization Tests ─────────────────────────
        console.log("\n[TEST GROUP 1] Phone Number Normalization");
        assert(normalizePhoneNumber("0612345678") === "+33612345678", "Normalizes 0612345678 to +33612345678");
        assert(normalizePhoneNumber("07 12 34 56 78") === "+33712345678", "Normalizes spaced French mobile 07 12 34 56 78");
        assert(normalizePhoneNumber("+33 6 12 34 56 78") === "+33612345678", "Normalizes international spaced +33 6 12 34 56 78");
        assert(normalizePhoneNumber("01.40.50.60.70") === "+33140506070", "Normalizes French landline with dots");
        assert(normalizePhoneNumber("invalid-number") === null, "Rejects invalid phone strings");
        assert(normalizePhoneNumber("") === null, "Handles empty phone string");

        // ── 2. Multi-Tenant Sender Resolution Tests ─────────────
        console.log("\n[TEST GROUP 2] Multi-Tenant Sender Resolution");
        // Create test companies
        const compA = await prisma.company.upsert({
            where: { id: "test_comp_a" },
            update: { smsNumber: "+33600000001" },
            create: {
                id: "test_comp_a",
                name: "Test Entreprise A",
                smsNumber: "+33600000001"
            }
        });

        const compB = await prisma.company.upsert({
            where: { id: "test_comp_b" },
            update: { smsNumber: null },
            create: {
                id: "test_comp_b",
                name: "Test Entreprise B",
                smsNumber: null
            }
        });

        const senderA = await getSmsSender(compA.id);
        assert(senderA === "+33600000001", "Resolves dedicated SMS sender for Company A");

        const senderB = await getSmsSender(compB.id);
        const expectedGlobal = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_PHONE_NUMBER || null;
        assert(senderB === (expectedGlobal ? normalizePhoneNumber(expectedGlobal) || expectedGlobal : null), "Falls back to global SMS sender for Company B");

        // ── 3. Outbound SMS Execution Tests ──────────────────────
        console.log("\n[TEST GROUP 3] Outbound SMS Sending & Storage");
        const clientA = await prisma.client.upsert({
            where: { id: "test_client_a1" },
            update: { phone: "0612345678" },
            create: {
                id: "test_client_a1",
                companyId: compA.id,
                firstName: "Jean",
                lastName: "Dupont",
                phone: "0612345678",
                address: "10 rue de Paris"
            }
        });

        const outboundLog = await TwilioSmsService.sendSms({
            companyId: compA.id,
            clientId: clientA.id,
            body: "Bonjour Jean, intervention confirmée demain à 14h.",
            autoType: "appointment_confirm"
        });

        assert(outboundLog && outboundLog.id, "Creates SmsLog in database");
        assert(outboundLog.direction === "OUTGOING", "Direction is OUTGOING");
        assert(outboundLog.channel === "SMS", "Channel is SMS");
        assert(outboundLog.fromNumber === "+33600000001", "FromNumber matches company sender");
        assert(outboundLog.toNumber === "+33612345678", "ToNumber is normalized E.164");
        assert(outboundLog.twilioSid !== null, "Generates or records TwilioSid");

        // ── 4. Cross-Tenant Security Check ───────────────────────
        console.log("\n[TEST GROUP 4] Multi-Tenant Isolation Security");
        let crossTenantBlocked = false;
        try {
            await TwilioSmsService.sendSms({
                companyId: compB.id, // Company B attempting to access Company A's client!
                clientId: clientA.id,
                body: "Tentative d'accès interdit"
            });
        } catch (e) {
            crossTenantBlocked = true;
        }
        assert(crossTenantBlocked, "Blocks unauthorized cross-tenant SMS access");

        // ── 5. Inbound SMS Webhook & Idempotency ───────────────────
        console.log("\n[TEST GROUP 5] Inbound Webhook & Idempotency");
        const testSid = `SM_test_incoming_${Date.now()}`;
        const incomingResult1 = await TwilioSmsService.handleIncomingSms({
            from: "+33612345678",
            to: "+33600000001",
            body: "Parfait, je serai bien présent.",
            messageSid: testSid
        });

        assert(incomingResult1.success === true, "Processes incoming SMS successfully");
        assert(incomingResult1.smsLog.direction === "INCOMING", "Incoming message direction is INCOMING");
        assert(incomingResult1.smsLog.clientId === clientA.id, "Correctly attributes message to Jean Dupont");
        assert(incomingResult1.smsLog.companyId === compA.id, "Correctly attributes message to Company A");

        // Test idempotency: resend the exact same MessageSid
        const incomingResult2 = await TwilioSmsService.handleIncomingSms({
            from: "+33612345678",
            to: "+33600000001",
            body: "Parfait, je serai bien présent.",
            messageSid: testSid
        });

        assert(incomingResult2.isDuplicate === true, "Idempotency prevents duplicate message on repeated webhook");

        // ── 6. Status Callback Test ──────────────────────────────
        console.log("\n[TEST GROUP 6] Delivery Status Callback");
        const statusUpdated = await TwilioSmsService.handleStatusCallback({
            messageSid: outboundLog.twilioSid,
            messageStatus: "delivered"
        });

        assert(statusUpdated && statusUpdated.status === "delivered", "Updates message status to 'delivered'");

        // ── Cleanup Test Data ────────────────────────────────────
        await prisma.smsLog.deleteMany({
            where: {
                OR: [
                    { companyId: compA.id },
                    { companyId: compB.id }
                ]
            }
        });
        await prisma.notification.deleteMany({
            where: { companyId: compA.id }
        });
        await prisma.client.deleteMany({
            where: {
                OR: [
                    { id: clientA.id },
                    { companyId: compA.id },
                    { companyId: compB.id }
                ]
            }
        });
        await prisma.company.deleteMany({
            where: {
                id: { in: [compA.id, compB.id] }
            }
        });

    } catch (err) {
        console.error("💥 TEST ERROR:", err);
        failedTests++;
    }

    console.log("\n==================================================");
    console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("==================================================");

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
