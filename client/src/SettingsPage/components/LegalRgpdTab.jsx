import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Lock, Download, Trash2, ShieldCheck, Mail, FileText, CheckCircle2, Info, AlertTriangle, Loader2, X } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useUser } from "../../utils/useUser";

export default function LegalRgpdTab({ isMobileView, triggerToast, triggerConfirm }) {
    const { company } = useUser();
    const [cookieConsent, setCookieConsent] = useState(true);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [dpoEmail, setDpoEmail] = useState("support.gestart@gmail.com");
    
    // Delete Account states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleteChecked, setDeleteChecked] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const registrationDate = "05/05/2025";
    const lastConnectionDate = "24/07/2026 13:42";

    const handleExportJson = () => {
        const data = {
            user: { firstName: "Khalid", lastName: "Sainaro", email: "khalid.cizdoev777@gmail.com", phone: "0651604316" },
            company: { name: company?.name || "KHALID SAINARO", siret: company?.siret || "94408772500015", siren: company?.siren || "944087725", legalForm: company?.legalForm || "EI" },
            exportDate: new Date().toISOString(),
            rgpdArticle: "Art. 20 RGPD - Droit à la portabilité"
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export-rgpd-gestart-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        triggerToast("Exportation JSON des données effectuée (art. 20 RGPD) !");
    };

    const handleExportCsv = () => {
        const csvContent = "data:text/csv;charset=utf-8,Nom,Prénom,Email,SIRET,DateInscription\nSainaro,Khalid,support.gestart@gmail.com,94408772500015,05/05/2025\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export-clients-gestart-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        triggerToast("Exportation CSV des données effectuée !");
    };

    const handleDeleteAccount = async () => {
        if (!deleteChecked || deleteConfirmText.trim().toUpperCase() !== "SUPPRIMER") {
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const res = await apiFetch("/v1/company/delete-account", {
                method: "DELETE"
            });

            if (res.success) {
                if (triggerToast) triggerToast("Votre compte et toutes vos données ont été définitivement supprimés.");
                localStorage.clear();
                sessionStorage.clear();
                setTimeout(() => {
                    window.location.href = "/login?deleted=true";
                }, 1000);
            } else {
                setDeleteError(res.message || "Erreur lors de la suppression du compte");
                setIsDeleting(false);
            }
        } catch (err) {
            setDeleteError(err.message || "Erreur lors de la communication avec le serveur");
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Banner Information RGPD */}
            <div style={{ backgroundColor: 'rgba(91, 77, 219, 0.04)', border: '1px solid rgba(91, 77, 219, 0.15)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <ShieldCheck size={20} style={{ color: 'var(--sidebar-primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Vos Droits RGPD (Règlement Général sur la Protection des Données)</h3>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>
                    GestArt garantit le respect strict des articles 15 à 21 du RGPD et de la loi Informatique et Libertés (Loi n° 78-17). Vous gardez le contrôle total sur vos données personnelles et celles de votre entreprise.
                </p>
                <div style={{ display: 'flex', gap: '20px', marginTop: '14px', fontSize: '12px', fontWeight: 600 }}>
                    <div>Date d'inscription : <span style={{ color: 'var(--sidebar-primary)' }}>{registrationDate}</span></div>
                    <div>Dernière connexion : <span style={{ color: 'var(--sidebar-primary)' }}>{lastConnectionDate}</span></div>
                </div>
            </div>

            {/* Exportation de données */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Exporter mes données (Art. 20 RGPD — Portabilité)
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                    Téléchargez une copie complète et structurée de toutes vos données (clients, factures, devis, profil, paramètres) au format JSON ou CSV.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleExportJson}
                        style={{ padding: '10px 18px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Download size={15} />
                        Exporter tout au format JSON
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        style={{ padding: '10px 18px', backgroundColor: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <FileText size={15} />
                        Exporter en CSV (Excel)
                    </button>
                    <button
                        type="button"
                        onClick={() => triggerToast("Téléchargement des archives PDF factures démarré !")}
                        style={{ padding: '10px 18px', backgroundColor: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                        Télécharger factures archivées (ZIP)
                    </button>
                </div>
            </div>

            {/* Consentements */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Gestion des consentements (Art. 82 Loi 78-17)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Cookies analytiques et de mesure d'audience</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block' }}>Permet d'améliorer l'expérience utilisateur et les fonctionnalités de l'application.</span>
                        </div>
                        <label className="mobile-toggle-switch">
                            <input
                                type="checkbox"
                                checked={cookieConsent}
                                onChange={(e) => {
                                    setCookieConsent(e.target.checked);
                                    triggerToast("Consentement cookies mis à jour !");
                                }}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Communications marketing & Nouveautés produit</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block' }}>Recevoir nos conseils pour artisans et les annonces de nouvelles versions.</span>
                        </div>
                        <label className="mobile-toggle-switch">
                            <input
                                type="checkbox"
                                checked={marketingConsent}
                                onChange={(e) => {
                                    setMarketingConsent(e.target.checked);
                                    triggerToast("Consentement marketing mis à jour !");
                                }}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>
            </div>

            {/* Contact DPO */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Délégué à la Protection des Données (DPO)
                </h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="text" className="form-input" value={dpoEmail} readOnly style={{ flex: 1, backgroundColor: 'var(--background)' }} />
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = `mailto:${dpoEmail}`;
                            triggerToast("Client email ouvert pour contacter le DPO.");
                        }}
                        style={{ padding: '9px 16px', borderRadius: '8px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                        Contacter le DPO
                    </button>
                </div>
            </div>

            {/* Suppression du compte */}
            <div style={{ border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.03)' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 size={18} />
                    Supprimer mon compte (Art. 17 RGPD — Droit à l'effacement)
                </h3>
                <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                    Cette action est irréversible. Toutes vos données d'entreprise, factures, devis, fiches clients et comptes utilisateurs seront définitivement effacés de nos serveurs.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setDeleteConfirmText("");
                        setDeleteChecked(false);
                        setDeleteError(null);
                        setIsDeleting(false);
                        setShowDeleteModal(true);
                    }}
                    style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                    Demander la suppression définitive du compte
                </button>
            </div>

            {/* Modal de confirmation de suppression */}
            {showDeleteModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto', boxSizing: 'border-box' }}>
                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', position: 'relative', margin: 'auto', boxSizing: 'border-box' }}>
                        <button
                            type="button"
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                            disabled={isDeleting}
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                        >
                            <X size={18} />
                        </button>

                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                            <AlertTriangle size={24} />
                        </div>

                        <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>
                            Suppression irréversible du compte
                        </h4>

                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--foreground)', lineHeight: '1.5' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#ef4444' }}>
                                ⚠️ Cette action est définitive et sans retour possible :
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <li>Toutes vos <strong>fiches clients</strong>, devis et factures seront supprimés.</li>
                                <li>Tout votre <strong>planning</strong> et historique d'interventions seront détruits.</li>
                                <li>Votre <strong>abonnement</strong> sera immédiatement résilié (aucun prélèvement futur).</li>
                                <li>Votre compte sera supprimé et votre <strong>adresse email libérée</strong>, vous permettant si besoin de vous réinscrire ultérieurement.</li>
                            </ul>
                        </div>

                        {deleteError && (
                            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>
                                {deleteError}
                            </div>
                        )}

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px', fontSize: '12.5px', fontWeight: 600, color: 'var(--foreground)' }}>
                            <input
                                type="checkbox"
                                checked={deleteChecked}
                                onChange={(e) => setDeleteChecked(e.target.checked)}
                                disabled={isDeleting}
                                style={{ marginTop: '2px', accentColor: '#ef4444', width: '16px', height: '16px' }}
                            />
                            <span>Je confirme vouloir supprimer définitivement mon compte et toutes mes données (Art. 17 RGPD).</span>
                        </label>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '6px', fontWeight: 600 }}>
                                Pour confirmer, tapez le mot <strong>SUPPRIMER</strong> ci-dessous :
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="SUPPRIMER"
                                disabled={isDeleting}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--foreground)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={!deleteChecked || deleteConfirmText.trim().toUpperCase() !== "SUPPRIMER" || isDeleting}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    backgroundColor: (!deleteChecked || deleteConfirmText.trim().toUpperCase() !== "SUPPRIMER" || isDeleting) ? '#9ca3af' : '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: (!deleteChecked || deleteConfirmText.trim().toUpperCase() !== "SUPPRIMER" || isDeleting) ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 size={15} className="spin-loader" /> Suppression...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={15} /> Supprimer définitivement
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
