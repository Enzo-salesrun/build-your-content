# 🗺️ Content Factory - Roadmap

> Document de suivi des évolutions, fonctionnalités et maintenance du produit.

---

## 📊 Légende

| Status | Description |
|--------|-------------|
| ✅ | Complété |
| 🔄 | En cours |
| 📋 | Planifié |
| 💡 | Idée / À explorer |

---

## 🏗️ Architecture & Infrastructure

### ✅ Architecture Hybride Event-Driven (v2)
> Migrer vers une architecture event-driven pour réduire les coûts AI et améliorer la scalabilité.

**Réalisations :**
- [x] 6 Workers V2 déployés (extract-hooks, embeddings, classify-hooks/topics/audiences, complete-profiles)
- [x] Triggers PostgreSQL pour traitement temps réel
- [x] Cron jobs de rattrapage (résilience)
- [x] Support mode trigger (post_id unique) + batch
- [x] Flags par défaut = true sur nouveaux posts

**Prochaines étapes :**
- [ ] Désactiver progressivement le legacy `continue-processing`
- [ ] Monitoring dashboard pour les workers V2
- [ ] Alertes en cas d'échec massif

---

### 📋 Transition Produit Interne → Produit Externe (SaaS)
> Repenser l'architecture pour supporter des clients externes avec isolation des données.

**Axes de travail :**

#### Multi-tenancy
- [ ] Isolation des données par organisation/workspace
- [ ] RLS policies strictes par `organization_id`
- [ ] Quotas et limites par plan (posts/mois, créateurs, etc.)

#### Authentification & Sécurité
- [ ] Système d'invitation d'équipe (existant à améliorer)
- [ ] Rôles granulaires (Admin, Editor, Viewer)
- [ ] Audit logs des actions utilisateurs
- [ ] SSO (Google, Microsoft) pour entreprises

#### Billing & Plans
- [ ] Intégration Stripe pour abonnements
- [ ] Plans : Free, Pro, Enterprise
- [ ] Usage-based billing (tokens AI consommés)
- [ ] Dashboard de consommation

#### Onboarding
- [ ] Wizard de setup pour nouveaux clients
- [ ] Templates de démarrage
- [ ] Documentation utilisateur

---

## 👥 Onboarding Membres (PRIORITÉ UX)

> Simplifier au maximum l'inscription et la connexion LinkedIn pour les utilisateurs non-techniques.

### 📋 Parcours d'invitation simplifié
**Objectif :** Un membre invité doit pouvoir connecter son LinkedIn en moins de 2 minutes, sans chercher.

- [ ] **Lien d'invitation direct** → pointe vers la page de connexion LinkedIn (pas le dashboard)
- [ ] **Landing page dédiée** pour les invités avec instructions visuelles étape par étape
- [ ] **Indicateur de progression** clair (1. Créer compte → 2. Connecter LinkedIn → 3. Terminé ✓)
- [ ] **Vidéo tutoriel** courte (<1min) intégrée pour les novices

### 📋 Connexion Unipile en Modal (pas popup)
**Problème :** Les popups sont bloquées par défaut par les navigateurs → les utilisateurs ne voient pas la fenêtre de connexion.

**Solution :**
- [ ] Remplacer `window.open()` par une **modal iframe** intégrée au site
- [ ] Fallback gracieux si iframe bloquée → afficher instructions manuelles
- [ ] Message explicite si popup bloquée : "Autorisez les popups ou cliquez ici"
- [ ] Tester sur Chrome, Safari, Firefox, Edge

### 📋 Design "Novice-Friendly"
- [ ] Gros boutons, textes lisibles (16px min)
- [ ] Icônes explicatives à chaque étape
- [ ] Messages d'erreur en langage simple (pas de jargon technique)
- [ ] Numéro/email de support visible en cas de blocage
- [ ] Mode "aide contextuelle" avec tooltips

---

## 🎨 UI/UX

### 📋 Refonte UI - Style Resend/Minimal
> Simplifier l'interface pour un look plus épuré, professionnel et moins coloré.

**Inspirations :** Resend, Linear, Vercel

**Axes de travail :**

#### Design System
- [ ] Palette de couleurs réduite (noir, blanc, gris, 1 accent)
- [ ] Typographie : Inter ou Geist comme police principale
- [ ] Espacements cohérents (système 4px/8px)
- [ ] Composants shadcn/ui uniformisés

#### Composants à revoir
- [ ] Sidebar : plus fine, icônes minimalistes
- [ ] Cards : bordures subtiles, moins d'ombres
- [ ] Boutons : style plus flat, moins d'effets
- [ ] Tables : design épuré façon Linear
- [ ] Modales : centrées, animations fluides

#### Navigation
- [ ] Breadcrumbs clairs
- [ ] Raccourcis clavier (⌘K pour command palette)
- [ ] État vide (empty states) soignés

---

### � Studio V3 - Inversion du Flow (Creator-First)
> Repenser entièrement le flux du studio en partant des créateurs au lieu des posts.

**Problème actuel (V2) :**
- On part du post → même post utilisé pour tous les créateurs
- Aucune possibilité de personnaliser les posts par créateur

**Nouvelle approche (V3) :**

#### Flow proposé
1. **Sélection des créateurs** (point d'entrée unique)
2. **Choix des posts par créateur** (interface split)
   - Gauche : liste des créateurs sélectionnés
   - Droite : posts à choisir (recycler, inspirer, etc.)
3. **Configuration par créateur** (style, langue, ton, etc.)
4. **Gestion des hooks** (comme actuellement)

#### Travaux requis
- [ ] 🎨 **Maquette UX avec mock data** (valider le concept avant dev)
- [ ] Refonte de la collecte des posts
- [ ] Refonte du flow d'envoi
- [ ] Adaptation du flow IA (génération par créateur)
- [ ] Mise à jour des Edge Functions correspondantes
- [ ] Tests end-to-end du nouveau parcours

#### Gestion des posts programmés
- [ ] **Vue des posts programmés par auteur** dans le flow créateur
- [ ] **Détection de conflits horaires** : alerter si 2 posts sont programmés à des intervalles trop proches (< 2h par exemple)
- [ ] **Suggestion de replanification** automatique en cas de conflit
- [ ] Indicateur visuel du calendrier de publication par créateur

---

### � Amélioration Creator Studio (V2)
> Optimiser le parcours utilisateur, surtout avec beaucoup de créateurs.

**Problèmes identifiés :**
- Performance dégradée avec 10+ créateurs
- Navigation confuse entre créateurs
- Pas de vue d'ensemble multi-créateurs

**Solutions proposées :**

#### Performance
- [ ] Virtualisation des listes (react-virtual)
- [ ] Pagination côté serveur
- [ ] Lazy loading des données créateur
- [ ] Cache local (TanStack Query optimisé)

#### UX Multi-créateurs
- [ ] Sélecteur de créateur rapide (dropdown searchable)
- [ ] Vue dashboard multi-créateurs
- [ ] Bulk actions (sélectionner plusieurs créateurs)
- [ ] Filtres et tri avancés

#### Workflow
- [ ] Étapes de progression claires
- [ ] Indicateurs visuels de complétion
- [ ] Raccourcis pour actions fréquentes

---

### 📋 Sidebar Rétractable
> Améliorer l'espace de travail en permettant de réduire la sidebar.

- [ ] Toggle pour rétracter/étendre la sidebar
- [ ] Mode icônes uniquement quand rétractée
- [ ] Persistance de l'état (localStorage)
- [ ] Animation fluide de transition
- [ ] Raccourci clavier (ex: `⌘+B`)

---

## ⚡ Performance & Scalabilité

### 📋 Traitement Haute Volumétrie
> Supporter l'envoi de 40+ posts, 300+ hooks simultanément.

**Architecture proposée :**

#### Queue System
- [ ] Implémenter une queue de jobs (pg_boss ou Inngest)
- [ ] Découper les gros batches en chunks de 10-20
- [ ] Progress tracking temps réel (WebSocket ou polling)
- [ ] Retry automatique avec backoff exponentiel

#### UI pour gros volumes
- [ ] Barre de progression détaillée
- [ ] Estimation du temps restant
- [ ] Mode "background" (continuer pendant le traitement)
- [ ] Notifications quand terminé

#### Rate Limiting intelligent
- [ ] Respecter les limites OpenAI (3500 RPM)
- [ ] Priorisation des jobs (urgent vs batch)
- [ ] Dashboard de monitoring des queues

---

## � Bugs & Problèmes Identifiés (Retour utilisateur - Fév 2026)

> Retours après 1 semaine de test intensif (60 posts pour 5 personnes).

### 🔴 Bugs critiques
- [ ] **Hooks en anglais génèrent en français** : Le paramètre de langue n'est pas respecté
- [ ] **Génération hooks en bulk plante** : Impossible de générer les hooks pour tous les posts d'un coup
- [ ] **Posts multiples trop similaires** : Quand on génère plusieurs posts en même temps, ils se ressemblent énormément

### 🟡 Problèmes de copywriting
- [ ] **Posts parfois trop longs** : Dépasse la longueur optimale LinkedIn
- [ ] **Ton trop technique** : Manque de naturel, trop jargon
- [ ] **Hooks trop techniques avec anglicismes** : Pas assez accessibles
- [ ] **Manque de variété** : Ton "moralisateur" (nous on sait, vous vous êtes nuls) → besoin d'autres angles (storytelling, humour, curiosité, etc.)

### 🟢 Points positifs validés
- ✅ **Efficacité prouvée** : 60 posts pour 5 personnes en 2-3h
- ✅ **Impact LinkedIn** : x3 impressions en 1 semaine
- ✅ Système de commentaires automatiques fonctionnel

---

## 🎯 Onboarding Membres V2 - Configuration Sur-Mesure

> Créer une vraie configuration personnalisée pour chaque membre interne.

### 📋 Scraping & Analyse automatique
- [ ] **Scrapping des posts existants** du membre sur LinkedIn
- [ ] Analyse automatique de son style d'écriture à partir de ses vrais posts
- [ ] Extraction des patterns, tics de langage, longueur moyenne

### 📋 Capture vocale du style (Orla)
- [ ] **Questions vocales** (min 15 secondes) pour capturer comment la personne parle vraiment
- [ ] Transcription → analyse du vocabulaire naturel
- [ ] **Question obligatoire** : "Explique ta zone de génie et ton scope dans l'entreprise"
- [ ] Intégration avec Orla pour la capture audio

### 📋 Préférences de créateurs (Tinder-style)
- [ ] **Swipe sur les créateurs** de sa niche lors de l'onboarding
- [ ] Pouce haut/bas pour identifier ses préférences stylistiques
- [ ] L'IA utilise ces préférences pour pondérer les inspirations
- [ ] Affinage progressif basé sur les feedbacks

---

## 📚 Base de Connaissances V2

### 📋 Organisation en dossiers
- [ ] **Système de dossiers** dans la banque de ressources
- [ ] Hiérarchie de dossiers (sous-dossiers)
- [ ] Drag & drop pour organiser
- [ ] Recherche dans les dossiers

### 📋 Intégrations externes
- [ ] **Connexion RSS de blog SEO** : import automatique des articles
- [ ] Sync périodique des nouveaux articles
- [ ] Extraction automatique du contenu pour inspiration

---

## 🎨 Design & Branding

> Feedback Phoq : niveau design et branding, on est une queue.

### 📋 Audit Design
- [ ] **Point design avec équipe** : identifier les problèmes visuels
- [ ] Benchmark concurrents (Buffer, Hootsuite, Typefully)
- [ ] Définir une direction artistique claire

### 📋 Assets visuels
- [ ] Enrichir la bibliothèque de visuels (en cours - weekend)
- [ ] Templates visuels pour posts
- [ ] Guidelines de marque documentées

---

## � Maintenance & Dette Technique

### 📋 Nettoyage Codebase
- [ ] Supprimer le code legacy `continue-processing` (après validation V2)
- [ ] Consolider les hooks React (16 hooks identifiés)
- [ ] Typage strict sur tous les composants
- [ ] Tests unitaires sur les workers V2

### 📋 Documentation
- [ ] README technique à jour
- [ ] Documentation API des Edge Functions
- [ ] Schéma de la base de données
- [ ] Guide de contribution

---

## 💡 Idées Futures

### 📋 Trend Intelligence - Analyse des tendances pour optimiser les prompts
> Classifier uniquement les top posts pour identifier les tendances et mettre à jour automatiquement les prompts/structures.

**Problème actuel :**
- Classification de TOUS les posts = coûts élevés (~$50/mois)
- 80% des posts ne sont jamais consultés
- Pas d'exploitation des données pour améliorer les prompts

**Solution proposée : Sampling + Trend Reports**

#### Architecture
- [ ] **Sampling intelligent** : Classifier uniquement les TOP 50 posts/semaine (par engagement)
- [ ] **Trend Report mensuel** : Rapport automatique des tendances (hook types, audiences en hausse/baisse)
- [ ] **Recommandations IA** : Suggestions de mise à jour des prompts basées sur les tendances
- [ ] **Dashboard Tendances** : Visualisation des évolutions dans le temps

#### Métriques trackées
- [ ] Distribution des hook types par performance
- [ ] Audiences les plus engagées
- [ ] Styles d'écriture qui performent
- [ ] Évolution mois par mois

#### Économies estimées
- Avant : ~$50/mois (classification systématique)
- Après : ~$5/mois (sampling top performers)
- **Économie : 90%**

---

### 📋 Banque de Ressources - Extraction Multi-format
> Enrichir la banque de ressources avec extraction automatique de contenu pour utilisation directe en inspiration de posts.

#### Extraction supportée
- [ ] **Vidéos YouTube** : extraction du transcript automatique
- [ ] **Vidéos uploadées** : transcription audio → texte
- [ ] **PDFs** : extraction du contenu textuel
- [ ] **Images** : OCR pour extraire le texte visible
- [ ] **URLs/Articles** : scraping du contenu principal

#### Utilisation
- [ ] Utiliser les ressources extraites comme source d'inspiration dans le studio
- [ ] Taguer et catégoriser les ressources
- [ ] Recherche full-text dans les contenus extraits
- [ ] Lier des ressources à des posts générés

---

### Fonctionnalités
- [ ] **Page Entreprise avec USP** : Permettre de renseigner le site web de l'entreprise, scraper automatiquement (ou édition manuelle) pour extraire le contexte métier et générer un résumé USP (Unique Selling Proposition) qui guidera l'IA dans la génération de contenu.
- [ ] **Revoir personnalité des commentaires** : Ajuster le ton des commentaires auto-générés (actuellement trop agressif). Proposer des profils de personnalité (professionnel, amical, expert, curieux) pour adapter le style.
- [ ] **Profil membre enrichi (Scope, Spécialité, Hiérarchie)** : Ajouter pour chaque membre son scope d'expertise (ex: Sales, Marketing, Tech), sa spécialité (ex: Growth Hacking, SEO, DevOps) et son niveau hiérarchique (ex: CEO, Manager, Contributor). Ces infos guideront l'IA pour adapter le ton et le contenu du copywriting à la posture du membre.
- [ ] **Améliorer système de mentions** dans les posts (autocomplétion, validation, preview)
- [ ] Import bulk de posts (CSV, URL LinkedIn)
- [ ] Scheduling de posts (intégration calendrier)
- [ ] Analytics détaillées des posts publiés
- [ ] A/B testing de hooks
- [ ] Suggestions AI contextuelles

### Intégrations
- [ ] API publique pour intégrations tierces
- [ ] Zapier/Make connector
- [ ] Chrome extension pour capture rapide
- [ ] Mobile app (React Native)

---

## 📅 Timeline Suggérée

| Trimestre | Focus |
|-----------|-------|
| **Q1 2026** | Stabiliser V2, Refonte UI minimaliste |
| **Q2 2026** | Multi-tenancy, Performance haute volumétrie |
| **Q3 2026** | Billing Stripe, Onboarding SaaS |
| **Q4 2026** | API publique, Intégrations |

---

*Dernière mise à jour : 5 février 2026*
