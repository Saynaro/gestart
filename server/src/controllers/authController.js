import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { generateAccessToken, generateRefreshToken, setRefreshCookie } from "../utils/generateToken.js";

//// REGISTER //////

export const register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            companyName,
            tradeCategories, // Array of TradeCategory IDs or slugs
            planName = "STARTER", // "STARTER", "PRO", "UNLIMITED"
            phone,
            legalForm,
            vatNumber,
            zipCode,
            city,
            website,
            logo,
        } = req.body;

        // 1. Validation des champs obligatoires (Étape 1 & Étape 2 du PRD)
        if (!firstName || !lastName || !email || !password || !companyName) {
            return res.status(400).json({
                success: false,
                message: "Veuillez remplir tous les champs obligatoires (prénom, nom, email, mot de passe, nom de la société)",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 8 caractères",
            });
        }

        // 2. Vérification unicité email
        const userExists = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "Cet email est déjà utilisé",
            });
        }

        // 3. Hash du mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Token de vérification email
        const emailVerifyToken = crypto.randomBytes(32).toString("hex");

        // 5. Recherche du Plan sélectionné (ou Plan par défaut STARTER)
        const selectedPlan = await prisma.plan.findFirst({
            where: {
                name: planName.toUpperCase(),
            },
        }) || await prisma.plan.findFirst({
            where: { name: "STARTER" },
        });

        // 6. Transaction atomique : Company + Subscription (Trial 14j) + CompanySettings + User (OWNER)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // Trial 14 jours

        const result = await prisma.$transaction(async (tx) => {
            // Création de la Société
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    legalForm: legalForm || "SAS",
                    phone: phone || null,
                    email: email.toLowerCase().trim(),
                    tvaNumber: vatNumber || null,
                    postalCode: zipCode || null,
                    city: city || null,
                    website: website || null,
                    logoUrl: logo || null,
                    settings: {
                        create: {}, // Création automatique des paramètres par défaut
                    },
                    tradeCategories: Array.isArray(tradeCategories) && tradeCategories.length > 0
                        ? {
                            create: tradeCategories.map((catId) => ({
                                tradeCategory: {
                                    connectOrCreate: {
                                        where: { id: catId },
                                        create: {
                                            id: catId,
                                            name: catId,
                                            slug: catId.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                                        },
                                    },
                                },
                            })),
                        }
                        : undefined,
                },
            });

            // Création de l'Abonnement Trial (14 jours)
            let subscription = null;
            if (selectedPlan) {
                subscription = await tx.subscription.create({
                    data: {
                        companyId: company.id,
                        planId: selectedPlan.id,
                        status: "TRIALING",
                        cycle: "MONTHLY",
                        trialEndsAt: trialEndDate,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: trialEndDate,
                    },
                });
            }

            // Création de l'Utilisateur (OWNER)
            const user = await tx.user.create({
                data: {
                    companyId: company.id,
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone || null,
                    role: "OWNER",
                    emailVerifyToken: emailVerifyToken,
                    emailVerified: false,
                },
            });

            return { company, user, subscription };
        });

        const { company, user, subscription } = result;

        // 7. Génération des tokens JWT & cookie
        const accessToken = generateAccessToken(user.id, user.role, company.id);
        const refreshToken = await generateRefreshToken(user.id);

        setRefreshCookie(res, refreshToken);

        // 8. Réponse réussie avec données nécessaires au frontend
        return res.status(201).json({
            success: true,
            message: "Compte créé avec succès. Essai gratuit de 14 jours activé.",
            accessToken,
            data: {
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    emailVerified: user.emailVerified,
                },
                company: {
                    id: company.id,
                    name: company.name,
                },
                subscription: subscription ? {
                    planName: selectedPlan?.displayName || planName,
                    status: subscription.status,
                    trialEndsAt: subscription.trialEndsAt,
                } : null,
            },
        });
    } catch (error) {
        console.error("Erreur lors de l'inscription :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'inscription",
        });
    }
};
