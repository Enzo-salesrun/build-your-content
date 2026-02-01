import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Visual {
  id: string
  title: string
  source_url: string
  summary: string | null
  tags: string[] | null
  created_at: string | null
}

export function useVisuals() {
  const [visuals, setVisuals] = useState<Visual[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVisuals = async () => {
    setLoading(true)
    setError(null)
    
    const { data, error: fetchError } = await supabase
      .from('knowledge')
      .select('id, title, source_url, summary, tags, created_at')
      .eq('knowledge_type', 'visual' as string)
      .eq('is_active', true)
      .not('source_url', 'is', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setVisuals([])
    } else {
      setVisuals((data || []) as Visual[])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchVisuals()
  }, [])

  return { visuals, loading, error, refetch: fetchVisuals }
}
