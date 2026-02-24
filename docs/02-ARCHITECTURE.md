# Architecture & Infrastructure

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19)                       │
│  Vite + TailwindCSS v4 + Radix UI + Framer Motion               │
│  Auth: Supabase Auth (session-based)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (anon_key)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE PLATFORM                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Auth         │  │  Edge Functions   │  │  PostgreSQL 17   │  │
│  │  (OAuth)      │  │  (34 functions)   │  │  + pgvector      │  │
│  │              │  │  Deno runtime     │  │  + pg_cron        │  │
│  └──────────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│                             │                      │             │
│                    ┌────────┴──────────────────────┤             │
│                    │    service_role_key            │             │
│                    ▼                               ▼             │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │  AI Service Layer    │  │  Database Objects             │    │
│  │  Claude → GPT-5.2    │  │  43 tables · 24 triggers      │    │
│  │  GPT-5-mini (classif)│  │  40+ functions · 3 cron jobs  │    │
│  │  OpenAI Embeddings   │  │  RLS on all user tables       │    │
│  └──────────┬───────────┘  └──────────────────────────────┘    │
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │
    ┌─────────┴──────────────────────────────┐
    │          EXTERNAL APIs                  │
    │                                         │
    │  ┌───────────┐  ┌───────────────────┐  │
    │  │ Anthropic  │  │ OpenAI            │  │
    │  │ Claude 4.6 │  │ GPT-5.2 / 5-mini │  │
    │  └───────────┘  │ Embeddings        │  │
    │                  └───────────────────┘  │
    │  ┌───────────┐  ┌───────────────────┐  │
    │  │ Unipile   │  │ Edges.run         │  │
    │  │ Publish   │  │ LinkedIn Scraping │  │
    │  │ React     │  │ Profile Data      │  │
    │  │ Comment   │  └───────────────────┘  │
    │  └───────────┘                         │
    └────────────────────────────────────────┘
```

---

## Couches Applicatives

### 1. Frontend (React SPA)

| Aspect | Détail |
|---|---|
| **Framework** | React 19 + TypeScript strict |
| **Bundler** | Vite (rolldown-vite 7.2.5) |
| **Styling** | TailwindCSS v4 + class-variance-authority |
| **Routing** | react-router-dom v7 |
| **State** | React hooks (useState/useEffect) — pas de state manager global |
| **Data Layer** | Custom hooks (`useProfiles`, `usePosts`, `useTemplates`...) via Supabase client |
| **Auth** | Supabase Auth avec `ProtectedRoute` + `OnboardingGuard` |

**Pattern de data fetching :** Chaque hook React encapsule les appels Supabase (select, insert, update) et expose `data`, `loading`, `error`. Pas de cache global (pas de React Query / TanStack Query).

### 2. Backend — Supabase Edge Functions

34 Edge Functions Deno organisées en catégories :

| Catégorie | Functions | Rôle |
|---|---|---|
| **AI Generation** | `generate-hooks`, `generate-hooks-batch`, `generate-body`, `extract-hooks` | Génération de contenu IA |
| **AI Analysis** | `analyze-style`, `detect-topic`, `ai-assistant` | Analyse IA |
| **Publishing** | `publish-post`, `publish-scheduled`, `publish-company-post` | Publication LinkedIn |
| **Sync & Scraping** | `sync-profiles`, `sync-scrape`, `process-posts`, `continue-processing` | Ingestion de données |
| **Unipile** | `unipile-auth`, `unipile-callback`, `unipile-check-connection`, `unipile-disconnect`, `sync-unipile-accounts` | Gestion comptes LinkedIn |
| **Engagement** | `auto-engage-post` | Auto-engagement (désactivé) |
| **Workers V2** | `worker-extract-hooks-v2`, `worker-generate-embeddings-v2`, `worker-classify-hooks-v2`, `worker-classify-topics-v2`, `worker-classify-audiences-v2`, `worker-complete-profiles-v2` | Workers event-driven |
| **Orchestration** | `orchestrator-v2` | Dashboard santé workers |
| **Utils** | `update-avatars`, `send-invitation`, `send-announcement`, `transcribe-audio`, `generate-embeddings` | Divers |

### 3. Database — PostgreSQL 17

- **43 tables** avec RLS activé sur toutes les tables utilisateur
- **pgvector** pour la recherche sémantique (embeddings 1536 dimensions)
- **pg_cron** pour les tâches planifiées
- **83 migrations** versionnées

### 4. AI Service Layer

Architecture de fallback centralisée dans `_shared/ai-service.ts` :

```
Requête AI
    │
    ├─ Try Claude Opus 4.6 (primary)
    │   ├─ Succès → return result
    │   └─ Échec → log error
    │       │
    │       ├─ Try GPT-5.2 (fallback)
    │       │   ├─ Succès → log primary failure + return
    │       │   └─ Échec → throw ALL_MODELS_FAILED
    │       │
    │       └─ (si enableFallback=false) → throw error
    │
    └─ Classification (gpt-5-mini direct, pas de fallback)
```

**3 modes d'appel :**
- `aiService.chat()` — Retourne du texte brut
- `aiService.json<T>()` — Retourne du JSON parsé (avec extraction markdown)
- `aiService.classify()` — Classification rapide via GPT-5-mini (20x moins cher)

**Cost tracking :** Chaque appel IA est logué dans `ai_usage_logs` avec tokens, coûts USD, latence, succès/échec.

---

## Flux de Données Principal

```
LinkedIn (Edges.run)          User Input (Frontend)
        │                              │
        ▼                              ▼
  sync-profiles               studio/create (React)
        │                              │
        ▼                              │
  viral_posts_bank                     │
  (needs_* flags = true)               │
        │                              ▼
        ├── Workers V2 ──────► production_posts
        │   (embeddings,               │
        │    hooks,                     ▼
        │    topics,              generate-hooks
        │    audiences)                 │
        │                              ▼
        ▼                        generate-body
  profiles.style_analysis              │
  profiles.writing_style_prompt        ▼
                               publish-post / publish-scheduled
                                       │
                                       ▼
                                 Unipile API → LinkedIn
                                       │
                                       ▼
                               published_posts (historique)
                                       │
                                       ▼
                               company_published_posts (auto-post)
```

---

## Sécurité

| Mesure | Implémentation |
|---|---|
| **RLS** | Activé sur toutes les tables utilisateur |
| **Auth** | Supabase Auth (JWT) côté frontend |
| **Service Role** | Uniquement dans Edge Functions (jamais exposé) |
| **Scheduler Secret** | Header `X-Scheduler-Secret` pour appels cron |
| **API Keys** | Variables d'environnement Supabase (jamais hardcodées côté client) |
| **CORS** | `Access-Control-Allow-Origin: *` (edge functions internes) |

---

## Patterns Architecturaux

1. **Event-Driven Processing** — Les `needs_*` flags sur `viral_posts_bank` déclenchent les workers V2
2. **Fallback Chain** — Claude → GPT-5.2 avec logging de chaque fallback
3. **Feature Flags** — Tables `feature_flags_v2` et `worker_feature_flags_v2` pour activation/désactivation
4. **Cost Tracking** — `ai_usage_logs` + `ai_model_pricing` pour suivi des coûts IA
5. **Batch Processing** — `processBatch()` avec rate limiting intégré
6. **Execution Logging** — `task_execution_logs_v2` pour traçabilité des workers
