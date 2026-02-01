# 🔍 Audit Technique Complet - Content Factory

**Date**: 26 Janvier 2026  
**Objectif**: Identifier les problèmes de duplication, code monolithique, styles hardcodés et améliorer la maintenabilité

---

## 📊 Résumé Exécutif

| Catégorie | Sévérité | Fichiers Impactés |
|-----------|----------|-------------------|
| Code Dupliqué (Composants Select) | 🔴 Critique | 5 fichiers |
| Pages Monolithiques (>300 lignes) | 🔴 Critique | 12 fichiers |
| Styles Hardcodés | 🟡 Modéré | 38+ fichiers |
| Types Dupliqués | 🟡 Modéré | 6+ fichiers |
| Hooks dans index.ts | 🟡 Modéré | 1 fichier |

---

## 🔴 PROBLÈMES CRITIQUES

### 1. Composants Select Dupliqués (5 composants quasi-identiques)

**Fichiers concernés:**
- `src/components/ui/topic-combobox.tsx` (190 lignes)
- `src/components/ui/topic-select.tsx` (211 lignes)
- `src/components/ui/multi-select.tsx` (150 lignes)
- `src/components/ui/searchable-select.tsx` (131 lignes)
- `src/components/ui/creator-select.tsx` (198 lignes)

**Problème**: Ces 5 composants partagent ~80% de leur logique:
- Même pattern Popover + Button + Search + ScrollArea
- Même gestion du state (open, search)
- Même UI de checkbox/check
- Même logique de filtrage

**Solution recommandée**: Créer un composant générique `<ComboBox>` avec props:
```typescript
interface ComboBoxProps<T> {
  items: T[]
  value: string | string[]
  onChange: (value: string | string[]) => void
  multiple?: boolean
  searchable?: boolean
  groupBy?: (item: T) => string
  renderItem?: (item: T) => ReactNode
  getLabel: (item: T) => string
  getValue: (item: T) => string
}
```

### 2. Pages Monolithiques (>300 lignes)

| Fichier | Lignes | Problème Principal |
|---------|--------|-------------------|
| `pages/Assistant.tsx` | ~1100 | Logique UI + API + State tout mélangé |
| `pages/Team.tsx` | ~999 | Cards, modales, logique dans un seul fichier |
| `pages/Onboarding.tsx` | ~800 | 6 étapes hardcodées dans un fichier |
| `pages/studio/components/StepAuthors.tsx` | ~795 | Configuration complexe non modulaire |
| `pages/studio/components/StepEditor.tsx` | ~700 | Éditeur monolithique |
| `pages/studio/components/StepHooks.tsx` | ~700 | Duplication avec StepHooksV2.tsx |
| `pages/studio/components/StepConfig.tsx` | ~600 | UI + logique mélangés |
| `pages/creators/PostBank.tsx` | ~500 | Table + filtres + modales |
| `pages/creators/Creators.tsx` | ~472 | Pattern similaire à Team.tsx |
| `pages/Ressources.tsx` | ~600 | Sections hardcodées |
| `pages/studio/Templates.tsx` | ~450 | CRUD monolithique |
| `pages/ContentDashboard.tsx` | ~350 | Dashboard non modulaire |

**Solution recommandée**: Extraire en sous-composants:
- `*Card.tsx` pour les cards réutilisables
- `*Modal.tsx` pour les modales
- `*Filters.tsx` pour les filtres
- `*Table.tsx` pour les tables

### 3. Fichier StepHooks Dupliqué

**Fichiers:**
- `pages/studio/components/StepHooks.tsx` (29308 bytes)
- `pages/studio/components/StepHooksV2.tsx` (18816 bytes)

**Problème**: Deux versions du même composant coexistent. Risque de maintenance double.

**Solution**: Supprimer la version obsolète après vérification.

---

## 🟡 PROBLÈMES MODÉRÉS

### 4. Styles Hardcodés (216+ occurrences)

**Pattern détecté**: Classes Tailwind inline répétées au lieu d'utiliser les variants du design system.

**Exemples problématiques:**
```tsx
// ❌ Hardcodé partout
className="bg-violet-50 text-violet-700"
className="bg-green-100 text-green-700"
className="bg-amber-50 text-amber-500"
className="px-2 py-1.5 rounded text-sm"
```

**Top fichiers impactés:**
1. `pages/Assistant.tsx` - 66 occurrences
2. `pages/studio/components/StepAuthors.tsx` - 31 occurrences
3. `pages/ContentDashboard.tsx` - 18 occurrences
4. `pages/Home.tsx` - 18 occurrences

**Solution recommandée**: 
1. Créer des variants dans `button.tsx` et `badge.tsx`:
```typescript
// Dans badge.tsx
const badgeVariants = cva("...", {
  variants: {
    status: {
      success: "bg-green-50 text-green-700",
      warning: "bg-amber-50 text-amber-600",
      error: "bg-red-50 text-red-700",
      info: "bg-violet-50 text-violet-700",
    }
  }
})
```

2. Utiliser les configs existantes dans `lib/config.ts` (déjà partiellement fait)

### 5. Types Dupliqués Entre Fichiers

**Problème**: Les mêmes interfaces sont redéfinies dans plusieurs fichiers.

**Exemples:**
- `Topic` défini dans: `topic-combobox.tsx`, `topic-select.tsx`, `database.types.ts`, `useTopics.ts`
- `Creator` défini dans: `creator-select.tsx`, `Creators.tsx`, `CreatorDetails.tsx`
- `Audience` défini dans: `useAudiences.ts`, `database.types.ts`, edge functions

**Solution**: Centraliser dans `src/types/index.ts` ou réutiliser `database.types.ts`

### 6. Hook useCTAs Inline dans index.ts

**Fichier**: `src/hooks/index.ts`

**Problème**: Les fonctions `useCTAs`, `useCTA`, `useCTAsByType`, etc. sont définies inline dans le barrel file au lieu d'avoir leur propre fichier.

```typescript
// ❌ Dans index.ts (mauvaise pratique)
export function useCTAs() {
  const [ctas, setCtas] = useState<CTA[]>([])
  // ...
}
```

**Solution**: Créer `src/hooks/useCTAs.ts` et l'exporter depuis `index.ts`

---

## 🟢 POINTS POSITIFS

### ✅ Bonnes Pratiques Identifiées

1. **Centralisation des labels** - `lib/labels.ts` bien structuré
2. **Configuration centralisée** - `lib/config.ts` avec POST_STATUS_CONFIG
3. **API clients partagés** - `_shared/openai.ts` et `_shared/claude.ts` bien faits
4. **Barrel exports** - `components/ui/index.ts` propre
5. **Client Supabase typé** - `lib/supabase.ts` avec `Database` generic
6. **Types de base** - `database.types.ts` existe (à étendre)

---

## 📋 PLAN D'ACTION PRIORITAIRE

### Phase 1: Éliminer la duplication critique (1-2 jours)

1. **Créer `<ComboBox>` générique**
   - Fusionner les 5 composants select en un seul
   - Garder les wrappers spécialisés (TopicSelect, CreatorSelect) comme thin wrappers

2. **Supprimer `StepHooksV2.tsx`**
   - Vérifier quelle version est utilisée
   - Supprimer la version obsolète

3. **Extraire useCTAs dans son propre fichier**

### Phase 2: Refactorer les pages monolithiques (3-5 jours)

1. **Priorité haute:**
   - `Team.tsx` → Extraire `TeamMemberCard`, `TeamMemberModal`, `TeamFilters`
   - `Creators.tsx` → Réutiliser les composants de Team (pattern identique)
   - `Assistant.tsx` → Extraire en `AssistantChat`, `AssistantSidebar`, `MessageBubble`

2. **Priorité moyenne:**
   - `Onboarding.tsx` → Un composant par étape dans `onboarding/steps/`
   - `StepAuthors.tsx` → Extraire les sections de configuration

### Phase 3: Standardiser les styles (2-3 jours)

1. Ajouter des variants `status` au Badge component
2. Créer un fichier `lib/styles.ts` pour les classes réutilisables
3. Remplacer progressivement les styles hardcodés

### Phase 4: Consolider les types (1 jour)

1. Créer `src/types/index.ts` avec exports depuis `database.types.ts`
2. Supprimer les définitions de types redondantes
3. Générer les types Supabase automatiquement si possible

---

## 📁 STRUCTURE CIBLE RECOMMANDÉE

```
src/
├── components/
│   ├── ui/                     # Composants primitifs (shadcn)
│   │   ├── combobox.tsx       # 🆕 Composant générique
│   │   ├── button.tsx
│   │   └── ...
│   ├── shared/                 # 🆕 Composants métier réutilisables
│   │   ├── ProfileCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ConfirmModal.tsx
│   │   └── DataTable.tsx
│   └── layout/
├── features/                   # 🆕 Modules par domaine
│   ├── team/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── TeamPage.tsx
│   ├── creators/
│   ├── studio/
│   └── assistant/
├── hooks/
│   ├── useCTAs.ts             # 🆕 Extrait de index.ts
│   └── ...
├── lib/
│   ├── styles.ts              # 🆕 Classes CSS réutilisables
│   └── ...
└── types/
    └── index.ts               # 🆕 Types centralisés
```

---

## 🎯 MÉTRIQUES DE SUCCÈS

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Composants Select | 5 | 1 générique + wrappers |
| Fichiers > 300 lignes | 12 | 0 |
| Définitions de types dupliquées | 15+ | 0 |
| Styles hardcodés répétés | 200+ | < 20 |

---

## ⚡ QUICK WINS (Implémentables immédiatement)

1. ✅ Supprimer `StepHooksV2.tsx` si non utilisé
2. ✅ Déplacer `useCTAs` dans son propre fichier
3. ✅ Ajouter variant `status` au Badge
4. ✅ Créer alias de type dans `types/index.ts`

Voulez-vous que je commence l'implémentation des corrections prioritaires ?
