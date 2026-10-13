import React from 'react';
import LegalLayout from './LegalLayout';

export default function CguPage() {
    return (
        <LegalLayout
            title="Conditions Générales d'Utilisation & de Vente"
            subtitle="Règles régissant l'utilisation de la solution SaaS GestArt, les abonnements, les engagements contractuels et la conformité légale."
            lastUpdated="Février 2026"
        >
            <div className="legal-note">
                Les présentes Conditions Générales d'Utilisation et de Vente (CGU / CGV) s'appliquent sans réserve à toute utilisation et souscription de la solution logicielle SaaS GestArt par des professionnels du bâtiment, artisans et entreprises de maintenance technique.
            </div>

            <h2>Article 1 — Objet & Définition du Service</h2>
            <p>
                <strong>GestArt</strong> est une solution logicielle en ligne (SaaS) éditée par KHALID SAINARO EI, conçue pour les professionnels, artisans et entreprises du bâtiment. La solution propose la gestion du fichier clients (CRM), la planification et le suivi technique d'interventions sur site, l'envoi de notifications opérationnelles (SMS / emails), l'édition de devis avec signature électronique et la facturation professionnelle conforme aux règles fiscales françaises.
            </p>
            <p>
                L'accès au service requiert la création d'un compte utilisateur protégé par un mot de passe robuste et, le cas échéant, un mécanisme d'authentification à deux facteurs (2FA).
            </p>
            <p>
                <strong>Capacité juridique & Usage professionnel exclusif :</strong> L'accès au service GestArt est souscrit par l'Utilisateur pour les stricts besoins de son activité professionnelle. L'Utilisateur garantit disposer des pouvoirs nécessaires pour engager son entreprise ou son statut d'entrepreneur individuel.
            </p>

            <h2>Article 2 — Période d'Essai Gratuit & Souscription</h2>
            <ul>
                <li><strong>Essai Gratuit (14 jours) :</strong> Tout nouvel utilisateur bénéficie dès son inscription d'un accès intégral sans engagement de 14 jours, sans obligation de renseigner un moyen de paiement préalable.</li>
                <li><strong>Formules d'Abonnement :</strong> À l'issue de la période d'essai, l'accès continu requiert la souscription à l'une des formules tarifaires disponibles (Starter, Pro, Unlimited), avec cycle de facturation mensuel ou annuel.</li>
                <li><strong>Reconduction Tacite :</strong> L'abonnement est conclu pour une durée déterminée (mensuelle ou annuelle) et se renouvelle automatiquement par tacite reconduction pour des périodes successives équivalentes, sauf résiliation par l'Utilisateur avant la date d'échéance.</li>
            </ul>

            <h2>Article 3 — Tarification, Facturation & Paiements</h2>
            <ul>
                <li><strong>Tarifs :</strong> Les tarifs en vigueur sont indiqués en Euros Hors Taxes (HT). En vertu de l'article 293 B du Code Général des Impôts, la franchise en base de TVA s'applique à l'éditeur (TVA non applicable), sauf modification ultérieure du statut fiscal.</li>
                <li><strong>Sécurité des Paiements :</strong> Les paiements par carte bancaire sont traités par <strong>Stripe Payments Europe Ltd.</strong>, prestataire certifié PCI-DSS Niveau 1 conforme au protocole 3D-Secure 2. GestArt ne conserve aucune coordonnée bancaire complète sur ses serveurs.</li>
                <li><strong>Reçus & Justificatifs :</strong> Chaque paiement d'abonnement donne lieu à l'émission immédiate d'un reçu fiscal téléchargeable au format PDF dans l'espace <em>Paramètres &gt; Abonnement</em>.</li>
            </ul>

            <h2>Article 4 — Pénalités de Retard (Entre Professionnels)</h2>
            <p>
                Conformément aux articles L.441-10 et D.441-5 du Code de commerce, tout défaut ou retard de paiement d'une facture à son échéance entraîne l'exigibilité de plein droit :
            </p>
            <ul>
                <li>D'une pénalité de retard égale au taux d'intérêt appliqué par la Banque Centrale Européenne à son opération de refinancement la plus récente majoré de 10 points de pourcentage ;</li>
                <li>D'une indemnité forfaitaire pour frais de recouvrement d'un montant de <strong>40 €</strong>, sans préjudice d'une indemnisation complémentaire sur justification.</li>
            </ul>

            <h2>Article 5 — Rétractation & Résiliation Sans Frais (Résiliation en 1 Clic)</h2>
            <ul>
                <li><strong>Rétractation :</strong> Conformément à l'article L.221-18 du Code de la consommation, les clients consommateurs et professionnels éligibles (employant au maximum 5 salariés pour un contrat hors du champ principal de leur activité) bénéficient d'un délai légal de rétractation de 14 jours francs.</li>
                <li><strong>Résiliation en 1 Clic :</strong> L'Utilisateur peut résilier son abonnement à tout moment sans préavis ni frais cachés, directement depuis l'espace <em>Paramètres &gt; Abonnement</em> ou via le lien dédié de résiliation. L'accès aux fonctionnalités reste garanti jusqu'au terme de la période déjà facturée.</li>
            </ul>

            <h2>Article 6 — Obligations de l'Utilisateur, Anti-Spam & Rénovation Énergétique (L223-8)</h2>
            <p>
                L'Utilisateur est seul responsable de l'exactitude des informations saisies (tarifs, descriptions de prestations, coordonnées de ses clients, mentions légales obligatoires sur ses factures et devis selon l'article 289 du CGI et l'article L.111-1 du Code de la consommation).
            </p>
            <p>
                <strong>Règles impératives de communication (SMS & Emails) :</strong>
            </p>
            <ul>
                <li><strong>Interdiction du spam :</strong> L'Utilisateur s'interdit d'importer des bases de données achetées, louées ou constituées sans le consentement préalable (opt-in) des personnes concernées.</li>
                <li><strong>Respect de l'article L.223-8 du Code de la consommation :</strong> <u>Il est formellement interdit d'utiliser GestArt pour effectuer de la prospection commerciale non sollicitée auprès de consommateurs dans les secteurs de la rénovation énergétique, des équipements d'énergie renouvelable (pompes à chaleur PAC, panneaux photovoltaïques, chaudières biomasse) ou de l'adaptation du logement au vieillissement</u>, sauf dans le cadre strict et avéré de l'exécution d'un contrat en cours. Tout manquement entraînera la suspension immédiate du compte.</li>
                <li><strong>Mentions de désinscription :</strong> Tout message à vocation promotionnelle doit obligatoirement comporter une mention claire et fonctionnelle de désinscription (lien de désabonnement ou mention STOP SMS conforme aux règles de l'ARCEP et de Twilio).</li>
            </ul>

            <h2>Article 7 — Données Personnelles, Sous-traitance & Accord DPA</h2>
            <p>
                En adhérant aux présentes CGU/CGV, l'Utilisateur souscrit expressément à l'<strong>Accord de Sous-traitance des Données (DPA)</strong> de GestArt, conforme à l'article 28 du RGPD et accessible à l'adresse <a href="/dpa">/dpa</a>.
            </p>
            <p>
                L'Utilisateur demeure le Responsable de traitement de son fichier clients et donne mandat à GestArt d'exécuter les opérations techniques nécessaires à la fourniture du service SaaS, dans le respect de la confidentialité et de la sécurité des données.
            </p>

            <h2>Article 8 — Réversibilité & Portabilité des Données (Data Act)</h2>
            <p>
                Conformément aux exigences du Règlement européen sur les données (Data Act — Règlement UE 2023/2854) relatif au changement équitable de fournisseur de services cloud :
            </p>
            <ul>
                <li>L'Utilisateur conserve la pleine et entière propriété de l'ensemble de ses données (clients, interventions, devis, factures, catalogues).</li>
                <li>GestArt garantit la faculté permanente pour l'Utilisateur d'exporter l'intégralité de ses données sous un format ouvert, standardisé et directement lisible par machine (JSON, CSV, PDF) depuis les paramètres.</li>
                <li>Aucun frais de transfert ou de sortie (switching costs) n'est facturé par GestArt pour l'exportation des données et le changement de prestataire.</li>
            </ul>

            <h2>Article 9 — Disponibilité du Service & Responsabilité</h2>
            <p>
                GestArt met en œuvre tous les moyens raisonnables pour assurer une disponibilité élevée (objectif SLA de 99,9%) et effectue des sauvegardes quotidiennes chiffrées. GestArt ne saurait être tenu responsable des dommages indirects, pertes de chiffre d'affaires ou pertes d'exploitation subis par l'Utilisateur.
            </p>

            <h2>Article 10 — Droit Applicable & Juridiction Compétente</h2>
            <p>
                Les présentes conditions sont régies et interprétées selon le droit français. En cas de contestation ou de litige né à l'occasion de leur exécution, les tribunaux du ressort de <strong>Nice (06000)</strong> seront seuls compétents entre commerçants et professionnels.
            </p>
        </LegalLayout>
    );
}
