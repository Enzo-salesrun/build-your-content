-- Create template_category enum
CREATE TYPE template_category AS ENUM (
  'storytelling',
  'educational',
  'promotional',
  'engagement',
  'thought_leadership'
);

-- Create post_templates table
CREATE TABLE post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  structure TEXT NOT NULL,
  category template_category NOT NULL DEFAULT 'storytelling',
  hook_style TEXT,
  body_structure TEXT,
  cta_style TEXT,
  example TEXT,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Templates are viewable by everyone"
  ON post_templates FOR SELECT
  USING (true);

CREATE POLICY "Templates can be inserted by authenticated users"
  ON post_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Templates can be updated by creator"
  ON post_templates FOR UPDATE
  USING (true);

CREATE POLICY "Templates can be deleted by creator"
  ON post_templates FOR DELETE
  USING (true);

-- Insert default templates
INSERT INTO post_templates (name, description, structure, category, hook_style, body_structure, cta_style, example, is_favorite, usage_count) VALUES
(
  'Hook + Story + Lesson',
  'Structure narrative classique avec une accroche, une histoire personnelle et une leçon',
  'Hook → Contexte → Histoire → Pivot → Leçon → CTA',
  'storytelling',
  'Question provocante ou statement choc',
  '1. Contexte (1-2 lignes)
2. Histoire (5-7 lignes)
3. Pivot/Réalisation
4. Leçon applicable',
  'Question ouverte pour engagement',
  '🚫 J''ai failli tout abandonner.

Il y a 2 ans, mon business ne décollait pas...',
  true,
  47
),
(
  'Liste Éducative',
  'Format listicle avec des conseils numérotés',
  'Hook → Liste numérotée → Résumé → CTA',
  'educational',
  'Promesse de valeur (X conseils pour Y)',
  '1. Introduction courte
2. Liste de 5-7 points
3. Bonus optionnel',
  'Save + Share encouragement',
  '5 erreurs que j''aurais aimé éviter en lançant ma boîte:

1. Sous-estimer le temps...',
  true,
  32
),
(
  'Avant/Après',
  'Transformation avec contraste visuel',
  'Avant (douleur) → Après (succès) → Comment → CTA',
  'promotional',
  'Contraste fort (Avant: X / Maintenant: Y)',
  '1. Situation avant (problème)
2. Le déclic
3. Situation après
4. La méthode',
  'Offre ou invitation',
  'Avant: 60h/semaine, burnout proche
Après: 35h/semaine, revenus x2

Voici ce qui a changé...',
  false,
  18
),
(
  'Hot Take',
  'Opinion controversée pour générer du débat',
  'Statement controversé → Argumentation → Nuance → CTA débat',
  'engagement',
  'Opinion impopulaire ou contre-intuitive',
  '1. Statement fort
2. Pourquoi je pense ça
3. Contre-arguments
4. Ma conclusion',
  'Demande d''avis (Agree/Disagree)',
  'Opinion impopulaire: Le networking est surestimé.

Voici pourquoi...',
  false,
  25
),
(
  'Framework/Méthode',
  'Présentation d''un framework actionnable',
  'Problème → Framework → Application → Résultats',
  'thought_leadership',
  'Problème commun + promesse de solution',
  '1. Le problème
2. Le framework (acronyme ou étapes)
3. Comment l''appliquer
4. Résultats attendus',
  'Téléchargement ou follow pour plus',
  'J''utilise la méthode RICE pour prioriser:

R - Reach
I - Impact
C - Confidence
E - Effort',
  true,
  41
);

-- Create index for faster queries
CREATE INDEX idx_post_templates_category ON post_templates(category);
CREATE INDEX idx_post_templates_is_favorite ON post_templates(is_favorite);
