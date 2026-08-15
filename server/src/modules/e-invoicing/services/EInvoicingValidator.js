import { EN16931_BT, INVOICE_TYPE, VAT_CATEGORY } from "../interfaces/CanonicalTypes.js";

/**
 * Validates a 9-digit SIREN or 14-digit SIRET number using the official Luhn algorithm
 * @param {string} number 
 * @returns {boolean}
 */
export function isValidLuhn(number) {
    if (!number || typeof number !== "string") return false;
    const clean = number.replace(/\s+/g, "");
    if (!/^\d+$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < clean.length; i++) {
        let digit = parseInt(clean.charAt(clean.length - 1 - i), 10);
        if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    return sum % 10 === 0;
}

/**
 * Validates a French SIRET (14 digits with Luhn)
 * @param {string} siret 
 * @returns {boolean}
 */
export function isValidSiret(siret) {
    if (!siret || typeof siret !== "string") return false;
    const clean = siret.replace(/\s+/g, "");
    return clean.length === 14 && isValidLuhn(clean);
}

/**
 * Validates a French SIREN (9 digits with Luhn)
 * @param {string} siren 
 * @returns {boolean}
 */
export function isValidSiren(siren) {
    if (!siren || typeof siren !== "string") return false;
    const clean = siren.replace(/\s+/g, "");
    return clean.length === 9 && isValidLuhn(clean);
}

/**
 * Validates a French VAT Intracommunity number format (FR + 2 characters + 9 digits SIREN)
 * @param {string} vatNumber 
 * @returns {boolean}
 */
export function isValidFrenchVat(vatNumber) {
    if (!vatNumber || typeof vatNumber !== "string") return false;
    const clean = vatNumber.replace(/\s+/g, "").toUpperCase();
    return /^FR[0-9A-Z]{2}[0-9]{9}$/.test(clean);
}

/**
 * Complete Semantic and Syntactic Validator for Canonical Invoices (EN 16931 & DGFiP)
 */
export class EInvoicingValidator {
    /**
     * Validates a canonical invoice according to French e-invoicing and EN 16931 rules
     * @param {Object} invoice CanonicalInvoice
     * @returns {{ valid: boolean, errors: Array<{ field: string, bt?: string, message: string }>, warnings: Array<{ field: string, message: string }> }}
     */
    static validate(invoice) {
        const errors = [];
        const warnings = [];

        if (!invoice || typeof invoice !== "object") {
            return {
                valid: false,
                errors: [{ field: "invoice", message: "Invoice payload is missing or not an object" }],
                warnings: []
            };
        }

        // 1. INVOICE HEADER CHECKS
        if (!invoice.number || typeof invoice.number !== "string" || invoice.number.trim().length === 0) {
            errors.push({ field: "number", bt: EN16931_BT.INVOICE_NUMBER, message: "Invoice number (BT-1) is mandatory" });
        }

        if (!invoice.issueDate) {
            errors.push({ field: "issueDate", bt: EN16931_BT.ISSUE_DATE, message: "Invoice issue date (BT-2) is mandatory" });
        } else {
            const dateObj = new Date(invoice.issueDate);
            if (isNaN(dateObj.getTime())) {
                errors.push({ field: "issueDate", bt: EN16931_BT.ISSUE_DATE, message: "Invoice issue date (BT-2) must be a valid date" });
            }
        }

        const validTypes = Object.values(INVOICE_TYPE);
        if (invoice.typeCode && !validTypes.includes(String(invoice.typeCode))) {
            errors.push({ field: "typeCode", bt: EN16931_BT.INVOICE_TYPE_CODE, message: `Invalid invoice type code (BT-3). Expected one of: ${validTypes.join(", ")}` });
        }

        if (String(invoice.typeCode) === INVOICE_TYPE.CREDIT_NOTE && !invoice.previousInvoiceReference) {
            warnings.push({ field: "previousInvoiceReference", message: "Credit notes should reference the original invoice number (BT-25)" });
        }

        if (!invoice.currency || invoice.currency !== "EUR") {
            if (!invoice.currency) {
                errors.push({ field: "currency", bt: EN16931_BT.CURRENCY_CODE, message: "Invoice currency code (BT-5) is mandatory (expected EUR)" });
            }
        }

        // 2. SELLER (EMETTEUR / ARTISAN) CHECKS
        const seller = invoice.seller || {};
        if (!seller.name || seller.name.trim().length === 0) {
            errors.push({ field: "seller.name", bt: EN16931_BT.SELLER_NAME, message: "Seller legal name (BT-27) is mandatory" });
        }

        if (!seller.siret && !seller.siren) {
            errors.push({ field: "seller.siret", bt: EN16931_BT.SELLER_LEGAL_REGISTRATION_SIRET, message: "Seller SIRET (BT-30) or SIREN (BT-29) is mandatory for French companies" });
        } else {
            if (seller.siret && !isValidSiret(seller.siret)) {
                errors.push({ field: "seller.siret", bt: EN16931_BT.SELLER_LEGAL_REGISTRATION_SIRET, message: `Seller SIRET ${seller.siret} is invalid (fails Luhn check)` });
            }
            if (seller.siren && !isValidSiren(seller.siren)) {
                errors.push({ field: "seller.siren", bt: EN16931_BT.SELLER_IDENTIFIER_SIREN, message: `Seller SIREN ${seller.siren} is invalid (fails Luhn check)` });
            }
        }

        if (!seller.address || seller.address.trim().length === 0) {
            errors.push({ field: "seller.address", bt: EN16931_BT.SELLER_ADDRESS_LINE1, message: "Seller street address (BT-35) is mandatory" });
        }

        // 3. BUYER (ACHETEUR) CHECKS
        const buyer = invoice.buyer || {};
        const isB2B = buyer.isB2B !== false && (buyer.siret || buyer.siren || buyer.companyName);

        if (!buyer.name || buyer.name.trim().length === 0) {
            errors.push({ field: "buyer.name", bt: EN16931_BT.BUYER_NAME, message: "Buyer name (BT-44) is mandatory" });
        }

        if (isB2B) {
            if (!buyer.siret && !buyer.siren) {
                errors.push({ field: "buyer.siret", bt: EN16931_BT.BUYER_LEGAL_REGISTRATION_SIRET, message: "Buyer SIRET (BT-47) or SIREN (BT-46) is mandatory for French B2B electronic invoices" });
            } else {
                if (buyer.siret && !isValidSiret(buyer.siret)) {
                    errors.push({ field: "buyer.siret", bt: EN16931_BT.BUYER_LEGAL_REGISTRATION_SIRET, message: `Buyer SIRET ${buyer.siret} is invalid (fails Luhn check)` });
                }
                if (buyer.siren && !isValidSiren(buyer.siren)) {
                    errors.push({ field: "buyer.siren", bt: EN16931_BT.BUYER_IDENTIFIER_SIREN, message: `Buyer SIREN ${buyer.siren} is invalid (fails Luhn check)` });
                }
            }
        }

        if (!buyer.address || buyer.address.trim().length === 0) {
            errors.push({ field: "buyer.address", bt: EN16931_BT.BUYER_ADDRESS_LINE1, message: "Buyer address (BT-50) is mandatory" });
        }

        // 4. LINE ITEMS CHECKS
        const lines = Array.isArray(invoice.lines) ? invoice.lines : [];
        if (lines.length === 0) {
            errors.push({ field: "lines", message: "Invoice must contain at least one line item (BT-126)" });
        }

        let calculatedSumNet = 0;
        const vatSummaryMap = new Map(); // rate -> { taxable, vat }

        lines.forEach((line, index) => {
            const linePrefix = `lines[${index}]`;

            if (!line.description || line.description.trim().length === 0) {
                errors.push({ field: `${linePrefix}.description`, bt: EN16931_BT.LINE_ITEM_NAME, message: `Line #${index + 1} description (BT-153) is mandatory` });
            }

            const qty = Number(line.quantity);
            if (isNaN(qty) || qty <= 0) {
                errors.push({ field: `${linePrefix}.quantity`, bt: EN16931_BT.LINE_INVOICED_QUANTITY, message: `Line #${index + 1} quantity (BT-129) must be greater than 0` });
            }

            const price = Number(line.unitPrice);
            if (isNaN(price)) {
                errors.push({ field: `${linePrefix}.unitPrice`, bt: EN16931_BT.LINE_ITEM_PRICE, message: `Line #${index + 1} unit price (BT-146) must be a valid number` });
            }

            const discount = Number(line.discount || 0);
            const lineNet = qty * price * (1 - discount / 100);
            const lineNetRounded = Math.round(lineNet * 100) / 100;
            calculatedSumNet += lineNetRounded;

            const vatRate = Number(line.vatRate !== undefined ? line.vatRate : 20);
            if (isNaN(vatRate) || vatRate < 0) {
                errors.push({ field: `${linePrefix}.vatRate`, bt: EN16931_BT.LINE_VAT_RATE, message: `Line #${index + 1} VAT rate (BT-152) is invalid` });
            } else {
                const existing = vatSummaryMap.get(vatRate) || { taxable: 0, vat: 0 };
                existing.taxable += lineNetRounded;
                existing.vat += Math.round(lineNetRounded * (vatRate / 100) * 100) / 100;
                vatSummaryMap.set(vatRate, existing);
            }
        });

        // 5. TOTALS AND VAT CONSISTENCY CHECKS
        const expectedTotalHT = Math.round(calculatedSumNet * 100) / 100;
        let expectedTotalVAT = 0;
        for (const [rate, item] of vatSummaryMap.entries()) {
            expectedTotalVAT += Math.round(item.taxable * (rate / 100) * 100) / 100;
        }
        expectedTotalVAT = Math.round(expectedTotalVAT * 100) / 100;
        const expectedTotalTTC = Math.round((expectedTotalHT + expectedTotalVAT) * 100) / 100;

        const actualHT = Math.round(Number(invoice.amountHT || 0) * 100) / 100;
        const actualTTC = Math.round(Number(invoice.amountTTC || 0) * 100) / 100;
        const actualVAT = Math.round((actualTTC - actualHT) * 100) / 100;

        // Tolerance of 0.05 EUR for rounding differences
        if (Math.abs(actualHT - expectedTotalHT) > 0.05) {
            errors.push({
                field: "amountHT",
                bt: EN16931_BT.SUM_LINE_NET_AMOUNT,
                message: `Invoice total HT (${actualHT} €) does not match sum of line items (${expectedTotalHT} €)`
            });
        }

        if (Math.abs(actualTTC - expectedTotalTTC) > 0.05) {
            errors.push({
                field: "amountTTC",
                bt: EN16931_BT.TOTAL_TAX_INCLUSIVE_AMOUNT,
                message: `Invoice total TTC (${actualTTC} €) does not match calculated HT + VAT (${expectedTotalTTC} €)`
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            calculated: {
                totalHT: expectedTotalHT,
                totalVAT: expectedTotalVAT,
                totalTTC: expectedTotalTTC,
                vatBreakdown: Array.from(vatSummaryMap.entries()).map(([rate, val]) => ({
                    rate,
                    taxableAmount: Math.round(val.taxable * 100) / 100,
                    vatAmount: Math.round(val.taxable * (rate / 100) * 100) / 100,
                    category: rate === 0 ? (invoice.isAutoLiquidation ? VAT_CATEGORY.REVERSE_CHARGE : VAT_CATEGORY.EXEMPT) : VAT_CATEGORY.STANDARD
                }))
            }
        };
    }
}
