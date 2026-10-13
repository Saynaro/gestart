import React from 'react';
import LegalLayout from './LegalLayout';

export default function ConfidentialitePage() {
    return (
        <LegalLayout
            title="Politique de Confidentialité"
            subtitle="Engagements de GestArt relatifs à la protection des données personnelles, en stricte conformité avec le RGPD (Règlement UE 2016/679) et la loi Informatique et Libertés."
            lastUpdated="Février 2026"
        >
            <div className="legal-note">
                GestArt accorde une importance primordiale à la protection de la vie privée, à la confidentialité et à la sécurité de vos données personnelles et de celles de vos clients. La présente politique explique en toute transparence comment nous traitons vos données.
            </div>

            <h2>1. Responsable du Traitement & Contact DPO</h2>
            <p>
                Pour la gestion de votre compte, de vos abonnements et de vos interactions avec notre service technique, le <strong>Responsable du Traitement</strong> est :<br />
                <strong>KHALID SAINARO</strong> (Entrepreneur Individuel — nom commercial <strong>GestArt</strong>)<br />
                23 Rue Paganini, 06000 Nice, France — SIREN : 944 087 725
            </p>
            <p>
                <strong>Délégué à la Protection des Données (DPO) :</strong> Khalid SAINARO — joignable par email à l'adresse : <a href="mailto:support.gestart@gmail.com">support.gestart@gmail.com</a>.
            </p>

            <h2>2. Distinction Fondamentale des Rôles (RGPD)</h2>
            <div className="legal-kv-grid" style={{ margin: '16px 0' }}>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Vos données d'artisan / utilisateur</span>
                    <span className="legal-kv-value">GestArt est <strong>Responsable du Traitement</strong> (gère vos identifiants, vos factures GestArt, votre support).</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">La base de vos clients finaux</span>
                    <span className="legal-kv-value">Vous êtes le <strong>Responsable de Traitement</strong> ; GestArt agit en qualité de <strong>Sous-traitant</strong> soumis à notre <a href="/dpa">Accord DPA (art. 28 RGPD)</a>.</span>
                </div>
            </div>

            <h2>3. Données Collectées par GestArt & Bases Légales</h2>
            <p>
                Nous collectons uniquement les informations adéquates, pertinentes et limitées à ce qui est strictement nécessaire (principe de minimisation) :
            </p>
            <ul>
                <li><strong>Création de compte & Connexion :</strong> Nom, prénom, adresse email, mot de passe chiffré, numéro de téléphone portable (Base légale : Exécution du contrat de service, art. 6.1.b RGPD).</li>
                <li><strong>Gestion de l'entreprise & Facturation de l'abonnement :</strong> Dénomination sociale, SIRET, SIREN, forme juridique, adresse du siège, identifiants Stripe (Base légale : Exécution du contrat et respect des obligations légales comptables, art. 6.1.c RGPD).</li>
                <li><strong>Logs de connexion et sécurité :</strong> Adresses IP, horodatages, identifiants d'appareils et navigateurs (Base légale : Intérêt légitime de sécurisation de la plateforme et obligation légale de conservation des logs, décret n° 2011-219).</li>
                <li><strong>Communications d'information & Marketing GestArt :</strong> Si vous y avez expressément consenti, envoi d'actualités et conseils par email (Base légale : Consentement préalable révocable à tout moment, art. 6.1.a RGPD).</li>
            </ul>

            <h2>4. Principe de Non-Commercialisation & Sous-traitants</h2>
            <p>
                <strong>GestArt ne vend, ne loue, ne monétise et ne cède JAMAIS vos données personnelles ou celles de vos clients à des régies publicitaires ou des tiers.</strong>
            </p>
            <p>
                Vos données sont exclusivement transmises à des prestataires techniques indispensables au service :
            </p>
            <ul>
                <li><strong>Hetzner Online GmbH (Allemagne / Finlande) :</strong> Hébergement des serveurs et bases de données chiffrées au sein de l'Union Européenne (Certifié ISO 27001).</li>
                <li><strong>Stripe Payments Europe Ltd. (Irlande / UE) :</strong> Gestion sécurisée des paiements et abonnements carte bancaire (Certifié PCI-DSS Niveau 1).</li>
                <li><strong>Twilio Ireland Ltd. (UE) :</strong> Acheminement sécurisé des SMS transactionnels et codes de vérification OTP.</li>
                <li><strong>Resend / Passerelles Email sécurisées :</strong> Envoi des emails opérationnels (codes de vérification, alertes système).</li>
            </ul>

            <h2>5. Conformité aux Règles relatives aux Données Utilisateurs Google (Limited Use)</h2>
            <p>
                Dans la mesure où l'Utilisateur choisit d'authentifier son compte ou d'interagir avec les services Google (Google OAuth, Gmail API) :
            </p>
            <ul>
                <li>GestArt respecte scrupuleusement la politique d'utilisation des données utilisateur des services API de Google (<em>Google API Services User Data Policy</em>), y compris les exigences d'<strong>Utilisation Limitée (Limited Use)</strong>.</li>
                <li>Les jetons d'accès Google sont chiffrés au repos et exclus de tout journal de logs.</li>
                <li>GestArt n'utilise en aucun cas les données issues des API Google pour diffuser de la publicité ciblée ou pour entraîner des modèles d'intelligence artificielle généralistes sans consentement explicite.</li>
                <li>L'Utilisateur peut à tout moment déconnecter son compte Google depuis ses paramètres, ce qui entraîne la révocation immédiate des jetons d'accès.</li>
            </ul>

            <h2>6. Durées de Conservation des Données</h2>
            <ul>
                <li><strong>Données de compte actif :</strong> Conservées pendant toute la durée de la relation contractuelle, puis archivées pendant 3 ans à compter du dernier contact actif.</li>
                <li><strong>Factures et justificatifs comptables :</strong> Conservés pendant <strong>10 ans</strong> en archivage intermédiaire conformément à l'article L.123-22 du Code de commerce.</li>
                <li><strong>Logs de connexion et d'audit technique :</strong> Conservés pendant <strong>12 mois</strong> au maximum conformément aux prescriptions de l'ANSSI et de la CNIL.</li>
                <li><strong>Preuve des consentements légaux (CGU, DPA) :</strong> Conservée pendant la durée de prescription légale (5 ans en matière commerciale).</li>
            </ul>

            <h2>7. Vos Droits (Articles 15 à 22 du RGPD)</h2>
            <p>
                Vous disposez à tout moment des droits suivants sur vos données :
            </p>
            <ul>
                <li><strong>Droit d'accès et de rectification :</strong> Vous pouvez consulter et corriger vos informations directement dans votre espace <em>Paramètres &gt; Profil</em>.</li>
                <li><strong>Droit à l'effacement (« droit à l'oubli ») :</strong> Vous pouvez demander la suppression de votre compte et de vos données (hors documents soumis à obligation légale de conservation comptable).</li>
                <li><strong>Droit à la portabilité :</strong> Vous pouvez télécharger toutes vos données au format JSON ou CSV depuis votre espace Paramètres sans frais.</li>
                <li><strong>Droit d'opposition et de limitation du traitement.</strong></li>
            </ul>
            <p>
                Pour exercer ces droits, vous pouvez nous adresser un email à <a href="mailto:support.gestart@gmail.com">support.gestart@gmail.com</a>. Nous vous répondrons dans un délai maximal d'un (1) mois.
            </p>

            <h2>8. Réclamation auprès de l'Autorité de Contrôle (CNIL)</h2>
            <p>
                Si vous estimez, après nous avoir contactés, que vos droits Informatique et Libertés ne sont pas respectés, vous avez la faculté d'introduire une réclamation auprès de la <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong> :
            </p>
            <p>
                CNIL — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07<br />
                Site internet : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
            </p>
        </LegalLayout>
    );
}
