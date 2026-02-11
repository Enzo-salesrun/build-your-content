# 🔍 Audit du Pipeline de Copywriting

> **Date:** 5 février 2026  
> **Objectif:** Identifier les axes d'amélioration pour produire un copywriting plus naturel et percutant

---

## 📊 État actuel du système

| Composant | Quantité | État |
|-----------|----------|------|
| `viral_posts_bank` | 2943 posts | ✅ Base solide |
| `topics` | 74 | ⚠️ Trop granulaire |
| `audiences` | 12 | ⚠️ Sous-exploitées |
| `hook_types` | 20 | ✅ OK |
| `post_templates` | 13 | ⚠️ À enrichir |
| `profiles` avec style | 44 | ⚠️ Qualité variable |

---

## 🚨 Problèmes identifiés

### 1. **Analyse de style trop générique**

**Fichier:** `scripts/analyze_writing_styles.py`

**Problème:**
- Le prompt d'analyse génère des descriptions **trop longues et abstraites**
- Les `writing_style_prompt` actuels sont des essais de 200-400 mots → difficile à respecter
- Manque de **patterns concrets** (phrases signature, structures récurrentes)

**Exemple actuel (Enzo):**
```
"Write LinkedIn B2B posts in Enzo Luciano-Marty's voice: a punchy, contrarian, 
system-first operator tone that mixes bluntness + pedagogy..."
```
→ Trop vague pour guider l'IA efficacement.

**Recommandation:**
- Passer à un format **structuré JSON** avec des éléments concrets :
  - 5-10 phrases signature verbatim
  - Patterns d'ouverture récurrents
  - Longueur moyenne réelle
  - Ratio émojis/caractères
  - Mots/expressions fétiches

---

### 2. **Topics trop nombreux et mal définis**

**Table:** `topics` (74 entrées)

**Problème:**
- 74 topics = trop granulaire → l'IA ne sait pas différencier
- Beaucoup de topics sans `description` ou avec descriptions vagues
- Le script `analyze_topics.py` utilise du **keyword matching basique** (pas de sémantique)

**Exemples problématiques:**
- `signal_based_outbound` vs `smartbound` vs `linkedin_outreach` → se chevauchent
- Topics génériques : `follow_up`, `qualification`, `volume_activity`

**Recommandation:**
- **Réduire à 15-20 topics max** regroupés par thématique
- Ajouter des **exemples concrets** pour chaque topic
- Utiliser l'embedding pour classifier (pas du keyword matching)

---

### 3. **Audiences sous-exploitées**

**Table:** `audiences` (12 entrées)

**Problème:**
- Les audiences ont de bonnes données (`pain_points`, `vocabulary_to_use`)
- **MAIS** elles ne sont pas utilisées de façon impactante dans les prompts
- Le contexte audience est noyé dans un prompt de 400+ lignes

**Recommandation:**
- Créer des **micro-prompts par audience** plus ciblés
- Utiliser les `pain_points` comme **angle obligatoire** (pas optionnel)
- Ajouter des **exemples de hooks qui marchent** par audience

---

### 4. **Prompts trop longs et complexes**

**Fichiers:** 
- `supabase/functions/generate-hooks/index.ts` (~330 lignes de prompt)
- `supabase/functions/_shared/prompts/body.ts` (~425 lignes)

**Problèmes:**
- Prompts de 2000+ tokens → dilue l'attention de l'IA
- Trop de règles contradictoires ("sois naturel" + "respecte 15 contraintes")
- Format "manuel d'instruction" plutôt que "exemples à imiter"

**Recommandation:**
- Passer au **few-shot prompting** : 5-10 exemples > 100 règles
- Réduire les prompts à **500 tokens max** pour le système
- Séparer les contraintes HARD (longueur, langue) des préférences SOFT (ton)

---

### 5. **Manque d'exemples concrets**

**Problème critique:**
- Les prompts décrivent ce qu'il faut faire, mais **montrent peu d'exemples**
- L'IA apprend mieux par **imitation** que par instruction

**État actuel:**
```
"Écris un hook qui stoppe le scroll, crée de la curiosité, 
soit spécifique, pas générique..."
```

**Ce qu'il faudrait:**
```
Exemples de hooks qui MARCHENT pour [audience]:
1. "J'ai viré mon meilleur closer. Voici pourquoi c'était la bonne décision."
2. "0 à 100K€ de MRR en 8 mois. La vraie méthode (spoiler: pas du growth hacking)."
3. "Le framework en 3 étapes qui a doublé mon taux de réponse cold email."

Maintenant génère 5 hooks similaires pour: [source_text]
```

---

### 6. **Pas de feedback loop**

**Problème:**
- Aucun système pour apprendre des posts qui **performent bien**
- Les hooks/posts générés ne sont pas évalués rétroactivement
- Pas de A/B testing sur les patterns

**Recommandation:**
- Tracker les `engagement_rate` des posts publiés
- Créer une table `high_performing_outputs` avec les meilleurs résultats
- Réinjecter ces exemples dans les prompts (self-improvement)

---

## 🛠️ Plan d'action recommandé

### Phase 1 : Quick wins (1-2 jours)

| Action | Impact | Effort |
|--------|--------|--------|
| Réduire les prompts de 50% | 🟢 Haut | 🟢 Faible |
| Ajouter 10 exemples de hooks par audience | 🟢 Haut | 🟡 Moyen |
| Fusionner les topics redondants (74 → 20) | 🟡 Moyen | 🟢 Faible |

### Phase 2 : Refonte structure (1 semaine)

| Action | Impact | Effort |
|--------|--------|--------|
| Réécrire `analyze_writing_styles.py` → format structuré | 🟢 Haut | 🟡 Moyen |
| Créer des "style cards" JSON par profil | 🟢 Haut | 🟡 Moyen |
| Implémenter few-shot prompting | 🟢 Haut | 🟡 Moyen |

### Phase 3 : Feedback loop (2 semaines)

| Action | Impact | Effort |
|--------|--------|--------|
| Tracker performance des posts publiés | 🟢 Haut | 🔴 Élevé |
| Auto-alimenter les exemples avec les top performers | 🟢 Haut | 🔴 Élevé |
| Dashboard de qualité copywriting | 🟡 Moyen | 🟡 Moyen |

---

## 📁 Fichiers à modifier

### Priorité 1 (critique)
- [ ] `supabase/functions/_shared/prompts/body.ts` → réduire + few-shot
- [ ] `supabase/functions/generate-hooks/index.ts` → réduire + few-shot
- [ ] `scripts/analyze_writing_styles.py` → output structuré JSON

### Priorité 2 (important)
- [ ] Table `topics` → consolidation
- [ ] Table `audiences` → enrichir `example_hooks`
- [ ] Table `profiles.style_analysis` → nouveau format

### Priorité 3 (nice to have)
- [ ] Nouvelle table `high_performing_outputs`
- [ ] Dashboard monitoring qualité
- [ ] A/B testing patterns

---

## 💡 Nouvelle architecture proposée

```
┌─────────────────────────────────────────────────────────────┐
│                    GÉNÉRATION DE CONTENU                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ STYLE CARD   │    │  AUDIENCE    │    │   TOPIC      │   │
│  │ (JSON)       │    │  EXAMPLES    │    │   EXAMPLES   │   │
│  │              │    │              │    │              │   │
│  │ • 5 phrases  │    │ • 10 hooks   │    │ • 5 posts    │   │
│  │   signature  │    │   qui        │    │   viraux     │   │
│  │ • patterns   │    │   marchent   │    │   sur ce     │   │
│  │   récurrents │    │ • pain pts   │    │   topic      │   │
│  │ • longueur   │    │   exploités  │    │              │   │
│  │ • ton        │    │              │    │              │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             ▼                                │
│              ┌──────────────────────────┐                    │
│              │    PROMPT COMPACT        │                    │
│              │    (500 tokens max)      │                    │
│              │                          │                    │
│              │  • Contraintes hard      │                    │
│              │  • 5-10 exemples         │                    │
│              │  • Source text           │                    │
│              └──────────────────────────┘                    │
│                             │                                │
│                             ▼                                │
│              ┌──────────────────────────┐                    │
│              │      OUTPUT              │                    │
│              │                          │                    │
│              │  → Hooks/Body générés    │                    │
│              │  → Feedback tracking     │                    │
│              │  → Self-improvement      │                    │
│              └──────────────────────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Prochaines étapes

1. **Valider ce diagnostic** avec l'équipe
2. **Prioriser** les actions Phase 1
3. **Prototyper** un nouveau prompt compact pour `generate-hooks`
4. **Tester** sur 10 posts et comparer la qualité

---

*Document généré automatiquement - Build Your Content*
