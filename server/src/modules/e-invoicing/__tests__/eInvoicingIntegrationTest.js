import assert from "assert";
import { prisma } from "../../../config/db.js";
import { EInvoicingService } from "../services/EInvoicingService.js";
import { B2brouterWebhookHandler } from "../providers/b2brouter/B2brouterWebhookHandler.js";

async function runIntegrationTests() {
    console.log("==================================================");
    console.log("  FACTURATION ÉLECTRONIQUE INTEGRATION & E2E TEST ");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    async function testAsync(name, fn) {
        try {
            await fn();
            console.log(`  ✔ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✖ [FAIL] ${name}:`, err.message);
            failed++;
        }
    }

    // Find or create test company
    let company = await prisma.company.findFirst({
        include: { settings: true }
    });

    if (!company) {
        company = await prisma.company.create({
            data: {
                name: "ClimAzur Solutions SARL",
                siren: "732829320",
                siret: "73282932000074",
                tvaNumber: "FR88732829320",
                legalForm: "SARL",
                address: "12 Avenue Jean Médecin",
                city: "Nice",
                postalCode: "06000",
                settings: {
                    create: {
                        invoicePrefix: "INV",
                        invoiceNextNumber: 101,
                        defaultPaymentDays: 30
                    }
                }
            }
        });
    }

    const companyId = company.id;

    // 1. CONNECT COMPANY TO B2BROUTER
    await testAsync("Connect company to B2Brouter sandbox", async () => {
        const result = await EInvoicingService.connectCompany(companyId, {
            provider: "B2BROUTER",
            apiKey: "b2b_sandbox_test_key_sample_748392019485762019",
            accountId: "acc_climazur_test_01",
            environment: "sandbox"
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.accountId, "acc_climazur_test_01");
    });

    // 2. GET CONNECTION DETAILS (SECURITY TEST: NO SECRETS IN RESPONSE)
    await testAsync("Get connection details without exposing sensitive secrets", async () => {
        const connection = await EInvoicingService.getConnection(companyId);

        assert.strictEqual(connection.connected, true);
        assert.strictEqual(connection.provider, "B2BROUTER");
        assert.strictEqual(connection.receivingEnabled, true);
        // Verify no secrets leaked
        assert.strictEqual(connection.apiKeyEncrypted, undefined);
        assert.strictEqual(connection.apiKey, undefined);
        assert.strictEqual(connection.apiSecret, undefined);
    });

    // 3. TEST ACTIVE CONNECTION
    await testAsync("Test active connection handler", async () => {
        const testRes = await EInvoicingService.testConnection(companyId);
        assert.strictEqual(typeof testRes.connected, "boolean");
    });

    // 4. INCOMING SUPPLIER INVOICE WEBHOOK SIMULATION (RÉCEPTION 2026)
    const testSupplierInvoiceId = `b2b_inv_supp_${Date.now()}`;
    await testAsync("Process incoming supplier invoice webhook (Réception 2026)", async () => {
        const webhookPayload = {
            id: `evt_${Date.now()}`,
            event: "invoice.received",
            type: "ReceivedInvoice",
            account_id: "acc_climazur_test_01",
            invoice: {
                id: testSupplierInvoiceId,
                type: "ReceivedInvoice",
                invoice_number: `FAC-DAIKIN-${Math.floor(Math.random() * 10000)}`,
                issue_date: "2026-08-14",
                due_date: "2026-09-14",
                currency: "EUR",
                total_amount_without_tax: 1500,
                total_tax_amount: 300,
                total_amount_with_tax: 1800,
                status: "received",
                format: "Factur-X",
                pdf_url: "https://storage.b2brouter.net/invoices/sample.pdf",
                contact: {
                    name: "Daikin France SAS",
                    taxcode: "44306184100047", // Valid French SIRET
                    vat_number: "FR12443061841",
                    address: "Zone Industrielle Nord",
                    city: "Lyon",
                    postal_code: "69000",
                    country: "FR",
                    email: "comptabilite@daikin.fr"
                }
            }
        };

        const result = await B2brouterWebhookHandler.handleWebhook(webhookPayload, {});
        assert.strictEqual(result.success, true);

        // Verify record created in database
        const received = await prisma.receivedInvoice.findFirst({
            where: {
                companyId,
                providerInvoiceId: testSupplierInvoiceId
            }
        });

        assert.ok(received, "ReceivedInvoice record should exist in database");
        assert.strictEqual(received.supplierName, "Daikin France SAS");
        assert.strictEqual(received.totalHT, 1500);
        assert.strictEqual(received.totalTTC, 1800);
        assert.strictEqual(received.status, "RECEIVED");
    });

    // 5. WEBHOOK IDEMPOTENCY DEDUPLICATION TEST
    await testAsync("Duplicate webhook events are handled idempotently", async () => {
        const webhookPayload = {
            id: `evt_duplicate_test_${Date.now()}`,
            event: "invoice.received",
            type: "ReceivedInvoice",
            account_id: "acc_climazur_test_01",
            invoice: {
                id: testSupplierInvoiceId,
                invoice_number: "FAC-DAIKIN-DUP",
                total_amount_without_tax: 1500,
                total_amount_with_tax: 1800,
                status: "received",
                contact: { name: "Daikin France SAS" }
            }
        };

        // First delivery
        const first = await B2brouterWebhookHandler.handleWebhook(webhookPayload, {});
        assert.strictEqual(first.success, true);
        assert.strictEqual(first.duplicate, undefined);

        // Replay of the exact same event
        const second = await B2brouterWebhookHandler.handleWebhook(webhookPayload, {});
        assert.strictEqual(second.success, true);
        assert.strictEqual(second.duplicate, true);
    });

    // 6. GET RECEIVED INVOICES VIA SERVICE
    await testAsync("Fetch paginated received supplier invoices", async () => {
        const result = await EInvoicingService.getReceivedInvoices(companyId, { page: 1, limit: 10 });
        assert.ok(Array.isArray(result.invoices));
        assert.ok(result.invoices.length > 0);
        assert.ok(result.pagination.total >= 1);
    });

    console.log("--------------------------------------------------");
    console.log(`Integration Results: ${passed} passed, ${failed} failed.`);
    console.log("==================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runIntegrationTests().catch(err => {
    console.error("Integration test suite fatal error:", err);
    process.exit(1);
});
