/**
 * E-Reporting Service (Separate from E-Invoicing)
 * Handles transaction data and payment data transmission for B2C, cross-border,
 * and service payment flows according to French DGFiP 2026/2027 rules.
 */
export class EReportingService {
    /**
     * Determine transaction category for French tax reporting
     * @param {Object} invoice
     * @returns {'E_INVOICING_B2B_FR' | 'E_REPORTING_B2C_FR' | 'E_REPORTING_INTRA_EU' | 'E_REPORTING_EXPORT' | 'NON_TAXABLE'}
     */
    static classifyTransaction(invoice) {
        if (!invoice) return "NON_TAXABLE";

        const buyer = invoice.buyer || invoice.client || {};
        const isB2B = Boolean(buyer.isB2B || buyer.companyName || buyer.siren || buyer.siret);
        const country = (buyer.country || "FR").toUpperCase();

        if (country === "FR" || country === "FRA" || country === "FRANCE") {
            return isB2B ? "E_INVOICING_B2B_FR" : "E_REPORTING_B2C_FR";
        }

        const EU_COUNTRIES = [
            "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
            "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL",
            "PL", "PT", "RO", "SE", "SI", "SK"
        ];

        if (EU_COUNTRIES.includes(country)) {
            return "E_REPORTING_INTRA_EU";
        }

        return "E_REPORTING_EXPORT";
    }

    /**
     * Check whether transaction requires e-reporting flow
     * @param {Object} invoice
     * @returns {boolean}
     */
    static requiresEReporting(invoice) {
        const classification = this.classifyTransaction(invoice);
        return classification.startsWith("E_REPORTING_");
    }
}
