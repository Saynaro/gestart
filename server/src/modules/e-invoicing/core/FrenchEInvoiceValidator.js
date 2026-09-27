/**
 * French E-Invoicing Validator
 * Implements European EN 16931 semantic model + French CIUS / DGFiP 3.2 rules.
 */
export class FrenchEInvoiceValidator {
    static SPEC_VERSION = "DGFiP_3.2_2026";

    /**
     * Validate canonical invoice against French e-invoicing standards
     * @param {Object} invoice Canonical invoice model
     * @returns {{ valid: boolean, errors: Array<{ field: string, message: string, code: string }>, warnings: Array<{ field: string, message: string }> }}
     */
    static validate(invoice) {
        const errors = [];
        const warnings = [];

        if (!invoice) {
            return {
                valid: false,
                errors: [{ field: "invoice", message: "Données de facture manquantes", code: "EMPTY_INVOICE" }],
                warnings
            };
        }

        // 1. HEADER VALIDATION
        if (!invoice.number || typeof invoice.number !== "string" || invoice.number.trim().length === 0) {
            errors.push({ field: "number", message: "Le numéro de facture est obligatoire", code: "MISSING_INVOICE_NUMBER" });
        }

        if (!invoice.issueDate || isNaN(new Date(invoice.issueDate).getTime())) {
            errors.push({ field: "issueDate", message: "La date d'émission est obligatoire et doit être valide", code: "INVALID_ISSUE_DATE" });
        }

        if (!invoice.currency || invoice.currency !== "EUR") {
            warnings.push({ field: "currency", message: "La devise standard recommandée pour la France est l'EUR" });
        }

        // 2. SELLER (ÉMETTEUR) VALIDATION
        const seller = invoice.seller || {};
        if (!seller.name || seller.name.trim().length === 0) {
            errors.push({ field: "seller.name", message: "Le nom ou raison sociale de l'émetteur est obligatoire", code: "MISSING_SELLER_NAME" });
        }

        const cleanSiret = (seller.siret || "").replace(/\s+/g, "");
        const cleanSiren = (seller.siren || (cleanSiret.length === 9 ? cleanSiret : "")).replace(/\s+/g, "");

        if (!cleanSiret && !cleanSiren) {
            errors.push({ field: "seller.siret", message: "Le SIRET (14 chiffres) ou SIREN (9 chiffres) de l'émetteur est obligatoire", code: "MISSING_SELLER_IDENTIFIER" });
        } else if (cleanSiret && cleanSiret.length !== 14 && cleanSiret.length !== 9 && cleanSiren.length !== 9) {
            errors.push({ field: "seller.siret", message: "Le SIRET (14 chiffres) ou SIREN (9 chiffres) de l'émetteur est invalide", code: "INVALID_SELLER_SIRET" });
        }

        if (!seller.address || seller.address.trim().length === 0) {
            errors.push({ field: "seller.address", message: "L'adresse de l'émetteur est obligatoire", code: "MISSING_SELLER_ADDRESS" });
        }
        if (!seller.postalCode || !seller.city) {
            warnings.push({ field: "seller.city", message: "Le code postal et la ville de l'émetteur sont fortement recommandés" });
        }

        // 3. BUYER (DESTINATAIRE) VALIDATION
        const buyer = invoice.buyer || {};
        const isB2B = buyer.isB2B !== false && (buyer.isB2B === true || buyer.companyName || buyer.siren || buyer.siret);

        if (isB2B) {
            const buyerName = buyer.companyName || buyer.name || "";
            if (!buyerName || buyerName.trim().length === 0) {
                errors.push({ field: "buyer.companyName", message: "La raison sociale du client professionnel est obligatoire (B2B)", code: "MISSING_BUYER_NAME" });
            }

            const cleanBuyerSiren = (buyer.siren || "").replace(/\s+/g, "");
            const cleanBuyerSiret = (buyer.siret || "").replace(/\s+/g, "");

            if (!cleanBuyerSiren && !cleanBuyerSiret) {
                errors.push({ field: "buyer.siren", message: "Le SIREN ou SIRET du client est obligatoire pour une facture B2B en France (Réforme 2026)", code: "MISSING_BUYER_SIREN" });
            } else if (cleanBuyerSiren && cleanBuyerSiren.length !== 9 && cleanBuyerSiren.length !== 14) {
                errors.push({ field: "buyer.siren", message: "Le SIREN du client B2B doit comporter 9 chiffres", code: "INVALID_BUYER_SIREN" });
            }
        } else {
            // B2C Customer
            if (!buyer.name || buyer.name.trim().length === 0) {
                errors.push({ field: "buyer.name", message: "Le nom du client est obligatoire", code: "MISSING_BUYER_NAME" });
            }
        }

        // 4. LINES VALIDATION
        const lines = invoice.lines || [];
        if (!Array.isArray(lines) || lines.length === 0) {
            errors.push({ field: "lines", message: "La facture doit comporter au moins une ligne d'article ou prestation", code: "EMPTY_LINES" });
        } else {
            lines.forEach((line, idx) => {
                if (!line.description || line.description.trim().length === 0) {
                    errors.push({ field: `lines[${idx}].description`, message: `La ligne #${idx + 1} doit avoir une désignation`, code: "MISSING_LINE_DESCRIPTION" });
                }
                if (typeof line.quantity !== "number" || isNaN(line.quantity)) {
                    errors.push({ field: `lines[${idx}].quantity`, message: `La ligne #${idx + 1} a une quantité invalide`, code: "INVALID_LINE_QUANTITY" });
                }
                if (typeof line.unitPrice !== "number" || isNaN(line.unitPrice)) {
                    errors.push({ field: `lines[${idx}].unitPrice`, message: `La ligne #${idx + 1} a un prix unitaire invalide`, code: "INVALID_LINE_UNIT_PRICE" });
                }
            });
        }

        // 5. TOTALS & VAT BREAKDOWN
        const totals = invoice.totals || {};
        if (typeof totals.totalHT !== "number" || isNaN(totals.totalHT)) {
            errors.push({ field: "totals.totalHT", message: "Le total HT est obligatoire et doit être numérique", code: "INVALID_TOTAL_HT" });
        }
        if (typeof totals.totalTTC !== "number" || isNaN(totals.totalTTC)) {
            errors.push({ field: "totals.totalTTC", message: "Le total TTC est obligatoire et doit être numérique", code: "INVALID_TOTAL_TTC" });
        }

        // 6. FRENCH LEGAL MENTIONS
        if (isB2B) {
            if (!invoice.paymentTerms && !invoice.dueDate) {
                warnings.push({ field: "dueDate", message: "La date d'échéance ou les conditions de règlement sont obligatoires en B2B" });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            specVersion: FrenchEInvoiceValidator.SPEC_VERSION
        };
    }
}
