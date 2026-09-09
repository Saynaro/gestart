import { prisma } from "../config/db.js";

/**
 * Normalise une chaîne de caractères (suppression accents, ponctuation, minuscules)
 */
const normalizeText = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, " ")
        .trim();
};

/**
 * Calcule le score de correspondance entre une transaction bancaire et une facture
 * Score de 0.0 à 1.0 (1.0 = 100%)
 */
export const calculateReconciliationScore = (transaction, invoice) => {
    let score = 0;
    const details = [];

    const labelNorm = normalizeText(transaction.label + " " + (transaction.reference || ""));
    const invNumNorm = normalizeText(invoice.number);

    // 1. Référence exacte de la facture dans le libellé (40 points max)
    if (invNumNorm && labelNorm.includes(invNumNorm)) {
        score += 0.40;
        details.push("Numéro de facture exact trouvé dans le libellé (+40%)");
    } else {
        // Recherche partielle des chiffres du numéro de facture
        const digitsOnly = invoice.number.replace(/\D/g, "");
        if (digitsOnly.length >= 3 && labelNorm.includes(digitsOnly)) {
            score += 0.25;
            details.push("Chiffres du numéro de facture trouvés (+25%)");
        }
    }

    // 2. Montant exact (30 points max)
    const txAmount = Math.abs(Number(transaction.amount) || 0);
    const invAmount = Number(invoice.amountTTC) || 0;
    const diff = Math.abs(txAmount - invAmount);

    if (diff < 0.01) {
        score += 0.30;
        details.push("Montant exact (+30%)");
    } else if (diff <= 1.00) {
        score += 0.15;
        details.push("Montant proche à moins de 1€ (+15%)");
    }

    // 3. Nom du client (15 points max)
    if (invoice.client) {
        const clientFirst = normalizeText(invoice.client.firstName);
        const clientLast = normalizeText(invoice.client.lastName);
        const clientCompany = normalizeText(invoice.client.companyName);
        const counterpartyNorm = normalizeText(transaction.counterparty + " " + labelNorm);

        let nameMatched = false;
        if (clientLast && clientLast.length > 2 && counterpartyNorm.includes(clientLast)) {
            score += 0.10;
            nameMatched = true;
        }
        if (clientFirst && clientFirst.length > 2 && counterpartyNorm.includes(clientFirst)) {
            score += 0.05;
            nameMatched = true;
        }
        if (!nameMatched && clientCompany && clientCompany.length > 2 && counterpartyNorm.includes(clientCompany)) {
            score += 0.15;
            nameMatched = true;
        }

        if (nameMatched) {
            details.push("Nom du client ou entreprise identifié (+15%)");
        }
    }

    // 4. IBAN du client correspondant (10 points max)
    if (transaction.counterpartyIban && invoice.company?.settings?.bankIban) {
        // Si besoin d'historique IBAN client
        score += 0.05;
    }

    // 5. Date de transaction postérieure ou proche de la facture (5 points max)
    if (transaction.transactionDate && invoice.issuedAt) {
        const txDate = new Date(transaction.transactionDate);
        const issueDate = new Date(invoice.issuedAt);
        const daysDiff = (txDate - issueDate) / (1000 * 60 * 60 * 24);

        if (daysDiff >= -1 && daysDiff <= 60) {
            score += 0.05;
            details.push("Date cohérente avec la date d'émission (+5%)");
        }
    }

    return {
        score: Math.min(1.0, Math.round(score * 100) / 100),
        details
    };
};

/**
 * Analyse une transaction et cherche la meilleure facture correspondante parmi les factures impayées
 */
export const matchTransactionWithInvoices = async (transactionId) => {
    const transaction = await prisma.bankTransaction.findUnique({
        where: { id: transactionId }
    });

    if (!transaction || transaction.reconciliationStatus === "MATCHED" || transaction.reconciliationStatus === "IGNORED") {
        return null;
    }

    // Factures impayées de l'entreprise (non brouillons, non annulées)
    const openInvoices = await prisma.invoice.findMany({
        where: {
            companyId: transaction.companyId,
            status: { in: ["SENT", "OVERDUE", "DRAFT"] },
            paymentStatus: { in: ["PENDING", "PARTIALLY_PAID", "FAILED"] }
        },
        include: {
            client: true,
            company: { include: { settings: true } }
        }
    });

    let bestMatch = null;
    let highestScore = 0;

    for (const inv of openInvoices) {
        const { score, details } = calculateReconciliationScore(transaction, inv);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = {
                invoice: inv,
                score,
                details
            };
        }
    }

    if (!bestMatch || highestScore < 0.60) {
        await prisma.bankTransaction.update({
            where: { id: transactionId },
            data: {
                reconciliationStatus: "PENDING",
                confidenceScore: highestScore,
                matchedInvoiceId: null
            }
        });
        return { status: "PENDING", score: highestScore };
    }

    const hasExactNumber = bestMatch.details.some(d => d.includes("Numéro de facture exact"));
    const hasExactAmount = bestMatch.details.some(d => d.includes("Montant exact"));
    const isAutoMatch = (hasExactNumber && hasExactAmount) || highestScore >= 0.85;

    // Correspondance automatique si numéro exact + montant exact OU score >= 0.85
    if (isAutoMatch) {
        const invId = bestMatch.invoice.id;

        // Mise à jour de la facture en PAYÉE par virement
        await prisma.$transaction([
            prisma.invoice.update({
                where: { id: invId },
                data: {
                    status: "PAID",
                    paymentStatus: "PAID",
                    paymentMethod: "TRANSFER",
                    invoicePaymentMethod: "BANK_TRANSFER",
                    amountPaid: bestMatch.invoice.amountTTC,
                    paidAt: transaction.transactionDate || new Date(),
                    paymentRef: transaction.reference || transaction.externalTransactionId
                }
            }),
            prisma.invoiceTransaction.create({
                data: {
                    invoiceId: invId,
                    companyId: transaction.companyId,
                    type: "BANK_TRANSFER",
                    status: "succeeded",
                    amount: transaction.amount,
                    currency: transaction.currency || "EUR",
                    bankReference: transaction.reference || transaction.externalTransactionId,
                    paidAt: transaction.transactionDate || new Date()
                }
            }),
            prisma.bankTransaction.update({
                where: { id: transactionId },
                data: {
                    reconciliationStatus: "MATCHED",
                    confidenceScore: highestScore,
                    matchedInvoiceId: invId,
                    reconciledAt: new Date(),
                    reconciledBy: "AUTO"
                }
            })
        ]);

        return {
            status: "MATCHED",
            score: highestScore,
            invoiceId: invId,
            autoReconciled: true
        };
    }

    // Correspondance probable (0.60 <= Score < 0.95) -> En attente de confirmation manuelle
    await prisma.bankTransaction.update({
        where: { id: transactionId },
        data: {
            reconciliationStatus: "PROBABLE",
            confidenceScore: highestScore,
            matchedInvoiceId: bestMatch.invoice.id
        }
    });

    return {
        status: "PROBABLE",
        score: highestScore,
        invoice: bestMatch.invoice,
        details: bestMatch.details
    };
};

/**
 * Confirme manuellement le rapprochement entre une transaction bancaire et une facture
 */
export const confirmReconciliation = async (transactionId, invoiceId, userId) => {
    const transaction = await prisma.bankTransaction.findUnique({
        where: { id: transactionId }
    });

    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
    });

    if (!transaction || !invoice) {
        throw new Error("Transaction ou facture introuvable");
    }

    if (transaction.companyId !== invoice.companyId) {
        throw new Error("Action non autorisée sur une autre entreprise");
    }

    await prisma.$transaction([
        prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: "PAID",
                paymentStatus: "PAID",
                paymentMethod: "TRANSFER",
                invoicePaymentMethod: "BANK_TRANSFER",
                amountPaid: invoice.amountTTC,
                paidAt: transaction.transactionDate || new Date(),
                paymentRef: transaction.reference || transaction.externalTransactionId
            }
        }),
        prisma.invoiceTransaction.create({
            data: {
                invoiceId,
                companyId: transaction.companyId,
                type: "BANK_TRANSFER",
                status: "succeeded",
                amount: transaction.amount,
                currency: transaction.currency || "EUR",
                bankReference: transaction.reference || transaction.externalTransactionId,
                paidAt: transaction.transactionDate || new Date()
            }
        }),
        prisma.bankTransaction.update({
            where: { id: transactionId },
            data: {
                reconciliationStatus: "MATCHED",
                confidenceScore: 1.0,
                matchedInvoiceId: invoiceId,
                reconciledAt: new Date(),
                reconciledBy: userId || "USER"
            }
        })
    ]);

    return { success: true };
};

/**
 * Ignore une transaction pour le rapprochement
 */
export const ignoreReconciliation = async (transactionId) => {
    await prisma.bankTransaction.update({
        where: { id: transactionId },
        data: {
            reconciliationStatus: "IGNORED",
            matchedInvoiceId: null
        }
    });

    return { success: true };
};
