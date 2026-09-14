/**
 * documentHtmlRenderer.js
 * Source of truth HTML/CSS renderer for Quotes & Invoices.
 * Produces exact DOM and CSS matching Previsualiser (InvoicePdfView / QuotePdfView).
 */

function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function wrapInFullHtmlDocument(innerHtml, customization = {}) {
    const fontFamily = customization.fontFamily || "Inter, sans-serif";
    const fontSize = customization.fontSize || "9.5pt";
    const bgColor = customization.bgColor || "#FFFFFF";
    const textColor = customization.textColor || "#1A1A1A";

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Document</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Roboto:wght@300;400;500;700;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }

        *, *:before, *:after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        html, body {
            margin: 0;
            padding: 0;
            width: 210mm;
            min-height: 297mm;
            background-color: ${bgColor};
            color: ${textColor};
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: 1.4;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .invoice-pdf-a4-sheet {
            width: 210mm;
            min-height: 297mm;
            padding: 0 14mm 10mm 14mm;
            box-sizing: border-box;
            background-color: ${bgColor};
            color: ${textColor};
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: 1.4;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .invoice-pdf-a4-sheet,
        .invoice-pdf-a4-sheet * {
            font-family: ${fontFamily};
        }

        .pdf-header-row,
        .pdf-billing-section,
        .pdf-summary-block,
        .pdf-signature-block-container,
        .pdf-footer-section {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .pdf-items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 0.95em;
        }

        .pdf-items-table th, 
        .pdf-items-table td {
            padding: 6px 8px;
        }

        .pdf-items-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .pdf-header-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .pdf-logo-stub {
            display: flex; align-items: center; justify-content: center;
            background-color: #556B2F; color: white; font-weight: 900; font-size: 14pt;
            letter-spacing: 0.5px; width: 110pt; padding: 6pt; margin-bottom: 6pt; border-radius: 3px;
        }
        .pdf-header-left .company-name { font-size: 12pt; font-weight: 800; margin-bottom: 4pt; }
        .pdf-header-left .company-details { font-size: 9pt; color: #4A4A4A; }
        .pdf-header-right { text-align: right; }
        .doc-type-label { font-size: 22pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 4pt; }
        .doc-meta-table { display: inline-block; font-size: 0.95em; }
        .doc-meta-table td { padding: 2pt 4pt; }
        .pdf-billing-section { display: flex; flex-direction: column; align-items: flex-start; width: 100%; }
        .pdf-summary-block { display: flex; justify-content: flex-end; margin: 10px 0; }
        .pdf-summary-table { width: auto; min-width: 210px; font-size: 0.95em; border-collapse: collapse; }
        .pdf-summary-table td { padding: 4px 8px; }
        .pdf-summary-table tr.grand-total-row td { padding: 6px 8px; }
        .pdf-signature-block-container {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            margin: 12px 0 8px 0;
            font-size: 0.85em;
            border-top: 1px dashed #E0E0E0;
            padding-top: 8px;
        }
        .pdf-footer-section {
            font-size: 0.8em;
            border-top: 1px solid #E5E5E5;
            padding-top: 6px;
            margin-top: auto;
            opacity: 0.85;
            line-height: 1.35;
        }
    </style>
</head>
<body>
    ${innerHtml}
</body>
</html>`;
}

export function renderInvoiceHtml({ invoice = {}, company = {}, customization = {} }) {
    const docCustomization = {
        primaryColor: customization.primaryColor || company?.settings?.primaryColor || "#556B2F",
        structure: customization.structure || "classic",
        fontFamily: customization.fontFamily || "Inter, sans-serif",
        fontSize: customization.fontSize || "9.5pt",
        bgColor: customization.bgColor || "#FFFFFF",
        textColor: customization.textColor || "#1A1A1A",
        showLogo: customization.showLogo !== false,
        logoPosition: customization.logoPosition || "left",
        logoSize: customization.logoSize || 45,
        clientBoxPosition: customization.clientBoxPosition || "bottom",
        showAddress: customization.showAddress !== false,
        showSiret: customization.showSiret !== false,
        showPhone: customization.showPhone !== false,
        showEmail: customization.showEmail !== false,
        showDeliveryDate: customization.showDeliveryDate !== false,
        showPaymentConditions: customization.showPaymentConditions !== false,
        showIban: customization.showIban !== false,
        showAgaMention: customization.showAgaMention === true,
        showCompanySignature: customization.showCompanySignature !== false,
        showClientSignature: customization.showClientSignature === true,
        signaturePosition: customization.signaturePosition || "left",
        clientSignaturePosition: customization.clientSignaturePosition || "right"
    };

    const companyDisplayName = company?.name || invoice.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayTva = company?.tvaNumber || company?.vatNumber || (company?.siren ? `FR ${company.siren}` : (company?.siret ? `FR${(12 + 3 * (parseInt(company.siret.substring(0, 9), 10) % 97)) % 97}${company.siret.substring(0, 9)}` : "Non renseigné"));
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = customization.logoUrl || company?.logoUrl || company?.settings?.logoUrl;
    const companyIban = company?.settings?.bankIban || company?.bankIban || company?.iban || invoice.company?.settings?.bankIban || invoice.company?.bankIban || "";
    const companySignature = customization.signatureUrl || company?.signatureUrl || company?.signature || company?.settings?.signatureUrl || company?.settings?.signature;

    const invoiceLines = (invoice.lines || []).map(l => ({
        ...l,
        qty: Number(l.quantity || l.qty || 1),
        unitPrice: Number(l.unitPrice || 0),
        tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (invoice.tvaRate !== undefined && invoice.tvaRate !== null ? Number(invoice.tvaRate) : 20),
        total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
    }));
    const computedHt = invoiceLines.reduce((acc, l) => acc + (l.unitPrice * l.qty), 0);
    const subtotalHt = Number(invoice.subtotalHt || invoice.amountHT || invoice.totalHt || computedHt || 0);
    const tvaRate = Number(invoice.tvaRate !== undefined && invoice.tvaRate !== null ? invoice.tvaRate : (invoiceLines[0]?.tvaRate !== undefined ? invoiceLines[0].tvaRate : 20));
    const computedTva = invoiceLines.reduce((acc, l) => acc + (l.unitPrice * l.qty * ((l.tvaRate !== undefined ? l.tvaRate : tvaRate) / 100)), 0);
    const totalTtc = Number(invoice.totalTtc || invoice.amountTTC || (subtotalHt + computedTva) || 0);
    const tvaAmount = Number(invoice.tvaAmount !== undefined && invoice.tvaAmount !== null ? invoice.tvaAmount : (totalTtc - subtotalHt));

    const invoiceDateStr = new Date(invoice.issuedAt || invoice.date || invoice.createdAt || Date.now()).toLocaleDateString("fr-FR");
    const invoiceDueDateStr = new Date(invoice.dueAt || invoice.dueDate || invoice.date || Date.now()).toLocaleDateString("fr-FR");
    const invoiceNumberStr = invoice.number || `INV-${invoice.id}`;

    const clientDisplayName = invoice.client 
        ? (invoice.client.companyName || `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim() || invoice.clientName || "Client")
        : (invoice.clientName || "Client");
    const clientDisplayAddress = invoice.client?.address || invoice.clientAddress || (invoice.client?.city ? `${invoice.client.postalCode || ''} ${invoice.client.city}`.trim() : "");
    const clientDisplayEmail = invoice.client?.email || invoice.clientEmail || "";
    const clientDisplayPhone = invoice.client?.phone || invoice.clientPhone || "";

    // Signatures
    const compPos = docCustomization.signaturePosition || "left";
    const clPos = docCustomization.clientSignaturePosition || "right";

    const renderCompanySigHtml = () => `
        <div style="width: 100%; max-width: 220px; min-width: 0; word-break: break-word;">
            <div style="font-weight: 700; margin-bottom: 4px; font-size: 0.9em;">Pour l'entreprise :</div>
            <div style="height: 48px; border: 1px dashed #DDD; display: flex; align-items: center; justify-content: center; border-radius: 6px; background-color: #FAFAF8; padding: 4px;">
                ${companySignature 
                    ? `<img src="${escapeHtml(companySignature)}" alt="Signature Entreprise" style="max-height: 40px; max-width: 90%; object-fit: contain;" />`
                    : `<span style="color: #888; font-size: 0.85em; font-style: italic;">${escapeHtml(companyDisplayName)}</span>`
                }
            </div>
        </div>
    `;

    const clientSigUrl = invoice.signatureUrl || invoice.clientSignatureUrl;
    const renderClientSigHtml = () => `
        <div style="width: 100%; max-width: 220px; min-width: 0; word-break: break-word;">
            <div style="font-weight: 700; margin-bottom: 4px; font-size: 0.9em;">Signature de l'acheteur :</div>
            <div style="height: 48px; border: 1px dashed #DDD; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; background-color: #FAFAF8; padding: 4px; color: #888; font-size: 0.82em;">
                ${clientSigUrl
                    ? `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                         <img src="${escapeHtml(clientSigUrl)}" alt="Signature Client" style="max-height: 32px; max-width: 90%; object-fit: contain;" />
                         <span style="font-size: 7pt; color: #16a34a; font-weight: 600; margin-top: 2px;">
                             ✓ Signé le ${escapeHtml(new Date(invoice.paidAt || invoice.date || invoice.createdAt || Date.now()).toLocaleDateString("fr-FR"))}
                         </span>
                       </div>`
                    : `<span style="font-style: italic; font-size: 0.78em;">Mention "Bon pour accord"</span>
                       <span style="font-size: 0.72em; margin-top: 2px; opacity: 0.8;">Date et signature</span>`
                }
            </div>
        </div>
    `;

    const leftSigItems = [];
    const rightSigItems = [];

    if (docCustomization.showCompanySignature !== false) {
        if (compPos === "left") leftSigItems.push(renderCompanySigHtml());
        else rightSigItems.push(renderCompanySigHtml());
    }

    if (docCustomization.showClientSignature === true) {
        if (clPos === "left") leftSigItems.push(renderClientSigHtml());
        else rightSigItems.push(renderClientSigHtml());
    }

    const signaturesHtml = (docCustomization.showCompanySignature !== false || docCustomization.showClientSignature === true) ? `
        <div class="pdf-signature-block-container" style="display: flex; justify-content: space-between; gap: 24px; margin: 12px 0; font-size: 0.85em; border-top: 1px dashed #E0E0E0; padding-top: 10px;">
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; text-align: left;">
                ${leftSigItems.join('')}
            </div>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; text-align: right;">
                ${rightSigItems.join('')}
            </div>
        </div>
    ` : '';

    let headerHtml = '';

    if (docCustomization.structure === "banner") {
        headerHtml = `
            <div style="margin-bottom: 12px;">
                <div style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 14px 18px; margin: 0 -14mm 10px -14mm; border-radius: 0; display: flex; justify-content: space-between; align-items: center;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 140px; object-fit: contain; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;" />`
                                    : `<div style="background-color: rgba(255,255,255,0.2); color: #FFFFFF; font-weight: 800; border-radius: 4px; padding: 4px 8px; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 8).toUpperCase())}</div>`
                            ) : ''}
                            <div style="min-width: 0;">
                                <h3 style="font-size: 1.25em; font-weight: 800; color: #FFFFFF; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            </div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <h1 style="font-size: 1.7em; font-weight: 800; color: #FFFFFF; margin: 0; letter-spacing: 2px;">FACTURE</h1>
                        </div>
                    ` : `
                        <div style="text-align: left; flex-shrink: 0;">
                            <h1 style="font-size: 1.7em; font-weight: 800; color: #FFFFFF; margin: 0; letter-spacing: 2px;">FACTURE</h1>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; text-align: right;">
                            <div style="min-width: 0;">
                                <h3 style="font-size: 1.25em; font-weight: 800; color: #FFFFFF; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            </div>
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 140px; object-fit: contain; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;" />`
                                    : `<div style="background-color: rgba(255,255,255,0.2); color: #FFFFFF; font-weight: 800; border-radius: 4px; padding: 4px 8px; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 8).toUpperCase())}</div>`
                            ) : ''}
                        </div>
                    `}
                </div>

                <div style="display: flex; justify-content: space-between; background-color: #F4F4F2; padding: 5px 10px; border-radius: 4px; font-size: 0.85em; margin-bottom: 8px; color: #4A4A4A;">
                    <div><strong>Numéro : </strong> ${escapeHtml(invoiceNumberStr)}</div>
                    <div><strong>Date : </strong> ${escapeHtml(invoiceDateStr)}</div>
                    <div><strong>Échéance : </strong> ${escapeHtml(invoiceDueDateStr)}</div>
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px;">
                        <div style="flex: 1; min-width: 0; font-size: 0.85em; line-height: 1.35; opacity: 0.85; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="flex: 1; min-width: 0; background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; opacity: 0.65; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 0.85em; line-height: 1.35; opacity: 0.85; margin-bottom: 6px; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; opacity: 0.65; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
    } else if (docCustomization.structure === "modern") {
        headerHtml = `
            <div style="padding-top: 10mm; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div style="min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo 
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 6px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</div>`
                            ) : ''}
                            <h3 style="font-size: 1.25em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <div>
                                <div style="display: inline-block; background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.95em; letter-spacing: 0.5px; margin-bottom: 3px;">
                                    FACTURE N° ${escapeHtml(invoiceNumberStr)}
                                </div>
                                <div style="font-size: 0.82em; opacity: 0.85;">
                                    Date : <strong>${escapeHtml(invoiceDateStr)}</strong> • Échéance : <strong>${escapeHtml(invoiceDueDateStr)}</strong>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: left; flex-shrink: 0;">
                            <div>
                                <div style="display: inline-block; background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.95em; letter-spacing: 0.5px; margin-bottom: 3px;">
                                    FACTURE N° ${escapeHtml(invoiceNumberStr)}
                                </div>
                                <div style="font-size: 0.82em; opacity: 0.85;">
                                    Date : <strong>${escapeHtml(invoiceDateStr)}</strong> • Échéance : <strong>${escapeHtml(invoiceDueDateStr)}</strong>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo 
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 6px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</div>`
                            ) : ''}
                            <h3 style="font-size: 1.25em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                    `}
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; gap: 12px; margin-bottom: 8px;">
                        <div style="flex: 1; min-width: 0; background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">Émetteur</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(companyDisplayName)}</div>
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="flex: 1; min-width: 0; background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div>${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div>${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div>${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 8px;">
                        <div style="background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; margin-bottom: 6px; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">Émetteur</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(companyDisplayName)}</div>
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div>${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div>${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div>${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
    } else if (docCustomization.structure === "minimal") {
        headerHtml = `
            <div style="padding-top: 10mm; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 6px; border-bottom: 1.5px solid #EAEAE6; margin-bottom: 10px;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div style="min-width: 0;">
                            ${docCustomization.showLogo && companyLogo ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize || 40}px; max-width: 140px; object-fit: contain; margin-bottom: 4pt;" />` : ''}
                            <h3 style="font-size: 1.2em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: -0.02em; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <h1 style="font-size: 1.8em; font-weight: 300; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: 3px;">FACTURE</h1>
                            <div style="font-size: 0.82em; color: #666; margin-top: 2px;">
                                N° ${escapeHtml(invoiceNumberStr)} • ${escapeHtml(invoiceDateStr)}
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: left; flex-shrink: 0;">
                            <h1 style="font-size: 1.8em; font-weight: 300; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: 3px;">FACTURE</h1>
                            <div style="font-size: 0.82em; color: #666; margin-top: 2px;">
                                N° ${escapeHtml(invoiceNumberStr)} • ${escapeHtml(invoiceDateStr)}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 0;">
                            ${docCustomization.showLogo && companyLogo ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize || 40}px; max-width: 140px; object-fit: contain; margin-bottom: 4pt;" />` : ''}
                            <h3 style="font-size: 1.2em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: -0.02em; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                    `}
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px;">
                        <div style="flex: 1; min-width: 0; font-size: 0.85em; line-height: 1.35; color: #4A4A4A; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="flex: 1; min-width: 0; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 0.85em; line-height: 1.35; color: #4A4A4A; margin-bottom: 6px; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="border-top: 1px dashed #E0E0E0; padding-top: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
    } else {
        // Classic structure (Default)
        headerHtml = `
            <div style="padding-top: 10mm; margin-bottom: 12px;">
                <div class="pdf-header-row" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div class="pdf-header-left" style="flex: 1; min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div class="pdf-logo-stub" style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 4px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;"><span>${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</span></div>`
                            ) : ''}
                            <h3 class="company-name" style="color: ${docCustomization.primaryColor}; margin: 0 0 4px 0; font-size: 1.2em; font-weight: 800; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            <p class="company-details" style="margin: 0; font-size: 0.85em; line-height: 1.35; opacity: 0.85; word-break: break-word;">
                                ${docCustomization.showAddress ? `<span>${escapeHtml(companyDisplayAddress)}<br /></span>` : ''}
                                ${docCustomization.showSiret ? `<span>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}<br /></span>` : ''}
                                ${docCustomization.showPhone ? `<span>Tél : ${escapeHtml(companyDisplayPhone)}<br /></span>` : ''}
                                ${docCustomization.showEmail ? `<span>Email : ${escapeHtml(companyDisplayEmail)}</span>` : ''}
                            </p>
                        </div>

                        <div class="pdf-header-right" style="text-align: right; flex-shrink: 0;">
                            <h1 class="doc-type-label" style="color: ${docCustomization.primaryColor}; font-size: 1.6em; margin: 0; font-weight: 800;">FACTURE</h1>
                            <table class="doc-meta-table" style="font-size: 0.88em; margin-top: 3pt; margin-left: auto;">
                                <tbody>
                                    <tr>
                                        <td style="text-align: right; padding-right: 6px;"><strong>Numéro :</strong></td>
                                        <td>${escapeHtml(invoiceNumberStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right; padding-right: 6px;"><strong>Date :</strong></td>
                                        <td>${escapeHtml(invoiceDateStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right; padding-right: 6px;"><strong>Échéance :</strong></td>
                                        <td>${escapeHtml(invoiceDueDateStr)}</td>
                                    </tr>
                                    ${docCustomization.showDeliveryDate && invoice.deliveryDate ? `
                                        <tr>
                                            <td style="text-align: right; padding-right: 6px;"><strong>Livraison :</strong></td>
                                            <td>${escapeHtml(new Date(invoice.deliveryDate).toLocaleDateString("fr-FR"))}</td>
                                        </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="pdf-header-right" style="text-align: left; flex-shrink: 0;">
                            <h1 class="doc-type-label" style="color: ${docCustomization.primaryColor}; font-size: 1.6em; margin: 0; font-weight: 800;">FACTURE</h1>
                            <table class="doc-meta-table" style="font-size: 0.88em; margin-top: 3pt; margin-right: auto;">
                                <tbody>
                                    <tr>
                                        <td style="text-align: left; padding-right: 6px;"><strong>Numéro :</strong></td>
                                        <td>${escapeHtml(invoiceNumberStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: left; padding-right: 6px;"><strong>Date :</strong></td>
                                        <td>${escapeHtml(invoiceDateStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: left; padding-right: 6px;"><strong>Échéance :</strong></td>
                                        <td>${escapeHtml(invoiceDueDateStr)}</td>
                                    </tr>
                                    ${docCustomization.showDeliveryDate && invoice.deliveryDate ? `
                                        <tr>
                                            <td style="text-align: left; padding-right: 6px;"><strong>Livraison :</strong></td>
                                            <td>${escapeHtml(new Date(invoice.deliveryDate).toLocaleDateString("fr-FR"))}</td>
                                        </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>

                        <div class="pdf-header-left" style="flex: 1; min-width: 0; text-align: right;">
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div class="pdf-logo-stub" style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 4px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;"><span>${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</span></div>`
                            ) : ''}
                            <h3 class="company-name" style="color: ${docCustomization.primaryColor}; margin: 0 0 4px 0; font-size: 1.2em; font-weight: 800; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            <p class="company-details" style="margin: 0; font-size: 0.85em; line-height: 1.35; opacity: 0.85; word-break: break-word;">
                                ${docCustomization.showAddress ? `<span>${escapeHtml(companyDisplayAddress)}<br /></span>` : ''}
                                ${docCustomization.showSiret ? `<span>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}<br /></span>` : ''}
                                ${docCustomization.showPhone ? `<span>Tél : ${escapeHtml(companyDisplayPhone)}<br /></span>` : ''}
                                ${docCustomization.showEmail ? `<span>Email : ${escapeHtml(companyDisplayEmail)}</span>` : ''}
                            </p>
                        </div>
                    `}
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                        <div class="pdf-billing-section" style="width: 55%; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; text-align: left; word-break: break-word;">
                            <span class="section-label" style="font-size: 0.75em; font-weight: 700; letter-spacing: 0.5px; opacity: 0.65; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À :</span>
                            <h4 class="client-name" style="font-size: 1em; font-weight: 700; margin: 0; color: #1A1A1A; line-height: 1.3;">${escapeHtml(clientDisplayName)}</h4>
                            ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="pdf-billing-section" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; margin: 8px 0; text-align: left; word-break: break-word;">
                        <span class="section-label" style="font-size: 0.75em; font-weight: 700; letter-spacing: 0.5px; opacity: 0.65; text-transform: uppercase; display: block; margin-bottom: 2px;">FACTURÉ À :</span>
                        <h4 class="client-name" style="font-size: 1em; font-weight: 700; margin: 0; color: #1A1A1A; line-height: 1.3;">${escapeHtml(clientDisplayName)}</h4>
                        ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                        ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                        ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                    </div>
                `}
            </div>
        `;
    }

    // Table rows
    const tableRowsHtml = (invoiceLines.length > 0) ? invoiceLines.map(line => `
        <tr style="border-bottom: 1px solid #EAEAE6;">
            <td style="padding: 6px 8px; width: 48%; word-break: break-word;">
                <div style="font-weight: 600;">${escapeHtml(line.description || "Prestation")}</div>
                ${line.reference ? `<div style="font-size: 7.5pt; color: #7C7B82; margin-top: 2pt;">Réf: ${escapeHtml(line.reference)}</div>` : ''}
            </td>
            <td style="padding: 6px 4px; text-align: center; width: 8%; white-space: nowrap;">${line.qty}</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${line.unitPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${(line.unitPrice * line.qty).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        </tr>
    `).join('') : `
        <tr style="border-bottom: 1px solid #EAEAE6;">
            <td style="padding: 6px 8px; width: 48%; word-break: break-word;">
                <div style="font-weight: 600;">${escapeHtml(invoice.interventionType || invoice.subject || "Prestation")}</div>
            </td>
            <td style="padding: 6px 4px; text-align: center; width: 8%; white-space: nowrap;">1</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${(Number(invoice.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${(Number(invoice.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        </tr>
    `;

    return `
    <div class="invoice-pdf-a4-sheet" id="invoice-pdf-print-area">
        <div>
            ${headerHtml}

            <!-- Table items -->
            <table class="pdf-items-table" style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 0.95em;">
                <thead style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF;">
                    <tr style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF;">
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: left; width: 48%; padding: 6px 8px; border-radius: 3px 0 0 3px;">Description</th>
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: center; width: 8%; padding: 6px 4px; white-space: nowrap;">Qté</th>
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: right; width: 22%; padding: 6px 8px; white-space: nowrap;">Prix unit. HT</th>
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: right; width: 22%; padding: 6px 8px; border-radius: 0 3px 3px 0; white-space: nowrap;">Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>

            <!-- Summary Block -->
            <div class="pdf-summary-block" style="display: flex; justify-content: flex-end; margin: 12px 0;">
                <div class="summary-table-wrap">
                    <table class="pdf-summary-table" style="width: auto; min-width: 210px; font-size: 0.95em;">
                        <tbody>
                            <tr>
                                <td style="white-space: nowrap; padding: 4px 8px;">Sous-total HT :</td>
                                <td style="text-align: right; white-space: nowrap; padding: 4px 8px;">${subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            </tr>
                            <tr>
                                <td style="white-space: nowrap; padding: 4px 8px;">TVA (${tvaRate}%) :</td>
                                <td style="text-align: right; white-space: nowrap; padding: 4px 8px;">${tvaAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            </tr>
                            <tr class="grand-total-row" style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; font-weight: 700;">
                                <td style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 6px 8px; border-radius: 3px 0 0 3px; white-space: nowrap; font-size: 1.05em;"><strong>TOTAL TTC :</strong></td>
                                <td style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: right; padding: 6px 8px; border-radius: 0 3px 3px 0; white-space: nowrap; font-size: 1.05em;"><strong>${totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            ${signaturesHtml}
        </div>

        <!-- Footer details (pinned to bottom) -->
        <div class="pdf-footer-section" style="font-size: 0.8em; border-top: 1px solid #E5E5E5; padding-top: 8px; margin-top: auto; opacity: 0.85; line-height: 1.35;">
            ${docCustomization.showIban && companyIban ? `
                <div class="iban-block" style="margin-bottom: 4px; word-break: break-all;">
                    <strong>Coordonnées bancaires (IBAN) : </strong>
                    <span>${escapeHtml(companyIban)}</span>
                </div>
            ` : ''}
            <div class="legal-notes">
                <strong>Conditions de paiement : </strong> ${escapeHtml(invoice.paymentConditions || "Paiement à 30 jours")} (Échéance le ${escapeHtml(invoiceDueDateStr)}).<br />
                <strong>Pénalités de retard : </strong> En cas de retard de paiement, application d'un taux d'intérêt égal au taux de la BCE majoré de 10 points de pourcentage.<br />
                <strong>Indemnité forfaitaire pour frais de recouvrement : </strong> 40 € dus de plein droit par tout professionnel.<br />
                ${invoice.tvaRate === 0 ? `<span style="font-weight: 700; color: ${docCustomization.primaryColor};">TVA non applicable — art. 293 B du CGI.</span>` : ''}
                ${docCustomization.showAgaMention ? `
                    <div style="font-style: italic; margin-top: 2pt;">
                        Membre d'une association agréée, le règlement par chèque est accepté.
                    </div>
                ` : ''}
            </div>
        </div>
    </div>
    `;
}

export function renderQuoteHtml({ quote = {}, company = {}, customization = {} }) {
    const docCustomization = {
        primaryColor: customization.primaryColor || company?.settings?.primaryColor || "#556B2F",
        structure: customization.structure || "classic",
        fontFamily: customization.fontFamily || "Inter, sans-serif",
        fontSize: customization.fontSize || "9.5pt",
        bgColor: customization.bgColor || "#FFFFFF",
        textColor: customization.textColor || "#1A1A1A",
        showLogo: customization.showLogo !== false,
        logoPosition: customization.logoPosition || "left",
        logoSize: customization.logoSize || 45,
        clientBoxPosition: customization.clientBoxPosition || "bottom",
        showAddress: customization.showAddress !== false,
        showSiret: customization.showSiret !== false,
        showPhone: customization.showPhone !== false,
        showEmail: customization.showEmail !== false,
        showDeliveryDate: customization.showDeliveryDate !== false,
        showPaymentConditions: customization.showPaymentConditions !== false,
        showIban: customization.showIban !== false,
        showAgaMention: customization.showAgaMention === true,
        showCompanySignature: customization.showCompanySignature !== false,
        showClientSignature: customization.showClientSignature !== false,
        signaturePosition: customization.signaturePosition || "left",
        clientSignaturePosition: customization.clientSignaturePosition || "right"
    };

    const companyDisplayName = company?.name || quote.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayTva = company?.tvaNumber || company?.vatNumber || (company?.siren ? `FR ${company.siren}` : (company?.siret ? `FR${(12 + 3 * (parseInt(company.siret.substring(0, 9), 10) % 97)) % 97}${company.siret.substring(0, 9)}` : "Non renseigné"));
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = customization.logoUrl || company?.logoUrl || company?.settings?.logoUrl;
    const companyIban = company?.settings?.bankIban || company?.bankIban || company?.iban || quote.company?.settings?.bankIban || quote.company?.bankIban || "";
    const companySignature = customization.signatureUrl || company?.signatureUrl || company?.signature || company?.settings?.signatureUrl || company?.settings?.signature;

    const quoteLines = (quote.lines || []).map(l => ({
        ...l,
        qty: Number(l.quantity || l.qty || 1),
        unitPrice: Number(l.unitPrice || 0),
        tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (quote.tvaRate !== undefined && quote.tvaRate !== null ? Number(quote.tvaRate) : 20),
        total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
    }));
    const computedHt = quoteLines.reduce((acc, l) => acc + (l.unitPrice * l.qty), 0);
    const subtotalHt = Number(quote.subtotalHt || quote.amountHT || quote.totalHt || computedHt || 0);
    const tvaRate = Number(quote.tvaRate !== undefined && quote.tvaRate !== null ? quote.tvaRate : (quoteLines[0]?.tvaRate !== undefined ? quoteLines[0].tvaRate : 20));
    const computedTva = quoteLines.reduce((acc, l) => acc + (l.unitPrice * l.qty * ((l.tvaRate !== undefined ? l.tvaRate : tvaRate) / 100)), 0);
    const totalTtc = Number(quote.totalTtc || quote.amountTTC || (subtotalHt + computedTva) || 0);
    const tvaAmount = Number(quote.tvaAmount !== undefined && quote.tvaAmount !== null ? quote.tvaAmount : (totalTtc - subtotalHt));

    const quoteDateStr = new Date(quote.date || quote.createdAt || quote.issuedAt || Date.now()).toLocaleDateString("fr-FR");
    const quoteDueDateStr = new Date(quote.validUntil || quote.dueDate || (Date.now() + 30 * 86400000)).toLocaleDateString("fr-FR");
    const quoteNumberStr = quote.number || `DEV-${quote.id}`;

    const clientDisplayName = quote.client 
        ? (quote.client.companyName || `${quote.client.firstName || ''} ${quote.client.lastName || ''}`.trim() || quote.clientName || "Client")
        : (quote.clientName || "Client");
    const clientDisplayAddress = quote.client?.address || quote.clientAddress || (quote.client?.city ? `${quote.client.postalCode || ''} ${quote.client.city}`.trim() : "");
    const clientDisplayEmail = quote.client?.email || quote.clientEmail || "";
    const clientDisplayPhone = quote.client?.phone || quote.clientPhone || "";

    // Signatures
    const compPos = docCustomization.signaturePosition || "left";
    const clPos = docCustomization.clientSignaturePosition || "right";

    const renderCompanySigHtml = () => `
        <div style="width: 100%; max-width: 220px; min-width: 0; word-break: break-word;">
            <div style="font-weight: 700; margin-bottom: 4px; font-size: 0.9em;">Pour l'entreprise :</div>
            <div style="height: 48px; border: 1px dashed #DDD; display: flex; align-items: center; justify-content: center; border-radius: 6px; background-color: #FAFAF8; padding: 4px;">
                ${companySignature 
                    ? `<img src="${escapeHtml(companySignature)}" alt="Signature Entreprise" style="max-height: 40px; max-width: 90%; object-fit: contain;" />`
                    : `<span style="color: #888; font-size: 0.85em; font-style: italic;">${escapeHtml(companyDisplayName)}</span>`
                }
            </div>
        </div>
    `;

    const clientSigUrl = quote.signatureUrl || quote.clientSignatureUrl;
    const isSigned = Boolean(quote.status === "ACCEPTED" || quote.signedAt || clientSigUrl);
    const signedDateStr = new Date(quote.signedAt || quote.acceptedAt || quote.date || quote.createdAt || Date.now()).toLocaleDateString("fr-FR");

    const renderClientSigHtml = () => `
        <div style="width: 100%; max-width: 220px; min-width: 0; word-break: break-word;">
            <div style="font-weight: 700; margin-bottom: 4px; font-size: 0.9em;">Bon pour accord / Le Client :</div>
            <div style="height: 48px; border: 1px dashed ${isSigned ? 'rgba(22, 163, 74, 0.3)' : '#DDD'}; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; background-color: ${isSigned ? '#F0FDF4' : '#FAFAF8'}; padding: 4px; color: ${isSigned ? '#16A34A' : '#888'}; font-size: 0.82em;">
                ${clientSigUrl
                    ? `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                         <img src="${escapeHtml(clientSigUrl)}" alt="Signature Client" style="max-height: 32px; max-width: 90%; object-fit: contain;" />
                         <span style="font-size: 7pt; color: #16a34a; font-weight: 600; margin-top: 2px;">
                             ✓ Signé le ${escapeHtml(signedDateStr)}
                         </span>
                       </div>`
                    : isSigned
                        ? `<span style="font-weight: bold; color: #16a34a;">✓ Signé électroniquement</span>
                           <span style="font-size: 7.5pt; color: #7C7B82;">le ${escapeHtml(signedDateStr)}</span>`
                        : `<span style="font-style: italic; font-size: 0.78em;">Mention "Bon pour accord"</span>
                           <span style="font-size: 0.72em; margin-top: 2px; opacity: 0.8;">Date et signature</span>`
                }
            </div>
        </div>
    `;

    const leftSigItems = [];
    const rightSigItems = [];

    if (docCustomization.showCompanySignature !== false) {
        if (compPos === "left") leftSigItems.push(renderCompanySigHtml());
        else rightSigItems.push(renderCompanySigHtml());
    }

    if (docCustomization.showClientSignature !== false) {
        if (clPos === "left") leftSigItems.push(renderClientSigHtml());
        else rightSigItems.push(renderClientSigHtml());
    }

    const signaturesHtml = (docCustomization.showCompanySignature !== false || docCustomization.showClientSignature !== false) ? `
        <div class="pdf-signature-block-container" style="display: flex; justify-content: space-between; gap: 24px; margin: 12px 0; font-size: 0.85em; border-top: 1px dashed #E0E0E0; padding-top: 10px;">
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; text-align: left;">
                ${leftSigItems.join('')}
            </div>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; text-align: right;">
                ${rightSigItems.join('')}
            </div>
        </div>
    ` : '';

    let headerHtml = '';

    if (docCustomization.structure === "banner") {
        headerHtml = `
            <div style="margin-bottom: 12px;">
                <div style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 14px 18px; margin: 0 -14mm 10px -14mm; border-radius: 0; display: flex; justify-content: space-between; align-items: center;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 140px; object-fit: contain; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;" />`
                                    : `<div style="background-color: rgba(255,255,255,0.2); color: #FFFFFF; font-weight: 800; border-radius: 4px; padding: 4px 8px; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 8).toUpperCase())}</div>`
                            ) : ''}
                            <div style="min-width: 0;">
                                <h3 style="font-size: 1.25em; font-weight: 800; color: #FFFFFF; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            </div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <h1 style="font-size: 1.7em; font-weight: 800; color: #FFFFFF; margin: 0; letter-spacing: 2px;">DEVIS</h1>
                        </div>
                    ` : `
                        <div style="text-align: left; flex-shrink: 0;">
                            <h1 style="font-size: 1.7em; font-weight: 800; color: #FFFFFF; margin: 0; letter-spacing: 2px;">DEVIS</h1>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; text-align: right;">
                            <div style="min-width: 0;">
                                <h3 style="font-size: 1.25em; font-weight: 800; color: #FFFFFF; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            </div>
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 140px; object-fit: contain; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;" />`
                                    : `<div style="background-color: rgba(255,255,255,0.2); color: #FFFFFF; font-weight: 800; border-radius: 4px; padding: 4px 8px; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 8).toUpperCase())}</div>`
                            ) : ''}
                        </div>
                    `}
                </div>

                <div style="display: flex; justify-content: space-between; background-color: #F4F4F2; padding: 5px 10px; border-radius: 4px; font-size: 0.85em; margin-bottom: 8px; color: #4A4A4A;">
                    <div><strong>Numéro : </strong> ${escapeHtml(quoteNumberStr)}</div>
                    <div><strong>Date : </strong> ${escapeHtml(quoteDateStr)}</div>
                    <div><strong>Validité : </strong> ${escapeHtml(quoteDueDateStr)}</div>
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px;">
                        <div style="flex: 1; min-width: 0; font-size: 0.85em; line-height: 1.35; opacity: 0.85; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="flex: 1; min-width: 0; background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; opacity: 0.65; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 0.85em; line-height: 1.35; opacity: 0.85; margin-bottom: 6px; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; opacity: 0.65; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
    } else if (docCustomization.structure === "modern") {
        headerHtml = `
            <div style="padding-top: 10mm; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div style="min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo 
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 6px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</div>`
                            ) : ''}
                            <h3 style="font-size: 1.25em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <div>
                                <div style="display: inline-block; background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.95em; letter-spacing: 0.5px; margin-bottom: 3px;">
                                    DEVIS N° ${escapeHtml(quoteNumberStr)}
                                </div>
                                <div style="font-size: 0.82em; opacity: 0.85;">
                                    Date : <strong>${escapeHtml(quoteDateStr)}</strong> • Validité : <strong>${escapeHtml(quoteDueDateStr)}</strong>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: left; flex-shrink: 0;">
                            <div>
                                <div style="display: inline-block; background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.95em; letter-spacing: 0.5px; margin-bottom: 3px;">
                                    DEVIS N° ${escapeHtml(quoteNumberStr)}
                                </div>
                                <div style="font-size: 0.82em; opacity: 0.85;">
                                    Date : <strong>${escapeHtml(quoteDateStr)}</strong> • Validité : <strong>${escapeHtml(quoteDueDateStr)}</strong>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo 
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 6px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</div>`
                            ) : ''}
                            <h3 style="font-size: 1.25em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                    `}
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; gap: 12px; margin-bottom: 8px;">
                        <div style="flex: 1; min-width: 0; background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">Émetteur</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(companyDisplayName)}</div>
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="flex: 1; min-width: 0; background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div>${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div>${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div>${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 8px;">
                        <div style="background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; margin-bottom: 6px; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">Émetteur</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(companyDisplayName)}</div>
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="background-color: #FAFAF8; border-left: 4px solid ${docCustomization.primaryColor}; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR</span>
                            <div style="font-weight: 700; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div>${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div>${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div>${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
    } else if (docCustomization.structure === "minimal") {
        headerHtml = `
            <div style="padding-top: 10mm; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 6px; border-bottom: 1.5px solid #EAEAE6; margin-bottom: 10px;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div style="min-width: 0;">
                            ${docCustomization.showLogo && companyLogo ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize || 40}px; max-width: 140px; object-fit: contain; margin-bottom: 4pt;" />` : ''}
                            <h3 style="font-size: 1.2em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: -0.02em; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <h1 style="font-size: 1.8em; font-weight: 300; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: 3px;">DEVIS</h1>
                            <div style="font-size: 0.82em; color: #666; margin-top: 2px;">
                                N° ${escapeHtml(quoteNumberStr)} • ${escapeHtml(quoteDateStr)}
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: left; flex-shrink: 0;">
                            <h1 style="font-size: 1.8em; font-weight: 300; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: 3px;">DEVIS</h1>
                            <div style="font-size: 0.82em; color: #666; margin-top: 2px;">
                                N° ${escapeHtml(quoteNumberStr)} • ${escapeHtml(quoteDateStr)}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 0;">
                            ${docCustomization.showLogo && companyLogo ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize || 40}px; max-width: 140px; object-fit: contain; margin-bottom: 4pt;" />` : ''}
                            <h3 style="font-size: 1.2em; font-weight: 800; color: ${docCustomization.primaryColor}; margin: 0; letter-spacing: -0.02em; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                        </div>
                    `}
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px;">
                        <div style="flex: 1; min-width: 0; font-size: 0.85em; line-height: 1.35; color: #4A4A4A; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="flex: 1; min-width: 0; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 0.85em; line-height: 1.35; color: #4A4A4A; margin-bottom: 6px; word-break: break-word;">
                            ${docCustomization.showAddress ? `<div>${escapeHtml(companyDisplayAddress)}</div>` : ''}
                            ${docCustomization.showSiret ? `<div>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}</div>` : ''}
                            ${docCustomization.showPhone ? `<div>Tél : ${escapeHtml(companyDisplayPhone)}</div>` : ''}
                            ${docCustomization.showEmail ? `<div>Email : ${escapeHtml(companyDisplayEmail)}</div>` : ''}
                        </div>
                        <div style="border-top: 1px dashed #E0E0E0; padding-top: 6px; font-size: 0.85em; line-height: 1.35; word-break: break-word;">
                            <span style="font-size: 0.75em; font-weight: 700; color: ${docCustomization.primaryColor}; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR :</span>
                            <div style="font-weight: 700; font-size: 0.98em; color: #1A1A1A;">${escapeHtml(clientDisplayName)}</div>
                            ${clientDisplayAddress ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="color: #4A4A4A;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
    } else {
        // Classic structure (Default)
        headerHtml = `
            <div style="padding-top: 10mm; margin-bottom: 12px;">
                <div class="pdf-header-row" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    ${docCustomization.logoPosition !== "right" ? `
                        <div class="pdf-header-left" style="flex: 1; min-width: 0;">
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div class="pdf-logo-stub" style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 4px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;"><span>${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</span></div>`
                            ) : ''}
                            <h3 class="company-name" style="color: ${docCustomization.primaryColor}; margin: 0 0 4px 0; font-size: 1.2em; font-weight: 800; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            <p class="company-details" style="margin: 0; font-size: 0.85em; line-height: 1.35; opacity: 0.85; word-break: break-word;">
                                ${docCustomization.showAddress ? `<span>${escapeHtml(companyDisplayAddress)}<br /></span>` : ''}
                                ${docCustomization.showSiret ? `<span>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}<br /></span>` : ''}
                                ${docCustomization.showPhone ? `<span>Tél : ${escapeHtml(companyDisplayPhone)}<br /></span>` : ''}
                                ${docCustomization.showEmail ? `<span>Email : ${escapeHtml(companyDisplayEmail)}</span>` : ''}
                            </p>
                        </div>

                        <div class="pdf-header-right" style="text-align: right; flex-shrink: 0;">
                            <h1 class="doc-type-label" style="color: ${docCustomization.primaryColor}; font-size: 1.6em; margin: 0; font-weight: 800;">DEVIS</h1>
                            <table class="doc-meta-table" style="font-size: 0.88em; margin-top: 3pt; margin-left: auto;">
                                <tbody>
                                    <tr>
                                        <td style="text-align: right; padding-right: 6px;"><strong>Numéro :</strong></td>
                                        <td>${escapeHtml(quoteNumberStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right; padding-right: 6px;"><strong>Date :</strong></td>
                                        <td>${escapeHtml(quoteDateStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right; padding-right: 6px;"><strong>Validité :</strong></td>
                                        <td>${escapeHtml(quoteDueDateStr)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="pdf-header-right" style="text-align: left; flex-shrink: 0;">
                            <h1 class="doc-type-label" style="color: ${docCustomization.primaryColor}; font-size: 1.6em; margin: 0; font-weight: 800;">DEVIS</h1>
                            <table class="doc-meta-table" style="font-size: 0.88em; margin-top: 3pt; margin-right: auto;">
                                <tbody>
                                    <tr>
                                        <td style="text-align: left; padding-right: 6px;"><strong>Numéro :</strong></td>
                                        <td>${escapeHtml(quoteNumberStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: left; padding-right: 6px;"><strong>Date :</strong></td>
                                        <td>${escapeHtml(quoteDateStr)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: left; padding-right: 6px;"><strong>Validité :</strong></td>
                                        <td>${escapeHtml(quoteDueDateStr)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="pdf-header-left" style="flex: 1; min-width: 0; text-align: right;">
                            ${docCustomization.showLogo ? (
                                companyLogo
                                    ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: ${docCustomization.logoSize}px; max-width: 150px; object-fit: contain; margin-bottom: 4pt;" />`
                                    : `<div class="pdf-logo-stub" style="background-color: ${docCustomization.primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; border-radius: 4px; padding: 4px 8px; height: ${docCustomization.logoSize}px; min-width: ${docCustomization.logoSize * 1.8}px; margin-bottom: 4pt; font-size: 1.1em;"><span>${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</span></div>`
                            ) : ''}
                            <h3 class="company-name" style="color: ${docCustomization.primaryColor}; margin: 0 0 4px 0; font-size: 1.2em; font-weight: 800; word-break: break-word;">${escapeHtml(companyDisplayName)}</h3>
                            <p class="company-details" style="margin: 0; font-size: 0.85em; line-height: 1.35; opacity: 0.85; word-break: break-word;">
                                ${docCustomization.showAddress ? `<span>${escapeHtml(companyDisplayAddress)}<br /></span>` : ''}
                                ${docCustomization.showSiret ? `<span>SIRET : ${escapeHtml(companyDisplaySiret)} — N° TVA : ${escapeHtml(companyDisplayTva)}<br /></span>` : ''}
                                ${docCustomization.showPhone ? `<span>Tél : ${escapeHtml(companyDisplayPhone)}<br /></span>` : ''}
                                ${docCustomization.showEmail ? `<span>Email : ${escapeHtml(companyDisplayEmail)}</span>` : ''}
                            </p>
                        </div>
                    `}
                </div>

                ${docCustomization.clientBoxPosition === "right" ? `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                        <div class="pdf-billing-section" style="width: 55%; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; text-align: left; word-break: break-word;">
                            <span class="section-label" style="font-size: 0.75em; font-weight: 700; letter-spacing: 0.5px; opacity: 0.65; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR :</span>
                            <h4 class="client-name" style="font-size: 1em; font-weight: 700; margin: 0; color: #1A1A1A; line-height: 1.3;">${escapeHtml(clientDisplayName)}</h4>
                            ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                            ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                            ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="pdf-billing-section" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; background-color: #FAFAF8; border: 1px solid #EAEAE6; padding: 8px 12px; border-radius: 6px; margin: 8px 0; text-align: left; word-break: break-word;">
                        <span class="section-label" style="font-size: 0.75em; font-weight: 700; letter-spacing: 0.5px; opacity: 0.65; text-transform: uppercase; display: block; margin-bottom: 2px;">DEVIS POUR :</span>
                        <h4 class="client-name" style="font-size: 1em; font-weight: 700; margin: 0; color: #1A1A1A; line-height: 1.3;">${escapeHtml(clientDisplayName)}</h4>
                        ${clientDisplayAddress ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayAddress)}</div>` : ''}
                        ${clientDisplayEmail ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayEmail)}</div>` : ''}
                        ${clientDisplayPhone ? `<div style="font-size: 0.85em; opacity: 0.85; line-height: 1.35;">${escapeHtml(clientDisplayPhone)}</div>` : ''}
                    </div>
                `}
            </div>
        `;
    }

    // Table rows
    const tableRowsHtml = (quoteLines.length > 0) ? quoteLines.map(line => `
        <tr style="border-bottom: 1px solid #EAEAE6;">
            <td style="padding: 6px 8px; width: 48%; word-break: break-word;">
                <div style="font-weight: 600;">${escapeHtml(line.description || "Prestation")}</div>
                ${line.reference ? `<div style="font-size: 7.5pt; color: #7C7B82; margin-top: 2pt;">Réf: ${escapeHtml(line.reference)}</div>` : ''}
            </td>
            <td style="padding: 6px 4px; text-align: center; width: 8%; white-space: nowrap;">${line.qty}</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${line.unitPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${(line.unitPrice * line.qty).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        </tr>
    `).join('') : `
        <tr style="border-bottom: 1px solid #EAEAE6;">
            <td style="padding: 6px 8px; width: 48%; word-break: break-word;">
                <div style="font-weight: 600;">${escapeHtml(quote.interventionType || quote.subject || "Prestation")}</div>
            </td>
            <td style="padding: 6px 4px; text-align: center; width: 8%; white-space: nowrap;">1</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${(Number(quote.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
            <td style="padding: 6px 8px; text-align: right; width: 22%; white-space: nowrap;">${(Number(quote.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        </tr>
    `;

    return `
    <div class="invoice-pdf-a4-sheet" id="invoice-pdf-print-area">
        <div>
            ${headerHtml}

            <!-- Table items -->
            <table class="pdf-items-table" style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 0.95em;">
                <thead style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF;">
                    <tr style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF;">
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: left; width: 48%; padding: 6px 8px; border-radius: 3px 0 0 3px;">Description</th>
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: center; width: 8%; padding: 6px 4px; white-space: nowrap;">Qté</th>
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: right; width: 22%; padding: 6px 8px; white-space: nowrap;">Prix unit. HT</th>
                        <th style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: right; width: 22%; padding: 6px 8px; border-radius: 0 3px 3px 0; white-space: nowrap;">Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>

            <!-- Summary Block -->
            <div class="pdf-summary-block" style="display: flex; justify-content: flex-end; margin: 12px 0;">
                <div class="summary-table-wrap">
                    <table class="pdf-summary-table" style="width: auto; min-width: 210px; font-size: 0.95em;">
                        <tbody>
                            <tr>
                                <td style="white-space: nowrap; padding: 4px 8px;">Sous-total HT :</td>
                                <td style="text-align: right; white-space: nowrap; padding: 4px 8px;">${subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            </tr>
                            <tr>
                                <td style="white-space: nowrap; padding: 4px 8px;">TVA (${tvaRate}%) :</td>
                                <td style="text-align: right; white-space: nowrap; padding: 4px 8px;">${tvaAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            </tr>
                            <tr class="grand-total-row" style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; font-weight: 700;">
                                <td style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; padding: 6px 8px; border-radius: 3px 0 0 3px; white-space: nowrap; font-size: 1.05em;"><strong>TOTAL TTC :</strong></td>
                                <td style="background-color: ${docCustomization.primaryColor}; color: #FFFFFF; text-align: right; padding: 4px 8px; border-radius: 0 3px 3px 0; white-space: nowrap; font-size: 1.05em;"><strong>${totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            ${signaturesHtml}
        </div>

        <!-- Footer details (pinned to bottom) -->
        <div class="pdf-footer-section" style="font-size: 0.8em; border-top: 1px solid #E5E5E5; padding-top: 8px; margin-top: auto; opacity: 0.85; line-height: 1.35;">
            ${docCustomization.showIban && companyIban ? `
                <div class="iban-block" style="margin-bottom: 4px; word-break: break-all;">
                    <strong>Coordonnées bancaires (IBAN) : </strong>
                    <span>${escapeHtml(companyIban)}</span>
                </div>
            ` : ''}
            <div class="legal-notes">
                <strong>Conditions de paiement : </strong> ${escapeHtml(quote.paymentConditions || "Paiement à 30 jours")} (Échéance le ${escapeHtml(quoteDueDateStr)}).<br />
                <strong>Validité du devis : </strong> 30 jours à compter de la date d'émission (art. L. 221-5 et L. 111-1 C.conso). Devis gratuit avant exécution des travaux (art. L. 111-3 C.conso).<br />
                <strong>Conditions d'exécution : </strong> Les travaux débuteront après signature du devis accompagné d'un acompte.<br />
                ${quote.tvaRate === 0 ? `<span style="font-weight: 700; color: ${docCustomization.primaryColor};">TVA non applicable — art. 293 B du CGI.</span>` : ''}
                ${docCustomization.showAgaMention ? `
                    <div style="font-style: italic; margin-top: 2pt;">
                        Membre d'une association agréée, le règlement par chèque est accepté.
                    </div>
                ` : ''}
            </div>
        </div>
    </div>
    `;
}

/**
 * Render Official Payment Receipt HTML.
 */
export function renderReceiptHtml({ paymentData = {}, company = {}, customization = {} }) {
    const primaryColor = customization.primaryColor || company?.settings?.primaryColor || "#16A34A";
    const companyDisplayName = company?.name || paymentData.companyName || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : (paymentData.companyAddress || "Adresse non renseignée");
    const companyDisplaySiret = company?.siret || paymentData.companySiret || "Non renseigné";
    const companyDisplayPhone = company?.phone || paymentData.companyPhone || "Non renseigné";
    const companyDisplayEmail = company?.email || paymentData.companyEmail || "contact@entreprise.fr";
    const companyLogo = customization.logoUrl || company?.logoUrl || company?.settings?.logoUrl;

    const clientDisplayName = paymentData.clientName || "Client";
    const clientDisplayEmail = paymentData.clientEmail || "";
    const clientDisplayPhone = paymentData.clientPhone || "";
    const clientDisplayAddress = paymentData.clientAddress || "";

    const rawAmountTtc = Number(paymentData.amountTTC || paymentData.amount || 0);
    const rawAmountHt = paymentData.amountHT !== undefined && paymentData.amountHT !== null ? Number(paymentData.amountHT) : (rawAmountTtc / 1.2);
    const rawTvaAmount = paymentData.tvaAmount !== undefined && paymentData.tvaAmount !== null ? Number(paymentData.tvaAmount) : (rawAmountTtc - rawAmountHt);
    const tvaRate = paymentData.tvaRate !== undefined && paymentData.tvaRate !== null ? paymentData.tvaRate : 20;

    const formattedTtc = rawAmountTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedHt = rawAmountHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedTva = rawTvaAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const paidDate = paymentData.paidAt ? new Date(paymentData.paidAt) : new Date();
    const formattedDate = paidDate.toLocaleDateString("fr-FR");
    const formattedTime = paidDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const docTypeLabel = paymentData.type === "QUOTE" ? "Devis" : (paymentData.type === "SUBSCRIPTION" ? "Abonnement" : "Facture");
    const docNumber = paymentData.docNumber || "N/A";
    const cardBrand = paymentData.cardBrand ? paymentData.cardBrand.toUpperCase() : "CARTE BANCAIRE";
    const cardLast4 = paymentData.cardLast4 ? `•••• ${paymentData.cardLast4}` : "";
    const txId = paymentData.transactionId || `TX-${Date.now().toString(36).toUpperCase()}`;

    return `
    <div class="pdf-container-inner" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 277mm; font-family: Inter, sans-serif; color: #1A1A1A; padding: 14mm 14mm 10mm 14mm; box-sizing: border-box;">
        <div>
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #E2E8F0; margin-bottom: 16px;">
                <div style="flex: 1;">
                    ${companyLogo 
                        ? `<img src="${escapeHtml(companyLogo)}" alt="Logo" style="height: 48px; max-width: 160px; object-fit: contain; margin-bottom: 6px;" />` 
                        : `<div style="background-color: ${primaryColor}; color: #FFF; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; border-radius: 6px; padding: 6px 12px; height: 40px; margin-bottom: 6px; font-size: 1.1em;">${escapeHtml(companyDisplayName.substring(0, 10).toUpperCase())}</div>`
                    }
                    <h3 style="color: #0F172A; font-size: 1.25em; font-weight: 800; margin: 0 0 2px 0;">${escapeHtml(companyDisplayName)}</h3>
                    <div style="font-size: 0.85em; color: #64748B; line-height: 1.35;">
                        <div>${escapeHtml(companyDisplayAddress)}</div>
                        <div>SIRET : ${escapeHtml(companyDisplaySiret)}</div>
                        <div>Email : ${escapeHtml(companyDisplayEmail)} • Tél : ${escapeHtml(companyDisplayPhone)}</div>
                    </div>
                </div>

                <div style="text-align: right; flex-shrink: 0;">
                    <div style="display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85em; margin-bottom: 6px;">
                        ✓ PAIEMENT SÉCURISÉ CONFIRMÉ
                    </div>
                    <h1 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin: 0; letter-spacing: -0.02em;">REÇU DE PAIEMENT</h1>
                    <div style="font-size: 0.85em; color: #64748B; margin-top: 2px;">
                        Réf. Transaction : <strong>${escapeHtml(txId)}</strong>
                    </div>
                </div>
            </div>

            <!-- Transaction Highlights Box -->
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-size: 0.78em; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Document Réglé</span>
                    <strong style="font-size: 1.1em; color: #0F172A;">${escapeHtml(docTypeLabel)} ${escapeHtml(docNumber)}</strong>
                    <div style="font-size: 0.82em; color: #64748B; margin-top: 2px;">Date du règlement : <strong>${escapeHtml(formattedDate)} à ${escapeHtml(formattedTime)}</strong></div>
                </div>

                <div style="text-align: right;">
                    <span style="font-size: 0.78em; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Montant Total Acquitté</span>
                    <div style="font-size: 1.7em; font-weight: 800; color: #16A34A; line-height: 1;">${formattedTtc} € TTC</div>
                    <span style="font-size: 0.78em; color: #64748B;">Soit ${formattedHt} € HT</span>
                </div>
            </div>

            <!-- Parties (Issuer & Client) -->
            <div style="display: flex; gap: 16px; margin-bottom: 22px;">
                <div style="flex: 1; background-color: #FAFAF8; border-left: 4px solid ${primaryColor}; border-radius: 6px; padding: 12px 14px; font-size: 0.88em; line-height: 1.4;">
                    <span style="font-size: 0.75em; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; display: block; margin-bottom: 3px;">Bénéficiaire / Émetteur</span>
                    <div style="font-weight: 700; color: #0F172A; font-size: 1em;">${escapeHtml(companyDisplayName)}</div>
                    <div>SIRET : ${escapeHtml(companyDisplaySiret)}</div>
                    <div>${escapeHtml(companyDisplayAddress)}</div>
                    <div>${escapeHtml(companyDisplayEmail)}</div>
                </div>

                <div style="flex: 1; background-color: #FAFAF8; border-left: 4px solid #0F172A; border-radius: 6px; padding: 12px 14px; font-size: 0.88em; line-height: 1.4;">
                    <span style="font-size: 0.75em; font-weight: 700; color: #0F172A; text-transform: uppercase; display: block; margin-bottom: 3px;">Payeur / Client</span>
                    <div style="font-weight: 700; color: #0F172A; font-size: 1em;">${escapeHtml(clientDisplayName)}</div>
                    ${clientDisplayAddress ? `<div>${escapeHtml(clientDisplayAddress)}</div>` : ''}
                    ${clientDisplayEmail ? `<div>${escapeHtml(clientDisplayEmail)}</div>` : ''}
                    ${clientDisplayPhone ? `<div>Tél : ${escapeHtml(clientDisplayPhone)}</div>` : ''}
                </div>
            </div>

            <!-- Payment Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9em;">
                <thead>
                    <tr style="background-color: #0F172A; color: #FFFFFF;">
                        <th style="text-align: left; padding: 8px 10px; border-radius: 4px 0 0 4px;">Détail de l'opération</th>
                        <th style="text-align: left; padding: 8px 10px;">Moyen de règlement</th>
                        <th style="text-align: right; padding: 8px 10px; border-radius: 0 4px 4px 0;">Montant réglé</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 10px 10px;">
                            <strong>Règlement en ligne — ${escapeHtml(docTypeLabel)} N° ${escapeHtml(docNumber)}</strong>
                            <div style="font-size: 0.82em; color: #64748B; margin-top: 2px;">Authentification bancaire 3D-Secure validée</div>
                        </td>
                        <td style="padding: 10px 10px;">
                            <strong>${escapeHtml(cardBrand)} ${escapeHtml(cardLast4)}</strong>
                            <div style="font-size: 0.82em; color: #64748B;">Paiement CB en ligne chiffré</div>
                        </td>
                        <td style="padding: 10px 10px; text-align: right; font-weight: 700; font-size: 1.05em; color: #16A34A;">
                            ${formattedTtc} €
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Summary Table -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                <table style="width: auto; min-width: 240px; font-size: 0.92em; border-collapse: collapse;">
                    <tbody>
                        <tr>
                            <td style="padding: 4px 8px; color: #64748B;">Total HT :</td>
                            <td style="text-align: right; padding: 4px 8px; font-weight: 600;">${formattedHt} €</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 8px; color: #64748B;">TVA (${tvaRate}%) :</td>
                            <td style="text-align: right; padding: 4px 8px; font-weight: 600;">${formattedTva} €</td>
                        </tr>
                        <tr style="background-color: #F0FDF4; border: 1px solid #BBF7D0; font-size: 1.05em;">
                            <td style="padding: 8px 10px; font-weight: 800; color: #166534;">TOTAL PAYÉ TTC :</td>
                            <td style="text-align: right; padding: 8px 10px; font-weight: 800; color: #166534;">${formattedTtc} €</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Guarantee Box -->
            <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; padding: 12px 16px; font-size: 0.82em; color: #475569; line-height: 1.45;">
                <strong>Attestation de règlement : </strong>
                Le présent reçu atteste que la transaction n° <code>${escapeHtml(txId)}</code> d'un montant de <strong>${formattedTtc} € TTC</strong> a été validée et enregistrée avec succès. Ce document fait foi de justificatif de paiement électronique pour votre comptabilité.
            </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #E2E8F0; padding-top: 10px; margin-top: auto; font-size: 0.78em; color: #94A3B8; text-align: center; line-height: 1.35;">
            ${escapeHtml(companyDisplayName)} • SIRET : ${escapeHtml(companyDisplaySiret)} • Document généré électroniquement • GestArt CRM
        </div>
    </div>
    `;
}

