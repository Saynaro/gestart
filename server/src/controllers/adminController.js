import { prisma } from "../config/db.js";

/**
 * GET /api/v1/admin/stats
 * Global real statistics across the platform
 */
export const getAdminStats = async (req, res) => {
    try {
        const [
            totalCompanies,
            totalUsers,
            totalTechnicians,
            totalClients,
            totalDevis,
            totalFactures,
            invoices,
            subscriptions,
            payments
        ] = await Promise.all([
            prisma.company.count(),
            prisma.user.count(),
            prisma.user.count({ where: { role: "TECHNICIAN" } }),
            prisma.client.count(),
            prisma.quote.count(),
            prisma.invoice.count(),
            prisma.invoice.findMany({
                select: { amountTTC: true }
            }),
            prisma.subscription.findMany({
                include: { plan: true }
            }),
            prisma.payment.findMany({
                where: { status: "succeeded" },
                select: { amount: true, createdAt: true, paidAt: true }
            })
        ]);

        const totalUserTurnover = invoices.reduce((acc, inv) => acc + (Number(inv.amountTTC || inv.amountHT || 0)), 0);

        const now = new Date();

        // Valid active subscriptions (status === ACTIVE && (no currentPeriodEnd OR currentPeriodEnd > now))
        const validActiveSubscriptions = subscriptions.filter(s => {
            if (s.status !== "ACTIVE") return false;
            if (s.currentPeriodEnd && new Date(s.currentPeriodEnd) <= now) return false;
            return true;
        });

        // Valid trial subscriptions (status === TRIALING && (no trialEndsAt OR trialEndsAt > now))
        const validTrialSubscriptions = subscriptions.filter(s => {
            if (s.status !== "TRIALING") return false;
            if (s.trialEndsAt && new Date(s.trialEndsAt) <= now) return false;
            return true;
        });

        const activeSubscriptions = validActiveSubscriptions.length;
        const trialSubscriptions = validTrialSubscriptions.length;

        // MRR calculation based strictly on valid active subscriptions
        const mrrSaaS = validActiveSubscriptions.reduce((acc, s) => {
            const price = s.plan?.priceMonthly ?? (s.plan?.name === "UNLIMITED" ? 149 : s.plan?.name === "STARTER" ? 39 : 89);
            return acc + price;
        }, 0);

        // Total payments collected
        const totalSaaSRevenue = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

        // Monthly breakdown for current year
        const currentYear = new Date().getFullYear();
        const monthNames = [
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
        ];
        const currentMonthIdx = new Date().getMonth();

        const monthlyIncomeData = monthNames.map((name, idx) => {
            const monthPayments = payments.filter(p => {
                const d = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
                return d.getFullYear() === currentYear && d.getMonth() === idx;
            });
            const total = monthPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            
            // If current month or future, use recorded payments or active MRR if payments are 0
            const displayTotal = total > 0 ? total : (idx === currentMonthIdx ? mrrSaaS : 0);
            const paidUsers = total > 0 ? monthPayments.length : (idx === currentMonthIdx ? activeSubscriptions : 0);

            return {
                month: `${name} ${currentYear}`,
                total: displayTotal,
                paidUsers
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                totalCompanies,
                totalUsers,
                totalTechnicians,
                totalClients,
                totalDevis,
                totalFactures,
                totalUserTurnover,
                activeSubscriptions,
                trialSubscriptions,
                mrrSaaS,
                totalSaaSRevenue: totalSaaSRevenue > 0 ? totalSaaSRevenue : mrrSaaS,
                monthlyIncomeData
            }
        });
    } catch (error) {
        console.error("ADMIN GET STATS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des statistiques globales"
        });
    }
};

/**
 * GET /api/v1/admin/companies
 * Get all companies with real related CRM data
 */
export const getAdminCompanies = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        role: true,
                        isActive: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: "asc" }
                },
                subscription: {
                    include: {
                        plan: true,
                        payments: {
                            where: { status: "succeeded" }
                        }
                    }
                },
                _count: {
                    select: {
                        clients: true,
                        quotes: true,
                        invoices: true,
                        users: true
                    }
                },
                invoices: {
                    select: { amountTTC: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const now = new Date();

        const formatted = companies.map((c) => {
            const owner = c.users.find(u => u.role === "OWNER" || u.role === "SUPERADMIN") || c.users[0] || {};
            const techCount = c.users.filter(u => u.role === "TECHNICIAN").length;
            const isBlocked = c.users.some(u => !u.isActive);

            const planName = c.subscription?.plan?.name || "PRO";
            const monthlyPrice = c.subscription?.plan?.priceMonthly ?? (planName === "UNLIMITED" ? 149 : planName === "STARTER" ? 39 : 89);
            const userTurnover = c.invoices.reduce((acc, inv) => acc + (Number(inv.amountTTC || inv.amountHT || 0)), 0);

            let totalPaidToSaaS = (c.subscription?.payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

            // Calculate precise status
            let status = "Active";
            let trialDaysLeft = 0;

            if (isBlocked) {
                status = "Blocked";
            } else if (!c.subscription) {
                status = "Expired";
            } else {
                const sub = c.subscription;
                const isTrialValid = sub.status === "TRIALING" && (!sub.trialEndsAt || new Date(sub.trialEndsAt) > now);
                const isActiveValid = sub.status === "ACTIVE" && (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > now);

                if (isTrialValid) {
                    status = "Trial";
                    if (sub.trialEndsAt) {
                        const diffMs = new Date(sub.trialEndsAt).getTime() - now.getTime();
                        trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    }
                } else if (isActiveValid) {
                    status = "Active";
                    if (totalPaidToSaaS === 0) {
                        totalPaidToSaaS = monthlyPrice;
                    }
                } else {
                    // Subscription has expired (either EXPIRED, CANCELLED, PAST_DUE, or past end date)
                    status = "Expired";
                }
            }

            const renewsDate = c.subscription?.currentPeriodEnd || c.subscription?.trialEndsAt;

            return {
                id: c.id,
                name: c.name || "Entreprise",
                siret: c.siret || "",
                phone: c.phone || owner.phone || "Non renseigné",
                email: c.email || owner.email || "Non renseigné",
                ownerName: `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email || "Propriétaire",
                ownerEmail: owner.email || c.email || "",
                ownerPhone: owner.phone || c.phone || "",
                ownerId: owner.id || null,
                plan: planName,
                planStatus: c.subscription?.status || "EXPIRED",
                monthlyPrice,
                status,
                techniciansCount: techCount,
                clientsCount: c._count.clients,
                devisCount: c._count.quotes,
                facturesCount: c._count.invoices,
                userTurnover,
                paidToSaaS: totalPaidToSaaS,
                date: c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "",
                renewsAt: renewsDate ? new Date(renewsDate).toLocaleDateString("fr-FR") : "—",
                trialDaysLeft
            };
        });

        return res.status(200).json({
            success: true,
            data: { companies: formatted }
        });
    } catch (error) {
        console.error("ADMIN GET COMPANIES ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des entreprises"
        });
    }
};

/**
 * PUT /api/v1/admin/companies/:id
 * Update company, owner details, plan or active status
 */
export const updateAdminCompany = async (req, res) => {
    const { id } = req.params;
    const { 
        name, 
        phone, 
        email, 
        siret, 
        ownerName, 
        ownerEmail, 
        ownerPhone, 
        plan, 
        status 
    } = req.body;

    try {
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                users: true,
                subscription: true
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Entreprise introuvable"
            });
        }

        // 1. Update company table fields
        const companyUpdateData = {};
        if (name) companyUpdateData.name = name.trim();
        if (phone !== undefined) companyUpdateData.phone = phone ? phone.trim() : null;
        if (email !== undefined) companyUpdateData.email = email ? email.trim() : null;
        if (siret !== undefined) companyUpdateData.siret = siret ? siret.trim() : null;

        if (Object.keys(companyUpdateData).length > 0) {
            await prisma.company.update({
                where: { id },
                data: companyUpdateData
            });
        }

        // 2. Update owner user fields
        const owner = company.users.find(u => u.role === "OWNER" || u.role === "SUPERADMIN") || company.users[0];
        if (owner) {
            const userUpdateData = {};
            if (ownerName) {
                const parts = ownerName.trim().split(" ");
                userUpdateData.firstName = parts[0] || "";
                userUpdateData.lastName = parts.slice(1).join(" ") || "";
            }
            if (ownerEmail && ownerEmail.trim()) userUpdateData.email = ownerEmail.trim().toLowerCase();
            if (ownerPhone !== undefined) userUpdateData.phone = ownerPhone ? ownerPhone.trim() : null;

            if (status === "Blocked") {
                userUpdateData.isActive = false;
            } else if (status === "Active" || status === "Trial" || status === "Expired") {
                userUpdateData.isActive = true;
            }

            if (Object.keys(userUpdateData).length > 0) {
                await prisma.user.update({
                    where: { id: owner.id },
                    data: userUpdateData
                });
            }

            // Also update all users in company if blocked/unblocked
            if (status === "Blocked") {
                await prisma.user.updateMany({
                    where: { companyId: id },
                    data: { isActive: false }
                });
            } else if (status === "Active" || status === "Trial" || status === "Expired") {
                await prisma.user.updateMany({
                    where: { companyId: id },
                    data: { isActive: true }
                });
            }
        }

        // 3. Update subscription / Plan
        if (plan) {
            const targetPlan = await prisma.plan.findFirst({
                where: { name: plan.toUpperCase() }
            }) || await prisma.plan.findFirst();

            if (targetPlan) {
                let subStatus = "ACTIVE";
                let newCurrentPeriodEnd = undefined;
                let newTrialEndsAt = undefined;

                if (status === "Trial") {
                    subStatus = "TRIALING";
                    newTrialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                } else if (status === "Blocked" || status === "Expired") {
                    subStatus = status === "Blocked" ? "PAST_DUE" : "EXPIRED";
                } else if (status === "Active") {
                    subStatus = "ACTIVE";
                    newCurrentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                }

                if (company.subscription) {
                    await prisma.subscription.update({
                        where: { id: company.subscription.id },
                        data: {
                            planId: targetPlan.id,
                            status: subStatus,
                            ...(newCurrentPeriodEnd !== undefined && { currentPeriodEnd: newCurrentPeriodEnd }),
                            ...(newTrialEndsAt !== undefined && { trialEndsAt: newTrialEndsAt })
                        }
                    });
                } else {
                    await prisma.subscription.create({
                        data: {
                            companyId: id,
                            planId: targetPlan.id,
                            status: subStatus,
                            currentPeriodEnd: newCurrentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            trialEndsAt: newTrialEndsAt
                        }
                    });
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Entreprise mise à jour avec succès"
        });
    } catch (error) {
        console.error("ADMIN UPDATE COMPANY ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la modification de l'entreprise"
        });
    }
};

/**
 * DELETE /api/v1/admin/companies/:id
 * Delete company and all associated records in database
 */
export const deleteAdminCompany = async (req, res) => {
    const { id } = req.params;

    try {
        const company = await prisma.company.findUnique({
            where: { id }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Entreprise introuvable"
            });
        }

        await prisma.company.delete({
            where: { id }
        });

        return res.status(200).json({
            success: true,
            message: "Entreprise et données associées supprimées avec succès"
        });
    } catch (error) {
        console.error("ADMIN DELETE COMPANY ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de la suppression de l'entreprise"
        });
    }
};

/**
 * POST /api/v1/admin/companies/:id/toggle-status
 * Toggle company blocked / active state
 */
export const toggleCompanyStatus = async (req, res) => {
    const { id } = req.params;

    try {
        const company = await prisma.company.findUnique({
            where: { id },
            include: { users: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Entreprise introuvable"
            });
        }

        const currentlyBlocked = company.users.some(u => !u.isActive);
        const nextIsActive = currentlyBlocked ? true : false;

        await prisma.user.updateMany({
            where: { companyId: id },
            data: { isActive: nextIsActive }
        });

        return res.status(200).json({
            success: true,
            status: nextIsActive ? "Active" : "Blocked",
            message: nextIsActive ? "Entreprise débloquée" : "Entreprise bloquée"
        });
    } catch (error) {
        console.error("ADMIN TOGGLE STATUS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors du changement de statut de l'entreprise"
        });
    }
};

/**
 * GET /api/v1/admin/activities
 * Live activity feed for Super Admin (new companies, payments, support messages)
 */
export const getAdminActivities = async (req, res) => {
    try {
        const [recentCompanies, recentPayments] = await Promise.all([
            prisma.company.findMany({
                take: 40,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    createdAt: true,
                    subscription: {
                        select: {
                            status: true,
                            plan: { select: { displayName: true } }
                        }
                    },
                    users: {
                        where: { role: "OWNER" },
                        select: { firstName: true, lastName: true, email: true, phone: true },
                        take: 1
                    }
                }
            }),
            prisma.payment.findMany({
                take: 40,
                orderBy: { createdAt: "desc" },
                include: {
                    subscription: {
                        include: {
                            company: { select: { id: true, name: true, email: true } },
                            plan: { select: { displayName: true } }
                        }
                    }
                }
            })
        ]);

        const activities = [];

        recentCompanies.forEach(c => {
            const owner = c.users[0];
            activities.push({
                id: `comp_${c.id}`,
                type: "NEW_COMPANY",
                title: "Nouvelle entreprise inscrite",
                details: `${c.name} (${owner ? `${owner.firstName} ${owner.lastName}` : c.email})`,
                companyName: c.name,
                ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : null,
                ownerEmail: owner?.email || c.email,
                companyId: c.id,
                plan: c.subscription?.plan?.displayName || "Starter",
                timestamp: c.createdAt
            });
        });

        recentPayments.forEach(p => {
            activities.push({
                id: `pay_${p.id}`,
                type: "NEW_PAYMENT",
                title: "Paiement abonnement SaaS",
                details: `${p.subscription?.company?.name || "Entreprise"} - ${p.amount} € (${p.subscription?.plan?.displayName || "Pro"})`,
                companyName: p.subscription?.company?.name || "Entreprise",
                companyId: p.subscription?.company?.id,
                plan: p.subscription?.plan?.displayName || "Pro",
                amount: p.amount,
                timestamp: p.paidAt || p.createdAt
            });
        });

        // Sort descending by date
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return res.status(200).json({
            success: true,
            data: activities
        });
    } catch (err) {
        console.error("ADMIN ACTIVITIES ERROR:", err);
        return res.status(500).json({ success: false, message: "Erreur lors de la récupération des activités." });
    }
};

