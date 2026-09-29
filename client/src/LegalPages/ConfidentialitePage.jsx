import React from 'react';
import LegalLayout from './LegalLayout';

export default function ConfidentialitePage() {
    return (
        <LegalLayout
            title="Politique de Confidentialité"
            subtitle="Engagements de GestArt relatifs à la protection des données personnelles, en conformité avec le RGPD (Règlement UE 2016/679)."
            lastUpdated="Février 2026"
        >
            <div className="legal-note">
                GestArt attache une importance primordiale à la confidentialité et à la sécurité de vos données personnelles et de celles de vos clients.
            </div>

            <h2>1. Responsable du Traitement & Contact DPO</h2>
            <p>
                Le responsable du traitement des données est l'Entreprise Individuelle <strong>KHALID SAINARO</strong> (GestArt), située au 23 Rue Paganini, 06000 Nice.
            </p>
            <p>
                Pour toute question ou demande concernant la gestion de vos données personnelles, vous pouvez contacter notre Délégué à la Protection des Données (DPO) à l'adresse : <a href="mailto:support.gestart@gmail.com">support.gestart@gmail.com</a>.
            </p>

            <h2>2. Données Collectées & Finalités</h2>
            <p>
                GestArt collecte uniquement les données strictement nécessaires au bon fonctionnement de la plateforme :
            </p>
            <ul>
                <li><strong>Création de compte & Authentification :</strong> Nom, prénom, adresse email, numéro de téléphone, mot de passe chiffré (Base légale : exécution du contrat, art. 6.1.b RGPD).</li>
                <li><strong>Gestion de la facturation & Devis :</strong> Dénomination d'entreprise, numéro SIRET/SIREN, adresse légale, coordonnées bancaires (Base légale : obligations légales et comptables, art. 6.1.c RGPD).</li>
                <li><strong>Gestion des clients & Interventions :</strong> Fiches contacts de vos clients, adresses de chantiers, descriptifs d'interventions, photos et rapports techniques (Base légale : exécution du contrat de service).</li>
                <li><strong>Communications & Alertes :</strong> Envoi de SMS de rappel de rendez-vous et emails transactionnels (Base légale : exécution du service).</li>
            </ul>

            <h2>3. Principe de Non-Commercialisation & Sous-Traitants</h2>
            <p>
                <strong>GestArt ne vend, ne loue et ne cède jamais vos données personnelles ou celles de vos clients à des tiers à des fins commerciales ou publicitaires.</strong>
            </p>
            <p>
                Les données sont exclusivement transmises à des sous-traitants techniques d'infrastructure reconnus :
            </p>
            <ul>
                <li><strong>Hetzner Online GmbH (Allemagne) :</strong> Hébergement d'infrastructure et serveurs de bases de données sécurisés au sein de l'UE.</li>
                <li><strong>Stripe Payments Europe Ltd. (Irlande) :</strong> Traitement sécurisé des transactions bancaires certifié PCI-DSS Niveau 1.</li>
                <li><strong>Passerelles Email / SMS (ex. Twilio, Resend) :</strong> Acheminement sécurisé des messages transactionnels et vérifications 2FA.</li>
            </ul>

            <h2>4. Durées de Conservation des Données</h2>
            <ul>
                <li><strong>Données de compte actif :</strong> Conservées pendant toute la durée de la relation contractuelle, puis 3 ans après le dernier contact actif.</li>
                <li><strong>Documents comptables et factures :</strong> Conservés pendant 10 ans en conformité avec l'article L.123-22 du Code de commerce.</li>
                <li><strong>Logs de connexion et sécurité :</strong> Conservés pendant 12 mois maximum (obligation légale).</li>
            </ul>

            <h2>5. Vos Droits (RGPD)</h2>
            <p>
                Conformément aux articles 15 à 22 du RGPD, vous bénéficiez des droits suivants :
            </p>
            <ul>
                <li><strong>Droit d'accès et de rectification :</strong> Consulter et modifier à tout moment vos informations dans votre espace <em>Paramètres &gt; Profil</em>.</li>
                <li><strong>Droit à l'effacement (« droit à l'oubli ») :</strong> Demander la suppression totale de votre compte et de vos données (hors obligations légales de conservation comptable).</li>
                <li><strong>Droit à la portabilité :</strong> Exporter vos données au format standard JSON ou CSV directement depuis les paramètres.</li>
                <li><strong>Droit d'opposition et de limitation du traitement.</strong></li>
            </ul>
            <p>
                Pour exercer l'un de ces droits, contactez-nous par email à <a href="mailto:support.gestart@gmail.com">support.gestart@gmail.com</a>. Nous vous répondrons dans un délai maximal de 30 jours.
            </p>

            <h2>6. Réclamation auprès de l'Autorité de Contrôle (CNIL)</h2>
            <p>
                Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous avez la faculté d'introduire une réclamation auprès de la <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong> :
            </p>
            <p>
                CNIL — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07<br />
                Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
            </p>
        </LegalLayout>
    );
}
