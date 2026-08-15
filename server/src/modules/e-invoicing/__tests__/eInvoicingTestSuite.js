import assert from "assert";
import { EInvoicingValidator, isValidSiret, isValidSiren } from "../services/EInvoicingValidator.js";
import { CanonicalInvoiceMapper } from "../services/CanonicalInvoiceMapper.js";
import { B2brouterMapper } from "../providers/b2brouter/B2brouterMapper.js";
import { encryptCredential, decryptCredential } from "../services/EncryptionService.js";
import { B2brouterWebhookHandler } from "../providers/b2brouter/B2brouterWebhookHandler.js";
import { INVOICE_TYPE, VAT_CATEGORY } from "../interfaces/CanonicalTypes.js";

async function runTests() {
    console.log("==================================================");
    console.log("  FACTURATION ÉLECTRONIQUE (E-INVOICING) TESTS    ");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✔ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✖ [FAIL] ${name}:`, err.message);
            failed++;
        }
    }

    // Valid French test data
    // 73282932000074 is a valid French SIRET passing Luhn
    const validSellerSiret = "73282932000074";
    const validSellerSiren = "732829320";
    const validBuyerSiret = "44306184100047";
    const validBuyerSiren = "443061841";

    // 1. SIRET & SIREN LUHN VALIDATION
    test("Luhn algorithm validates correct SIRET and SIREN", () => {
        assert.strictEqual(isValidSiret(validSellerSiret), true);
        assert.strictEqual(isValidSiren(validSellerSiren), true);
        assert.strictEqual(isValidSiret(validBuyerSiret), true);
        assert.strictEqual(isValidSiren(validBuyerSiren), true);
        // Invalid numbers
        assert.strictEqual(isValidSiret("12345678901234"), false);
        assert.strictEqual(isValidSiren("123456789"), false);
    });

    // 2. VALID B2B INVOICE TEST
    test("Valid B2B invoice passes EN 16931 validation", () => {
        const validInvoice = {
            number: "INV-2026-001",
            issueDate: "2026-08-15",
            typeCode: INVOICE_TYPE.COMMERCIAL_INVOICE,
            currency: "EUR",
            seller: {
                name: "ClimPro SARL",
                siret: validSellerSiret,
                siren: validSellerSiren,
                vatNumber: "FR88732829320",
                address: "10 rue de la Paix",
                city: "Nice",
                postalCode: "06000",
                country: "FR"
            },
            buyer: {
                name: "Société Hôtelière Azur",
                isB2B: true,
                siret: validBuyerSiret,
                siren: validBuyerSiren,
                vatNumber: "FR12443061841",
                address: "25 Promenade des Anglais",
                city: "Nice",
                postalCode: "06000",
                country: "FR"
            },
            lines: [
                {
                    position: 1,
                    description: "Installation Pompe à Chaleur Daikin",
                    quantity: 1,
                    unitPrice: 4500,
                    discount: 0,
                    vatRate: 20
                },
                {
                    position: 2,
                    description: "Forfait Mise en service & raccordement",
                    quantity: 2,
                    unitPrice: 250,
                    discount: 10, // 2 * 250 * 0.9 = 450
                    vatRate: 20
                }
            ],
            amountHT: 4950,
            amountTTC: 5940 // 4950 * 1.2 = 5940
        };

        const result = EInvoicingValidator.validate(validInvoice);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.calculated.totalHT, 4950);
        assert.strictEqual(result.calculated.totalTTC, 5940);
    });

    // 3. MISSING MANDATORY FIELDS
    test("Rejects invoice with missing mandatory fields (BT-1, BT-2, seller name, lines)", () => {
        const invalidInvoice = {
            currency: "EUR"
        };
        const result = EInvoicingValidator.validate(invalidInvoice);
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.some(e => e.field === "number"), true);
        assert.strictEqual(result.errors.some(e => e.field === "issueDate"), true);
        assert.strictEqual(result.errors.some(e => e.field === "seller.name"), true);
        assert.strictEqual(result.errors.some(e => e.field === "lines"), true);
    });

    // 4. INVALID SIRET / SIREN
    test("Rejects invoice with invalid SIRET", () => {
        const invoice = {
            number: "INV-2026-002",
            issueDate: "2026-08-15",
            currency: "EUR",
            seller: {
                name: "ClimPro SARL",
                siret: "12345678901234", // Invalid Luhn
                address: "10 rue de la Paix"
            },
            buyer: {
                name: "Client Pro",
                isB2B: true,
                siret: validBuyerSiret,
                address: "20 avenue Foch"
            },
            lines: [{ description: "Service", quantity: 1, unitPrice: 100, vatRate: 20 }],
            amountHT: 100,
            amountTTC: 120
        };

        const result = EInvoicingValidator.validate(invoice);
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.some(e => e.field === "seller.siret"), true);
    });

    // 5. INCOHERENT TOTALS AND VAT CALCULATION
    test("Detects and rejects inconsistent HT, VAT or TTC totals", () => {
        const invoice = {
            number: "INV-2026-003",
            issueDate: "2026-08-15",
            currency: "EUR",
            seller: {
                name: "ClimPro SARL",
                siret: validSellerSiret,
                address: "10 rue de la Paix"
            },
            buyer: {
                name: "Client",
                address: "20 avenue Foch"
            },
            lines: [{ description: "Service", quantity: 1, unitPrice: 100, vatRate: 20 }],
            amountHT: 100,
            amountTTC: 150 // Wrong TTC! Should be 120
        };

        const result = EInvoicingValidator.validate(invoice);
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.errors.some(e => e.field === "amountTTC"), true);
    });

    // 6. MULTIPLE VAT RATES (20%, 10%, 5.5%)
    test("Correctly calculates multi-rate VAT breakdown", () => {
        const multiRateInvoice = {
            number: "INV-2026-004",
            issueDate: "2026-08-15",
            currency: "EUR",
            seller: {
                name: "ClimPro SARL",
                siret: validSellerSiret,
                address: "10 rue de la Paix"
            },
            buyer: {
                name: "Client Pro",
                siret: validBuyerSiret,
                address: "20 avenue Foch"
            },
            lines: [
                { description: "Matériel PAC (5.5%)", quantity: 1, unitPrice: 2000, vatRate: 5.5 },
                { description: "Main d'oeuvre rénovation (10%)", quantity: 1, unitPrice: 500, vatRate: 10 },
                { description: "Fourniture diverse (20%)", quantity: 1, unitPrice: 300, vatRate: 20 }
            ],
            amountHT: 2800,
            // 2000*0.055 = 110 | 500*0.10 = 50 | 300*0.20 = 60 => Total VAT = 220
            amountTTC: 3020
        };

        const result = EInvoicingValidator.validate(multiRateInvoice);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.calculated.totalHT, 2800);
        assert.strictEqual(result.calculated.totalVAT, 220);
        assert.strictEqual(result.calculated.totalTTC, 3020);
        assert.strictEqual(result.calculated.vatBreakdown.length, 3);
    });

    // 7. ZERO VAT / AUTOLIQUIDATION BTP / EXEMPTION
    test("Validates reverse-charge and VAT exemption categories", () => {
        const autoLiqInvoice = {
            number: "INV-2026-005",
            issueDate: "2026-08-15",
            currency: "EUR",
            isAutoLiquidation: true,
            seller: {
                name: "Sous-traitant Climatisation",
                siret: validSellerSiret,
                address: "10 rue de la Paix"
            },
            buyer: {
                name: "Entreprise Principale BTP",
                siret: validBuyerSiret,
                address: "Chantier BTP Nice"
            },
            lines: [{ description: "Pose gaines de soufflage", quantity: 10, unitPrice: 80, vatRate: 0 }],
            amountHT: 800,
            amountTTC: 800
        };

        const result = EInvoicingValidator.validate(autoLiqInvoice);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.calculated.totalVAT, 0);
        assert.strictEqual(result.calculated.vatBreakdown[0].category, VAT_CATEGORY.REVERSE_CHARGE);
    });

    // 8. MAPPER TO B2BROUTER JSON
    test("B2brouterMapper transforms canonical invoice to compliant B2Brouter JSON", () => {
        const canonical = {
            number: "INV-2026-006",
            issueDate: "2026-08-15",
            dueDate: "2026-09-15",
            currency: "EUR",
            buyer: {
                name: "Client SAS",
                siret: validBuyerSiret,
                address: "15 rue Victor Hugo",
                city: "Lyon",
                postalCode: "69002",
                country: "FR"
            },
            lines: [
                {
                    position: 1,
                    description: "Entretien split climatisation",
                    quantity: 3,
                    unitPrice: 120,
                    discount: 5,
                    netAmount: 342,
                    vatRate: 20,
                    vatAmount: 68.4
                }
            ],
            amountHT: 342,
            amountTTC: 410.4
        };

        const b2bPayload = B2brouterMapper.toB2brouterInvoice(canonical);
        assert.strictEqual(b2bPayload.invoice.invoice_number, "INV-2026-006");
        assert.strictEqual(b2bPayload.invoice.issue_date, "2026-08-15");
        assert.strictEqual(b2bPayload.invoice.contact.name, "Client SAS");
        assert.strictEqual(b2bPayload.invoice.contact.taxcode, validBuyerSiret);
        assert.strictEqual(b2bPayload.invoice.invoice_lines_attributes.length, 1);
        assert.strictEqual(b2bPayload.invoice.invoice_lines_attributes[0].price, 120);
        assert.strictEqual(b2bPayload.invoice.invoice_lines_attributes[0].taxes_attributes[0].percent, 20);
    });

    // 9. ENCRYPTION SERVICE INTEGRITY
    test("EncryptionService correctly encrypts and decrypts sensitive credentials", () => {
        const apiKey = "b2b_secret_api_key_live_94829384729103847562";
        const encrypted = encryptCredential(apiKey);
        assert.notStrictEqual(encrypted, apiKey);
        assert.strictEqual(typeof encrypted, "string");

        const decrypted = decryptCredential(encrypted);
        assert.strictEqual(decrypted, apiKey);
    });

    console.log("--------------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed.`);
    console.log("==================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Test suite fatal error:", err);
    process.exit(1);
});
