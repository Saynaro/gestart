import React, { useState } from "react";
import { X, ShieldCheck, FileText, Scale, Lock, Cookie, HelpCircle, CheckCircle2 } from "lucide-react";

export function LegalHelpTooltip({ title, text, lawArticle, positionDirection = "down" }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                style={{
                    border: 'none',
                    background: 'rgba(85, 107, 47, 0.18)',
                    color: '#556B2F',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                }}
                title="En savoir plus sur la loi française"
            >
                ?
            </button>

            {isOpen && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        ...(positionDirection === "up" ? { bottom: '120%' } : { top: 'calc(100% + 8px)' }),
                        right: '0px',
                        width: '260px',
                        maxWidth: 'calc(100vw - 36px)',
                        backgroundColor: '#1E293B',
                        color: '#F8FAFC',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        zIndex: 999999,
                        fontSize: '0.8rem',
                        lineHeight: '1.4'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#A3E635', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {lawArticle || "Loi Française"}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                    {title && <div style={{ fontWeight: 700, marginBottom: '4px', color: '#FFFFFF' }}>{title}</div>}
                    <div style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>{text}</div>
                    <div style={{ marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '6px', fontSize: '0.7rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={12} style={{ color: '#A3E635' }} /> Conforme aux normes réglementaires en France
                    </div>
                </div>
            )}
        </span>
    );
}

export default function LegalModal({ type, onClose }) {
    const [activeTab, setActiveTab] = useState(type || "mentions");

    React.useEffect(() => {
        const prevOverflowHtml = document.documentElement.style.overflow;
        const prevOverflowBody = document.body.style.overflow;

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.body.classList.add("modal-open");

        return () => {
            document.documentElement.style.overflow = prevOverflowHtml || "auto";
            document.body.style.overflow = prevOverflowBody || "auto";
            document.body.classList.remove("modal-open");
        };
    }, []);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{
                backgroundColor: 'var(--card, #ffffff)',
                color: 'var(--foreground, #0f172a)',
                width: '100%',
                maxWidth: '780px',
                maxHeight: '90vh',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                border: '1px solid var(--border, #e2e8f0)'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--muted, #f8fafc)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Scale style={{ color: '#556B2F' }} size={24} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Conformité Légale & Mentions</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground, #64748b)' }}>Cadre juridique et protection des données selon les lois françaises & européennes</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--foreground, #0f172a)', padding: '6px' }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    overflowX: 'auto',
                    backgroundColor: 'var(--card, #ffffff)',
                    padding: '0 16px'
                }}>
                    {[
                        { id: "mentions", label: "Mentions légales", icon: FileText, law: "art. 6 LCEN" },
                        { id: "cgu", label: "CGU / CGV", icon: Scale, law: "art. L441-1 C.com" },
                        { id: "rgpd", label: "Politique Confidentialité", icon: Lock, law: "RGPD 2016/679" },
                        { id: "cookies", label: "Gestion Cookies", icon: Cookie, law: "art. 82 Loi 78-17" }
                    ].map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '14px 18px',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: isActive ? '3px solid #556B2F' : '3px solid transparent',
                                    color: isActive ? '#556B2F' : 'var(--muted-foreground, #64748b)',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={16} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontSize: '0.875rem', lineHeight: 1.6 }}>
                    {activeTab === "mentions" && (
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>Loi N° 2004-575 (LCEN - art. 6)</span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '12px', marginBottom: '8px' }}>Mentions Légales du service GestArt</h4>
                            <p>Conformément aux dispositions de l'article 6 de la Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), il est précisé aux utilisateurs du site GestArt l'identité des différents intervenants dans le cadre de sa réalisation et de son suivi :</p>
                            <ul>
                                <li><strong>Éditeur de la plateforme :</strong> GestArt SAS / EI Khalid Sainaro, siège social : 23 Rue Paganini, 06000 Nice. SIREN : 944 087 725.</li>
                                <li><strong>Directeur de la publication :</strong> Khalid Sainaro (Contact : support@gestart.fr).</li>
                                <li><strong>Hébergement des données :</strong> Plateforme hébergée en Europe (France/Allemagne) avec chiffrement SSL/TLS aux normes bancaires.</li>
                                <li><strong>Conformité Facturation :</strong> Application des règles d'émission des factures selon l'article 289 du Code Général des Impôts (CGI).</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === "cgu" && (
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>Code de Commerce (art. L441-1) & Code de la Consommation (art. L111-1)</span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '12px', marginBottom: '8px' }}>Conditions Générales d'Utilisation & Vente (CGU / CGV)</h4>
                            <p>Les présentes CGU/CGV régissent l'utilisation de la plateforme de gestion GestArt ainsi que la délivrance des devis et factures :</p>
                            <ul>
                                <li><strong>Obligation de Devis (art. L111-3 C.conso) :</strong> Un devis préalable est fourni pour toute prestation aux particuliers dépassant 150 €. Les devis ont une durée de validité de 30 jours sauf mention contraire.</li>
                                <li><strong>Pénalités de Retard (art. L441-10 C.com) :</strong> En cas de retard de paiement sur facture, des pénalités sont applicables de plein droit au taux annuel de la BCE majoré de 10 points de pourcentage.</li>
                                <li><strong>Indemnité Forfaitaire de Recouvrement (art. D441-5 C.com) :</strong> Une indemnité forfaitaire de 40 € est due de plein droit pour tout retard de règlement sur facture B2B.</li>
                                <li><strong>Escompte (art. L441-9 C.com) :</strong> Aucun escompte n'est accordé en cas de paiement anticipé sauf convention spécifique.</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === "rgpd" && (
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>Règlement UE 2016/679 (RGPD) & Loi Informatique et Libertés</span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '12px', marginBottom: '8px' }}>Politique de Confidentialité & Protection des Données</h4>
                            <p>GestArt s'engage à protéger la vie privée et les données personnelles de ses utilisateurs et de leurs clients conformément au RGPD :</p>
                            <ul>
                                <li><strong>Principe de minimisation (art. 5 RGPD) :</strong> Seules les données strictly nécessaires à l'établissement des devis, factures et plannings sont collectées.</li>
                                <li><strong>Droit d'accès et d'exportation (art. 15-20 RGPD) :</strong> Vous pouvez à tout moment exporter l'ensemble de vos données d'entreprise et fiches clients depuis votre espace Paramètres.</li>
                                <li><strong>Droit à l'effacement (art. 17 RGPD) :</strong> Vous bénéficiez du droit à l'oubli pour supprimer définitivement votre compte et effacer vos données.</li>
                                <li><strong>Sécurité & Chiffrement (art. 32 RGPD) :</strong> Toutes les données sont transférées via HTTPS avec algorithme SHA-256 / AES et mémorisées dans des serveurs sécurisés.</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === "cookies" && (
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>Article 82 de la Loi Informatique et Libertés</span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '12px', marginBottom: '8px' }}>Politique de Gestion des Cookies</h4>
                            <p>Le site GestArt utilise des cookies essentiels au bon fonctionnement de la plateforme :</p>
                            <ul>
                                <li><strong>Cookies strictement nécessaires :</strong> Permettent de maintenir votre session de connexion active et vos préférences de thème (clair/sombre). Ces cookies ne nécessitent pas de consentement préalable (exemption CNIL).</li>
                                <li><strong>Cookies de mesure d'audience :</strong> Utilisés sous forme anonymisée pour améliorer les performances de la plateforme.</li>
                                <li><strong>Contrôle et désactivation :</strong> Vous pouvez modifier vos préférences de stockage local et cookies depuis les réglages de votre navigateur à tout moment.</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--muted, #f8fafc)'
                }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground, #64748b)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} style={{ color: '#556B2F' }} /> Mise à jour conforme Code du commerce & CGI 2026
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: '#556B2F',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
