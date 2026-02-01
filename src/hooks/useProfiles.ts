import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ==================== TYPES ====================

export type ProfileType = 'internal' | 'external_influencer'
export type ConnectionStatus = 'OK' | 'PENDING' | 'CREDENTIALS' | 'DISCONNECTED' | 'ERROR' | null
export type SyncStatus = 'pending' | 'scraping' | 'scraped' | 'processing' | 'analyzing' | 'completed' | 'error' | null

export interface ProfileWithRelations {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  role: string | null
  linkedin_id: string | null
  avatar_url: string | null
  writing_style_prompt: string | null
  type: ProfileType
  sync_status: SyncStatus
  avg_engagement: number | null
  posts_count: number
  unipile_db_id: string | null
  unipile_account_id: string | null
  unipile_status: ConnectionStatus
}

export interface ProfileFormData {
  first_name: string
  last_name: string
  email?: string
  role?: string
  linkedin_id: string
}

// ==================== HELPERS ====================

export function extractLinkedInId(input: string): string {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/linkedin\.com\/in\/([^\/\?]+)/i)
  return urlMatch ? urlMatch[1] : trimmed
}

// ==================== HOOK ====================

interface UseProfilesOptions {
  type?: ProfileType
  withUnipile?: boolean
  withPostsCount?: boolean
}

export function useProfiles(options: UseProfilesOptions = {}) {
  const { type, withUnipile = false, withPostsCount = false } = options
  
  const [profiles, setProfiles] = useState<ProfileWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchProfiles = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      
      let query = supabase.from('profiles').select(
        withUnipile 
          ? `*, unipile_accounts(id, unipile_account_id, status), viral_posts_bank(count)`
          : withPostsCount 
            ? `*, viral_posts_bank(count)`
            : '*'
      )
      
      if (type) {
        query = query.eq('type', type)
      }
      
      query = query.order('full_name')
      
      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      
      // Transform data to normalize relations
      const rawData = (data || []) as unknown as Record<string, unknown>[]
      const normalized = rawData.map((profile) => {
        const unipileAccount = Array.isArray(profile.unipile_accounts) 
          ? profile.unipile_accounts[0] 
          : profile.unipile_accounts
        const postsCount = Array.isArray(profile.viral_posts_bank)
          ? profile.viral_posts_bank[0]?.count || 0
          : 0
          
        return {
          ...profile,
          posts_count: postsCount,
          unipile_db_id: unipileAccount?.id || null,
          unipile_account_id: unipileAccount?.unipile_account_id || null,
          unipile_status: unipileAccount?.status || null,
        }
      }) as ProfileWithRelations[]
      
      setProfiles(normalized)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profiles'))
      console.error('Error fetching profiles:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [type, withUnipile, withPostsCount])

  const createProfile = useCallback(async (
    data: ProfileFormData, 
    profileType: ProfileType,
    triggerScraping = true
  ) => {
    setSaving(true)
    try {
      const fullName = `${data.first_name} ${data.last_name}`.trim()
      const linkedinId = extractLinkedInId(data.linkedin_id)
      
      const insertData = {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        email: data.email || null,
        role: data.role || null,
        linkedin_id: linkedinId || null,
        type: profileType,
      }
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(insertData)
        .select()
        .single()

      if (insertError || !newProfile) {
        throw new Error(insertError?.message || 'Failed to create profile')
      }

      // Fire-and-forget scraping
      if (triggerScraping && linkedinId) {
        supabase.functions.invoke('sync-profiles', {
          body: {
            profile_ids: [newProfile.id],
            max_pages: 2,
            generate_embeddings: true,
            classify_hooks: true,
            analyze_style_after: true,
          }
        }).catch(err => console.error('Async scraping error:', err))
      }

      await fetchProfiles(false)
      return { success: true, profile: newProfile, fullName }
    } catch (err) {
      console.error('Create profile error:', err)
      return { success: false, error: (err as Error).message }
    } finally {
      setSaving(false)
    }
  }, [fetchProfiles])

  const updateProfile = useCallback(async (id: string, data: Partial<ProfileFormData>) => {
    setSaving(true)
    try {
      const updateData: Record<string, unknown> = {}
      
      if (data.first_name !== undefined) updateData.first_name = data.first_name
      if (data.last_name !== undefined) updateData.last_name = data.last_name
      if (data.first_name && data.last_name) {
        updateData.full_name = `${data.first_name} ${data.last_name}`.trim()
      }
      if (data.email !== undefined) updateData.email = data.email || null
      if (data.role !== undefined) updateData.role = data.role || null
      if (data.linkedin_id !== undefined) {
        updateData.linkedin_id = data.linkedin_id ? extractLinkedInId(data.linkedin_id) : null
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
      
      if (updateError) throw updateError
      
      await fetchProfiles(false)
      return { success: true }
    } catch (err) {
      console.error('Update profile error:', err)
      return { success: false, error: (err as Error).message }
    } finally {
      setSaving(false)
    }
  }, [fetchProfiles])

  const deleteProfile = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      await fetchProfiles(false)
      return { success: true }
    } catch (err) {
      console.error('Delete profile error:', err)
      return { success: false, error: (err as Error).message }
    }
  }, [fetchProfiles])

  const triggerResync = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('sync-profiles', {
        body: {
          profile_ids: [id],
          max_pages: 2,
          generate_embeddings: true,
          classify_hooks: true,
          analyze_style_after: true,
        }
      })
      
      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('Resync error:', err)
      return { success: false, error: (err as Error).message }
    }
  }, [])

  const analyzeStyle = useCallback(async (id: string) => {
    try {
      await supabase.from('profiles').update({ sync_status: 'analyzing' }).eq('id', id)
      
      const { error } = await supabase.functions.invoke('analyze-style', {
        body: { profile_id: id }
      })
      
      if (error) throw error
      
      await supabase.from('profiles').update({ sync_status: 'completed' }).eq('id', id)
      await fetchProfiles(false)
      return { success: true }
    } catch (err) {
      await supabase.from('profiles').update({ sync_status: 'error' }).eq('id', id)
      console.error('Analyze style error:', err)
      return { success: false, error: (err as Error).message }
    }
  }, [fetchProfiles])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  return { 
    profiles, 
    loading, 
    error, 
    saving,
    refetch: fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    triggerResync,
    analyzeStyle,
  }
}
