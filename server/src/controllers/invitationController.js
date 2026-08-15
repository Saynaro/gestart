import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { generateAccessToken, generateRefreshToken, setRefreshCookie } from "../utils/generateToken.js";

////// GET ALL COMPANY INVITATIONS //////
export const getInvitations = async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const invitations = await prisma.invitation.findMany({
            where: {
                companyId,
                status: "PENDING"
            },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            success: true,
            data: { invitations }
        });
    } catch (error) {
        console.error("GET INVITATIONS ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des invitations"
        });
    }
};

////// CREATE AND SEND INVITATION //////
export const createInvitation = async (req, res) => {
    const companyId = req.user.companyId;
    const invitedById = req.user.id;
    const { email, role = "TECHNICIAN" } = req.body;

    const formattedEmail = email ? email.toLowerCase().trim() : null;

    try {
        // 1. Vérification si l'utilisateur existe déjà (si email fourni)
        let existingUser = null;
        if (formattedEmail) {
            existingUser = await prisma.user.findUnique({
                where: { email: formattedEmail }
            });

            if (existingUser && existingUser.companyId === companyId) {
                return res.status(400).json({
                    success: false,
                    message: "Cet utilisateur fait déjà partie de votre entreprise."
                });
            }
        }

        // 2. Vérification des limites de techniciens si le rôle est TECHNICIAN
        if (role.toUpperCase() === "TECHNICIAN") {
            const subscription = await prisma.subscription.findUnique({
                where: { companyId },
                include: { plan: true }
            });

            if (subscription?.plan) {
                const maxTechs = subscription.plan.maxTechnicians;

                if (maxTechs !== -1) {
                    const currentTechsCount = await prisma.user.count({
                        where: { companyId, role: "TECHNICIAN", isActive: true }
                    });

                    if (currentTechsCount >= maxTechs) {
                        return res.status(403).json({
                            success: false,
                            message: `Limite de techniciens atteinte pour votre offre (${maxTechs} max). Veuillez mettre à niveau votre abonnement.`,
                            code: "LIMIT_REACHED"
                        });
                    }
                }
            }
        }

        // 3. Génération du token/code d'invitation lisible (ex: INV-9F2B4A) (expire dans 7 jours)
        const codeSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
        const token = `INV-${codeSuffix}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const inviteEmail = formattedEmail || `invitation-${codeSuffix.toLowerCase()}@gestart.link`;

        // 4. Création/mise à jour de l'invitation
        const invitation = await prisma.invitation.upsert({
            where: {
                companyId_email: {
                    companyId,
                    email: inviteEmail
                }
            },
            update: {
                role: role.toUpperCase(),
                token,
                status: "PENDING",
                invitedById,
                expiresAt,
                acceptedAt: null,
                revokedAt: null
            },
            create: {
                companyId,
                email: inviteEmail,
                role: role.toUpperCase(),
                token,
                status: "PENDING",
                invitedById,
                expiresAt
            }
        });
        if (existingUser) {
            await prisma.notification.create({
                data: {
                    companyId,
                    userId: existingUser.id,
                    type: "IN_APP",
                    channel: "IN_APP",
                    status: "SENT",
                    title: "Invitation d'équipe",
                    body: "Vous avez reçu une invitation pour rejoindre une entreprise en tant que Technicien.",
                    entityType: "invitation",
                    entityId: invitation.id
                }
            }).catch(() => {});
        }

        return res.status(201).json({
            success: true,
            message: existingUser 
                ? "Invitation envoyée directement sur le compte du technicien !"
                : "Invitation créée et envoyée avec succès",
            data: { invitation }
        });
    } catch (error) {
        console.error("CREATE INVITATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de l'invitation"
        });
    }
};

////// REVOKE / DELETE INVITATION //////
export const revokeInvitation = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invitation = await prisma.invitation.findFirst({
            where: { id, companyId }
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation introuvable"
            });
        }

        await prisma.invitation.delete({
            where: { id }
        });

        return res.status(200).json({
            success: true,
            message: "Invitation révoquée et supprimée avec succès",
            data: { id }
        });
    } catch (error) {
        console.error("REVOKE INVITATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la révocation de l'invitation"
        });
    }
};

////// RESEND INVITATION //////
export const resendInvitation = async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const invitation = await prisma.invitation.findFirst({
            where: { id, companyId }
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation introuvable"
            });
        }

        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        const updatedInvitation = await prisma.invitation.update({
            where: { id },
            data: {
                status: "PENDING",
                expiresAt: newExpiresAt,
                revokedAt: null
            }
        });

        return res.status(200).json({
            success: true,
            message: "Invitation renvoyée avec succès",
            data: { invitation: updatedInvitation }
        });
    } catch (error) {
        console.error("RESEND INVITATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du renvoi de l'invitation"
        });
    }
};

////// CHECK INVITATION TOKEN (PUBLIC GET) //////
export const checkInvitationToken = async (req, res) => {
    const { token } = req.params;

    try {
        const invitation = await prisma.invitation.findFirst({
            where: {
                OR: [
                    { token: token },
                    { token: token?.toUpperCase() }
                ]
            },
            include: {
                company: {
                    select: { name: true }
                }
            }
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Lien d'invitation invalide"
            });
        }

        if (invitation.status !== "PENDING" || new Date(invitation.expiresAt) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "L'invitation a expiré ou n'est plus valide"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                email: invitation.email,
                companyName: invitation.company.name,
                role: invitation.role,
                expiresAt: invitation.expiresAt
            }
        });
    } catch (error) {
        console.error("CHECK INVITATION TOKEN ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la vérification de l'invitation"
        });
    }
};

////// ACCEPT INVITATION & CREATE USER ACCOUNT (PUBLIC POST) //////
export const acceptInvitation = async (req, res) => {
    const token = req.params.token || req.body.token || req.body.invitationCode;
    const { firstName, lastName, password, email, phone } = req.body;

    if (!firstName || !lastName || !password) {
        return res.status(400).json({
            success: false,
            message: "Veuillez remplir votre prénom, nom et mot de passe"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: "Le mot de passe doit contenir au moins 8 caractères"
        });
    }

    try {
        const invitation = await prisma.invitation.findFirst({
            where: {
                OR: [
                    { token: token },
                    { token: token?.toUpperCase() }
                ]
            }
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Code ou lien d'invitation invalide"
            });
        }

        if (invitation.status !== "PENDING" || new Date(invitation.expiresAt) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "L'invitation a expiré ou n'est plus valide"
            });
        }

        const finalEmail = (email || invitation.email).toLowerCase().trim();

        // Vérification unicité email si différent
        const existingUser = await prisma.user.findUnique({
            where: { email: finalEmail }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Un compte existe déjà avec cette adresse email"
            });
        }

        // Hash du mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Transaction atomique : création du User + marquage de l'invitation ACCEPTED
        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    companyId: invitation.companyId,
                    email: finalEmail,
                    password: hashedPassword,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone || null,
                    role: invitation.role,
                    emailVerified: true
                }
            });

            await tx.invitation.update({
                where: { id: invitation.id },
                data: {
                    status: "ACCEPTED",
                    acceptedAt: new Date()
                }
            });

            return newUser;
        });

        // Génération des tokens JWT
        const accessToken = generateAccessToken(result.id, result.role, result.companyId);
        const refreshToken = await generateRefreshToken(result.id);

        setRefreshCookie(res, refreshToken);

        return res.status(201).json({
            success: true,
            message: "Compte créé et invitation acceptée avec succès",
            accessToken,
            data: {
                user: {
                    id: result.id,
                    firstName: result.firstName,
                    lastName: result.lastName,
                    email: result.email,
                    role: result.role,
                    companyId: result.companyId
                }
            }
        });
    } catch (error) {
        console.error("ACCEPT INVITATION ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'acceptation de l'invitation"
        });
    }
};

////// GET PENDING COMPANY INVITES FOR CURRENT USER //////
export const getUserPendingCompanyInvites = async (req, res) => {
    const userEmail = req.user.email?.toLowerCase().trim();

    try {
        const invites = await prisma.invitation.findMany({
            where: {
                email: userEmail,
                status: "PENDING",
                expiresAt: { gte: new Date() }
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: { invites }
        });
    } catch (error) {
        console.error("GET USER PENDING INVITES ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des invitations"
        });
    }
};

////// RESPOND TO COMPANY JOIN INVITATION (ACCEPT / REFUSE) //////
export const respondToCompanyInvite = async (req, res) => {
    const userId = req.user.id;
    const { invitationId, action } = req.body; // action: "ACCEPT" | "REFUSE"

    try {
        const invitation = await prisma.invitation.findUnique({
            where: { id: invitationId },
            include: { company: true }
        });

        if (!invitation || invitation.status !== "PENDING") {
            return res.status(404).json({
                success: false,
                message: "Invitation introuvable ou déjà traitée"
            });
        }

        if (action === "ACCEPT") {
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: userId },
                    data: { companyId: invitation.companyId, role: invitation.role }
                }),
                prisma.invitation.update({
                    where: { id: invitationId },
                    data: { status: "ACCEPTED", acceptedAt: new Date() }
                })
            ]);

            const newAccessToken = generateAccessToken(userId, invitation.role, invitation.companyId);

            return res.status(200).json({
                success: true,
                message: `Vous avez rejoint l'entreprise ${invitation.company.name} avec succès !`,
                accessToken: newAccessToken,
                data: {
                    companyName: invitation.company.name,
                    companyId: invitation.companyId
                }
            });
        } else {
            await prisma.invitation.update({
                where: { id: invitationId },
                data: { status: "REVOKED", revokedAt: new Date() }
            });

            return res.status(200).json({
                success: true,
                message: "Invitation refusée"
            });
        }
    } catch (error) {
        console.error("RESPOND TO INVITE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur lors du traitement de l'invitation"
        });
    }
};
