import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
    const activeTabRef = React.useRef(null);

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

    React.useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeTab]);

    return createPortal(
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
                height: '640px',
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
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--muted, #f8fafc)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={24} style={{ color: '#556B2F' }} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Centre de Conformité &amp; Légal</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground, #64748b)' }}>
                                GestArt - Conforme aux lois françaises &amp; européennes
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--foreground, #0f172a)', padding: '6px' }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tabs Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '52px',
                    minHeight: '52px',
                    flexShrink: 0,
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    overflowX: 'auto',
                    backgroundColor: 'var(--card, #ffffff)',
                    padding: '0 16px',
                    boxSizing: 'border-box'
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
                                ref={isActive ? activeTabRef : null}
                                onClick={() => setActiveTab(t.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: '1 0 auto',
                                    minWidth: '140px',
                                    gap: '8px',
                                    height: '100%',
                                    padding: '0 12px',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: isActive ? '3px solid #556B2F' : '3px solid transparent',
                                    color: isActive ? '#556B2F' : 'var(--muted-foreground, #64748b)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    boxSizing: 'border-box',
                                    transition: 'color 0.15s ease, border-color 0.15s ease'
                                }}
                            >
                                <Icon size={18} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontSize: '0.875rem', lineHeight: 1.6 }}>
                    {activeTab === "mentions" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Conforme à la Loi N° 2004-575 (LCEN - Article 6)
                            </span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Mentions Légales du service GestArt</h4>
                            <p style={{ margin: 0 }}>Conformément à l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), l'identité des différents intervenants dans le cadre de la réalisation et du suivi du service GestArt est précisée ci-dessous :</p>
                            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li><strong>Éditeur du service :</strong> KHALID SAINARO (Entreprise Individuelle - EI), nom commercial "GestArt".</li>
                                <li><strong>Siège social :</strong> 23 RUE PAGANINI, 06000 NICE, France.</li>
                                <li><strong>Numéros d'immatriculation :</strong> SIREN 944 087 725 | SIRET 944 087 725 00015 | Immatriculée au RCS de Nice.</li>
                                <li><strong>Numéro de TVA Intracommunautaire :</strong> FR12944087725 (Franchise en base de TVA selon l'article 293 B du CGI le cas échéant).</li>
                                <li><strong>Directeur de la publication & DPO :</strong> Khalid Sainaro (Contact : <strong>support.gestart@gmail.com</strong>).</li>
                                <li><strong>Hébergement des données & Infrastructure :</strong> Serveurs hautement sécurisés situés dans l'Union Européenne (Paris, France / Allemagne) par Hostinger International Ltd. / Vercel Inc. & Cloudflare Inc. Données chiffrées au repos (AES-256) et en transit (SSL/TLS 1.3).</li>
                                <li><strong>Propriété Intellectuelle :</strong> L'ensemble de la marque GestArt, du logo, de la charte graphique, des codes sources, bases de données et contenus textuels sont la propriété exclusive de KHALID SAINARO. Toute reproduction, représentation ou exploitation non autorisée constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.</li>
                                <li><strong>Médiation de la consommation (Art. L612-1 C. conso) :</strong> En cas de litige, le client consommateur a le droit de recourir gratuitement à un médiateur de la consommation agréé en vue de la résolution amiable du litige.</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === "cgu" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Code de Commerce (art. L441-1) &amp; Code de la Consommation (art. L111-1)
                            </span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Conditions Générales d'Utilisation &amp; de Vente (CGU / CGV)</h4>
                            <p style={{ margin: 0 }}>Les présentes CGU/CGV régissent l'accès, la souscription et l'utilisation de la plateforme SaaS GestArt pour la gestion de clients, devis, facturation et plannings d'interventions :</p>
                            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li><strong>Objet &amp; Accès au service :</strong> GestArt fournit une solution logicielle B2B/B2C en mode SaaS accessible 24/7. L'accès nécessite la création d'un compte sécurisé avec identifiants personnels stricts.</li>
                                <li><strong>Essai Gratuit &amp; Abonnements :</strong> Un essai gratuit de 14 jours sans carte bancaire est offert à tout nouveau compte. À l'issue de l'essai, l'utilisateur choisit sa formule (Starter, Pro, Unlimited). Les paiements sont sécurisés par Stripe.</li>
                                <li><strong>Conformité des Devis &amp; Factures (art. L111-3 C.conso &amp; CGI art. 289) :</strong> GestArt génère des factures et devis conformes aux normes fiscales françaises. Les devis ont une durée de validité standard de 30 jours sauf mention spécifique.</li>
                                <li><strong>Pénalités de Retard (art. L441-10 C.com) :</strong> En cas de retard de paiement sur abonnement ou prestation, des pénalités de retard s'appliquent de plein droit au taux annuel de la Banque Centrale Européenne majoré de 10 points.</li>
                                <li><strong>Indemnité Forfaitaire de Recouvrement (art. D441-5 C.com) :</strong> Une indemnité forfaitaire de 40 € est due de plein droit pour frais de recouvrement en cas de retard de paiement B2B. Aucun escompte n'est accordé en cas de paiement anticipé.</li>
                                <li><strong>Résiliation &amp; Rétractation :</strong> L'utilisateur peut résilier son abonnement sans préavis ni pénalité à tout moment depuis son espace Paramètres. Le droit de rétractation de 14 jours s'applique conformément à l'article L221-18 du Code de la consommation.</li>
                                <li><strong>Responsabilité &amp; Disponibilité (SLA) :</strong> GestArt s'engage à maintenir une disponibilité minimale du service de 99,9%. Les sauvegardes sont exécutées quotidiennement. GestArt ne saurait être tenu responsable des dommages indirects ou des pertes de données consécutives à une mauvaise utilisation.</li>
                                <li><strong>Loi applicable &amp; Juridiction :</strong> Les présentes CGU/CGV sont soumises au droit français. Tout litige relatif à leur interprétation ou exécution sera de la compétence exclusive des tribunaux du ressort de Nice (06000).</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === "rgpd" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Règlement Général sur la Protection des Données (RGPD 2016/679) &amp; Loi n° 78-17
                            </span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Politique de Confidentialité &amp; Protection des Données Personnelles</h4>
                            <p style={{ margin: 0 }}>GestArt s'engage fermement à respecter la vie privée de ses utilisateurs et la confidentialité des données hébergées conformément au RGPD :</p>
                            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li><strong>Responsable du Traitement :</strong> KHALID SAINARO (EI) — DPO : <strong>support.gestart@gmail.com</strong>.</li>
                                <li><strong>Données collectées &amp; Finalité :</strong> Les données collectées (nom, prénom, email, téléphone, SIRET, adresses d'intervention, factures) sont strictly nécessaires à l'exécution du service, la facturation et l'assistance technique (art. 6.1.b RGPD).</li>
                                <li><strong>Principe de minimisation &amp; Non-revente :</strong> GestArt ne commercialise, ne loue et ne cède aucune donnée personnelle à des tiers à des fins publicitaires.</li>
                                <li><strong>Durée de conservation :</strong> Les données du compte sont conservées pendant la durée de la relation contractuelle + 3 ans à des fins de prospection. Les factures et pièces comptables sont archivées 10 ans conformément à l'article L123-22 du Code de commerce.</li>
                                <li><strong>Vos Droits (art. 15-22 RGPD) :</strong> Vous disposez d'un droit d'accès, de rectification, de portabilité (export JSON/CSV), d'effacement (droit à l'oubli) et d'opposition. Pour exercer ces droits, envoyez un email à <strong>support.gestart@gmail.com</strong>.</li>
                                <li><strong>Sécurité des données (art. 32 RGPD) :</strong> Les mots de passe sont hachés via bcrypt. L'accès à la base de données est restreint et surveillé. Chiffrement HTTPS/TLS sur tous les flux.</li>
                                <li><strong>Droit de réclamation auprès de la CNIL :</strong> Si vous estimez que vos droits ne sont pas respectés, vous pouvez soumettre une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés — www.cnil.fr).</li>
                            </ul>
                        </div>
                    )}

                    {activeTab === "cookies" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 8px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Article 82 de la Loi Informatique et Libertés &amp; Directive Privacy
                            </span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Politique de Gestion des Cookies &amp; Fichiers Témoins</h4>
                            <p style={{ margin: 0 }}>GestArt utilise des cookies et technologies de stockage local pour assurer un fonctionnement fluide et sécurisé :</p>
                            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li><strong>Cookies strictement nécessaires (Exemptés de consentement) :</strong> Nécessaires au maintien de votre session d'authentification (tokens JWT) et à la sauvegarde de vos préférences d'interface (thème clair/sombre). Conformes aux exemptions de la CNIL.</li>
                                <li><strong>Cookies de mesure d'audience &amp; performance :</strong> Utilisés de manière strictement anonyme pour analyser l'utilisation de la plateforme et corriger d'éventuels bugs.</li>
                                <li><strong>Durée de conservation des cookies :</strong> Les cookies et jetons de stockage sont conservés pour une durée maximale de 13 mois.</li>
                                <li><strong>Gestion et Refus :</strong> Vous pouvez à tout moment désactiver ou vider les cookies depuis le menu de votre navigateur Web (Google Chrome, Firefox, Safari, Edge) ou via l'onglet Paramètres &gt; Légal &amp; RGPD de votre espace GestArt.</li>
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
        </div>,
        document.body
    );
}
