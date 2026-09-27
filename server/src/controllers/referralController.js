import { prisma } from "../config/db.js";

/**
 * Get the current company/user referral stats and unique referral link
 */
export async function getReferralStats(req, res, next) {
    try {
        const userId = req.user.id;
        const companyId = req.user.companyId || req.companyId;

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: {
                    where: { id: userId },
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: "Société introuvable" });
        }

        // Generate clean and unique referral code based on company name and ID
        const baseName = (company.name || "ARTISAN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "ARTISAN";
        const suffix = company.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
        const referralCode = `${baseName}-${suffix}`;

        const frontendUrl = process.env.FRONTEND_URL || "https://gestart.fr";
        const cleanBaseUrl = frontendUrl.replace(/\/$/, "");
        const referralLink = `${cleanBaseUrl}/register?ref=${referralCode}`;

        // Fetch real referral audit logs from database
        const referralLogs = await prisma.auditLog.findMany({
            where: {
                companyId,
                entityType: "Referral",
                action: "referral.registered"
            },
            orderBy: { createdAt: "desc" }
        });

        const referrals = referralLogs.map(log => {
            const data = log.newData || {};
            const rawEmail = data.referredEmail || "";
            const maskedEmail = rawEmail.includes("@")
                ? `${rawEmail.slice(0, 2)}***@${rawEmail.split("@")[1]}`
                : "Artisan confrère";

            return {
                companyName: data.referredCompanyName || maskedEmail,
                email: maskedEmail,
                date: new Date(log.createdAt).toLocaleDateString("fr-FR"),
                status: data.status || "REGISTERED",
                reward: data.reward || "1 mois offert"
            };
        });

        const totalReferred = referrals.length;
        const totalRewardedMonths = referrals.length;
        const totalSavingsEur = totalRewardedMonths * 39; // 39€/mois

        res.status(200).json({
            success: true,
            referralCode,
            referralLink,
            companyName: company.name,
            totalReferred,
            totalRewardedMonths,
            totalSavingsEur,
            referrals
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Validate a referral / promo code during registration
 */
export async function validateReferralCode(req, res, next) {
    try {
        const rawCode = (req.query.code || req.body?.code || "").trim().toUpperCase();
        if (!rawCode) {
            return res.status(400).json({ success: false, valid: false, message: "Code requis" });
        }

        const parts = rawCode.split("-");
        const suffix = parts[parts.length - 1];

        if (!suffix || suffix.length < 3) {
            return res.status(200).json({
                success: true,
                valid: false,
                message: "Code de parrainage non reconnu"
            });
        }

        // Find company matching the suffix
        const referrerCompany = await prisma.company.findFirst({
            where: {
                id: { endsWith: suffix, mode: "insensitive" }
            },
            select: { id: true, name: true, email: true }
        });

        if (!referrerCompany) {
            return res.status(200).json({
                success: true,
                valid: false,
                message: "Ce code de parrainage n'existe pas ou est expiré"
            });
        }

        return res.status(200).json({
            success: true,
            valid: true,
            referralCode: rawCode,
            referrerCompanyName: referrerCompany.name,
            message: `Code valide ! 1 mois offert pour vous et ${referrerCompany.name}`
        });
    } catch (err) {
        next(err);
    }
}
