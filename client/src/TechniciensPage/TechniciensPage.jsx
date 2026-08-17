import React, { useState, useEffect } from "react";
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
    AlertTriangle
} from "lucide-react";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { apiFetch } from "../utils/api";
import { useSubscription } from "../utils/useSubscription";
import FeatureLockBanner from "../components/FeatureLockBanner";
import StripeCheckoutModal from "../SettingsPage/components/StripeCheckoutModal";
import "./TechniciensPage.css";

export default function TechniciensPage() {
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

    // Toast State
    const [toast, setToast] = useState({ show: false, message: "", isError: false });
    const triggerToast = (message, isError = false) => {
        setToast({ show: true, message, isError });
        setTimeout(() => setToast({ show: false, message: "", isError: false }), 4000);
    };

    // Modal State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [createdInvite, setCreatedInvite] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isStarter, isPro, isUnlimited, displayName, refreshSubscription } = useSubscription();

    // Fetch Technicians & Invitations from API
    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch users
            const usersData = await apiFetch("/v1/users");
            const userList = usersData.data?.users || usersData.users || (Array.isArray(usersData) ? usersData : []);
            
            // Filter technicians or active team members
            const techs = userList.filter(u => u.role === "TECHNICIAN" || u.role === "MANAGER" || u.role === "OWNER");
            setTechnicians(techs);

            // Fetch invitations
            const invData = await apiFetch("/v1/invitations");
            const invList = invData.data?.invitations || invData.invitations || [];
            setInvitations(invList);
        } catch (err) {
            console.warn("Erreur chargement techniciens:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Create Invitation Handler
    const handleCreateInvitation = async (e) => {
        e.preventDefault();
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
            triggerToast(err.message || "Erreur lors de la création de l'invitation", true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Revoke Invitation
    const handleRevokeInvitation = async (id) => {
        try {
            setInvitations(prev => prev.filter(inv => inv.id !== id));
            await apiFetch(`/v1/invitations/${id}`, { method: "DELETE" });
            triggerToast("Invitation révoquée avec succès");
            loadData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la révocation", true);
            loadData();
        }
    };

    // Delete Technician State & Handler
    const [techToDelete, setTechToDelete] = useState(null);
    const [isDeletingTech, setIsDeletingTech] = useState(false);

    const handleDeleteTechnician = async () => {
        if (!techToDelete) return;
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

    return (
        <div className="home-page techniciens-page">
            <SideBar activePath="/techniciens" />
            <div className="main-content">
                <Header />
                <motion.main 
                    className="page-content techniciens-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >

                    {/* Toast Alert - Centered Top */}
                    {toast.show && (
                        <div style={{
                            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
                            backgroundColor: toast.isError ? '#ef4444' : '#22c55e', color: '#fff',
                            padding: '14px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '14px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '10px',
                            maxWidth: '90vw', pointerEvents: 'none'
                        }}>
                            {toast.message}
                        </div>
                    )}

                    {/* Page Header */}
                    <div className="techniciens-header-row">
                        <div className="techniciens-title-group">
                            <h1>Techniciens & Équipe</h1>
                            <p>Gérez les accès de vos techniciens et invitez de nouveaux membres dans votre entreprise.</p>
                        </div>
                        <button
                            className="btn-invite-tech"
                            onClick={() => {
                                if (isStarter) {
                                    setShowUpgradeModal(true);
                                    return;
                                }
                                setCreatedInvite(null);
                                setInviteEmail("");
                                setShowInviteModal(true);
                            }}
                            style={isStarter ? { opacity: 0.9 } : {}}
                        >
                            {isStarter ? <Star size={18} fill="currentColor" /> : <UserPlus size={18} />}
                            {isStarter ? "Inviter un technicien (Pro)" : "Inviter un technicien"}
                        </button>
                    </div>

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
                                <Wrench size={20} style={{ color: '#556B2F' }} />
                                Membres & Techniciens de l'entreprise ({technicians.length})
                            </h2>
                        </div>

                        {loading ? (
                            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '20px' }}>Chargement des membres...</p>
                        ) : technicians.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '20px' }}>Aucun technicien enregistré pour le moment.</p>
                        ) : (
                            <div className="tech-table-wrapper">
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
                                                <tr key={t.id}>
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
                                                                onClick={() => setTechToDelete(t)}
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
                        )}
                    </div>

                    {/* Pending Invitations Section */}
                    {invitations.length > 0 && (
                        <div className="tech-section-card">
                            <div className="tech-section-header">
                                <h2 className="tech-section-title">
                                    <Mail size={20} style={{ color: '#2563EB' }} />
                                    Invitations en attente ({pendingInvitesCount})
                                </h2>
                            </div>

                            <div className="tech-table-wrapper">
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
                                                                onClick={() => handleRevokeInvitation(inv.id)}
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
                        </div>
                    )}

                    {/* Invite Technician Modal */}
                    {showInviteModal && (
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
                                                style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}
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
                                            style={{
                                                width: '100%', marginTop: '24px', padding: '12px',
                                                borderRadius: '12px', border: '1px solid var(--border)',
                                                background: 'var(--card)', fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            Terminer
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
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
                    {techToDelete && (
                        <div className="tech-modal-overlay" onClick={() => !isDeletingTech && setTechToDelete(null)}>
                            <motion.div
                                className="tech-modal-card delete-tech-modal-card"
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    className="tech-modal-close"
                                    onClick={() => !isDeletingTech && setTechToDelete(null)}
                                    disabled={isDeletingTech}
                                >
                                    <X size={20} />
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
                                                <RefreshCw size={16} className="animate-spin" />
                                                Suppression en cours...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={16} />
                                                Confirmer la suppression
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                </motion.main>
            </div>
        </div>
    );
}
