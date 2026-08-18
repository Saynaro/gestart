import PDFDocument from "pdfkit";

/**
 * Helper to safely extract image buffer from data URL or Buffer
 */
function getImageBuffer(dataOrUrl) {
    if (!dataOrUrl || typeof dataOrUrl !== "string") return null;
    if (dataOrUrl.startsWith("data:image")) {
        const parts = dataOrUrl.split(",");
        if (parts.length > 1) {
            return Buffer.from(parts[1], "base64");
        }
    }
    return null;
}

/**
 * Font helpers
 */
function getFontNames(fontFamily) {
    if (!fontFamily) return { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
    const str = String(fontFamily).toLowerCase();
    if (str.includes("georgia") || str.includes("serif") || str.includes("times")) {
        return { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic" };
    }
    if (str.includes("space") || str.includes("grotesk") || str.includes("mono") || str.includes("courier")) {
        return { regular: "Courier", bold: "Courier-Bold", italic: "Courier-Oblique" };
    }
    return { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
}

function getFontSizeScale(fontSize) {
    if (!fontSize) return 1.0;
    const str = String(fontSize).toLowerCase();
    if (str.includes("8") || str.includes("small") || str.includes("petite")) return 0.84;
    if (str.includes("10") || str.includes("large") || str.includes("grande") || str.includes("11") || str.includes("12")) return 1.16;
    return 1.0;
}

/**
 * Generate Quote (Devis) PDF Buffer matching all 4 custom templates
 */
export function generateQuotePdfBuffer({ quote, company, customization = {} }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 40,
                autoFirstPage: true,
                info: {
                    Title: `Devis ${quote.number || ''}`,
                    Author: company?.name || "GestArt CRM",
                    Subject: "Devis & Proposition commerciale"
                }
            });

            const buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Settings & Customization
            const structure = customization.structure || "classic";
            const primaryColor = customization.primaryColor || company?.settings?.primaryColor || "#556B2F";
            const bgColor = customization.bgColor || "#FFFFFF";
            const textColor = customization.textColor || "#1A1A1A";
            const fonts = getFontNames(customization.fontFamily);
            const scale = getFontSizeScale(customization.fontSize);
            const clientBoxPosition = customization.clientBoxPosition || "bottom";

            const showLogo = customization.showLogo !== false;
            const logoPosition = customization.logoPosition || "left";
            const logoSize = Math.max(25, Math.min(75, Number(customization.logoSize || 45)));

            const showAddress = customization.showAddress !== false;
            const showSiret = customization.showSiret !== false;
            const showPhone = customization.showPhone !== false;
            const showEmail = customization.showEmail !== false;
            const showDeliveryDate = customization.showDeliveryDate !== false;
            const showPaymentConditions = customization.showPaymentConditions !== false;
            const showIban = customization.showIban !== false;
            const showAgaMention = customization.showAgaMention === true;
            const showCompanySignature = customization.showCompanySignature !== false;
            const showClientSignature = customization.showClientSignature !== false;

            const companyName = company?.name || "Mon Entreprise";
            const clientName = quote.client 
                ? `${quote.client.firstName || ''} ${quote.client.lastName || quote.client.companyName || ''}`.trim() 
                : (quote.clientName || "Client");
            
            const rawDate = quote.date || quote.createdAt || new Date();
            const formattedDate = new Date(rawDate).toLocaleDateString("fr-FR");
            const rawDueDate = quote.validUntil || quote.dueDate || new Date(Date.now() + 30 * 86400000);
            const formattedDueDate = new Date(rawDueDate).toLocaleDateString("fr-FR");

            const companyLogo = showLogo ? getImageBuffer(customization.logoUrl || company?.logoUrl || company?.settings?.logoUrl) : null;
            const companySignature = getImageBuffer(customization.signatureUrl || company?.signatureUrl || company?.signature || company?.settings?.signatureUrl);
            const clientSignature = getImageBuffer(quote.signatureUrl);
            const bankIban = company?.settings?.bankIban || company?.bankIban || customization?.bankIban || "";
            const bankBic = company?.settings?.bankBic || company?.bankBic || customization?.bankBic || "";

            const companyDisplayAddress = company?.address 
                ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}`.trim()
                : "";
            const companyDisplaySiret = company?.siret || "";
            const companyDisplayTva = company?.tvaNumber || company?.vatNumber || (company?.siren ? `FR ${company.siren}` : (company?.siret ? `FR${(12 + 3 * (parseInt(company.siret.substring(0, 9), 10) % 97)) % 97}${company.siret.substring(0, 9)}` : ""));
            const companyDisplayPhone = company?.phone || "";
            const companyDisplayEmail = company?.email || "";

            const clientAddress = quote.client?.address || quote.clientAddress || (quote.client?.city ? `${quote.client.postalCode || ''} ${quote.client.city}`.trim() : "");
            const clientEmail = quote.client?.email || quote.clientEmail || "";
            const clientPhone = quote.client?.phone || quote.clientPhone || "";

            // Page Background Color
            if (bgColor && bgColor !== "#FFFFFF") {
                doc.rect(0, 0, 595.28, 841.89).fill(bgColor);
            }

            let curY = 40;

            // ==================== 1. STRUCTURE HEADERS ====================
            if (structure === "banner") {
                // Top full-width edge-to-edge banner (y = 0, 0 top margin)
                const bannerHeight = 56;
                doc.rect(0, 0, 595.28, bannerHeight).fill(primaryColor);

                let bannerLogoWidth = 0;
                if (companyLogo) {
                    try {
                        const imgFitHeight = Math.min(38, logoSize * 0.85);
                        doc.image(companyLogo, 40, (bannerHeight - imgFitHeight) / 2, { fit: [100, imgFitHeight] });
                        bannerLogoWidth = 85;
                    } catch (e) {}
                }

                const compNameX = 40 + (bannerLogoWidth ? bannerLogoWidth + 12 : 0);
                doc.fillColor("#FFFFFF")
                   .fontSize(13.5 * scale)
                   .font(fonts.bold)
                   .text(companyName, compNameX, 21);

                doc.fillColor("#FFFFFF")
                   .fontSize(18 * scale)
                   .font(fonts.bold)
                   .text("DEVIS", 340, 18, { width: 215, align: "right" });

                // Sub metadata strip below banner
                const metaTop = 66;
                doc.roundedRect(40, metaTop, 515, 20, 3).fill("#F4F4F2");
                doc.fillColor("#4A4A4A")
                   .fontSize(8.5 * scale)
                   .font(fonts.bold)
                   .text(`Numéro : ${quote.number || ''}`, 52, metaTop + 6);
                doc.text(`Date : ${formattedDate}`, 240, metaTop + 6);
                if (showDeliveryDate) {
                    doc.text(`Validité : ${formattedDueDate}`, 410, metaTop + 6);
                }

                curY = metaTop + 30;

                // Company + Client Details
                if (clientBoxPosition === "right") {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftCompY); leftCompY += 12; }
                    if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}${companyDisplayTva ? ` — N° TVA : ${companyDisplayTva}` : ''}`, 40, leftCompY); leftCompY += 12; }
                    if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftCompY); leftCompY += 12; }
                    if (showEmail && companyDisplayEmail) { doc.text(`Email : ${companyDisplayEmail}`, 40, leftCompY); leftCompY += 12; }

                    const cBoxHeight = 68;
                    doc.roundedRect(300, curY, 255, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#EAEAE6");
                    let rY = curY + 8;
                    doc.fillColor("#6B7280").fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 310, rY);
                    rY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 310, rY);
                    rY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 310, rY); rY += 10; }
                    if (clientEmail) { doc.text(clientEmail, 310, rY); rY += 10; }
                    if (clientPhone) { doc.text(`Tél : ${clientPhone}`, 310, rY); }

                    curY = Math.max(leftCompY, curY + cBoxHeight) + 14;
                } else {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftCompY); leftCompY += 12; }
                    if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}${companyDisplayTva ? ` — N° TVA : ${companyDisplayTva}` : ''}`, 40, leftCompY); leftCompY += 12; }
                    if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftCompY); leftCompY += 12; }
                    if (showEmail && companyDisplayEmail) { doc.text(`Email : ${companyDisplayEmail}`, 40, leftCompY); leftCompY += 12; }

                    curY = leftCompY + 6;
                    doc.roundedRect(40, curY, 515, 58, 4).fillAndStroke("#FAFAF8", "#EAEAE6");
                    let bY = curY + 8;
                    doc.fillColor("#6B7280").fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 50, bY);
                    bY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 50, bY);
                    bY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 50, bY); bY += 10; }
                    if (clientEmail || clientPhone) { doc.text(`${clientEmail}${clientEmail && clientPhone ? '  •  ' : ''}${clientPhone ? `Tél : ${clientPhone}` : ''}`, 50, bY); }

                    curY += 68;
                }

            } else if (structure === "modern") {
                let leftY = 40;
                if (companyLogo) {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [110, Math.min(42, logoSize)] });
                        leftY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(14 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 18;

                let rightY = 40;
                const badgeText = `DEVIS N° ${quote.number || ''}`;
                const badgeWidth = 195;
                const badgeX = 555 - badgeWidth;
                doc.roundedRect(badgeX, rightY, badgeWidth, 22, 11).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(10 * scale).font(fonts.bold).text(badgeText, badgeX, rightY + 5.5, { width: badgeWidth, align: "center" });
                rightY += 28;

                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular).text(`Date : ${formattedDate}${showDeliveryDate ? `  •  Validité : ${formattedDueDate}` : ''}`, 300, rightY, { width: 255, align: "right" });
                rightY += 14;

                const boxTop = Math.max(leftY, rightY) + 8;

                if (clientBoxPosition === "right") {
                    const cBoxHeight = 68;
                    doc.roundedRect(40, boxTop, 245, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    doc.rect(40, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let emY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("ÉMETTEUR", 48, emY);
                    emY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(companyName, 48, emY);
                    emY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 48, emY); emY += 10; }
                    if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}`, 48, emY); emY += 10; }
                    if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 48, emY); }

                    doc.roundedRect(300, boxTop, 255, cBoxHeight, 4).fillAndStroke("#F8FAFC", "#E2E8F0");
                    doc.rect(300, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let clY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 310, clY);
                    clY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 310, clY);
                    clY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 310, clY); clY += 10; }
                    if (clientPhone) { doc.text(`Tél : ${clientPhone}`, 310, clY); }

                    curY = boxTop + cBoxHeight + 12;
                } else {
                    const cBoxHeight = 52;
                    doc.roundedRect(40, boxTop, 515, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    doc.rect(40, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let emY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("ÉMETTEUR", 48, emY);
                    emY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(companyName, 48, emY);
                    emY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 48, emY); }

                    const bottomBoxTop = boxTop + cBoxHeight + 8;
                    doc.roundedRect(40, bottomBoxTop, 515, cBoxHeight, 4).fillAndStroke("#F8FAFC", "#E2E8F0");
                    doc.rect(40, bottomBoxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let clY = bottomBoxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 48, clY);
                    clY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 48, clY);
                    clY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 48, clY); }

                    curY = bottomBoxTop + cBoxHeight + 12;
                }

            } else if (structure === "minimal") {
                let leftY = 40;
                if (companyLogo) {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [95, 36] });
                        leftY += 40;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(13.5 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 15;
                doc.fillColor("#4A4A4A").fontSize(8.5 * scale).font(fonts.regular);
                if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftY); leftY += 10; }
                if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}`, 40, leftY); leftY += 10; }
                if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftY); leftY += 10; }

                let rightY = 40;
                doc.fillColor(primaryColor).fontSize(20 * scale).font(fonts.bold).text("DEVIS", 340, rightY, { width: 215, align: "right" });
                rightY += 24;
                doc.fillColor("#4A4A4A").fontSize(8.5 * scale).font(fonts.regular).text(`N° ${quote.number || ''} • ${formattedDate}`, 340, rightY, { width: 215, align: "right" });
                rightY += 14;
                if (showDeliveryDate) {
                    doc.text(`Validité : ${formattedDueDate}`, 340, rightY, { width: 215, align: "right" });
                    rightY += 12;
                }

                const sepY = Math.max(leftY, rightY) + 8;
                doc.moveTo(40, sepY).lineTo(555, sepY).strokeColor("#EAEAE6").lineWidth(1).stroke();

                if (clientBoxPosition === "right") {
                    let cY = sepY + 8;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 310, cY);
                    cY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 310, cY);
                    cY += 12;
                    doc.fillColor("#4A4A4A").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 310, cY); cY += 10; }
                    if (clientPhone) { doc.text(`Tél : ${clientPhone}`, 310, cY); }
                    curY = cY + 12;
                } else {
                    let cY = sepY + 8;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 40, cY);
                    cY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 40, cY);
                    cY += 12;
                    doc.fillColor("#4A4A4A").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 40, cY); cY += 10; }
                    curY = cY + 12;
                }

            } else {
                // Classic structure (Default) - Exactly matches QuotePdfView.jsx
                let leftY = 40;
                if (companyLogo && logoPosition === "left") {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [110, Math.min(45, logoSize)] });
                        leftY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(13.5 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 16;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftY); leftY += 11; }
                if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}${companyDisplayTva ? ` — N° TVA : ${companyDisplayTva}` : ''}`, 40, leftY); leftY += 11; }
                if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftY); leftY += 11; }
                if (showEmail && companyDisplayEmail) { doc.text(`Email : ${companyDisplayEmail}`, 40, leftY); leftY += 11; }

                let rightY = 40;
                if (companyLogo && logoPosition === "right") {
                    try {
                        doc.image(companyLogo, 440, rightY, { fit: [115, Math.min(45, logoSize)], align: "right" });
                        rightY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(22 * scale).font(fonts.bold).text("DEVIS", 315, rightY, { width: 240, align: "right" });
                rightY += 26;

                // Meta Table matching doc-meta-table
                doc.fillColor("#475569").fontSize(9 * scale);
                doc.font(fonts.bold).text("Numéro : ", 340, rightY, { width: 90, align: "right" });
                doc.font(fonts.regular).fillColor(textColor).text(quote.number || '', 435, rightY, { width: 120, align: "left" });
                rightY += 13;

                doc.fillColor("#475569").font(fonts.bold).text("Date : ", 340, rightY, { width: 90, align: "right" });
                doc.font(fonts.regular).fillColor(textColor).text(formattedDate, 435, rightY, { width: 120, align: "left" });
                rightY += 13;

                if (showDeliveryDate) {
                    doc.fillColor("#475569").font(fonts.bold).text("Validité : ", 340, rightY, { width: 90, align: "right" });
                    doc.font(fonts.regular).fillColor(textColor).text(formattedDueDate, 435, rightY, { width: 120, align: "left" });
                    rightY += 13;
                }

                const boxTop = Math.max(leftY, rightY) + 10;
                const cBoxWidth = clientBoxPosition === "right" ? 255 : 515;
                const cBoxLeft = clientBoxPosition === "right" ? 300 : 40;
                
                let clientLinesCount = 2;
                if (clientAddress) clientLinesCount++;
                if (clientEmail) clientLinesCount++;
                if (clientPhone) clientLinesCount++;
                const cBoxHeight = Math.max(58, 16 + clientLinesCount * 12);

                doc.roundedRect(cBoxLeft, boxTop, cBoxWidth, cBoxHeight, 6).fillAndStroke("#FAFAF8", "#EAEAE6");
                let cY = boxTop + 8;
                doc.fillColor("#6B7280").fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", cBoxLeft + 12, cY);
                cY += 12;
                doc.fillColor(textColor).fontSize(10.5 * scale).font(fonts.bold).text(clientName, cBoxLeft + 12, cY);
                cY += 14;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (clientAddress) { doc.text(clientAddress, cBoxLeft + 12, cY); cY += 11; }
                if (clientEmail) { doc.text(clientEmail, cBoxLeft + 12, cY); cY += 11; }
                if (clientPhone) { doc.text(`Tél : ${clientPhone}`, cBoxLeft + 12, cY); }

                curY = boxTop + cBoxHeight + 14;
            }

            // ==================== 2. TABLE OF ITEMS ====================
            const tableTop = curY;
            if (structure === "minimal") {
                doc.moveTo(40, tableTop).lineTo(555, tableTop).strokeColor("#0F172A").lineWidth(1).stroke();
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold);
            } else {
                doc.roundedRect(40, tableTop, 515, 20, 3).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(8.5 * scale).font(fonts.bold);
            }

            const headerTextY = tableTop + 5.5;
            doc.text("Description", 48, headerTextY, { width: 240 });
            doc.text("Qté", 295, headerTextY, { width: 45, align: "center" });
            doc.text("Prix unit. HT", 345, headerTextY, { width: 95, align: "right" });
            doc.text("Total HT", 445, headerTextY, { width: 100, align: "right" });


            const lines = (quote.lines && quote.lines.length > 0) 
                ? quote.lines 
                : [{ description: quote.interventionType || quote.subject || "Prestation", quantity: 1, unitPrice: quote.amountHT || quote.totalHt || 0, total: quote.amountHT || quote.totalHt || 0 }];
            
            let rowY = tableTop + 20;
            const rowHeight = 20;

            lines.forEach((l, idx) => {
                const isEven = idx % 2 === 0;
                if (isEven && structure !== "minimal") {
                    doc.rect(40, rowY, 515, rowHeight).fill("#FAFAF8");
                }

                // Columns match header: Desc x=48 w=240 | Qté x=295 w=45 | Prix x=345 w=95 | Total x=445 w=100
                doc.fillColor(textColor)
                   .fontSize(8.5 * scale)
                   .font(fonts.regular)
                   .text(l.description || "Prestation", 48, rowY + 5, { width: 240, lineBreak: false });

                doc.fillColor("#334155")
                   .text(String(l.quantity || l.qty || 1), 295, rowY + 5, { width: 45, align: "center" });

                const unitPrice = Number(l.unitPrice || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.text(`${unitPrice} €`, 345, rowY + 5, { width: 95, align: "right" });

                const lineTotal = Number(l.total || (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1))).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.font(fonts.bold)
                   .fillColor(textColor)
                   .text(`${lineTotal} €`, 445, rowY + 5, { width: 100, align: "right" });

                rowY += rowHeight;
                doc.moveTo(40, rowY).lineTo(555, rowY).strokeColor("#EAEAE6").lineWidth(0.5).stroke();
            });

            // ==================== 3. SUMMARY TOTALS ====================
            // Match web: justify-content flex-end, table rows padding 4px 8px, total row padding 6px 8px
            const summaryTop = rowY + 12;
            const computedHt = lines.reduce((acc, l) => acc + (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1)), 0);
            const totalHtNum = quote.amountHT !== undefined && quote.amountHT !== null ? Number(quote.amountHT) : (quote.totalHt !== undefined ? Number(quote.totalHt) : computedHt);
            const totalTtcNum = quote.amountTTC !== undefined && quote.amountTTC !== null ? Number(quote.amountTTC) : (quote.totalTtc !== undefined ? Number(quote.totalTtc) : totalHtNum);
            const tvaRate = quote.tvaRate !== undefined && quote.tvaRate !== null ? quote.tvaRate : (lines[0]?.tvaRate || 20);
            const tvaAmountNum = Math.max(0, totalTtcNum - totalHtNum);

            const totalHtFormatted = `${totalHtNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
            const tvaFormatted = `${tvaAmountNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
            const totalTtcFormatted = `${totalTtcNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

            // Summary table: right-aligned, minWidth 215, rows with 4pt top/bottom padding (≈ web 4px 8px)
            const sumLeft = 340;
            const sumWidth = 215;
            const sumRowH = 20; // ~4pt top + 12pt text + 4pt bottom

            // Row 1: Sous-total HT
            doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular)
               .text("Sous-total HT :", sumLeft + 8, summaryTop + 4);
            doc.fillColor(textColor).font(fonts.bold)
               .text(totalHtFormatted, sumLeft, summaryTop + 4, { width: sumWidth - 8, align: "right" });

            // Row 2: TVA
            doc.fillColor("#475569").font(fonts.regular)
               .text(`TVA (${tvaRate}%) :`, sumLeft + 8, summaryTop + sumRowH + 4);
            doc.fillColor(textColor).font(fonts.bold)
               .text(tvaFormatted, sumLeft, summaryTop + sumRowH + 4, { width: sumWidth - 8, align: "right" });

            // Row 3: TOTAL TTC (colored box, 6pt top/bottom padding)
            const totalBoxTop = summaryTop + sumRowH * 2 + 4;
            if (structure === "minimal") {
                doc.rect(sumLeft, totalBoxTop, sumWidth, 26).fill("#0F172A");
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            } else {
                doc.roundedRect(sumLeft, totalBoxTop, sumWidth, 26, 4).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            }
            doc.text("TOTAL TTC :", sumLeft + 8, totalBoxTop + 7);
            doc.text(totalTtcFormatted, sumLeft + 8, totalBoxTop + 7, { width: sumWidth - 16, align: "right" });

            // ==================== 4. SIGNATURES ====================
            // Match web preview (QuotePdfView): dynamic placement via signaturePosition / clientSignaturePosition
            const compPos = customization.signaturePosition || "left";
            const clPos = customization.clientSignaturePosition || "right";

            const leftSigs = [];
            const rightSigs = [];

            if (showCompanySignature) {
                if (compPos === "left") leftSigs.push("company");
                else rightSigs.push("company");
            }

            if (showClientSignature) {
                if (clPos === "left") leftSigs.push("client");
                else rightSigs.push("client");
            }

            const sigSepY = totalBoxTop + 36;
            doc.moveTo(40, sigSepY).lineTo(555, sigSepY).dash(3, { space: 3 }).strokeColor("#E0E0E0").lineWidth(0.75).stroke().undash();
            const sigTop = sigSepY + 12;

            const isSigned = Boolean(quote.status === "ACCEPTED" || quote.signedAt || quote.signatureUrl || quote.clientSignatureUrl);
            const signedDateStr = new Date(quote.signedAt || quote.acceptedAt || quote.createdAt || Date.now()).toLocaleDateString("fr-FR");

            const sigBoxWidth = 245;
            const sigBoxHeight = 54;
            const sigItemHeight = 72;

            const drawSig = (type, boxX, boxY) => {
                if (type === "company") {
                    doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold)
                       .text("Pour l'entreprise :", boxX, boxY);
                    
                    const bTop = boxY + 12;
                    doc.roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .fillAndStroke("#FAFAF8", "#FAFAF8");
                    doc.dash(2, { space: 2 })
                       .roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .strokeColor("#DDDDDD").stroke().undash();

                    if (companySignature) {
                        try {
                            doc.image(companySignature, boxX + 5, bTop + 4, { fit: [sigBoxWidth - 10, sigBoxHeight - 8], align: "center", valign: "center" });
                        } catch (e) {
                            doc.fillColor("#888").fontSize(8 * scale).font(fonts.italic)
                               .text(companyName, boxX, bTop + 20, { width: sigBoxWidth, align: "center" });
                        }
                    } else {
                        doc.fillColor("#888").fontSize(8 * scale).font(fonts.italic)
                           .text(companyName, boxX, bTop + 20, { width: sigBoxWidth, align: "center" });
                    }
                } else if (type === "client") {
                    doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold)
                       .text("Bon pour accord / Le Client :", boxX, boxY);

                    const bTop = boxY + 12;
                    const clientBg = isSigned ? "#F0FDF4" : "#FAFAF8";
                    const clientBorder = isSigned ? "#86EFAC" : "#DDDDDD";
                    doc.roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .fillAndStroke(clientBg, clientBg);
                    doc.dash(2, { space: 2 })
                       .roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .strokeColor(clientBorder).stroke().undash();

                    if (isSigned && clientSignature) {
                        try {
                            doc.image(clientSignature, boxX + 5, bTop + 4, { fit: [sigBoxWidth - 10, 30], align: "center" });
                        } catch (e) {}
                        doc.fillColor("#16A34A").fontSize(7.5 * scale).font(fonts.bold)
                           .text(`✓ Signé le ${signedDateStr}`, boxX, bTop + 36, { width: sigBoxWidth, align: "center" });
                    } else if (isSigned) {
                        doc.fillColor("#16A34A").fontSize(8 * scale).font(fonts.bold)
                           .text("✓ Signé électroniquement", boxX, bTop + 14, { width: sigBoxWidth, align: "center" });
                        doc.fillColor("#64748B").fontSize(7 * scale).font(fonts.regular)
                           .text(`le ${signedDateStr}`, boxX, bTop + 28, { width: sigBoxWidth, align: "center" });
                    } else {
                        doc.fillColor("#94A3B8").fontSize(8 * scale).font(fonts.italic)
                           .text("Mention \"Bon pour accord\"", boxX, bTop + 14, { width: sigBoxWidth, align: "center" });
                        doc.fillColor("#94A3B8").fontSize(7 * scale).font(fonts.regular)
                           .text("Date et signature", boxX, bTop + 28, { width: sigBoxWidth, align: "center" });
                    }
                }
            };

            leftSigs.forEach((type, index) => {
                drawSig(type, 40, sigTop + index * sigItemHeight);
            });

            rightSigs.forEach((type, index) => {
                drawSig(type, 310, sigTop + index * sigItemHeight);
            });

            const maxSigsCount = Math.max(leftSigs.length, rightSigs.length, 1);
            const sigsBottom = sigTop + maxSigsCount * sigItemHeight;

            // ==================== 5. LEGAL NOTICE & FOOTER ====================
            let footerY = 720;
            doc.moveTo(40, footerY - 8).lineTo(555, footerY - 8).strokeColor("#E2E8F0").lineWidth(0.75).stroke();

            if (showIban && bankIban) {
                doc.fillColor(textColor).fontSize(7.5 * scale).font(fonts.bold).text("Coordonnées bancaires (IBAN) : ", 40, footerY, { continued: true });
                doc.font(fonts.regular).text(`${bankIban}${bankBic ? `  •  BIC : ${bankBic}` : ''}`);
                footerY += 11;
            }

            if (showPaymentConditions) {
                doc.fillColor("#475569").fontSize(7 * scale).font(fonts.bold).text("Conditions de paiement : ", 40, footerY, { continued: true });
                doc.font(fonts.regular).text(`Paiement à 30 jours (Échéance le ${formattedDueDate}).`);
                footerY += 10;
            }

            doc.font(fonts.bold).text("Validité du devis : ", 40, footerY, { continued: true });
            doc.font(fonts.regular).text("30 jours à compter de la date d'émission (art. L. 221-5 et L. 111-1 C.conso). Devis gratuit avant exécution des travaux (art. L. 111-3 C.conso).");
            footerY += 10;

            doc.font(fonts.bold).text("Conditions d'exécution : ", 40, footerY, { continued: true });
            doc.font(fonts.regular).text("Les travaux débuteront après signature du devis accompagné d'un acompte.");
            footerY += 10;

            if (showAgaMention) {
                doc.fillColor("#64748B").fontSize(6.5 * scale).font(fonts.italic).text("Membre d'une association agréée, le règlement par chèque est accepté.", 40, footerY);
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Generate Invoice (Facture) PDF Buffer matching all 4 custom templates
 */
export function generateInvoicePdfBuffer({ invoice, company, customization = {} }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 40,
                autoFirstPage: true,
                info: {
                    Title: `Facture ${invoice.number || ''}`,
                    Author: company?.name || "GestArt CRM",
                    Subject: "Facture officielle"
                }
            });

            const buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Settings & Customization
            const structure = customization.structure || "classic";
            const primaryColor = customization.primaryColor || company?.settings?.primaryColor || "#556B2F";
            const bgColor = customization.bgColor || "#FFFFFF";
            const textColor = customization.textColor || "#1A1A1A";
            const fonts = getFontNames(customization.fontFamily);
            const scale = getFontSizeScale(customization.fontSize);
            const clientBoxPosition = customization.clientBoxPosition || "bottom";

            const showLogo = customization.showLogo !== false;
            const logoPosition = customization.logoPosition || "left";
            const logoSize = Math.max(25, Math.min(75, Number(customization.logoSize || 45)));

            const showAddress = customization.showAddress !== false;
            const showSiret = customization.showSiret !== false;
            const showPhone = customization.showPhone !== false;
            const showEmail = customization.showEmail !== false;
            const showDeliveryDate = customization.showDeliveryDate !== false;
            const showPaymentConditions = customization.showPaymentConditions !== false;
            const showIban = customization.showIban !== false;
            const showAgaMention = customization.showAgaMention === true;
            const showCompanySignature = customization.showCompanySignature !== false;
            const showClientSignature = customization.showClientSignature === true; // Default OFF for factures

            const companyName = company?.name || "Mon Entreprise";
            const clientName = invoice.client 
                ? `${invoice.client.firstName || ''} ${invoice.client.lastName || invoice.client.companyName || ''}`.trim() 
                : (invoice.clientName || "Client");
            
            const rawDate = invoice.issuedAt || invoice.date || invoice.createdAt || new Date();
            const formattedDate = new Date(rawDate).toLocaleDateString("fr-FR");
            const rawDueDate = invoice.dueAt || invoice.dueDate || new Date(Date.now() + 30 * 86400000);
const formattedDueDate = new Date(rawDueDate).toLocaleDateString("fr-FR");

            const companyLogo = showLogo ? getImageBuffer(customization.logoUrl || company?.logoUrl || company?.settings?.logoUrl) : null;
            const companySignature = getImageBuffer(customization.signatureUrl || company?.signatureUrl || company?.signature || company?.settings?.signatureUrl);
            const bankIban = company?.settings?.bankIban || company?.bankIban || customization?.bankIban || "";
            const bankBic = company?.settings?.bankBic || company?.bankBic || customization?.bankBic || "";
            const companyDisplayAddress = company?.address 
                ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}`.trim()
                : "";
            const companyDisplaySiret = company?.siret || "";
            const companyDisplayTva = company?.tvaNumber || company?.vatNumber || (company?.siren ? `FR ${company.siren}` : (company?.siret ? `FR${(12 + 3 * (parseInt(company.siret.substring(0, 9), 10) % 97)) % 97}${company.siret.substring(0, 9)}` : ""));
            const companyDisplayPhone = company?.phone || "";
            const companyDisplayEmail = company?.email || "";

            const clientAddress = invoice.client?.address || invoice.clientAddress || (invoice.client?.city ? `${invoice.client.postalCode || ''} ${invoice.client.city}`.trim() : "");
            const clientEmail = invoice.client?.email || invoice.clientEmail || "";
            const clientPhone = invoice.client?.phone || invoice.clientPhone || "";

            // Page Background Color
            if (bgColor && bgColor !== "#FFFFFF") {
                doc.rect(0, 0, 595.28, 841.89).fill(bgColor);
            }

            let curY = 40;

            // ==================== 1. STRUCTURE HEADERS ====================
            if (structure === "banner") {
                const bannerHeight = 56;
                doc.rect(0, 0, 595.28, bannerHeight).fill(primaryColor);

                let bannerLogoWidth = 0;
                if (companyLogo) {
                    try {
                        const imgFitHeight = Math.min(38, logoSize * 0.85);
                        doc.image(companyLogo, 40, (bannerHeight - imgFitHeight) / 2, { fit: [100, imgFitHeight] });
                        bannerLogoWidth = 85;
                    } catch (e) {}
                }

                const compNameX = 40 + (bannerLogoWidth ? bannerLogoWidth + 12 : 0);
                doc.fillColor("#FFFFFF")
                   .fontSize(13.5 * scale)
                   .font(fonts.bold)
                   .text(companyName, compNameX, 21);

                doc.fillColor("#FFFFFF")
                   .fontSize(18 * scale)
                   .font(fonts.bold)
                   .text("FACTURE", 340, 18, { width: 215, align: "right" });

                // Sub metadata strip below banner
                const metaTop = 66;
                doc.roundedRect(40, metaTop, 515, 20, 3).fill("#F4F4F2");
                doc.fillColor("#4A4A4A")
                   .fontSize(8.5 * scale)
                   .font(fonts.bold)
                   .text(`Numéro : ${invoice.number || ''}`, 52, metaTop + 6);
                doc.text(`Date : ${formattedDate}`, 240, metaTop + 6);
                if (showDeliveryDate) {
                    doc.text(`Échéance : ${formattedDueDate}`, 410, metaTop + 6);
                }

                curY = metaTop + 30;

                if (clientBoxPosition === "right") {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftCompY); leftCompY += 12; }
                    if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}${companyDisplayTva ? ` — N° TVA : ${companyDisplayTva}` : ''}`, 40, leftCompY); leftCompY += 12; }
                    if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftCompY); leftCompY += 12; }
                    if (showEmail && companyDisplayEmail) { doc.text(`Email : ${companyDisplayEmail}`, 40, leftCompY); leftCompY += 12; }

                    // Client Box (Right) - Neutral grey label matching web preview
                    const cBoxHeight = 68;
                    doc.roundedRect(300, curY, 255, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#EAEAE6");
                    let rY = curY + 8;
                    doc.fillColor("#6B7280").fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 310, rY);
                    rY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 310, rY);
                    rY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 310, rY); rY += 10; }
                    if (clientEmail) { doc.text(clientEmail, 310, rY); rY += 10; }
                    if (clientPhone) { doc.text(`Tél : ${clientPhone}`, 310, rY); }

                    curY = Math.max(leftCompY, curY + cBoxHeight) + 14;
                } else {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftCompY); leftCompY += 12; }
                    if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}${companyDisplayTva ? ` — N° TVA : ${companyDisplayTva}` : ''}`, 40, leftCompY); leftCompY += 12; }
                    if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftCompY); leftCompY += 12; }
                    if (showEmail && companyDisplayEmail) { doc.text(`Email : ${companyDisplayEmail}`, 40, leftCompY); leftCompY += 12; }

                    curY = leftCompY + 6;
                    // Client Box Full Width (Bottom)
                    doc.roundedRect(40, curY, 515, 58, 4).fillAndStroke("#FAFAF8", "#EAEAE6");
                    let bY = curY + 8;
                    doc.fillColor("#6B7280").fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 50, bY);
                    bY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 50, bY);
                    bY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 50, bY); bY += 10; }
                    if (clientEmail || clientPhone) { doc.text(`${clientEmail}${clientEmail && clientPhone ? '  •  ' : ''}${clientPhone ? `Tél : ${clientPhone}` : ''}`, 50, bY); }

                    curY += 68;
                }

            } else if (structure === "modern") {
                // Modern structure: Match Image 3 (InvoicePdfView)
                let leftY = 40;
                if (companyLogo) {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [110, Math.min(42, logoSize)] });
                        leftY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(14 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 18;

                // Right Capsule Badge + Meta
                let rightY = 40;
                const badgeText = `FACTURE N° ${invoice.number || ''}`;
                const badgeWidth = 195;
                const badgeX = 555 - badgeWidth;
                doc.roundedRect(badgeX, rightY, badgeWidth, 22, 11).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(10 * scale).font(fonts.bold).text(badgeText, badgeX, rightY + 5.5, { width: badgeWidth, align: "center" });
                rightY += 28;

                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular).text(`Date : ${formattedDate}${showDeliveryDate ? `  •  Échéance : ${formattedDueDate}` : ''}`, 300, rightY, { width: 255, align: "right" });
                rightY += 14;

                const boxTop = Math.max(leftY, rightY) + 8;

                if (clientBoxPosition === "right") {
                    const cBoxHeight = 68;
                    // Left Card: Émetteur
                    doc.roundedRect(40, boxTop, 245, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    doc.rect(40, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let emY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("ÉMETTEUR", 48, emY);
                    emY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(companyName, 48, emY);
                    emY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 48, emY); emY += 10; }
                    if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}`, 48, emY); emY += 10; }
                    if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 48, emY); }

                    // Right Card: FACTURÉ À :
                    doc.roundedRect(300, boxTop, 255, cBoxHeight, 4).fillAndStroke("#F8FAFC", "#E2E8F0");
                    doc.rect(300, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let clY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 310, clY);
                    clY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 310, clY);
                    clY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 310, clY); clY += 10; }
                    if (clientPhone) { doc.text(`Tél : ${clientPhone}`, 310, clY); }

                    curY = boxTop + cBoxHeight + 12;
                } else {
                    const cBoxHeight = 52;
                    // Top Card: Émetteur
                    doc.roundedRect(40, boxTop, 515, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    doc.rect(40, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let emY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("ÉMETTEUR", 48, emY);
                    emY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(companyName, 48, emY);
                    emY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 48, emY); }

                    const bottomBoxTop = boxTop + cBoxHeight + 8;
                    // Bottom Card: FACTURÉ À :
                    doc.roundedRect(40, bottomBoxTop, 515, cBoxHeight, 4).fillAndStroke("#F8FAFC", "#E2E8F0");
                    doc.rect(40, bottomBoxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let clY = bottomBoxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 48, clY);
                    clY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 48, clY);
                    clY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 48, clY); }

                    curY = bottomBoxTop + cBoxHeight + 12;
                }

            } else if (structure === "minimal") {
                let leftY = 40;
                if (companyLogo) {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [95, 36] });
                        leftY += 40;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(13.5 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 15;
                doc.fillColor("#4A4A4A").fontSize(8.5 * scale).font(fonts.regular);
                if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftY); leftY += 10; }
                if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}`, 40, leftY); leftY += 10; }
                if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftY); leftY += 10; }

                let rightY = 40;
                doc.fillColor(primaryColor).fontSize(20 * scale).font(fonts.bold).text("FACTURE", 340, rightY, { width: 215, align: "right" });
                rightY += 24;
                doc.fillColor("#4A4A4A").fontSize(8.5 * scale).font(fonts.regular).text(`N° ${invoice.number || ''} • ${formattedDate}`, 340, rightY, { width: 215, align: "right" });
                rightY += 14;
                if (showDeliveryDate) {
                    doc.text(`Échéance : ${formattedDueDate}`, 340, rightY, { width: 215, align: "right" });
                    rightY += 12;
                }

                const sepY = Math.max(leftY, rightY) + 8;
                doc.moveTo(40, sepY).lineTo(555, sepY).strokeColor("#EAEAE6").lineWidth(1).stroke();

                if (clientBoxPosition === "right") {
                    let cY = sepY + 8;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 310, cY);
                    cY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 310, cY);
                    cY += 12;
                    doc.fillColor("#4A4A4A").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 310, cY); cY += 10; }
                    if (clientPhone) { doc.text(`Tél : ${clientPhone}`, 310, cY); }
                    curY = cY + 12;
                } else {
                    let cY = sepY + 8;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 40, cY);
                    cY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 40, cY);
                    cY += 12;
                    doc.fillColor("#4A4A4A").fontSize(8 * scale).font(fonts.regular);
                    if (clientAddress) { doc.text(clientAddress, 40, cY); cY += 10; }
                    curY = cY + 12;
                }

            } else {
                // Classic structure - Exactly matches InvoicePdfView.jsx
                let leftY = 40;
                if (companyLogo && logoPosition === "left") {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [110, Math.min(45, logoSize)] });
                        leftY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(13.5 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 16;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (showAddress && companyDisplayAddress) { doc.text(companyDisplayAddress, 40, leftY); leftY += 11; }
                if (showSiret && companyDisplaySiret) { doc.text(`SIRET : ${companyDisplaySiret}${companyDisplayTva ? ` — N° TVA : ${companyDisplayTva}` : ''}`, 40, leftY); leftY += 11; }
                if (showPhone && companyDisplayPhone) { doc.text(`Tél : ${companyDisplayPhone}`, 40, leftY); leftY += 11; }
                if (showEmail && companyDisplayEmail) { doc.text(`Email : ${companyDisplayEmail}`, 40, leftY); leftY += 11; }

                let rightY = 40;
                if (companyLogo && logoPosition === "right") {
                    try {
                        doc.image(companyLogo, 440, rightY, { fit: [115, Math.min(45, logoSize)], align: "right" });
                        rightY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(22 * scale).font(fonts.bold).text("FACTURE", 315, rightY, { width: 240, align: "right" });
                rightY += 26;

                // Meta Table matching doc-meta-table
                doc.fillColor("#475569").fontSize(9 * scale);
                doc.font(fonts.bold).text("Numéro : ", 340, rightY, { width: 90, align: "right" });
                doc.font(fonts.regular).fillColor(textColor).text(invoice.number || '', 435, rightY, { width: 120, align: "left" });
                rightY += 13;

                doc.fillColor("#475569").font(fonts.bold).text("Date : ", 340, rightY, { width: 90, align: "right" });
                doc.font(fonts.regular).fillColor(textColor).text(formattedDate, 435, rightY, { width: 120, align: "left" });
                rightY += 13;

                if (showDeliveryDate) {
                    doc.fillColor("#475569").font(fonts.bold).text("Échéance : ", 340, rightY, { width: 90, align: "right" });
                    doc.font(fonts.regular).fillColor(textColor).text(formattedDueDate, 435, rightY, { width: 120, align: "left" });
                    rightY += 13;
                }

                const boxTop = Math.max(leftY, rightY) + 10;
                const cBoxWidth = clientBoxPosition === "right" ? 255 : 515;
                const cBoxLeft = clientBoxPosition === "right" ? 300 : 40;
                
                let clientLinesCount = 2;
                if (clientAddress) clientLinesCount++;
                if (clientEmail) clientLinesCount++;
                if (clientPhone) clientLinesCount++;
                const cBoxHeight = Math.max(58, 16 + clientLinesCount * 12);

                doc.roundedRect(cBoxLeft, boxTop, cBoxWidth, cBoxHeight, 6).fillAndStroke("#FAFAF8", "#EAEAE6");
                let cY = boxTop + 8;
                doc.fillColor("#6B7280").fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", cBoxLeft + 12, cY);
                cY += 12;
                doc.fillColor(textColor).fontSize(10.5 * scale).font(fonts.bold).text(clientName, cBoxLeft + 12, cY);
                cY += 14;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (clientAddress) { doc.text(clientAddress, cBoxLeft + 12, cY); cY += 11; }
                if (clientEmail) { doc.text(clientEmail, cBoxLeft + 12, cY); cY += 11; }
                if (clientPhone) { doc.text(`Tél : ${clientPhone}`, cBoxLeft + 12, cY); }

                curY = boxTop + cBoxHeight + 14;
            }

            // ==================== 2. TABLE OF ITEMS ====================
            const tableTop = curY;
            if (structure === "minimal") {
                doc.moveTo(40, tableTop).lineTo(555, tableTop).strokeColor("#0F172A").lineWidth(1).stroke();
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold);
            } else {
                doc.roundedRect(40, tableTop, 515, 20, 3).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(8.5 * scale).font(fonts.bold);
            }

            const headerTextY = tableTop + 5.5;
            doc.text("Description", 48, headerTextY, { width: 240 });
            doc.text("Qté", 295, headerTextY, { width: 45, align: "center" });
            doc.text("Prix unit. HT", 345, headerTextY, { width: 95, align: "right" });
            doc.text("Total HT", 445, headerTextY, { width: 100, align: "right" });


            const lines = (invoice.lines && invoice.lines.length > 0) 
                ? invoice.lines 
                : [{ description: invoice.interventionType || invoice.subject || "Prestation", quantity: 1, unitPrice: invoice.amountHT || invoice.totalHt || 0, total: invoice.amountHT || invoice.totalHt || 0 }];
            
            let rowY = tableTop + 20;
            const rowHeight = 20;

            lines.forEach((l, idx) => {
                const isEven = idx % 2 === 0;
                if (isEven && structure !== "minimal") {
                    doc.rect(40, rowY, 515, rowHeight).fill("#FAFAF8");
                }

                // Columns match header: Desc x=48 w=240 | Qté x=295 w=45 | Prix x=345 w=95 | Total x=445 w=100
                doc.fillColor(textColor)
                   .fontSize(8.5 * scale)
                   .font(fonts.regular)
                   .text(l.description || "Prestation", 48, rowY + 5, { width: 240, lineBreak: false });

                doc.fillColor("#334155")
                   .text(String(l.quantity || l.qty || 1), 295, rowY + 5, { width: 45, align: "center" });

                const unitPrice = Number(l.unitPrice || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.text(`${unitPrice} €`, 345, rowY + 5, { width: 95, align: "right" });

                const lineTotal = Number(l.total || (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1))).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.font(fonts.bold)
                   .fillColor(textColor)
                   .text(`${lineTotal} €`, 445, rowY + 5, { width: 100, align: "right" });

                rowY += rowHeight;
                doc.moveTo(40, rowY).lineTo(555, rowY).strokeColor("#EAEAE6").lineWidth(0.5).stroke();
            });

            // ==================== 3. SUMMARY TOTALS ====================
            // Match web: justify-content flex-end, table rows padding 4px 8px, total row padding 6px 8px
            const summaryTop = rowY + 12;
            const computedHt = lines.reduce((acc, l) => acc + (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1)), 0);
            const totalHtNum = invoice.amountHT !== undefined && invoice.amountHT !== null ? Number(invoice.amountHT) : (invoice.totalHt !== undefined ? Number(invoice.totalHt) : computedHt);
            const totalTtcNum = invoice.amountTTC !== undefined && invoice.amountTTC !== null ? Number(invoice.amountTTC) : (invoice.totalTtc !== undefined ? Number(invoice.totalTtc) : totalHtNum);
            const tvaRate = invoice.tvaRate !== undefined && invoice.tvaRate !== null ? invoice.tvaRate : (lines[0]?.tvaRate || 20);
            const tvaAmountNum = Math.max(0, totalTtcNum - totalHtNum);

            const totalHtFormatted = `${totalHtNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
            const tvaFormatted = `${tvaAmountNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
            const totalTtcFormatted = `${totalTtcNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

            const sumLeft = 340;
            const sumWidth = 215;
            const sumRowH = 20;

            // Row 1: Sous-total HT
            doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular)
               .text("Sous-total HT :", sumLeft + 8, summaryTop + 4);
            doc.fillColor(textColor).font(fonts.bold)
               .text(totalHtFormatted, sumLeft, summaryTop + 4, { width: sumWidth - 8, align: "right" });

            // Row 2: TVA
            doc.fillColor("#475569").font(fonts.regular)
               .text(`TVA (${tvaRate}%) :`, sumLeft + 8, summaryTop + sumRowH + 4);
            doc.fillColor(textColor).font(fonts.bold)
               .text(tvaFormatted, sumLeft, summaryTop + sumRowH + 4, { width: sumWidth - 8, align: "right" });

            // Row 3: TOTAL TTC box
            const totalBoxTop = summaryTop + sumRowH * 2 + 4;
            if (structure === "minimal") {
                doc.rect(sumLeft, totalBoxTop, sumWidth, 26).fill("#0F172A");
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            } else {
                doc.roundedRect(sumLeft, totalBoxTop, sumWidth, 26, 4).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            }
            doc.text("TOTAL TTC :", sumLeft + 8, totalBoxTop + 7);
            doc.text(totalTtcFormatted, sumLeft + 8, totalBoxTop + 7, { width: sumWidth - 16, align: "right" });

            // ==================== 4. SIGNATURES (Facture) ====================
            const compPos = customization.signaturePosition || "left";
            const clPos = customization.clientSignaturePosition || "right";

            const leftSigs = [];
            const rightSigs = [];

            if (showCompanySignature) {
                if (compPos === "left") leftSigs.push("company");
                else rightSigs.push("company");
            }

            if (showClientSignature) {
                if (clPos === "left") leftSigs.push("client");
                else rightSigs.push("client");
            }

            const sigSepY = totalBoxTop + 36;
            doc.moveTo(40, sigSepY).lineTo(555, sigSepY).dash(3, { space: 3 }).strokeColor("#E0E0E0").lineWidth(0.75).stroke().undash();
            const sigTop = sigSepY + 12;

            const sigBoxWidth = 245;
            const sigBoxHeight = 54;
            const sigItemHeight = 72;

            const drawInvoiceSig = (type, boxX, boxY) => {
                if (type === "company") {
                    doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold)
                       .text("Pour l'entreprise :", boxX, boxY);
                    const bTop = boxY + 12;
                    doc.roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .fillAndStroke("#FAFAF8", "#FAFAF8");
                    doc.dash(2, { space: 2 })
                       .roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .strokeColor("#DDDDDD").stroke().undash();

                    if (companySignature) {
                        try {
                            doc.image(companySignature, boxX + 5, bTop + 4, { fit: [sigBoxWidth - 10, sigBoxHeight - 8], align: "center", valign: "center" });
                        } catch (e) {
                            doc.fillColor("#888").fontSize(8 * scale).font(fonts.italic)
                               .text(companyName, boxX, bTop + 20, { width: sigBoxWidth, align: "center" });
                        }
                    } else {
                        doc.fillColor("#888").fontSize(8 * scale).font(fonts.italic)
                           .text(companyName, boxX, bTop + 20, { width: sigBoxWidth, align: "center" });
                    }
                } else if (type === "client") {
                    doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold)
                       .text("Bon pour accord / Le Client :", boxX, boxY);
                    const bTop = boxY + 12;
                    doc.roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .fillAndStroke("#FAFAF8", "#FAFAF8");
                    doc.dash(2, { space: 2 })
                       .roundedRect(boxX, bTop, sigBoxWidth, sigBoxHeight, 5)
                       .strokeColor("#DDDDDD").stroke().undash();
                    doc.fillColor("#94A3B8").fontSize(8 * scale).font(fonts.italic)
                       .text("Cadre signature client", boxX, bTop + 20, { width: sigBoxWidth, align: "center" });
                }
            };

            leftSigs.forEach((type, index) => {
                drawInvoiceSig(type, 40, sigTop + index * sigItemHeight);
            });

            rightSigs.forEach((type, index) => {
                drawInvoiceSig(type, 310, sigTop + index * sigItemHeight);
            });

            const maxSigsCount = Math.max(leftSigs.length, rightSigs.length, 1);
            const sigsBottom = sigTop + maxSigsCount * sigItemHeight;

            // ==================== 5. LEGAL NOTICE & FOOTER ====================
            let footerY = 720;
            doc.moveTo(40, footerY - 8).lineTo(555, footerY - 8).strokeColor("#E2E8F0").lineWidth(0.75).stroke();

            if (showIban && bankIban) {
                doc.fillColor(textColor).fontSize(7.5 * scale).font(fonts.bold).text("Coordonnées bancaires (IBAN) : ", 40, footerY, { continued: true });
                doc.font(fonts.regular).text(`${bankIban}${bankBic ? `  •  BIC : ${bankBic}` : ''}`);
                footerY += 11;
            }

            if (showPaymentConditions) {
                doc.fillColor("#475569").fontSize(7 * scale).font(fonts.bold).text("Conditions de règlement : ", 40, footerY, { continued: true });
                doc.font(fonts.regular).text(`Paiement exigible à réception / échéance le ${formattedDueDate}.`);
                footerY += 10;
            }

            doc.font(fonts.bold).text("Pénalités de retard : ", 40, footerY, { continued: true });
            doc.font(fonts.regular).text("Taux annuel de 10% (art. L. 441-10 C.com). Indemnité forfaitaire légale pour frais de recouvrement en cas de retard : 40 €.");
            footerY += 10;

            doc.font(fonts.bold).text("Escompte : ", 40, footerY, { continued: true });
            doc.font(fonts.regular).text("Aucun escompte accordé pour paiement anticipé.");
            footerY += 10;

            if (showAgaMention) {
                doc.fillColor("#64748B").fontSize(6.5 * scale).font(fonts.italic).text("Membre d'une association agréée, le règlement par chèque est accepté.", 40, footerY);
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}
