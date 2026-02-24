# Scripts Python

## Vue d'ensemble

Le projet contient **14 scripts Python** dans le dossier `scripts/`. Ils sont conçus pour des tâches offline (one-shot ou batch) qui ne nécessitent pas le runtime Deno des Edge Functions.

**Dépendances communes :** `requests`, `openai`, `supabase-py`, `json`, `os`, `time`, `re`

---

## Scripts Principaux

### 1. `classify_posts.py` — Classification de Posts

**But :** Classifier les posts viraux par topic, structure, hook_type et audience via OpenAI API.

**Flux :**
```
1. Récupère les posts sans topic_id (viral_posts_bank)
2. Pour chaque post :
   ├── Essaie classification OpenAI (GPT-5.2, temperature=0.1)
   │   Prompt: topic + structure + hook_type + audience
   └── Fallback: classification rule-based (mots-clés)
3. Met à jour viral_posts_bank avec les IDs de classification
```

**Tables de référence (IDs hardcodés) :**

| Catégorie | Valeurs |
|---|---|
| **Topics** | business, career, finance, leadership, marketing, mindset, productivity, sales, storytelling, tech |
| **Structures** | announcement, comparison, contrarian, how-to, list, observation, question, quote, story, thread |
| **Hook Types** | bold_claim, contrarian, curiosity_gap, direct_address, number, pain_point, question, result, social_proof, story_opener |
| **Audiences** | creators, developers, executives, founders, general, job_seekers, managers, marketers, sales_pros, solopreneurs |

**Fallback rule-based :** Si pas d'API key OpenAI ou si l'appel échoue, classification par mots-clés (ex: "startup" → topic=business, "?" dans hook → hook_type=question).

**Rate limiting :** 100ms entre chaque appel OpenAI, batches de 50 posts.

**Interactions DB :**
- READ: `viral_posts_bank` (id, content, hook) WHERE topic_id IS NULL
- WRITE: `viral_posts_bank` (topic_id, structure_id, hook_type_id, audience_id)

---

### 2. `generate_embeddings.py` — Génération d'Embeddings Topics

**But :** Générer des embeddings vectoriels pour les topics (recherche sémantique).

**Flux :**
```
1. Récupère tous les topics (id, name, embedding_description)
2. Pour chaque topic :
   ├── Génère un embedding via OpenAI (text-embedding-3-small)
   └── Stocke le vecteur dans topics.embedding
```

**Modèle :** `text-embedding-3-small` (1536 dimensions)

**Rate limiting :** 100ms entre chaque appel.

**Interactions DB :**
- READ: `topics` (id, name, embedding_description)
- WRITE: `topics` (embedding) — format pgvector string `[0.1,0.2,...]`

---

### 3. `analyze_writing_styles.py` — Analyse de Style d'Écriture

**But :** Extraire un profil stylistique complet pour chaque auteur via GPT-5.2.

**Flux :**
```
1. Liste hardcodée de 33 auteurs (avec IDs Supabase)
2. Pour chaque auteur :
   ├── Récupère les 20 top posts (triés par engagement)
   ├── Analyse statistique locale :
   │   ├── Longueur moyenne
   │   ├── Fréquence emojis
   │   ├── Usage de listes
   │   └── Fréquence question hooks
   ├── Analyse IA (GPT-5.2 Responses API) :
   │   ├── writing_style_prompt (200-400 mots)
   │   ├── style_metrics (ton, langue, longueur, emojis...)
   │   ├── signature_elements (hooks, closings, phrases)
   │   └── content_themes (5 topics principaux)
   └── Stocke dans profiles (writing_style_prompt + style_analysis)
```

**Prompt IA :** Analyse structurée avec contraintes strictes :
- Style = HOW, pas WHAT
- Patterns doivent apparaître dans ≥3 posts pour être "signature"
- Métriques quantifiables
- Output JSON validé

**Fallback :** Si OpenAI échoue, génère un prompt basique à partir des stats.

**API utilisée :** OpenAI **Responses API** (`/v1/responses`) — pas Chat Completions.

**Interactions DB :**
- READ: `viral_posts_bank` (content, hook, metrics) par auteur
- WRITE: `profiles` (writing_style_prompt, style_analysis)

---

### 4. `seeder.py` — Seed Initial de la Base de Données

**But :** Peupler la DB avec des données de test (profiles + posts viraux + embeddings).

**Flux :**
```
1. Valide les variables d'environnement
2. Crée les clients Supabase + OpenAI
3. Seed des profils d'exemple (3 profils internes)
4. Seed des posts viraux d'exemple (10 posts FR)
   ├── Pour chaque post : vectorise avec OpenAI
   └── Insère dans viral_posts_bank (content, hook, metrics, embedding)
5. Crée la fonction SQL match_viral_posts()
   └── Recherche vectorielle (cosine distance)
```

**Particularité :** Utilise `SUPABASE_KEY` (service_role) via variable d'env, pas de clé hardcodée.

**Fonction SQL créée :**
```sql
CREATE OR REPLACE FUNCTION match_viral_posts(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5
) RETURNS TABLE (id uuid, content text, hook text, metrics jsonb, similarity float)
```

**Interactions DB :**
- WRITE: `profiles` (insert), `viral_posts_bank` (insert avec embedding)
- DDL: Crée la fonction `match_viral_posts` via RPC `exec_sql`

---

## Scripts Secondaires

Les scripts suivants sont dans le dossier `scripts/` mais n'ont pas été analysés en détail :

| Script | Description probable |
|---|---|
| `seed_hook_types.py` | Seed des types de hooks |
| `seed_audiences.py` | Seed des audiences |
| `seed_topics.py` | Seed des topics |
| `seed_structures.py` | Seed des structures de posts |
| `seed_comment_patterns.py` | Seed des patterns de commentaires |
| `seed_presets.py` | Seed des presets de style |
| `import_posts.py` | Import batch de posts |
| `extract_hooks_batch.py` | Extraction batch de hooks |
| `update_metrics.py` | Mise à jour des métriques |
| `migrate_data.py` | Migration de données |

---

## Sécurité & Bonnes Pratiques

### ⚠️ Points d'attention

1. **Clés hardcodées** — `classify_posts.py`, `generate_embeddings.py` et `analyze_writing_styles.py` contiennent la `anon_key` Supabase en dur. C'est acceptable pour une clé publique mais pas idéal.

2. **`OPENAI_API_KEY`** — Toujours chargé via `os.getenv()` ✅

3. **`seeder.py`** — Utilise des variables d'environnement pour toutes les clés ✅ (meilleure pratique)

### Recommandations

| Actuel | Recommandé |
|---|---|
| `SUPABASE_KEY` hardcodé dans 3 scripts | Migrer vers `os.getenv("SUPABASE_KEY")` |
| Pas de `requirements.txt` dédié | Ajouter `scripts/requirements.txt` |
| IDs de référence hardcodés | Charger dynamiquement depuis la DB |
| Pas de logging structuré | Ajouter `logging` module Python |

---

## Exécution

```bash
# Classification
export OPENAI_API_KEY="sk-..."
python scripts/classify_posts.py

# Embeddings
export OPENAI_API_KEY="sk-..."
python scripts/generate_embeddings.py

# Analyse de style
export OPENAI_API_KEY="sk-..."
python scripts/analyze_writing_styles.py

# Seeder
export SUPABASE_URL="https://qzorivymybqavkxexrbf.supabase.co"
export SUPABASE_KEY="<service_role_key>"
export OPENAI_API_KEY="sk-..."
python scripts/seeder.py
```
