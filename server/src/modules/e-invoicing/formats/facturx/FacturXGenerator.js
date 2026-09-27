/**
 * Factur-X XML Generator (French Profile EN 16931 / BASIC / MINIMUM)
 * Generates valid UN/CEFACT CII CrossIndustryInvoice XML compliant with DGFiP e-invoicing.
 */
export class FacturXGenerator {
    /**
     * Generate Factur-X XML from canonical invoice
     * @param {Object} invoice Canonical invoice model
     * @param {'MINIMUM' | 'BASIC' | 'EN16931'} profile
     * @returns {string} XML string
     */
    static generateXml(invoice, profile = "EN16931") {
        const issueDateFormatted = new Date(invoice.issueDate).toISOString().slice(0, 10).replace(/-/g, "");
        const seller = invoice.seller || {};
        const buyer = invoice.buyer || {};
        const totals = invoice.totals || {};
        const lines = invoice.lines || [];

        const sellerSiret = (seller.siret || "").replace(/\s+/g, "");
        const buyerSiren = (buyer.siren || "").replace(/\s+/g, "");

        const profileUrn = profile === "MINIMUM"
            ? "urn:factur-x.eu:1p0:minimum"
            : profile === "BASIC"
            ? "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic"
            : "urn:cen.eu:en16931:2017";

        // Build structured XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice 
    xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>${profileUrn}</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    <rsm:ExchangedDocument>
        <ram:ID>${escapeXml(invoice.number)}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">${issueDateFormatted}</udt:DateTimeString>
        </ram:IssueDateTime>
    </rsm:ExchangedDocument>
    <rsm:SupplyChainTradeTransaction>
        ${lines.map((line, idx) => `
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>${idx + 1}</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>${escapeXml(line.description || "Article")}</ram:Name>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>${Number(line.unitPrice || 0).toFixed(2)}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="${escapeXml(line.unit || 'C62')}">${Number(line.quantity || 1).toFixed(2)}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>${line.tvaRate === 0 ? 'E' : 'S'}</ram:CategoryCode>
                    <ram:RateApplicablePercent>${Number(line.tvaRate || 20).toFixed(2)}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>${Number(line.totalHT || (line.quantity * line.unitPrice) || 0).toFixed(2)}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>`).join("")}
        <ram:ApplicableHeaderTradeAgreement>
            <ram:SellerTradeParty>
                <ram:Name>${escapeXml(seller.name || "")}</ram:Name>
                <ram:SpecifiedLegalOrganization>
                    <ram:ID schemeID="0009">${escapeXml(sellerSiret)}</ram:ID>
                </ram:SpecifiedLegalOrganization>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${escapeXml(seller.postalCode || "")}</ram:PostcodeCode>
                    <ram:LineOne>${escapeXml(seller.address || "")}</ram:LineOne>
                    <ram:CityName>${escapeXml(seller.city || "")}</ram:CityName>
                    <ram:CountryID>FR</ram:CountryID>
                </ram:PostalTradeAddress>
                ${seller.vatNumber ? `
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">${escapeXml(seller.vatNumber)}</ram:ID>
                </ram:SpecifiedTaxRegistration>` : ""}
            </ram:SellerTradeParty>
            <ram:BuyerTradeParty>
                <ram:Name>${escapeXml(buyer.companyName || buyer.name || "")}</ram:Name>
                ${buyerSiren ? `
                <ram:SpecifiedLegalOrganization>
                    <ram:ID schemeID="0009">${escapeXml(buyerSiren)}</ram:ID>
                </ram:SpecifiedLegalOrganization>` : ""}
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${escapeXml(buyer.postalCode || "")}</ram:PostcodeCode>
                    <ram:LineOne>${escapeXml(buyer.address || "")}</ram:LineOne>
                    <ram:CityName>${escapeXml(buyer.city || "")}</ram:CityName>
                    <ram:CountryID>FR</ram:CountryID>
                </ram:PostalTradeAddress>
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        <ram:ApplicableHeaderTradeDelivery />
        <ram:ApplicableHeaderTradeSettlement>
            <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>${Number(totals.totalHT || 0).toFixed(2)}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>${Number(totals.totalHT || 0).toFixed(2)}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount currencyID="EUR">${Number(totals.totalVAT || 0).toFixed(2)}</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>${Number(totals.totalTTC || 0).toFixed(2)}</ram:GrandTotalAmount>
                <ram:DuePayableAmount>${Number(totals.totalTTC || 0).toFixed(2)}</ram:DuePayableAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

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
