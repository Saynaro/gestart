import React, { useState, useEffect } from "react";
import { Users, UserPlus, Shield, Mail, RefreshCw, Trash2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function UtilisateursTab({ isMobileView, triggerToast, triggerConfirm }) {
    const [members, setMembers] = useState([
        { id: 1, name: "Khalid Sainaro", email: "khalid.cizdoev777@gmail.com", role: "OWNER", lastActive: "Maintenant", status: "Actif", isSelf: true }
    ]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await apiFetch('/v1/users');
                const userList = data.data?.users || data.users || (Array.isArray(data) ? data : []);
                if (userList.length > 0) {
                    const mappedMembers = userList.map(u => ({
                        id: u.id,
                        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                        email: u.email,
                        role: u.role || "TECHNICIAN",
                        lastActive: u.updatedAt ? new Date(u.updatedAt).toLocaleDateString('fr-FR') : "Récent",
                        status: u.isActive !== false ? "Actif" : "Désactivé",
                        isSelf: u.email === "khalid.cizdoev777@gmail.com"
                    }));
                    setMembers(mappedMembers);
                }
            } catch (err) {
                console.warn("API users non disponible:", err.message);
            }
        };

        fetchUsers();
    }, []);

    const [invitations, setInvitations] = useState([]);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [newInviteEmail, setNewInviteEmail] = useState("");
    const [newInviteRole, setNewInviteRole] = useState("TECHNICIAN");

    const maxUsers = 2; // Plan Pro limit

    const handleInviteSubmit = (e) => {
        e.preventDefault();
        if (!newInviteEmail) {
            triggerToast("Veuillez saisir une adresse email", true);
            return;
        }
        if (members.length + invitations.length >= maxUsers) {
            triggerToast(`Limite de votre plan atteinte (${maxUsers}/${maxUsers}). Passez au plan Unlimited pour ajouter d'autres membres.`, true);
            setShowInviteModal(false);
            return;
        }
        const newInv = {
            id: Date.now(),
            email: newInviteEmail,
            role: newInviteRole,
            expiresAt: "31/07/2026",
            status: "En attente"
        };
        setInvitations(prev => [...prev, newInv]);
        setNewInviteEmail("");
        setShowInviteModal(false);
        triggerToast(`Invitation envoyée à ${newInviteEmail} !`);
    };

    const handleRoleChange = (id, newRole) => {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
        triggerToast("Rôle du membre mis à jour !");
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

    const handleResendInvite = (email) => {
        triggerToast(`Invitation ré-envoyée à ${email} !`);
    };

    const handleRevokeInvite = (id) => {
        setInvitations(prev => prev.filter(inv => inv.id !== id));
        triggerToast("Invitation révoquée !");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header & Limite Plan */}
            <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} style={{ color: 'var(--sidebar-primary)' }} />
                        Membres de l'équipe
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                        Limite de votre formule Pro : <strong>{members.length}/{maxUsers} utilisateurs actifs</strong>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <UserPlus size={15} />
                    Inviter un membre
                </button>
            </div>

            {/* Warning if limit reached */}
            {members.length >= maxUsers && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>Vous avez atteint la limite de votre plan Pro ({maxUsers}/{maxUsers} membres). Pour ajouter plus de techniciens, passez à l'offre <strong>Unlimited</strong>.</span>
                </div>
            )}

            {/* Liste des membres actifs */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '14.5px', fontWeight: 700 }}>Membres actifs</h4>
                {isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {members.map((m) => (
                            <div key={m.id} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--foreground)' }}>{m.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{m.email}</div>
                                    </div>
                                    <span style={{ backgroundColor: m.status === 'Actif' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: m.status === 'Actif' ? '#22c55e' : '#ef4444', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                        {m.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                                    <div>
                                        {m.isSelf ? (
                                            <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontWeight: 700, fontSize: '10px', padding: '2px 6px', borderRadius: '50px' }}>
                                                PROPRIÉTAIRE
                                            </span>
                                        ) : (
                                            <select
                                                className="form-input"
                                                value={m.role}
                                                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                                style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600 }}
                                            >
                                                <option value="TECHNICIAN">TECHNICIAN</option>
                                                <option value="MANAGER">MANAGER</option>
                                            </select>
                                        )}
                                    </div>
                                    {!m.isSelf && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (m.status === 'Actif' && triggerConfirm) {
                                                    triggerConfirm({
                                                        title: "Désactiver le membre",
                                                        message: `Êtes-vous sûr de vouloir désactiver l'accès pour ${m.name} (${m.email}) ?`,
                                                        confirmText: "Désactiver",
                                                        cancelText: "Annuler",
                                                        onConfirm: () => handleToggleStatus(m.id)
                                                    });
                                                } else {
                                                    handleToggleStatus(m.id);
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: m.status === 'Actif' ? '#ef4444' : '#22c55e', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                        >
                                            {m.status === 'Actif' ? "Désactiver" : "Réactiver"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Nom & Email</th>
                                    <th style={{ padding: '8px' }}>Rôle</th>
                                    <th style={{ padding: '8px' }}>Dernière connexion</th>
                                    <th style={{ padding: '8px' }}>Statut</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px' }}>
                                            <div style={{ fontWeight: 600 }}>{m.name}</div>
                                            <div style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>{m.email}</div>
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>
                                            {m.isSelf ? (
                                                <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontWeight: 700, fontSize: '11px', padding: '3px 8px', borderRadius: '50px' }}>
                                                    PROPRIÉTAIRE (OWNER)
                                                </span>
                                            ) : (
                                                <select
                                                    className="form-input"
                                                    value={m.role}
                                                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                                    style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600 }}
                                                >
                                                    <option value="TECHNICIAN">TECHNICIAN (Technicien)</option>
                                                    <option value="MANAGER">MANAGER (Gestionnaire)</option>
                                                </select>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>{m.lastActive}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ backgroundColor: m.status === 'Actif' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: m.status === 'Actif' ? '#22c55e' : '#ef4444', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                            {!m.isSelf && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (m.status === 'Actif' && triggerConfirm) {
                                                            triggerConfirm({
                                                                title: "Désactiver le membre",
                                                                message: `Êtes-vous sûr de vouloir désactiver l'accès pour ${m.name} (${m.email}) ?`,
                                                                confirmText: "Désactiver",
                                                                cancelText: "Annuler",
                                                                onConfirm: () => handleToggleStatus(m.id)
                                                            });
                                                        } else {
                                                            handleToggleStatus(m.id);
                                                        }
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: m.status === 'Actif' ? '#ef4444' : '#22c55e', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                                >
                                                    {m.status === 'Actif' ? "Désactiver" : "Réactiver"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Liste des invitations en attente */}
            {invitations.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14.5px', fontWeight: 700 }}>Invitations en attente ({invitations.length})</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Email</th>
                                    <th style={{ padding: '8px' }}>Rôle invité</th>
                                    <th style={{ padding: '8px' }}>Expire le</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.map((inv) => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{inv.email}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--foreground)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                                {inv.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>{inv.expiresAt}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleResendInvite(inv.email)}
                                                style={{ background: 'none', border: 'none', color: 'var(--sidebar-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', marginRight: '12px' }}
                                            >
                                                Renvoyer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRevokeInvite(inv.id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                            >
                                                Révoquer
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal d'invitation d'un nouveau membre */}
            {showInviteModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <form onSubmit={handleInviteSubmit} style={{ backgroundColor: 'var(--card)', borderRadius: '14px', padding: '24px', maxWidth: '420px', width: '100%', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Inviter un membre à l'équipe</h4>
                            <button type="button" onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div className="form-field">
                                <label className="form-label">Adresse email du collaborateur</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={newInviteEmail}
                                    onChange={(e) => setNewInviteEmail(e.target.value)}
                                    placeholder="technicien@dupont-clim.fr"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Rôle attribué</label>
                                <select
                                    className="form-input"
                                    value={newInviteRole}
                                    onChange={(e) => setNewInviteRole(e.target.value)}
                                >
                                    <option value="TECHNICIAN">TECHNICIAN (Accès interventions & planning)</option>
                                    <option value="MANAGER">MANAGER (Accès clients & facturation)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button type="button" onClick={() => setShowInviteModal(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontWeight: 600 }}>Annuler</button>
                            <button type="submit" style={{ padding: '9px 16px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600 }}>Envoyer l'invitation</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
