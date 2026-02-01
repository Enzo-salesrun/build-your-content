import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface CTA {
  id: string
  label: string
  text: string
  type: string
  is_active: boolean
}

export function useCTAs() {
  const [ctas, setCtas] = useState<CTA[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCTAs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ctas')
      .select('id, name, content, category')
      .order('created_at', { ascending: false })
    
    if (data) {
      setCtas(data.map(c => ({
        id: c.id,
        label: c.name,
        text: c.content,
        type: c.category || 'engagement',
        is_active: true,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCTAs()
  }, [fetchCTAs])

  return { ctas, loading, error: null, refetch: fetchCTAs }
}

export function useCTA() {
  const cta: CTA | null = null
  return { cta, loading: false, error: null }
}

export function useCTAsByType() {
  const ctas: CTA[] = []
  return { ctas, loading: false, error: null }
}

export function useFavoriteCTAs() {
  const ctas: CTA[] = []
  return { ctas, loading: false, error: null }
}

export function useCTAMutations() {
  return { 
    createCTA: async () => {}, 
    updateCTA: async () => {}, 
    deleteCTA: async () => {} 
  }
}

export function renderCTATemplate() {
  return ''
}
