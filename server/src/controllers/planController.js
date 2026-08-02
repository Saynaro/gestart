import { prisma } from "../config/db.js";

////// GET ALL PLANS (PUBLIC) //////
export const getPlans = async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            orderBy: { priceMonthly: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: { plans }
        });
    } catch (error) {
        console.error("GET PLANS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des plans"
        });
    }
};

////// GET PLAN BY NAME (PUBLIC) //////
export const getPlanByName = async (req, res) => {
    const { name } = req.params;

    try {
        const plan = await prisma.plan.findFirst({
            where: {
                name: name.toUpperCase()
            }
        });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan introuvable"
            });
        }

        return res.status(200).json({
            success: true,
            data: { plan }
        });
    } catch (error) {
        console.error("GET PLAN BY NAME ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération du plan"
        });
    }
};
