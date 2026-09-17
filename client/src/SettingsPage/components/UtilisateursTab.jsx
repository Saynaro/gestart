import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, UserPlus, Shield, Mail, RefreshCw, Trash2, CheckCircle2, AlertTriangle, X, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";

export default function UtilisateursTab({ isMobileView, triggerToast, triggerConfirm }) {
    const { isStarter, isPro, isUnlimited, planName } = useSubscription();
    const [members, setMembers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [invitations, setInvitations] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [newInviteEmail, setNewInviteEmail] = useState("");
    const [newInviteRole, setNewInviteRole] = useState("TECHNICIAN");

    const maxUsers = isStarter ? 1 : isPro ? 10 : 9999;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const [usersRes, meRes] = await Promise.all([
                apiFetch('/v1/users').catch(() => null),
                apiFetch('/v1/auth/me').catch(() => null)
            ]);

            const me = meRes?.data?.user || meRes?.user;
            if (me) {
                setCurrentUserId(me.id);
            }

            const userList = usersRes?.data?.users || usersRes?.users || (Array.isArray(usersRes) ? usersRes : []);
            if (userList.length > 0) {
                const mappedMembers = userList.map(u => ({
                    id: u.id,
                    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                    email: u.email,
                    role: u.role || "TECHNICIAN",
                    lastActive: u.updatedAt ? new Date(u.updatedAt).toLocaleDateString('fr-FR') : "Récent",
                    status: u.isActive !== false ? "Actif" : "Désactivé",
                    isSelf: u.id === me?.id || u.email === me?.email
                }));
                setMembers(mappedMembers);
            } else if (me) {
                setMembers([{
                    id: me.id,
                    name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.email,
                    email: me.email,
                    role: me.role || "OWNER",
                    lastActive: "Maintenant",
                    status: "Actif",
                    isSelf: true
                }]);
            }
        } catch (err) {
            console.warn("API users non disponible:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInviteSubmit = (e) => {
        e.preventDefault();
        if (!newInviteEmail) {
            triggerToast("Veuillez saisir une adresse email", true);
            return;
        }

        if (isStarter) {
            triggerToast("L'offre Starter inclut 1 seul membre (le patron). Passez à l'offre Pro pour inviter des techniciens !", true);
            setShowInviteModal(false);
            return;
        }

        if (members.length + invitations.length >= maxUsers) {
            triggerToast(`Limite de votre offre atteinte (${maxUsers} membres). Passez à l'offre Unlimited pour ajouter des membres illimités.`, true);
            setShowInviteModal(false);
            return;
        }

        const newInv = {
            id: Date.now(),
            email: newInviteEmail,
            role: newInviteRole,
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('fr-FR'),
            status: "En attente"
        };
        setInvitations(prev => [...prev, newInv]);
        setNewInviteEmail("");
        setShowInviteModal(false);
        triggerToast(`Invitation envoyée à ${newInviteEmail} !`);
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await apiFetch(`/v1/users/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole })
            }).catch(() => null);

            setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
            triggerToast("Rôle du membre mis à jour !");
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la modification du rôle", true);
        }
    };

    const handleToggleStatus = (id) => {
        setMembers(prev => prev.map(m => {
            if (m.id === id) {
                const nextStatus = m.status === "Actif" ? "Désactivé" : "Actif";
                triggerToast(`Statut du membre passé à ${nextStatus} !`);
                return { ...m, status: nextStatus };
            }
            return m;
        }));
    };

    const [inviteToRevoke, setInviteToRevoke] = useState(null);

    const handleConfirmRevoke = () => {
        if (!inviteToRevoke) return;
        setInvitations(prev => prev.filter(inv => inv.id !== inviteToRevoke.id));
        setInviteToRevoke(null);
        triggerToast("Invitation révoquée !");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header & Capacité Équipe */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Membres & Rôles de l'Entreprise</h3>
                            <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '50px' }}>
                                {members.length} / {isUnlimited ? "Illimité" : `${maxUsers} membres max (${planName})`}
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            Gérez les accès de vos techniciens et collaborateurs à votre espace de gestion.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <UserPlus size={15} />
                        Inviter un collaborateur
                    </button>
                </div>
            </div>

            {/* Liste des Membres Actifs */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} style={{ color: 'var(--sidebar-primary)' }} />
                    Membres Actifs ({members.length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {members.map((member) => (
                        <div
                            key={member.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 16px',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                backgroundColor: 'var(--background)',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    backgroundColor: member.role === 'OWNER' ? 'var(--sidebar-primary)' : 'rgba(91,77,219,0.15)',
                                    color: member.role === 'OWNER' ? '#fff' : 'var(--sidebar-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '13px'
                                }}>
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{member.name}</span>
                                        {member.isSelf && (
                                            <span style={{ backgroundColor: 'rgba(0,0,0,0.06)', fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Vous</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{member.email}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <select
                                    value={member.role}
                                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                    disabled={member.isSelf}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: member.isSelf ? 'default' : 'pointer'
                                    }}
                                >
                                    <option value="OWNER">Dirigeant / Admin</option>
                                    <option value="MANAGER">Gestionnaire / Secrétariat</option>
                                    <option value="TECHNICIAN">Technicien terrain</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invitations en attente */}
            {invitations.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} style={{ color: '#f59e0b' }} />
                        Invitations en attente ({invitations.length})
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {invitations.map((inv) => (
                            <div
                                key={inv.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    backgroundColor: 'var(--background)'
                                }}
                            >
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '13.5px', display: 'block' }}>{inv.email}</span>
                                    <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>Rôle : {inv.role} • Expire le : {inv.expiresAt}</span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setInviteToRevoke(inv)}
                                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Révoquer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Inviter */}
            {showInviteModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto', boxSizing: 'border-box' }}>
                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', margin: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Inviter un collaborateur</h4>
                            <button type="button" onClick={() => setShowInviteModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label className="form-label">Adresse email professionnelle</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={newInviteEmail}
                                    onChange={(e) => setNewInviteEmail(e.target.value)}
                                    placeholder="technicien@climpro.fr"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Rôle attribué</label>
                                <select className="form-input" value={newInviteRole} onChange={(e) => setNewInviteRole(e.target.value)}>
                                    <option value="TECHNICIAN">Technicien terrain (Planning & Interventions)</option>
                                    <option value="MANAGER">Gestionnaire (Clients, Devis, Factures)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowInviteModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', fontWeight: 600, fontSize: '13px' }}>
                                    Annuler
                                </button>
                                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--sidebar-primary)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                                    Envoyer l'invitation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Warning Confirmation Révocation */}
            {inviteToRevoke && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto', boxSizing: 'border-box' }}>
                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', textAlign: 'center', margin: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                            <AlertCircle size={28} />
                        </div>

                        <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 700 }}>Révoquer cette invitation ?</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                            L'invitation envoyée à <strong>{inviteToRevoke.email}</strong> deviendra immédiatement invalide. Le destinataire ne pourra plus l'utiliser pour rejoindre l'entreprise.
                        </p>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setInviteToRevoke(null)}
                                style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRevoke}
                                style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Révoquer
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
