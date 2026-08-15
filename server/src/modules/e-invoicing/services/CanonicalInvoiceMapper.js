import { INVOICE_TYPE, OPERATION_NATURE, VAT_CATEGORY, PAYMENT_MEANS } from "../interfaces/CanonicalTypes.js";

/**
 * Maps internal CRM entities (Invoice, Company, Client, Lines) to the Canonical Invoice DTO
 */
export class CanonicalInvoiceMapper {
    /**
     * Map Prisma invoice + company + client to CanonicalInvoice
     * @param {Object} invoice Prisma invoice with relations (client, company, lines)
     * @returns {Object} CanonicalInvoice
     */
    static toCanonicalInvoice(invoice) {
        if (!invoice) return null;

        const company = invoice.company || {};
        const settings = company.settings || {};
        const client = invoice.client || {};
        const lines = invoice.lines || [];

        // Determine seller VAT number (compute if not explicitly provided)
        let sellerVat = company.tvaNumber;
        if (!sellerVat && company.siren && /^\d{9}$/.test(company.siren)) {
            const sirenNum = parseInt(company.siren, 10);
            const key = (12 + 3 * (sirenNum % 97)) % 97;
            sellerVat = `FR${String(key).padStart(2, "0")}${company.siren}`;
        }

        // Determine buyer identification (B2B vs B2C)
        const isB2B = Boolean(
            client.companyName || 
            client.sirenNumber || 
            client.clientTvaNumber || 
            client.clientLegalForm
        );

        // Map Payment Method
        let paymentMeansCode = PAYMENT_MEANS.BANK_TRANSFER;
        if (invoice.paymentMethod === "CARD") paymentMeansCode = PAYMENT_MEANS.CREDIT_CARD;
        else if (invoice.paymentMethod === "SEPA") paymentMeansCode = PAYMENT_MEANS.DIRECT_DEBIT;
        else if (invoice.paymentMethod === "CHEQUE") paymentMeansCode = PAYMENT_MEANS.CHEQUE;
        else if (invoice.paymentMethod === "CASH") paymentMeansCode = PAYMENT_MEANS.CASH;

        // Map lines
        const canonicalLines = lines.map((line, index) => {
            const qty = Number(line.quantity) || 1;
            const price = Number(line.unitPrice) || 0;
            const disc = Number(line.discount) || 0;
            const netAmount = Math.round(qty * price * (1 - disc / 100) * 100) / 100;
            const rate = Number(line.tvaRate !== undefined ? line.tvaRate : (invoice.tvaRate || 20));

            let categoryCode = VAT_CATEGORY.STANDARD;
            if (rate === 0) {
                if (invoice.isAutoLiquidation) categoryCode = VAT_CATEGORY.REVERSE_CHARGE;
                else if (invoice.isTvaFranchise || company.isTvaFranchise) categoryCode = VAT_CATEGORY.EXEMPT;
                else categoryCode = VAT_CATEGORY.ZERO_RATED;
            }

            return {
                id: line.id || String(index + 1),
                position: line.position !== undefined ? line.position : index + 1,
                description: line.description || "Prestation",
                reference: line.reference || null,
                quantity: qty,
                unit: line.unit || "UNITE",
                unitPrice: price,
                discount: disc,
                netAmount: netAmount,
                vatRate: rate,
                vatCategory: categoryCode,
                vatAmount: Math.round(netAmount * (rate / 100) * 100) / 100
            };
        });

        // Compute totals & VAT breakdown
        const totalHT = Math.round((Number(invoice.amountHT) || canonicalLines.reduce((sum, l) => sum + l.netAmount, 0)) * 100) / 100;
        const totalTTC = Math.round((Number(invoice.amountTTC) || (totalHT * (1 + (Number(invoice.tvaRate) || 20) / 100))) * 100) / 100;
        const totalVAT = Math.round((totalTTC - totalHT) * 100) / 100;

        return {
            id: invoice.id,
            number: invoice.number,
            issueDate: invoice.issuedAt ? new Date(invoice.issuedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            dueDate: invoice.dueAt ? new Date(invoice.dueAt).toISOString().split("T")[0] : null,
            serviceDate: invoice.serviceDate ? new Date(invoice.serviceDate).toISOString().split("T")[0] : null,
            typeCode: INVOICE_TYPE.COMMERCIAL_INVOICE,
            currency: "EUR",
            operationType: invoice.operationType || OPERATION_NATURE.SERVICES,
            orderNumber: invoice.orderNumber || null,
            previousInvoiceReference: null,
            notes: invoice.notes || null,
            conditions: invoice.conditions || settings.invoiceConditions || null,

            // Legal specifics
            penaltyRate: invoice.penaltyRate || 10,
            recoveryFee: invoice.recoveryFee || 40,
            discountTerms: invoice.discountTerms || "Aucun escompte pour paiement anticipé",
            tvaOnDebit: invoice.tvaOnDebit || false,
            isTvaFranchise: invoice.isTvaFranchise || company.isTvaFranchise || false,
            isAutoLiquidation: invoice.isAutoLiquidation || company.isSubcontractor || false,

            // Seller (Artisan / Company)
            seller: {
                id: company.id,
                name: company.name,
                siren: company.siren || (company.siret ? company.siret.substring(0, 9) : null),
                siret: company.siret || null,
                vatNumber: sellerVat || null,
                legalForm: company.legalForm || null,
                rcsNumber: company.rcsNumber || null,
                nafCode: company.nafCode || null,
                address: company.address || "Adresse non renseignée",
                city: company.city || "Paris",
                postalCode: company.postalCode || "75000",
                country: "FR",
                email: company.email || null,
                phone: company.phone || null,
                bankIban: settings.bankIban || null,
                bankBic: settings.bankBic || null,
                bankName: settings.bankName || null,
            },

            // Buyer (Client)
            buyer: {
                id: client.id,
                name: client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client",
                isB2B,
                companyName: client.companyName || null,
                siren: client.sirenNumber ? client.sirenNumber.substring(0, 9) : null,
                siret: client.sirenNumber && client.sirenNumber.length === 14 ? client.sirenNumber : null,
                vatNumber: client.clientTvaNumber || null,
                legalForm: client.clientLegalForm || null,
                address: client.address || "Adresse client",
                city: client.city || "Paris",
                postalCode: client.postalCode || "75000",
                country: "FR",
                email: client.email || null,
                phone: client.phone || null,
                deliveryAddress: client.hasDeliveryAddress && client.deliveryAddress ? {
                    address: client.deliveryAddress,
                    city: client.deliveryCity || client.city,
                    postalCode: client.deliveryPostalCode || client.postalCode,
                    country: "FR"
                } : null
            },

            // Payment
            payment: {
                meansCode: paymentMeansCode,
                terms: invoice.conditions || settings.invoiceConditions || `Paiement sous ${settings.defaultPaymentDays || 30} jours`,
                paidAmount: Number(invoice.amountPaid) || 0,
                paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString() : null
            },

            // Lines & Amounts
            lines: canonicalLines,
            amountHT: totalHT,
            amountVAT: totalVAT,
            amountTTC: totalTTC
        };
    }

    /**
     * Map a received invoice payload from provider to CanonicalReceivedInvoice
     * @param {Object} rawProviderInvoice 
     * @param {string} providerName 
     * @returns {Object} CanonicalReceivedInvoice
     */
    static toCanonicalReceivedInvoice(rawProviderInvoice, providerName = "B2BROUTER") {
        if (!rawProviderInvoice) return null;

        const inv = rawProviderInvoice.invoice || rawProviderInvoice;
        const supplier = inv.supplier || inv.emitter || inv.contact || {};

        return {
            providerInvoiceId: String(inv.id || inv.provider_invoice_id || inv.invoice_number),
            provider: providerName,
            supplierName: supplier.name || supplier.legal_name || "Fournisseur",
            supplierSiren: supplier.siren || (supplier.taxcode && supplier.taxcode.length === 9 ? supplier.taxcode : null),
            supplierSiret: supplier.siret || (supplier.taxcode && supplier.taxcode.length === 14 ? supplier.taxcode : null),
            supplierVatNumber: supplier.vat_number || supplier.taxcode || null,
            supplierAddress: supplier.address || supplier.address_line1 || null,
            supplierCity: supplier.city || null,
            supplierPostalCode: supplier.postal_code || null,
            supplierCountry: supplier.country || "FR",
            supplierEmail: supplier.email || null,

            invoiceNumber: inv.invoice_number || inv.number || "INV-UNKNOWN",
            issueDate: inv.issue_date ? new Date(inv.issue_date) : new Date(),
            dueDate: inv.due_date ? new Date(inv.due_date) : null,
            currency: inv.currency || "EUR",

            totalHT: Number(inv.total_amount_without_tax || inv.total_ht || inv.amount_ht || 0),
            totalVAT: Number(inv.total_tax_amount || inv.total_tva || inv.tax_amount || 0),
            totalTTC: Number(inv.total_amount_with_tax || inv.total_ttc || inv.amount_ttc || 0),

            status: inv.status ? String(inv.status).toUpperCase() : "RECEIVED",
            structuredData: rawProviderInvoice,
            rawFormat: inv.format || "Factur-X",
            documentUrl: inv.pdf_url || inv.document_url || null
        };
    }
}
