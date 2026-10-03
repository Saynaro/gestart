import React from 'react';
import LegalLayout from './LegalLayout';

export default function CguPage() {
    return (
        <LegalLayout
            title="Conditions Générales d'Utilisation & de Vente"
            subtitle="Règles régissant l'utilisation de la solution SaaS GestArt, les abonnements et les engagements contractuels."
            lastUpdated="Février 2026"
        >
            <div className="legal-note">
                Les présentes Conditions Générales d'Utilisation et de Vente (CGU / CGV) s'appliquent sans réserve à toute utilisation de la solution SaaS GestArt par des professionnels ou artisans.
            </div>

            <h2>Article 1 — Objet & Définition du Service</h2>
            <p>
                <strong>GestArt</strong> est une solution logicielle en ligne (SaaS) conçue pour les artisans, entreprises du bâtiment et professionnels de la maintenance technique. Elle comprend notamment la gestion du fichier clients, la planification et le suivi d'interventions, l'envoi automatisé de rappels SMS / emails, l'édition de devis et la facturation électronique conforme à la réglementation française.
            </p>
            <p>
                L'accès au service requiert la création d'un compte utilisateur protégé par un mot de passe sécurisé et, le cas échéant, un mécanisme d'authentification à deux facteurs (2FA).
            </p>
            <p>
                <strong>Capacité juridique & Majorité :</strong> L'accès au service est réservé aux personnes physiques majeures (âgées d'au moins 18 ans) disposant de la pleine capacité juridique de contracter, ou aux personnes morales valablement représentées. En cochant la case d'acceptation lors de l'inscription, l'utilisateur déclare et garantit sur l'honneur remplir ces conditions.
            </p>

            <h2>Article 2 — Période d'Essai Gratuit & Souscription</h2>
            <ul>
                <li><strong>Essai Gratuit (14 jours) :</strong> Tout nouvel utilisateur bénéficie dès son inscription d'un accès intégral et sans engagement de 14 jours, sans obligation d'enregistrer un moyen de paiement.</li>
                <li><strong>Formules d'Abonnement :</strong> À l'issue de la période d'essai, l'accès requiert la souscription à l'une des offres disponibles (Starter, Pro, Unlimited), avec facturation mensuelle ou annuelle.</li>
                <li><strong>Reconduction Tacite :</strong> L'abonnement est conclu pour une durée déterminée renouvelable automatiquement par tacite reconduction pour des périodes équivalentes, sauf résiliation par l'utilisateur avant la date d'échéance.</li>
            </ul>

            <h2>Article 3 — Tarification, Facturation & Paiements</h2>
            <ul>
                <li><strong>Tarifs :</strong> Les tarifs en vigueur sont indiqués en Euros sur le site et dans l'espace de souscription. En vertu de l'article 293 B du Code Général des Impôts, la TVA est non applicable (régime de la franchise en base).</li>
                <li><strong>Sécurité des Paiements :</strong> Les paiements par carte bancaire sont sécurisés et traités par <strong>Stripe Payments Europe Ltd.</strong>, prestataire certifié PCI-DSS Niveau 1 conforme au protocole 3D-Secure 2. GestArt ne stocke aucune coordonnée bancaire complète sur ses propres serveurs.</li>
                <li><strong>Reçus & Justificatifs :</strong> Chaque paiement donne lieu à l'émission immédiate d'un reçu fiscal téléchargeable au format PDF dans l'espace Paramètres.</li>
            </ul>

            <h2>Article 4 — Pénalités de Retard (Entre Professionnels)</h2>
            <p>
                Conformément aux articles L.441-10 et D.441-5 du Code de commerce, tout défaut ou retard de paiement d'une facture à son échéance entraîne l'exigibilité de plein droit :
            </p>
            <ul>
                <li>D'une pénalité de retard égale au taux d'intérêt appliqué par la Banque Centrale Européenne à son opération de refinancement la plus récente majoré de 10 points de pourcentage ;</li>
                <li>D'une indemnité forfaitaire pour frais de recouvrement d'un montant de <strong>40 €</strong>, sans préjudice d'une indemnisation complémentaire sur justification.</li>
            </ul>

            <h2>Article 5 — Rétractation & Résiliation Sans Frais</h2>
            <ul>
                <li><strong>Droit de Rétractation :</strong> Conformément à l'article L.221-18 du Code de la consommation, les clients consommateurs et éligibles bénéficient d'un délai légal de rétractation de 14 jours francs à compter de la souscription initiale.</li>
                <li><strong>Résiliation en 1 Clic :</strong> L'utilisateur peut résilier son abonnement à tout moment sans préavis ni pénalité, directement depuis l'onglet <em>Paramètres &gt; Abonnement</em>. L'accès reste garanti jusqu'au terme de la période déjà facturée.</li>
            </ul>

            <h2>Article 6 — Obligations de l'Utilisateur & Responsabilité</h2>
            <p>
                L'utilisateur s'engage à utiliser GestArt dans le respect des lois en vigueur. Il demeure seul et unique responsable des informations saisies (tarifs, descriptions de prestations, coordonnées de ses propres clients, mentions fiscales obligatoires sur ses factures selon l'article 289 du CGI).
            </p>
            <p>
                GestArt met en œuvre tous les moyens raisonnables pour garantir une disponibilité élevée (objectif SLA 99,9%) et procède à des sauvegardes quotidiennes. Toutefois, GestArt ne saurait être tenu responsable des éventuels préjudices indirects ou pertes d'exploitation.
            </p>

            <h2>Article 7 — Droit Applicable & Juridiction Compétente</h2>
            <p>
                Les présentes conditions sont régies et interprétées selon le droit français. En cas de litige relatif à leur validité, leur interprétation ou leur exécution, les tribunaux du ressort de <strong>Nice (06000)</strong> seront seuls compétents, y compris en cas de référé ou de pluralité de défendeurs.
            </p>
        </LegalLayout>
    );
}
