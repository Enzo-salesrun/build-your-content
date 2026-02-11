# 🔗 BYS — LinkedIn Enrichment Extension

> **Google Sheets Add-on** pour enrichir automatiquement vos listes d'entreprises avec des données LinkedIn et CompanyEnrich.

---

## 📋 Table des matières

1. [Installation](#-installation)
2. [Configuration initiale](#-configuration-initiale)
3. [Les 3 opérations](#-les-3-opérations)
4. [Auto Enrich (mode recommandé)](#-auto-enrich-mode-recommandé)
5. [Toolbox avancée](#-toolbox-avancée)
6. [Cas d'usage concrets](#-cas-dusage-concrets)
7. [Compteur de crédits](#-compteur-de-crédits)
8. [FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 🚀 Installation

### Prérequis

| Élément | Détail |
|---|---|
| **Google Sheets** | Compte Google Workspace ou personnel |
| **Clé RapidAPI** | [→ Obtenir ici](https://rapidapi.com/pnd-team-pnd-team/api/professional-network-data) |
| **Token CompanyEnrich** | [→ Obtenir ici](https://app.companyenrich.com/access-keys) |

### Étapes

1. Ouvrir votre Google Sheet
2. **Extensions → Apps Script**
3. Coller le contenu de `LinkedInEnrichment_Full.gs` dans l'éditeur
4. **Sauvegarder** (Ctrl+S)
5. Revenir dans le Sheet → **Actualiser la page**
6. Un menu **BYS - LinkedIn Enrichment** apparaît dans la barre de menus
7. Cliquer sur **Open Dashboard** → la sidebar s'ouvre

> 💡 **Première ouverture** : Google demandera d'autoriser le script. Cliquer sur "Examiner les autorisations" → Sélectionner votre compte → "Autoriser".

---

## ⚙️ Configuration initiale

### 1. Clés API

Dans la sidebar, ouvrir **⚙️ Setup → API Keys & Rate Limits** :

| Champ | Description |
|---|---|
| **RapidAPI Key** | Votre clé pour l'API LinkedIn (Professional Network Data) |
| **CompanyEnrich Token** | Votre token pour l'API CompanyEnrich |
| **Delay between calls** | Intervalle minimum entre 2 appels API (défaut: 1250ms) |
| **Max retries** | Nombre de tentatives en cas d'erreur (défaut: 3) |

Cliquer **Save Settings** pour enregistrer.

### 2. Scanner les colonnes

Cliquer **Scan Sheet Headers** dans le Setup.

Le script détecte automatiquement vos colonnes existantes par leur nom :

| Colonne détectée | Patterns reconnus |
|---|---|
| **LinkedIn URL** | `linkedin url`, `profil linkedin`, `linkedin` |
| **Domain / Website** | `domain`, `website`, `site`, `url`, `www` |
| **Company ID** | `company id`, `linkedin id`, `id` |
| **Name** | `name`, `nom`, `company name`, `entreprise` |
| **Status** | `status`, `statut`, `état` |

> 📌 **Minimum requis** : au moins **une colonne d'entrée** parmi LinkedIn URL, Domain, ou Company ID.

Les colonnes manquantes (Status, Name, Tagline, Description, Staff Count, etc.) sont **créées automatiquement** à droite de vos données existantes avec le suffixe `(BYS)`.

Cliquer **Apply Mapping** pour confirmer.

---

## 🔧 Les 3 opérations

L'extension fonctionne en **3 étapes** qui peuvent être lancées individuellement ou enchaînées :

### 1. 🔍 Find LinkedIn (Finder)

**But** : Trouver l'URL LinkedIn d'une entreprise à partir de son domaine ou nom.

**Stratégie de recherche (3 niveaux)** :

```
Ligne avec domaine → Bulk CompanyEnrich (rapide, batch)
   ↓ pas trouvé ?
Retry par nom d'entreprise → CE Search API (fallback)
   ↓ pas de nom ?
Skip
```

**Colonnes lues** : `Domain`, `Name`
**Colonnes écrites** : `LinkedIn URL`, `Company ID`, `Name`, `Status`

---

### 2. 🏭 Enrich Companies (Enrichment)

**But** : Récupérer toutes les données d'une entreprise via son URL LinkedIn ou Company ID.

**Données récupérées** :

| Colonne | Exemple |
|---|---|
| Name | `Build Your Sales` |
| Tagline | `We help B2B companies grow` |
| Description | `Build Your Sales est une agence...` |
| Staff Count | `11` |
| Staff Range | `11-50` |
| HQ Country | `France` |
| HQ City | `Paris` |
| Industries | `Marketing Services` |
| Website | `buildyoursales.com` |

**Colonnes lues** : `LinkedIn URL`, `Company ID`, `Domain`
**Colonnes écrites** : Toutes les colonnes ci-dessus + `Status`

---

### 3. 📊 Headcount (par département)

**But** : Compter le nombre d'employés **en poste** par département dans chaque entreprise.

**25 départements disponibles** :

> Accounting, Administrative, Arts and Design, **Business Development** (inclut Sales), Community and Social Services, Consulting, Education, Engineering, Entrepreneurship, Finance, Healthcare Services, Human Resources, Information Technology, Legal, Marketing, Media and Communication, Military and Protective Services, Operations, Product Management, Program and Project Management, Purchasing, Quality Assurance, Real Estate, Research, Support

**Fonctionnement** :
- **1 seul appel API** par entreprise (POST `get-company-employees-count`)
- Les colonnes sont créées dynamiquement après les colonnes BYS existantes
- Headers : `{Département} - Headcount (BYS)` (fond vert)
- Les données "Sales" sont automatiquement **fusionnées dans "Business Development"**

**Colonne lue** : `Company ID`
**Colonnes écrites** : Une par département sélectionné

---

## ⚡ Auto Enrich (mode recommandé)

Le bouton **Start Auto Enrich** enchaîne automatiquement :

```
Finder → Enrichment
```

### Flow détaillé

```
1. Finder trie les lignes :
   ├── LinkedIn URL déjà remplie → skip
   ├── Domain dispo → queue bulk CompanyEnrich
   ├── Pas de domain, nom dispo → recherche CE par nom
   └── Ni domain ni nom → skip

2. Bulk CompanyEnrich traite les domains en batch
   ├── LinkedIn URL trouvée → ✅ écrit les données
   ├── Pas de LinkedIn URL → 🔄 retry par nom
   └── Erreur → 🔄 retry par nom

3. Enrichment démarre automatiquement après Finder
   ├── Récupère les détails via LinkedIn URL / Company ID
   └── Écrit toutes les données entreprise
```

### Live Status

Pendant l'exécution, le panneau **Live Status** affiche en temps réel :
- L'étape en cours (Finder, Enrichment, Headcount)
- La progression (barre + pourcentage)
- Le détail (X/Y lignes, trouvés, erreurs)
- Le compteur de crédits API consommés

---

## 🧰 Toolbox avancée

Accessible via **🧰 Toolbox (advanced)** dans la sidebar.

| Action | Bouton | Usage |
|---|---|---|
| **Run Finder** | Finder seul | Compléter les LinkedIn URLs sans enrichir |
| **Run Enrichment** | Enrichment seul | Enrichir des lignes qui ont déjà une LinkedIn URL |
| **Run Headcount** | Headcount seul | Compter les employés par département |
| **Stop** | ■ Stop | Arrêter proprement l'opération en cours |
| **Clear Progress** | Rouge | Nettoyer les flags de progression |
| **Reset Everything** | Rouge foncé | Supprimer toute la configuration (mapping, clés, état) |

---

## 🎯 Cas d'usage concrets

### Cas 1 — Enrichir une liste de prospects depuis des domaines

**Input** : Liste de domaines (ex: export depuis un CRM)

| Domain |
|---|
| apple.com |
| google.com |
| buildyoursales.com |

**Action** : `Auto Enrich`

**Résultat** : LinkedIn URL + toutes les données entreprise remplies automatiquement.

---

### Cas 2 — Enrichir depuis des noms d'entreprises (sans domaine)

**Input** : Liste de noms d'entreprises

| Name |
|---|
| Build Your Sales |
| Salesforce |
| HubSpot |

**Action** : `Auto Enrich`

**Résultat** : Le Finder cherche par nom via l'API CompanyEnrich, trouve la LinkedIn URL, puis enrichit.

---

### Cas 3 — Compléter un export LinkedIn Sales Navigator

**Input** : Export avec LinkedIn URLs déjà remplies

| LinkedIn URL |
|---|
| https://www.linkedin.com/company/apple/ |
| https://www.linkedin.com/company/google/ |

**Action** : `Run Enrichment` (pas besoin du Finder)

**Résultat** : Staff count, HQ, industries, description... remplis directement.

---

### Cas 4 — Analyser la taille des équipes par département

**Input** : Liste enrichie avec Company IDs

**Action** : `Run Headcount` → Sélectionner les départements voulus (ex: Business Development, Engineering, Marketing)

**Résultat** :

| Name | ... | Business Dev - Headcount (BYS) | Engineering - Headcount (BYS) | Marketing - Headcount (BYS) |
|---|---|---|---|---|
| Apple | ... | 2500 | 15000 | 3200 |
| Google | ... | 1800 | 20000 | 4500 |

> 💡 **Astuce** : Utilisez ces données pour scorer vos prospects (plus de devs = plus tech-friendly, plus de sales = marché compétitif).

---

### Cas 5 — Mix domaines + noms + LinkedIn URLs

**Input** : Données hétérogènes

| Domain | Name | LinkedIn URL |
|---|---|---|
| apple.com | | |
| | Salesforce | |
| | | https://www.linkedin.com/company/hubspot/ |
| | Build Your Sales | |

**Action** : `Auto Enrich`

**Résultat** : Le script gère automatiquement chaque cas :
- `apple.com` → Finder par domain → Enrichment
- `Salesforce` → Finder par nom → Enrichment
- `hubspot` → Skip Finder (URL déjà là) → Enrichment direct
- `Build Your Sales` → Finder par nom → Enrichment

---

## 💳 Compteur de crédits

Le compteur en bas du panneau Live Status affiche :

```
💳 Credits used: 42 (RapidAPI: 28 • CE: 14)
Reset counter
```

| Type | Ce qui est compté |
|---|---|
| **RapidAPI** | Finder (get-company-details), Enrichment (get-company-details-by-id), Headcount (get-company-employees-count) |
| **CE** | CompanyEnrich Bulk (submit, poll, download), CE Search par nom |

Le compteur persiste entre les sessions. Cliquer **Reset counter** pour remettre à zéro.

---

## ❓ FAQ & Troubleshooting

### "BYS columns missing in sheet"
→ Re-scanner les headers : **Setup → Scan Sheet Headers → Apply Mapping**

### L'opération s'arrête au bout de ~23 min
→ Normal ! C'est la limite Google Apps Script. L'opération **reprend automatiquement** via un trigger (~45s de pause puis reprise).

### "Rate limited (429)"
→ Augmenter le délai entre les appels dans **Setup → API Keys → Delay between calls** (ex: 1500ms au lieu de 1250ms).

### Les données ne s'écrivent pas sur les bonnes lignes
→ Vérifier que la ligne d'en-tête est bien la **ligne 1** (configurable via `CONFIG.HEADER_ROW` dans le script).

### Comment arrêter une opération en cours ?
→ Cliquer le bouton **■ Stop** dans la sidebar. L'opération s'arrête proprement à la prochaine itération.

### Les colonnes Headcount n'apparaissent pas
→ Elles sont créées **dynamiquement** quand vous lancez Headcount pour la première fois, après toutes les colonnes BYS existantes.

---

> **BYS · Build Your Sales** — LinkedIn Enrichment Extension for Google Sheets
