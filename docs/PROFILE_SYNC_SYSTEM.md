# Profile Sync System

## Overview

Système de synchronisation récurrente (hebdomadaire) pour :
1. **Détection de nouveaux profils** - Check si des nouveaux profils `external_influencer` ont été ajoutés
2. **Scraping des posts** - Récupération de la page 1 des derniers posts de chaque profil via RapidAPI
3. **Mise à jour cascade** - Génération des embeddings, classification des hooks, analyse de style

## Architecture

```
┌─────────────────────┐
│   Cron Trigger      │  ← pg_cron / Supabase Schedule / External
│   (Hebdomadaire)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  sync-profiles      │  ← Edge Function principale
│  Edge Function      │
└──────────┬──────────┘
           │
     ┌─────┴─────┬──────────────┬──────────────┐
     ▼           ▼              ▼              ▼
┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌─────────────┐
│ RapidAPI│ │ OpenAI  │ │ Hook         │ │ Profile     │
│ Scrape  │ │ Embed   │ │ Classify     │ │ Stats       │
└─────────┘ └─────────┘ └──────────────┘ └─────────────┘
```

## Configuration

### 1. Secrets Supabase

```bash
supabase secrets set RAPIDAPI_KEY=your-rapidapi-key
supabase secrets set RAPIDAPI_HOST=fresh-linkedin-profile-data.p.rapidapi.com
supabase secrets set OPENAI_API_KEY=your-openai-key
```

### 2. Migration

```bash
supabase db push
# Applique: 007_profile_sync_system.sql
```

### 3. Déploiement Edge Function

```bash
supabase functions deploy sync-profiles
```

## Tables créées

### `sync_jobs`
Historique des exécutions de synchronisation.

| Colonne | Type | Description |
|---------|------|-------------|
| job_type | ENUM | `profile_scrape`, `embedding_update`, `hook_classification`, `full_cascade` |
| status | ENUM | `pending`, `running`, `completed`, `failed`, `partial` |
| profiles_processed | INTEGER | Nombre de profils traités |
| posts_scraped | INTEGER | Posts récupérés |
| posts_new | INTEGER | Nouveaux posts insérés |
| embeddings_updated | INTEGER | Embeddings générés |
| hooks_classified | INTEGER | Hooks classifiés |

### `profile_sync_status`
État de synchronisation par profil.

| Colonne | Type | Description |
|---------|------|-------------|
| profile_id | UUID | Référence au profil |
| last_scraped_at | TIMESTAMPTZ | Dernière synchronisation |
| sync_priority | INTEGER | Priorité (1=haute, 2=moyenne, 3=basse) |
| consecutive_failures | INTEGER | Échecs consécutifs (max 5 avant désactivation) |

## Appel API

### Manuel (via cURL)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/sync-profiles \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_profiles": 20,
    "generate_embeddings": true,
    "classify_hooks": true
  }'
```

### Réponse

```json
{
  "success": true,
  "job_id": "uuid",
  "duration_seconds": 45.2,
  "profiles_processed": 15,
  "successful_profiles": 14,
  "posts_scraped": 450,
  "posts_new": 120,
  "embeddings_updated": 120,
  "hooks_classified": 118,
  "results": [
    {
      "profile_id": "uuid",
      "linkedin_id": "alexhormozi",
      "posts_scraped": 50,
      "posts_new": 8
    }
  ]
}
```

## Configuration du Cron Job

### Option 1: pg_cron (Recommandé pour Supabase Pro)

```sql
-- Activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Créer le job hebdomadaire (chaque lundi à 3h du matin UTC)
SELECT cron.schedule(
  'weekly-profile-sync',
  '0 3 * * 1',  -- Lundi 3h UTC
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/sync-profiles',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'max_profiles', 50,
      'generate_embeddings', true,
      'classify_hooks', true
    )
  );
  $$
);

-- Vérifier les jobs planifiés
SELECT * FROM cron.job;

-- Voir l'historique des exécutions
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Option 2: Supabase Database Webhooks + External Cron

Utilisez un service externe comme:
- **Cron-job.org** (gratuit)
- **EasyCron**
- **GitHub Actions**
- **Render Cron Jobs**

Exemple GitHub Actions (`.github/workflows/weekly-sync.yml`):

```yaml
name: Weekly Profile Sync

on:
  schedule:
    - cron: '0 3 * * 1'  # Lundi 3h UTC
  workflow_dispatch:  # Permet le déclenchement manuel

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/sync-profiles \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"max_profiles": 50}'
```

### Option 3: Supabase Edge Function Cron (Beta)

Dans `supabase/functions/sync-profiles/config.toml`:

```toml
[sync-profiles]
schedule = "0 3 * * 1"  # Lundi 3h UTC
```

## Flux de synchronisation détaillé

### Phase 1: Détection des profils à synchroniser
```sql
-- Exécuté par get_profiles_to_sync()
SELECT profiles WHERE:
  - linkedin_id IS NOT NULL
  - type = 'external_influencer'
  - sync_enabled = true
  - consecutive_failures < 5
  - last_scraped_at < NOW() - 7 days OR NULL
ORDER BY sync_priority, last_scraped_at
```

### Phase 2: Scraping RapidAPI
- Appel à `fresh-linkedin-profile-data.p.rapidapi.com/get-profile-posts`
- Filtrage des reshares
- Déduplication par `post_url`
- Insertion des nouveaux posts avec `needs_embedding = true`

### Phase 3: Génération des Embeddings
```
Pour chaque post avec needs_embedding = true:
  1. Concat hook + content
  2. Appel OpenAI text-embedding-3-small
  3. Update embedding + needs_embedding = false
```

### Phase 4: Classification des Hooks
```
Pour chaque post avec needs_hook_classification = true:
  1. Envoyer le hook à GPT-4o-mini
  2. Classifier dans un des hook_types
  3. Update hook_type_id + needs_hook_classification = false
```

### Phase 5: Mise à jour des statistiques
```sql
UPDATE profiles SET
  posts_count = (SELECT COUNT(*) FROM viral_posts_bank WHERE author_id = profile.id),
  avg_engagement = (SELECT AVG(likes + comments) FROM viral_posts_bank WHERE author_id = profile.id)
```

## Monitoring

### Dashboard de monitoring suggéré

```typescript
// Utiliser le hook useProfileSync
const { syncJobs, profileStatuses, isSyncing, triggerSync } = useProfileSync();

// Afficher les stats
const { stats } = useSyncStats();
console.log(`
  Profils total: ${stats.totalProfiles}
  Besoin de sync: ${stats.profilesNeedingSync}
  Posts sans embedding: ${stats.postsWithoutEmbedding}
  Dernier sync: ${stats.lastSyncDate}
`);
```

## Limites et coûts

### RapidAPI (Fresh LinkedIn Profile Data)
- ~50 posts par requête
- Vérifier les quotas de votre plan

### OpenAI
- text-embedding-3-small: ~$0.02 / 1M tokens
- gpt-4o-mini: ~$0.15 / 1M input tokens

### Estimation mensuelle (20 profils, 100 nouveaux posts/semaine)
- RapidAPI: ~80 requêtes/mois
- OpenAI Embeddings: ~400 posts × ~500 tokens = ~$0.004
- OpenAI Classification: ~400 posts × ~100 tokens = ~$0.006
- **Total estimé**: < $1/mois (hors coût RapidAPI)

## Troubleshooting

### Profil en erreur récurrente
```sql
-- Voir les profils avec erreurs
SELECT p.full_name, pss.consecutive_failures, pss.last_error
FROM profile_sync_status pss
JOIN profiles p ON p.id = pss.profile_id
WHERE pss.consecutive_failures > 0;

-- Réinitialiser un profil
UPDATE profile_sync_status
SET consecutive_failures = 0, last_error = NULL
WHERE profile_id = 'uuid';
```

### Forcer un re-sync
```sql
UPDATE profile_sync_status
SET last_scraped_at = NULL
WHERE profile_id = 'uuid';
```

### Vérifier les posts sans traitement
```sql
SELECT COUNT(*) as pending_embeddings
FROM viral_posts_bank
WHERE needs_embedding = true;

SELECT COUNT(*) as pending_classification
FROM viral_posts_bank
WHERE needs_hook_classification = true;
```
