import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
    Wrench,
    UserPlus,
    Users,
    Mail,
    Copy,
    Check,
    Share2,
    MessageSquare,
    Send,
    Phone,
    Shield,
    Trash2,
    RefreshCw,
    X,
    ExternalLink,
    Star,
    CheckCircle2,
    AlertTriangle,
    Lock
} from "lucide-react";
import ToastNotification from "../components/ToastNotification";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import PullToRefresh from "../components/PullToRefresh";
import { apiFetch } from "../utils/api";
import { useSubscription } from "../utils/useSubscription";
import { useUser } from "../utils/useUser";
import FeatureLockBanner from "../components/FeatureLockBanner";
import PlanLimitBanner from "../components/PlanLimitBanner";
import StripeCheckoutModal from "../SettingsPage/components/StripeCheckoutModal";
import TechnicianDetailModal from "./components/TechnicianDetailModal";
import "./TechniciensPage.css";

export default function TechniciensPage() {
    const { role } = useUser();
    const isTechnician = role === "TECHNICIAN";
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // State Data
    const [technicians, setTechnicians] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTechnician, setSelectedTechnician] = useState(null);

    // Toast State
    const [toast, setToast] = useState({ show: false, message: "", isError: false });
    const triggerToast = (message, isError = false) => {
        setToast({ show: true, message, isError, id: Date.now() });
    };

    // Modal State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [createdInvite, setCreatedInvite] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {
        isStarter,
        isPro,
        isUnlimited,
        subscription,
        displayName,
        refreshSubscription,
        isExpired,
        isTechLimitReached,
        isTechLimitWarning,
        techsCurrent,
        techsMax,
        triggerUpgrade
    } = useSubscription();

    // Fetch Technicians & Invitations from API in parallel
    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const [usersData, invData] = await Promise.all([
                apiFetch("/v1/users"),
                apiFetch("/v1/invitations")
            ]);

            const userList = usersData.data?.users || usersData.users || (Array.isArray(usersData) ? usersData : []);
            const techs = userList.filter(u => u.role === "TECHNICIAN" || u.role === "MANAGER" || u.role === "OWNER");
            setTechnicians(techs);

            const invList = invData.data?.invitations || invData.invitations || [];
            setInvitations(invList);
        } catch (err) {
            console.warn("Erreur chargement techniciens:", err.message);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Create Invitation Handler
    const handleCreateInvitation = async (e) => {
        e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour inviter de nouveaux techniciens, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setIsSubmitting(true);
        try {
            const body = inviteEmail ? { email: inviteEmail, role: "TECHNICIAN" } : { role: "TECHNICIAN" };
            const res = await apiFetch("/v1/invitations", {
                method: "POST",
                body: JSON.stringify(body)
            });

            const newInv = res.data?.invitation || res.invitation;
            if (newInv) {
                setCreatedInvite(newInv);
                triggerToast("Invitation créée avec succès !");
                loadData();
            }
        } catch (err) {
            if (err.message && (err.message.includes("Limite") || err.message.includes("limite") || err.code === "LIMIT_REACHED")) {
                setShowInviteModal(false);
                window.dispatchEvent(new CustomEvent('open_upgrade_modal', {
                    detail: {
                        reason: "technicians",
                        title: "Limite de techniciens atteinte",
                        description: err.message,
                        targetPlan: "UNLIMITED"
                    }
                }));
                return;
            }
            triggerToast(err.message || "Erreur lors de la création de l'invitation", true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Revoke Invitation State & Handler
    const [inviteToRevoke, setInviteToRevoke] = useState(null);
    const [isRevokingInvite, setIsRevokingInvite] = useState(false);

    const handleConfirmRevokeInvite = async () => {
        if (!inviteToRevoke) return;
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour révoquer une invitation, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setIsRevokingInvite(true);
        try {
            setInvitations(prev => prev.filter(inv => inv.id !== inviteToRevoke.id));
            await apiFetch(`/v1/invitations/${inviteToRevoke.id}`, { method: "DELETE" });
            triggerToast("Invitation révoquée avec succès");
            setInviteToRevoke(null);
            loadData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la révocation", true);
            loadData();
        } finally {
            setIsRevokingInvite(false);
        }
    };

    // Delete Technician State & Handler
    const [techToDelete, setTechToDelete] = useState(null);
    const [isDeletingTech, setIsDeletingTech] = useState(false);

    // Lock background scroll when any modal is open on mobile or desktop
    useEffect(() => {
        const isModalOpen = showInviteModal || !!techToDelete || !!inviteToRevoke;
        if (!isModalOpen) return;

        const scrollY = window.scrollY;
        const prevPosition = document.body.style.position;
        const prevTop = document.body.style.top;
        const prevWidth = document.body.style.width;
        const prevOverflow = document.body.style.overflow;

        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = "100%";
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.position = prevPosition;
            document.body.style.top = prevTop;
            document.body.style.width = prevWidth;
            document.body.style.overflow = prevOverflow;
            window.scrollTo(0, scrollY);
        };
    }, [showInviteModal, techToDelete, inviteToRevoke]);

    const handleDeleteTechnician = async () => {
        if (!techToDelete) return;
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour supprimer un technicien, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setIsDeletingTech(true);
        try {
            await apiFetch(`/v1/users/${techToDelete.id}`, {
                method: "DELETE"
            });
            const displayName = `${techToDelete.firstName || ''} ${techToDelete.lastName || ''}`.trim() || techToDelete.email;
            triggerToast(`Technicien "${displayName}" supprimé avec succès`);
            setTechToDelete(null);
            loadData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la suppression du technicien", true);
        } finally {
            setIsDeletingTech(false);
        }
    };

    const activeTechsCount = technicians.filter(t => t.role === "TECHNICIAN" && t.isActive !== false).length;
    const pendingInvitesCount = invitations.filter(i => i.status === "PENDING").length;

    // Helper URLs
    const getShareableUrl = (token) => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/register?invitation=${token}`;
    };

    const handleCopyUrl = (url) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        triggerToast("Lien d'inscription copié dans le presse-papier !");
        setTimeout(() => setCopied(false), 3000);
    };

    const getWhatsAppShareUrl = (url, code) => {
        const text = `Bonjour, rejoignez notre équipe sur GestArt en tant que technicien ! Cliquez sur ce lien pour vous inscrire : ${url} (Code d'invitation : ${code})`;
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
    };

    const getSmsShareUrl = (url, code) => {
        const text = `Rejoignez l'équipe sur GestArt. Lien d'inscription: ${url} Code: ${code}`;
        return `sms:?body=${encodeURIComponent(text)}`;
    };

    const getMailShareUrl = (email, url, code) => {
        const subject = "Invitation à rejoindre l'équipe GestArt";
        const body = `Bonjour,\n\nVous êtes invité(e) à rejoindre notre société sur GestArt en tant que technicien.\n\nCliquez sur ce lien pour vous inscrire : ${url}\n\nCode d'invitation : ${code}\n\nCordialement,`;
        return `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleOpenInviteModal = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour inviter de nouveaux techniciens, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        if (isStarter) {
            triggerUpgrade({
                reason: "technicians",
                title: "Passez à l'offre Pro ou Unlimited",
                description: "L'invitation de techniciens et de collaborateurs est disponible à partir du plan Pro.",
                targetPlan: "PRO"
            });
            return;
        }

        const maxTechs = techsMax !== -1 ? techsMax : (subscription?.plan?.maxTechnicians ?? 5);
        const currentTechsCount = techsCurrent || technicians.filter(t => t.role === "TECHNICIAN" || !t.role).length;
        if (!isUnlimited && maxTechs !== -1 && (isTechLimitReached || currentTechsCount >= maxTechs)) {
            triggerUpgrade({
                reason: "technicians",
                title: "Développez votre équipe sans limite",
                description: `Votre plan ${displayName || "actuel"} permet de gérer jusqu'à ${maxTechs} technicien(s). Passez à Unlimited pour ajouter une équipe illimitée et accélérer vos interventions.`,
                targetPlan: "UNLIMITED"
            });
            return;
        }

        setCreatedInvite(null);
        setInviteEmail("");
        setShowInviteModal(true);
    };

    return (
        <div className="home-page techniciens-page">
            <SideBar 
                activePath="/techniciens" 
                onFabClick={handleOpenInviteModal}
                hideFab={isTechnician || showInviteModal || !!techToDelete || !!inviteToRevoke || showUpgradeModal || !!selectedTechnician}
            />
            <div className="main-content">
                <Header />
                <PullToRefresh onRefresh={loadData} disabled={showInviteModal || !!techToDelete || !!inviteToRevoke || showUpgradeModal || !!selectedTechnician}>
                    <motion.main 
                        className="page-content techniciens-content"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >

                    {/* Toast Alert - Centered Top */}
                    <ToastNotification toast={toast.show ? toast : null} onClose={() => setToast({ show: false, message: "", isError: false })} />

                    {/* Page Header */}
                    <div className="techniciens-header-row">
                        <div className="techniciens-title-group">
                            <h1>Techniciens & Équipe</h1>
                            <p>Gérez les accès et invitez de nouveaux membres dans votre entreprise.</p>
                        </div>
                        <button
                            className="btn-invite-tech"
                            onClick={handleOpenInviteModal}
                            style={isExpired || isTechLimitReached ? { opacity: 0.9 } : {}}
                        >
                            {isExpired || isTechLimitReached ? <Lock size={18} /> : isStarter ? <Star size={18} fill="currentColor" /> : <UserPlus size={18} />}
                            {isExpired ? "Inviter un technicien" : isStarter ? "Inviter un technicien (Pro)" : isTechLimitReached ? "Limite atteinte (Unlimited)" : "Inviter un technicien"}
                        </button>
                    </div>

                    {/* Pro Limit & Warning Alert Banner (Pro plan only) */}
                    {!isStarter && (isTechLimitReached || isTechLimitWarning) && (
                        <PlanLimitBanner
                            type="technicians"
                            variant={isTechLimitReached ? "reached" : "warning"}
                            current={techsCurrent || technicians.length}
                            max={techsMax}
                            unit="techniciens"
                            targetPlan="UNLIMITED"
                            customTitle={isTechLimitReached ? "Capacité maximale de techniciens atteinte (5/5)" : "Quota techniciens presque atteint (4/5)"}
                            customDescription={isTechLimitReached ? "Votre offre Pro inclut jusqu'à 5 techniciens. Passez à l'offre Unlimited pour gérer une équipe sans aucune limite." : "Il ne vous reste qu'un seul emplacement de technicien sur votre abonnement Pro."}
                        />
                    )}

                    {/* Pro Paywall / Upgrade Banner if on Starter */}
                    {isStarter && (
                        <FeatureLockBanner
                            title="Gestion d'équipe & multi-techniciens (Offre Pro)"
                            description="Votre formule Starter inclut 1 seul membre (le dirigeant). Pour inviter vos techniciens, leur attribuer des chantiers et suivre leurs rapports en direct, passez à l'offre Pro."
                            features={[
                                "Jusqu'à 10 techniciens inclus dans l'équipe",
                                "App Mobile Techniciens (iOS & Android)",
                                "Signature devis et rapports sur place",
                                "Rappels SMS automatiques des entretiens"
                            ]}
                            targetPlan="PRO"
                        />
                    )}

                    {/* Stats Metric Cards */}
                    <div className="tech-stats-grid">
                        <div className="tech-stat-card">
                            <div className="tech-stat-icon-wrapper green">
                                <Wrench size={22} />
                            </div>
                            <div className="tech-stat-info">
                                <span className="tech-stat-val">{activeTechsCount}</span>
                                <span className="tech-stat-label">Technicien{activeTechsCount > 1 ? 's' : ''} actif{activeTechsCount > 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        <div className="tech-stat-card">
                            <div className="tech-stat-icon-wrapper blue">
                                <Mail size={22} />
                            </div>
                            <div className="tech-stat-info">
                                <span className="tech-stat-val">{pendingInvitesCount}</span>
                                <span className="tech-stat-label">Invitation{pendingInvitesCount > 1 ? 's' : ''} en attente</span>
                            </div>
                        </div>

                        <div className="tech-stat-card">
                            <div className="tech-stat-icon-wrapper purple">
                                <Users size={22} />
                            </div>
                            <div className="tech-stat-info">
                                <span className="tech-stat-val">{isStarter ? "1" : isPro ? "5" : "Illimité"}</span>
                                <span className="tech-stat-label">Capacité ({displayName})</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Technicians Table */}
                    <div className="tech-section-card">
                        <div className="tech-section-header">
                            <h2 className="tech-section-title">
                                <div className="tech-section-title-icon green">
                                    <Wrench size={20} />
                                </div>
                                <span>Membres & Techniciens de l'entreprise ({technicians.length})</span>
                            </h2>
                        </div>

                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
                                {[1, 2, 3].map((i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="skeleton-shimmer" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div className="skeleton-shimmer" style={{ width: `${110 + (i % 2) * 30}px`, height: '15px', borderRadius: '4px' }} />
                                                <div className="skeleton-shimmer" style={{ width: '150px', height: '11px', borderRadius: '4px', opacity: 0.6 }} />
                                            </div>
                                        </div>
                                        <div className="skeleton-shimmer" style={{ width: '70px', height: '22px', borderRadius: '20px' }} />
                                    </div>
                                ))}
                            </div>
                        ) : technicians.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '20px' }}>Aucun technicien enregistré pour le moment.</p>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="tech-table-wrapper tech-desktop-table">
                                    <table className="tech-table">
                                        <thead>
                                            <tr>
                                                <th>Membre</th>
                                                <th>Rôle</th>
                                                <th>Téléphone</th>
                                                <th>Statut</th>
                                                <th>Date d'ajout</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {technicians.map((t) => {
                                                const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;
                                                const initials = `${(t.firstName || 'T')[0]}${(t.lastName || 'E')[0]}`.toUpperCase();
                                                return (
                                                    <tr 
                                                        key={t.id} 
                                                        onClick={() => setSelectedTechnician(t)}
                                                        title="Cliquer pour voir les détails"
                                                    >
                                                        <td>
                                                            <div className="tech-user-row">
                                                                <div className="tech-avatar" style={{ overflow: 'hidden' }}>
                                                                    {t.avatarUrl ? (
                                                                        <img src={t.avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                                                    ) : (
                                                                        initials
                                                                    )}
                                                                </div>
                                                                <div className="tech-user-details">
                                                                    <span className="tech-user-name">{fullName}</span>
                                                                    <span className="tech-user-email">{t.email}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="tech-role-badge">
                                                                {t.role === "OWNER" ? "Propriétaire" : t.role === "MANAGER" ? "Manager" : "Technicien"}
                                                            </span>
                                                        </td>
                                                        <td>{t.phone || "—"}</td>
                                                        <td>
                                                            <span className={`tech-status-badge ${t.isActive !== false ? 'active' : 'pending'}`}>
                                                                <CheckCircle2 size={13} />
                                                                {t.isActive !== false ? "Actif" : "Inactif"}
                                                            </span>
                                                        </td>
                                                        <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : "Récent"}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {t.role === "OWNER" ? (
                                                                <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                                                                    Compte principal
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="btn-delete-tech-row"
                                                                    title="Supprimer ce technicien"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isExpired) {
                                                                            window.dispatchEvent(new CustomEvent('subscription_expired', {
                                                                                detail: { message: "Votre abonnement a expiré. Pour modifier l'équipe, veuillez renouveler votre abonnement." }
                                                                            }));
                                                                            return;
                                                                        }
                                                                        setTechToDelete(t);
                                                                    }}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards View */}
                                <div className="tech-mobile-cards">
                                    {technicians.map((t) => {
                                        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;
                                        const initials = `${(t.firstName || 'T')[0]}${(t.lastName || 'E')[0]}`.toUpperCase();
                                        return (
                                            <div 
                                                key={t.id} 
                                                className="tech-mobile-card"
                                                onClick={() => setSelectedTechnician(t)}
                                            >
                                                <div className="tech-mobile-card-header">
                                                    <div className="tech-user-row">
                                                        <div className="tech-avatar" style={{ overflow: 'hidden' }}>
                                                            {t.avatarUrl ? (
                                                                <img src={t.avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                                            ) : (
                                                                initials
                                                            )}
                                                        </div>
                                                        <div className="tech-user-details">
                                                            <span className="tech-user-name">{fullName}</span>
                                                            <span className="tech-user-email">{t.email}</span>
                                                        </div>
                                                    </div>
                                                    <span className="tech-role-badge">
                                                        {t.role === "OWNER" ? "Propriétaire" : t.role === "MANAGER" ? "Manager" : "Technicien"}
                                                    </span>
                                                </div>

                                                <div className="tech-mobile-card-body">
                                                    {t.phone ? (
                                                        <div className="tech-mobile-info-item">
                                                            <Phone size={13} style={{ color: 'var(--muted-foreground)' }} />
                                                            <a 
                                                                href={`tel:${t.phone}`} 
                                                                className="tech-mobile-link"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {t.phone}
                                                            </a>
                                                        </div>
                                                    ) : null}
                                                    <div className="tech-mobile-info-item">
                                                        <span className={`tech-status-badge ${t.isActive !== false ? 'active' : 'pending'}`}>
                                                            <CheckCircle2 size={12} />
                                                            {t.isActive !== false ? "Actif" : "Inactif"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {t.role !== "OWNER" ? (
                                                    <div className="tech-mobile-card-footer">
                                                        <button
                                                            type="button"
                                                            className="btn-delete-tech-mobile"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isExpired) {
                                                                    window.dispatchEvent(new CustomEvent('subscription_expired', {
                                                                        detail: { message: "Votre abonnement a expiré. Pour modifier l'équipe, veuillez renouveler votre abonnement." }
                                                                    }));
                                                                    return;
                                                                }
                                                                setTechToDelete(t);
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                            <span>Supprimer</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="tech-mobile-card-footer">
                                                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                                                            Compte principal
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Pending Invitations Section */}
                    {invitations.length > 0 && (
                        <div className="tech-section-card">
                            <div className="tech-section-header">
                                <h2 className="tech-section-title">
                                    <div className="tech-section-title-icon blue">
                                        <Mail size={20} />
                                    </div>
                                    <span>Invitations en attente ({pendingInvitesCount})</span>
                                </h2>
                            </div>

                            {/* Desktop Table */}
                            <div className="tech-table-wrapper tech-desktop-table">
                                <table className="tech-table">
                                    <thead>
                                        <tr>
                                            <th>Email / Destinataire</th>
                                            <th>Code / Token</th>
                                            <th>Expire le</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invitations.map((inv) => {
                                            const shareUrl = getShareableUrl(inv.token);
                                            return (
                                                <tr key={inv.id}>
                                                    <td style={{ fontWeight: 600 }}>{inv.email.includes('@gestart.link') ? "Lien public généré" : inv.email}</td>
                                                    <td><code style={{ background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>{inv.token}</code></td>
                                                    <td>{new Date(inv.expiresAt).toLocaleDateString('fr-FR')}</td>
                                                    <td>
                                                        <span className={`tech-status-badge ${inv.status === 'ACCEPTED' ? 'active' : 'pending'}`}>
                                                            {inv.status === 'PENDING' ? 'En attente' : inv.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                type="button"
                                                                className="btn-copy-url"
                                                                onClick={() => handleCopyUrl(shareUrl)}
                                                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                                            >
                                                                <Copy size={13} />
                                                                Copier lien
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isExpired) {
                                                                        window.dispatchEvent(new CustomEvent('subscription_expired', {
                                                                            detail: { message: "Votre abonnement a expiré. Pour révoquer une invitation, veuillez renouveler votre abonnement." }
                                                                        }));
                                                                        return;
                                                                    }
                                                                    setInviteToRevoke(inv);
                                                                }}
                                                                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                                                                title="Révoquer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards for Invitations */}
                            <div className="tech-mobile-cards">
                                {invitations.map((inv) => {
                                    const shareUrl = getShareableUrl(inv.token);
                                    return (
                                        <div key={inv.id} className="tech-mobile-card">
                                            <div className="tech-mobile-card-header">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {inv.email.includes('@gestart.link') ? "Lien public généré" : inv.email}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                        Expire le {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                                <span className={`tech-status-badge ${inv.status === 'ACCEPTED' ? 'active' : 'pending'}`}>
                                                    {inv.status === 'PENDING' ? 'En attente' : inv.status}
                                                </span>
                                            </div>

                                            <div className="tech-mobile-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Code d'accès :</span>
                                                <code style={{ background: 'var(--muted)', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem' }}>
                                                    {inv.token}
                                                </code>
                                            </div>

                                            <div className="tech-mobile-card-footer" style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="btn-copy-url"
                                                    onClick={() => handleCopyUrl(shareUrl)}
                                                    style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '0.8rem' }}
                                                >
                                                    <Copy size={13} />
                                                    Copier lien
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isExpired) {
                                                            window.dispatchEvent(new CustomEvent('subscription_expired', {
                                                                detail: { message: "Votre abonnement a expiré. Pour révoquer une invitation, veuillez renouveler votre abonnement." }
                                                            }));
                                                            return;
                                                        }
                                                        setInviteToRevoke(inv);
                                                    }}
                                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="Révoquer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Invite Technician Modal */}
                    {showInviteModal && createPortal(
                        <div className="tech-modal-overlay" onClick={() => setShowInviteModal(false)}>
                            <div className="tech-modal-card" onClick={(e) => e.stopPropagation()}>
                                <div className="tech-modal-header">
                                    <h2>Inviter un technicien</h2>
                                    <button className="tech-modal-close-btn" onClick={() => setShowInviteModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>

                                {!createdInvite ? (
                                    <form onSubmit={handleCreateInvitation}>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '16px', lineHeight: 1.5 }}>
                                            Générez un lien et un code d'invitation unique pour votre technicien, ou saisissez son adresse e-mail pour l'inviter directement.
                                        </p>

                                        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                                                Adresse e-mail du technicien (Optionnel)
                                            </label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="technicien@exemple.com"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                            />
                                            <p style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', marginTop: '4px', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                                                S'il a déjà un compte GestArt, il recevra l'invitation directement pour l'accepter en 1 clic.
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowInviteModal(false)}
                                                style={{
                                                    padding: '11px 20px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border)',
                                                    background: 'transparent',
                                                    color: 'var(--foreground)',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-invite-tech"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? "Génération..." : "Générer l'invitation"}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div>
                                        <div className="share-code-box">
                                            <div className="share-code-label">Code d'invitation unique</div>
                                            <div className="share-code-value">{createdInvite.token}</div>
                                        </div>

                                        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '10px', textAlign: 'center' }}>
                                            Transmettez ce lien à votre technicien. Il sera automatiquement rattaché à votre entreprise lors de son inscription ou acceptation.
                                        </p>

                                        <div className="share-url-input-group">
                                            <input
                                                type="text"
                                                readOnly
                                                value={getShareableUrl(createdInvite.token)}
                                                className="share-url-input"
                                            />
                                            <button
                                                type="button"
                                                className="btn-copy-url"
                                                onClick={() => handleCopyUrl(getShareableUrl(createdInvite.token))}
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                                {copied ? "Copié !" : "Copier"}
                                            </button>
                                        </div>

                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>Partager directement via :</div>
                                        <div className="share-actions-grid">
                                            <a
                                                href={getWhatsAppShareUrl(getShareableUrl(createdInvite.token), createdInvite.token)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="share-channel-btn whatsapp"
                                            >
                                                <Share2 size={20} />
                                                WhatsApp
                                            </a>

                                            <a
                                                href={getSmsShareUrl(getShareableUrl(createdInvite.token), createdInvite.token)}
                                                className="share-channel-btn sms"
                                            >
                                                <MessageSquare size={20} />
                                                SMS
                                            </a>

                                            <a
                                                href={getMailShareUrl(inviteEmail, getShareableUrl(createdInvite.token), createdInvite.token)}
                                                className="share-channel-btn email"
                                            >
                                                <Mail size={20} />
                                                Email
                                            </a>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowInviteModal(false)}
                                            className="btn-invite-tech"
                                            style={{ width: '100%', marginTop: '24px', justifyContent: 'center' }}
                                        >
                                            Terminer
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Upgrade Modal for Starter users trying to invite */}
                    <StripeCheckoutModal
                        isOpen={showUpgradeModal}
                        onClose={() => setShowUpgradeModal(false)}
                        targetPlan="PRO"
                        onSuccess={() => {
                            refreshSubscription();
                            setShowUpgradeModal(false);
                            triggerToast("Félicitations ! Votre abonnement Pro a été activé.");
                        }}
                    />

                    {/* Delete Technician Warning Modal */}
                    {techToDelete && createPortal(
                        <div className="tech-modal-overlay" onClick={() => !isDeletingTech && setTechToDelete(null)}>
                            <motion.div
                                className="tech-modal-card delete-tech-modal-card"
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    className="delete-tech-close-btn"
                                    onClick={() => !isDeletingTech && setTechToDelete(null)}
                                    disabled={isDeletingTech}
                                    aria-label="Fermer"
                                >
                                    <X size={18} />
                                </button>

                                <div className="delete-tech-icon-container">
                                    <AlertTriangle size={32} />
                                </div>

                                <h2 className="delete-tech-modal-title">Supprimer ce technicien ?</h2>
                                
                                <p className="delete-tech-modal-desc">
                                    Vous êtes sur le point de retirer définitivement <strong>{`${techToDelete.firstName || ''} ${techToDelete.lastName || ''}`.trim() || techToDelete.email}</strong> de votre entreprise.
                                </p>

                                <div className="delete-tech-warning-box">
                                    <div className="warning-box-header">
                                        <Shield size={16} />
                                        <span>Conséquences de la suppression :</span>
                                    </div>
                                    <ul className="warning-box-items">
                                        <li>L'accès du technicien à l'application mobile et aux données CRM sera révoqué immédiatement.</li>
                                        <li>Ses interventions passées et futures resteront enregistrées mais passeront en statut <strong>« Non assigné »</strong>.</li>
                                    </ul>
                                </div>

                                <div className="delete-tech-actions-row">
                                    <button
                                        type="button"
                                        className="btn-cancel-delete"
                                        disabled={isDeletingTech}
                                        onClick={() => setTechToDelete(null)}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-confirm-delete"
                                        disabled={isDeletingTech}
                                        onClick={handleDeleteTechnician}
                                    >
                                        {isDeletingTech ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" style={{ flexShrink: 0 }} />
                                                <span>Suppression...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={19} style={{ flexShrink: 0 }} />
                                                <span>Confirmer</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>,
                        document.body
                    )}

                    {/* Revoke Invitation Warning Modal */}
                    {inviteToRevoke && createPortal(
                        <div className="tech-modal-overlay" onClick={() => !isRevokingInvite && setInviteToRevoke(null)}>
                            <motion.div
                                className="tech-modal-card delete-tech-modal-card"
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    className="delete-tech-close-btn"
                                    onClick={() => !isRevokingInvite && setInviteToRevoke(null)}
                                    disabled={isRevokingInvite}
                                    aria-label="Fermer"
                                >
                                    <X size={18} />
                                </button>

                                <div className="delete-tech-icon-container">
                                    <AlertTriangle size={32} />
                                </div>

                                <h2 className="delete-tech-modal-title">Révoquer cette invitation ?</h2>
                                
                                <p className="delete-tech-modal-desc">
                                    Vous êtes sur le point de révoquer l'invitation pour <strong>{inviteToRevoke.email.includes('@gestart.link') ? "le lien public généré" : inviteToRevoke.email}</strong> (Code : <code>{inviteToRevoke.token}</code>).
                                </p>

                                <div className="delete-tech-warning-box">
                                    <div className="warning-box-header">
                                        <Shield size={16} />
                                        <span>Conséquences de la révocation :</span>
                                    </div>
                                    <ul className="warning-box-items">
                                        <li>Ce lien et son code d'accès deviendront immédiatement invalides.</li>
                                        <li>Le destinataire ne pourra plus utiliser ce lien pour rejoindre votre entreprise.</li>
                                    </ul>
                                </div>

                                <div className="delete-tech-actions-row">
                                    <button
                                        type="button"
                                        className="btn-cancel-delete"
                                        disabled={isRevokingInvite}
                                        onClick={() => setInviteToRevoke(null)}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-confirm-delete"
                                        disabled={isRevokingInvite}
                                        onClick={handleConfirmRevokeInvite}
                                    >
                                        {isRevokingInvite ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" style={{ flexShrink: 0 }} />
                                                <span>Révocation...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={19} style={{ flexShrink: 0 }} />
                                                <span>Révoquer l'invitation</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>,
                        document.body
                    )}

                    {/* Technician Detail Modal (Desktop) / Bottom Sheet (Mobile) */}
                    <TechnicianDetailModal
                        technician={selectedTechnician}
                        isOpen={!!selectedTechnician}
                        onClose={() => setSelectedTechnician(null)}
                        onDelete={(t) => setTechToDelete(t)}
                        isMobileView={isMobileView}
                        isExpired={isExpired}
                    />

                    {/* Mobile bottom spacer so FAB/bottom bar doesn't obscure content */}
                    <div className="mobile-only-spacer" />

                </motion.main>
                </PullToRefresh>
            </div>
        </div>
    );
}
