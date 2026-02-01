import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Note: Run migration 009_templates.sql on Supabase then regenerate types:
// npx supabase gen types typescript --project-id qzorivymybqavkxexrbf > src/lib/database.types.ts

export type TemplateCategory = 'storytelling' | 'educational' | 'promotional' | 'engagement' | 'thought_leadership'

export interface PostTemplate {
  id: string
  name: string
  description: string | null
  structure: string
  category: TemplateCategory
  hook_style: string | null
  body_structure: string | null
  cta_style: string | null
  example: string | null
  objective: string | null
  best_for: string[] | null
  tips: string[] | null
  engagement_score: number | null
  color: string | null
  icon_name: string | null
  is_favorite: boolean
  usage_count: number
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export interface TemplateInsert {
  name: string
  description?: string | null
  structure: string
  category: TemplateCategory
  hook_style?: string | null
  body_structure?: string | null
  cta_style?: string | null
  example?: string | null
  objective?: string | null
  best_for?: string[] | null
  tips?: string[] | null
  is_favorite?: boolean
}

export interface TemplateUpdate {
  name?: string
  description?: string | null
  structure?: string
  category?: TemplateCategory
  hook_style?: string | null
  body_structure?: string | null
  cta_style?: string | null
  example?: string | null
  objective?: string | null
  best_for?: string[] | null
  tips?: string[] | null
  is_favorite?: boolean
}

// TEMPLATE_CATEGORIES removed - using presets from database instead
// Categories are now dynamically loaded from the 'presets' table


export function useTemplates() {
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('templates')
        .select('*')
        .order('usage_count', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        setTemplates([])
      } else {
        setTemplates((data || []) as PostTemplate[])
      }
    } catch (e) {
      setError('Table post_templates not found. Run migration 009_templates.sql')
      setTemplates([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return { templates, loading, error, refetch: fetchTemplates }
}

export function useTemplate(id: string | undefined) {
  const [template, setTemplate] = useState<PostTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setTemplate(null)
      setLoading(false)
      return
    }

    async function fetchTemplate() {
      setLoading(true)
      try {
        const { data, error: fetchError } = await (supabase as any)
          .from('templates')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError) {
          setError(fetchError.message)
          setTemplate(null)
        } else {
          setTemplate(data as PostTemplate)
        }
      } catch (e) {
        setError('Table not found')
        setTemplate(null)
      }

      setLoading(false)
    }

    fetchTemplate()
  }, [id])

  return { template, loading, error }
}

export function useTemplateMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTemplate = async (template: TemplateInsert): Promise<PostTemplate | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await (supabase as any)
        .from('templates')
        .insert(template)
        .select()
        .single()

      setLoading(false)

      if (insertError) {
        setError(insertError.message)
        return null
      }

      return data as PostTemplate
    } catch (e) {
      setLoading(false)
      setError('Failed to create template')
      return null
    }
  }

  const updateTemplate = async (id: string, updates: TemplateUpdate): Promise<PostTemplate | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await (supabase as any)
        .from('templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      setLoading(false)

      if (updateError) {
        setError(updateError.message)
        return null
      }

      return data as PostTemplate
    } catch (e) {
      setLoading(false)
      setError('Failed to update template')
      return null
    }
  }

  const deleteTemplate = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await (supabase as any)
        .from('templates')
        .delete()
        .eq('id', id)

      setLoading(false)

      if (deleteError) {
        setError(deleteError.message)
        return false
      }

      return true
    } catch (e) {
      setLoading(false)
      setError('Failed to delete template')
      return false
    }
  }

  const toggleFavorite = async (id: string, currentValue: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('templates')
        .update({ is_favorite: !currentValue })
        .eq('id', id)

      if (updateError) {
        setError(updateError.message)
        return false
      }

      return true
    } catch (e) {
      return false
    }
  }

  const incrementUsage = async (id: string): Promise<boolean> => {
    try {
      const { data } = await (supabase as any)
        .from('templates')
        .select('usage_count')
        .eq('id', id)
        .single()

      if (data) {
        await (supabase as any)
          .from('templates')
          .update({ usage_count: (data.usage_count || 0) + 1 })
          .eq('id', id)
      }
      return true
    } catch (e) {
      return false
    }
  }

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    incrementUsage,
    loading,
    error,
  }
}
