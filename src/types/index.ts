/**
 * Types centralisés pour l'application
 * Re-export des types de database.types.ts + types additionnels
 */

// Re-export all database types
export type {
  BatchMode,
  BatchStatus,
  PostStatus,
  PostBatch,
  BatchAuthorConfig,
  ProductionPost,
  GeneratedHook,
  Profile,
  Topic,
  Audience,
  PostTemplate,
  Knowledge,
  HookType,
} from '@/lib/database.types'

// ==================== UI COMPONENT TYPES ====================

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending'

export interface StatusConfig {
  label: string
  color: string
  bgClass: string
  textClass: string
  icon?: React.ComponentType<{ className?: string }>
}

// ==================== COMMON ENTITY TYPES ====================

export interface SelectOption {
  value: string
  label: string
  color?: string | null
  disabled?: boolean
}

export interface GroupedSelectOption extends SelectOption {
  group?: string
}

// ==================== SYNC STATUS ====================

export type SyncStatus = 
  | 'pending' 
  | 'scraping' 
  | 'scraped' 
  | 'processing' 
  | 'analyzing' 
  | 'completed' 
  | 'error' 
  | null

export type ConnectionStatus = 
  | 'OK' 
  | 'PENDING' 
  | 'CREDENTIALS' 
  | 'DISCONNECTED' 
  | 'ERROR' 
  | null

// ==================== FORM TYPES ====================

export interface BaseFormData {
  first_name: string
  last_name: string
}

export interface ProfileFormData extends BaseFormData {
  email?: string
  role?: string
  linkedin_id?: string
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
