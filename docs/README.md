# 📚 Documentation — Build Your Content

> LinkedIn Content Factory — Documentation technique complète

---

## Sommaire

| # | Document | Description |
|---|---|---|
| 01 | [**Projet**](./01-PROJECT.md) | Vue d'ensemble, stack technique, structure, pages, environnement |
| 02 | [**Architecture & Infrastructure**](./02-ARCHITECTURE.md) | Diagramme d'architecture, couches applicatives, flux de données, sécurité |
| 03 | [**Schema Supabase & Interactions**](./03-SUPABASE-SCHEMA.md) | 43 tables détaillées par domaine, interactions données, recherche sémantique |
| 04 | [**ERD (Entity Relationship Diagram)**](./04-ERD.md) | Diagramme Mermaid complet, cardinalités, index |
| 05 | [**Flow IA**](./05-AI-FLOW.md) | AI Service (fallback), génération hooks/body, classification, RAG, monitoring |
| 06 | [**API (Edge Functions)**](./06-API.md) | 34 endpoints, auth, request/response, interactions DB, interconnexions |
| 07 | [**Workers, Triggers & Crons**](./07-WORKERS-TRIGGERS-CRONS.md) | 6 workers V2, 24 triggers PostgreSQL, 3 cron jobs pg_cron |
| 08 | [**Scripts Python**](./08-PYTHON-SCRIPTS.md) | 14 scripts offline (classification, embeddings, style, seeding) |

---

## Chiffres Clés

| Métrique | Valeur |
|---|---|
| **Tables** | 43 |
| **Edge Functions** | 34 |
| **Workers V2** | 6 |
| **Triggers SQL** | 24 |
| **Cron Jobs** | 3 |
| **Migrations SQL** | 83 |
| **Fonctions SQL** | 40+ (custom, hors pgvector) |
| **Scripts Python** | 14 |
| **Pages Frontend** | 28 |
| **Composants React** | 51 |
| **Hooks React** | 17 |
| **Posts viraux indexés** | 3 598 |
| **Logs IA** | 87 114 |
| **Logs Workers** | 4 624 |

---

## Stack Résumé

```
Frontend:  React 19 · TypeScript · Vite · TailwindCSS v4 · Radix UI
Backend:   Supabase Edge Functions (Deno) · 34 fonctions
Database:  PostgreSQL 17 · pgvector · pg_cron · 43 tables
AI:        Claude Opus 4.6 → GPT-5.2 (fallback) · GPT-5-mini (classif)
Scraping:  Edges.run API
Publishing: Unipile API → LinkedIn
Scripts:   Python 3 (offline tasks)
```
