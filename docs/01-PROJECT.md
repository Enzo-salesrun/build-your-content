# Build Your Content — Project Overview

> **LinkedIn Content Factory** — Plateforme SaaS interne de création, planification et publication de contenu LinkedIn assistée par IA.

## Résumé

Build Your Content (BYC) est une plateforme full-stack qui automatise la chaîne de production de contenu LinkedIn :

1. **Scraping** de posts viraux LinkedIn (influenceurs & internes)
2. **Analyse IA** des styles d'écriture, topics, audiences, hooks
3. **Génération IA** de hooks et corps de posts personnalisés
4. **Planification & publication** multi-comptes via Unipile API
5. **Auto-engagement** (réactions + commentaires IA) — *désactivé (risque shadowban)*
6. **Company pages** — publication automatique vers pages entreprise

---

## Stack Technique

| Couche | Technologie |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite + TailwindCSS v4 |
| **UI Components** | Radix UI + Lucide React + Framer Motion |
| **Backend** | Supabase Edge Functions (Deno) |
| **Database** | Supabase PostgreSQL 17 + pgvector |
| **Auth** | Supabase Auth (OAuth) |
| **AI Models** | Claude Opus 4.6 (primary) → GPT-5.2 (fallback) → GPT-5-mini (classification) |
| **Embeddings** | OpenAI text-embedding-3-small (1536 dimensions) |
| **LinkedIn API** | Unipile (publish, react, comment) |
| **Scraping** | Edges.run API (LinkedIn post extraction) |
| **Cron Jobs** | pg_cron (PostgreSQL) |
| **Scripts offline** | Python 3 (classification, embeddings, seeding) |

---

## Structure du Projet

```
build-your-content/
├── src/                          # Frontend React
│   ├── App.tsx                   # Routes & auth guards
│   ├── components/               # 51 composants UI
│   ├── hooks/                    # 17 hooks React (data fetching)
│   ├── lib/                      # Config, Supabase client, utils
│   ├── pages/                    # 28 pages
│   │   ├── studio/               # Création de contenu
│   │   ├── creators/             # Gestion des créateurs
│   │   └── settings/             # Configuration
│   └── types/                    # TypeScript types
├── supabase/
│   ├── functions/                # 34 Edge Functions (Deno)
│   │   ├── _shared/              # AI service, prompts, worker utils
│   │   ├── generate-hooks/       # Génération de hooks IA
│   │   ├── generate-body/        # Génération du corps IA
│   │   ├── sync-profiles/        # Scraping LinkedIn
│   │   ├── publish-post/         # Publication Unipile
│   │   ├── orchestrator-v2/      # Dashboard workers V2
│   │   └── worker-*-v2/          # 6 workers event-driven
│   └── migrations/               # 83 migrations SQL
├── scripts/                      # 14 scripts Python
│   ├── classify_posts.py         # Classification IA des posts
│   ├── analyze_writing_styles.py # Analyse de style d'écriture
│   ├── generate_embeddings.py    # Génération d'embeddings
│   └── seeder.py                 # Seed initial de la DB
└── docs/                         # Documentation
```

---

## Pages Principales

| Route | Page | Description |
|---|---|---|
| `/` | Home | Dashboard principal avec métriques |
| `/assistant` | Assistant IA | Chat IA conversationnel |
| `/studio/create` | CreatePost | Création de post (hooks → body → publish) |
| `/content` | ContentDashboard | Vue Kanban de tous les posts |
| `/creators` | Creators | Liste des créateurs/influenceurs |
| `/creators/:id` | CreatorDetails | Détails d'un créateur (posts, style) |
| `/creators/post-bank` | PostBank | Banque de posts viraux |
| `/team` | Team | Gestion d'équipe & invitations |
| `/team/engagement` | EngagementLogs | Historique d'auto-engagement |
| `/ressources` | Ressources | Bibliothèque de ressources |
| `/studio/topics` | Topics | Gestion des thématiques |
| `/studio/audiences` | Audiences | Gestion des audiences cibles |
| `/studio/templates` | Templates | Templates de posts |
| `/studio/knowledge` | Knowledge | Base de connaissances |
| `/onboarding` | Onboarding | Onboarding nouvel utilisateur |

---

## Supabase Project

| Clé | Valeur |
|---|---|
| **Project ID** | `qzorivymybqavkxexrbf` |
| **Name** | Content Factory |
| **Region** | eu-west-1 |
| **DB Version** | PostgreSQL 17.6 |
| **Status** | ACTIVE_HEALTHY |

---

## Environnement & Secrets

| Variable | Usage |
|---|---|
| `VITE_SUPABASE_URL` | URL Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin (edge functions only) |
| `ANTHROPIC_API_KEY` | Claude API (primary AI) |
| `OPENAI_API_KEY` | OpenAI API (fallback + embeddings) |
| `UNIPILE_API_URL` | URL API Unipile |
| `UNIPILE_API_KEY` | Clé API Unipile |
| `EDGES_API_KEY` | Clé API Edges.run (scraping) |
| `SCHEDULER_SECRET` | Secret pour appels cron sécurisés |
