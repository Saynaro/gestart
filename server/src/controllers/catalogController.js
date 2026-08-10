import { prisma } from "../config/db.js";

// GET ALL CATALOG ITEMS FOR COMPANY
export const getCatalogItems = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const items = await prisma.catalogItem.findMany({
            where: { companyId, isActive: true },
            orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }]
        });

        return res.status(200).json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error("GET CATALOG ITEMS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération du catalogue"
        });
    }
};

// CREATE NEW CATALOG ITEM
export const createCatalogItem = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, reference, description, unitPrice, tvaRate, category, type, unit } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Le nom de l'article est obligatoire"
            });
        }

        const itemType = type || (category && category.includes("Matériel") ? "PRODUCT" : "SERVICE");
        const price = parseFloat(unitPrice) || 0;
        const tva = parseFloat(tvaRate) || 20;

        const newItem = await prisma.catalogItem.create({
            data: {
                companyId,
                name: name.trim(),
                reference: reference ? reference.trim() : null,
                description: description ? description.trim() : null,
                type: itemType,
                defaultPrice: price,
                tvaRate: tva,
                unit: unit || "UNITE"
            }
        });

        return res.status(201).json({
            success: true,
            message: "Article ajouté au catalogue avec succès",
            data: newItem
        });
    } catch (error) {
        console.error("CREATE CATALOG ITEM ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la création de l'article"
        });
    }
};

// UPDATE CATALOG ITEM
export const updateCatalogItem = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;
        const { name, reference, description, unitPrice, tvaRate, type, unit, isFavorite } = req.body;

        const existing = await prisma.catalogItem.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Article introuvable"
            });
        }

        const updated = await prisma.catalogItem.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim() } : {}),
                ...(reference !== undefined ? { reference: reference ? reference.trim() : null } : {}),
                ...(description !== undefined ? { description: description ? description.trim() : null } : {}),
                ...(unitPrice !== undefined ? { defaultPrice: parseFloat(unitPrice) || 0 } : {}),
                ...(tvaRate !== undefined ? { tvaRate: parseFloat(tvaRate) || 20 } : {}),
                ...(type ? { type } : {}),
                ...(unit ? { unit } : {}),
                ...(isFavorite !== undefined ? { isFavorite: Boolean(isFavorite) } : {})
            }
        });

        return res.status(200).json({
            success: true,
            message: "Article mis à jour",
            data: updated
        });
    } catch (error) {
        console.error("UPDATE CATALOG ITEM ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à jour de l'article"
        });
    }
};

// DELETE CATALOG ITEM (Soft delete by setting isActive: false)
export const deleteCatalogItem = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const existing = await prisma.catalogItem.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Article introuvable"
            });
        }

        await prisma.catalogItem.update({
            where: { id },
            data: { isActive: false }
        });

        return res.status(200).json({
            success: true,
            message: "Article supprimé du catalogue"
        });
    } catch (error) {
        console.error("DELETE CATALOG ITEM ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de l'article"
        });
    }
};
