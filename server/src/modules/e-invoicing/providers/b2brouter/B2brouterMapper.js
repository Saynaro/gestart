import { INVOICE_TYPE, VAT_CATEGORY, INTERNAL_EINVOICING_STATUS } from "../../interfaces/CanonicalTypes.js";

/**
 * B2Brouter Payload Mapper
 * Handles precise transformation between Canonical DTOs and B2Brouter REST API structures
 */
export class B2brouterMapper {
    /**
     * Map CanonicalInvoice to B2Brouter JSON Invoice creation payload
     * @param {Object} canonical 
     * @param {Object} [options={}]
     * @returns {Object} B2Brouter JSON payload
     */
    static toB2brouterInvoice(canonical, options = {}) {
        if (!canonical) throw new Error("Canonical invoice is required for B2Brouter mapping");

        const buyer = canonical.buyer || {};
        const lines = Array.isArray(canonical.lines) ? canonical.lines : [];

        // Build invoice_lines_attributes
        const invoiceLinesAttributes = lines.map((line, idx) => {
            const taxPercent = Number(line.vatRate !== undefined ? line.vatRate : 20);
            const lineNetAmount = Number(line.netAmount || (line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100)));

            // B2Brouter taxes_attributes
            const taxesAttributes = [{
                name: "TVA",
                category: line.vatCategory || (taxPercent === 0 ? VAT_CATEGORY.EXEMPT : VAT_CATEGORY.STANDARD),
                percent: taxPercent,
                amount: Number(line.vatAmount || Math.round(lineNetAmount * (taxPercent / 100) * 100) / 100)
            }];

            return {
                position: line.position || (idx + 1),
                quantity: Number(line.quantity) || 1,
                unit: line.unit || "C62", // UN/ECE Rec 20 standard unit code
                price: Number(line.unitPrice) || 0,
                description: line.description || "Prestation",
                discount_amount: line.discount ? Number((line.quantity * line.unitPrice * (line.discount / 100)).toFixed(2)) : undefined,
                extension_amount: Number(lineNetAmount.toFixed(2)),
                taxes_attributes: taxesAttributes
            };
        });

        // Format Contact (Buyer)
        const contact = {
            name: buyer.name || "Client",
            taxcode: buyer.siret || buyer.siren || buyer.vatNumber || undefined,
            vat_number: buyer.vatNumber || undefined,
            address: buyer.address || undefined,
            city: buyer.city || undefined,
            postal_code: buyer.postalCode || undefined,
            country: buyer.country || "FR",
            email: buyer.email || undefined,
            phone: buyer.phone || undefined
        };

        const isCreditNote = String(canonical.typeCode) === INVOICE_TYPE.CREDIT_NOTE;

        const b2bPayload = {
            send_after_import: options.sendImmediately === true,
            invoice: {
                type: isCreditNote ? "CreditNote" : "IssuedInvoice",
                invoice_number: canonical.number,
                issue_date: canonical.issueDate,
                due_date: canonical.dueDate || undefined,
                tax_point_date: canonical.serviceDate || canonical.issueDate,
                currency: canonical.currency || "EUR",
                terms_description: canonical.conditions || undefined,
                contact: contact,
                invoice_lines_attributes: invoiceLinesAttributes
            }
        };

        // If delivery address is present and different
        if (buyer.deliveryAddress && buyer.deliveryAddress.address) {
            b2bPayload.invoice.delivery_address = {
                address: buyer.deliveryAddress.address,
                city: buyer.deliveryAddress.city || buyer.city,
                postal_code: buyer.deliveryAddress.postalCode || buyer.postalCode,
                country: buyer.deliveryAddress.country || "FR"
            };
        }

        return b2bPayload;
    }

    /**
     * Map B2Brouter status string to Canonical EInvoicingStatus
     * @param {string} b2bStatus 
     * @returns {string} Canonical status
     */
    static mapStatus(b2bStatus) {
        if (!b2bStatus) return INTERNAL_EINVOICING_STATUS.DRAFT;
        const s = String(b2bStatus).toLowerCase().trim();

        switch (s) {
            case "draft":
            case "imported":
                return INTERNAL_EINVOICING_STATUS.DRAFT;
            case "processing":
            case "sending":
            case "queued":
                return INTERNAL_EINVOICING_STATUS.PROCESSING;
            case "sent":
            case "issued":
            case "delivered":
            case "routing":
                return INTERNAL_EINVOICING_STATUS.SENT;
            case "received":
                return INTERNAL_EINVOICING_STATUS.RECEIVED;
            case "accepted":
            case "approved":
            case "acknowledged":
                return INTERNAL_EINVOICING_STATUS.ACCEPTED;
            case "rejected":
            case "refused":
            case "error":
            case "failed":
                return INTERNAL_EINVOICING_STATUS.REJECTED;
            case "cancelled":
            case "voided":
                return INTERNAL_EINVOICING_STATUS.CANCELLED;
            case "paid":
            case "settled":
                return INTERNAL_EINVOICING_STATUS.PAID;
            default:
                return INTERNAL_EINVOICING_STATUS.SENT;
        }
    }

    /**
     * Convert incoming raw B2Brouter invoice payload to CanonicalReceivedInvoice
     * @param {Object} rawInvoice 
     * @returns {Object}
     */
    static toCanonicalReceivedInvoice(rawInvoice) {
        const inv = rawInvoice.invoice || rawInvoice;
        const contact = inv.contact || inv.emitter || inv.supplier || {};

        return {
            providerInvoiceId: String(inv.id || inv.invoice_number),
            provider: "B2BROUTER",
            supplierName: contact.name || "Fournisseur B2B",
            supplierSiren: contact.taxcode && contact.taxcode.length === 9 ? contact.taxcode : null,
            supplierSiret: contact.taxcode && contact.taxcode.length === 14 ? contact.taxcode : null,
            supplierVatNumber: contact.vat_number || contact.taxcode || null,
            supplierAddress: contact.address || null,
            supplierCity: contact.city || null,
            supplierPostalCode: contact.postal_code || null,
            supplierCountry: contact.country || "FR",
            supplierEmail: contact.email || null,

            invoiceNumber: inv.invoice_number || inv.number || `FAC-${inv.id}`,
            issueDate: inv.issue_date ? new Date(inv.issue_date) : new Date(),
            dueDate: inv.due_date ? new Date(inv.due_date) : null,
            currency: inv.currency || "EUR",

            totalHT: Number(inv.total_amount_without_tax || inv.total_ht || inv.amount_ht || 0),
            totalVAT: Number(inv.total_tax_amount || inv.total_tva || 0),
            totalTTC: Number(inv.total_amount_with_tax || inv.total_ttc || 0),

            status: B2brouterMapper.mapStatus(inv.status),
            structuredData: rawInvoice,
            rawFormat: inv.format || "Factur-X",
            documentUrl: inv.pdf_url || null
        };
    }
}
