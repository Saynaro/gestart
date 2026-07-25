import React, { useState } from "react";
import { Lock, Download, Trash2, ShieldCheck, Mail, FileText, CheckCircle2, Info } from "lucide-react";

export default function LegalRgpdTab({ isMobileView, triggerToast, triggerConfirm }) {
    const [cookieConsent, setCookieConsent] = useState(true);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [dpoEmail, setDpoEmail] = useState("dpo@gestart.fr");
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const registrationDate = "05/05/2025";
    const lastConnectionDate = "24/07/2026 13:42";

    const handleExportJson = () => {
        const data = {
            user: { firstName: "Khalid", lastName: "Sainaro", email: "khalid.cizdoev777@gmail.com", phone: "0651604316" },
            company: { name: "SAINARO KHALID CLIM", siret: "94408772500012", siren: "944087725", legalForm: "Auto-entrepreneur" },
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
        const csvContent = "data:text/csv;charset=utf-8,Nom,Prénom,Email,SIRET,DateInscription\nSainaro,Khalid,khalid.cizdoev777@gmail.com,94408772500012,05/05/2025\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export-clients-gestart-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        triggerToast("Exportation CSV des données effectuée !");
    };

    const handleDeleteAccount = () => {
        setShowDeleteModal(false);
        triggerToast("Demande de suppression de compte soumise au DPO (art. 17 RGPD) !");
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
                        if (triggerConfirm) {
                            triggerConfirm({
                                title: "Suppression définitive du compte",
                                message: "Êtes-vous sûr de vouloir demander la suppression définitive de votre compte SAINARO KHALID CLIM et de toutes ses données (Art. 17 RGPD) ?",
                                confirmText: "Oui, supprimer mon compte",
                                cancelText: "Annuler",
                                onConfirm: handleDeleteAccount
                            });
                        } else {
                            setShowDeleteModal(true);
                        }
                    }}
                    style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                    Demander la suppression définitive du compte
                </button>
            </div>

            {/* Modal de confirmation de suppression */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '14px', padding: '24px', maxWidth: '440px', width: '100%', border: '1px solid var(--border)' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '17px', fontWeight: 700, color: '#ef4444' }}>Confirmer la suppression du compte ?</h4>
                        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Êtes-vous certain de vouloir supprimer le compte <strong>SAINARO KHALID CLIM</strong> ? Conformément à l'Art. 17 du RGPD, une période de grâce de 30 jours vous permettra d'annuler votre demande si nécessaire.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                style={{ padding: '9px 16px', borderRadius: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Confirmer la suppression
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
