import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Topic {
  id: string
  name: string
  label_fr: string | null
  description: string | null
  color: string | null
  topic_group: string | null
  created_at: string | null
}

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, label_fr, description, topic_group, created_at')
        .order('name')

      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTopics((data || []).map((t: any) => ({ 
        id: t.id,
        name: t.name,
        label_fr: t.label_fr,
        description: t.description,
        topic_group: t.topic_group,
        color: '#6B7280',
        created_at: t.created_at
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  return { topics, loading, error, refetch: fetchTopics }
}
