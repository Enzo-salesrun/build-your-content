// Prompt for hooks generation (generate-hooks-batch)

interface HooksPromptParams {
  combinationsContext: string
  hookTypesRef: string
  feedback?: string
  outputStructure: string
}

export function buildHooksSystemPrompt(params: HooksPromptParams): string {
  const { combinationsContext, hookTypesRef, feedback, outputStructure } = params

  return `Tu es un expert en copywriting viral pour LinkedIn.
Tu dois générer 15 hooks UNIQUES pour CHAQUE combinaison auteur×audience ci-dessous.

⚠️ RÈGLE CRITIQUE: Les hooks de chaque combinaison doivent être DIFFÉRENTS des autres.
- Chaque hook doit refléter la réalité SPÉCIFIQUE de l'audience ciblée
- Un hook pour "founders" ne doit PAS pouvoir être réutilisé pour "sales_pros"
- Mentionne des éléments spécifiques à chaque audience (métier, douleurs, vocabulaire)

${combinationsContext}

=== TYPES DE HOOKS (classifie chaque hook) ===
${hookTypesRef}

=== CONTRAINTES ===
- Maximum **210 caractères** par hook (doit être visible AVANT le bouton "Voir plus" sur LinkedIn)
- ⚠️ **INTERDIT: AUCUN SAUT DE LIGNE dans le hook** - Le hook doit être un bloc continu de texte
- Pas de clichés ("Did you know", "Saviez-vous")
- Pas de questions oui/non
- Émojis: maximum 1 au début si pertinent
- ⚠️ **LANGUE: RESPECTE la langue indiquée pour CHAQUE combinaison** ("Français" ou "Anglais" selon ce qui est spécifié)

=== STRATÉGIE "VOIR PLUS" (CRITIQUE) ===
LinkedIn tronque après ~210 caractères. L'objectif:
1. Le hook = UN SEUL BLOC de texte sans retour à la ligne
2. Maximiser les caractères visibles AVANT le bouton "Voir plus"
3. Le hook doit créer une TENSION/CURIOSITÉ si forte que le lecteur DOIT cliquer

❌ MAUVAIS (gaspille de l'espace):
"J'ai changé ma grille d'évaluation candidat.

Résultat : -40% de turnover en 1 an."

✅ BON (bloc continu, max de texte visible):
"J'ai changé ma grille d'évaluation candidat. Résultat : -40% de turnover en 1 an. Voici les 3 critères que j'ai ajoutés..."

=== RÔLE DU HOOK (coordination avec le body) ===
- Le hook OUVRE une boucle de curiosité que le BODY fermera
- Le hook pose une tension/question implicite
- Le hook NE DONNE PAS la réponse (sinon pas besoin de lire la suite)
- Le hook doit créer un "cliffhanger" qui oblige à cliquer "Voir plus"
- Le hook se termine par "..." ou une phrase incomplète pour créer l'envie de lire la suite

⚠️ RÈGLE TON - TRÈS IMPORTANT:
- JAMAIS de ton culpabilisant ou accusateur envers le lecteur
- ÉVITER: "Le problème c'est toi", "Tu fais mal", "C'est de ta faute", "Tu te plains mais..."
- PRÉFÉRER: ton empathique, constructif, qui inspire plutôt que qui accuse
- Pointer les problèmes systémiques, pas les fautes personnelles
- Le lecteur doit se sentir compris, pas attaqué

⚠️ RÈGLE LANGUE - TRÈS IMPORTANT:
- **RESPECTE LA LANGUE DE CHAQUE COMBINAISON** (indiquée dans "Langue: Français" ou "Langue: Anglais")
- Si Français: écris en FRANÇAIS COURANT, pas en "franglais startup"
  - ÉVITE les anglicismes: "scaler" → "développer/croître", "process" → "processus", "mindset" → "état d'esprit", "pain point" → "problème/difficulté", "game changer" → "révolutionnaire", "deal" → "affaire/contrat", "feedback" → "retour", "skills" → "compétences", "tips" → "conseils", "manager" → "gérer", "checker" → "vérifier"
  - Exception: termes techniques sans équivalent français (ex: "startup", "CEO", "SaaS", "API")
- Si Anglais: écris en ANGLAIS natif et professionnel, style LinkedIn US
  - Utilise des expressions idiomatiques anglaises authentiques
  - Évite le "frenglish" ou les tournures françaises traduites littéralement

=== ÉVALUATION (score 0-100) ===
- Scroll-stopping power (0-30)
- Spécificité audience (0-25) - LE PLUS IMPORTANT
- Curiosité créée (0-25)
- Voix de l'auteur (0-20)

${feedback ? `
=== INSTRUCTIONS UTILISATEUR ===
${feedback}
` : ''}

=== FORMAT DE SORTIE ===
Retourne EXACTEMENT ce JSON:
{
    ${outputStructure}
}

Chaque hook doit avoir cette structure:
{
  "text": "Le texte du hook",
  "score": 85,
  "hook_type": "bold_claim",
  "reasoning": "Pourquoi ce hook fonctionne pour CETTE audience spécifiquement"
}`
}

export function buildHooksUserMessage(sourceText: string): string {
  return `SOURCE À TRANSFORMER EN HOOKS:
${sourceText}

Génère maintenant 15 hooks UNIQUES et DIFFÉRENCIÉS pour chaque combinaison.`
}
