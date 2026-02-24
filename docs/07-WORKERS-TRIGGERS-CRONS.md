# Workers, Triggers, Cron Jobs & Interactions Database

## Vue d'ensemble

Le système utilise 3 mécanismes d'automatisation :

1. **Workers V2** — Edge Functions event-driven pour le traitement IA
2. **Triggers PostgreSQL** — 24 triggers pour maintenir la cohérence des données
3. **Cron Jobs (pg_cron)** — 3 tâches planifiées pour la publication et la synchronisation

---

## 1. Workers V2 (Edge Functions Event-Driven)

### Architecture

```
viral_posts_bank (INSERT / UPDATE)
    │ Trigger: needs_* flags = true
    │
    ▼
┌─────────────────────────────────────────┐
│         Worker Utils V2                  │
│  initWorker() → processBatch()          │
│  → finalizeWorker() / handleWorkerError()│
│                                          │
│  Auth: X-Scheduler-Secret               │
│  Feature flags: worker_feature_flags_v2  │
│  Logging: task_execution_logs_v2         │
└─────────────────────────────────────────┘
```

### Liste des Workers

| Worker | Flag DB | Input | Output | AI Model |
|---|---|---|---|---|
| `worker-extract-hooks-v2` | `worker_extract_hooks_v2` | Posts sans hook | `viral_posts_bank.hook` | — (extraction texte) |
| `worker-generate-embeddings-v2` | `worker_generate_embeddings_v2` | Posts `needs_embedding=true` | `viral_posts_bank.embedding` | `text-embedding-3-small` |
| `worker-classify-hooks-v2` | `worker_classify_hooks_v2` | Posts `needs_hook_classification=true` | `viral_posts_bank.hook_type_id` | `gpt-5-mini` |
| `worker-classify-topics-v2` | `worker_classify_topics_v2` | Posts `needs_topic_classification=true` | `viral_posts_bank.topic_id` | `gpt-5-mini` |
| `worker-classify-audiences-v2` | `worker_classify_audiences_v2` | Posts `needs_audience_classification=true` | `viral_posts_bank.audience_id` | `gpt-5-mini` |
| `worker-complete-profiles-v2` | `worker_complete_profiles_v2` | Profils sans style | `profiles.writing_style_prompt` | Claude / GPT-5.2 |

### Cycle de vie d'un Worker

```typescript
// 1. Initialisation
const { context, error } = await initWorker(req, 'worker-name')
//    → Vérifie CORS (OPTIONS)
//    → Vérifie X-Scheduler-Secret
//    → Vérifie feature flag (is_worker_enabled RPC)
//    → Crée un log dans task_execution_logs_v2 (status='running')
//    → Retourne le client Supabase (service_role)

// 2. Traitement batch avec rate limiting
const results = await processBatch(items, async (item) => {
  // Traitement unitaire
}, { batchSize: 10, delayMs: 200 })

// 3. Finalisation
return await finalizeWorker(context, {
  items_processed: 50,
  items_failed: 2,
  results: { embeddings_created: 48 }
})
//    → Met à jour task_execution_logs_v2 (status='completed', duration_ms, items_*)
//    → Retourne Response JSON avec CORS
```

### Feature Flags

Table `worker_feature_flags_v2` :

| Worker | `is_enabled` | Description |
|---|---|---|
| `worker_extract_hooks_v2` | ✅ | Extraction hooks |
| `worker_generate_embeddings_v2` | ✅ | Embeddings |
| `worker_classify_hooks_v2` | ✅ | Classification hooks |
| `worker_classify_topics_v2` | ✅ | Classification topics |
| `worker_classify_audiences_v2` | ✅ | Classification audiences |
| `worker_complete_profiles_v2` | ✅ | Complétion profils |

Gérés via `orchestrator-v2` :
- `GET ?action=status` — Voir l'état
- `GET ?action=enable&worker=xxx` — Activer
- `GET ?action=disable&worker=xxx` — Désactiver

---

## 2. Triggers PostgreSQL (24 triggers)

### Triggers par Table

#### `viral_posts_bank` (3 triggers)

| Trigger | Événement | Fonction | Description |
|---|---|---|---|
| `on_viral_post_insert` | INSERT | `trigger_process_new_post()` | Met les flags `needs_*` à `true` pour déclencher les workers |
| `on_viral_post_hook_extracted` | UPDATE | `trigger_process_hook_extracted()` | Quand un hook est extrait, active la classification |
| `update_viral_post_timestamp` | UPDATE | `update_viral_post_timestamp()` | Met à jour `updated_at` |

#### `profiles` (2 triggers)

| Trigger | Événement | Fonction | Description |
|---|---|---|---|
| `on_profile_created_mark_sync` | INSERT | `mark_profile_for_sync()` | Nouveau profil → `sync_status = 'pending'` |
| `on_profile_linkedin_updated_mark_sync` | UPDATE | `mark_profile_for_sync_on_update()` | Si `linkedin_id` change → re-sync |

#### `production_posts` (1 trigger)

| Trigger | Événement | Fonction | Description |
|---|---|---|---|
| `trg_production_post_update_batch` | UPDATE | `trigger_update_batch_progress()` | Met à jour la progression du batch parent |

#### `chat_messages` (2 triggers)

| Trigger | Événement | Fonction | Description |
|---|---|---|---|
| `trigger_auto_title_chat_session` | INSERT | `auto_title_chat_session()` | Génère un titre automatique au 1er message |
| `trigger_update_chat_session_timestamp` | INSERT | `update_chat_session_timestamp()` | Met à jour `updated_at` de la session |

#### `unipile_accounts` (2 triggers)

| Trigger | Événement | Fonction | Description |
|---|---|---|---|
| `on_unipile_connected_mark_invitation` | INSERT | `mark_invitation_accepted()` | Compte connecté → invitation acceptée |
| `on_unipile_connected_mark_invitation` | UPDATE | `mark_invitation_accepted()` | Idem sur update |
| `update_unipile_accounts_updated_at` | UPDATE | `update_updated_at_column()` | Timestamp |

#### `ai_errors` (1 trigger)

| Trigger | Événement | Fonction | Description |
|---|---|---|---|
| `trigger_set_error_ref` | INSERT | `set_error_ref()` | Génère un `user_error_ref` lisible (ex: `ERR-ABC123`) |

#### Triggers `updated_at` (13 triggers)

Tables avec auto-update du timestamp `updated_at` :

| Table | Trigger |
|---|---|
| `audiences` | `set_audiences_updated_at` |
| `comment_patterns` | `update_comment_patterns_updated_at` |
| `company_auto_post_rules` | `update_auto_post_rules_updated_at` |
| `company_pages` | `update_company_pages_updated_at` |
| `engagement_settings` | `update_engagement_settings_updated_at` |
| `knowledge` | `set_knowledge_updated_at` |
| `post_batches` | `set_post_batches_updated_at` |
| `profile_sync_status` | `update_profile_sync_status_timestamp` |
| `ressource_types` | `set_ressource_types_updated_at` |
| `ressources` | `set_ressources_updated_at` |
| `scheduled_posts` | `update_scheduled_posts_updated_at` |
| `user_onboarding` | `user_onboarding_updated_at` |

---

## 3. Cron Jobs (pg_cron)

### Jobs Actifs

| Job ID | Schedule | Commande SQL | Description |
|---|---|---|---|
| **1** | `0 2 * * 0` (dimanche 2h) | `SELECT trigger_profile_sync()` | Sync hebdomadaire des profils LinkedIn |
| **5** | `*/5 * * * *` (toutes les 5 min) | `SELECT call_publish_scheduled()` | Publication des posts planifiés |
| **14** | `0 3 1 * *` (1er du mois 3h) | `SELECT trigger_monthly_style_refresh()` | Rafraîchissement mensuel des styles |

### Détail des Fonctions Cron

#### `call_publish_scheduled()` — Toutes les 5 minutes

```
Appelle l'Edge Function publish-scheduled avec X-Scheduler-Secret
    │
    ├── Récupère scheduled_posts WHERE status='pending' AND scheduled_at <= now
    ├── Récupère production_posts WHERE status='scheduled' AND publication_date <= now
    │
    ├── Pour chaque post:
    │   ├── Publie via Unipile API
    │   ├── Gère les médias (Cloudflare Images → FormData)
    │   ├── Met à jour le statut → 'published'
    │   └── Insère dans published_posts
    │
    ├── Auto-post Company Pages:
    │   ├── Vérifie company_auto_post_rules
    │   ├── Si delay > 0 → insère dans company_published_posts (status='pending')
    │   └── Si delay = 0 → publie immédiatement
    │
    └── Traite les company_published_posts en 'pending' dont scheduled_for <= now
```

#### `trigger_profile_sync()` — Dimanche 2h

```
Identifie les profils nécessitant une re-synchronisation
    │
    ├── Profils avec last_sync_at > 7 jours
    ├── Profils avec sync_status = 'pending'
    │
    └── Appelle sync-profiles Edge Function
        → Scraping Edges.run → viral_posts_bank
        → Workers V2 prennent le relais
```

#### `trigger_monthly_style_refresh()` — 1er du mois 3h

```
Rafraîchit l'analyse de style de tous les profils internes
    │
    ├── Sélectionne les profils type='internal'
    │   avec > 20 posts dans viral_posts_bank
    │
    └── Lance l'analyse de style (AI)
        → profiles.writing_style_prompt
        → profiles.style_analysis
```

---

## 4. Fonctions SQL Utilitaires

### Fonctions de Queue (Workers)

| Fonction | Usage |
|---|---|
| `get_posts_needing_embedding(max_posts)` | File d'attente pour worker embeddings (`FOR UPDATE SKIP LOCKED`) |
| `get_posts_needing_classification(max_posts)` | File pour classification hooks |
| `get_posts_needing_topic_classification(max_posts)` | File pour classification topics |
| `get_posts_needing_audience_classification(max_posts)` | File pour classification audiences |
| `release_embedding_lock(p_post_id)` | Libère le verrou d'embedding |
| `release_stale_embedding_locks()` | Nettoie les verrous périmés |

### Fonctions de Recherche (RAG)

| Fonction | Usage |
|---|---|
| `match_viral_posts(query_embedding, threshold, count)` | Recherche sémantique globale |
| `match_viral_posts_by_author(query_embedding, author_id, ...)` | Recherche par auteur |
| `match_viral_posts_by_topic(query_embedding, topic_id, ...)` | Recherche par topic |
| `match_viral_posts_filtered(query_embedding, filters, ...)` | Recherche multi-filtres |
| `match_topics(query_embedding, ...)` | Recherche de topics similaires |
| `match_audiences(query_embedding, ...)` | Recherche d'audiences similaires |
| `match_hook_types(query_embedding, ...)` | Recherche de hooks similaires |

### Fonctions d'Engagement

| Fonction | Usage |
|---|---|
| `get_eligible_engagers(post_author_id, external_post_id)` | Engagers éligibles (excl. auteur, déjà engagé) |
| `can_profile_engage(profile_id, action_type)` | Vérifie les limites quotidiennes |
| `increment_engagement_counter(profile_id, action_type)` | Incrémente le compteur |
| `select_comment_pattern(engager_id, exclude_count)` | Sélection de pattern avec rotation |

### Fonctions de Maintenance

| Fonction | Usage |
|---|---|
| `cleanup_old_worker_logs_v2()` | Nettoie les anciens logs workers |
| `cleanup_stuck_scraping_states()` | Déboque les profils en état `scraping` |
| `update_profile_stats(profile_id)` | Recalcule les stats d'un profil |
| `get_processing_status()` | État global du traitement en cours |
| `is_worker_enabled(worker_name)` | Vérifie le feature flag d'un worker |
| `log_worker_start(worker_name)` | Log début d'exécution worker |
| `log_worker_end(log_id, status, items_processed)` | Log fin d'exécution worker |

### Fonctions Batch

| Fonction | Usage |
|---|---|
| `create_post_batch(name, author_configs)` | Crée un lot de posts |
| `get_batch_with_posts(batch_id)` | Récupère un lot avec ses posts |
| `update_batch_progress(batch_id)` | Met à jour la progression |

### Fonctions Utilitaires

| Fonction | Usage |
|---|---|
| `generate_error_ref()` | Génère une référence d'erreur lisible |
| `generate_invitation_token()` | Génère un token d'invitation |
| `mark_invitation_accepted()` | Marque une invitation acceptée (trigger) |
| `get_supabase_url()` | Retourne l'URL Supabase |
| `get_profiles_to_sync(max_profiles)` | File de profils à synchroniser |
| `mark_profile_for_sync()` | Marque un profil pour sync (trigger) |
| `get_hooks_with_classification(post_id)` | Hooks enrichis avec classification |
