import { prisma } from "../config/db.js";

/**
 * Récupère la configuration des frais Stripe active ou utilise les valeurs par défaut (1.5% + 0.25€)
 */
export const getStripeFeeConfig = async () => {
    try {
        const config = await prisma.stripeFeeConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "desc" }
        });

        if (config) {
            return {
                feeRate: config.feeRate ?? 0.015,
                fixedFee: config.fixedFee ?? 0.25,
                currency: config.currency || "EUR"
            };
        }
    } catch (e) {
        console.warn("[STRIPE FEE SERVICE] Utilisation de la configuration de frais par défaut:", e.message);
    }

    return {
        feeRate: 0.015, // 1.5%
        fixedFee: 0.25,  // 0.25€
        currency: "EUR"
    };
};

/**
 * Calcule le montant total, les frais et le net à percevoir selon le porteur des frais (COMPANY ou CLIENT)
 * 
 * Formule pour frais à la charge du CLIENT :
 * customerTotal = (invoiceAmount + fixedFee) / (1 - feeRate)
 * 
 * @param {number} invoiceAmount - Montant TTC de la facture en Euros
 * @param {'COMPANY' | 'CLIENT'} [feeBearer='COMPANY'] - Qui supporte les frais
 * @returns {Promise<{
 *   invoiceAmount: number,
 *   feeAmount: number,
 *   totalAmount: number,
 *   bearer: string,
 *   feeRate: number,
 *   fixedFee: number
 * }>}
 */
export const calculateStripeFee = async (invoiceAmount, feeBearer = "COMPANY") => {
    const rawAmount = Math.max(0, Number(invoiceAmount) || 0);
    const { feeRate, fixedFee } = await getStripeFeeConfig();

    if (rawAmount === 0) {
        return {
            invoiceAmount: 0,
            feeAmount: 0,
            totalAmount: 0,
            bearer: feeBearer,
            feeRate,
            fixedFee
        };
    }

    if (feeBearer === "CLIENT") {
        // Le client paie le montant majoré des frais Stripe
        // Formule: Total = (Montant + FraisFixe) / (1 - TauxPourcentage)
        const unroundedTotal = (rawAmount + fixedFee) / (1 - feeRate);
        // Arrondi au centime supérieur pour garantir que l'entreprise reçoit au moins rawAmount
        const totalAmount = Math.ceil(unroundedTotal * 100) / 100;
        const feeAmount = Math.max(0, Math.round((totalAmount - rawAmount) * 100) / 100);

        return {
            invoiceAmount: rawAmount,
            feeAmount,
            totalAmount,
            bearer: "CLIENT",
            feeRate,
            fixedFee
        };
    }

    // Mode COMPANY : le client paie le montant exact de la facture
    // Les frais sont déduits du montant reçu
    const estimatedFee = Math.round((rawAmount * feeRate + fixedFee) * 100) / 100;

    return {
        invoiceAmount: rawAmount,
        feeAmount: estimatedFee,
        totalAmount: rawAmount,
        bearer: "COMPANY",
        feeRate,
        fixedFee
    };
};
