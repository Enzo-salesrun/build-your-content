import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Audience {
  id: string
  name: string
  label_fr: string | null
  description: string | null
  color: string | null
  slug: string | null
  job_titles: string[] | null
  industries: string[] | null
  company_sizes: string[] | null
  seniority_levels: string[] | null
  pain_points: string[] | null
  goals: string[] | null
  objections: string[] | null
  vocabulary_to_use: string[] | null
  vocabulary_to_avoid: string[] | null
  preferred_content_types: string[] | null
  tone_preferences: string | null
  example_hooks: string[] | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface AudienceInsert {
  name: string
  description?: string | null
  color?: string | null
  slug?: string | null
  job_titles?: string[] | null
  industries?: string[] | null
  company_sizes?: string[] | null
  seniority_levels?: string[] | null
  pain_points?: string[] | null
  goals?: string[] | null
  is_active?: boolean
}

export interface AudienceUpdate {
  name?: string
  description?: string | null
  color?: string | null
  job_titles?: string[] | null
  industries?: string[] | null
  company_sizes?: string[] | null
  pain_points?: string[] | null
  goals?: string[] | null
  is_active?: boolean
}

export function useAudiences() {
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAudiences = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('audiences')
      .select('*')
      .order('name')

    if (fetchError) {
      setError(fetchError.message)
      setAudiences([])
    } else {
      setAudiences((data || []) as unknown as Audience[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAudiences()
  }, [fetchAudiences])

  return { audiences, loading, error, refetch: fetchAudiences }
}

export function useAudience(id: string | undefined) {
  const [audience, setAudience] = useState<Audience | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setAudience(null)
      setLoading(false)
      return
    }

    async function fetchAudience() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('audiences')
        .select('*')
        .eq('id', id!)
        .single()

      if (fetchError) {
        setError(fetchError.message)
        setAudience(null)
      } else {
        setAudience(data as unknown as Audience)
      }

      setLoading(false)
    }

    fetchAudience()
  }, [id])

  return { audience, loading, error }
}

export function useAudienceMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAudience = async (audience: AudienceInsert): Promise<Audience | null> => {
    setLoading(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('audiences')
      .insert(audience)
      .select()
      .single()

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return null
    }

    return data as unknown as Audience
  }

  const updateAudience = async (id: string, updates: AudienceUpdate): Promise<Audience | null> => {
    setLoading(true)
    setError(null)

    const { data, error: updateError } = await supabase
      .from('audiences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return null
    }

    return data as unknown as Audience
  }

  const deleteAudience = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const { error: deleteError } = await supabase
      .from('audiences')
      .delete()
      .eq('id', id)

    setLoading(false)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    return true
  }

  return {
    createAudience,
    updateAudience,
    deleteAudience,
    loading,
    error,
  }
}
