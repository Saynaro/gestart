# 🏛️ Facturation Électronique & E-Reporting (DGFiP 2026 / 2027)

Ce document détaille l'architecture technique, les normes réglementaires et les intégrations du module **Facturation Électronique** pour le CRM des artisans.

---

## 1. Cadre Réglementaire DGFiP (Version 3.2 — 2026)

La réforme de la facturation électronique en France s'applique selon le calendrier légal :
- **1er septembre 2026** : Obligation de **réception** de toutes les factures électroniques pour toutes les entreprises (y compris micro-entreprises, artisans et TPE).
- **1er septembre 2027** : Obligation d'**émission** pour les TPE / PME et artisans.

### Normes & Spécifications Respectées
* **EN 16931** : Modèle sémantique européen de la facture électronique.
* **XP Z12-012** : Formats de données (Factur-X, UBL, UN/CEFACT CII) et statuts du cycle de vie (CDAR).
* **XP Z12-013** : Interface API d'échange entre les systèmes d'information et les Plateformes Agréées (PA / PDP).
* **XP Z12-014** : Annuaire national des entreprises et routage des flux.

---

## 2. Statut Juridique & Frontière de Conformité

* **CRM** = **Solution Compatible** (Logiciel de facturation et de gestion pour artisans).
* **B2Brouter / Qonto / Sage Active** = **Plateformes Agréées (PDP / PPF)** assurant la conformité DGFiP, le contrôle fiscal et la transmission vers l'annuaire d'État.

---

## 3. Architecture Technique Universelle

```
                     ┌──────────────────────────────────┐
                     │            CRM DOMAIN            │
                     └─────────────────┬────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │         E-INVOICING CORE         │
                     │ ──────────────────────────────── │
                     │ • EInvoicingService              │
                     │ • FrenchEInvoiceValidator        │
                     │ • CanonicalInvoiceMapper         │
                     │ • LifecycleNormalizer            │
                     │ • DirectoryService               │
                     │ • EReportingService              │
                     │ • SyncService                    │
                     │ • ProviderRegistry               │
                     └─────────────────┬────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │     EInvoicingProvider (IF)      │
                     └──────┬────────────┼────────────┬─┘
                            │            │            │
             ┌──────────────┴──┐  ┌──────┴──────┐  ┌──┴───────────────┐
             │B2BrouterProvider│  │QontoProvider│  │SageActiveProvider│
             └─────────────────┘  └─────────────┘  └──────────────────┘
```

---

## 4. Fournisseurs & Adaptateurs Connectés

| Fournisseur | Statut | Méthode d'Auth | Provisioning eDocSync | Factur-X / UBL | Webhooks | E-Reporting |
|---|---|---|---|---|---|---|
| **B2Brouter** | ✅ Disponible | Clé API (`X-B2B-API-Key`) | ✅ Automatique | ✅ Oui | ✅ Oui | ✅ Oui |
| **Qonto** | ✅ Disponible | OAuth 2.0 (PKCE) | ❌ Non | ✅ Factur-X / UBL | ✅ Oui | ✅ Oui |
| **Sage Active** | ✅ Disponible | OAuth 2.0 + Sub. Key | ❌ Non | ✅ Factur-X / UBL | ✅ Oui | ✅ Oui |
| **Indy** | ⏳ Partenaire requis | Bientôt disponible | ❌ Non | ❌ Non | ❌ Non | ❌ Non |
| **Pennylane** | ⏳ Beta | Clé API | ❌ Non | ✅ Factur-X | ❌ Polling | ❌ Non |

---

## 5. Formats Électroniques Supportés

1. **Factur-X** (`PDF/A-3` + `factur-x.xml` UN/CEFACT CII). Profils : `MINIMUM`, `BASIC`, `EN16931`.
2. **UBL 2.1** (ISO/IEC 19845 Universal Business Language).
3. **UN/CEFACT CII** (D16B Cross Industry Invoice XML).

---

## 6. Variables d'Environnement

```env
# B2Brouter (PDP / eDocSync White-Label)
B2BROUTER_API_KEY="your_b2brouter_api_key"
B2BROUTER_EDOCSYNC_API_KEY="your_edocsync_master_api_key"
B2BROUTER_ENV="sandbox" # "sandbox" | "production"
B2BROUTER_WEBHOOK_SECRET="your_webhook_hmac_secret"

# Qonto (OAuth 2.0 PA)
QONTO_CLIENT_ID="your_qonto_oauth_client_id"
QONTO_CLIENT_SECRET="your_qonto_oauth_client_secret"
QONTO_ENV="production" # "sandbox" | "production"

# Sage Active (Sage Network PDP)
SAGE_ACTIVE_CLIENT_ID="your_sage_client_id"
SAGE_ACTIVE_CLIENT_SECRET="your_sage_client_secret"
SAGE_ACTIVE_SUBSCRIPTION_KEY="your_subscription_key"

# Chiffrement AES-256-GCM
EINVOICING_ENCRYPTION_KEY="32_bytes_hex_secret_key"
```

---

## 7. Cycle de Vie des Factures (CDAR)

Les statuts normalisés selon les spécifications DGFiP :
* `DRAFT` (Brouillon)
* `PROCESSING` (En cours de transmission)
* `SUBMITTED` (Déposée sur la Plateforme Agréée)
* `DELIVERED` (Mise à disposition du client)
* `RECEIVED` (Prise en charge par le client)
* `ACCEPTED` (Approuvée / Bon à payer)
* `REJECTED` (Rejetée avec motif)
* `DISPUTED` (En litige)
* `PAID` (Réglée)
* `CANCELLED` (Annulée)
