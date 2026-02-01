/**
 * Labels UI en français
 * Fichier centralisé pour tous les labels de l'interface
 */

// ==================== NAVIGATION ====================
export const NAV_LABELS = {
  home: 'Accueil',
  studio: 'Studio',
  studioNew: 'Nouveau post',
  topics: 'Thématiques',
  audiences: 'Audiences',
  templates: 'Templates',
  cta: 'Appels à l\'action',
  platforms: 'Plateformes',
  knowledge: 'Base de connaissances',
  content: 'Tableau de bord',
  ressources: 'Ressources',
  creators: 'Créateurs viraux',
  postBank: 'Banque de posts',
  team: 'Équipe interne',
  settings: 'Paramètres',
} as const

// ==================== TEAM / CREATORS DISTINCTION ====================
export const TEAM_LABELS = {
  title: 'Équipe interne',
  subtitle: 'Gérez les membres de votre équipe et leurs connexions LinkedIn',
  addMember: 'Ajouter un membre',
  editMember: 'Modifier le membre',
  connectLinkedIn: 'Connecter LinkedIn',
  disconnectLinkedIn: 'Déconnecter',
  connectionStatus: {
    connected: 'Connecté',
    disconnected: 'Non connecté',
    pending: 'En attente',
    error: 'Erreur de connexion',
  },
  emptyState: {
    title: 'Aucun membre',
    description: 'Ajoutez les membres de votre équipe pour gérer leurs publications LinkedIn',
    action: 'Ajouter un membre',
  },
} as const

export const CREATORS_LABELS = {
  title: 'Créateurs viraux',
  subtitle: 'Analysez les styles et techniques des créateurs à succès',
  addCreator: 'Ajouter un créateur',
  editCreator: 'Modifier',
  analyzeStyle: 'Analyser le style',
  viewPosts: 'Voir les posts',
  emptyState: {
    title: 'Aucun créateur',
    description: 'Ajoutez des créateurs LinkedIn viraux pour analyser leurs techniques',
    action: 'Ajouter un créateur',
  },
  stats: {
    avgEngagement: 'Engagement moyen',
    totalPosts: 'Posts analysés',
    topHooks: 'Top hooks',
  },
} as const

// ==================== TEMPLATE CATEGORIES ====================
export const TEMPLATE_CATEGORY_LABELS = {
  storytelling: 'Storytelling',
  educational: 'Éducatif',
  promotional: 'Promotionnel',
  engagement: 'Engagement',
  thought_leadership: 'Thought Leadership',
} as const

export const TEMPLATE_CATEGORY_DESCRIPTIONS = {
  storytelling: 'Racontez une histoire personnelle pour créer une connexion émotionnelle',
  educational: 'Partagez des conseils pratiques et des apprentissages',
  promotional: 'Mettez en avant vos produits ou services subtilement',
  engagement: 'Générez des réactions et des commentaires',
  thought_leadership: 'Positionnez-vous comme expert de votre domaine',
} as const

// ==================== POST STATUS ====================
export const POST_STATUS_LABELS = {
  draft: 'Brouillon',
  in_review: 'En révision',
  approved: 'Approuvé',
  scheduled: 'Planifié',
  published: 'Publié',
  archived: 'Archivé',
} as const

export const POST_STATUS_COLORS = {
  draft: '#6B7280',
  in_review: '#F59E0B',
  approved: '#10B981',
  scheduled: '#3B82F6',
  published: '#8B5CF6',
  archived: '#9CA3AF',
} as const

// ==================== PLATFORMS ====================
export const PLATFORM_LABELS = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  bluesky: 'Bluesky',
} as const

export const PLATFORM_DESCRIPTIONS = {
  linkedin: 'Réseau professionnel B2B',
  twitter: 'Microblogging temps réel',
  instagram: 'Visuel et stories',
  facebook: 'Réseau social grand public',
  threads: 'Alternative text-first à Twitter',
  bluesky: 'Réseau décentralisé',
} as const

// ==================== AUDIENCES ====================
export const AUDIENCE_LABELS = {
  entrepreneurs: 'Entrepreneurs',
  managers: 'Managers & Dirigeants',
  freelances: 'Freelances & Indépendants',
  developers: 'Développeurs & Tech',
  marketers: 'Marketers & Growth',
  hr: 'RH & Recruteurs',
  students: 'Étudiants',
  all: 'Audience générale',
} as const

export const AUDIENCE_DESCRIPTIONS = {
  entrepreneurs: 'Fondateurs, CEO, porteurs de projet',
  managers: 'Directeurs, managers, cadres dirigeants',
  freelances: 'Consultants, indépendants, solopreneurs',
  developers: 'Développeurs, CTO, profils tech',
  marketers: 'Marketing, growth, acquisition',
  hr: 'Ressources humaines, recrutement, talent',
  students: 'Étudiants, jeunes diplômés',
  all: 'Tous les profils professionnels',
} as const

// ==================== AUTHOR TYPES ====================
export const AUTHOR_TYPE_LABELS = {
  internal: 'Interne',
  external_influencer: 'Influenceur externe',
} as const

export const AUTHOR_TYPE_DESCRIPTIONS = {
  internal: 'Membre de l\'équipe interne',
  external_influencer: 'Partenaire ou influenceur externe',
} as const

// ==================== KNOWLEDGE TYPES ====================
export const KNOWLEDGE_TYPE_LABELS = {
  case_study: 'Étude de cas',
  testimonial: 'Témoignage client',
  methodology: 'Méthodologie',
  product: 'Produit / Service',
  statistic: 'Statistique',
  quote: 'Citation',
  framework: 'Framework',
  story: 'Histoire personnelle',
} as const

export const KNOWLEDGE_TYPE_DESCRIPTIONS = {
  case_study: 'Exemple concret de résultat client',
  testimonial: 'Avis ou retour d\'expérience client',
  methodology: 'Processus ou méthode de travail',
  product: 'Information sur un produit ou service',
  statistic: 'Donnée chiffrée ou statistique',
  quote: 'Citation inspirante ou d\'autorité',
  framework: 'Modèle ou cadre de réflexion',
  story: 'Anecdote ou histoire personnelle',
} as const

// ==================== RESSOURCE TYPES ====================
export const RESSOURCE_TYPE_LABELS = {
  image: 'Image',
  video: 'Vidéo',
  carousel: 'Carrousel',
  document: 'Document',
  link: 'Lien',
  infographic: 'Infographie',
} as const

// ==================== WORKFLOW STEPS ====================
export const WORKFLOW_STEP_LABELS = {
  input: 'Contenu source',
  analysis: 'Analyse virale',
  hooks: 'Génération hooks',
  feedback: 'Ajustements',
  selection: 'Sélection',
  body: 'Rédaction corps',
  ressources: 'Ressources',
  creation: 'Création IA',
  publication: 'Publication',
} as const

export const WORKFLOW_STEP_DESCRIPTIONS = {
  input: 'Collez votre contenu brut (transcription, notes, idées)',
  analysis: 'L\'IA analyse les posts viraux pour identifier les patterns',
  hooks: 'Génération de plusieurs accroches basées sur l\'analyse',
  feedback: 'Donnez votre feedback pour affiner les hooks',
  selection: 'Choisissez les hooks à développer',
  body: 'Génération du corps du post pour chaque hook',
  ressources: 'Associez des ressources visuelles',
  creation: 'Créez des visuels avec l\'IA si besoin',
  publication: 'Planifiez ou publiez votre post',
} as const

// ==================== ACTIONS ====================
export const ACTION_LABELS = {
  create: 'Créer',
  edit: 'Modifier',
  delete: 'Supprimer',
  save: 'Enregistrer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  search: 'Rechercher',
  filter: 'Filtrer',
  export: 'Exporter',
  import: 'Importer',
  duplicate: 'Dupliquer',
  archive: 'Archiver',
  restore: 'Restaurer',
  publish: 'Publier',
  schedule: 'Planifier',
  preview: 'Aperçu',
  generate: 'Générer',
  regenerate: 'Régénérer',
  approve: 'Approuver',
  reject: 'Rejeter',
  addToFavorites: 'Ajouter aux favoris',
  removeFromFavorites: 'Retirer des favoris',
} as const

// ==================== MESSAGES ====================
export const MESSAGE_LABELS = {
  loading: 'Chargement...',
  saving: 'Enregistrement...',
  generating: 'Génération en cours...',
  noResults: 'Aucun résultat',
  noData: 'Aucune donnée',
  error: 'Une erreur est survenue',
  success: 'Opération réussie',
  confirmDelete: 'Êtes-vous sûr de vouloir supprimer cet élément ?',
  unsavedChanges: 'Vous avez des modifications non enregistrées',
} as const

// ==================== EMPTY STATES ====================
export const EMPTY_STATE_LABELS = {
  topics: {
    title: 'Aucune thématique',
    description: 'Créez votre première thématique pour organiser votre contenu',
    action: 'Créer une thématique',
  },
  templates: {
    title: 'Aucun template',
    description: 'Créez des templates de structure pour vos posts',
    action: 'Créer un template',
  },
  knowledge: {
    title: 'Base de connaissances vide',
    description: 'Ajoutez des informations sur vos produits, études de cas et méthodologies',
    action: 'Ajouter une entrée',
  },
  posts: {
    title: 'Aucun post',
    description: 'Commencez à créer du contenu viral',
    action: 'Créer un post',
  },
  ressources: {
    title: 'Aucune ressource',
    description: 'Uploadez des images, vidéos ou documents',
    action: 'Ajouter une ressource',
  },
  creators: {
    title: 'Aucun créateur',
    description: 'Analysez les styles de créateurs viraux',
    action: 'Ajouter un créateur',
  },
} as const

// ==================== HELPER FUNCTIONS ====================

/**
 * Récupère le label d'une catégorie de template
 */
export function getTemplateCategoryLabel(category: string): string {
  return TEMPLATE_CATEGORY_LABELS[category as keyof typeof TEMPLATE_CATEGORY_LABELS] || category
}

/**
 * Récupère le label d'un statut de post
 */
export function getPostStatusLabel(status: string): string {
  return POST_STATUS_LABELS[status as keyof typeof POST_STATUS_LABELS] || status
}

/**
 * Récupère le label d'une plateforme
 */
export function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform.toLowerCase() as keyof typeof PLATFORM_LABELS] || platform
}

/**
 * Récupère le label d'une audience
 */
export function getAudienceLabel(audience: string): string {
  return AUDIENCE_LABELS[audience as keyof typeof AUDIENCE_LABELS] || audience
}

/**
 * Récupère le label d'un type de knowledge
 */
export function getKnowledgeTypeLabel(type: string): string {
  return KNOWLEDGE_TYPE_LABELS[type as keyof typeof KNOWLEDGE_TYPE_LABELS] || type
}

/**
 * Récupère le label d'un type de ressource
 */
export function getRessourceTypeLabel(type: string): string {
  return RESSOURCE_TYPE_LABELS[type as keyof typeof RESSOURCE_TYPE_LABELS] || type
}

/**
 * Récupère le label d'un type d'auteur
 */
export function getAuthorTypeLabel(type: string): string {
  return AUTHOR_TYPE_LABELS[type as keyof typeof AUTHOR_TYPE_LABELS] || type
}
