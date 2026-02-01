# 🚀 Plan de Déploiement : Système d'Engagement Automatique LinkedIn

## Vue d'ensemble

Ce document décrit le plan de déploiement pour le système d'engagement automatique qui permet à tous les comptes LinkedIn connectés de **liker, réagir et commenter automatiquement** les nouveaux posts publiés par l'équipe.

### Objectif
Quand un post est publié via le système :
1. **Tous les autres comptes connectés** réagissent automatiquement au post
2. **Chaque compte poste un commentaire personnalisé** (10-15 caractères) cohérent avec :
   - Le sujet du post
   - Le style d'écriture du commentateur

---

## 📊 Analyse de l'Existant

### API Unipile - Endpoints Identifiés

| Action | Endpoint | Méthode | Paramètres Clés |
|--------|----------|---------|-----------------|
| **Ajouter réaction** | `/api/v1/posts/reaction` | POST | `account_id`, `post_id` (social_id), `reaction_type` |
| **Commenter** | `/api/v1/posts/{post_id}/comments` | POST | `account_id`, `text` (1-1250 chars) |

**Types de réactions LinkedIn :**
- `like` (défaut)
- `celebrate`
- `support`
- `love`
- `insightful`
- `funny`

**Note importante :** LinkedIn utilise le `social_id` (ex: `urn:li:activity:7332661864792854528`) pour les interactions, pas l'ID simple.

### Structure Existante

| Table | Rôle | Champs Clés |
|-------|------|-------------|
| `unipile_accounts` | Comptes LinkedIn connectés | `profile_id`, `unipile_account_id`, `status` |
| `profiles` | Profils utilisateurs | `writing_style_prompt`, `full_name` |
| `published_posts` | Historique des publications | `external_post_id`, `profile_id` |
| `production_posts` | Posts en production | `author_id`, `final_content`, `status` |

---

## 🏗️ Architecture Proposée

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Déclencheur : Post Publié                         │
│                  (publish-post / publish-scheduled)                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Edge Function : auto-engage-post                     │
│  1. Récupère tous les comptes LinkedIn actifs (sauf l'auteur)       │
│  2. Pour chaque compte :                                             │
│     a. Appelle Unipile pour ajouter une réaction                    │
│     b. Génère un commentaire IA personnalisé                        │
│     c. Poste le commentaire via Unipile                             │
│  3. Log les résultats dans engagement_logs                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GPT-5.2 : Génération Commentaire                  │
│  Input:                                                              │
│    - Contenu du post                                                 │
│    - writing_style_prompt du commentateur                           │
│    - full_name du commentateur                                       │
│  Output:                                                             │
│    - Commentaire court (10-15 caractères)                           │
│    - Type de réaction approprié                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Plan de Déploiement en 5 Phases

### Phase 1 : Migration Base de Données
**Durée estimée : 30 min**

Créer la table `engagement_logs` pour tracker les engagements automatiques :

```sql
-- Migration: 20260127_auto_engagement_system.sql

CREATE TABLE IF NOT EXISTS public.engagement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Post concerné
  published_post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
  external_post_id TEXT NOT NULL, -- LinkedIn social_id (urn:li:activity:xxx)
  post_author_id UUID REFERENCES public.profiles(id),
  
  -- Engagement effectué
  engager_profile_id UUID REFERENCES public.profiles(id),
  engager_unipile_account_id UUID REFERENCES public.unipile_accounts(id),
  
  -- Actions
  reaction_type TEXT, -- like, celebrate, support, love, insightful, funny
  reaction_success BOOLEAN DEFAULT false,
  comment_text TEXT,
  comment_id TEXT, -- ID retourné par Unipile
  comment_success BOOLEAN DEFAULT false,
  
  -- Timing (pour étaler les engagements)
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  -- Erreurs
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_engagement_logs_post ON public.engagement_logs(published_post_id);
CREATE INDEX idx_engagement_logs_engager ON public.engagement_logs(engager_profile_id);
CREATE INDEX idx_engagement_logs_scheduled ON public.engagement_logs(scheduled_at) 
  WHERE executed_at IS NULL;

-- RLS
ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access engagement_logs" ON public.engagement_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own engagements" ON public.engagement_logs
  FOR SELECT USING (engager_profile_id = auth.uid() OR post_author_id = auth.uid());
```

---

### Phase 2 : Edge Function - Génération de Commentaires IA
**Durée estimée : 1h**

Créer `supabase/functions/generate-engagement-comment/index.ts` :

```typescript
// Génère un commentaire personnalisé basé sur :
// - Le contenu du post
// - Le style d'écriture du commentateur
// - Limite : 10-15 caractères (commentaire court et impactant)

interface GenerateCommentRequest {
  post_content: string;
  commenter_name: string;
  commenter_writing_style: string | null;
}

// Utilise GPT-5.2 avec max_completion_tokens (pas max_tokens!)
// Prompt : générer commentaire authentique, court, cohérent avec le style
```

**Prompt IA suggéré :**
```
Tu es {commenter_name}. Ton style d'écriture : {writing_style}.

Génère un commentaire LinkedIn TRÈS COURT (10-15 caractères max) pour ce post :
"{post_content}"

Règles :
- Le commentaire doit paraître authentique et humain
- Cohérent avec ton style d'écriture
- Pas de hashtags, pas d'emojis excessifs
- Variété : évite "Super !", "Top !" à chaque fois

Retourne UNIQUEMENT le commentaire, rien d'autre.
```

---

### Phase 3 : Edge Function - Auto-Engagement
**Durée estimée : 2h**

Créer `supabase/functions/auto-engage-post/index.ts` :

```typescript
interface AutoEngageRequest {
  published_post_id: string;      // Notre ID interne
  external_post_id: string;       // social_id LinkedIn (urn:li:activity:xxx)
  post_content: string;           // Contenu pour la génération IA
  post_author_profile_id: string; // Pour exclure l'auteur
}

// Flow :
// 1. Récupérer tous les unipile_accounts actifs (status='OK', provider='LINKEDIN')
// 2. Exclure le compte de l'auteur du post
// 3. Pour chaque compte :
//    a. Attendre un délai aléatoire (30s - 5min) pour paraître naturel
//    b. Ajouter une réaction via POST /api/v1/posts/reaction
//    c. Générer commentaire IA personnalisé
//    d. Poster commentaire via POST /api/v1/posts/{social_id}/comments
//    e. Logger dans engagement_logs
```

**Gestion des délais (anti-détection) :**
```typescript
// Étaler les engagements sur 1-10 minutes
const baseDelay = 30_000; // 30 secondes minimum
const randomDelay = Math.random() * 270_000; // jusqu'à 4.5 min supplémentaires
const delay = baseDelay + randomDelay;
```

---

### Phase 4 : Intégration au Flow de Publication
**Durée estimée : 1h**

Modifier `publish-post/index.ts` et `publish-scheduled/index.ts` pour :

1. Après publication réussie, appeler `auto-engage-post` avec le `post_id` retourné
2. Passer le `social_id` (format `urn:li:activity:xxx`) pour les interactions

```typescript
// Dans publish-post après succès
if (postResult.post_id) {
  // Déclencher l'auto-engagement en arrière-plan
  const engageResponse = await fetch(`${supabaseUrl}/functions/v1/auto-engage-post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Scheduler-Secret': schedulerSecret,
    },
    body: JSON.stringify({
      published_post_id: publishedPost?.id,
      external_post_id: postResult.post_id, // social_id
      post_content: content,
      post_author_profile_id: account.profile_id,
    }),
  });
}
```

---

### Phase 5 : Configuration & Secrets
**Durée estimée : 15 min**

Ajouter dans Supabase Edge Function Secrets :
- `OPENAI_API_KEY` (si pas déjà présent)

Variables de configuration recommandées :
```typescript
const CONFIG = {
  MIN_DELAY_MS: 30_000,        // 30s minimum entre engagements
  MAX_DELAY_MS: 300_000,       // 5 min max
  COMMENT_MIN_LENGTH: 10,
  COMMENT_MAX_LENGTH: 50,      // Un peu plus que 15 pour flexibilité
  DEFAULT_REACTION: 'like',
  ENABLED: true,               // Kill switch
};
```

---

## ⚠️ Considérations Importantes

### Limites LinkedIn (via Unipile)
| Action | Limite Estimée |
|--------|---------------|
| Réactions/jour | ~100-150 par compte |
| Commentaires/jour | ~50-100 par compte |

### Bonnes Pratiques Anti-Détection
1. **Délais aléatoires** entre chaque engagement (30s - 5min)
2. **Variation des réactions** (pas toujours "like")
3. **Commentaires uniques** générés par IA
4. **Limite quotidienne** par compte (max 10 engagements/jour)
5. **Pas d'engagement si compte déjà engagé** sur ce post

### Gestion des Erreurs
- Si Unipile retourne `401/403` : marquer le compte comme `CREDENTIALS` et skip
- Si `429` (rate limit) : arrêter les engagements pour ce compte aujourd'hui
- Logger toutes les erreurs dans `engagement_logs`

---

## 📊 Métriques & Monitoring

### Dashboard suggéré
- Nombre d'engagements/jour par compte
- Taux de succès réactions vs commentaires
- Erreurs fréquentes
- Comptes en état `CREDENTIALS` (à reconnecter)

### Alertes
- Si taux d'erreur > 20% sur 1h
- Si un compte échoue 5x consécutives

---

## 🗓️ Timeline de Déploiement

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| Phase 1 : Migration DB | 30 min | - |
| Phase 2 : Génération IA | 1h | Phase 1 |
| Phase 3 : Auto-Engage | 2h | Phases 1, 2 |
| Phase 4 : Intégration | 1h | Phase 3 |
| Phase 5 : Configuration | 15 min | Phase 4 |

**Total estimé : ~5h de développement**

---

## ✅ Checklist de Déploiement

- [ ] Migration DB appliquée
- [ ] Edge Function `generate-engagement-comment` déployée
- [ ] Edge Function `auto-engage-post` déployée
- [ ] `publish-post` modifié pour déclencher auto-engage
- [ ] `publish-scheduled` modifié pour déclencher auto-engage
- [ ] Secrets configurés dans Supabase
- [ ] Tests manuels effectués (1 post → engagements OK)
- [ ] Monitoring configuré
- [ ] Documentation mise à jour

---

## 🔄 Évolutions Futures

1. **Scheduler dédié** : Au lieu d'engager immédiatement, créer des jobs programmés
2. **ML pour réactions** : Choisir le type de réaction basé sur le contenu
3. **Exclusion sélective** : Permettre d'exclure certains comptes/posts
4. **Analytics** : Dashboard des performances d'engagement
5. **A/B Testing** : Tester différents styles de commentaires
