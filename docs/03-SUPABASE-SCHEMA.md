# Supabase Schema & Interactions Données

## Vue d'ensemble

- **43 tables** dans le schéma `public`
- **RLS activé** sur toutes les tables contenant des données utilisateur
- **pgvector** pour la recherche sémantique (embeddings 1536 dimensions)
- **pg_cron** pour les tâches planifiées
- **83 migrations** versionnées depuis `20260124`

---

## Tables par Domaine

### 1. Profils & Équipe

| Table | Rows | RLS | Description |
|---|---|---|---|
| `profiles` | 46 | ✅ | Profils auteurs (internes + influenceurs externes) |
| `profile_sync_status` | — | ✅ | État de synchronisation LinkedIn par profil |
| `user_onboarding` | — | ✅ | Progression onboarding utilisateur |
| `unipile_accounts` | — | ✅ | Comptes LinkedIn connectés via Unipile |

**`profiles`** — Table centrale. Chaque profil représente un auteur LinkedIn.

| Colonne clé | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Identifiant unique |
| `linkedin_id` | text (unique) | Identifiant LinkedIn |
| `full_name` | text | Nom complet |
| `type` | enum `author_type` | `internal` / `external_influencer` |
| `writing_style_prompt` | text | Prompt IA généré pour imiter le style |
| `style_analysis` | jsonb | Analyse détaillée du style (métriques, signature) |
| `writing_style_embedding` | vector(1536) | Embedding du style d'écriture |
| `sync_status` | text | `pending` / `scraping` / `analyzing` / `completed` / `error` |
| `invitation_status` | text | `none` / `pending` / `sent` / `accepted` / `expired` |

---

### 2. Banque de Posts Viraux (RAG)

| Table | Rows | RLS | Description |
|---|---|---|---|
| `viral_posts_bank` | 3598 | ✅ | Posts LinkedIn scrapés + classifiés |

**`viral_posts_bank`** — Cœur du système RAG.

| Colonne clé | Type | Description |
|---|---|---|
| `content` | text | Texte complet du post |
| `hook` | text | Première ligne (accroche) |
| `metrics` | jsonb | `{likes, comments, shares}` |
| `embedding` | vector(1536) | Embedding pour recherche sémantique |
| `author_id` | uuid → `profiles` | Auteur du post |
| `topic_id` | uuid → `topics` | Topic classifié |
| `structure_id` | uuid → `post_structures` | Structure classifiée |
| `hook_type_id` | uuid → `hook_types` | Type de hook classifié |
| `audience_id` | uuid → `audiences` | Audience classifiée |
| `needs_embedding` | boolean | Flag pour worker embeddings |
| `needs_hook_classification` | boolean | Flag pour worker hooks |
| `needs_topic_classification` | boolean | Flag pour worker topics |
| `needs_audience_classification` | boolean | Flag pour worker audiences |
| `needs_hook_extraction` | boolean | Flag pour worker extraction hooks |

---

### 3. Production de Contenu

| Table | Rows | RLS | Description |
|---|---|---|---|
| `production_posts` | 170 | ✅ | Posts en cours de création |
| `generated_hooks` | — | ✅ | Hooks générés par l'IA |
| `content_sources` | 0 | ✅ | Sources de contenu brut |
| `post_batches` | — | ✅ | Lots de posts groupés |
| `batch_author_configs` | — | ✅ | Config auteur par batch |

**`production_posts`** — Pipeline de création.

| Colonne clé | Type | Description |
|---|---|---|
| `status` | enum `post_status` | Workflow: `draft_input` → `hook_gen` → `hook_selected` → `body_gen` → `validated` → `scheduled` → `published` |
| `author_id` | uuid → `profiles` | Auteur assigné |
| `source_id` | uuid → `content_sources` | Source du contenu |
| `target_topic` | text | Thématique cible |
| `ai_hooks_draft` | jsonb | Hooks bruts générés par l'IA |
| `selected_hook_data` | jsonb | Hook sélectionné par l'utilisateur |
| `ai_body_draft` | jsonb | Corps généré (`{intro, body, conclusion}`) |
| `final_content` | text | Contenu final validé |
| `publication_date` | timestamptz | Date de publication planifiée |
| `attachments` | jsonb | Médias attachés |
| `mentions` | jsonb | Mentions LinkedIn |

---

### 4. Classification & Taxonomie

| Table | Rows | RLS | Description |
|---|---|---|---|
| `topics` | — | ✅ | Thématiques (sales, marketing, tech...) |
| `topic_groups` | — | ✅ | Groupes de topics |
| `audiences` | — | ✅ | Audiences cibles (founders, sales_pros...) |
| `hook_types` | — | ✅ | Types de hooks (bold_claim, question...) |
| `post_structures` | — | ✅ | Structures de posts (list, story...) |
| `content_formats` | — | ✅ | Formats de contenu |

**`audiences`** — Audiences enrichies pour personnalisation.

| Colonne clé | Type | Description |
|---|---|---|
| `job_titles` | text[] | Métiers cibles |
| `pain_points` | text[] | Douleurs de l'audience |
| `goals` | text[] | Objectifs |
| `vocabulary_to_use` | text[] | Vocabulaire recommandé |
| `vocabulary_to_avoid` | text[] | Vocabulaire interdit |
| `tone_preferences` | text | Préférences de ton |

---

### 5. Publication & Engagement

| Table | Rows | RLS | Description |
|---|---|---|---|
| `scheduled_posts` | — | ✅ | Posts planifiés (legacy) |
| `scheduled_post_accounts` | — | ✅ | Comptes cibles par post planifié |
| `published_posts` | — | ✅ | Historique des publications |
| `engagement_logs` | — | ✅ | Logs d'auto-engagement |
| `engagement_settings` | — | ✅ | Paramètres d'engagement par profil |
| `comment_patterns` | 30 | ✅ | Patterns de commentaires IA |

---

### 6. Company Pages

| Table | Rows | RLS | Description |
|---|---|---|---|
| `company_pages` | — | ✅ | Pages entreprise LinkedIn |
| `company_auto_post_rules` | — | ✅ | Règles d'auto-publication |
| `company_published_posts` | — | ✅ | Posts publiés sur pages entreprise |

---

### 7. Ressources & Connaissances

| Table | Rows | RLS | Description |
|---|---|---|---|
| `knowledge` | — | ✅ | Base de connaissances (articles, notes) |
| `topic_knowledge` | — | ✅ | Liens topic ↔ knowledge |
| `ressources` | — | ✅ | Fichiers et ressources |
| `ressource_types` | — | ✅ | Types de ressources |
| `ressource_folders` | 3 | ✅ | Dossiers de ressources |

---

### 8. Templates & Presets

| Table | Rows | RLS | Description |
|---|---|---|---|
| `post_templates` | — | ✅ | Templates de structure de posts |
| `presets` | — | ✅ | Presets de style (ton, format, densité) |
| `ctas` | — | ✅ | Appels à l'action |
| `platforms` | — | ✅ | Plateformes (LinkedIn, etc.) |

---

### 9. AI & Monitoring

| Table | Rows | RLS | Description |
|---|---|---|---|
| `ai_usage_logs` | 87114 | ✅ | Logs d'utilisation IA (tokens, coûts) |
| `ai_errors` | — | ✅ | Erreurs IA avec `user_error_ref` |
| `ai_model_pricing` | 5 | ✅ | Tarification des modèles IA |
| `task_execution_logs_v2` | 4624 | ✅ | Logs d'exécution des workers V2 |
| `worker_feature_flags_v2` | 6 | ❌ | Feature flags des workers |
| `feature_flags_v2` | 7 | ✅ | Feature flags globaux |
| `sync_jobs` | — | ✅ | Logs de jobs de synchronisation |
| `sync_job_logs` | — | ✅ | Détails des jobs de sync |

---

### 10. Chat & Sessions

| Table | Rows | RLS | Description |
|---|---|---|---|
| `chat_sessions` | — | ✅ | Sessions de chat IA |
| `chat_messages` | — | ✅ | Messages du chat IA |

---

## Interactions Données Principales

### Flux de Scraping → Classification

```
profiles (linkedin_id)
    │ sync-profiles
    ▼
viral_posts_bank (needs_* = true)
    │
    ├─ worker-generate-embeddings-v2 → embedding (vector 1536)
    ├─ worker-extract-hooks-v2 → hook (text)
    ├─ worker-classify-hooks-v2 → hook_type_id → hook_types
    ├─ worker-classify-topics-v2 → topic_id → topics
    ├─ worker-classify-audiences-v2 → audience_id → audiences
    └─ worker-complete-profiles-v2 → profiles.writing_style_prompt
```

### Flux de Création de Post

```
production_posts (draft_input)
    │
    ├─ Contexte chargé en parallèle:
    │   ├─ profiles (writing_style_prompt, style_analysis)
    │   ├─ topics (name, description)
    │   ├─ audiences (pain_points, goals, vocabulary)
    │   ├─ hook_types (prompt_instruction)
    │   ├─ knowledge (via topic_knowledge)
    │   ├─ post_templates (structure)
    │   └─ platforms (max_characters, tone_guidelines)
    │
    ├─ generate-hooks → generated_hooks + production_posts.ai_hooks_draft
    │   status: draft_input → hook_gen
    │
    ├─ User sélectionne un hook
    │   status: hook_gen → hook_selected
    │
    ├─ generate-body → production_posts.ai_body_draft
    │   status: hook_selected → body_gen
    │
    ├─ User valide
    │   status: body_gen → validated
    │
    ├─ User planifie
    │   status: validated → scheduled
    │
    └─ publish-scheduled (cron) → Unipile API
        status: scheduled → published
        → published_posts (historique)
        → company_published_posts (auto-post pages entreprise)
```

### Recherche Sémantique (RAG)

```sql
-- Fonction match_viral_posts
SELECT id, content, hook, metrics,
       1 - (embedding <=> query_embedding) AS similarity
FROM viral_posts_bank
WHERE 1 - (embedding <=> query_embedding) > match_threshold
ORDER BY embedding <=> query_embedding
LIMIT match_count;
```

Variantes disponibles :
- `match_viral_posts` — Recherche globale
- `match_viral_posts_by_author` — Filtre par auteur
- `match_viral_posts_by_topic` — Filtre par topic
- `match_viral_posts_filtered` — Filtres combinés
- `match_topics` — Recherche de topics similaires
- `match_audiences` — Recherche d'audiences similaires
- `match_hook_types` — Recherche de types de hooks similaires
