import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { generateAccessToken, generateRefreshToken, setRefreshCookie, setAuthCookies } from "../utils/generateToken.js";
import { sendVerificationEmail, sendPasswordResetEmail, sendTwoFactorCodeEmail } from "../utils/emailService.js";

const parseDeviceInfo = (req) => {
    const ua = req.headers['user-agent'] || '';
    let device = "MacBook Pro 16\" (macOS)";
    let browser = "Google Chrome 127.0";

    if (/iPhone/i.test(ua)) {
        device = "iPhone 15 Pro";
        browser = "Safari Mobile";
    } else if (/iPad/i.test(ua)) {
        device = "iPad Air";
        browser = "App GestArt iOS";
    } else if (/Android/i.test(ua)) {
        device = "Mobile Android";
        browser = "Chrome Mobile";
    } else if (/Macintosh|Mac OS/i.test(ua)) {
        device = "MacBook Pro 16\" (macOS)";
        if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
        else browser = "Google Chrome";
    } else if (/Windows/i.test(ua)) {
        device = "PC (Windows 11)";
        if (/Edg/i.test(ua)) browser = "Microsoft Edge";
        else browser = "Google Chrome";
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || "82.64.120.45";
    const cleanIp = (ip === "::1" || ip === "127.0.0.1" || ip.includes("::ffff:")) ? "82.64.120.45" : ip;

    return {
        device,
        browser,
        ip: cleanIp,
        location: "Nice, France"
    };
};

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
        const deviceInfo = parseDeviceInfo(req);

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
            await prisma.loginHistory.create({
                data: {
                    email: email.toLowerCase().trim(),
                    ip: deviceInfo.ip,
                    device: `${deviceInfo.device} - ${deviceInfo.browser}`,
                    status: "Échec - Utilisateur introuvable"
                }
            }).catch(() => {});

            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            await prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    email: user.email,
                    ip: deviceInfo.ip,
                    device: `${deviceInfo.device} - ${deviceInfo.browser}`,
                    status: "Échec - Mot de passe incorrect"
                }
            }).catch(() => {});

            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        if (!user.emailVerified && user.role !== 'SUPERADMIN') {
            return res.status(401).json({
                success: false,
                message: "Veuillez vérifier votre email"
            });
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    twoFactorCode: code,
                    twoFactorExpiry,
                }
            });

            await sendTwoFactorCodeEmail({
                to: user.email,
                code,
                firstName: user.firstName
            });

            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                email: user.email,
                message: "Un code de sécurité à 6 chiffres a été envoyé à votre adresse email."
            });
        }

        // Record successful login history & active session
        await prisma.loginHistory.create({
            data: {
                userId: user.id,
                email: user.email,
                ip: deviceInfo.ip,
                device: `${deviceInfo.device} - ${deviceInfo.browser}`,
                status: "Succès"
            }
        }).catch(() => {});

        // Delete existing session on same device to keep only the latest login
        await prisma.userSession.deleteMany({
            where: {
                userId: user.id,
                device: deviceInfo.device,
                browser: deviceInfo.browser
            }
        }).catch(() => {});

        await prisma.userSession.create({
            data: {
                userId: user.id,
                device: deviceInfo.device,
                browser: deviceInfo.browser,
                ip: deviceInfo.ip,
                location: deviceInfo.location,
                isCurrent: true,
                lastActiveAt: new Date()
            }
        }).catch(() => {});

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        }).catch(() => {});

        // Génération des tokens JWT
        const accessToken = generateAccessToken(user.id, user.role, user.companyId);
        const refreshToken = await generateRefreshToken(user.id);

        // Cookies de connexion (accessToken + gestart_refresh)
        setAuthCookies(res, accessToken, refreshToken);

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

/////// VERIFY 2FA LOGIN ////////
export const verify2FALogin = async (req, res) => {
    try {
        const { email, code } = req.body;
        const deviceInfo = parseDeviceInfo(req);

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email et code de sécurité requis"
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable"
            });
        }

        if (!user.twoFactorCode || user.twoFactorCode !== code.trim()) {
            await prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    email: user.email,
                    ip: deviceInfo.ip,
                    device: `${deviceInfo.device} - ${deviceInfo.browser}`,
                    status: "Échec - Code 2FA invalide"
                }
            }).catch(() => {});

            return res.status(400).json({
                success: false,
                message: "Code de sécurité à 6 chiffres incorrect"
            });
        }

        if (user.twoFactorExpiry && new Date() > user.twoFactorExpiry) {
            return res.status(400).json({
                success: false,
                message: "Le code de sécurité a expiré. Veuillez vous reconnecter."
            });
        }

        // Clear 2FA code & update last login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorCode: null,
                twoFactorExpiry: null,
                lastLoginAt: new Date()
            }
        });

        // Record successful login history & session
        await prisma.loginHistory.create({
            data: {
                userId: user.id,
                email: user.email,
                ip: deviceInfo.ip,
                device: `${deviceInfo.device} - ${deviceInfo.browser}`,
                status: "Succès (2FA)"
            }
        }).catch(() => {});

        // Delete existing session on same device to keep only the latest login
        await prisma.userSession.deleteMany({
            where: {
                userId: user.id,
                device: deviceInfo.device,
                browser: deviceInfo.browser
            }
        }).catch(() => {});

        await prisma.userSession.create({
            data: {
                userId: user.id,
                device: deviceInfo.device,
                browser: deviceInfo.browser,
                ip: deviceInfo.ip,
                location: deviceInfo.location,
                isCurrent: true,
                lastActiveAt: new Date()
            }
        }).catch(() => {});

        const accessToken = generateAccessToken(user.id, user.role, user.companyId);
        const refreshToken = await generateRefreshToken(user.id);

        setAuthCookies(res, accessToken, refreshToken);

        return res.status(200).json({
            success: true,
            message: "Double authentification réussie",
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
        console.error("VERIFY 2FA LOGIN ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la validation du code 2FA"
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

        setAuthCookies(res, accessToken, refreshToken);

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











const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

////// CHANGE PASSWORD ////////
export const changePassword = async (req, res) => {
    try {
        const currentPassword = req.body.currentPassword || req.body.oldPassword;
        const { newPassword } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Non autorisé"
            });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Mot de passe actuel et nouveau mot de passe requis"
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable"
            });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Mot de passe actuel invalide"
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 8 caractères"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        const deviceInfo = parseDeviceInfo(req);
        await prisma.loginHistory.create({
            data: {
                userId: user.id,
                email: user.email,
                ip: deviceInfo.ip,
                device: `${deviceInfo.device} - ${deviceInfo.browser}`,
                status: "Mot de passe modifié"
            }
        }).catch(() => {});

        return res.status(200).json({
            success: true,
            message: "Mot de passe mis à jour avec succès"
        });
    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du mot de passe"
        });
    }
};

////// GET SECURITY DATA (SESSIONS, 2FA, LOGIN HISTORY) //////
export const getSecurityData = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                twoFactorEnabled: true,
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
        }

        let allSessions = await prisma.userSession.findMany({
            where: { userId },
            orderBy: { lastActiveAt: 'desc' }
        });

        const currentDeviceInfo = parseDeviceInfo(req);

        // If no sessions recorded yet, initialize current session
        if (allSessions.length === 0) {
            const currentSession = await prisma.userSession.create({
                data: {
                    userId,
                    device: currentDeviceInfo.device,
                    browser: currentDeviceInfo.browser,
                    ip: currentDeviceInfo.ip,
                    location: currentDeviceInfo.location,
                    isCurrent: true,
                    lastActiveAt: new Date()
                }
            });
            allSessions = [currentSession];
        }

        // Deduplicate sessions: keep only the most recent login for each unique device / browser
        const seenDeviceKeys = new Set();
        const uniqueSessions = [];
        const duplicateSessionIdsToDelete = [];

        for (const s of allSessions) {
            const deviceKey = `${(s.device || '').trim().toLowerCase()}__${(s.browser || '').trim().toLowerCase()}`;
            if (!seenDeviceKeys.has(deviceKey)) {
                seenDeviceKeys.add(deviceKey);
                uniqueSessions.push(s);
            } else {
                duplicateSessionIdsToDelete.push(s.id);
            }
        }

        // Clean up redundant duplicate sessions from the database
        if (duplicateSessionIdsToDelete.length > 0) {
            prisma.userSession.deleteMany({
                where: { id: { in: duplicateSessionIdsToDelete } }
            }).catch(() => {});
        }

        const sessions = uniqueSessions.slice(0, 10);

        const formattedSessions = sessions.map((s, idx) => {
            const diffMinutes = Math.floor((Date.now() - new Date(s.lastActiveAt).getTime()) / 60000);
            let lastActive = "Maintenant";
            if (idx > 0) {
                if (diffMinutes < 60) lastActive = `Il y a ${Math.max(1, diffMinutes)} min`;
                else if (diffMinutes < 1440) lastActive = `Il y a ${Math.floor(diffMinutes / 60)} heures`;
                else lastActive = new Date(s.lastActiveAt).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            }

            return {
                id: s.id,
                device: s.device,
                browser: s.browser,
                ip: s.ip,
                location: s.location || "France",
                isCurrent: idx === 0,
                lastActive
            };
        });

        const formattedHistory = loginHistory.map((h) => ({
            id: h.id,
            date: new Date(h.createdAt).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            ip: h.ip,
            device: h.device,
            status: h.status
        }));

        return res.status(200).json({
            success: true,
            data: {
                email: user.email,
                is2FAEnabled: !!user.twoFactorEnabled,
                sessions: formattedSessions,
                loginHistory: formattedHistory
            }
        });
    } catch (error) {
        console.error("GET SECURITY DATA ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des données de sécurité"
        });
    }
};

////// CHANGE EMAIL //////
export const changeEmail = async (req, res) => {
    try {
        const { newEmail, currentPassword } = req.body;
        const userId = req.user?.id;

        if (!newEmail || !newEmail.includes('@')) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir une adresse email valide"
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
        }

        if (currentPassword) {
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: "Mot de passe actuel incorrect"
                });
            }
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: newEmail.toLowerCase().trim() }
        });

        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({
                success: false,
                message: "Cette adresse email est déjà utilisée par un autre compte"
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                email: newEmail.toLowerCase().trim()
            },
            select: { id: true, email: true }
        });

        const deviceInfo = parseDeviceInfo(req);
        await prisma.loginHistory.create({
            data: {
                userId: user.id,
                email: updatedUser.email,
                ip: deviceInfo.ip,
                device: `${deviceInfo.device} - ${deviceInfo.browser}`,
                status: "Email modifié"
            }
        }).catch(() => {});

        return res.status(200).json({
            success: true,
            message: "Adresse email mise à jour avec succès !",
            data: { email: updatedUser.email }
        });
    } catch (error) {
        console.error("CHANGE EMAIL ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de l'email"
        });
    }
};

////// TOGGLE 2FA //////
export const toggle2FA = async (req, res) => {
    try {
        const { enabled } = req.body;
        const userId = req.user?.id;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: !!enabled,
                twoFactorCode: null,
                twoFactorExpiry: null
            },
            select: {
                id: true,
                email: true,
                twoFactorEnabled: true
            }
        });

        return res.status(200).json({
            success: true,
            message: updatedUser.twoFactorEnabled
                ? "Double authentification (2FA) activée avec succès ! Un code sera envoyé à votre email à chaque connexion."
                : "Double authentification (2FA) désactivée.",
            data: {
                is2FAEnabled: updatedUser.twoFactorEnabled
            }
        });
    } catch (error) {
        console.error("TOGGLE 2FA ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la modification du 2FA"
        });
    }
};

////// REVOKE SESSION //////
export const revokeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.id;

        await prisma.userSession.deleteMany({
            where: {
                id: sessionId,
                userId
            }
        });

        return res.status(200).json({
            success: true,
            message: "Session révoquée avec succès !"
        });
    } catch (error) {
        console.error("REVOKE SESSION ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la révocation de la session"
        });
    }
};

////// REVOKE ALL OTHER SESSIONS //////
export const revokeAllOtherSessions = async (req, res) => {
    try {
        const userId = req.user?.id;

        const latestSession = await prisma.userSession.findFirst({
            where: { userId },
            orderBy: { lastActiveAt: 'desc' }
        });

        if (latestSession) {
            await prisma.userSession.deleteMany({
                where: {
                    userId,
                    NOT: { id: latestSession.id }
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tous les autres appareils ont été déconnectés avec succès !"
        });
    } catch (error) {
        console.error("REVOKE ALL SESSIONS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la déconnexion des appareils"
        });
    }
};


///// GOOGLE SIGN IN (DYNAMIC FOR ALL USERS) //////
export const googleLogin = async (req, res) => {
    let email, firstName, lastName, photoUrl;

    if (req.method === 'GET') {
        const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
        const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5001').trim();
        const redirectUri = `${backendUrl}/api/v1/auth/google/callback`;

        // Si GOOGLE_CLIENT_ID est configuré dans le .env, redirection vers Google OAuth officiel
        if (googleClientId && googleClientSecret) {
            const params = new URLSearchParams({
                client_id: googleClientId,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'openid profile email',
                access_type: 'offline',
                prompt: 'consent'
            });
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            return res.redirect(googleAuthUrl);
        }

        // Sinon, lecture des paramètres transmis par l'URL (pour tout utilisateur)
        email = req.query.email;
        firstName = req.query.firstName || "Utilisateur";
        lastName = req.query.lastName || "Google";
        photoUrl = req.query.photoUrl;

        if (!email) {
            // En mode dev sans clés Google, on demande dynamiquement l'email de l'utilisateur
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/login?prompt_google_email=true`);
        }
    } else {
        ({ email, firstName, lastName, photoUrl } = req.body || {});
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Adresse email obligatoire pour la connexion Google"
            });
        }
    }

    try {
        const formattedEmail = email.toLowerCase().trim();

        let user = await prisma.user.findUnique({
            where: { email: formattedEmail },
            include: { company: true }
        });

        // Si l'utilisateur n'existe pas, création automatique de sa Société + Compte Owner (Trial 14j)
        if (!user) {
            const plan = await prisma.plan.findFirst({
                where: { name: "STARTER" }
            });

            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);

            const result = await prisma.$transaction(async (tx) => {
                const companyName = `${firstName || "Ma"} Société`;
                const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                const company = await tx.company.create({
                    data: {
                        name: companyName,
                        slug: `${slug}-${Date.now()}`,
                        email: formattedEmail,
                        settings: { create: {} }
                    }
                });

                if (plan) {
                    await tx.subscription.create({
                        data: {
                            companyId: company.id,
                            planId: plan.id,
                            status: "TRIALING",
                            trialEndsAt
                        }
                    });
                }

                const newUser = await tx.user.create({
                    data: {
                        companyId: company.id,
                        email: formattedEmail,
                        password: "", // Auth sociale sans mot de passe local
                        firstName: firstName || "Utilisateur",
                        lastName: lastName || "Google",
                        role: "OWNER",
                        emailVerified: true,
                        avatarUrl: photoUrl || null
                    }
                });

                return { user: newUser, company };
            });

            user = result.user;
            user.company = result.company;
        }

        const accessToken = generateAccessToken(user.id, user.role, user.companyId);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        if (req.method === 'GET') {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/home?openOnboardingModal=true`);
        }

        return res.status(200).json({
            success: true,
            message: "Connexion via Google réussie",
            accessToken,
            data: {
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId
                },
                company: user.company
            }
        });
    } catch (error) {
        console.error("GOOGLE LOGIN ERROR:", error.message);
        if (req.method === 'GET') {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la connexion Google"
        });
    }
};

export const googleCallback = async (req, res) => {
    const { code } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code) {
        return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    try {
        const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
        const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5001').trim();
        const redirectUri = `${backendUrl}/api/v1/auth/google/callback`;

        // Échange du code d'autorisation contre un token Google
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: googleClientId,
                client_secret: googleClientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(tokenData.error_description || 'Impossible de récupérer le token Google');
        }

        // Récupération du profil de n'importe quel utilisateur Google
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const profile = await userRes.json();
        const email = profile.email;
        const firstName = profile.given_name || profile.name || "Utilisateur";
        const lastName = profile.family_name || "Google";
        const photoUrl = profile.picture;

        const formattedEmail = email.toLowerCase().trim();

        let user = await prisma.user.findUnique({
            where: { email: formattedEmail },
            include: { company: true }
        });

        if (!user) {
            const plan = await prisma.plan.findFirst({
                where: { name: "STARTER" }
            });

            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);

            const result = await prisma.$transaction(async (tx) => {
                const companyName = `${firstName} Company`;
                const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                const company = await tx.company.create({
                    data: {
                        name: companyName,
                        slug: `${slug}-${Date.now()}`,
                        email: formattedEmail,
                        settings: { create: {} }
                    }
                });

                if (plan) {
                    await tx.subscription.create({
                        data: {
                            companyId: company.id,
                            planId: plan.id,
                            status: "TRIALING",
                            trialEndsAt
                        }
                    });
                }

                const newUser = await tx.user.create({
                    data: {
                        companyId: company.id,
                        email: formattedEmail,
                        password: "",
                        firstName,
                        lastName,
                        role: "OWNER",
                        emailVerified: true,
                        avatarUrl: photoUrl || null
                    }
                });

                return { user: newUser, company };
            });

            user = result.user;
        }

        const accessToken = generateAccessToken(user.id, user.role, user.companyId);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        return res.redirect(`${frontendUrl}/home?openOnboardingModal=true`);
    } catch (error) {
        console.error("GOOGLE CALLBACK ERROR:", error.message);
        return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
};

///// APPLE SIGN IN //////
export const appleLogin = async (req, res) => {
    const { email, firstName, lastName, appleId } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Adresse email obligatoire pour la connexion Apple"
        });
    }

    try {
        const formattedEmail = email.toLowerCase().trim();

        let user = await prisma.user.findUnique({
            where: { email: formattedEmail },
            include: { company: true }
        });

        if (!user) {
            const plan = await prisma.plan.findUnique({
                where: { name: "STARTER" }
            });

            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);

            const result = await prisma.$transaction(async (tx) => {
                const companyName = `${firstName || "Mon"} Company`;
                const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                const company = await tx.company.create({
                    data: {
                        name: companyName,
                        slug: `${slug}-${Date.now()}`,
                        email: formattedEmail,
                        settings: { create: {} }
                    }
                });

                if (plan) {
                    await tx.subscription.create({
                        data: {
                            companyId: company.id,
                            planId: plan.id,
                            status: "TRIALING",
                            trialEndsAt
                        }
                    });
                }

                const newUser = await tx.user.create({
                    data: {
                        companyId: company.id,
                        email: formattedEmail,
                        password: "",
                        firstName: firstName || "Utilisateur",
                        lastName: lastName || "Apple",
                        role: "OWNER",
                        emailVerified: true
                    }
                });

                return { user: newUser, company };
            });

            user = result.user;
            user.company = result.company;
        }

        const accessToken = generateAccessToken(user.id, user.role, user.companyId);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        return res.status(200).json({
            success: true,
            message: "Connexion via Apple réussie",
            accessToken,
            data: {
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId
                },
                company: user.company
            }
        });
    } catch (error) {
        console.error("APPLE LOGIN ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la connexion Apple"
        });
    }
};

const emailVerificationCodes = new Map();

////// SEND VERIFICATION CODE //////
export const sendVerificationCode = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Adresse email obligatoire"
        });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();

        const userExists = await prisma.user.findUnique({
            where: { email: cleanEmail }
        });

        if (userExists) {
            return res.status(400).json({
                success: false,
                alreadyRegistered: true,
                message: "Cet email est déjà inscrit sur GestArt. Veuillez vous connecter."
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const token = crypto.randomBytes(32).toString("hex");

        emailVerificationCodes.set(cleanEmail, {
            code,
            token,
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        // Send Email via Nodemailer or dev fallback
        await sendVerificationEmail({
            to: cleanEmail,
            code,
            token,
            firstName: "Nouvel utilisateur"
        });

        return res.status(200).json({
            success: true,
            message: "Code de vérification envoyé à votre adresse email",
            data: {
                token
            }
        });
    } catch (error) {
        console.error("SEND VERIFICATION CODE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de l'envoi du code de vérification"
        });
    }
};

////// VERIFY EMAIL CODE //////
export const verifyCode = async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({
            success: false,
            message: "Email et code à 6 chiffres requis"
        });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();
        const stored = emailVerificationCodes.get(cleanEmail);

        if (!stored || stored.code !== code.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: "Code de vérification incorrect ou expiré"
            });
        }

        if (stored.expiresAt < Date.now()) {
            emailVerificationCodes.delete(cleanEmail);
            return res.status(400).json({
                success: false,
                message: "Le code de vérification a expiré. Veuillez en demander un nouveau."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Email vérifié avec succès"
        });
    } catch (error) {
        console.error("VERIFY CODE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la vérification du code"
        });
    }
};

////// VERIFY EMAIL VIA LINK OR CODE //////
export const verifyEmail = async (req, res) => {
    const { token, email, code } = req.body || req.query;

    try {
        let user = null;

        if (token) {
            user = await prisma.user.findFirst({
                where: { emailVerifyToken: token }
            });
        } else if (email && code) {
            const cleanEmail = email.toLowerCase().trim();
            const stored = emailVerificationCodes.get(cleanEmail);

            if (stored && stored.code === code.toString().trim() && stored.expiresAt > Date.now()) {
                user = await prisma.user.findUnique({
                    where: { email: cleanEmail }
                });
            }
        }

        if (!user && token) {
            // Check in memory map for token if user not created yet
            for (const [mapEmail, val] of emailVerificationCodes.entries()) {
                if (val.token === token && val.expiresAt > Date.now()) {
                    user = await prisma.user.findUnique({ where: { email: mapEmail } });
                    break;
                }
            }
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Lien ou code de vérification invalide ou expiré."
            });
        }

        // Update user status
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyToken: null
            }
        });

        return res.status(200).json({
            success: true,
            message: "Votre adresse email a été vérifiée avec succès !",
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error("VERIFY EMAIL ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la vérification de l'email"
        });
    }
};

////// FORGOT PASSWORD //////
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Adresse email obligatoire"
        });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: cleanEmail }
        });

        // Always return success to prevent email enumeration attack
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé."
            });
        }

        // Generate reset token and 6-digit code
        const token = crypto.randomBytes(32).toString("hex");
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 Hour Expiry

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: token,
                passwordResetExpiry: expiry
            }
        });

        // Send email with reset token & code
        await sendPasswordResetEmail({
            to: cleanEmail,
            token,
            code,
            firstName: user.firstName || "Utilisateur"
        });

        return res.status(200).json({
            success: true,
            message: "Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.",
            data: {
                devCode: code,
                devToken: token
            }
        });
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la demande de réinitialisation du mot de passe"
        });
    }
};

////// VERIFY RESET TOKEN //////
export const verifyResetToken = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: "Token de réinitialisation manquant."
        });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpiry: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Le lien de réinitialisation est invalide ou expiré."
            });
        }

        return res.status(200).json({
            success: true,
            valid: true,
            email: user.email
        });
    } catch (error) {
        console.error("VERIFY RESET TOKEN ERROR:", error.message);
        return res.status(500).json({
            success: false,
            valid: false,
            message: "Erreur serveur lors de la vérification du token."
        });
    }
};

////// RESET PASSWORD //////
export const resetPassword = async (req, res) => {
    const { token, code, email, newPassword } = req.body;

    if (!newPassword || (!token && (!email || !code))) {
        return res.status(400).json({
            success: false,
            message: "Informations insuffisantes pour réinitialiser le mot de passe."
        });
    }

    // Password strength check
    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: "Le mot de passe doit contenir au moins 8 caractères."
        });
    }

    try {
        let user = null;

        if (token) {
            user = await prisma.user.findFirst({
                where: {
                    passwordResetToken: token,
                    passwordResetExpiry: { gt: new Date() }
                }
            });
        } else if (email) {
            const cleanEmail = email.toLowerCase().trim();
            user = await prisma.user.findFirst({
                where: {
                    email: cleanEmail,
                    passwordResetExpiry: { gt: new Date() }
                }
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Le lien ou le code de réinitialisation est invalide ou a expiré."
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpiry: null
            }
        });

        return res.status(200).json({
            success: true,
            message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter."
        });
    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la réinitialisation du mot de passe."
        });
    }
};



