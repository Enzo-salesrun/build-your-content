# Flow IA — Intelligence Artificielle

## Vue d'ensemble

Le système IA orchestre **6 types de tâches** via un service centralisé avec fallback :

1. **Génération de hooks** — Créer des accroches virales personnalisées
2. **Génération de body** — Rédiger le corps du post
3. **Classification** — Catégoriser posts par topic, audience, hook type
4. **Génération d'embeddings** — Vectoriser le contenu pour la recherche sémantique
5. **Analyse de style** — Extraire le profil stylistique d'un auteur
6. **Chat assistant** — Conversation IA interactive

---

## AI Service Layer (`_shared/ai-service.ts`)

### Architecture Fallback

```
┌──────────────────────────────────────────────┐
│                  AI Service                   │
│                                               │
│  .chat()  .json<T>()  .classify()            │
│       │        │           │                  │
│       ▼        ▼           ▼                  │
│  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Claude Opus 4.6  │  │ GPT-5-mini       │   │
│  │ (primary)        │  │ (classification)  │   │
│  └────────┬────────┘  └──────────────────┘   │
│           │ failure                           │
│           ▼                                   │
│  ┌─────────────────┐                         │
│  │ GPT-5.2          │                         │
│  │ (fallback)       │                         │
│  └─────────────────┘                         │
│                                               │
│  Logging → ai_usage_logs (tokens, cost, ms)  │
│  Errors → ai_errors (with user_error_ref)    │
└──────────────────────────────────────────────┘
```

### Modèles & Pricing

| Modèle | Provider | Usage | Input $/1M | Output $/1M |
|---|---|---|---|---|
| `claude-opus-4-6` | Anthropic | Génération primaire | $5.00 | $25.00 |
| `gpt-5.2` | OpenAI | Fallback génération | $5.00 | $15.00 |
| `gpt-5-mini` | OpenAI | Classification (~20x moins cher) | $0.25 | $2.00 |
| `text-embedding-3-small` | OpenAI | Embeddings (1536 dim) | $0.02 | $0 |
| `gpt-4o` | OpenAI | Commentaires engagement | — | — |

### 3 Modes d'Appel

```typescript
// 1. Chat — Retourne du texte brut
const text = await aiService.chat(systemPrompt, userPrompt, options)

// 2. JSON — Retourne du JSON parsé et typé
const result = await aiService.json<HooksOutput>(systemPrompt, userPrompt, options)

// 3. Classify — GPT-5-mini direct (pas de fallback Claude)
const category = await aiService.classify(systemPrompt, userPrompt, options)
```

### Cost Tracking

Chaque appel IA est automatiquement logué dans `ai_usage_logs` :

| Champ | Description |
|---|---|
| `function_name` | Edge function appelante (`generate-hooks`, `sync-profiles-topics`...) |
| `provider` | `anthropic` ou `openai` |
| `model` | Modèle exact utilisé |
| `input_tokens` | Tokens d'entrée |
| `output_tokens` | Tokens de sortie |
| `cost_usd` | Coût calculé en USD |
| `latency_ms` | Temps de réponse |
| `success` | Succès ou échec |
| `is_fallback` | Si le fallback a été utilisé |
| `error_code` | Code d'erreur standardisé (RATE_LIMIT, TIMEOUT...) |

---

## Flow 1 : Génération de Hooks

### Edge Function : `generate-hooks`

**Déclencheur :** Utilisateur clique "Générer des hooks" dans le Studio.

**Étapes :**

```
1. Charger le contexte (en parallèle) :
   ├── hook_types (descriptions + prompt_instructions)
   ├── topic (name, description, embedding_description)
   ├── author profile (writing_style_prompt, style_analysis)
   ├── platform (max_characters, tone_guidelines)
   ├── audience (pain_points, goals, vocabulary, tone)
   ├── template (structure)
   └── knowledge items (contenu de la base de connaissances)

2. Construire le prompt système :
   └── buildHooksSystemPrompt() — prompts/hooks.ts
       ├── Combinaisons auteur × audience
       ├── Référence des hook_types
       ├── Feedback précédent (si re-génération)
       └── Structure de sortie JSON attendue

3. Construire le prompt utilisateur :
   └── buildHooksUserPrompt()
       ├── Source text (idée de départ)
       ├── Topic
       ├── Knowledge context
       └── Template guidance

4. Appel IA : aiService.json<HooksOutput>(system, user)
   └── Claude Opus 4.6 → (fallback) GPT-5.2

5. Stocker les résultats :
   ├── generated_hooks (15 hooks par combinaison)
   └── production_posts.ai_hooks_draft = JSON brut
   └── production_posts.status = 'hook_gen'
```

### Prompt Hooks — Règles Critiques

- **15 hooks UNIQUES** par combinaison auteur × audience
- **Max 300 caractères** par hook (stratégie "See more" LinkedIn)
- **Langue détectée** automatiquement (FR ou EN)
- **Ton** adapté à chaque audience (vocabulaire spécifique)
- **Interdit :** emojis en début de hook, hashtags, citations, formulations génériques

---

## Flow 2 : Génération du Body

### Edge Function : `generate-body`

**Déclencheur :** Utilisateur sélectionne un hook et clique "Générer le corps".

**Étapes :**

```
1. Charger le contexte enrichi :
   ├── production_post (avec selected_hook_data)
   ├── author profile
   │   ├── writing_style_prompt
   │   ├── style_analysis
   │   └── inspiration_profiles (top posts des influenceurs similaires)
   ├── preset (density, tone, visual_intensity, hook_style)
   ├── topic + knowledge
   ├── audience (pain_points, goals, vocabulary, tone)
   ├── platform (max_chars, tone_guidelines)
   └── template (structure guideline)

2. Construire le prompt "Chef d'Orchestre" :
   └── buildBodySystemPrompt() — prompts/body.ts
       ├── 🎭 Identité de l'auteur (style, ton, signature)
       ├── 🔬 Analyse de style (métriques, patterns)
       ├── 🌟 Profils d'inspiration (posts similaires)
       ├── 🎛️ Preset (densité, ton, visualisation)
       ├── 📚 Topic + Knowledge
       ├── 🎯 Audience (douleurs, objectifs, vocabulaire)
       ├── 📱 Plateforme (contraintes techniques)
       └── 📐 Template (structure recommandée)

3. Appel IA : aiService.json<BodyOutput>(system, user)

4. Stocker le résultat :
   ├── production_posts.ai_body_draft = {intro, body, conclusion}
   └── production_posts.status = 'body_gen'
```

### Prompt Body — Orchestration

Le prompt body est un **"Chef d'Orchestre"** de ~400 lignes qui harmonise :

| Section | Rôle |
|---|---|
| Identité auteur | Style d'écriture, phrases signatures, ton |
| Analyse de style | Métriques quantitatives (longueur, emojis, listes) |
| Inspiration | Posts viraux similaires pour le RAG |
| Preset | Configuration utilisateur (densité, ton, visuel) |
| Topic + Knowledge | Contexte thématique et faits |
| Audience | Personnalisation au public cible |
| Plateforme | Contraintes techniques (chars, format) |
| Template | Structure de post (list, story, how-to...) |

**Règles absolues :**
- Transition fluide hook → body (pas de rupture de ton)
- Langue identique au hook
- Pas de hashtags ni emojis non pertinents
- Structure aérée (lignes courtes, espaces visuels)

---

## Flow 3 : Classification (Workers V2)

### Architecture Event-Driven

```
viral_posts_bank INSERT
    │ trigger: on_viral_post_insert
    ▼
  needs_embedding = true
  needs_hook_classification = true
  needs_topic_classification = true
  needs_audience_classification = true
    │
    ├── worker-generate-embeddings-v2
    │   OpenAI text-embedding-3-small
    │   → viral_posts_bank.embedding
    │
    ├── worker-extract-hooks-v2
    │   Extraction du hook (première ligne)
    │   → viral_posts_bank.hook
    │
    ├── worker-classify-hooks-v2
    │   aiService.classify() → GPT-5-mini
    │   → viral_posts_bank.hook_type_id
    │
    ├── worker-classify-topics-v2
    │   aiService.classify() → GPT-5-mini
    │   → viral_posts_bank.topic_id
    │
    └── worker-classify-audiences-v2
        aiService.classify() → GPT-5-mini
        → viral_posts_bank.audience_id
```

### Worker Utils V2

Tous les workers V2 utilisent `worker-utils-v2.ts` :

```typescript
const { context, error } = await initWorker(req, 'worker-name')
// → Vérifie CORS, auth (scheduler_secret), feature flag
// → Log dans task_execution_logs_v2

// ... traitement ...

return await finalizeWorker(context, {
  items_processed: 10,
  items_failed: 0,
  results: { ... }
})
// → Met à jour le log d'exécution
```

---

## Flow 4 : Analyse de Style

### Edge Function : `analyze-style` + Script Python `analyze_writing_styles.py`

**But :** Extraire le profil stylistique d'un auteur à partir de ses posts.

**Output :**

```json
{
  "writing_style_prompt": "Écris comme [Auteur]. Ton style est...",
  "style_metrics": {
    "tone": "informel",
    "language": "fr",
    "avg_post_length": "moyen",
    "emoji_usage": "modéré",
    "list_usage": "souvent",
    "question_hooks": true,
    "storytelling": true
  },
  "signature_elements": {
    "opening_patterns": ["Question provocante", "Stat choc"],
    "closing_patterns": ["Et vous ?", "Dites-moi en commentaire"],
    "signature_phrases": ["Le game changer", "Stop aux excuses"]
  }
}
```

**Stocké dans :** `profiles.writing_style_prompt` + `profiles.style_analysis`

---

## Flow 5 : Recherche Sémantique (RAG)

### Utilisation dans la Génération

Quand un post est généré, le système peut chercher des posts viraux similaires :

```sql
SELECT * FROM match_viral_posts(
  query_embedding := [embedding du topic/sujet],
  match_threshold := 0.5,
  match_count := 5
);
```

### Pipeline d'Indexation

```
Post LinkedIn scrapé
    │
    ├── text-embedding-3-small → vector(1536)
    │   Coût: $0.02 / 1M tokens
    │
    └── Stocké dans viral_posts_bank.embedding
        Index HNSW pour recherche rapide
```

---

## Flow 6 : Chat Assistant (`ai-assistant`)

**Edge Function :** `ai-assistant`

Conversation IA en temps réel :
- Utilise le contexte du projet (profils, posts, topics)
- Historique de session dans `chat_sessions` + `chat_messages`
- Auto-titrage de la session au premier message (trigger `auto_title_chat_session`)

---

## Monitoring IA

### Tables de suivi

| Table | Rows | Rôle |
|---|---|---|
| `ai_usage_logs` | 87K+ | Chaque appel IA (tokens, coût, latence) |
| `ai_errors` | — | Erreurs IA avec code et ref utilisateur |
| `ai_model_pricing` | 5 | Table de tarification des modèles |
| `task_execution_logs_v2` | 4.6K+ | Exécution des workers V2 |

### Codes d'erreur standardisés

| Code | Description |
|---|---|
| `RATE_LIMIT` | Limite de taux atteinte |
| `TIMEOUT` | Timeout de la requête |
| `INVALID_JSON` | Réponse JSON invalide |
| `CONTENT_FILTER` | Filtrage de contenu |
| `ALL_MODELS_FAILED` | Claude + GPT tous échoués |
| `NETWORK_ERROR` | Erreur réseau |
