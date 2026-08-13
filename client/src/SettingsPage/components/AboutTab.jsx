import React from "react";
import { FileText, Shield, BookOpen, Info, CheckCircle2 } from "lucide-react";

export default function AboutTab({ activeTab, isMobileView, triggerToast }) {
    if (activeTab === "mentions") {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6', fontSize: '13.5px', color: 'var(--foreground)' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800 }}>Mentions Légales (Art. 6 Loi n° 2004-575 du 21 juin 2004 LCEN)</h3>
                    
                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>1. Éditeur de la Plateforme</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        La plateforme GestArt est éditée par l'Entreprise Individuelle (EI) KHALID SAINARO, immatriculée au RCS de Nice sous le numéro SIREN 944 087 725 (SIRET : 944 087 725 00015), dont le siège social est situé au 23 RUE PAGANINI, 06000 NICE, France.<br />
                        Directeur de la publication & DPO : Khalid Sainaro (Contact : support.gestart@gmail.com).
                    </p>

                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>2. Hébergement de la Plateforme</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        GestArt est hébergée sur des serveurs sécurisés situés au sein de l'Union Européenne (Paris, France / Allemagne) par Hostinger / Cloudflare Inc.<br />
                        Données sauvegardées quotidiennement avec chiffrement AES-256.
                    </p>

                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>3. Propriété Intellectuelle</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        L'ensemble des éléments graphiques, marques, logos, codes sources et modules CRM de GestArt sont la propriété exclusive de KHALID SAINARO. Toute reproduction non autorisée constitue une contrefaçon sanctionnée par le Code de la propriété intellectuelle.
                    </p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '10px' }}>
                    GestArt v1.0.0 • Tous droits réservés © 2026
                </div>
            </div>
        );
    }

    if (activeTab === "cgu") {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6', fontSize: '13.5px', color: 'var(--foreground)' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800 }}>Conditions Générales d'Utilisation (CGU)</h3>
                    
                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>1. Objet du Service</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        GestArt fournit une solution B2B SaaS de gestion de la relation client (CRM), de facturation et de planification d'interventions destinée aux professionnels du bâtiment et de l'installation technique (HVAC, électricité, plomberie, chauffage).
                    </p>

                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>2. Engagement et Responsabilité de l'Utilisateur</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        L'utilisateur s'engage à fournir des informations juridiques exactes (SIRET, Forme juridique, TVA) et à respecter la législation en matière de facturation (art. 289 du CGI).
                    </p>

                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>3. Résiliation & Modalités de Paiement</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        Les abonnements sont souscrits sans engagement de durée longue. L'utilisateur peut résilier son abonnement à tout moment depuis son espace client.
                    </p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '10px' }}>
                    GestArt v1.0.0 • Mis à jour en 2026
                </div>
            </div>
        );
    }

    if (activeTab === "confidentialite") {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6', fontSize: '13.5px', color: 'var(--foreground)' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800 }}>Politique de Confidentialité & Protection des Données (RGPD)</h3>
                    
                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>1. Collecte et Traitement des Données</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        GestArt collecte uniquement les données nécessaires à la réalisation de vos factures, devis et rappels d'entretien (noms, prénoms, adresses d'intervention, numéros de téléphone et emails).
                    </p>

                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>2. Sécurité et Chiffrement</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        Les mots de passe sont hachés via l'algorithme bcrypt avec un sel unique. Toutes les données transitant sur notre réseau utilisent des protocoles chiffrés TLS 1.3 (HTTPS).
                    </p>

                    <h4 style={{ margin: '14px 0 4px 0', fontSize: '14px', fontWeight: 700 }}>3. Vos Droits Informatique et Libertés</h4>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
                        Conformément au RGPD, vous bénéficiez à tout moment d'un droit d'accès, d'exportation (JSON/CSV) et de suppression définitive de vos données en contactant notre DPO à support.gestart@gmail.com.
                    </p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '10px' }}>
                    GestArt v1.0.0 • Conformité RGPD Européenne 2016/679
                </div>
            </div>
        );
    }

    return null;
}
