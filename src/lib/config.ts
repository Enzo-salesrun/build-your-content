/**
 * Configuration centralisée pour l'application
 * Toutes les constantes de style, couleurs et configurations UI
 */

// ==================== POST STATUS CONFIG ====================
export type PostStatus = 'draft_input' | 'hook_gen' | 'hook_selected' | 'body_gen' | 'validated' | 'scheduled' | 'published'

// Statuts considérés comme "brouillon" (non planifié, non publié)
export const DRAFT_STATUSES: PostStatus[] = ['draft_input', 'hook_gen', 'hook_selected', 'body_gen', 'validated']

export const POST_STATUS_CONFIG: Record<PostStatus, {
  label: string
  variant: string
  color: string
  bgClass: string
  textClass: string
}> = {
  draft_input: {
    label: 'Brouillon',
    variant: 'draft_input',
    color: '#6B7280',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-500',
  },
  hook_gen: {
    label: 'Hooks en cours',
    variant: 'hook_gen',
    color: '#F59E0B',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
  },
  hook_selected: {
    label: 'Hook sélectionné',
    variant: 'hook_selected',
    color: '#8B5CF6',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-600',
  },
  body_gen: {
    label: 'Rédaction',
    variant: 'body_gen',
    color: '#A855F7',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-600',
  },
  validated: {
    label: 'Brouillon',
    variant: 'validated',
    color: '#6B7280',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
  },
  scheduled: {
    label: 'Planifié',
    variant: 'scheduled',
    color: '#F97316',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-600',
  },
  published: {
    label: 'Publié',
    variant: 'published',
    color: '#10B981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-white',
  },
}

export const POST_STATUS_WORKFLOW: PostStatus[] = [
  'draft_input',
  'hook_gen',
  'hook_selected',
  'body_gen',
  'validated',
  'scheduled',
  'published',
]

export const HOOK_GENERATION_STATUSES: PostStatus[] = ['draft_input', 'hook_gen']
export const BODY_EDITING_STATUSES: PostStatus[] = ['hook_selected', 'body_gen', 'validated', 'scheduled', 'published']

// ==================== CONNECTION STATUS CONFIG ====================
export type ConnectionStatus = 'OK' | 'PENDING' | 'CREDENTIALS' | 'DISCONNECTED' | 'ERROR' | null

export const CONNECTION_STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bgClass: string
  textClass: string
}> = {
  OK: {
    label: 'Connecté',
    color: '#22C55E',
    bgClass: 'bg-green-50',
    textClass: 'text-green-500',
  },
  PENDING: {
    label: 'En attente',
    color: '#F59E0B',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-500',
  },
  CREDENTIALS: {
    label: 'Erreur',
    color: '#EF4444',
    bgClass: 'bg-red-50',
    textClass: 'text-red-500',
  },
  DISCONNECTED: {
    label: 'Non connecté',
    color: '#9CA3AF',
    bgClass: 'bg-neutral-50',
    textClass: 'text-neutral-400',
  },
  ERROR: {
    label: 'Erreur',
    color: '#EF4444',
    bgClass: 'bg-red-50',
    textClass: 'text-red-500',
  },
  null: {
    label: 'Non connecté',
    color: '#9CA3AF',
    bgClass: 'bg-neutral-50',
    textClass: 'text-neutral-400',
  },
}

// ==================== AI STATUS CONFIG ====================
export type AIStatus = 'idle' | 'thinking' | 'generating' | 'success' | 'error'

export const AI_STATUS_CONFIG: Record<AIStatus, {
  text: string
  color: string
  bgClass: string
  textClass: string
  animate?: boolean
}> = {
  idle: {
    text: 'IA prête',
    color: '#9CA3AF',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-400',
  },
  thinking: {
    text: 'Analyse en cours...',
    color: '#F59E0B',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
    animate: true,
  },
  generating: {
    text: 'Génération en cours...',
    color: '#8B5CF6',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-600',
    animate: true,
  },
  success: {
    text: 'Terminé !',
    color: '#10B981',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
  },
  error: {
    text: 'Une erreur est survenue',
    color: '#EF4444',
    bgClass: 'bg-red-50',
    textClass: 'text-red-600',
  },
}

// ==================== TOPIC GROUPS CONFIG ====================
export const TOPIC_GROUPS: Record<string, {
  label: string
  icon: string
  color: string
}> = {
  sales_prospection: { label: 'Prospection', icon: '🎯', color: '#A78BFA' },
  sales_operations: { label: 'Sales Ops', icon: '⚙️', color: '#60A5FA' },
  business: { label: 'Business', icon: '💼', color: '#34D399' },
  mindset_career: { label: 'Mindset & Carrière', icon: '🧠', color: '#FBBF24' },
  marketing_growth: { label: 'Marketing & Growth', icon: '📈', color: '#F472B6' },
  ai_tech: { label: 'IA & Tech', icon: '🤖', color: '#818CF8' },
  automation_tools: { label: 'Automatisation', icon: '🔧', color: '#2DD4BF' },
  data_tools: { label: 'Data & Enrichment', icon: '📊', color: '#FB923C' },
  content_branding: { label: 'Contenu & Branding', icon: '✍️', color: '#E879F9' },
}

// ==================== CTA CATEGORIES CONFIG ====================
export const CTA_CATEGORIES: Array<{
  value: string
  label: string
  color: string
}> = [
  { value: 'engagement', label: 'Engagement', color: '#A78BFA' },
  { value: 'conversion', label: 'Conversion', color: '#34D399' },
  { value: 'follow', label: 'Abonnement', color: '#60A5FA' },
  { value: 'comment', label: 'Commentaire', color: '#FBBF24' },
  { value: 'share', label: 'Partage', color: '#F472B6' },
]

// ==================== COLOR PALETTE ====================
export const PALETTE = {
  primary: '#8B5CF6',
  primaryHover: '#7C3AED',
  primaryLight: '#F3E8FF',
  primaryMuted: '#EDE9FE',
  
  success: '#22C55E',
  successLight: '#DCFCE7',
  
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  
  error: '#EF4444',
  errorLight: '#FEE2E2',
  
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
} as const

// ==================== PRESET COLORS ====================
export const PRESET_COLORS: string[] = [
  '#A78BFA', '#60A5FA', '#34D399', '#FBBF24', 
  '#F472B6', '#818CF8', '#2DD4BF', '#FB923C', '#E879F9',
]

// ==================== HELPER FUNCTIONS ====================
export function getPostStatusConfig(status: string) {
  return POST_STATUS_CONFIG[status as PostStatus] || POST_STATUS_CONFIG.draft_input
}

export function getConnectionStatusConfig(status: string | null) {
  return CONNECTION_STATUS_CONFIG[status || 'null'] || CONNECTION_STATUS_CONFIG.null
}

export function getAIStatusConfig(status: AIStatus) {
  return AI_STATUS_CONFIG[status] || AI_STATUS_CONFIG.idle
}

export function getTopicGroupConfig(group: string) {
  return TOPIC_GROUPS[group] || { label: group, icon: '📁', color: PALETTE.primary }
}

export function getCTACategoryConfig(category: string) {
  return CTA_CATEGORIES.find(c => c.value === category) || CTA_CATEGORIES[0]
}
