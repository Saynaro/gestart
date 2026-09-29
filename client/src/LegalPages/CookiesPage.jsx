import React from 'react';
import { Sliders } from 'lucide-react';
import LegalLayout from './LegalLayout';

export default function CookiesPage() {
    const handleOpenCookiePreferences = () => {
        window.dispatchEvent(new Event("openCookieConsent"));
    };

    return (
        <LegalLayout
            title="Politique de Gestion des Cookies"
            subtitle="Modalités d'utilisation des traceurs et cookies sur la plateforme SaaS GestArt, conformément aux lignes directrices de la CNIL."
            lastUpdated="Février 2026"
        >
            <div className="legal-note">
                Conformément à l'article 82 de la loi Informatique et Libertés et aux recommandations de la CNIL (délibérations n° 2020-091 et 2020-092), cette page vous informe sur l'usage des cookies et vous permet de gérer vos préférences à tout moment.
            </div>

            <h2>1. Qu'est-ce qu'un Cookie ?</h2>
            <p>
                Un cookie est un petit fichier texte déposé et stocké sur votre terminal (ordinateur, tablette ou smartphone) lors de la consultation d'un site web ou de l'utilisation d'une application en ligne. Il permet à son émetteur d'identifier le terminal pendant sa durée de validité et d'enregistrer certains paramètres de navigation.
            </p>

            <h2>2. Catégories de Cookies Utilisés sur GestArt</h2>

            <h3>A. Cookies techniques et strictement nécessaires (Obligatoires)</h3>
            <p>
                Ces cookies sont indispensables au fonctionnement normal et à la sécurité de l'application. Ils permettent de :
            </p>
            <ul>
                <li>Maintenir votre session de connexion sécurisée (tokens JWT chiffrés) ;</li>
                <li>Mémoriser vos préférences d'affichage (mode clair / sombre) ;</li>
                <li>Prévenir les attaques par injection ou requêtes frauduleuses (jetons CSRF).</li>
            </ul>
            <p>
                <em>Conformément à la réglementation, ces cookies ne nécessitent pas votre consentement préalable car ils sont strictement nécessaires à la fourniture du service expressément demandé par l'utilisateur.</em>
            </p>

            <h3>B. Cookies de mesure d'audience et performance (Optionnels)</h3>
            <p>
                Ces traceurs permettent de mesurer anonymement la fréquentation des pages, les temps de chargement et l'utilisation globale de la plateforme, afin d'optimiser l'ergonomie et la réactivité de l'application.
            </p>

            <h3>C. Cookies de support et personnalisation (Optionnels)</h3>
            <p>
                Ces cookies permettent d'activer le module de messagerie et de support client direct avec l'équipe technique de GestArt.
            </p>

            <h2>3. Durée de Conservation du Consentement</h2>
            <p>
                Conformément aux préconisations de la CNIL, votre choix (acceptation ou refus) est conservé pendant une durée maximale de <strong>13 mois</strong>. À l'issue de cette période, votre consentement vous sera de nouveau demandé.
            </p>

            <h2>4. Comment Modifier Vos Préférences ?</h2>
            <p>
                Vous pouvez à tout moment accepter, refuser ou personnaliser l'utilisation des traceurs non essentiels en cliquant sur le bouton ci-dessous :
            </p>

            <div style={{ margin: '24px 0' }}>
                <button
                    type="button"
                    onClick={handleOpenCookiePreferences}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                    }}
                >
                    <Sliders size={16} />
                    <span>Ouvrir le panneau de gestion des cookies</span>
                </button>
            </div>

            <h2>5. Paramétrage de Votre Navigateur</h2>
            <p>
                Vous pouvez également configurer votre logiciel de navigation pour refuser systématiquement l'enregistrement de cookies sur votre terminal :
            </p>
            <ul>
                <li><strong>Google Chrome :</strong> Paramètres &gt; Confidentialité et sécurité &gt; Cookies et autres données des sites.</li>
                <li><strong>Mozilla Firefox :</strong> Paramètres &gt; Vie privée et sécurité &gt; Cookies et données de sites.</li>
                <li><strong>Apple Safari :</strong> Préférences &gt; Confidentialité &gt; Bloquer tous les cookies.</li>
                <li><strong>Microsoft Edge :</strong> Paramètres &gt; Cookies et autorisations de site.</li>
            </ul>
        </LegalLayout>
    );
}
