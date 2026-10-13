import React from 'react';
import LegalLayout from './LegalLayout';

export default function DpaPage() {
    return (
        <LegalLayout
            title="Accord de Sous-traitance des Données (DPA)"
            subtitle="Annexe contractuelle relative au traitement des données personnelles par GestArt pour le compte de ses utilisateurs, conformément à l'article 28 du RGPD (Règlement UE 2016/679)."
            lastUpdated="Février 2026"
        >
            <div className="legal-note">
                <strong>Préambule juridique :</strong> Dans le cadre de l'utilisation de la solution SaaS GestArt, l'Utilisateur (l'artisan ou l'entreprise cliente) confie à GestArt des données à caractère personnel relatives à ses propres clients finaux. Conformément aux directives de la CNIL et à l'article 28 du Règlement Général sur la Protection des Données (RGPD), le présent Accord de Sous-traitance (ci-après le « DPA ») régit les droits et obligations respectifs des parties en matière de sécurité et de confidentialité de ces données.
            </div>

            <h2>Article 1 — Qualification des Rôles & Responsabilités</h2>
            <p>
                Les parties conviennent expressément de la répartition des rôles suivante :
            </p>
            <ul>
                <li>
                    <strong>L'Utilisateur (Le Client de GestArt) :</strong> agit en qualité de <strong>Responsable du Traitement</strong> (<em>Data Controller</em>) pour l'ensemble des données à caractère personnel de ses propres clients finaux, prospects, fournisseurs et techniciens qu'il intègre, saisit ou gère dans la plateforme GestArt.
                </li>
                <li>
                    <strong>GestArt (KHALID SAINARO EI) :</strong> agit exclusivement en qualité de <strong>Sous-traitant</strong> (<em>Data Processor</em>), opérant uniquement sur les instructions documentées de l'Utilisateur dans le but exclusif de lui fournir les fonctionnalités du logiciel SaaS.
                </li>
                <li>
                    <strong>Données du compte de l'Utilisateur :</strong> Pour les données propres de gestion de compte, facturation de l'abonnement et support technique fournies directement par l'artisan à GestArt, KHALID SAINARO EI agit en qualité de Responsable du Traitement distinct (voir notre Politique de Confidentialité).
                </li>
            </ul>

            <h2>Article 2 — Objet & Durée du Traitement</h2>
            <p>
                Le présent accord a pour objet de définir les conditions dans lesquelles GestArt s'engage à effectuer, pour le compte de l'Utilisateur, les opérations de traitement de données à caractère personnel nécessaires à la fourniture de la solution SaaS.
            </p>
            <p>
                Le traitement s'applique pendant toute la durée de souscription de l'Utilisateur à GestArt (période d'essai et abonnements payants), jusqu'à la clôture du compte et l'expiration des délais de réversibilité.
            </p>

            <h2>Article 3 — Nature des Opérations, Finalités & Types de Données</h2>
            <p>
                <strong>Nature des opérations :</strong> Collecte, hébergement, stockage, structuration, affichage, transmission sécurisée, calculs automatisés, génération de devis/factures et archivage légal au moyen d'infrastructures cloud sécurisées.
            </p>
            <p>
                <strong>Finalités du traitement délégué :</strong>
            </p>
            <ul>
                <li>Gestion du carnet d'adresses et de la relation client de l'artisan (CRM) ;</li>
                <li>Planification, assignation et suivi technique des interventions sur site ;</li>
                <li>Édition, envoi et signature électronique en ligne de devis et bons de commande ;</li>
                <li>Émission, numérotation conforme et encaissement en ligne de factures de prestations ;</li>
                <li>Acheminement de notifications opérationnelles (confirmations de rendez-vous, rappels d'entretien annuel par SMS/Email).</li>
            </ul>
            <p>
                <strong>Catégories de personnes concernées :</strong> Clients finaux de l'artisan (particuliers B2C et professionnels B2B), contacts de chantiers, techniciens salariés de l'entreprise.
            </p>
            <p>
                <strong>Catégories de données traitées :</strong>
            </p>
            <ul>
                <li>Données d'identification : Nom, prénom, civilité, raison sociale, numéro SIRET le cas échéant ;</li>
                <li>Coordonnées de contact : Adresse postale du chantier/domicile, code postal, ville, numéros de téléphone fixe/portable, adresse email ;</li>
                <li>Données techniques et de suivi : Historique des équipements installés (pompes à chaleur, climatisation, chaudières, fluides frigorigènes), descriptifs de pannes, photos avant/après intervention, relevés d'anomalies ;</li>
                <li>Données financières et contractuelles : Montants HT/TTC, taux de TVA applicables, devis signés, factures émises, statut d'encaissement et justificatifs de virement.</li>
            </ul>

            <h2>Article 4 — Obligations du Sous-traitant (GestArt)</h2>
            <p>GestArt s'engage formellement à :</p>
            <ol>
                <li>
                    <strong>Respect des instructions documentées :</strong> Ne traiter les données confiées que sur instruction documentée de l'Utilisateur, y compris en ce qui concerne le transfert de données, sauf obligation légale impérative du droit de l'Union européenne ou du droit français.
                </li>
                <li>
                    <strong>Interdiction d'usage propre et de commercialisation :</strong> <u>GestArt s'interdit formellement d'utiliser les coordonnées ou la base clients de l'Utilisateur à des fins de prospection commerciale pour son propre compte</u>, de revente, de profilage marketing ou de cession à des courtiers de données.
                </li>
                <li>
                    <strong>Confidentialité stricte :</strong> Veiller à ce que les personnes autorisées à traiter les données (personnel technique habilité de GestArt) soient soumises à une obligation légale ou contractuelle stricte de confidentialité.
                </li>
                <li>
                    <strong>Sécurité des données (Article 32 RGPD) :</strong> Mettre en œuvre les mesures techniques et organisationnelles appropriées afin de garantir un niveau de sécurité adapté au risque (voir Article 5 ci-après).
                </li>
                <li>
                    <strong>Assistance pour l'exercice des droits :</strong> Aider l'Utilisateur, dans toute la mesure du possible grâce à des fonctionnalités intégrées (export, modification, suppression), à s'acquitter de son obligation de donner suite aux demandes d'exercice des droits formulées par ses clients finaux (accès, rectification, effacement, portabilité).
                </li>
                <li>
                    <strong>Assistance en cas d'évaluation d'impact :</strong> Aider l'Utilisateur pour la réalisation d'analyses d'impact relatives à la protection des données (AIPD) si nécessaire.
                </li>
            </ol>

            <h2>Article 5 — Mesures Techniques et Organisationnelles de Sécurité</h2>
            <p>
                Conformément à l'article 32 du RGPD et aux recommandations de la CNIL, GestArt déploie les mesures suivantes :
            </p>
            <ul>
                <li><strong>Chiffrement en transit :</strong> Protocoles TLS 1.3 / HTTPS obligatoires sur l'ensemble des flux API et pages web avec certificats HSTS.</li>
                <li><strong>Chiffrement au repos :</strong> Mots de passe utilisateurs hachés par algorithme Bcrypt salé, bases de données chiffrées (AES-256) et secrets d'API stockés dans des coffres chiffrés.</li>
                <li><strong>Cloisonnement logique strict (Multi-tenant) :</strong> Isolation complète des espaces d'entreprises par identifiant unique (<code>companyId</code>) vérifié systématiquement sur chaque requête API, contrôleur et tâche d'arrière-plan.</li>
                <li><strong>Sauvegardes régulières :</strong> Sauvegardes automatisées quotidiennes chiffrées stockées sur des serveurs physiquement distincts au sein de l'Espace Économique Européen.</li>
                <li><strong>Contrôle des habilitations :</strong> Gestion des rôles (Owner, Manager, Technicien) avec restriction granulaire des accès aux données financières et devis.</li>
            </ul>

            <h2>Article 6 — Recours à des Sous-traitants Ultérieurs (Sub-processors)</h2>
            <p>
                L'Utilisateur autorise expressément GestArt à faire appel aux sous-traitants ultérieurs de confiance listés ci-dessous pour l'exécution de prestations techniques indispensables :
            </p>
            <div className="legal-kv-grid" style={{ margin: '16px 0' }}>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Hébergement & Bases de données</span>
                    <span className="legal-kv-value">Hetzner Online GmbH (Allemagne / UE) — Données hébergées en UE</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Infrastructure de Paiement</span>
                    <span className="legal-kv-value">Stripe Payments Europe Ltd. (Irlande / UE) — Certifié PCI-DSS Niveau 1</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Acheminement SMS & Vérifications</span>
                    <span className="legal-kv-value">Twilio Ireland Ltd. (UE) — Conforme RGPD & Clauses Contractuelles Types</span>
                </div>
                <div className="legal-kv-item">
                    <span className="legal-kv-label">Envoi d'Emails Transactionnels</span>
                    <span className="legal-kv-value">Resend Inc. / Passerelles SMTP sécurisées — TLS obligatoire</span>
                </div>
            </div>
            <p>
                GestArt veille à ce que chacun de ses sous-traitants ultérieurs présente des garanties suffisantes quant à la mise en œuvre de mesures techniques et organisationnelles conformes au RGPD. En cas de modification ou d'ajout d'un sous-traitant ultérieur, GestArt en informera préalablement l'Utilisateur avec un préavis d'au moins 15 jours, lui ouvrant la faculté de résilier son abonnement sans pénalité en cas d'objection légitime.
            </p>

            <h2>Article 7 — Notification des Violations de Données (Data Breaches)</h2>
            <p>
                GestArt s'engage à notifier l'Utilisateur par email sans retard injustifié et au plus tard dans un délai de <strong>48 heures</strong> après en avoir pris connaissance, de toute violation de sécurité avérée entraînant de manière accidentelle ou illicite la destruction, la perte, l'altération, la divulgation non autorisée de données personnelles ou l'accès non autorisé à de telles données.
            </p>
            <p>
                Cette notification détaille la nature de la violation, les catégories et le nombre approximatif de personnes concernées, les conséquences probables et les mesures correctives prises ou proposées pour y remédier.
            </p>

            <h2>Article 8 — Sort des Données & Réversibilité (Data Act)</h2>
            <p>
                Au terme de la relation contractuelle (résiliation du compte par l'Utilisateur ou non-renouvellement de l'abonnement) :
            </p>
            <ul>
                <li><strong>Portabilité / Export complet :</strong> L'Utilisateur dispose de la faculté d'exporter l'intégralité de sa base clients, de ses interventions, de ses devis et de ses factures sous des formats ouverts, structurés et lisibles par machine (JSON, CSV, PDF) directement depuis son espace <em>Paramètres &gt; Sauvegardes & Données</em>.</li>
                <li><strong>Suppression définitive :</strong> À l'issue d'un délai de grâce de 30 jours calendaires suivant la clôture définitive du compte (permettant la réversibilité et l'assistance), GestArt s'engage à purger et supprimer définitivement l'ensemble des données de l'Utilisateur de ses bases actives, sauf disposition légale impérative imposant leur archivage intermédiaire (notamment conservation comptable décennale des factures GestArt).</li>
            </ul>

            <h2>Article 9 — Registre des Traitements & Droit d'Audit</h2>
            <p>
                GestArt tient à jour un registre écrit de toutes les catégories d'activités de traitement effectuées pour le compte de l'Utilisateur, conformément à l'article 30.2 du RGPD.
            </p>
            <p>
                GestArt met à la disposition de l'Utilisateur, sur demande écrite préalable motivée, les informations et attestations nécessaires pour démontrer le respect des obligations prévues au présent article et permettre la réalisation d'audits documentaires.
            </p>

            <h2>Article 10 — Droit Applicable</h2>
            <p>
                Le présent DPA est soumis au droit français et au Règlement UE 2016/679 (RGPD). Tout différend relatif à sa validité ou à son exécution relève de la compétence exclusive des tribunaux du ressort du siège de l'éditeur (Nice, France).
            </p>
        </LegalLayout>
    );
}
