import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PostBatch, BatchAuthorConfig, ProductionPost, BatchStatus } from '@/lib/database.types'

export interface CreateBatchParams {
  sourceText: string
  language: 'fr' | 'en'
  slots: Array<{
    authorId: string
    topicIds: string[]
    templateId: string | null
    audienceId: string
    knowledgeIds: string[]
  }>
}

export interface BatchWithPosts extends PostBatch {
  posts: ProductionPost[]
  authorConfigs: BatchAuthorConfig[]
}

export function useBatches() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Create a new batch with production posts for each slot
   */
  const createBatch = useCallback(async (params: CreateBatchParams): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      // 1. Create the batch
      const { data: batch, error: batchError } = await supabase
        .from('post_batches')
        .insert({
          source_text: params.sourceText,
          language: params.language,
          total_posts: params.slots.length,
          status: 'draft' as BatchStatus,
        })
        .select('id')
        .single()

      if (batchError) throw batchError

      // 2. Create production posts for each slot
      const postsToInsert = params.slots.map((slot, index) => ({
        batch_id: batch.id,
        author_id: slot.authorId,
        topic_id: slot.topicIds[0] || null,
        template_id: slot.templateId,
        audience_id: slot.audienceId,
        knowledge_ids: slot.knowledgeIds,
        batch_slot_order: index,
        status: 'draft_input' as const,
      }))

      const { error: postsError } = await supabase
        .from('production_posts')
        .insert(postsToInsert)

      if (postsError) {
        console.error('Posts insert error details:', postsError)
        throw postsError
      }

      // 3. Create author configs (deduplicated by author)
      const authorConfigsMap = new Map<string, {
        authorId: string
        topicIds: string[]
        templateId: string | null
        knowledgeIds: string[]
      }>()

      for (const slot of params.slots) {
        if (!authorConfigsMap.has(slot.authorId)) {
          authorConfigsMap.set(slot.authorId, {
            authorId: slot.authorId,
            topicIds: slot.topicIds,
            templateId: slot.templateId,
            knowledgeIds: slot.knowledgeIds,
          })
        }
      }

      const authorConfigsToInsert = Array.from(authorConfigsMap.values()).map(config => ({
        batch_id: batch.id,
        author_id: config.authorId,
        topic_id: config.topicIds[0] || null,
        template_id: config.templateId,
        knowledge_ids: config.knowledgeIds,
      }))

      const { error: configsError } = await supabase
        .from('batch_author_configs')
        .insert(authorConfigsToInsert)

      if (configsError) throw configsError

      return batch.id
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create batch'
      setError(message)
      console.error('Error creating batch:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get a batch with all its posts
   */
  const getBatch = useCallback(async (batchId: string): Promise<BatchWithPosts | null> => {
    setLoading(true)
    setError(null)

    try {
      // Fetch batch
      const { data: batch, error: batchError } = await supabase
        .from('post_batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (batchError) throw batchError

      // Fetch posts
      const { data: posts, error: postsError } = await supabase
        .from('production_posts')
        .select('*')
        .eq('batch_id', batchId)
        .order('batch_slot_order')

      if (postsError) throw postsError

      // Fetch author configs
      const { data: authorConfigs, error: configsError } = await supabase
        .from('batch_author_configs')
        .select('*')
        .eq('batch_id', batchId)

      if (configsError) throw configsError

      return {
        ...batch,
        posts: (posts || []) as unknown as ProductionPost[],
        authorConfigs: (authorConfigs || []) as unknown as BatchAuthorConfig[],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get batch'
      setError(message)
      console.error('Error getting batch:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Update batch status
   */
  const updateBatchStatus = useCallback(async (batchId: string, status: BatchStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('post_batches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', batchId)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error updating batch status:', err)
      return false
    }
  }, [])

  /**
   * Update a production post (hook selection, content, etc.)
   */
  const updatePost = useCallback(async (
    postId: string,
    updates: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('production_posts')
        .update(updates as Record<string, unknown>)
        .eq('id', postId)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error updating post:', err)
      return false
    }
  }, [])

  /**
   * Save generated hooks for a post
   */
  const saveHooks = useCallback(async (
    postId: string,
    hooks: Array<{
      text: string
      score: number
      hookTypeId: string | null
    }>
  ): Promise<boolean> => {
    try {
      const hooksToInsert = hooks.map(hook => ({
        production_post_id: postId,
        text: hook.text,
        score: hook.score,
        hook_type_id: hook.hookTypeId,
        is_selected: false,
        generation_batch: 1,
      }))

      const { error } = await supabase
        .from('generated_hooks')
        .insert(hooksToInsert)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error saving hooks:', err)
      return false
    }
  }, [])

  /**
   * Select a hook for a post
   */
  const selectHook = useCallback(async (postId: string, hookId: string): Promise<boolean> => {
    try {
      // Deselect all hooks for this post
      await supabase
        .from('generated_hooks')
        .update({ is_selected: false })
        .eq('production_post_id', postId)

      // Select the chosen hook
      const { error } = await supabase
        .from('generated_hooks')
        .update({ is_selected: true })
        .eq('id', hookId)

      if (error) throw error

      // Update post status
      await supabase
        .from('production_posts')
        .update({ status: 'hook_selected' })
        .eq('id', postId)

      return true
    } catch (err) {
      console.error('Error selecting hook:', err)
      return false
    }
  }, [])

  /**
   * Get hooks for a post
   */
  const getHooksForPost = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('generated_hooks')
        .select('*, hook_type:hook_types(id, name, description)')
        .eq('production_post_id', postId)
        .order('score', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error getting hooks:', err)
      return []
    }
  }, [])

  return {
    loading,
    error,
    createBatch,
    getBatch,
    updateBatchStatus,
    updatePost,
    saveHooks,
    selectHook,
    getHooksForPost,
  }
}
