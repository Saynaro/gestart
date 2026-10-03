import React from "react";
import { 
    FileText, 
    ShieldCheck, 
    Scale, 
    Lock, 
    Server, 
    Building2, 
    UserCheck, 
    Phone, 
    Mail, 
    MapPin, 
    Globe, 
    ExternalLink, 
    CheckCircle2, 
    AlertCircle 
} from "lucide-react";

export default function AboutTab({ activeTab, isMobileView, triggerToast }) {
    if (activeTab === "mentions") {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', lineHeight: '1.6', fontSize: '13.5px', color: 'var(--foreground)' }}>
                {/* Law Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(85, 107, 47, 0.08)',
                    border: '1px solid rgba(85, 107, 47, 0.2)',
                    borderRadius: '12px',
                    color: '#556B2F'
                }}>
                    <ShieldCheck size={22} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                        Conforme à la Loi n° 2004-575 du 21 juin 2004 (LCEN - Article 6)
                    </span>
                </div>

                {/* Section 1: Éditeur */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={18} style={{ color: '#556B2F' }} />
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>1. Éditeur de la Plateforme & Exploitation</h4>
                    </div>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        La plateforme logicielle SaaS <strong>GestArt</strong> est éditée et exploitée par l'Entrepreneur Individuel (EI) <strong>KHALID SAINARO</strong>.
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
                        gap: '8px',
                        backgroundColor: 'var(--background)',
                        padding: '12px',
                        borderRadius: '10px',
                        fontSize: '12.5px'
                    }}>
                        <div><strong>Nom commercial :</strong> GestArt</div>
                        <div><strong>Forme juridique :</strong> EI (Entrepreneur Individuel)</div>
                        <div><strong>SIREN :</strong> 944 087 725</div>
                        <div><strong>SIRET :</strong> 944 087 725 00015</div>
                        <div><strong>Code APE / NAF :</strong> 53.20Z</div>
                        <div><strong>Immatriculation :</strong> RCS de Nice</div>
                        <div style={{ gridColumn: isMobileView ? 'span 1' : 'span 2' }}>
                            <strong>Siège social :</strong> 23 RUE PAGANINI, 06000 NICE, FRANCE
                        </div>
                        <div style={{ gridColumn: isMobileView ? 'span 1' : 'span 2', color: '#556B2F', fontWeight: 600 }}>
                            <strong>Régime TVA :</strong> Franchise en base de TVA (art. 293 B du CGI) — TVA non applicable
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px', fontSize: '13px' }}>
                        <a href="tel:0651604316" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#556B2F', fontWeight: 600, textDecoration: 'none' }}>
                            <Phone size={15} /> 06 51 60 43 16
                        </a>
                        <a href="mailto:support.gestart@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#556B2F', fontWeight: 600, textDecoration: 'none' }}>
                            <Mail size={15} /> support.gestart@gmail.com
                        </a>
                    </div>
                </div>

                {/* Section 2: Direction & DPO */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={18} style={{ color: '#556B2F' }} />
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>2. Direction de la Publication & DPO</h4>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                        <li><strong>Directeur de la publication :</strong> Khalid Sainaro</li>
                        <li><strong>Délégué à la Protection des Données (DPO) :</strong> Khalid Sainaro (<a href="mailto:support.gestart@gmail.com" style={{ color: '#556B2F', fontWeight: 600 }}>support.gestart@gmail.com</a>)</li>
                    </ul>
                </div>

                {/* Section 3: Hébergement */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Server size={18} style={{ color: '#556B2F' }} />
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>3. Hébergement de l'Infrastructure (Web & Données)</h4>
                    </div>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        La plateforme GestArt (frontend, API backend et bases de données) est hébergée par :
                    </p>
                    <div style={{ backgroundColor: 'var(--background)', padding: '12px', borderRadius: '10px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Prestataire :</strong> Hetzner Online GmbH</div>
                        <div><strong>Adresse :</strong> Industriestr. 25, 91710 Gunzenhausen, Allemagne</div>
                        <div><strong>Contact hébergeur :</strong> +49 (0)9831 505-0 • <a href="https://www.hetzner.com" target="_blank" rel="noopener noreferrer" style={{ color: '#556B2F', fontWeight: 600 }}>www.hetzner.com</a></div>
                        <div><strong>Localisation des serveurs :</strong> Union Européenne (Allemagne / Finlande) — Certifié ISO 27001, chiffrement AES-256.</div>
                    </div>
                </div>

                {/* Section 4: Propriété Intellectuelle */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>4. Propriété Intellectuelle</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        L'ensemble des marques, logos, visuels, architectures logicielles, codes sources et modules CRM présents sur GestArt sont la propriété exclusive de KHALID SAINARO (EI). Toute reproduction ou exploitation non autorisée constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
                    </p>
                </div>

                {/* Section 5: Médiation */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>5. Médiateur de la Consommation</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        Conformément aux articles L.616-1 et R.616-1 du Code de la consommation :<br />
                        <strong>CM2C (Centre de la Médiation de la Consommation de Conciliateurs de Justice)</strong><br />
                        14 rue Saint Jean, 75017 Paris — <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer" style={{ color: '#556B2F', fontWeight: 600 }}>www.cm2c.net</a>
                    </p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px' }}>
                    GestArt v1.0.0 • Tous droits réservés © 2026 KHALID SAINARO (EI)
                </div>
            </div>
        );
    }

    if (activeTab === "cgu") {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', lineHeight: '1.6', fontSize: '13.5px', color: 'var(--foreground)' }}>
                {/* Law Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(85, 107, 47, 0.08)',
                    border: '1px solid rgba(85, 107, 47, 0.2)',
                    borderRadius: '12px',
                    color: '#556B2F'
                }}>
                    <Scale size={22} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                        Code de Commerce (art. L441-1 & L441-10) • Code de la Consommation
                    </span>
                </div>

                {/* Article 1 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Article 1 — Objet du Service SaaS & Capacité</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        GestArt fournit aux artisans et entreprises du bâtiment une solution logicielle B2B SaaS accessible 24/7 permettant la gestion de clientèle, planification d'interventions, relances automatiques et facturation électronique conforme. L'accès au service est réservé aux personnes physiques majeures (âgées d'au moins 18 ans) disposant de la pleine capacité juridique de contracter, ou aux personnes morales valablement représentées. En cochant la case d'acceptation lors de l'inscription, l'utilisateur déclare et garantit sur l'honneur remplir ces conditions.
                    </p>
                </div>

                {/* Article 2 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Article 2 — Essai Gratuit & Souscription</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        Un essai gratuit de 14 jours complet est offert lors de l'inscription. À l'issue de cet essai, l'accès requiert la souscription d'une formule (Starter, Pro ou Unlimited) avec renouvellement automatique par tacite reconduction, résiliable en 1 clic à tout moment.
                    </p>
                </div>

                {/* Article 3 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Article 3 — Tarification & Paiements Sécurisés</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        Les prix sont libellés en Euros. La TVA est non applicable (art. 293 B du CGI). Les paiements par carte bancaire sont traités via <strong>Stripe</strong> (certifié PCI-DSS Niveau 1, protocole 3D-Secure 2). GestArt ne stocke aucune coordonnée bancaire.
                    </p>
                </div>

                {/* Article 4 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Article 4 — Pénalités de Retard & Recouvrement</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        Conformément aux articles L.441-10 et D.441-5 du Code de commerce, tout retard de paiement entraîne l'application de pénalités au taux BCE majoré de 10 points et d'une indemnité forfaitaire légale de <strong>40 €</strong> pour frais de recouvrement.
                    </p>
                </div>

                {/* Article 5 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Article 5 — Rétractation (14j) & Juridiction</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        L'utilisateur bénéficie d'un droit de rétractation de 14 jours. Les présentes conditions sont régies par le droit français. En cas de litige entre professionnels, compétence exclusive est attribuée aux tribunaux de <strong>Nice (06000)</strong>.
                    </p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px' }}>
                    GestArt v1.0.0 • Mis à jour en 2026
                </div>
            </div>
        );
    }

    if (activeTab === "confidentialite") {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', lineHeight: '1.6', fontSize: '13.5px', color: 'var(--foreground)' }}>
                {/* Law Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(85, 107, 47, 0.08)',
                    border: '1px solid rgba(85, 107, 47, 0.2)',
                    borderRadius: '12px',
                    color: '#556B2F'
                }}>
                    <Lock size={22} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                        Règlement Général sur la Protection des Données (RGPD 2016/679)
                    </span>
                </div>

                {/* Section 1 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>1. Responsable de Traitement & Contact DPO</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        Le responsable de traitement est KHALID SAINARO (EI GestArt), 23 Rue Paganini, 06000 Nice. Contact DPO : <a href="mailto:support.gestart@gmail.com" style={{ color: '#556B2F', fontWeight: 600 }}>support.gestart@gmail.com</a>.
                    </p>
                </div>

                {/* Section 2 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>2. Finalités & Durées de Conservation</h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                        <li><strong>Données de compte :</strong> Conservées pendant toute la durée contractuelle puis 3 ans (art. 6.1.b RGPD).</li>
                        <li><strong>Pièces comptables & factures :</strong> Conservées 10 ans selon l'article L.123-22 du Code de commerce.</li>
                        <li><strong>Logs de connexion :</strong> Conservés 12 mois maximum (décret n° 2011-219).</li>
                    </ul>
                </div>

                {/* Section 3 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>3. Non-Commercialisation & Sous-traitants</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        GestArt ne commercialise aucune donnée personnelle. Les données sont traitées uniquement par nos sous-traitants techniques certifiés : <strong>Hetzner Online GmbH</strong> (hébergement UE) et <strong>Stripe Payments Europe</strong> (paiement sécurisé).
                    </p>
                </div>

                {/* Section 4 */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: isMobileView ? '16px' : '20px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>4. Vos Droits & Réclamation CNIL</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        Vous disposez d'un droit d'accès, de rectification, d'exportation (JSON/CSV) et d'effacement en écrivant à <a href="mailto:support.gestart@gmail.com" style={{ color: '#556B2F', fontWeight: 600 }}>support.gestart@gmail.com</a>. Vous pouvez également saisir la <strong>CNIL</strong> (3 Place de Fontenoy, 75007 Paris — www.cnil.fr).
                    </p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px' }}>
                    GestArt v1.0.0 • Conformité RGPD Européenne 2016/679
                </div>
            </div>
        );
    }

    return null;
}
