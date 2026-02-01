-- Migration: Refactor audiences
-- 1. Fusionner les doublons (founders + Fondateurs Startup)
-- 2. Supprimer l'audience test
-- 3. Ajouter label_fr à toutes les audiences
-- 4. Améliorer descriptions et spécificités
-- 
-- NOTE: Cette migration a été appliquée via Supabase MCP le 2026-01-26

-- ============================================
-- 1. MIGRER LES RÉFÉRENCES AVANT SUPPRESSION
-- ============================================
UPDATE viral_posts_bank 
SET audience_id = (SELECT id FROM audiences WHERE slug = 'founders')
WHERE audience_id IN (SELECT id FROM audiences WHERE slug = 'fondateurs-startup');

-- ============================================
-- 2. SUPPRIMER LES AUDIENCES INUTILES
-- ============================================
DELETE FROM audiences WHERE name = 'test';
DELETE FROM audiences WHERE slug = 'fondateurs-startup';

-- ============================================
-- 3. MISE À JOUR COMPLÈTE DES AUDIENCES
-- ============================================

-- FOUNDERS
UPDATE audiences SET
  label_fr = 'Fondateurs & Entrepreneurs',
  description = 'Fondateurs de startups et entrepreneurs qui cherchent à scaler leur business, de l''idée à la série A et au-delà.',
  goals = ARRAY[
    'Atteindre le product-market fit',
    'Lever des fonds (seed, série A)',
    'Construire une équipe A-players',
    'Devenir rentable ou atteindre un runway 18+ mois',
    'Scaler sans casser la culture',
    'Devenir leader de son marché',
    'Créer un produit que les users adorent',
    'Préparer une exit (acquisition/IPO)',
    'Construire une marque forte',
    'Automatiser les opérations'
  ],
  pain_points = ARRAY[
    'Recruter les bons profils',
    'Gérer le cash burn',
    'Prioriser les features',
    'Convaincre les investisseurs',
    'Déléguer sans perdre le contrôle',
    'Garder la vision long terme',
    'Gérer le stress et l''isolement',
    'Trouver les premiers clients',
    'Scaler les process',
    'Équilibrer vie pro/perso'
  ],
  job_titles = ARRAY['CEO', 'Founder', 'Co-founder', 'CTO', 'COO', 'Entrepreneur', 'Startup Founder', 'Directeur Général'],
  industries = ARRAY['Tech', 'SaaS', 'FinTech', 'HealthTech', 'E-commerce', 'AI/ML', 'B2B', 'Marketplace'],
  vocabulary_to_use = ARRAY['PMF', 'runway', 'ARR', 'MRR', 'churn', 'CAC', 'LTV', 'burn rate', 'pivot', 'scale', 'bootstrapped', 'funded', 'traction', 'equity', 'cap table'],
  vocabulary_to_avoid = ARRAY['get rich quick', 'passive income facile', 'sans effort', 'garanti'],
  tone_preferences = 'Direct et pragmatique. Partager les échecs autant que les succès. Éviter le bullshit corporate. Être transparent sur les difficultés.',
  example_hooks = ARRAY[
    'J''ai failli tout abandonner à 3 mois de runway.',
    'Pourquoi j''ai refusé un term sheet de 2M€.',
    'La vraie raison pour laquelle 90% des startups échouent.',
    'Comment j''ai trouvé mon PMF après 2 pivots.',
    'Le conseil que j''aurais aimé recevoir avant de lever.'
  ],
  color = '#8B5CF6',
  updated_at = now()
WHERE slug = 'founders';

-- SALES_PROS (SDR/AE/Account Managers)
UPDATE audiences SET
  label_fr = 'Commerciaux & SDR',
  description = 'Sales Development Representatives, Account Executives et commerciaux terrain qui closent des deals au quotidien.',
  goals = ARRAY[
    'Dépasser ses quotas chaque trimestre',
    'Devenir top performer de l''équipe',
    'Augmenter son variable de 30-50%',
    'Passer AE ou Sales Manager',
    'Améliorer son taux de closing',
    'Réduire le cycle de vente',
    'Construire un pipeline solide',
    'Maîtriser la gestion des objections',
    'Automatiser la prospection',
    'Développer son personal branding'
  ],
  pain_points = ARRAY[
    'Atteindre ses quotas',
    'Trouver des leads qualifiés',
    'Passer les gatekeepers',
    'Gérer les objections prix',
    'Se différencier de la concurrence',
    'Maintenir la motivation',
    'Gérer le rejet',
    'Jongler entre prospection et closing',
    'Utiliser le CRM efficacement',
    'Collaborer avec le marketing'
  ],
  job_titles = ARRAY['SDR', 'BDR', 'Account Executive', 'Sales Rep', 'Commercial', 'Inside Sales', 'Business Developer', 'Key Account Manager'],
  industries = ARRAY['SaaS', 'Tech', 'B2B Services', 'Software', 'Consulting', 'Telecom'],
  vocabulary_to_use = ARRAY['quota', 'pipeline', 'closing', 'discovery call', 'demo', 'objection', 'follow-up', 'cold call', 'outreach', 'BANT', 'MEDDIC', 'qualification', 'win rate', 'deal size'],
  vocabulary_to_avoid = ARRAY['manipulation', 'forcer la vente', 'spam', 'harceler'],
  tone_preferences = 'Énergique et motivant. Partager des tactiques concrètes. Valoriser la résilience et l''effort. Montrer qu''on comprend la pression des quotas.',
  example_hooks = ARRAY[
    'J''ai doublé mon quota en changeant une seule chose.',
    'Le script de cold call qui m''a rapporté 50K€.',
    'Pourquoi 80% des SDR n''atteignent pas leurs objectifs.',
    'La question qui ferme 3x plus de deals.',
    '5 objections et comment les retourner.'
  ],
  color = '#F59E0B',
  updated_at = now()
WHERE slug = 'sales_pros';

-- SALES LEADERS B2B
UPDATE audiences SET
  label_fr = 'Directeurs Commerciaux',
  description = 'VP Sales, Directeurs Commerciaux et Head of Sales qui pilotent des équipes de 5 à 50 commerciaux en B2B.',
  goals = ARRAY[
    'Atteindre les objectifs de CA trimestriels',
    'Créer un sales engine prévisible',
    'Recruter et retenir les top performers',
    'Réduire le cycle de vente de 20-30%',
    'Améliorer le win rate global',
    'Avoir une visibilité claire sur le pipeline',
    'Aligner Sales et Marketing',
    'Augmenter le deal size moyen',
    'Réduire le CAC',
    'Développer les skills de l''équipe'
  ],
  pain_points = ARRAY[
    'Recruter les bons profils',
    'Retenir les top performers',
    'Prévoir le pipeline avec précision',
    'Faire collaborer Sales et Marketing',
    'Gérer les sous-performeurs',
    'Scaler sans perdre en qualité',
    'Justifier les budgets à la direction',
    'Maintenir la motivation de l''équipe',
    'Implémenter les bons outils',
    'Former efficacement les nouveaux'
  ],
  job_titles = ARRAY['VP Sales', 'Head of Sales', 'Directeur Commercial', 'Sales Director', 'Chief Revenue Officer', 'CRO', 'Regional Sales Manager', 'Country Manager'],
  industries = ARRAY['SaaS', 'Tech', 'B2B', 'Enterprise Software', 'Consulting', 'Professional Services'],
  vocabulary_to_use = ARRAY['pipeline', 'forecast', 'win rate', 'ramp-up', 'quota attainment', 'RevOps', 'sales velocity', 'ACV', 'TCV', 'sales playbook', 'compensation plan', 'territory'],
  vocabulary_to_avoid = ARRAY['micromanagement', 'pression excessive', 'culture toxique'],
  tone_preferences = 'Stratégique et orienté résultats. Parler de leadership, pas juste de tactiques. Équilibrer vision long terme et exécution court terme.',
  example_hooks = ARRAY[
    'Comment j''ai restructuré mon équipe pour +40% de performance.',
    'Le playbook qui a réduit notre cycle de vente de 30%.',
    'Pourquoi j''ai viré mon meilleur closer.',
    '3 métriques que chaque VP Sales devrait suivre.',
    'La vraie raison pour laquelle votre équipe n''atteint pas ses quotas.'
  ],
  color = '#DC2626',
  updated_at = now()
WHERE slug = 'sales-leaders-b2b';

-- MARKETERS (Marketing généraliste)
UPDATE audiences SET
  label_fr = 'Marketeurs',
  description = 'Professionnels du marketing digital, content managers et responsables marketing en entreprise.',
  goals = ARRAY[
    'Générer plus de leads qualifiés',
    'Améliorer le ROI des campagnes',
    'Construire une marque forte',
    'Maîtriser de nouveaux canaux',
    'Automatiser les tâches répétitives',
    'Devenir Head of Marketing',
    'Créer du contenu qui performe',
    'Améliorer les taux de conversion',
    'Développer ses compétences data',
    'Avoir plus d''impact stratégique'
  ],
  pain_points = ARRAY[
    'Prouver le ROI du marketing',
    'Générer des leads de qualité',
    'Se différencier dans le bruit',
    'Manque de budget',
    'Alignement avec les sales',
    'Suivre les changements d''algorithmes',
    'Créer du contenu régulièrement',
    'Mesurer l''attribution',
    'Manque de ressources',
    'Justifier les actions long terme'
  ],
  job_titles = ARRAY['Marketing Manager', 'Content Manager', 'Digital Marketer', 'Brand Manager', 'Product Marketing Manager', 'Communication Manager', 'Responsable Marketing'],
  industries = ARRAY['Tech', 'E-commerce', 'SaaS', 'Retail', 'Services', 'B2B', 'B2C'],
  vocabulary_to_use = ARRAY['funnel', 'conversion', 'CAC', 'CPL', 'CTR', 'engagement', 'reach', 'brand awareness', 'content strategy', 'SEO', 'paid media', 'organic', 'attribution'],
  vocabulary_to_avoid = ARRAY['viral garanti', 'hack secret', 'sans effort'],
  tone_preferences = 'Créatif et data-driven. Partager des exemples concrets et des résultats chiffrés. Être au fait des dernières tendances.',
  example_hooks = ARRAY[
    'Cette campagne a généré 500 leads pour 2K€.',
    'Pourquoi j''ai arrêté de poster sur Instagram.',
    'La stratégie content qui a doublé notre trafic.',
    '5 erreurs de débutant en marketing digital.',
    'Comment j''ai convaincu mon CEO d''investir en brand.'
  ],
  color = '#10B981',
  updated_at = now()
WHERE slug = 'marketers';

-- MARKETEURS GROWTH
UPDATE audiences SET
  label_fr = 'Growth Marketers',
  description = 'Head of Growth, Growth Hackers et CMO dans des scale-ups, focalisés sur l''acquisition, la rétention et l''expérimentation.',
  goals = ARRAY[
    'Réduire le CAC de 20-40%',
    'Améliorer la rétention et le NRR',
    'Trouver des canaux sous-exploités',
    'Automatiser sans perdre la personnalisation',
    'Prouver le ROI de chaque euro',
    'Construire un demand engine répétable',
    'Améliorer la conversion à chaque étape',
    'Créer du contenu qui génère des leads',
    'Aligner Marketing et Sales',
    'Être data-driven sans se noyer'
  ],
  pain_points = ARRAY[
    'Trouver de nouveaux canaux rentables',
    'Scaler les canaux qui marchent',
    'Équilibrer acquisition et rétention',
    'Attribuer correctement les conversions',
    'Convaincre de tester de nouvelles approches',
    'Gérer la pression des résultats',
    'Recruter des profils growth',
    'Intégrer tous les outils',
    'Maintenir la vélocité d''expérimentation',
    'Communiquer les résultats à la C-suite'
  ],
  job_titles = ARRAY['Head of Growth', 'Growth Manager', 'CMO', 'VP Marketing', 'Growth Hacker', 'Demand Gen Manager', 'Performance Marketing Lead'],
  industries = ARRAY['SaaS', 'Tech', 'Scale-ups', 'FinTech', 'E-commerce', 'Marketplace', 'B2B'],
  vocabulary_to_use = ARRAY['CAC', 'LTV', 'NRR', 'activation', 'retention', 'churn', 'A/B test', 'experiment', 'funnel', 'cohort', 'PLG', 'demand gen', 'MQL', 'SQL', 'pipeline'],
  vocabulary_to_avoid = ARRAY['growth hack magique', 'viral overnight', 'sans data'],
  tone_preferences = 'Expérimental et méthodique. Partager les échecs autant que les succès. Montrer la rigueur analytique derrière les décisions.',
  example_hooks = ARRAY[
    'On a réduit notre CAC de 40% avec cette expérience.',
    'Pourquoi j''ai tué notre canal le plus performant.',
    'L''A/B test qui nous a fait économiser 100K€.',
    'Comment identifier un channel avant qu''il soit saturé.',
    '3 métriques growth que personne ne track.'
  ],
  color = '#6366F1',
  updated_at = now()
WHERE slug = 'marketeurs-growth';

-- DEVELOPERS
UPDATE audiences SET
  label_fr = 'Développeurs & Tech',
  description = 'Software engineers, développeurs full-stack et professionnels tech qui veulent progresser techniquement et dans leur carrière.',
  goals = ARRAY[
    'Devenir Staff/Principal Engineer',
    'Maîtriser une nouvelle stack',
    'Contribuer à l''open source',
    'Améliorer ses skills en architecture',
    'Mieux communiquer avec les stakeholders',
    'Lancer un side project',
    'Augmenter son salaire de 20-50%',
    'Trouver un meilleur work-life balance',
    'Devenir tech lead',
    'Écrire du code plus clean'
  ],
  pain_points = ARRAY[
    'Rester à jour avec les technos',
    'Gérer la dette technique',
    'Communiquer avec les non-tech',
    'Trouver du temps pour apprendre',
    'Négocier son salaire',
    'Gérer les interruptions',
    'Documentation insuffisante',
    'Code reviews qui traînent',
    'Estimer les projets',
    'Éviter le burnout'
  ],
  job_titles = ARRAY['Software Engineer', 'Developer', 'Full-Stack Dev', 'Frontend Developer', 'Backend Developer', 'Tech Lead', 'Staff Engineer', 'DevOps', 'SRE'],
  industries = ARRAY['Tech', 'SaaS', 'FinTech', 'E-commerce', 'Consulting', 'Startups', 'Enterprise'],
  vocabulary_to_use = ARRAY['clean code', 'refactoring', 'architecture', 'scalability', 'CI/CD', 'testing', 'code review', 'DX', 'API', 'microservices', 'monorepo', 'tech debt'],
  vocabulary_to_avoid = ARRAY['10x developer', 'ninja rockstar', 'code monkey'],
  tone_preferences = 'Technique mais accessible. Éviter le gatekeeping. Valoriser l''apprentissage continu et l''humilité technique.',
  example_hooks = ARRAY[
    'Le pattern qui a réduit nos bugs de 80%.',
    'Pourquoi j''ai quitté mon job de Staff Engineer.',
    'Comment j''ai négocié +40% de salaire.',
    'Les 3 skills que les devs négligent.',
    'Ce que j''aurais aimé savoir en début de carrière.'
  ],
  color = '#0EA5E9',
  updated_at = now()
WHERE slug = 'developers';

-- MANAGERS
UPDATE audiences SET
  label_fr = 'Managers & Team Leads',
  description = 'Team leads, managers intermédiaires et responsables d''équipe qui développent leurs compétences en leadership.',
  goals = ARRAY[
    'Devenir un meilleur leader',
    'Faire progresser son équipe',
    'Obtenir une promotion',
    'Améliorer la performance collective',
    'Créer une culture d''équipe positive',
    'Développer ses soft skills',
    'Mieux gérer son temps',
    'Avoir plus d''impact stratégique',
    'Construire une équipe A-players',
    'Être reconnu par la direction'
  ],
  pain_points = ARRAY[
    'Gérer les conflits',
    'Donner du feedback constructif',
    'Déléguer efficacement',
    'Motiver une équipe à distance',
    'Gérer les sous-performeurs',
    'Jongler entre IC et management',
    'Gérer le stress de l''équipe',
    'Prioriser les demandes',
    'Communiquer avec la direction',
    'Recruter les bons profils'
  ],
  job_titles = ARRAY['Team Lead', 'Manager', 'Engineering Manager', 'Product Manager', 'Project Manager', 'Responsable d''équipe', 'Chef de projet'],
  industries = ARRAY['Tech', 'Services', 'Consulting', 'Finance', 'Retail', 'SaaS'],
  vocabulary_to_use = ARRAY['1:1', 'feedback', 'coaching', 'delegation', 'performance review', 'OKRs', 'team health', 'psychological safety', 'empowerment'],
  vocabulary_to_avoid = ARRAY['micromanagement', 'command and control', 'hiérarchie rigide'],
  tone_preferences = 'Humain et pratique. Partager les difficultés du management. Valoriser l''écoute et l''empathie autant que les résultats.',
  example_hooks = ARRAY[
    'La conversation qui a transformé mon équipe.',
    'Comment j''ai géré un conflit entre deux top performers.',
    'Pourquoi les 1:1 sont ma priorité absolue.',
    'L''erreur de management que je répète encore.',
    '3 signaux que votre équipe va mal.'
  ],
  color = '#A855F7',
  updated_at = now()
WHERE slug = 'managers';

-- EXECUTIVES
UPDATE audiences SET
  label_fr = 'Dirigeants & C-Level',
  description = 'C-level executives, directeurs généraux et membres de comités de direction qui pilotent la stratégie d''entreprise.',
  goals = ARRAY[
    'Atteindre les objectifs de croissance',
    'Construire une équipe de A-players',
    'Améliorer la rentabilité',
    'Réussir une levée ou exit',
    'Transformer l''organisation',
    'Développer les futurs leaders',
    'Innover sans casser ce qui marche',
    'Améliorer l''engagement employés',
    'Devenir un leader inspirant',
    'Laisser un legacy positif'
  ],
  pain_points = ARRAY[
    'Prendre les bonnes décisions stratégiques',
    'Aligner l''organisation sur la vision',
    'Gérer le board/les investisseurs',
    'Attirer et retenir les talents',
    'Équilibrer court et long terme',
    'Gérer la pression des résultats',
    'Maintenir la culture en grandissant',
    'Déléguer les décisions',
    'Rester proche du terrain',
    'Gérer son propre développement'
  ],
  job_titles = ARRAY['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'CRO', 'Directeur Général', 'Managing Director', 'Partner', 'Board Member'],
  industries = ARRAY['Tech', 'Finance', 'Consulting', 'SaaS', 'Enterprise', 'VC/PE'],
  vocabulary_to_use = ARRAY['strategy', 'vision', 'culture', 'growth', 'transformation', 'leadership', 'board', 'stakeholders', 'EBITDA', 'P&L', 'market share'],
  vocabulary_to_avoid = ARRAY['tactiques opérationnelles détaillées', 'jargon trop technique'],
  tone_preferences = 'Stratégique et inspirant. Parler de vision, leadership et impact. Éviter les détails opérationnels. Valoriser l''expérience et la sagesse.',
  example_hooks = ARRAY[
    'La décision la plus difficile que j''ai prise cette année.',
    'Comment j''ai reconstruit ma culture d''entreprise.',
    'Ce que j''aurais aimé savoir avant de devenir CEO.',
    'Pourquoi j''ai licencié 20% de mon équipe.',
    'Les 3 erreurs que font tous les nouveaux dirigeants.'
  ],
  color = '#1F2937',
  updated_at = now()
WHERE slug = 'executives';

-- CREATORS
UPDATE audiences SET
  label_fr = 'Créateurs de Contenu',
  description = 'Content creators, influenceurs et personal brands qui monétisent leur audience sur les réseaux sociaux.',
  goals = ARRAY[
    'Vivre de sa création de contenu',
    'Atteindre 100K+ followers',
    'Lancer un produit digital (cours, ebook)',
    'Décrocher des partenariats premium',
    'Construire une marque personnelle forte',
    'Automatiser la création de contenu',
    'Créer une communauté payante',
    'Diversifier sur plusieurs plateformes',
    'Devenir une référence dans sa niche',
    'Scaler sans sacrifier la qualité'
  ],
  pain_points = ARRAY[
    'Monétiser sans perdre l''authenticité',
    'Maintenir une cadence régulière',
    'Trouver des idées de contenu',
    'Gérer le burnout créatif',
    'Diversifier les revenus',
    'Négocier avec les marques',
    'Construire une communauté engagée',
    'Gérer les haters',
    'S''adapter aux changements d''algo',
    'Déléguer sans perdre sa voix'
  ],
  job_titles = ARRAY['Content Creator', 'Influencer', 'YouTuber', 'Podcaster', 'Blogger', 'Newsletter Writer', 'Personal Brand', 'Coach', 'Formateur'],
  industries = ARRAY['Media', 'Entertainment', 'Education', 'Lifestyle', 'Tech', 'Business', 'Personal Development'],
  vocabulary_to_use = ARRAY['audience', 'engagement', 'reach', 'impressions', 'CPM', 'sponsoring', 'brand deal', 'UGC', 'hook', 'rétention', 'watch time', 'CTR', 'niche', 'monetization'],
  vocabulary_to_avoid = ARRAY['viral garanti', 'devenir riche', 'passive income facile', 'overnight success'],
  tone_preferences = 'Authentique, inspirant, relatable. Parler de ses échecs autant que ses succès. Éviter le flex excessif. Être transparent.',
  example_hooks = ARRAY[
    'J''ai gagné 50K€ avec une audience de 10K. Voici comment.',
    'Pourquoi j''ai refusé un sponsoring à 5K€.',
    'Le post qui m''a fait perdre 2000 followers.',
    'Ma routine de création (5h/semaine max).',
    'Les 3 erreurs qui tuent ton engagement.'
  ],
  color = '#EC4899',
  updated_at = now()
WHERE slug = 'creators';

-- SOLOPRENEURS
UPDATE audiences SET
  label_fr = 'Solopreneurs & Freelances',
  description = 'Entrepreneurs solo, freelances et consultants indépendants qui construisent leur business seuls.',
  goals = ARRAY[
    'Atteindre 100K€/an de CA',
    'Avoir des clients récurrents',
    'Augmenter ses tarifs de 50-100%',
    'Créer des revenus passifs',
    'Travailler moins mais mieux',
    'Construire une marque personnelle',
    'Automatiser son business',
    'Lancer un produit digital',
    'Avoir plus de liberté',
    'Devenir une référence dans sa niche'
  ],
  pain_points = ARRAY[
    'Trouver des clients régulièrement',
    'Fixer le bon prix',
    'Gérer l''administratif',
    'Éviter le feast or famine',
    'Se différencier de la concurrence',
    'Gérer son temps efficacement',
    'Sortir du modèle temps contre argent',
    'Gérer la solitude',
    'Scaler sans embaucher',
    'Maintenir l''énergie'
  ],
  job_titles = ARRAY['Freelance', 'Consultant', 'Coach', 'Formateur', 'Solopreneur', 'Indépendant', 'Auto-entrepreneur', 'Expert'],
  industries = ARRAY['Consulting', 'Coaching', 'Formation', 'Tech', 'Marketing', 'Design', 'Services B2B'],
  vocabulary_to_use = ARRAY['CA', 'TJM', 'récurrence', 'productized service', 'personal brand', 'inbound', 'offre irrésistible', 'pricing', 'niche', 'expertise'],
  vocabulary_to_avoid = ARRAY['scheme pyramidal', 'revenu passif facile', 'devenir millionnaire'],
  tone_preferences = 'Pragmatique et motivant. Partager les réalités du solopreneuriat. Valoriser la liberté mais aussi la discipline.',
  example_hooks = ARRAY[
    'Comment je suis passé de 50€/h à 500€/h.',
    'Le système qui me génère 5 leads/semaine en automatique.',
    'Pourquoi j''ai refusé un client à 10K€.',
    'Ma semaine type de 25h de travail.',
    'Les 3 offres qui ont transformé mon business.'
  ],
  color = '#F97316',
  updated_at = now()
WHERE slug = 'solopreneurs';

-- JOB SEEKERS
UPDATE audiences SET
  label_fr = 'Chercheurs d''emploi',
  description = 'Professionnels en recherche active ou passive d''opportunités, de la reconversion au changement de poste.',
  goals = ARRAY[
    'Décrocher le job de ses rêves',
    'Augmenter son salaire de 20-50%',
    'Changer de secteur ou métier',
    'Trouver un meilleur équilibre vie pro/perso',
    'Rejoindre une entreprise avec une bonne culture',
    'Obtenir plus de responsabilités',
    'Travailler en remote',
    'Construire un réseau solide',
    'Développer de nouvelles compétences',
    'Trouver un job qui a du sens'
  ],
  pain_points = ARRAY[
    'Se démarquer des autres candidats',
    'Passer les ATS',
    'Négocier son salaire',
    'Préparer les entretiens',
    'Trouver les bonnes opportunités',
    'Gérer le stress de la recherche',
    'Expliquer un trou dans le CV',
    'Changer de secteur sans expérience',
    'Activer son réseau',
    'Rester motivé après des refus'
  ],
  job_titles = ARRAY['En recherche', 'En transition', 'Candidat', 'Freelance en reconversion'],
  industries = ARRAY['Tous secteurs'],
  vocabulary_to_use = ARRAY['entretien', 'CV', 'networking', 'candidature', 'recruteur', 'offre', 'salaire', 'négociation', 'soft skills', 'personal branding'],
  vocabulary_to_avoid = ARRAY['désespéré', 'n''importe quel job', 'urgent'],
  tone_preferences = 'Encourageant et pratique. Donner des conseils concrets. Valoriser les compétences transférables. Montrer que le changement est possible.',
  example_hooks = ARRAY[
    'Comment j''ai décroché 5 entretiens en 2 semaines.',
    'Le message LinkedIn qui m''a ouvert des portes.',
    'Pourquoi j''ai accepté un salaire plus bas.',
    'Ma reconversion à 40 ans.',
    'Les 3 erreurs qui sabotent vos candidatures.'
  ],
  color = '#14B8A6',
  updated_at = now()
WHERE slug = 'job_seekers';

-- GENERAL (audience par défaut)
UPDATE audiences SET
  label_fr = 'Professionnels',
  description = 'Audience professionnelle large, pour du contenu qui s''adresse à tous les profils en entreprise.',
  goals = ARRAY[
    'Obtenir une promotion',
    'Augmenter son salaire',
    'Trouver un meilleur équilibre vie pro/perso',
    'Développer de nouvelles compétences',
    'Changer de carrière',
    'Devenir manager',
    'Avoir plus d''impact',
    'Être reconnu pour son travail',
    'Trouver un job qui a du sens',
    'Construire son réseau professionnel'
  ],
  pain_points = ARRAY[
    'Manque de reconnaissance',
    'Stress au travail',
    'Mauvais manager',
    'Manque de perspectives',
    'Difficulté à se former',
    'Équilibre vie pro/perso',
    'Politique d''entreprise',
    'Manque de sens',
    'Salaire insuffisant',
    'Manque de feedback'
  ],
  job_titles = ARRAY['Professionnel', 'Cadre', 'Employee', 'Collaborateur'],
  industries = ARRAY['Tous secteurs'],
  vocabulary_to_use = ARRAY['carrière', 'compétences', 'objectifs', 'feedback', 'développement', 'réseau', 'opportunités'],
  vocabulary_to_avoid = ARRAY['jargon trop spécialisé'],
  tone_preferences = 'Accessible et universel. Éviter le jargon trop spécialisé. Parler de thèmes qui touchent tout le monde.',
  example_hooks = ARRAY[
    'La compétence qui a changé ma carrière.',
    'Comment j''ai négocié +30% de salaire.',
    'Les 5 erreurs de début de carrière.',
    'Pourquoi j''ai changé de métier à 35 ans.',
    'Le conseil de carrière que j''aurais aimé recevoir.'
  ],
  color = '#6B7280',
  updated_at = now()
WHERE slug = 'general';

-- ============================================
-- 4. REGENERER LES EMBEDDINGS (marquer comme à recalculer)
-- ============================================
UPDATE audiences 
SET embedding = NULL, 
    embedding_description = name || ' ' || description || ' ' || array_to_string(goals, ' ') || ' ' || array_to_string(COALESCE(pain_points, '{}'), ' ')
WHERE slug IS NOT NULL;

-- ============================================
-- 5. AJOUTER UN INDEX SUR LABEL_FR
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audiences_label_fr ON audiences(label_fr);

COMMENT ON COLUMN audiences.label_fr IS 'Label en français pour l''affichage dans l''UI';
