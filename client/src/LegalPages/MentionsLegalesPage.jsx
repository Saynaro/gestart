import React from 'react';
import LegalLayout from './LegalLayout';

export default function MentionsLegalesPage() {
    return (
        <LegalLayout
            title="Mentions Légales"
            subtitle="Informations légales obligatoires relatives à l'éditeur et à l'hébergement du service SaaS GestArt."
            lastUpdated="Février 2026"
        >
            <div className="legal-note">
                Conformément aux dispositions de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), l'identité des différents intervenants dans le cadre de la réalisation et du suivi de la plateforme logicielle SaaS GestArt est précisée ci-dessous.
            </div>

            <h2>1. Éditeur de la Plateforme</h2>
            <p>
                La plateforme logicielle SaaS <strong>GestArt</strong> (accessible depuis le site web et l'application web/PWA) est éditée et exploitée par :
            </p>

            <div className="legal-kv-grid">
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Exploitant</span>
                    <span className="legal-kv-value">Khalid SAINARO</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Forme juridique</span>
                    <span className="legal-kv-value">Entrepreneur Individuel (EI)</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Nom commercial</span>
                    <span className="legal-kv-value">GestArt</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">SIREN</span>
                    <span className="legal-kv-value">944 087 725</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">SIRET (siège)</span>
                    <span className="legal-kv-value">944 087 725 00015</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Code APE / NAF</span>
                    <span className="legal-kv-value">53.20Z</span>
                </div>
                <div className="legal-kv-item full-width">
                    <span className="legal-kv-label">Siège social</span>
                    <span className="legal-kv-value">23 RUE PAGANINI, 06000 NICE, France</span>
                </div>
                <div className="legal-kv-item full-width">
                    <span className="legal-kv-label">Régime fiscal & TVA</span>
                    <span className="legal-kv-value">Franchise en base de TVA selon l'article 293 B du Code Général des Impôts (TVA non applicable)</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Téléphone</span>
                    <span className="legal-kv-value">+33 6 51 60 43 16</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Email support</span>
                    <span className="legal-kv-value"><a href="mailto:support.gestart@gmail.com">support.gestart@gmail.com</a></span>
                </div>
            </div>

            <h2>2. Direction de la Publication & DPO</h2>
            <p>
                <strong>Directeur de la publication :</strong> Khalid SAINARO, en sa qualité d'exploitant de GestArt.<br />
                <strong>Délégué à la Protection des Données (DPO) :</strong> Khalid SAINARO — contactable directement à l'adresse <a href="mailto:support.gestart@gmail.com">support.gestart@gmail.com</a>.
            </p>

            <h2>3. Hébergement de l'Application</h2>
            <p>
                L'infrastructure technique (serveurs applicatifs, bases de données et stockage des sauvegardes) est hébergée au sein de l'Union Européenne par :
            </p>

            <div className="legal-kv-grid">
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Prestataire</span>
                    <span className="legal-kv-value">Hetzner Online GmbH</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Siège social</span>
                    <span className="legal-kv-value">Industriestr. 25, 91710 Gunzenhausen, Allemagne</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Contact hébergeur</span>
                    <span className="legal-kv-value">+49 (0)9831 505-0 • <a href="https://www.hetzner.com" target="_blank" rel="noopener noreferrer">www.hetzner.com</a></span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Localisation des données</span>
                    <span className="legal-kv-value">Union Européenne (Allemagne / Finlande) — Certifié ISO 27001</span>
                </div>
            </div>

            <h2>4. Propriété Intellectuelle</h2>
            <p>
                L'ensemble des éléments constituant le logiciel GestArt (marques, logos, textes, éléments graphiques, photographies, vidéos, architecture logicielle, algorithmes et codes sources) relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle.
            </p>
            <p>
                Toute reproduction, représentation, modification, publication, transmission ou dénaturation, totale ou partielle, du site ou de ses composants, par quelque procédé que ce soit et sur quelque support que ce soit, sans l'autorisation écrite préalable de KHALID SAINARO (EI), est strictement interdite et sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
            </p>

            <h2>5. Règlement des Litiges & Médiation</h2>
            <p>
                Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, en cas de litige qui n'aurait pu être résolu à l'amiable avec notre support client, le consommateur a le droit de recourir gratuitement au médiateur de la consommation agréé :
            </p>
            <p>
                <strong>Centre de Médiation de la Consommation de Conciliateurs de Justice (CM2C)</strong><br />
                Adresse : 14 rue Saint Jean, 75017 Paris<br />
                Site internet : <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer">www.cm2c.net</a>
            </p>
        </LegalLayout>
    );
}
