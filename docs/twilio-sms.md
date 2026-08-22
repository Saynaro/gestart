# Guide d'Intégration et Configuration Twilio SMS Bidirectionnel

Ce document détaille la mise en service, la configuration technique et les bonnes pratiques pour le canal SMS bidirectionnel Twilio dans le CRM.

---

## 1. Création et Configuration du Compte Twilio

### Étape 1 : Inscription sur Twilio
1. Rendez-vous sur [twilio.com](https://www.twilio.com) et créez un compte.
2. Validez votre adresse email ainsi que votre numéro de téléphone personnel de vérification.
3. Lors du questionnaire d'intégration :
   - *Which Twilio product are you using?* → **SMS**
   - *What are you building?* → **CRM / Customer Engagement**
   - *Which language?* → **Node.js**

### Étape 2 : Récupération des Identifiants API
1. Accédez à la console principale (**Twilio Console Dashboard**).
2. Dans la section **Account Info**, vous trouverez :
   - **Account SID** : Chaîne commençant par `AC...` (ex: `ACa1b2c3d4e5f6g7h8...`)
   - **Auth Token** : Cliquez sur *Show* pour révéler le token secret.

### Étape 3 : Achat d'un Numéro de Téléphone SMS
1. Dans la console Twilio, rendez-vous dans **Phone Numbers** → **Manage** → **Buy a number**.
2. Sélectionnez le pays (**France +33**).
3. Cochez impérativement la case des capacités : **SMS** (et facultativement Voice).
4. **Numéro Dédié vs Numéro Global Partagé** :
   - **Global (Phase 1)** : Un numéro unique configuré dans les variables d'environnement (`TWILIO_SMS_NUMBER`) pour toute la plateforme.
   - **Dédié par Entreprise (Multi-Tenant)** : Vous pouvez attribuer un numéro virtuel distinct à chaque entreprise dans son profil société (`Company.smsNumber`). Le système routage backend identifiera automatiquement chaque société sans conflit.

---

## 2. Variables d'Environnement Backend

Ajoutez ces clés dans votre fichier `.env` du serveur (`server/.env`) :

```env
# ─────────────────────────────────────────────────────────────
# TWILIO (SMS & MESSAGERIE TEMPS RÉEL)
# ─────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token_secret
TWILIO_SMS_NUMBER=+33600000000

# URL de callback de statut de livraison (optionnel si BACKEND_URL est défini)
TWILIO_STATUS_CALLBACK_URL=https://api.votre-domaine.com/api/v1/webhooks/twilio/status
```

> [!WARNING]
> Ne partagez jamais le `TWILIO_AUTH_TOKEN` et ne l'injectez jamais dans le code frontend ou dans un commit Git.

---

## 3. Configuration des Webhooks dans la Console Twilio

Pour que les réponses des clients arrivent instantanément dans votre CRM :

1. Allez dans **Phone Numbers** → **Manage** → **Active numbers**.
2. Cliquez sur votre numéro de téléphone Twilio.
3. Faites défiler jusqu'à la section **Messaging Configuration** :
   - **A MESSAGE COMES IN** :
     - Type : `Webhook`
     - URL : `https://api.votre-domaine.com/api/v1/webhooks/twilio/sms`
     - Méthode HTTP : `HTTP POST`
   - **PRIMARY HANDLER FAILS** (Optionnel) : Laissez vide ou mettez votre URL de secours.
4. Cliquez sur **Save configuration**.

---

## 4. Test en Environnement Local (ngrok)

Pour recevoir les webhooks Twilio sur votre machine locale pendant le développement :

1. Lancez un tunnel ngrok vers le port de votre backend (port 5001) :
   ```bash
   ngrok http 5001
   ```
2. Copiez l'URL publique générée (ex : `https://abc-123.ngrok-free.app`).
3. Dans la console Twilio de votre numéro, configurez l'URL webhook entrant :
   ```
   https://abc-123.ngrok-free.app/api/v1/webhooks/twilio/sms
   ```
4. Envoyez un SMS depuis votre vrai smartphone vers votre numéro Twilio :
   - Le webhook reçoit le message,
   - Le client est identifié par son numéro de téléphone,
   - Le message est enregistré dans la table `SmsLog`,
   - L'événement Socket.io `message:new` est émis en temps réel,
   - Le message apparaît instantanément dans l'interface CRM sans rechargement.

---

## 5. Spécificités Réglementaires & Tarification (France / A2P)

### Règlementation en France
- **Format E.164** : Tous les numéros doivent être au format international standardisé (`+33612345678`). La normalisation est assurée automatiquement par `libphonenumber-js` dans notre service backend.
- **Règles A2P (Application-to-Person)** : En France, l'envoi de SMS professionnels automatisés doit respecter les créneaux légaux (généralement 8h-20h en semaine pour le marketing, 24/7 pour les confirmations d'interventions urgentes).
- **STOP SMS** : Twilio gère nativement le désabonnement si un client répond "STOP".

### Segments & Coûts
- **Taille d'un SMS standard** : 160 caractères (encodage standard GSM-7) ou 70 caractères si des caractères accentués spéciaux / emojis (UCS-2) sont présents.
- Au-delà, le message est découpé en plusieurs segments concaténés (environ ~0.04€ à 0.08€ par segment selon le volume et l'opérateur Twilio).
- Le CRM enregistre le statut et le `twilioSid` pour permettre un suivi précis de l'utilisation mensuelle par entreprise via `SmsUsage`.
