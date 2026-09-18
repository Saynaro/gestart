/**
 * pdfGenerator.js
 * Generates pixel-perfect PDFs directly from the Previsualiser HTML/CSS using Headless Chromium / Puppeteer.
 */

import puppeteer from 'puppeteer';
import { renderInvoiceHtml, renderQuoteHtml, renderReceiptHtml, wrapInFullHtmlDocument } from './documentHtmlRenderer.js';

let browserInstance = null;

async function getBrowser() {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }
    browserInstance = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none'
        ]
    });
    browserInstance.on('disconnected', () => {
        browserInstance = null;
    });
    return browserInstance;
}

/**
 * Generate PDF buffer from HTML content via Puppeteer.
 */
export async function generatePdfFromHtml(fullHtml) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        // Set viewport matching standard A4 at 96 DPI
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
        
        await page.setContent(fullHtml, {
            waitUntil: ['load', 'networkidle0'],
            timeout: 30000
        });

        // Ensure all web fonts are loaded completely
        await page.evaluate(async () => {
            if (document.fonts) {
                await document.fonts.ready;
            }
        });

        const pdfUint8Array = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            }
        });

        return Buffer.from(pdfUint8Array);
    } finally {
        await page.close().catch(() => {});
    }
}

/**
 * Generate Invoice PDF Buffer.
 */
export async function generateInvoicePdfBuffer({ invoice, company, customization = {} }) {
    const innerHtml = renderInvoiceHtml({ invoice, company, customization });
    const fullHtml = wrapInFullHtmlDocument(innerHtml, customization);
    return await generatePdfFromHtml(fullHtml);
}

/**
 * Generate Quote PDF Buffer.
 */
export async function generateQuotePdfBuffer({ quote, company, customization = {} }) {
    const innerHtml = renderQuoteHtml({ quote, company, customization });
    const fullHtml = wrapInFullHtmlDocument(innerHtml, customization);
    return await generatePdfFromHtml(fullHtml);
}

/**
 * Generate Official Payment Receipt PDF Buffer.
 */
export async function generateReceiptPdfBuffer({ paymentData, company, customization = {} }) {
    const innerHtml = renderReceiptHtml({ paymentData, company, customization });
    const fullHtml = wrapInFullHtmlDocument(innerHtml, customization);
    return await generatePdfFromHtml(fullHtml);
}

export default {
    generatePdfFromHtml,
    generateInvoicePdfBuffer,
    generateQuotePdfBuffer,
    generateReceiptPdfBuffer
};
