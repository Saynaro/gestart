import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
    })
    : null;

/**
 * Server-side mapping for official Stripe Price IDs.
 * Never trust Price IDs passed from the frontend.
 */
export const STRIPE_PRICES = {
    STARTER: {
        MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
        ANNUAL: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    },
    PREMIUM: {
        MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
        ANNUAL: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    },
    PRO: {
        MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
        ANNUAL: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    },
    UNLIMITED: {
        MONTHLY: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
        ANNUAL: process.env.STRIPE_PRICE_UNLIMITED_ANNUAL,
    },
    EXTRA_BANK: process.env.STRIPE_EXTRA_BANK_PRICE_ID
};

/**
 * Resolve Stripe Price ID safely from plan name and billing cycle
 */
export const getStripePriceId = (planName, cycle = "MONTHLY") => {
    const normalizedPlan = (planName || "").toUpperCase().trim();
    const normalizedCycle = (cycle || "MONTHLY").toUpperCase().trim();

    const planKey = (normalizedPlan === "PRO" || normalizedPlan === "PREMIUM") ? "PREMIUM" : normalizedPlan;
    const planConfig = STRIPE_PRICES[planKey];

    if (!planConfig) return null;
    return planConfig[normalizedCycle] || null;
};

/**
 * Startup validation for Stripe Price IDs
 */
export const validateStripeConfig = () => {
    const pricesToCheck = [
        { name: "STRIPE_PRICE_STARTER_MONTHLY", val: process.env.STRIPE_PRICE_STARTER_MONTHLY },
        { name: "STRIPE_PRICE_STARTER_ANNUAL", val: process.env.STRIPE_PRICE_STARTER_ANNUAL },
        { name: "STRIPE_PRICE_PREMIUM_MONTHLY", val: process.env.STRIPE_PRICE_PREMIUM_MONTHLY },
        { name: "STRIPE_PRICE_PREMIUM_ANNUAL", val: process.env.STRIPE_PRICE_PREMIUM_ANNUAL },
        { name: "STRIPE_PRICE_UNLIMITED_MONTHLY", val: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY },
        { name: "STRIPE_PRICE_UNLIMITED_ANNUAL", val: process.env.STRIPE_PRICE_UNLIMITED_ANNUAL },
        { name: "STRIPE_EXTRA_BANK_PRICE_ID", val: process.env.STRIPE_EXTRA_BANK_PRICE_ID }
    ];

    for (const p of pricesToCheck) {
        if (p.val) {
            if (p.val.startsWith("prod_")) {
                console.error(`[STRIPE CONFIG ERROR] ${p.name} contient un Product ID (${p.val}) au lieu d'un Price ID (doit commencer par 'price_') !`);
            } else if (!p.val.startsWith("price_")) {
                console.warn(`[STRIPE CONFIG WARNING] ${p.name} (${p.val}) ne commence pas par 'price_'`);
            }
        }
    }
};

validateStripeConfig();
