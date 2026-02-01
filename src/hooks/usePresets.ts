import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type PresetType = 'format'

export interface Preset {
  id: string
  name: string
  description: string | null
  type: PresetType
  config: Record<string, unknown>
  color: string
  icon_name: string | null
  usage_count: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  example_post: string | null
  template_structure: string | null
}

export interface PresetInsert {
  name: string
  description?: string | null
  type: PresetType
  config?: Record<string, unknown>
  color?: string
  icon_name?: string | null
}

export interface PresetUpdate {
  name?: string
  description?: string | null
  type?: PresetType
  config?: Record<string, unknown>
  color?: string
  icon_name?: string | null
  is_active?: boolean
}

export const PRESET_TYPES = [
  { value: 'format' as PresetType, label: 'Format', icon: '📐' },
]

export function usePresets(filterType?: PresetType) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPresets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = (supabase as any)
        .from('presets')
        .select('*')
        .eq('is_active', true)
        .order('type')
        .order('usage_count', { ascending: false })

      if (filterType) {
        query = query.eq('type', filterType)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
        setPresets([])
      } else {
        setPresets((data || []) as Preset[])
      }
    } catch (e) {
      setError('Failed to fetch presets')
      setPresets([])
    }

    setLoading(false)
  }, [filterType])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  return { presets, loading, error, refetch: fetchPresets }
}

export function usePresetsByType() {
  const { presets, loading, error, refetch } = usePresets()

  const grouped = presets.reduce((acc, preset) => {
    if (!acc[preset.type]) {
      acc[preset.type] = []
    }
    acc[preset.type].push(preset)
    return acc
  }, {} as Record<PresetType, Preset[]>)

  return { grouped, presets, loading, error, refetch }
}

export function usePresetMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPreset = async (preset: PresetInsert): Promise<Preset | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await (supabase as any)
        .from('presets')
        .insert(preset)
        .select()
        .single()

      setLoading(false)

      if (insertError) {
        setError(insertError.message)
        return null
      }

      return data as Preset
    } catch (e) {
      setLoading(false)
      setError('Failed to create preset')
      return null
    }
  }

  const updatePreset = async (id: string, updates: PresetUpdate): Promise<Preset | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await (supabase as any)
        .from('presets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      setLoading(false)

      if (updateError) {
        setError(updateError.message)
        return null
      }

      return data as Preset
    } catch (e) {
      setLoading(false)
      setError('Failed to update preset')
      return null
    }
  }

  const deletePreset = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await (supabase as any)
        .from('presets')
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
      setError('Failed to delete preset')
      return false
    }
  }

  const incrementUsage = async (id: string): Promise<boolean> => {
    try {
      const { data } = await (supabase as any)
        .from('presets')
        .select('usage_count')
        .eq('id', id)
        .single()

      if (data) {
        await (supabase as any)
          .from('presets')
          .update({ usage_count: (data.usage_count || 0) + 1 })
          .eq('id', id)
      }
      return true
    } catch (e) {
      return false
    }
  }

  return {
    createPreset,
    updatePreset,
    deletePreset,
    incrementUsage,
    loading,
    error,
  }
}
