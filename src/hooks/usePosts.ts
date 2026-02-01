import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Use generic type to avoid strict Supabase type conflicts
type PostData = Record<string, unknown>

export function usePosts() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('production_posts')
        .select(`
          *,
          source:content_sources(*),
          author:profiles(*),
          platform:platforms(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts((data || []) as PostData[])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch posts'))
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { posts, loading, error, refetch: fetchPosts }
}

export function usePost(id: string | undefined) {
  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPost = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('production_posts')
        .select(`
          *,
          source:content_sources(*),
          author:profiles(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setPost(data as PostData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch post'))
      console.error('Error fetching post:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  async function updatePost(updates: Partial<PostData>) {
    if (!id) return

    try {
      const { error } = await supabase
        .from('production_posts')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchPost()
    } catch (err) {
      console.error('Error updating post:', err)
      throw err
    }
  }

  return { post, loading, error, refetch: fetchPost, updatePost }
}
