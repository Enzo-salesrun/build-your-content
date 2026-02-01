import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Note: Types will be properly inferred after regenerating Supabase types
// Run: npx supabase gen types typescript --project-id qzorivymybqavkxexrbf > src/lib/database.types.ts

export interface HookType {
  id: string
  name: string
  description: string | null
  examples: string[] | null
  prompt_instruction: string | null
}

export interface GeneratedHook {
  id: string
  production_post_id: string | null
  text: string
  score: number | null
  hook_type_id: string | null
  is_selected: boolean | null
  generation_batch: number | null
  created_at: string | null
  hook_type?: HookType | null
}

interface UseGeneratedHooksReturn {
  hooks: GeneratedHook[]
  hookTypes: HookType[]
  loading: boolean
  error: string | null
  fetchHooks: (postId: string) => Promise<void>
  fetchHookTypes: () => Promise<void>
  selectHook: (hookId: string, postId: string) => Promise<void>
  generateHooks: (params: GenerateHooksParams) => Promise<GeneratedHook[]>
}

interface GenerateHooksParams {
  source_text: string
  author_id: string
  platform_id?: string
  production_post_id?: string
}

export function useGeneratedHooks(): UseGeneratedHooksReturn {
  const [hooks, setHooks] = useState<GeneratedHook[]>([])
  const [hookTypes, setHookTypes] = useState<HookType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHookTypes = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('hook_types')
      .select('id, name, description, examples, prompt_instruction')
      .order('name')

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setHookTypes((data || []) as HookType[])
  }, [])

  const fetchHooks = useCallback(async (postId: string) => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('generated_hooks')
      .select('*')
      .eq('production_post_id', postId)
      .order('score', { ascending: false })

    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setHooks((data || []) as GeneratedHook[])
  }, [])

  const selectHook = useCallback(async (hookId: string, postId: string) => {
    setLoading(true)
    setError(null)

    // Deselect all hooks for this post first
    const { error: deselectError } = await supabase
      .from('generated_hooks')
      .update({ is_selected: false })
      .eq('production_post_id', postId)

    if (deselectError) {
      setError(deselectError.message)
      setLoading(false)
      return
    }

    // Select the chosen hook
    const { error: selectError } = await supabase
      .from('generated_hooks')
      .update({ is_selected: true })
      .eq('id', hookId)

    if (selectError) {
      setError(selectError.message)
      setLoading(false)
      return
    }

    // Get the selected hook data
    const { data: selectedHook } = await supabase
      .from('generated_hooks')
      .select('text, score, hook_type_id')
      .eq('id', hookId)
      .single()

    // Update production post with selected hook
    if (selectedHook) {
      await supabase
        .from('production_posts')
        .update({
          status: 'hook_selected',
          selected_hook_data: selectedHook
        })
        .eq('id', postId)
    }

    // Refresh hooks list
    await fetchHooks(postId)
    setLoading(false)
  }, [fetchHooks])

  const generateHooks = useCallback(async (params: GenerateHooksParams): Promise<GeneratedHook[]> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-hooks', {
        body: params
      })

      if (invokeError) {
        setError(invokeError.message)
        setLoading(false)
        return []
      }

      // If production_post_id was provided, fetch the stored hooks
      if (params.production_post_id) {
        await fetchHooks(params.production_post_id)
      }

      setLoading(false)
      return data?.hooks || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate hooks'
      setError(errorMessage)
      setLoading(false)
      return []
    }
  }, [fetchHooks])

  return {
    hooks,
    hookTypes,
    loading,
    error,
    fetchHooks,
    fetchHookTypes,
    selectHook,
    generateHooks
  }
}

export function getHookTypeColor(hookTypeName: string): string {
  const colors: Record<string, string> = {
    bold_claim: 'bg-red-100 text-red-800',
    contrarian: 'bg-orange-100 text-orange-800',
    curiosity_gap: 'bg-purple-100 text-purple-800',
    direct_address: 'bg-blue-100 text-blue-800',
    number: 'bg-green-100 text-green-800',
    pain_point: 'bg-yellow-100 text-yellow-800',
    question: 'bg-cyan-100 text-cyan-800',
    result: 'bg-emerald-100 text-emerald-800',
    social_proof: 'bg-indigo-100 text-indigo-800',
    story_opener: 'bg-pink-100 text-pink-800'
  }
  return colors[hookTypeName] || 'bg-gray-100 text-gray-800'
}

export function getHookTypeLabel(hookTypeName: string): string {
  const labels: Record<string, string> = {
    announcement: 'Annonce',
    before_after: 'Avant / Après',
    bold_claim: 'Affirmation audacieuse',
    call_to_action_opener: 'Appel à l\'action',
    confession: 'Confession',
    contrarian: 'Contrarian',
    controversial_opinion: 'Opinion controversée',
    counterintuitive_claim: 'Contre-intuitif',
    curiosity_gap: 'Curiosité',
    direct_address: 'Adresse directe',
    empathy_hook: 'Empathie',
    fear_reframe: 'Recadrage de peur',
    lesson_learned: 'Leçon apprise',
    metaphor: 'Métaphore',
    number: 'Chiffre',
    number_result: 'Résultat chiffré',
    pain_point: 'Point de douleur',
    personal_origin: 'Origine personnelle',
    provocative_challenge: 'Défi provocant',
    question: 'Question',
    question_hook: 'Question engageante',
    quote_authority: 'Citation d\'autorité',
    reframe_insight: 'Recadrage',
    result: 'Résultat',
    simple_list_promise: 'Liste promise',
    social_proof: 'Preuve sociale',
    story_opener: 'Ouverture narrative',
    teaser: 'Teaser',
  }
  return labels[hookTypeName] || hookTypeName.replace(/_/g, ' ')
}
