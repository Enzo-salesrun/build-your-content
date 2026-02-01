-- Migration: Update LinkedIn guidelines based on FR Sales/GTM creators analysis
-- This updates the existing LinkedIn platform with new copywriting guidelines

update platforms
set 
  max_hashtags = 0,
  tone_guidelines = 'Conversationnel et direct, mélange formel/informel. Utilise l''humour et le sarcasme avec parcimonie. Authentique et relatable - évite le corporate speak. Tutoiement ou vouvoiement selon la cible.',
  format_guidelines = 'Hook percutant en 1 ligne (max 10 mots). Paragraphes de 1-3 lignes max. Saut de ligne après CHAQUE phrase. Listes à puces fréquentes (70%+ des posts). Longueur idéale: 300-600 mots. Les 210 premiers caractères sont cruciaux (avant "See more"). Structure: HOOK → CONTEXTE → DÉVELOPPEMENT → TAKEAWAY → CTA.',
  best_practices = 'Évite les hashtags (les top créateurs FR n''en utilisent pas). Emojis modérés: 3-5 max, jamais dans le hook. Utilise des anecdotes personnelles et storytelling. Inclus des données/chiffres. Termine par un CTA clair (question ouverte, lien, ou réflexion). Hooks efficaces: question provocante, affirmation choc, anecdote, contre-intuition, ou chiffre. Phrases signatures: "C''est cadeau", "Voici ce que j''ai appris", "La vraie raison c''est...", "Spoiler:", "DM moi si tu veux...".'
where slug = 'linkedin';
