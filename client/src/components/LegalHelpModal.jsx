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
    const normalizeTab = (t) => {
        if (!t) return "mentions";
        const low = String(t).toLowerCase();
        if (low === "privacy" || low === "rgpd" || low === "confidentialite" || low === "confidentialité") return "rgpd";
        if (low === "cgu" || low === "cgv" || low === "terms") return "cgu";
        if (low === "cookies" || low === "cookie") return "cookies";
        if (low === "mentions" || low === "legal") return "mentions";
        return "mentions";
    };

    const [activeTab, setActiveTab] = useState(() => normalizeTab(type));
    const activeTabRef = React.useRef(null);

    React.useEffect(() => {
        if (type) {
            setActiveTab(normalizeTab(type));
        }
    }, [type]);

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 10px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Conforme à la Loi n° 2004-575 du 21 juin 2004 (LCEN - Article 6)
                            </span>
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground, #0F172A)' }}>Mentions Légales du service GestArt</h4>
                            <p style={{ margin: 0, color: 'var(--muted-foreground, #4b5563)' }}>
                                Conformément aux dispositions de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), l'identité des différents intervenants dans le cadre de la réalisation et du suivi de la plateforme logicielle SaaS <strong>GestArt</strong> est précisée ci-dessous :
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>1. Éditeur de la Plateforme & Exploitation</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Nom & Prénom de l'exploitant :</strong> Khalid SAINARO</li>
                                        <li><strong>Forme juridique :</strong> Entrepreneur Individuel (EI) — Nom commercial : <strong>GestArt</strong></li>
                                        <li><strong>Siège social :</strong> 23 RUE PAGANINI, 06000 NICE, France</li>
                                        <li><strong>Identifiant SIREN :</strong> 944 087 725</li>
                                        <li><strong>Identifiant SIRET (siège) :</strong> 944 087 725 00015</li>
                                        <li><strong>Activité Principale Exercée (Code APE / NAF) :</strong> 53.20Z — Autres activités de poste et de courrier</li>
                                        <li><strong>Registre du Commerce & des Sociétés :</strong> Immatriculée au RCS de Nice</li>
                                        <li><strong>Régime fiscal & TVA :</strong> Franchise en base de TVA selon l'article 293 B du Code Général des Impôts (TVA non applicable)</li>
                                        <li><strong>Contact téléphonique :</strong> 06 51 60 43 16 (+33 6 51 60 43 16)</li>
                                        <li><strong>Contact support client :</strong> <a href="mailto:support.gestart@gmail.com" style={{ color: '#556B2F', fontWeight: 600 }}>support.gestart@gmail.com</a></li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>2. Direction de la Publication & Délégué à la Protection des Données (DPO)</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Directeur de la publication :</strong> Khalid Sainaro</li>
                                        <li><strong>Délégué à la Protection des Données (DPO) :</strong> Khalid Sainaro — <a href="mailto:support.gestart@gmail.com" style={{ color: '#556B2F', fontWeight: 600 }}>support.gestart@gmail.com</a></li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>3. Hébergement de la Plateforme (Frontend, Backend & Données)</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Prestataire d'hébergement :</strong> Hetzner Online GmbH</li>
                                        <li><strong>Adresse du siège de l'hébergeur :</strong> Industriestr. 25, 91710 Gunzenhausen, Allemagne</li>
                                        <li><strong>Contact hébergeur :</strong> Téléphone : +49 (0)9831 505-0 • Site web : <a href="https://www.hetzner.com" target="_blank" rel="noopener noreferrer" style={{ color: '#556B2F', fontWeight: 600 }}>www.hetzner.com</a></li>
                                        <li><strong>Localisation des serveurs & bases de données :</strong> Centres de données hautement sécurisés situés au sein de l'Union Européenne (Allemagne / Finlande).</li>
                                        <li><strong>Sécurité des infrastructures :</strong> Certifications ISO 27001, redondance d'alimentation, sauvegardes automatisées quotidiennes et chiffrement en transit (TLS 1.3) et au repos (AES-256).</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>4. Propriété Intellectuelle & Droits d'Auteur</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        L'ensemble des marques, logos, visuels, chartes graphiques, codes sources, bases de données, architectures logicielles et contenus textuels présents sur GestArt sont la propriété exclusive de KHALID SAINARO (EI). Toute reproduction, représentation, modification, publication, transmission ou dénaturation totale ou partielle du site ou de ses composants, par quelque procédé que ce soit et sur quelque support que ce soit, est strictement interdite sans autorisation écrite préalable, conformément aux articles L.335-2 et suivants du Code de la propriété intellectuelle.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>5. Règlement des Litiges & Médiation de la Consommation</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, en cas de litige non résolu par notre service client, le consommateur a le droit de recourir gratuitement à un médiateur de la consommation agréé : <strong>Centre de Médiation de la Consommation de Conciliateurs de Justice (CM2C)</strong> — 14 rue Saint Jean, 75017 Paris — <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer" style={{ color: '#556B2F', fontWeight: 600 }}>www.cm2c.net</a>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "cgu" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 10px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Code de Commerce (art. L441-1 &amp; L441-10) • Code de la Consommation (art. L111-1 &amp; L221-18)
                            </span>
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground, #0F172A)' }}>Conditions Générales d'Utilisation &amp; de Vente (CGU / CGV)</h4>
                            <p style={{ margin: 0, color: 'var(--muted-foreground, #4b5563)' }}>
                                Les présentes Conditions Générales d'Utilisation et de Vente régissent sans réserve l'accès, la souscription et l'utilisation de la solution logicielle SaaS <strong>GestArt</strong> :
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>Article 1 — Objet du Service &amp; Accès</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        GestArt met à disposition des professionnels du bâtiment, de la maintenance et des artisans une solution logicielle en mode SaaS (Software as a Service) accessible 24/7 permettant la gestion de clientèle, planification d'interventions, relances automatiques SMS, émission de devis conformes et facturation électronique. L'accès nécessite la création d'un compte avec identifiants personnels sécurisés.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>Article 2 — Période d'Essai Gratuit &amp; Formules d'Abonnement</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Essai Gratuit :</strong> Un essai de 14 jours complet et sans engagement est offert à chaque nouvel utilisateur lors de l'inscription, sans obligation de saisir une carte bancaire.</li>
                                        <li><strong>Formules d'Abonnement :</strong> À l'issue de l'essai, l'utilisateur peut souscrire aux formules <em>Starter</em>, <em>Pro</em> ou <em>Unlimited</em> selon les modalités mensuelles ou annuelles proposées.</li>
                                        <li><strong>Renouvellement :</strong> Les abonnements sont renouvelés automatiquement par tacite reconduction à chaque échéance (mensuelle ou annuelle) jusqu'à résiliation par l'utilisateur.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>Article 3 — Tarifs, Modalités de Paiement &amp; Sécurité Bancaire</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Tarifs :</strong> Les prix sont affichés en Euros. En vertu de l'article 293 B du Code Général des Impôts, la TVA est non applicable (franchise en base).</li>
                                        <li><strong>Paiement sécurisé :</strong> Les règlements par carte bancaire sont opérés via le prestataire sécurisé <strong>Stripe</strong> (conforme à la norme PCI-DSS Niveau 1 et authentification forte 3D-Secure 2). GestArt ne stocke aucun numéro de carte bancaire sur ses serveurs.</li>
                                        <li><strong>Facturation de l'abonnement :</strong> Un justificatif de paiement / reçu officiel conforme est instantanément généré et téléchargeable au format PDF dans l'espace Paramètres.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>Article 4 — Pénalités de Retard &amp; Indemnité Forfaitaire de Recouvrement</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Conformément aux articles L.441-10 et D.441-5 du Code de commerce, tout retard de paiement entraîne de plein droit l'application de pénalités de retard calculées au taux directeur de la Banque Centrale Européenne majoré de 10 points de pourcentage, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € due par tout professionnel. Aucun escompte pour paiement anticipé n'est accordé.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>Article 5 — Droit de Rétractation &amp; Résiliation</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Rétractation (art. L221-18 C. conso) :</strong> L'utilisateur bénéficie d'un délai légal de rétractation de 14 jours à compter de la souscription initiale.</li>
                                        <li><strong>Résiliation en 1 clic :</strong> L'utilisateur peut résilier son abonnement à tout moment sans préavis ni frais depuis son espace <em>Paramètres &gt; Abonnement</em>. L'accès reste actif jusqu'à la fin de la période de facturation en cours.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>Article 6 — Disponibilité du Service (SLA), Sauvegardes &amp; Responsabilité</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        GestArt s'engage à apporter tous les soins raisonnables pour garantir une disponibilité de 99,9% du service SaaS. Des sauvegardes quotidiennes sont exécutées sur des serveurs distincts. L'utilisateur demeure responsable de l'exactitude des informations émises sur ses devis et factures (art. 289 du CGI). GestArt ne saurait être tenu responsable des pertes d'exploitation indirectes.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>Article 7 — Droit Applicable &amp; Attribution de Juridiction</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Les présentes conditions sont soumises à la législation française. En cas de différend entre professionnels concernant leur validité, interprétation ou exécution, compétence expresse est attribuée aux tribunaux compétents du ressort de <strong>Nice (06000)</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "rgpd" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 10px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Règlement Général sur la Protection des Données (RGPD 2016/679) &amp; Loi Informatique et Libertés
                            </span>
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground, #0F172A)' }}>Politique de Confidentialité &amp; Protection des Données Personnelles</h4>
                            <p style={{ margin: 0, color: 'var(--muted-foreground, #4b5563)' }}>
                                GestArt s'engage à assurer le plus haut niveau de protection de vos données personnelles et de celles de vos clients, en stricte conformité avec le Règlement (UE) 2016/679 (RGPD) et la loi Informatique et Libertés n° 78-17 modifiée.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>1. Responsable de Traitement &amp; Contact DPO</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Le responsable du traitement des données est l'Entreprise Individuelle <strong>KHALID SAINARO</strong> (GestArt), 23 Rue Paganini, 06000 Nice. Pour toute demande relative à vos données, contactez notre DPO par email : <a href="mailto:support.gestart@gmail.com" style={{ color: '#556B2F', fontWeight: 600 }}>support.gestart@gmail.com</a>.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>2. Données Collectées &amp; Finalités des Traitements</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Gestion de compte &amp; authentification :</strong> Nom, prénom, adresse email, numéro de téléphone, mot de passe chiffré (Base légale : exécution du contrat, art. 6.1.b RGPD).</li>
                                        <li><strong>Facturation &amp; Devis :</strong> Dénomination sociale, SIRET/SIREN, adresse légale, coordonnées bancaires IBAN/BIC (Base légale : obligation légale comptable et fiscale, art. 6.1.c RGPD).</li>
                                        <li><strong>Planification &amp; Suivi d'interventions :</strong> Adresses de chantiers, fiches clients, photos d'interventions, historiques de maintenance (Base légale : exécution du contrat de service).</li>
                                        <li><strong>Notifications &amp; Rappels :</strong> Envoi d'alertes par email ou SMS pour les entretiens techniques et rendez-vous (Base légale : exécution du service et consentement).</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>3. Principe de Non-Commercialisation &amp; Sous-traitants Agréés</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        GestArt ne commercialise, ne loue et ne cède aucune donnée personnelle à des fins publicitaires. Les données sont uniquement transmises à nos sous-traitants techniques hautement qualifiés :
                                    </p>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Hetzner Online GmbH (Allemagne) :</strong> Hébergement d'infrastructure et bases de données au sein de l'Union Européenne.</li>
                                        <li><strong>Stripe Payments Europe Ltd. (Irlande) :</strong> Traitement sécurisé des paiements certifié PCI-DSS.</li>
                                        <li><strong>Passerelles d'envoi Email / SMS :</strong> Acheminement sécurisé des messages transactionnels et vérifications de sécurité.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>4. Durée de Conservation des Données</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><strong>Données de compte utilisateur :</strong> Conservées pendant toute la durée de la relation contractuelle, puis 3 ans à compter du dernier contact actif.</li>
                                        <li><strong>Pièces comptables, factures et justificatifs :</strong> Archivées pendant 10 ans conformément à l'article L.123-22 du Code de commerce.</li>
                                        <li><strong>Logs de connexion et sécurité :</strong> Conservés 12 mois maximum (décret n° 2011-219).</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>5. Vos Droits &amp; Modalités d'Exercice</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement (droit à l'oubli), de limitation, de portabilité (export JSON/CSV dans vos paramètres) et d'opposition. Pour exercer ces droits, adressez votre demande à <a href="mailto:support.gestart@gmail.com" style={{ color: '#556B2F', fontWeight: 600 }}>support.gestart@gmail.com</a>. Une réponse vous sera apportée sous 30 jours maximum.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>6. Droit de Réclamation auprès de la CNIL</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Si vous estimez que le traitement de vos données ne respecte pas la réglementation, vous avez le droit d'introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#556B2F', fontWeight: 600 }}>www.cnil.fr</a>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "cookies" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', padding: '4px 10px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                                Article 82 de la Loi Informatique et Libertés • Délibération CNIL n° 2020-091 &amp; 2020-092
                            </span>
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground, #0F172A)' }}>Politique de Gestion des Cookies &amp; Traceurs</h4>
                            <p style={{ margin: 0, color: 'var(--muted-foreground, #4b5563)' }}>
                                GestArt applique scrupuleusement les recommandations de la CNIL relatives aux cookies et autres traceurs de connexion :
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>1. Qu'est-ce qu'un Cookie ?</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site internet, permettant d'enregistrer des informations relatives à votre navigation et d'assurer le maintien de votre session connectée.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>2. Cookies Strictement Nécessaires au Fonctionnement (Exemptés de consentement)</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Conformément aux lignes directrices de la CNIL, ces cookies sont indispensables au fonctionnement technique de la plateforme et ne nécessitent pas de consentement préalable :
                                    </p>
                                    <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li><code>gestart_access</code> &amp; <code>gestart_refresh</code> : Maintien sécurisé de votre session d'authentification par jeton chiffré (JWT HttpOnly).</li>
                                        <li><code>theme_mode</code> / <code>theme</code> : Sauvegarde de vos préférences d'affichage (mode sombre / clair).</li>
                                        <li><code>gestart_cookie_consent</code> : Enregistrement de votre choix relatif au consentement des traceurs.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>3. Cookies de Mesure d'Audience &amp; Performance</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Ces traceurs anonymisés permettent de mesurer l'audience de la plateforme afin d'optimiser les performances techniques et de détecter les erreurs de navigation. Aucune donnée nominative de profilage n'est transmise à des régies publicitaires tierces.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>4. Durée de Conservation des Cookies</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Conformément à la réglementation de la CNIL, la durée de vie des cookies et de validité de votre consentement est strictement limitée à <strong>13 mois maximum</strong> à compter de leur dépôt initial.
                                    </p>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--foreground, #0F172A)' }}>5. Comment Gérer ou Révoquer vos Cookies ?</strong>
                                    <p style={{ margin: '4px 0 0 0' }}>
                                        Vous pouvez modifier votre choix à tout moment en cliquant sur le lien <em>Gestion des cookies</em> en bas de page ou en ouvrant le bandeau de consentement dans vos paramètres. Vous pouvez également configurer votre navigateur web pour bloquer ou supprimer les cookies (Chrome, Firefox, Safari, Edge).
                                    </p>
                                </div>
                            </div>
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
