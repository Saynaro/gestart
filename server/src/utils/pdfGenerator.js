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
    if (fontFamily && fontFamily.includes("Georgia")) {
        return { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic" };
    }
    if (fontFamily && fontFamily.includes("Space Grotesk")) {
        return { regular: "Courier", bold: "Courier-Bold", italic: "Courier-Oblique" };
    }
    return { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
}

function getFontSizeScale(fontSize) {
    if (fontSize === "8pt") return 0.9;
    if (fontSize === "10pt") return 1.1;
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

            // Page Background Color
            if (bgColor && bgColor !== "#FFFFFF") {
                doc.rect(0, 0, 595.28, 841.89).fill(bgColor);
            }

            let curY = 40;

            // ==================== 1. STRUCTURE HEADERS ====================
            if (structure === "banner") {
                // Banner Box (matching previsualiser)
                const bannerTop = 40;
                const bannerHeight = 44;
                doc.roundedRect(40, bannerTop, 515, bannerHeight, 3).fill(primaryColor);

                let bannerLogoWidth = 0;
                if (companyLogo) {
                    try {
                        const imgFitHeight = Math.min(32, logoSize * 0.75);
                        doc.image(companyLogo, 50, bannerTop + (bannerHeight - imgFitHeight) / 2, { fit: [90, imgFitHeight] });
                        bannerLogoWidth = 85;
                    } catch (e) {}
                }

                const compNameX = 50 + (bannerLogoWidth ? bannerLogoWidth + 10 : 0);
                doc.fillColor("#FFFFFF")
                   .fontSize(13 * scale)
                   .font(fonts.bold)
                   .text(companyName, compNameX, bannerTop + 14);

                doc.fillColor("#FFFFFF")
                   .fontSize(18 * scale)
                   .font(fonts.bold)
                   .text("DEVIS", 340, bannerTop + 12, { width: 200, align: "right" });

                // Sub metadata strip right below banner
                const metaTop = bannerTop + bannerHeight + 6;
                doc.roundedRect(40, metaTop, 515, 18, 3).fill("#F4F4F2");
                doc.fillColor("#4A4A4A")
                   .fontSize(8 * scale)
                   .font(fonts.bold)
                   .text(`Numéro : ${quote.number || ''}`, 50, metaTop + 5);
                doc.text(`Date : ${formattedDate}`, 240, metaTop + 5);
                if (showDeliveryDate) {
                    doc.text(`Validité : ${formattedDueDate}`, 410, metaTop + 5);
                }

                curY = metaTop + 24;


                // Company + Client Details
                if (clientBoxPosition === "right") {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && company?.address) { doc.text(company.address, 40, leftCompY); leftCompY += 11; }
                    if (showAddress && (company?.postalCode || company?.city)) { doc.text(`${company.postalCode || ''} ${company.city || ''}`.trim(), 40, leftCompY); leftCompY += 11; }
                    if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftCompY); leftCompY += 11; }
                    if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftCompY); leftCompY += 11; }
                    if (showEmail && company?.email) { doc.text(`Email : ${company.email}`, 40, leftCompY); leftCompY += 11; }

                    // Client Box (Right)
                    const cBoxHeight = 65;
                    doc.roundedRect(300, curY, 255, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    let rY = curY + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 310, rY);
                    rY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 310, rY);
                    rY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (quote.client?.address) { doc.text(quote.client.address, 310, rY); rY += 10; }
                    if (quote.client?.phone) { doc.text(`Tél : ${quote.client.phone}`, 310, rY); rY += 10; }

                    curY = Math.max(leftCompY, curY + cBoxHeight) + 12;
                } else {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && company?.address) { doc.text(company.address, 40, leftCompY); leftCompY += 11; }
                    if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftCompY); leftCompY += 11; }
                    if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftCompY); leftCompY += 11; }

                    curY = leftCompY + 6;
                    // Client Box Full Width (Bottom)
                    doc.roundedRect(40, curY, 515, 52, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    let bY = curY + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 50, bY);
                    bY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 50, bY);
                    bY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (quote.client?.address) { doc.text(quote.client.address, 50, bY); }

                    curY += 60;
                }

            } else if (structure === "modern") {
                // Modern structure: Match Image 3 (QuotePdfView)
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
                    // Left Card: Émetteur
                    doc.roundedRect(40, boxTop, 245, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    doc.rect(40, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let emY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("ÉMETTEUR", 48, emY);
                    emY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(companyName, 48, emY);
                    emY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (showAddress && company?.address) { doc.text(company.address, 48, emY); emY += 10; }
                    if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 48, emY); emY += 10; }
                    if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 48, emY); }

                    // Right Card: DEVIS POUR :
                    doc.roundedRect(300, boxTop, 255, cBoxHeight, 4).fillAndStroke("#F8FAFC", "#E2E8F0");
                    doc.rect(300, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let clY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 310, clY);
                    clY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 310, clY);
                    clY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (quote.client?.address) { doc.text(quote.client.address, 310, clY); clY += 10; }
                    if (quote.client?.phone) { doc.text(`Tél : ${quote.client.phone}`, 310, clY); }

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
                    if (showAddress && company?.address) { doc.text(company.address, 48, emY); }

                    const bottomBoxTop = boxTop + cBoxHeight + 8;
                    // Bottom Card: DEVIS POUR :
                    doc.roundedRect(40, bottomBoxTop, 515, cBoxHeight, 4).fillAndStroke("#F8FAFC", "#E2E8F0");
                    doc.rect(40, bottomBoxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let clY = bottomBoxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", 48, clY);
                    clY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 48, clY);
                    clY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (quote.client?.address) { doc.text(quote.client.address, 48, clY); }

                    curY = bottomBoxTop + cBoxHeight + 12;
                }


            } else if (structure === "minimal") {
                // Minimalist: Clean, monochrome/subtle accents, no bulky cards
                let leftY = 40;
                if (companyLogo) {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [95, 36] });
                        leftY += 40;
                    } catch (e) {}
                }

                doc.fillColor(textColor).fontSize(13 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 15;
                doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular);
                if (showAddress && company?.address) { doc.text(company.address, 40, leftY); leftY += 10; }
                if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftY); leftY += 10; }
                if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftY); leftY += 10; }

                let rightY = 40;
                doc.fillColor(textColor).fontSize(18 * scale).font(fonts.bold).text("DEVIS", 340, rightY, { width: 215, align: "right" });
                rightY += 22;
                doc.fillColor("#64748B").fontSize(8.5 * scale).font(fonts.regular).text(`N° ${quote.number || ''}`, 340, rightY, { width: 215, align: "right" });
                rightY += 12;
                doc.text(`Date : ${formattedDate}`, 340, rightY, { width: 215, align: "right" });
                rightY += 12;
                if (showDeliveryDate) {
                    doc.text(`Validité : ${formattedDueDate}`, 340, rightY, { width: 215, align: "right" });
                    rightY += 12;
                }

                const sepY = Math.max(leftY, rightY) + 8;
                doc.moveTo(40, sepY).lineTo(555, sepY).strokeColor("#E2E8F0").lineWidth(0.75).stroke();

                let cY = sepY + 8;
                doc.fillColor("#94A3B8").fontSize(7.5 * scale).font(fonts.bold).text("DESTINATAIRE", 40, cY);
                cY += 11;
                doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 40, cY);
                cY += 12;
                doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular);
                if (quote.client?.address) { doc.text(quote.client.address, 40, cY); cY += 10; }

                curY = cY + 8;

            } else {
                // Classic structure (Default)
                let leftY = 40;
                if (companyLogo && logoPosition === "left") {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [110, Math.min(45, logoSize)] });
                        leftY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(14 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 16;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (showAddress && company?.address) { doc.text(company.address, 40, leftY); leftY += 11; }
                if (showAddress && (company?.postalCode || company?.city)) { doc.text(`${company.postalCode || ''} ${company.city || ''}`.trim(), 40, leftY); leftY += 11; }
                if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftY); leftY += 11; }
                if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftY); leftY += 11; }
                if (showEmail && company?.email) { doc.text(`Email : ${company.email}`, 40, leftY); leftY += 11; }

                let rightY = 40;
                if (companyLogo && logoPosition === "right") {
                    try {
                        doc.image(companyLogo, 440, rightY, { fit: [115, Math.min(45, logoSize)], align: "right" });
                        rightY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(22 * scale).font(fonts.bold).text("DEVIS", 315, rightY, { width: 240, align: "right" });
                rightY += 26;
                doc.fillColor(textColor).fontSize(9 * scale).font(fonts.bold).text(`Numéro :  ${quote.number || ''}`, 315, rightY, { width: 240, align: "right" });
                rightY += 13;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular).text(`Date :  ${formattedDate}`, 315, rightY, { width: 240, align: "right" });
                rightY += 13;
                if (showDeliveryDate) {
                    doc.text(`Validité :  ${formattedDueDate}`, 315, rightY, { width: 240, align: "right" });
                    rightY += 13;
                }

                const boxTop = Math.max(leftY, rightY) + 10;
                const cBoxWidth = clientBoxPosition === "right" ? 255 : 515;
                const cBoxLeft = clientBoxPosition === "right" ? 300 : 40;
                const cBoxHeight = 56;

                doc.roundedRect(cBoxLeft, boxTop, cBoxWidth, cBoxHeight, 5).fillAndStroke("#FAFAF8", "#EAEAE6");
                let cY = boxTop + 7;
                doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("DEVIS POUR :", cBoxLeft + 10, cY);
                cY += 11;
                doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, cBoxLeft + 10, cY);
                cY += 13;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (quote.client?.address) { doc.text(quote.client.address, cBoxLeft + 10, cY); cY += 10; }
                if (quote.client?.phone) { doc.text(`Tél : ${quote.client.phone}`, cBoxLeft + 10, cY); }

                curY = boxTop + cBoxHeight + 12;
            }

            // ==================== 2. TABLE OF ITEMS ====================
            const tableTop = curY;
            if (structure === "minimal") {
                doc.moveTo(40, tableTop).lineTo(555, tableTop).strokeColor("#0F172A").lineWidth(1).stroke();
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold);
            } else {
                doc.rect(40, tableTop, 515, 20).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(8.5 * scale).font(fonts.bold);
            }

            const headerTextY = tableTop + 5;
            doc.text("Description", 50, headerTextY, { width: 250 });
            doc.text("Qté", 310, headerTextY, { width: 45, align: "center" });
            doc.text("Unit. HT", 365, headerTextY, { width: 85, align: "right" });
            doc.text("Total HT", 460, headerTextY, { width: 85, align: "right" });

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

                doc.fillColor(textColor)
                   .fontSize(8.5 * scale)
                   .font(fonts.bold)
                   .text(l.description || "Prestation", 50, rowY + 5, { width: 250, lineBreak: false });

                doc.font(fonts.regular)
                   .fillColor("#334155")
                   .text(String(l.quantity || l.qty || 1), 310, rowY + 5, { width: 45, align: "center" });

                const unitPrice = Number(l.unitPrice || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.text(`${unitPrice} €`, 365, rowY + 5, { width: 85, align: "right" });

                const lineTotal = Number(l.total || (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1))).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.font(fonts.bold)
                   .fillColor(textColor)
                   .text(`${lineTotal} €`, 460, rowY + 5, { width: 85, align: "right" });

                rowY += rowHeight;
                doc.moveTo(40, rowY).lineTo(555, rowY).strokeColor("#EAEAE6").lineWidth(0.5).stroke();
            });

            // ==================== 3. SUMMARY TOTALS ====================
            const summaryTop = rowY + 8;
            const computedHt = lines.reduce((acc, l) => acc + (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1)), 0);
            const totalHtNum = quote.amountHT !== undefined && quote.amountHT !== null ? Number(quote.amountHT) : (quote.totalHt !== undefined ? Number(quote.totalHt) : computedHt);
            const totalTtcNum = quote.amountTTC !== undefined && quote.amountTTC !== null ? Number(quote.amountTTC) : (quote.totalTtc !== undefined ? Number(quote.totalTtc) : totalHtNum);
            const tvaRate = quote.tvaRate !== undefined && quote.tvaRate !== null ? quote.tvaRate : (lines[0]?.tvaRate || 20);
            const tvaAmountNum = Math.max(0, totalTtcNum - totalHtNum);

            const totalHtFormatted = `${totalHtNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
            const tvaFormatted = `${tvaAmountNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
            const totalTtcFormatted = `${totalTtcNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

            const sumLeft = 340;
            const sumWidth = 215;

            doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular).text("Sous-total HT :", sumLeft, summaryTop);
            doc.fillColor(textColor).font(fonts.bold).text(totalHtFormatted, sumLeft, summaryTop, { width: sumWidth, align: "right" });

            doc.fillColor("#475569").font(fonts.regular).text(`TVA (${tvaRate}%) :`, sumLeft, summaryTop + 14);
            doc.fillColor(textColor).font(fonts.bold).text(tvaFormatted, sumLeft, summaryTop + 14, { width: sumWidth, align: "right" });

            const totalBoxTop = summaryTop + 30;
            if (structure === "minimal") {
                doc.rect(sumLeft, totalBoxTop, sumWidth, 24).fill("#0F172A");
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            } else {
                doc.roundedRect(sumLeft, totalBoxTop, sumWidth, 24, 4).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            }
            doc.text("TOTAL TTC :", sumLeft + 10, totalBoxTop + 7);
            doc.text(totalTtcFormatted, sumLeft + 10, totalBoxTop + 7, { width: sumWidth - 20, align: "right" });

            // ==================== 4. SIGNATURES ====================
            const sigTop = totalBoxTop + 34;
            const isSigned = Boolean(quote.status === "ACCEPTED" || quote.signedAt || quote.signatureUrl);

            if (showCompanySignature) {
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold).text("Pour l'entreprise :", 40, sigTop);
                doc.dash(2, { space: 2 }).roundedRect(40, sigTop + 12, 245, 52, 4).strokeColor("#CBD5E1").stroke().undash();

                if (companySignature) {
                    try {
                        doc.image(companySignature, 45, sigTop + 14, { fit: [235, 48], align: "center", valign: "center" });
                    } catch (e) {
                        doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular).text(companyName, 45, sigTop + 32, { width: 235, align: "center" });
                    }
                } else {
                    doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular).text(companyName, 45, sigTop + 32, { width: 235, align: "center" });
                }
            }

            if (showClientSignature) {
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold).text("Bon pour accord / Le Client :", 310, sigTop);
                if (isSigned) {
                    doc.fillColor("#16A34A").fontSize(7.5 * scale).font(fonts.bold).text("✓ Signé en ligne", 440, sigTop, { width: 115, align: "right" });
                }
                doc.dash(2, { space: 2 }).roundedRect(310, sigTop + 12, 245, 52, 4).strokeColor("#CBD5E1").stroke().undash();

                if (isSigned && clientSignature) {
                    try {
                        doc.image(clientSignature, 315, sigTop + 14, { fit: [235, 48], align: "center", valign: "center" });
                    } catch (e) {
                        doc.fillColor("#16A34A").fontSize(8.5 * scale).font(fonts.bold).text("✓ Signé électroniquement", 315, sigTop + 32, { width: 235, align: "center" });
                    }
                } else if (isSigned) {
                    doc.fillColor("#16A34A").fontSize(8.5 * scale).font(fonts.bold).text("✓ Signé électroniquement", 315, sigTop + 32, { width: 235, align: "center" });
                } else {
                    doc.fillColor("#94A3B8").fontSize(8 * scale).font(fonts.italic).text("Cadre réservé à la signature du client", 315, sigTop + 32, { width: 235, align: "center" });
                }
            }

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

            // Page Background Color
            if (bgColor && bgColor !== "#FFFFFF") {
                doc.rect(0, 0, 595.28, 841.89).fill(bgColor);
            }

            let curY = 40;

            // ==================== 1. STRUCTURE HEADERS ====================
            if (structure === "banner") {
                // Banner Box (matching previsualiser)
                const bannerTop = 40;
                const bannerHeight = 44;
                doc.roundedRect(40, bannerTop, 515, bannerHeight, 3).fill(primaryColor);

                let bannerLogoWidth = 0;
                if (companyLogo) {
                    try {
                        const imgFitHeight = Math.min(32, logoSize * 0.75);
                        doc.image(companyLogo, 50, bannerTop + (bannerHeight - imgFitHeight) / 2, { fit: [90, imgFitHeight] });
                        bannerLogoWidth = 85;
                    } catch (e) {}
                }

                const compNameX = 50 + (bannerLogoWidth ? bannerLogoWidth + 10 : 0);
                doc.fillColor("#FFFFFF")
                   .fontSize(13 * scale)
                   .font(fonts.bold)
                   .text(companyName, compNameX, bannerTop + 14);

                doc.fillColor("#FFFFFF")
                   .fontSize(18 * scale)
                   .font(fonts.bold)
                   .text("FACTURE", 340, bannerTop + 12, { width: 200, align: "right" });

                // Sub metadata strip right below banner
                const metaTop = bannerTop + bannerHeight + 6;
                doc.roundedRect(40, metaTop, 515, 18, 3).fill("#F4F4F2");
                doc.fillColor("#4A4A4A")
                   .fontSize(8 * scale)
                   .font(fonts.bold)
                   .text(`Numéro : ${invoice.number || ''}`, 50, metaTop + 5);
                doc.text(`Date : ${formattedDate}`, 240, metaTop + 5);
                if (showDeliveryDate) {
                    doc.text(`Échéance : ${formattedDueDate}`, 410, metaTop + 5);
                }

                curY = metaTop + 24;


                if (clientBoxPosition === "right") {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && company?.address) { doc.text(company.address, 40, leftCompY); leftCompY += 11; }
                    if (showAddress && (company?.postalCode || company?.city)) { doc.text(`${company.postalCode || ''} ${company.city || ''}`.trim(), 40, leftCompY); leftCompY += 11; }
                    if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftCompY); leftCompY += 11; }
                    if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftCompY); leftCompY += 11; }
                    if (showEmail && company?.email) { doc.text(`Email : ${company.email}`, 40, leftCompY); leftCompY += 11; }

                    const cBoxHeight = 65;
                    doc.roundedRect(300, curY, 255, cBoxHeight, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    let rY = curY + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 310, rY);
                    rY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 310, rY);
                    rY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (invoice.client?.address) { doc.text(invoice.client.address, 310, rY); rY += 10; }
                    if (invoice.client?.phone) { doc.text(`Tél : ${invoice.client.phone}`, 310, rY); }

                    curY = Math.max(leftCompY, curY + cBoxHeight) + 12;
                } else {
                    let leftCompY = curY;
                    doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                    if (showAddress && company?.address) { doc.text(company.address, 40, leftCompY); leftCompY += 11; }
                    if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftCompY); leftCompY += 11; }
                    if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftCompY); leftCompY += 11; }

                    curY = leftCompY + 6;
                    doc.roundedRect(40, curY, 515, 52, 4).fillAndStroke("#FAFAF8", "#E2E8F0");
                    let bY = curY + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 50, bY);
                    bY += 11;
                    doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, 50, bY);
                    bY += 13;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (invoice.client?.address) { doc.text(invoice.client.address, 50, bY); }

                    curY += 60;
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
                    if (showAddress && company?.address) { doc.text(company.address, 48, emY); emY += 10; }
                    if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 48, emY); emY += 10; }
                    if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 48, emY); }

                    // Right Card: FACTURÉ À :
                    doc.roundedRect(300, boxTop, 255, cBoxHeight, 4).fillAndStroke("#F8FAFC", "#E2E8F0");
                    doc.rect(300, boxTop, 3.5, cBoxHeight).fill(primaryColor);

                    let clY = boxTop + 6;
                    doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", 310, clY);
                    clY += 11;
                    doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 310, clY);
                    clY += 12;
                    doc.fillColor("#475569").fontSize(8 * scale).font(fonts.regular);
                    if (invoice.client?.address) { doc.text(invoice.client.address, 310, clY); clY += 10; }
                    if (invoice.client?.phone) { doc.text(`Tél : ${invoice.client.phone}`, 310, clY); }

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
                    if (showAddress && company?.address) { doc.text(company.address, 48, emY); }

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
                    if (invoice.client?.address) { doc.text(invoice.client.address, 48, clY); }

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

                doc.fillColor(textColor).fontSize(13 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 15;
                doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular);
                if (showAddress && company?.address) { doc.text(company.address, 40, leftY); leftY += 10; }
                if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftY); leftY += 10; }
                if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftY); leftY += 10; }

                let rightY = 40;
                doc.fillColor(textColor).fontSize(18 * scale).font(fonts.bold).text("FACTURE", 340, rightY, { width: 215, align: "right" });
                rightY += 22;
                doc.fillColor("#64748B").fontSize(8.5 * scale).font(fonts.regular).text(`N° ${invoice.number || ''}`, 340, rightY, { width: 215, align: "right" });
                rightY += 12;
                doc.text(`Date : ${formattedDate}`, 340, rightY, { width: 215, align: "right" });
                rightY += 12;
                if (showDeliveryDate) {
                    doc.text(`Échéance : ${formattedDueDate}`, 340, rightY, { width: 215, align: "right" });
                    rightY += 12;
                }

                const sepY = Math.max(leftY, rightY) + 8;
                doc.moveTo(40, sepY).lineTo(555, sepY).strokeColor("#E2E8F0").lineWidth(0.75).stroke();

                let cY = sepY + 8;
                doc.fillColor("#94A3B8").fontSize(7.5 * scale).font(fonts.bold).text("DESTINATAIRE", 40, cY);
                cY += 11;
                doc.fillColor(textColor).fontSize(9.5 * scale).font(fonts.bold).text(clientName, 40, cY);
                cY += 12;
                doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular);
                if (invoice.client?.address) { doc.text(invoice.client.address, 40, cY); cY += 10; }

                curY = cY + 8;

            } else {
                // Classic structure
                let leftY = 40;
                if (companyLogo && logoPosition === "left") {
                    try {
                        doc.image(companyLogo, 40, leftY, { fit: [110, Math.min(45, logoSize)] });
                        leftY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(14 * scale).font(fonts.bold).text(companyName, 40, leftY);
                leftY += 16;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (showAddress && company?.address) { doc.text(company.address, 40, leftY); leftY += 11; }
                if (showAddress && (company?.postalCode || company?.city)) { doc.text(`${company.postalCode || ''} ${company.city || ''}`.trim(), 40, leftY); leftY += 11; }
                if (showSiret && company?.siret) { doc.text(`SIRET : ${company.siret}`, 40, leftY); leftY += 11; }
                if (showPhone && company?.phone) { doc.text(`Tél : ${company.phone}`, 40, leftY); leftY += 11; }
                if (showEmail && company?.email) { doc.text(`Email : ${company.email}`, 40, leftY); leftY += 11; }

                let rightY = 40;
                if (companyLogo && logoPosition === "right") {
                    try {
                        doc.image(companyLogo, 440, rightY, { fit: [115, Math.min(45, logoSize)], align: "right" });
                        rightY += 46;
                    } catch (e) {}
                }

                doc.fillColor(primaryColor).fontSize(22 * scale).font(fonts.bold).text("FACTURE", 315, rightY, { width: 240, align: "right" });
                rightY += 26;
                doc.fillColor(textColor).fontSize(9 * scale).font(fonts.bold).text(`Numéro :  ${invoice.number || ''}`, 315, rightY, { width: 240, align: "right" });
                rightY += 13;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular).text(`Date :  ${formattedDate}`, 315, rightY, { width: 240, align: "right" });
                rightY += 13;
                if (showDeliveryDate) {
                    doc.text(`Échéance :  ${formattedDueDate}`, 315, rightY, { width: 240, align: "right" });
                    rightY += 13;
                }

                const boxTop = Math.max(leftY, rightY) + 10;
                const cBoxWidth = clientBoxPosition === "right" ? 255 : 515;
                const cBoxLeft = clientBoxPosition === "right" ? 300 : 40;
                const cBoxHeight = 56;

                doc.roundedRect(cBoxLeft, boxTop, cBoxWidth, cBoxHeight, 5).fillAndStroke("#FAFAF8", "#EAEAE6");
                let cY = boxTop + 7;
                doc.fillColor(primaryColor).fontSize(7.5 * scale).font(fonts.bold).text("FACTURÉ À :", cBoxLeft + 10, cY);
                cY += 11;
                doc.fillColor(textColor).fontSize(10 * scale).font(fonts.bold).text(clientName, cBoxLeft + 10, cY);
                cY += 13;
                doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular);
                if (invoice.client?.address) { doc.text(invoice.client.address, cBoxLeft + 10, cY); cY += 10; }
                if (invoice.client?.phone) { doc.text(`Tél : ${invoice.client.phone}`, cBoxLeft + 10, cY); }

                curY = boxTop + cBoxHeight + 12;
            }

            // ==================== 2. TABLE OF ITEMS ====================
            const tableTop = curY;
            if (structure === "minimal") {
                doc.moveTo(40, tableTop).lineTo(555, tableTop).strokeColor("#0F172A").lineWidth(1).stroke();
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold);
            } else {
                doc.rect(40, tableTop, 515, 20).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(8.5 * scale).font(fonts.bold);
            }

            const headerTextY = tableTop + 5;
            doc.text("Description", 50, headerTextY, { width: 250 });
            doc.text("Qté", 310, headerTextY, { width: 45, align: "center" });
            doc.text("Unit. HT", 365, headerTextY, { width: 85, align: "right" });
            doc.text("Total HT", 460, headerTextY, { width: 85, align: "right" });

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

                doc.fillColor(textColor)
                   .fontSize(8.5 * scale)
                   .font(fonts.bold)
                   .text(l.description || "Prestation", 50, rowY + 5, { width: 250, lineBreak: false });

                doc.font(fonts.regular)
                   .fillColor("#334155")
                   .text(String(l.quantity || l.qty || 1), 310, rowY + 5, { width: 45, align: "center" });

                const unitPrice = Number(l.unitPrice || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.text(`${unitPrice} €`, 365, rowY + 5, { width: 85, align: "right" });

                const lineTotal = Number(l.total || (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1))).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.font(fonts.bold)
                   .fillColor(textColor)
                   .text(`${lineTotal} €`, 460, rowY + 5, { width: 85, align: "right" });

                rowY += rowHeight;
                doc.moveTo(40, rowY).lineTo(555, rowY).strokeColor("#EAEAE6").lineWidth(0.5).stroke();
            });

            // ==================== 3. SUMMARY TOTALS ====================
            const summaryTop = rowY + 8;
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

            doc.fillColor("#475569").fontSize(8.5 * scale).font(fonts.regular).text("Sous-total HT :", sumLeft, summaryTop);
            doc.fillColor(textColor).font(fonts.bold).text(totalHtFormatted, sumLeft, summaryTop, { width: sumWidth, align: "right" });

            doc.fillColor("#475569").font(fonts.regular).text(`TVA (${tvaRate}%) :`, sumLeft, summaryTop + 14);
            doc.fillColor(textColor).font(fonts.bold).text(tvaFormatted, sumLeft, summaryTop + 14, { width: sumWidth, align: "right" });

            const totalBoxTop = summaryTop + 30;
            if (structure === "minimal") {
                doc.rect(sumLeft, totalBoxTop, sumWidth, 24).fill("#0F172A");
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            } else {
                doc.roundedRect(sumLeft, totalBoxTop, sumWidth, 24, 4).fill(primaryColor);
                doc.fillColor("#FFFFFF").fontSize(9.5 * scale).font(fonts.bold);
            }
            doc.text("TOTAL TTC :", sumLeft + 10, totalBoxTop + 7);
            doc.text(totalTtcFormatted, sumLeft + 10, totalBoxTop + 7, { width: sumWidth - 20, align: "right" });

            // ==================== 4. SIGNATURES ====================
            const sigTop = totalBoxTop + 34;

            if (showCompanySignature) {
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold).text("Pour l'entreprise :", 40, sigTop);
                doc.dash(2, { space: 2 }).roundedRect(40, sigTop + 12, 245, 52, 4).strokeColor("#CBD5E1").stroke().undash();

                if (companySignature) {
                    try {
                        doc.image(companySignature, 45, sigTop + 14, { fit: [235, 48], align: "center", valign: "center" });
                    } catch (e) {
                        doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular).text(companyName, 45, sigTop + 32, { width: 235, align: "center" });
                    }
                } else {
                    doc.fillColor("#64748B").fontSize(8 * scale).font(fonts.regular).text(companyName, 45, sigTop + 32, { width: 235, align: "center" });
                }
            }

            if (showClientSignature) {
                doc.fillColor(textColor).fontSize(8.5 * scale).font(fonts.bold).text("Bon pour accord / Le Client :", 310, sigTop);
                doc.dash(2, { space: 2 }).roundedRect(310, sigTop + 12, 245, 52, 4).strokeColor("#CBD5E1").stroke().undash();
                doc.fillColor("#94A3B8").fontSize(8 * scale).font(fonts.italic).text("Cadre signature client", 310, sigTop + 32, { width: 235, align: "center" });
            }

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
