-- SIMPLIFICATION: Fusionner content_formats dans post_templates
-- Architecture simplifiée: 3 axes seulement
-- 1. QUOI (sujet) → topics
-- 2. QUI (cible) → audiences  
-- 3. COMMENT (structure) → post_templates (avec media_type)

-- 1. Ajouter les nouveaux champs à post_templates
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text';
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS best_for TEXT[];
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS tips TEXT[];
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS icon_name TEXT;

-- 2. Mettre à jour les templates existants
UPDATE post_templates SET media_type = 'text' WHERE media_type IS NULL;
UPDATE post_templates SET engagement_score = 3.0 WHERE name = 'Hook + Story + Lesson';
UPDATE post_templates SET engagement_score = 2.0 WHERE name = 'Liste Éducative';
UPDATE post_templates SET engagement_score = 1.8 WHERE name = 'Avant/Après';

-- 3. Insérer les nouveaux templates (formats de posts)
INSERT INTO post_templates (name, description, structure, category, media_type, objective, best_for, tips, engagement_score, color, icon_name, example) VALUES

('Post Vidéo', 
'Contenu vidéo natif. 5x plus d''engagement. Durée optimale 1-2 min.',
'Hook visuel (3 sec) → Contenu principal → CTA verbal + texte',
'educational', 'video',
'Démontrer expertise, tutoriels, behind-the-scenes',
ARRAY['Tutoriels', 'Behind-the-scenes', 'Interviews', 'Témoignages'],
ARRAY['Durée 1-2 min', 'Sous-titres obligatoires', 'Hook dans les 3 premières secondes'],
5.0, '#EF4444', 'IconVideo',
'[Vidéo] Comment j''ai automatisé 80% de ma prospection'),

('Carrousel', 
'Document PDF swipeable. Très engageant et éducatif.',
'Slide 1: Hook → Slides 2-8: Contenu → Dernière slide: CTA',
'educational', 'carousel',
'Éduquer en profondeur, guides step-by-step, frameworks',
ARRAY['Guides étape par étape', 'Frameworks', 'Études de cas'],
ARRAY['8-12 slides', 'Une idée par slide', 'CTA sur dernière slide'],
2.5, '#8B5CF6', 'IconPresentation',
'[Carrousel] 7 frameworks pour closer plus de deals'),

('Sondage', 
'Sondage interactif. Presque 2x le reach médian.',
'Question claire → 3-4 options → Contexte → Invitation à commenter',
'engagement', 'poll',
'Générer engagement, collecter opinions, créer discussions',
ARRAY['Études de marché', 'Opinions audience', 'Débats'],
ARRAY['3 options > 4', 'Durée 7 jours', 'Partager résultats après'],
1.99, '#F59E0B', 'IconChartBar',
'Quel est votre plus grand défi ? A) Leads B) Contact C) Closing'),

('Post Image', 
'Post avec image(s). Les multi-images doublent les commentaires.',
'Hook → Image impactante → Contexte → CTA',
'promotional', 'image',
'Illustrer un concept, statistiques visuelles, citations',
ARRAY['Infographies', 'Before/After', 'Citations', 'Screenshots'],
ARRAY['Infographies 2.4x mieux', 'Éviter selfies non pertinents', 'Texte sur image'],
2.0, '#10B981', 'IconPhoto',
'[Infographie] Les 5 métriques qui comptent vraiment'),

('Leadership d''opinion', 
'Contenu d''expertise. 6x plus d''engagement que posts emploi.',
'Insight original → Argumentation → Preuves → Conclusion actionnable',
'thought_leadership', 'text',
'Établir expertise, influencer industrie, attirer opportunités',
ARRAY['Analyses tendances', 'Prédictions', 'Opinions expert', 'Méthodologies'],
ARRAY['Éviter auto-promotion', 'Insights uniques', 'Basé sur expérience réelle'],
6.0, '#6366F1', 'IconBulb',
'Après 500 appels ce trimestre, voici ce que j''ai appris...'),

('Tutoriel How-To', 
'Guide pratique étape par étape. Très sauvegardé et partagé.',
'Problème → Étapes numérotées → Résultat → CTA',
'educational', 'text',
'Enseigner compétence, résoudre problème, valeur immédiate',
ARRAY['Guides pratiques', 'Process', 'Hacks', 'Méthodes'],
ARRAY['Numéroter étapes', 'Être spécifique', 'Exemples concrets'],
2.0, '#14B8A6', 'IconListCheck',
'Comment automatiser sa prospection en 5 étapes: 1. [...]'),

('Opinion Controversée', 
'Opinion à contre-courant. Génère débat et engagement.',
'Statement controversé → Argumentation → Nuance → Invitation débat',
'thought_leadership', 'text',
'Se démarquer, créer débat, attirer attention',
ARRAY['Opinions impopulaires', 'Mythes à déconstruire', 'Tendances à challenger'],
ARRAY['Arguments solides', 'Rester respectueux', 'Accepter le débat'],
2.5, '#DC2626', 'IconFlame',
'Unpopular opinion: Le cold calling n''est pas mort'),

('Post Question', 
'Post centré sur une question. +40% d''engagement.',
'Contexte court → Question ouverte → Invitation à répondre',
'engagement', 'text',
'Générer commentaires, comprendre audience, discussions',
ARRAY['Feedback', 'Discussions', 'Études informelles'],
ARRAY['Questions ouvertes > fermées', 'Répondre aux commentaires'],
1.4, '#84CC16', 'IconMessageCircle',
'Quelle erreur vous a le plus appris en début de carrière ?')

ON CONFLICT DO NOTHING;
