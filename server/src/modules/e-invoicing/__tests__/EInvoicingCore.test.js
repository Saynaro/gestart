import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FrenchEInvoiceValidator } from "../core/FrenchEInvoiceValidator.js";
import { LifecycleNormalizer, NORMALIZED_STATUSES } from "../core/LifecycleNormalizer.js";
import { ProviderRegistry } from "../core/ProviderRegistry.js";
import { FacturXGenerator } from "../formats/facturx/FacturXGenerator.js";
import { UBLGenerator } from "../formats/ubl/UBLGenerator.js";
import { EReportingService } from "../core/EReportingService.js";
import "../providers/ProviderFactory.js"; // Loads and registers adapters

describe("E-Invoicing Core Module (DGFiP 2026/2027)", () => {
    const validCanonicalInvoice = {
        number: "INV-2026-001",
        issueDate: new Date("2026-09-01"),
        dueDate: new Date("2026-09-30"),
        currency: "EUR",
        seller: {
            name: "Dupont Clim SARL",
            siret: "12345678900012",
            siren: "123456789",
            vatNumber: "FR12123456789",
            address: "10 Avenue des Fleurs",
            postalCode: "06000",
            city: "Nice",
            country: "FR"
        },
        buyer: {
            name: "Boulangerie Martin SAS",
            companyName: "Boulangerie Martin SAS",
            siren: "987654321",
            siret: "98765432100018",
            vatNumber: "FR98987654321",
            address: "5 Rue Principale",
            postalCode: "06000",
            city: "Nice",
            country: "FR",
            isB2B: true
        },
        lines: [
            {
                position: 1,
                description: "Entretien climatisation annuelle",
                quantity: 1,
                unit: "C62",
                unitPrice: 150,
                tvaRate: 20,
                totalHT: 150,
                totalVAT: 30,
                totalTTC: 180
            }
        ],
        totals: {
            totalHT: 150,
            totalVAT: 30,
            totalTTC: 180
        }
    };

    describe("FrenchEInvoiceValidator", () => {
        it("should validate a compliant French B2B invoice", () => {
            const result = FrenchEInvoiceValidator.validate(validCanonicalInvoice);
            assert.equal(result.valid, true);
            assert.equal(result.errors.length, 0);
        });

        it("should reject an invoice missing seller SIRET/SIREN", () => {
            const invalidInvoice = {
                ...validCanonicalInvoice,
                seller: { ...validCanonicalInvoice.seller, siret: null, siren: null }
            };
            const result = FrenchEInvoiceValidator.validate(invalidInvoice);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === "MISSING_SELLER_IDENTIFIER"), true);
        });

        it("should reject a B2B invoice missing buyer SIREN", () => {
            const invalidInvoice = {
                ...validCanonicalInvoice,
                buyer: { ...validCanonicalInvoice.buyer, siren: null, siret: null }
            };
            const result = FrenchEInvoiceValidator.validate(invalidInvoice);
            assert.equal(result.valid, false);
            assert.equal(result.errors.some(e => e.code === "MISSING_BUYER_SIREN"), true);
        });
    });

    describe("LifecycleNormalizer", () => {
        it("should map B2Brouter and Qonto statuses accurately", () => {
            assert.equal(LifecycleNormalizer.normalizeStatus("B2BROUTER", "SENT"), NORMALIZED_STATUSES.DELIVERED);
            assert.equal(LifecycleNormalizer.normalizeStatus("B2BROUTER", "ACCEPTED"), NORMALIZED_STATUSES.ACCEPTED);
            assert.equal(LifecycleNormalizer.normalizeStatus("QONTO", "PAID"), NORMALIZED_STATUSES.PAID);
        });
    });

    describe("FacturXGenerator & UBLGenerator", () => {
        it("should generate well-formed Factur-X XML", () => {
            const xml = FacturXGenerator.generateXml(validCanonicalInvoice, "EN16931");
            assert.ok(xml.includes("CrossIndustryInvoice"));
            assert.ok(xml.includes("INV-2026-001"));
            assert.ok(xml.includes("12345678900012"));
        });

        it("should generate well-formed UBL 2.1 XML", () => {
            const xml = UBLGenerator.generateXml(validCanonicalInvoice);
            assert.ok(xml.includes("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"));
            assert.ok(xml.includes("INV-2026-001"));
            assert.ok(xml.includes("Dupont Clim SARL"));
        });
    });

    describe("ProviderRegistry", () => {
        it("should have registered providers with capabilities", () => {
            const catalog = ProviderRegistry.getProviderCatalog();
            assert.ok(catalog.length >= 4);

            const b2b = catalog.find(p => p.id === "B2BROUTER");
            assert.ok(b2b);
            assert.equal(b2b.capabilities.supportsFacturX, true);
            assert.equal(b2b.capabilities.supportsEmbeddedProvisioning, true);

            const qonto = catalog.find(p => p.id === "QONTO");
            assert.ok(qonto);
            assert.equal(qonto.capabilities.supportsApiKey, true);
        });
    });

    describe("EReportingService", () => {
        it("should classify B2B vs B2C vs International transactions", () => {
            assert.equal(EReportingService.classifyTransaction(validCanonicalInvoice), "E_INVOICING_B2B_FR");

            const b2cInvoice = {
                ...validCanonicalInvoice,
                buyer: { name: "Mme Durand", isB2B: false, country: "FR" }
            };
            assert.equal(EReportingService.classifyTransaction(b2cInvoice), "E_REPORTING_B2C_FR");
            assert.equal(EReportingService.requiresEReporting(b2cInvoice), true);
        });
    });
});
