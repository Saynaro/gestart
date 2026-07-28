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
                    emailVerified: true,
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





/////// LOGIN ////////
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Veuillez saisir votre email et mot de passe"
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        if (!user.emailVerified) {
            return res.status(401).json({
                success: false,
                message: "Veuillez vérifier votre email"
            });
        }

        // Génération des tokens JWT
        const accessToken = generateAccessToken(user.id, user.role, user.companyId);
        const refreshToken = await generateRefreshToken(user.id);

        // Cookie de rafraîchissement
        setRefreshCookie(res, refreshToken);

        // Réponse réussie
        res.status(200).json({
            success: true,
            message: "Connexion réussie",
            accessToken,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    emailVerified: user.emailVerified,
                },
                company: {
                    id: user.companyId,
                },
            },
        });
    } catch (error) {
        console.error("Erreur lors de la connexion :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la connexion",
        });
    }
};




////// LOGOUT ///////
export const logout = async (req, res) => {
    try {
        const token = req.cookies?.gestart_refresh;

        if (token) {
            // jwt.decode extrait le payload même si le token est expiré
            const decoded = jwt.decode(token);

            if (decoded?.id) {
                const user = await prisma.user.findUnique({
                    where: { id: decoded.id },
                    select: { refreshTokenHash: true },
                });

                if (user?.refreshTokenHash) {
                    const match = await bcrypt.compare(token, user.refreshTokenHash);
                    if (match) {
                        await prisma.user.update({
                            where: { id: decoded.id },
                            data: { refreshTokenHash: null },
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Erreur lors de la déconnexion :", error.message);
    } finally {
        res.clearCookie("gestart_refresh", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Déconnexion réussie",
        });
    }
};




////// REFRESH TOKEN ///////
export const refresh = async (req, res) => {
    const token = req.cookies?.gestart_refresh;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Pas de token de rafraîchissement"
        });
    }

    try {
        // 1. Vérifier la signature et l'expiration du token avec JWT_REFRESH_SECRET
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        // 2. Récupérer l'utilisateur en BDD
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                role: true,
                companyId: true,
                refreshTokenHash: true,
            }
        });

        if (!user || !user.refreshTokenHash) {
            return res.status(401).json({
                success: false,
                message: "Utilisateur introuvable ou session expirée"
            });
        }

        // 3. Comparer le token reçu avec le hash en BDD
        const match = await bcrypt.compare(token, user.refreshTokenHash);
        if (!match) {
            return res.status(401).json({
                success: false,
                message: "Token invalide"
            });
        }

        // 4. Générer un nouvel Access Token et renouveler le Refresh Token (Rotation)
        const accessToken = generateAccessToken(user.id, user.role, user.companyId);
        const refreshToken = await generateRefreshToken(user.id);

        setRefreshCookie(res, refreshToken);

        return res.status(200).json({
            success: true,
            message: "Refresh token réussi",
            accessToken,
            data: {
                user: {
                    id: user.id,
                    role: user.role,
                }
            }
        });
    } catch (error) {
        console.error("REFRESH ERROR:", error.message);
        return res.status(401).json({
            success: false,
            message: "Refresh token invalide ou expiré"
        });
    }
};