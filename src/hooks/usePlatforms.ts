import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Platform } from '@/types/database'

export function usePlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPlatforms = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name')

      if (error) throw error
      setPlatforms((data || []) as unknown as Platform[])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch platforms'))
      console.error('Error fetching platforms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlatforms()
  }, [fetchPlatforms])

  return { platforms, loading, error, refetch: fetchPlatforms }
}

export function usePlatform(id: string | undefined) {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPlatform = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setPlatform(data as unknown as Platform)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch platform'))
      console.error('Error fetching platform:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPlatform()
  }, [fetchPlatform])

  return { platform, loading, error, refetch: fetchPlatform }
}
