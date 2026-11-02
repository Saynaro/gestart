<div align="center">
  <img src="client/public/LOGO.png" alt="GestArt Logo" height="64" />
  <h1>GestArt CRM</h1>
  <p><strong>La plateforme SaaS tout-en-un de gestion d'interventions, de rappels SMS automatisés et de facturation pour les entreprises de maintenance et artisans.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js & Express 5" />
    <img src="https://img.shields.io/badge/Prisma_ORM-7-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma 7" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
    <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis 7" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  </p>
</div>

---

## 📋 Présentation

**GestArt** est une solution CRM & ERP moderne conçue pour les artisans et sociétés de maintenance (chauffagistes, frigoristes, plombiers, électriciens, installateurs de pompes à chaleur et climatisation). Elle automatise la relance des entretiens annuels, la planification des techniciens sur le terrain, la signature électronique des devis et l'encaissement des factures en ligne.

<br />

<div align="center">
  <img src="client/public/image.png" alt="Tableau de bord GestArt CRM" width="100%" />
  <p><em>Tableau de bord financier en temps réel : suivi du chiffre d'affaires, des cotisations sociales (URSSAF), de la trésorerie et des performances sur 12 mois.</em></p>
</div>

---

## 🖥️ Aperçu de l'Interface

### 1. 📊 Tableau de Bord & Pilotage Financier (`image.png`)
Visualisez en un coup d'œil la santé financière de votre entreprise :
- **Indicateurs clés (KPIs)** : Chiffre d'affaires encaissé, estimation automatique des cotisations sociales, résultat net et connexion directe **URSSAF**.
- **Graphique analytique interactif** : Évolution mensuelle des entrées, des sorties et du résultat net avec filtrage par période.

<p align="center">
  <img src="client/public/image.png" alt="Tableau de bord financier GestArt" width="95%" />
</p>

---

### 2. 👥 Fiches Clients & Équipements Techniques (`image6.png`)
Suivez chaque client et son parc d'équipements en détail :
- **Profil client complet** : Coordonnées, adresse, téléphone, email et statut des interventions.
- **Détails de l'équipement** : Marque et modèle (ex. pompe à chaleur, chaudière, climatisation), date d'installation et numéro de série.
- **Historique & Rappels** : Onglets *Interventions* (avec statut de signature et photos du chantier), *Auto-rappel*, *Factures* et *Devis*.

<p align="center">
  <img src="client/public/image6.png" alt="Fiche client et équipements GestArt" width="95%" />
</p>

---

### 3. 📅 Planning Interactif & Gestion des Interventions (`image2.png`)
Organisez les tournées de vos techniciens sans conflit d'horaire :
- **Vues Semaine / Mois / Liste** avec code couleur par type d'intervention (*Installation*, *Maintenance*, *Dépannage*, *Contrôle*).
- **Assignation des techniciens** en temps réel et accès rapide à l'historique complet des interventions passées.

<p align="center">
  <img src="client/public/image2.png" alt="Planning interactif des interventions" width="95%" />
</p>

---

### 4. 📄 Facturation & Aperçu PDF A4 en Direct (`image3.png`)
Créez, vérifiez et envoyez des devis et factures 100 % conformes :
- **Panneau de contrôle latéral + Aperçu PDF en temps réel** : Visualisez instantanément le rendu officiel A4 (mentions légales, détail HT / TVA / TTC, statut *Payée* ou *En attente*).
- **Actions rapides en 1 clic** : Téléchargement PDF, modification ou envoi direct au client avec lien de paiement en ligne.

<p align="center">
  <img src="client/public/image3.png" alt="Détails et aperçu PDF de facture" width="95%" />
</p>

---

### 5. 💬 Messagerie Omnicanale Unifiée (`image4.png`)
Centralisez toutes les conversations clients au même endroit :
- **Inbox Tout-en-un (Email, SMS, WhatsApp)** : Filtrez vos échanges (*Tous*, *Non lus*, *SMS*, *WhatsApp*) et suivez l'historique complet de chaque client.
- **Envoi de documents intégré** : Joignez un fichier, une photo de chantier ou directement un **Devis / Facture PDF** avec bouton de règlement sécurisé dans le fil de discussion.

<p align="center">
  <img src="client/public/image4.png" alt="Messagerie omnicanale unifiée" width="95%" />
</p>

---

### 6. 🔐 Connexion Sécurisée & Conformité RGPD (`image5.png`)
Un accès rapide et protégé pour les gérants et les équipes terrain :
- **Authentification moderne** : Connexion par email/mot de passe, authentification unique **Google OAuth** et double facteur (**2FA**).
- **Sécurité de niveau bancaire** : Chiffrement SSL/TLS, conformité RGPD et hébergement sécurisé en France.

<p align="center">
  <img src="client/public/image5.png" alt="Page de connexion sécurisée GestArt" width="95%" />
</p>

---

### 📱 Application Mobile PWA & Équipe Terrain (`client/public/mobile/`)
L'application est 100 % responsive et installable sur smartphone (iOS & Android) pour les artisans et techniciens sur la route :

| Dashboard Mobile | Répertoire Clients | Planning Terrain | Messagerie & Devis | Tiroir Facture |
| :---: | :---: | :---: | :---: | :---: |
| <img src="client/public/mobile/IMG_8090.jpg" width="180" /> | <img src="client/public/mobile/IMG_8091.jpg" width="180" /> | <img src="client/public/mobile/IMG_8092.jpg" width="180" /> | <img src="client/public/mobile/IMG_8093.jpg" width="180" /> | <img src="client/public/mobile/IMG_8094.jpg" width="180" /> |
| *Chiffres clés & URSSAF* | *Filtres d'échéances* | *Tournées journalières* | *Envoi SMS & Lien de paiement* | *Détails & Envoi rapide* |

---

## ✨ Fonctionnalités Principales

### 🔔 Rappels Automatiques & Communication Omnicanale
- **Rappels d'entretien annuel par SMS & Email** : Calcul automatique de la prochaine échéance (J-30, J-1) selon l'équipement installé.
- **Messagerie unifiée en temps réel (Socket.io)** : Échanges instantanés par SMS (Twilio), Email (IMAP/SMTP synchronisé) et messagerie interne d'équipe.
- **Confirmations automatiques** : Notification en direct dès qu'un client confirme son rendez-vous par SMS ou signe un document.

### 📅 Planning & Gestion des Techniciens (PWA Mobile)
- **Calendrier interactif (FullCalendar)** : Planification des interventions par glisser-déposer et assignation aux techniciens.
- **Interface mobile dédiée aux techniciens** : Feuille de route quotidienne sur smartphone (PWA installable), lancement GPS en 1 clic (Waze / Google Maps / Plans), historique des pannes et mise à jour des statuts en direct (*En attente*, *En cours*, *Terminé*).

### 📄 Devis, Factures & Conformité Légale Française
- **Éditeur et personnalisation de documents PDF** : Personnalisation du logo, des couleurs, des polices et des mentions légales (SIRET, RCS, assurance décennale, TVA 5,5 % / 10 % / 20 % ou franchise en base).
- **Signature électronique en ligne** : Portail public sécurisé permettant au client de signer son devis au doigt sur smartphone avec horodatage et preuve légale.
- **Conversion 1-clic & E-Facture** : Transformation instantanée d'un devis signé en facture officielle conforme aux normes françaises et prête pour la facturation électronique (Chorus Pro / PPF).

### 💳 Paiements en Ligne & Comptabilité Automatisée
- **Paiement en ligne (Stripe)** : Règlement des factures et acomptes par carte bancaire ou Apple Pay via un lien sécurisé.
- **Synchronisation bancaire DSP2 & Rapprochement** : Suivi des transactions, rapprochement bancaire automatique ou manuel.
- **Pilotage financier & Exports** : Calcul automatique de la TVA et des cotisations URSSAF, rapports d'activité détaillés et export comptable (CSV / Excel).

### 🛡️ Sécurité, Abonnements SaaS & Administration
- **Authentification sécurisée** : JWT avec rafraîchissement proactif, OAuth, vérification d'email et double authentification (**2FA** par code OTP).
- **Gestion des abonnements SaaS** : Essai gratuit de 14 jours sans carte bancaire, plans *Starter*, *Pro* et *Unlimited* gérés via Stripe Billing.
- **Panneau Super-Admin** : Supervision globale des entreprises inscrites, des revenus SaaS, des quotas SMS et du support client en direct.

---

## 🏗️ Architecture Technique

```text
Project CRM/
├── client/                     # Frontend React 19 + Vite 8 + PWA
│   ├── public/                 # Assets statiques, icônes PWA & écrans de démarrage iOS
│   ├── src/
│   │   ├── LandingPage/        # Site vitrine public (Hero, Solution, BentoGrid, Tarifs, FAQ)
│   │   ├── AuthPage/           # Connexion, Inscription, 2FA, Mot de passe oublié, OAuth
│   │   ├── HomePage/           # Tableau de bord financier et statistiques d'activité
│   │   ├── ClientPage/         # Fiches clients, équipements et historique d'entretien
│   │   ├── PlanningPage/       # Calendrier des interventions (Desktop & Mobile)
│   │   ├── DevisPage/          # Création, envoi, PDF et suivi des devis
│   │   ├── FacturesPage/       # Facturation, relances et encaissements
│   │   ├── PaymentsPage/       # Transactions et rapprochement bancaire
│   │   ├── MessagesPage/       # Messagerie omnicanale (SMS, Email, Équipe) en temps réel
│   │   ├── ComptabilityPage/   # Déclarations TVA, URSSAF et exports comptables
│   │   ├── RapportsPage/       # Rapports analytiques et performances
│   │   ├── TechniciensPage/    # Gestion de l'équipe et vue mobile terrain des techniciens
│   │   ├── CataloguePage.jsx/  # Catalogue de prestations et fournitures
│   │   ├── SettingsPage/       # Paramètres entreprise, sécurité, facturation, abonnement
│   │   ├── PublicPages/        # Portails publics clients (Signature devis, Paiement facture)
│   │   ├── LegalPages/         # Pages légales (Mentions, CGU/CGV, RGPD, DPA, Cookies)
│   │   └── AdminPage/          # Console Super-Administrateur SaaS
│   └── Dockerfile              # Build multi-stage + Reverse Proxy Nginx (HTTP/HTTPS)
│
├── server/                     # Backend Node.js + Express 5 + Socket.io
│   ├── prisma/                 # Schéma Prisma ORM & migrations PostgreSQL
│   ├── src/
│   │   ├── controllers/        # Logique métier (Auth, Clients, Devis, Factures, Stripe, SMS)
│   │   ├── routes/             # Routes REST API (/api/...)
│   │   ├── services/           # Planificateurs cron (rappels SMS/Email, IMAP sync, PDF)
│   │   ├── middlewares/        # Auth JWT, rôles (Owner/Manager/Technician), Rate Limiting
│   │   └── server.js           # Point d'entrée Express + serveur WebSocket Socket.io
│   └── Dockerfile              # Image de production Node.js + Chromium (génération PDF)
│
├── docker-compose.yml          # Orchestration complète (Postgres, Backups, Redis, API, Nginx, Certbot)
└── .env.docker.example         # Exemple de configuration pour le déploiement Docker
```

---

## 🛠️ Stack Technologique

| Couche | Technologies utilisées |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind CSS 4, Framer Motion, FullCalendar 7, Lucide Icons, Vite PWA |
| **Backend** | Node.js, Express 5, Socket.io (WebSockets temps réel), Node-Cron / Planificateurs automatisés |
| **Base de données & Cache** | PostgreSQL 16, Prisma ORM 7 (`@prisma/adapter-pg`), Redis 7 (`ioredis`) |
| **Services Tiers & API** | Stripe (Abonnements SaaS & Paiements factures), Twilio (SMS), Nodemailer & ImapFlow (Emails), Cloudinary (Médias), Puppeteer / PDFKit (Génération PDF A4) |
| **DevOps & Infra** | Docker, Docker Compose, Nginx (Reverse Proxy), Certbot (Let's Encrypt SSL/TLS), Sauvegardes PostgreSQL automatisées |

---

## 🚀 Installation & Démarrage en Local (Développement)

### 1. Prérequis
- **Node.js** `>= 20.x`
- **PostgreSQL** `>= 15`
- **Redis** `>= 7` (optionnel en développement local, recommandé)

### 2. Cloner le projet
```bash
git clone <url-du-repo>
cd "Project CRM"
```

### 3. Configurer et lancer le Backend (`server`)
```bash
cd server
npm install
```
Créez un fichier `.env` dans le dossier `server/` :
```env
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001

# Base de données PostgreSQL & Redis
DATABASE_URL="postgresql://postgres:password@localhost:5432/gestart?schema=public"
REDIS_URL="redis://localhost:6379"

# Sécurité JWT
JWT_SECRET="votre_secret_jwt_tres_long_et_securise"
JWT_REFRESH_SECRET="votre_secret_refresh_jwt_tres_long"

# Stripe (Paiements & Abonnements)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Twilio (Rappels SMS)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+33..."

# SMTP / Email & Cloudinary
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="contact@gestart.com"
SMTP_PASS="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

Appliquez le schéma Prisma et démarrez le serveur :
```bash
npx prisma generate
npx prisma db push
npm run dev
```
Le backend écoute sur `http://localhost:5001`.

### 4. Configurer et lancer le Frontend (`client`)
Dans un second terminal :
```bash
cd client
npm install
npm run dev
```
L'application est accessible sur `http://localhost:5173` (avec proxy automatique vers `/api` et `/socket.io`).

---

## 🐳 Déploiement en Production (Docker Compose)

Le projet inclut une infrastructure Docker complète prête pour la production (ex. VPS Hetzner) comprenant :
1. **PostgreSQL 16** avec volume persistant (`gestart_postgres_data`)
2. **Sauvegardes automatiques quotidiennes** (`pgbackups` dans `./backups`)
3. **Redis 7** protégé par mot de passe
4. **Backend API & WebSockets** (`gestart-server`)
5. **Frontend React + Reverse Proxy Nginx** (`gestart-client`)
6. **Certbot** pour le renouvellement automatique des certificats SSL Let's Encrypt

### Commandes de déploiement
```bash
# 1. Copier et configurer les variables d'environnement racine
cp .env.docker.example .env
nano .env

# 2. Vérifier le fichier server/.env de production
nano server/.env

# 3. Construire et démarrer tous les conteneurs en arrière-plan
docker compose up -d --build

# 4. Vérifier l'état des services
docker compose ps
docker compose logs -f server
```

---

## 👥 Rôles Utilisateurs

- **Gérant / Propriétaire (`OWNER` / `ADMIN`)** : Accès complet au tableau de bord financier, clients, planning, devis, factures, comptabilité (TVA / URSSAF), messagerie, gestion des techniciens et abonnement.
- **Technicien (`TECHNICIAN`)** : Accès dédié à ses interventions du jour (`/interventions/today`), au planning, aux détails techniques des équipements clients et à la messagerie interne.
- **Super Administrateur (`SUPERADMIN`)** : Accès à la console d'administration globale (`/admin`) pour superviser la plateforme SaaS.

---

## 📄 Licence & Conformité

- **Hébergement & RGPD** : Conforme au Règlement Général sur la Protection des Données (UE) avec hébergement européen et accord de sous-traitance (DPA) intégré.
- **Propriété** : © 2026 **GestArt** — Tous droits réservés.

