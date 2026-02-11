/**
 * Database types - Generated from Supabase + custom type aliases
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ==================== ENUM TYPES ====================

export type BatchMode = 'single' | 'multi'

export type BatchStatus = 'draft' | 'generating' | 'completed' | 'failed' | 'partial'

export type PostStatus =
  | 'draft_input'
  | 'hook_gen'
  | 'hook_selected'
  | 'body_gen'
  | 'validated'
  | 'scheduled'
  | 'published'
  | 'pending'
  | 'hooks_generating'
  | 'body_generating'
  | 'ready'

export type KnowledgeType =
  | 'product'
  | 'case_study'
  | 'testimonial'
  | 'methodology'
  | 'statistics'
  | 'faq'
  | 'talking_points'
  | 'competitor_info'
  | 'industry_trends'
  | 'company_values'
  | 'custom'

export type AuthorType = 'internal' | 'external_influencer'

// ==================== TABLE TYPES ====================

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  linkedin_id: string | null
  avatar_url: string | null
  type: AuthorType
  writing_style_prompt: string | null
  style_analysis: Json | null
  avg_engagement: number | null
  posts_count: number | null
  sync_status: string | null
  last_sync_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PostBatch {
  id: string
  name: string
  mode: BatchMode
  status: BatchStatus
  total_posts: number
  completed_posts: number
  failed_posts: number
  created_at: string | null
  updated_at: string | null
  completed_at: string | null
  error_message: string | null
}

export interface BatchAuthorConfig {
  id: string
  batch_id: string
  author_id: string
  topic_id: string | null
  template_id: string | null
  knowledge_ids: string[] | null
  created_at: string | null
}

export interface ProductionPost {
  id: string
  batch_id: string | null
  author_id: string
  topic_id: string | null
  template_id: string | null
  status: PostStatus
  topic_input: string | null
  selected_hook_id: string | null
  final_content: string | null
  knowledge_used: string[] | null
  scheduled_for: string | null
  published_at: string | null
  linkedin_post_id: string | null
  metrics: Json | null
  error_message: string | null
  created_at: string | null
  updated_at: string | null
}

export interface GeneratedHook {
  id: string
  post_id: string
  hook_text: string
  hook_type_id: string | null
  reasoning: string | null
  score: number | null
  is_selected: boolean
  created_at: string | null
}

export interface Topic {
  id: string
  name: string
  description: string | null
  slug: string | null
  color: string | null
  group_name: string | null
  is_active: boolean
  embedding: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Audience {
  id: string
  name: string
  label_fr: string | null
  description: string | null
  slug: string | null
  color: string | null
  is_active: boolean
  job_titles: string[] | null
  industries: string[] | null
  pain_points: string[] | null
  goals: string[] | null
  embedding: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PostTemplate {
  id: string
  name: string
  description: string | null
  structure: string
  example: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Knowledge {
  id: string
  title: string
  content: string
  type: KnowledgeType
  tags: string[] | null
  is_active: boolean
  embedding: string | null
  created_at: string | null
  updated_at: string | null
}

export interface HookType {
  id: string
  name: string
  label_fr: string | null
  description: string | null
  slug: string | null
  color: string | null
  formula: string | null
  examples: string[] | null
  is_active: boolean
  embedding: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ViralPost {
  id: string
  content: string
  hook: string | null
  metrics: Json | null
  author_id: string | null
  post_url: string | null
  scraped_at: string | null
  original_post_date: string | null
  needs_embedding: boolean
  needs_hook_classification: boolean
  needs_topic_classification: boolean
  needs_audience_classification: boolean
  embedding: string | null
  hook_type_id: string | null
  topic_id: string | null
  audience_id: string | null
  created_at: string | null
}