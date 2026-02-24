# API — Edge Functions & Endpoints

## Vue d'ensemble

Le backend expose **34 Supabase Edge Functions** (Deno runtime) organisées en 8 catégories. Toutes les fonctions utilisent les headers CORS suivants :

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**URL de base :** `https://qzorivymybqavkxexrbf.supabase.co/functions/v1/`

---

## Authentification des Edge Functions

| Méthode | Header | Usage |
|---|---|---|
| **Bearer Token** | `Authorization: Bearer <JWT>` | Appels depuis le frontend (session Supabase) |
| **Scheduler Secret** | `X-Scheduler-Secret: <secret>` | Appels cron / inter-functions |
| **Service Role** | Interne aux functions | Accès admin DB (jamais exposé) |

---

## 1. Génération IA

### `POST /generate-hooks`

Génère 15 hooks IA par combinaison auteur × audience.

**Auth :** Bearer Token

**Request Body :**
```json
{
  "source_text": "Mon idée de post sur...",
  "author_id": "uuid",
  "topic_id": "uuid (required)",
  "template_id": "uuid",
  "platform_id": "uuid",
  "audience_id": "uuid",
  "knowledge_ids": ["uuid"],
  "production_post_id": "uuid"
}
```

**Response :** `200 OK`
```json
{
  "hooks": [
    {
      "hook_text": "J'ai perdu 500K€ en 6 mois.",
      "hook_type": "story_opener",
      "score": 85,
      "audience_id": "uuid"
    }
  ],
  "production_post_id": "uuid",
  "ai_usage": { "model": "claude-opus-4-6", "tokens": 3200, "cost_usd": 0.12 }
}
```

**Interactions DB :**
- READ: `hook_types`, `topics`, `profiles`, `platforms`, `audiences`, `post_templates`, `knowledge`, `topic_knowledge`
- WRITE: `generated_hooks`, `production_posts` (status → `hook_gen`), `ai_usage_logs`

---

### `POST /generate-hooks-batch`

Génération de hooks en lot pour plusieurs posts.

**Auth :** Bearer Token

---

### `POST /generate-body`

Génère le corps du post à partir du hook sélectionné.

**Auth :** Bearer Token

**Request Body :**
```json
{
  "production_post_id": "uuid",
  "author_id": "uuid",
  "preset_id": "uuid",
  "platform_id": "uuid",
  "audience_id": "uuid",
  "template_id": "uuid",
  "knowledge_ids": ["uuid"]
}
```

**Response :** `200 OK`
```json
{
  "body": {
    "intro": "...",
    "body": "...",
    "conclusion": "..."
  },
  "final_content": "hook + body assemblé",
  "ai_usage": { "model": "claude-opus-4-6", "tokens": 5800, "cost_usd": 0.21 }
}
```

**Interactions DB :**
- READ: `production_posts`, `profiles` (+ inspiration profiles via `viral_posts_bank`), `topics`, `audiences`, `platforms`, `post_templates`, `presets`, `knowledge`
- WRITE: `production_posts` (ai_body_draft, status → `body_gen`), `ai_usage_logs`

---

### `POST /extract-hooks`

Extrait les hooks de posts existants.

**Auth :** Bearer Token

---

## 2. Publication LinkedIn

### `POST /publish-post`

Publie un post sur un ou plusieurs comptes LinkedIn via Unipile.

**Auth :** Bearer Token ou Scheduler Secret

**Request Body :**
```json
{
  "content": "Texte du post...",
  "account_ids": ["uuid"],
  "scheduled_post_id": "uuid",
  "attachments": [{ "url": "https://...", "type": "image" }],
  "mentions": [{ "name": "John", "profile_id": "urn:..." }],
  "external_link": "https://...",
  "as_organization": "urn:li:organization:xxx"
}
```

**Response :** `200 OK`
```json
{
  "success": true,
  "results": [
    {
      "account_id": "uuid",
      "profile_name": "Thomas Dubois",
      "success": true,
      "post_id": "urn:li:activity:xxx",
      "post_url": "https://www.linkedin.com/feed/update/..."
    }
  ]
}
```

**Interactions DB :**
- READ: `unipile_accounts`, `profiles`
- WRITE: `published_posts`, `scheduled_post_accounts` (status), `scheduled_posts` (status)
- EXTERNAL: `Unipile API POST /api/v1/posts`

---

### `POST /publish-scheduled`

Publie les posts planifiés dont la date est passée. Appelé par **pg_cron toutes les 5 minutes**.

**Auth :** Scheduler Secret uniquement

**Flux :**
1. Récupère les `scheduled_posts` avec `status=pending` et `scheduled_at <= now`
2. Récupère les `production_posts` avec `status=scheduled` et `publication_date <= now`
3. Publie via Unipile (formData avec médias)
4. Gère les **company auto-post rules** (publication sur pages entreprise avec délai optionnel)
5. Traite les `company_published_posts` en `pending` (publications différées)

**Interactions DB :**
- READ: `scheduled_posts`, `production_posts`, `unipile_accounts`, `company_auto_post_rules`, `company_pages`, `company_published_posts`
- WRITE: `published_posts`, `production_posts` (status → `published`), `company_published_posts`
- EXTERNAL: `Unipile API POST /api/v1/posts`

---

### `POST /publish-company-post`

Publie un post sur une page entreprise LinkedIn.

**Auth :** Bearer Token ou Scheduler Secret

---

## 3. Synchronisation & Scraping

### `POST /sync-profiles`

Scrape les posts LinkedIn de profils via Edges.run API.

**Auth :** Bearer Token ou Scheduler Secret

**Request Body :**
```json
{
  "max_profiles": 5,
  "max_pages": 3,
  "profile_ids": ["uuid"],
  "generate_embeddings": true,
  "classify_hooks": true,
  "analyze_style_after": false
}
```

**Response :** `200 OK`
```json
{
  "success": true,
  "job_id": "uuid",
  "duration_seconds": 42,
  "profiles_processed": 3,
  "posts_scraped": 180,
  "posts_new": 45,
  "results": [
    { "profile_id": "uuid", "linkedin_id": "justinwelsh", "posts_scraped": 60, "posts_new": 15 }
  ]
}
```

**Flux :**
1. Récupère les profils à synchroniser via `get_profiles_to_sync()` RPC
2. Pour chaque profil : fetch avatar (Edges.run), scrape posts (pagination)
3. Insère les nouveaux posts dans `viral_posts_bank` avec `needs_*` flags
4. Met à jour `profile_sync_status` et `sync_jobs`
5. Les workers V2 prennent le relais (embeddings, classification...)

**Interactions DB :**
- READ: `profiles`, `viral_posts_bank` (check doublons)
- WRITE: `viral_posts_bank` (insert), `profiles` (sync_status, avatar_url), `profile_sync_status`, `sync_jobs`
- EXTERNAL: `Edges.run API` (scraping LinkedIn)

---

### `POST /continue-processing`

Continue le traitement des posts après scraping (embeddings, classification, style).

**Auth :** Scheduler Secret

---

### `POST /process-posts`

Traitement batch de posts (embeddings + classification).

**Auth :** Bearer Token

---

## 4. Gestion Unipile (Comptes LinkedIn)

### `POST /unipile-auth`

Initialise la connexion d'un compte LinkedIn via Unipile OAuth.

### `POST /unipile-callback`

Callback OAuth après connexion Unipile.

### `POST /unipile-check-connection`

Vérifie le statut de connexion d'un compte Unipile.

### `POST /unipile-disconnect`

Déconnecte un compte LinkedIn.

### `POST /sync-unipile-accounts`

Synchronise les comptes Unipile avec les profils.

---

## 5. Engagement (DÉSACTIVÉ)

### `POST /auto-engage-post`

**⚠️ DÉSACTIVÉ** — Risque de shadowban LinkedIn.

Réactions + commentaires automatiques sur les posts de l'équipe.

**Fonctionnalités (quand activé) :**
- Sélection d'engagers éligibles via `get_eligible_engagers()` RPC
- Délais humains entre engagements (30s-2min entre chaque)
- Réactions variées (like, celebrate, support, love, insightful, funny)
- Commentaires IA personnalisés via `comment_patterns` avec rotation
- Limites quotidiennes via `can_profile_engage()` RPC
- Logging complet dans `engagement_logs`

---

## 6. Workers V2 (Event-Driven)

### `POST /orchestrator-v2`

Dashboard de santé et gestion des workers V2.

**Actions (via query param `?action=`) :**

| Action | Description |
|---|---|
| `status` | Statut de tous les workers + feature flags |
| `enable?worker=xxx` | Active un worker |
| `disable?worker=xxx` | Désactive un worker |
| `enable-all` | Active tous les workers |
| `disable-all` | Désactive tous les workers |
| `logs?worker=xxx` | Logs récents d'un worker |
| `pending` | Travail en attente pour chaque worker |

### Workers disponibles :

| Worker | Flag | Rôle |
|---|---|---|
| `worker-extract-hooks-v2` | `worker_extract_hooks_v2` | Extraction de hooks |
| `worker-generate-embeddings-v2` | `worker_generate_embeddings_v2` | Génération d'embeddings |
| `worker-classify-hooks-v2` | `worker_classify_hooks_v2` | Classification hooks |
| `worker-classify-topics-v2` | `worker_classify_topics_v2` | Classification topics |
| `worker-classify-audiences-v2` | `worker_classify_audiences_v2` | Classification audiences |
| `worker-complete-profiles-v2` | `worker_complete_profiles_v2` | Complétion profils (style) |

---

## 7. Analyse IA

### `POST /analyze-style`

Analyse le style d'écriture d'un auteur.

### `POST /detect-topic`

Détecte le topic d'un texte.

### `POST /ai-assistant`

Chat IA conversationnel avec contexte projet.

---

## 8. Utilitaires

| Endpoint | Description |
|---|---|
| `POST /update-avatars` | Met à jour les avatars des profils |
| `POST /send-invitation` | Envoie une invitation d'équipe |
| `POST /send-announcement` | Envoie une annonce |
| `POST /transcribe-audio` | Transcription audio |
| `POST /generate-embeddings` | Génère des embeddings à la demande |

---

## Interconnexions entre Endpoints

```
Frontend (React)
    │
    ├── generate-hooks ──┐
    ├── generate-body ───┤
    ├── publish-post ────┤──→ Unipile API → LinkedIn
    │                    │
    └── sync-profiles ───┤──→ Edges.run API → LinkedIn
                         │
    pg_cron ─────────────┤
    │                    │
    ├── publish-scheduled ──→ publish-post (internal call)
    │                        → company auto-post
    │
    └── trigger_profile_sync ──→ sync-profiles
        trigger_continue_processing ──→ continue-processing
```
