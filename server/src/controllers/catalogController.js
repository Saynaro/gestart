import { prisma } from "../config/db.js";
import { cacheService } from "../services/cacheService.js";

const mapStringToItemUnit = (unitStr) => {
    if (!unitStr) return "UNITE";
    const u = String(unitStr).toLowerCase();
    if (u.includes("heure")) return "HEURE";
    if (u.includes("forfait")) return "FORFAIT";
    if (u.includes("m2") || u.includes("m²") || u.includes("carré") || u.includes("carre")) return "M2";
    if (u.includes("mètre") || u.includes("metre") || u.includes("linéaire") || u.includes("lineaire")) return "METRE";
    if (u.includes("kg") || u.includes("kilo")) return "KG";
    if (u.includes("litre")) return "LITRE";
    return "UNITE";
};

const mapItemUnitToString = (unitEnum) => {
    switch (unitEnum) {
        case "HEURE": return "À l'heure";
        case "FORFAIT": return "Au forfait";
        case "METRE": return "Au mètre linéaire (m)";
        case "M2": return "Au mètre carré (m²)";
        case "KG": return "Au kilogramme (kg)";
        case "LITRE": return "Au litre (L)";
        case "UNITE":
        default:
            return "À l'unité";
    }
};

// GET ALL CATALOG ITEMS FOR COMPANY
export const getCatalogItems = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const cacheKey = `cache:catalog:${companyId}`;

        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return res.status(200).json({
                success: true,
                cached: true,
                data: cached
            });
        }

        let items = await prisma.catalogItem.findMany({
            where: { companyId, isActive: true },
            orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }]
        });

        // Auto-seed default catalog items if company has none yet
        if (items.length === 0) {
            const defaultArticles = [
                {
                    name: "Main d'œuvre diagnostic & recherche de panne",
                    reference: "MO-DIAG-01",
                    defaultPrice: 85.00,
                    tvaRate: 20,
                    type: "SERVICE",
                    unit: "HEURE",
                    description: "Déplacement, contrôle technique des unités intérieure/extérieure et diagnostic de panne."
                },
                {
                    name: "Entretien annuel Climatisation Inverter",
                    reference: "ENT-CLIM-35",
                    defaultPrice: 120.00,
                    tvaRate: 20,
                    type: "SERVICE",
                    unit: "FORFAIT",
                    description: "Nettoyage des filtres, désinfection des échangeurs, vérification des pressions et test d'étanchéité."
                },
                {
                    name: "Filtre climatisation Daikin",
                    reference: "FILTRE-DK-01",
                    defaultPrice: 25.00,
                    tvaRate: 20,
                    type: "PRODUCT",
                    unit: "UNITE",
                    description: "Filtre purificateur d'air haute performance Daikin."
                },
                {
                    name: "Frais de déplacement zone 1 (0-30 km)",
                    reference: "FORFAIT-DEP-Z1",
                    defaultPrice: 45.00,
                    tvaRate: 20,
                    type: "SERVICE",
                    unit: "FORFAIT",
                    description: "Frais de déplacement technicien pour rayon intervention de 30 km."
                },
                {
                    name: "Condenseur climatisation",
                    reference: "COND-CLIM-01",
                    defaultPrice: 420.00,
                    tvaRate: 20,
                    type: "PRODUCT",
                    unit: "UNITE",
                    description: "Condenseur haute performance pour unité extérieure."
                }
            ];

            for (const item of defaultArticles) {
                await prisma.catalogItem.create({
                    data: {
                        companyId,
                        ...item
                    }
                });
            }

            items = await prisma.catalogItem.findMany({
                where: { companyId, isActive: true },
                orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }]
            });
        }

        const formattedItems = items.map(item => ({
            ...item,
            unit: mapItemUnitToString(item.unit)
        }));

        // Cache in Redis for 1 hour (3600s)
        cacheService.set(cacheKey, formattedItems, 3600).catch(() => {});

        return res.status(200).json({
            success: true,
            data: formattedItems
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

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Le nom de l'article est obligatoire"
            });
        }

        const itemType = type || (category && (category.includes("Matériel") || category.includes("marchandises")) ? "PRODUCT" : "SERVICE");
        const price = parseFloat(unitPrice) || 0;
        const tva = parseFloat(tvaRate) || 20;
        const itemUnit = mapStringToItemUnit(unit);

        // Check if existing
        const existing = await prisma.catalogItem.findFirst({
            where: {
                companyId,
                name: { equals: name.trim(), mode: "insensitive" }
            }
        });

        if (existing) {
            const updated = await prisma.catalogItem.update({
                where: { id: existing.id },
                data: {
                    isActive: true,
                    defaultPrice: price > 0 ? price : existing.defaultPrice,
                    reference: reference ? reference.trim() : existing.reference,
                    description: description ? description.trim() : existing.description,
                    tvaRate: tva,
                    type: itemType,
                    unit: itemUnit
                }
            });

            await cacheService.del(`cache:catalog:${companyId}`);

            return res.status(200).json({
                success: true,
                message: "Article mis à jour dans le catalogue",
                data: {
                    ...updated,
                    unit: mapItemUnitToString(updated.unit)
                }
            });
        }

        const newItem = await prisma.catalogItem.create({
            data: {
                companyId,
                name: name.trim(),
                reference: reference ? reference.trim() : null,
                description: description ? description.trim() : null,
                type: itemType,
                defaultPrice: price,
                tvaRate: tva,
                unit: itemUnit
            }
        });

        await cacheService.del(`cache:catalog:${companyId}`);

        return res.status(201).json({
            success: true,
            message: "Article ajouté au catalogue avec succès",
            data: {
                ...newItem,
                unit: mapItemUnitToString(newItem.unit)
            }
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
                ...(unit ? { unit: mapStringToItemUnit(unit) } : {}),
                ...(isFavorite !== undefined ? { isFavorite: Boolean(isFavorite) } : {})
            }
        });

        await cacheService.del(`cache:catalog:${companyId}`);

        return res.status(200).json({
            success: true,
            message: "Article mis à jour",
            data: {
                ...updated,
                unit: mapItemUnitToString(updated.unit)
            }
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

        await cacheService.del(`cache:catalog:${companyId}`);

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
