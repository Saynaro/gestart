/**
 * UBL 2.1 Invoice XML Generator (EN 16931 compliant)
 * Universal Business Language ISO/IEC 19845 format for DGFiP & PDP exchange.
 */
export class UBLGenerator {
    /**
     * Generate UBL 2.1 XML from canonical invoice
     * @param {Object} invoice
     * @returns {string}
     */
    static generateXml(invoice) {
        const issueDate = new Date(invoice.issueDate).toISOString().slice(0, 10);
        const seller = invoice.seller || {};
        const buyer = invoice.buyer || {};
        const totals = invoice.totals || {};
        const lines = invoice.lines || [];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
    <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
    <cbc:ID>${escapeXml(invoice.number)}</cbc:ID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
    
    <!-- Accounting Supplier (Seller) -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${escapeXml(seller.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(seller.address)}</cbc:StreetName>
                <cbc:CityName>${escapeXml(seller.city)}</cbc:CityName>
                <cbc:PostalZone>${escapeXml(seller.postalCode)}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>FR</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(seller.name)}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="0009">${escapeXml(seller.siret || seller.siren)}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Accounting Customer (Buyer) -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${escapeXml(buyer.companyName || buyer.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(buyer.address)}</cbc:StreetName>
                <cbc:CityName>${escapeXml(buyer.city)}</cbc:CityName>
                <cbc:PostalZone>${escapeXml(buyer.postalCode)}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>FR</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            ${buyer.siren ? `
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(buyer.companyName || buyer.name)}</cbc:RegistrationName>
                <cbc:CompanyID schemeID="0009">${escapeXml(buyer.siren)}</cbc:CompanyID>
            </cac:PartyLegalEntity>` : ""}
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Tax Totals -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="EUR">${Number(totals.totalVAT || 0).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="EUR">${Number(totals.totalHT || 0).toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="EUR">${Number(totals.totalVAT || 0).toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>20.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <!-- Monetary Totals -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="EUR">${Number(totals.totalHT || 0).toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="EUR">${Number(totals.totalHT || 0).toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="EUR">${Number(totals.totalTTC || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="EUR">${Number(totals.totalTTC || 0).toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    <!-- Lines -->
    ${lines.map((l, i) => `
    <cac:InvoiceLine>
        <cbc:ID>${i + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="C62">${Number(l.quantity || 1).toFixed(2)}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="EUR">${Number(l.totalHT || (l.quantity * l.unitPrice) || 0).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>${escapeXml(l.description)}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>${l.tvaRate === 0 ? 'E' : 'S'}</cbc:ID>
                <cbc:Percent>${Number(l.tvaRate || 20).toFixed(2)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="EUR">${Number(l.unitPrice || 0).toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join("")}
</Invoice>`;

        return xml.trim();
    }
}

function escapeXml(unsafe) {
    if (unsafe == null) return "";
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
